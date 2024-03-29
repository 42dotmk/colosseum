# Documentation 

You can set up husky in 2 ways - automagical, or manual, pick your poision and follow the steps.

## Automagical setup

Run:

`./setup-husky.sh`

It will install husky and set up the pre-commit hooks automagically.

## Manual setup:

## Setup Husky

`npm i -g husky`

> **Notes:**
> - **IMPORTANT**: Make sure the `Git` version is 2.9 or above
> - Currently ESLint and TypeScript checks are enabled for the client, should also setup for caesar and senatus as well

In order to setup the linting checks locally, we must run the following commands (from the root dir):

```bash
# For client (front-end)
npm run prepareClientHusky

# For senatus (back-end)
npm run prepareSenatusHusky
```

After the command executes, there should be a `[directoryName]/.husky` directory, that should also contain pre-generated files for each of the hooks.
Replace the content of the `.husky/_/pre-push` file with the following:

```bash
#!/usr/bin/env sh

npm --prefix [directoryName] run lint
npm --prefix [directoryName] run ts-checks
```
