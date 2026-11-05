#!/bin/bash

TIMEOUT=${EXECUTION_TIMEOUT:-10}          # CPU seconds the program may use (judged by /exc/runner)
WALL_TIMEOUT=${WALL_TIMEOUT:-60}          # safety net for programs that wait without using the CPU
COMPILE_TIMEOUT=${COMPILE_TIMEOUT:-60}    # compiling is not timed against the participant, but must end

# The participant's program runs through /exc/runner: as an unprivileged user ("nobody") and judged on CPU
# time, so the verdict does not depend on how busy the machine is. Inputs (for interactive problems they
# contain the secret), sources and outputs are root-only, so the program cannot read them.
# usage: run_limited <time file> <program and arguments...>
run_limited() {
  local timeFile="$1"; shift
  /exc/runner --cpu "${TIMEOUT}" --wall "${WALL_TIMEOUT}" --mem "${MEMORY_LIMIT_MB:-0}" --fsize "${OUTPUT_LIMIT_MB:-0}" \
    --time-file "${timeFile}" --mem-file "${timeFile%.time}.mem" --uid 65534 -- "$@"
}
chmod 700 input src output 2>/dev/null

if [ "${INTERACTIVE}" = "1" ]; then
  # ---------------------------------------------------------------------------
  # Interactive mode: solution <-> interactor connected via bidirectional pipes
  # The interactor receives the test-case input file as argv[1], communicates
  # with the solution via its own stdin/stdout, and signals the verdict through
  # its exit code (0 = Accepted, non-0 = Wrong Answer / error).
  # The output written to output/$filename.stdout must equal the test-case
  # expected output ("Accepted") so the normal result-processor can evaluate it.
  # ---------------------------------------------------------------------------

  SOLUTION_FILE="${SOLUTION_FILE:-main.cpp}"

  SOL_COMPILE_ERR=$(g++ -O2 -o solution "src/${SOLUTION_FILE}" 2>&1)
  INT_COMPILE_ERR=$(g++ -O2 -o interactor src/interactor.cpp 2>&1)
  CHK_COMPILE_ERR=""
  if [ -f src/checker.cpp ]; then
    CHK_COMPILE_ERR=$(g++ -O2 -o checker src/checker.cpp 2>&1)
  fi

  # Write compile output so the caller can inspect it
  echo -n "${SOL_COMPILE_ERR}" > compile.stdout
  {
    [ -n "$INT_COMPILE_ERR" ] && echo "=== interactor ===" && echo "$INT_COMPILE_ERR"
    [ -n "$CHK_COMPILE_ERR" ] && echo "=== checker ===" && echo "$CHK_COMPILE_ERR"
  } > compile.stderr

  if [ -n "$SOL_COMPILE_ERR" ] || [ -n "$INT_COMPILE_ERR" ] || [ -n "$CHK_COMPILE_ERR" ]; then
    files=($(find input -type f -maxdepth 1))
    for inputFile in "${files[@]}"; do
      filename="${inputFile:6}"
      echo "" > "output/$filename.stdout"
      {
        [ -n "$SOL_COMPILE_ERR" ] && echo "=== solution ===" && echo "$SOL_COMPILE_ERR"
        [ -n "$INT_COMPILE_ERR" ] && echo "=== interactor ===" && echo "$INT_COMPILE_ERR"
        [ -n "$CHK_COMPILE_ERR" ] && echo "=== checker ===" && echo "$CHK_COMPILE_ERR"
      } > "output/$filename.stderr"
    done
    exit 1
  fi

  # judge binaries are root-only as well
  chmod 700 interactor checker 2>/dev/null

  files=($(find input -type f -maxdepth 1))
  for inputFile in "${files[@]}"; do
    filename="${inputFile:6}"

    # Use FIFOs for robust bidirectional solution <-> interactor communication.
    # This avoids fragile bash coproc FD handling inside container shells.
    pipeDir="output/.pipes_${filename}"
    mkdir -p "${pipeDir}"
    SOL_TO_INT="${pipeDir}/sol_to_int"
    INT_TO_SOL="${pipeDir}/int_to_sol"
    mkfifo "${SOL_TO_INT}" "${INT_TO_SOL}"

    USER_OUT_FILE="output/${filename}.participant_stdout"
    INT_OUT_FILE="output/${filename}.interactor_stdout"
    rm -f "${USER_OUT_FILE}"
    rm -f "${INT_OUT_FILE}"

    set -o pipefail
    # Start a single interactor process and tee its replies so we can display
    # the HIGHER/LOWER/FOUND transcript in the UI.
    timeout "${WALL_TIMEOUT}" ./interactor "${inputFile}" \
      > >(tee "${INT_OUT_FILE}" >"${INT_TO_SOL}") \
      <"${SOL_TO_INT}" \
      2>"output/${filename}.int_stderr" &
    INT_PID=$!

    run_limited "output/${filename}.time" ./solution \
      <"${INT_TO_SOL}" \
      2>"output/${filename}.stderr" \
      | tee "${USER_OUT_FILE}" >"${SOL_TO_INT}"
    SOL_EXIT=${PIPESTATUS[0]}
    set +o pipefail

    wait "${INT_PID}" 2>/dev/null
    INT_EXIT=$?

    rm -f "${SOL_TO_INT}" "${INT_TO_SOL}"
    rmdir "${pipeDir}" 2>/dev/null || true

    INT_MSG=$(cat "output/${filename}.int_stderr" 2>/dev/null || echo "")
    rm -f "output/${filename}.int_stderr"

    USER_OUT=$(cat "${USER_OUT_FILE}" 2>/dev/null || echo "")
    rm -f "${USER_OUT_FILE}"

    INT_OUT=$(cat "${INT_OUT_FILE}" 2>/dev/null || echo "")
    rm -f "${INT_OUT_FILE}"

    if [ "${SOL_EXIT}" -eq 124 ] || [ "${SOL_EXIT}" -eq 125 ]; then
      echo "Wrong Answer" > "output/${filename}.stdout"
      echo "Time Limit Exceeded (solution exceeded ${TIME_LIMIT_DISPLAY:-$TIMEOUT}s)" >> "output/${filename}.stderr"
    elif [ "${INT_EXIT}" -eq 124 ]; then
      echo "Wrong Answer" > "output/${filename}.stdout"
      echo "Time Limit Exceeded (interactor waited more than ${WALL_TIMEOUT}s)" >> "output/${filename}.stderr"
    elif [ "${INT_EXIT}" -eq 0 ]; then
      echo "Accepted" > "output/${filename}.stdout"
    else
      echo "Wrong Answer" > "output/${filename}.stdout"
    fi

    if [ -n "${USER_OUT}" ]; then
      {
        echo ""
        echo "=== PARTICIPANT_OUTPUT ==="
        echo "${USER_OUT}"
      } >> "output/${filename}.stderr"
    fi

    if [ -n "${INT_MSG}" ]; then
      {
        echo ""
        echo "=== INTERACTOR_MESSAGE ==="
        echo "${INT_MSG}"
      } >> "output/${filename}.stderr"
    fi

    if [ -n "${INT_OUT}" ]; then
      {
        echo ""
        echo "=== INTERACTOR_STREAM ==="
        echo "${INT_OUT}"
      } >> "output/${filename}.stderr"
    fi

    # Optional checker: runs after the interaction, receives the input file.
    # It can further validate the result and override the verdict.
    if [ -f ./checker ] && [ "${INT_EXIT}" -eq 0 ]; then
      CHECKER_OUT=$(./checker "${inputFile}" 2>&1)
      CHECKER_EXIT=$?
      if [ "${CHECKER_EXIT}" -ne 0 ]; then
        echo "Wrong Answer" > "output/${filename}.stdout"
        echo "${CHECKER_OUT}" >> "output/${filename}.stderr"
      fi
    fi
  done

else
  # ---------------------------------------------------------------------------
  # Standard non-interactive mode (unchanged)
  # ---------------------------------------------------------------------------
  ERROR=$(timeout "${COMPILE_TIMEOUT}" g++ -O2 -static src/main.cpp -o ./main 2>&1)
  if [ -z "$ERROR" ] && [ ! -x ./main ]; then
    ERROR="Compilation did not finish within ${COMPILE_TIMEOUT}s"
  fi

  files=($(find input -type f -maxdepth 1))
  for inputFile in "${files[@]}"; do
    filename="${inputFile:6}"
    echo "Running $inputFile"
    echo "output/$filename.stdout"
    if [ -n "$ERROR" ]; then
      echo "Compilation error:\\n $ERROR" > "output/$filename.stderr"
      continue
    fi
    cat "${inputFile}" | run_limited "output/${filename}.time" ./main 1>"output/${filename}.stdout" 2>"output/${filename}.stderr"
    EXIT_CODE=${PIPESTATUS[1]}
    echo "Run resulted in $EXIT_CODE"
    if [ $EXIT_CODE -eq 124 ]; then
      echo "Execution exceeded ${TIME_LIMIT_DISPLAY:-$TIMEOUT}s" > "output/${filename}.stderr"
    fi
    if [ $EXIT_CODE -eq 125 ]; then
      echo "Execution exceeded ${TIME_LIMIT_DISPLAY:-$TIMEOUT}s (the program kept waiting without doing work)" > "output/${filename}.stderr"
    fi
    if [ $EXIT_CODE -eq 153 ]; then
      echo "Output limit exceeded (${OUTPUT_LIMIT_MB:-?}MB)" > "output/${filename}.stderr"
    fi
    if [ $EXIT_CODE -eq 137 ] || grep -q "bad_alloc" "output/${filename}.stderr" 2>/dev/null; then
      echo "Memory limit exceeded (${MEMORY_LIMIT_MB:-?}MB)" > "output/${filename}.stderr"
    fi
  done
fi

