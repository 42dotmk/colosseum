#!/bin/bash

# Compile the source code

ERROR=$( gcc -O2 -static main.c -o main 2>&1 )
echo "ERR| $ERROR /ERR";
./main