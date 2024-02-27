#!/bin/bash

# Compile the source code
ERROR=$(g++ -O2 -static src/main.cpp -o ./main 2>&1)

echo "ERR| $ERROR /ERR";

files=($(find input -type f -mindepth 1))
for inputFile in "${files[@]}"; do
  filename="${inputFile:6}"
  echo "Running $inputFile"
  echo "output/$filename.stdout"
  { time (cat $inputFile | ./main 1> "output/$filename.stdout" 2> "output/$filename.stderr") ; } 2> "output/$filename.time"
done

