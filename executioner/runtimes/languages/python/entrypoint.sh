#!/bin/bash
TIMEOUT=${EXECUTION_TIMEOUT:-10}

files=($(find input -type f -mindepth 1))
for inputFile in "${files[@]}"; do
  filename="${inputFile:6}"
  echo "Running $inputFile"
  echo "output/$filename.stdout"
  { time (cat $inputFile | timeout ${TIMEOUT} python3 src/main.py 1> "output/$filename.stdout" 2> "output/$filename.stderr") ; } 2> "output/$filename.time"
  EXIT_CODE=$?
  echo "Run resulted in $EXIT_CODE"
  if [ $EXIT_CODE -eq 124 ]; then
    echo "Execution exceeded ${TIMEOUT}s" > "output/$filename.stderr"
  fi
done

