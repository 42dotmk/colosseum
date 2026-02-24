/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENATUS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
