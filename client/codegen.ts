import 'dotenv/config'

import { CodegenConfig } from '@graphql-codegen/cli';
import { GQL_URL } from './src/config';

const config: CodegenConfig = {
  schema: GQL_URL,
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      }
    }
  },
  ignoreNoDocuments: true,
};

export default config;