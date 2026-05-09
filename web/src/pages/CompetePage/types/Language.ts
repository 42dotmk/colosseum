export default interface Language {
  codeName: string;
  createdAt: string;
  defaultMaxCpuTime: number| undefined;
  defaultMaxMemory: number| undefined;
  documentId: string;
  entrypoint: string;
  id: number;
  name: string;
  publishedAt: string;
  updatedAt: string;
}