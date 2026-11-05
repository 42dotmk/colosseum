#include <bits/stdc++.h>
using namespace std;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "Interactor error: no input file provided" << endl;
        return 2;
    }

    ifstream fin(argv[1]);
    if (!fin.is_open()) {
        cerr << "Interactor error: cannot open input file" << endl;
        return 2;
    }

    long long N, secret;
    fin >> N >> secret;
    fin.close();

    if (secret < 1 || secret > N) {
        cerr << "Interactor error: invalid test case (secret=" << secret
             << " out of [1," << N << "])" << endl;
        return 2;
    }

    int max_queries = (int)floor(log2((double)N)) + 1;
    int queries = 0;
    long long guess;

    // Flush stdout after every write so the solution sees responses immediately
    cout << unitbuf;

    // Send N to the participant program first.
    // Expected participant contract:
    //   1) read N
    //   2) print guess
    //   3) read HIGHER/LOWER/FOUND
    cout << N << endl;

    while (cin >> guess) {
        queries++;

        if (queries > max_queries) {
            cout << "TOO_MANY" << endl;
            cerr << "Wrong Answer: exceeded query limit (" << max_queries << ")" << endl;
            return 1;
        }

        if (guess < 1 || guess > N) {
            cout << "OUT_OF_RANGE" << endl;
            cerr << "Wrong Answer: guess " << guess
                 << " is outside valid range [1," << N << "]" << endl;
            return 1;
        }

        if (guess == secret) {
            cout << "FOUND" << endl;
            cerr << "Accepted: found in " << queries << "/" << max_queries << " queries" << endl;
            return 0;
        } else if (guess < secret) {
            cout << "HIGHER" << endl;
        } else {
            cout << "LOWER" << endl;
        }
    }

    cerr << "Wrong Answer: solution terminated without finding the answer" << endl;
    return 1;
}
