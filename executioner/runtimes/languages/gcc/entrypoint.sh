#!/bin/bash

TIMEOUT=${EXECUTION_TIMEOUT:-10}

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
      echo "CE" > "output/$filename.verdict"
      {
        [ -n "$SOL_COMPILE_ERR" ] && echo "=== solution ===" && echo "$SOL_COMPILE_ERR"
        [ -n "$INT_COMPILE_ERR" ] && echo "=== interactor ===" && echo "$INT_COMPILE_ERR"
        [ -n "$CHK_COMPILE_ERR" ] && echo "=== checker ===" && echo "$CHK_COMPILE_ERR"
      } > "output/$filename.stderr"
    done
    exit 1
  fi

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
    timeout "${TIMEOUT}" ./interactor "${inputFile}" \
      > >(tee "${INT_OUT_FILE}" >"${INT_TO_SOL}") \
      <"${SOL_TO_INT}" \
      2>"output/${filename}.int_stderr" &
    INT_PID=$!

    /usr/bin/time -f "%e %M" -o "output/${filename}.time" \
      timeout "${TIMEOUT}" ./solution \
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

    if [ "${SOL_EXIT}" -eq 124 ]; then
      echo "TLE" > "output/${filename}.verdict"
      echo "Wrong Answer" > "output/${filename}.stdout"
      echo "Time Limit Exceeded (solution exceeded ${TIMEOUT}s)" >> "output/${filename}.stderr"
    elif [ "${SOL_EXIT}" -eq 137 ]; then
      echo "MLE" > "output/${filename}.verdict"
      echo "Wrong Answer" > "output/${filename}.stdout"
      echo "Memory Limit Exceeded" >> "output/${filename}.stderr"
    elif [ "${INT_EXIT}" -eq 124 ]; then
      echo "TLE" > "output/${filename}.verdict"
      echo "Wrong Answer" > "output/${filename}.stdout"
      echo "Time Limit Exceeded (interactor exceeded ${TIMEOUT}s)" >> "output/${filename}.stderr"
    elif [ "${INT_EXIT}" -eq 0 ]; then
      echo "OK" > "output/${filename}.verdict"
      echo "Accepted" > "output/${filename}.stdout"
    else
      echo "RTE" > "output/${filename}.verdict"
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
        echo "RTE" > "output/${filename}.verdict"
        echo "Wrong Answer" > "output/${filename}.stdout"
        echo "${CHECKER_OUT}" >> "output/${filename}.stderr"
      fi
    fi
  done

else
  # ---------------------------------------------------------------------------
  # Standard non-interactive mode
  # ---------------------------------------------------------------------------
  ERROR=$(g++ -O2 -static src/main.cpp -o ./main 2>&1)

  files=($(find input -type f -maxdepth 1))
  for inputFile in "${files[@]}"; do
    filename="${inputFile:6}"
    echo "Running $inputFile"
    if [ -n "$ERROR" ]; then
      echo "Compilation error:\\n $ERROR" > "output/$filename.stderr"
      echo "CE" > "output/$filename.verdict"
      continue
    fi
    cat "$inputFile" | /usr/bin/time -f "%e %M" -o "output/$filename.time" timeout "${TIMEOUT}" ./main 1>"output/$filename.stdout" 2>"output/$filename.stderr"
    EXIT_CODE=$?
    echo "Run resulted in $EXIT_CODE"
    if [ $EXIT_CODE -eq 124 ]; then
      echo "TLE" > "output/$filename.verdict"
      echo "Execution exceeded ${TIMEOUT}s" > "output/$filename.stderr"
    elif [ $EXIT_CODE -eq 137 ]; then
      echo "MLE" > "output/$filename.verdict"
      echo "Memory Limit Exceeded" > "output/$filename.stderr"
    elif [ $EXIT_CODE -ne 0 ]; then
      echo "RTE" > "output/$filename.verdict"
    else
      echo "OK" > "output/$filename.verdict"
    fi
  done
fi
