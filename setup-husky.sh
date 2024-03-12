npm i -g husky

# For client (front-end)
npm run prepareClientHusky

# For senatus (back-end)
npm run prepareSenatusHusky

# Insert the pre-commit hook in client
cat <<EOT > ./client/.husky/_/pre-push
#!/usr/bin/env sh

npm --prefix client run lint
npm --prefix client run ts-checks
EOT
