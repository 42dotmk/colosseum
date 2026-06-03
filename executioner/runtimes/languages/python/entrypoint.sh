#!/bin/bash
TIMEOUT=${EXECUTION_TIMEOUT:-10}

files=($(find input -type f -maxdepth 1))
for inputFile in "${files[@]}"; do
  filename="${inputFile:6}"
  echo "Running $inputFile"
  cat "$inputFile" | /usr/bin/time -f "%e %M" -o "output/$filename.time" timeout "${TIMEOUT}" python3 src/main.py 1>"output/$filename.stdout" 2>"output/$filename.stderr"
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

