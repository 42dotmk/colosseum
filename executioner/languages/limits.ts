/**
 * Limits of one execution and the capabilities of the server that runs it.
 *
 * The requester (Senatus, from the language/problem) asks for a time and memory limit. A server (this
 * executioner) has capability caps. Two rules keep verdicts independent of which server picks a job up:
 *
 *  1. A worker only accepts a job whose limits it can fully give (canSatisfy). Otherwise the job is passed
 *     on to another worker, so a weak server never silently shortens a limit.
 *  2. Limits are measured on the server's own speed: a slower server declares TIME_LIMIT_SCALE (for example 2
 *     for "half as fast as the reference machine") and the wall-clock deadline is scaled while the limit that
 *     is reported to the participant stays the same.
 *
 * Server env:
 *   MAX_EXECUTION_TIME          highest time limit (seconds) this server accepts, default 10
 *   MEMORY_LIMIT_PER_EXECUTION  highest memory limit this server accepts (512m, 2G, ...), default 1G
 *   TIME_LIMIT_SCALE            wall-clock multiplier for slower hardware, default 1
 *   EXECUTOR_NAME               name used in logs, default the host name
 *   DEFAULT_EXECUTION_TIME / DEFAULT_EXECUTION_MEMORY  used when a job does not state a limit (10 s / 256 MB)
 */
import os from 'node:os';

export type RequestedLimits = {
  maxCpuTime?: number | string | null; // seconds
  maxMemory?: number | string | null; // megabytes
};

export type ServerCaps = {
  maxTimeSeconds: number;
  maxMemoryMb: number;
  timeScale: number;
  name: string;
};

export type EffectiveLimits = {
  /** The limit as the participant sees it (seconds). */
  timeSeconds: number;
  /** The wall-clock deadline enforced on this server: timeSeconds * timeScale. */
  enforcedTimeSeconds: number;
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
  timeScale: positive(env.TIME_LIMIT_SCALE) ?? 1,
  name: env.EXECUTOR_NAME || os.hostname(),
});

/** What a job asks for, with the platform defaults filled in. Independent of the server. */
export const normalizeRequest = (
  requested: RequestedLimits | undefined,
  env: NodeJS.ProcessEnv = process.env,
): { timeSeconds: number; memoryMb: number } => ({
  timeSeconds: positive(requested?.maxCpuTime) ?? positive(env.DEFAULT_EXECUTION_TIME) ?? 10,
  memoryMb: parseMemoryToMb(requested?.maxMemory as any) ?? parseMemoryToMb(env.DEFAULT_EXECUTION_MEMORY) ?? 256,
});

/** Can this server give the job exactly the limits it asks for? */
export const canSatisfy = (
  requested: RequestedLimits | undefined,
  caps: ServerCaps,
  env: NodeJS.ProcessEnv = process.env,
): { ok: boolean; reason?: string } => {
  const want = normalizeRequest(requested, env);
  if (want.timeSeconds > caps.maxTimeSeconds) {
    return { ok: false, reason: `time limit ${want.timeSeconds}s is above this server's ${caps.maxTimeSeconds}s` };
  }
  if (want.memoryMb > caps.maxMemoryMb) {
    return { ok: false, reason: `memory limit ${want.memoryMb}MB is above this server's ${caps.maxMemoryMb}MB` };
  }
  return { ok: true };
};

/**
 * The limits to apply. When called directly (without canSatisfy) a request above the server's caps is clamped,
 * so a weak server never promises more than it can give.
 */
export const resolveLimits = (requested: RequestedLimits | undefined, caps: ServerCaps): EffectiveLimits => {
  const wantedTime = positive(requested?.maxCpuTime);
  const wantedMemory = parseMemoryToMb(requested?.maxMemory as any);
  const timeSeconds = Math.min(wantedTime ?? caps.maxTimeSeconds, caps.maxTimeSeconds);
  return {
    timeSeconds,
    enforcedTimeSeconds: Number((timeSeconds * caps.timeScale).toFixed(3)),
    memoryMb: Math.floor(Math.min(wantedMemory ?? caps.maxMemoryMb, caps.maxMemoryMb)),
  };
};
