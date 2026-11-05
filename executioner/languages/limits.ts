/**
 * Resolves the limits applied to one execution.
 *
 * The requester (Senatus, from the language/problem) asks for a time and memory limit, the server
 * (this executioner, from its environment) has a capability cap. The effective limit is the smaller
 * of the two, so a weak server never promises more than it can give and a request can never exceed
 * what the operator allows.
 *
 * Server env: MAX_EXECUTION_TIME (seconds, default 10), MEMORY_LIMIT_PER_EXECUTION (e.g. 1G, 512m).
 */

export type RequestedLimits = {
  maxCpuTime?: number | string | null; // seconds
  maxMemory?: number | string | null; // megabytes
};

export type ServerCaps = {
  maxTimeSeconds: number;
  maxMemoryMb: number;
};

export type EffectiveLimits = {
  timeSeconds: number;
  memoryMb: number;
};

export const parseMemoryToMb = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?)b?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = { '': 1, k: 1 / 1024, m: 1, g: 1024, t: 1024 * 1024 }[unit] ?? 1;
  const mb = amount * factor;
  return mb > 0 ? mb : null;
};

const positive = (value: number | string | null | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const getServerCaps = (env: NodeJS.ProcessEnv = process.env): ServerCaps => ({
  maxTimeSeconds: positive(env.MAX_EXECUTION_TIME) ?? 10,
  maxMemoryMb: parseMemoryToMb(env.MEMORY_LIMIT_PER_EXECUTION) ?? 1024,
});

export const resolveLimits = (requested: RequestedLimits | undefined, caps: ServerCaps): EffectiveLimits => {
  const wantedTime = positive(requested?.maxCpuTime);
  const wantedMemory = parseMemoryToMb(requested?.maxMemory as any);
  return {
    timeSeconds: Math.min(wantedTime ?? caps.maxTimeSeconds, caps.maxTimeSeconds),
    memoryMb: Math.floor(Math.min(wantedMemory ?? caps.maxMemoryMb, caps.maxMemoryMb)),
  };
};
