# Colosseum 

## Setup Husky

> **IMPORTANT NOTE**: Make sure the `Git` version is 2.9 or above

In order to setup the linting checks locally, we must run the following command:

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

npm run lint
npm run ts-check
```
