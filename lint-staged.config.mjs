export default {
  '**/*.{js,mjs,cjs,ts,tsx}': ['eslint --fix', 'prettier --write'],

  '**/*.{json,jsonc,yml,yaml,md,css,scss,html}': ['prettier --write'],
};
