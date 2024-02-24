#!/bin/bash

files=($(find input -type f -mindepth 1))
for inputFile in "${files[@]}"; do
  filename="${inputFile:6}"
  echo "Running $inputFile"
  echo "output/$filename.stdout"
  { time (cat $inputFile | node src/index.js 1> "output/$filename.stdout" 2> "output/$filename.stderr") ; } 2> "output/$filename.time"
done

