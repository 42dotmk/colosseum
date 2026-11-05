## Binary Search (Interactive)

You are given a hidden integer `secret` in the range **[1, N]**.

Your program must find `secret` by asking queries. For each query, output a single integer (your guess). The judge will respond with one of:

| Response | Meaning |
|---|---|
| `HIGHER` | The secret is **greater** than your guess |
| `LOWER` | The secret is **smaller** than your guess |
| `FOUND` | Your guess is **correct** — interaction ends |
| `TOO_MANY` | You exceeded the allowed number of queries — Wrong Answer |
| `OUT_OF_RANGE` | Your guess was outside [1, N] — Wrong Answer |

### Input format
On the **first line** of standard input you receive a single integer **N** — the upper bound of the range.

### Output format
For each query, print a single integer to standard output followed by a newline. **Flush after each guess** (e.g. `cout << guess << endl;` or `cout << flush;`).

### Query limit
You may ask at most **⌊log₂(N)⌋ + 1** queries.

### Example interaction
```
→ (your program reads)  N = 16
← (your program writes) 8
→ (judge responds)      HIGHER
← 12
→                       LOWER
← 10
→                       LOWER
← 9
→                       FOUND
```
