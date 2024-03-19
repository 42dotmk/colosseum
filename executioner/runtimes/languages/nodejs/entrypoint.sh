#!/bin/bash

# Compile the source code
ERROR=$(tsc 2>&1)
TIMEOUT=${EXECUTION_TIMEOUT:-10}

files=($(find input -type f -maxdepth 1))
for inputFile in "${files[@]}"; do
  filename="${inputFile:6}"
  echo "Running $inputFile"
  echo "output/$filename.stdout"
  # If there's an error in $ERROR pipe it into the stderr
  if [ -n "$ERROR" ]; then
    echo "Compilation error:\n $ERROR" > "output/$filename.stderr"
    break;
  fi
  { time (cat $inputFile | timeout ${TIMEOUT} node src/index.js 1> "output/$filename.stdout" 2> "output/$filename.stderr") ; } 2> "output/$filename.time"
  EXIT_CODE=$?
  echo "Run resulted in $EXIT_CODE"
  if [ $EXIT_CODE -eq 124 ]; then
    echo "Execution exceeded ${TIMEOUT}s" > "output/$filename.stderr"
  fi
done

