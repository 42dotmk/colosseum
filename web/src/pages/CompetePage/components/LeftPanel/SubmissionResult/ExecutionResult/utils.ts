export const formatExecutionTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return null;

  if (seconds >= 1) {
    return `${seconds.toFixed(3).replace(/\.?0+$/, '')}s`;
  }

  return `${Math.round(seconds * 1000)}ms`;
};
