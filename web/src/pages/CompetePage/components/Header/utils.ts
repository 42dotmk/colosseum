export const formatTimeLimit = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1) {
    return `${value.toFixed(3).replace(/\.?0+$/, '')}s`;
  }
  return `${Math.round(value * 1000)}ms`;
};

export const formatMemoryLimit = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1024) {
    const gb = value / 1024;
    return gb % 1 === 0 ? `${gb}GB` : `${gb.toFixed(2).replace(/\.?0+$/, '')}GB`;
  }
  if (value < 1) {
    return `${Math.round(value * 1024)}KB`;
  }
  return value % 1 === 0 ? `${value}MB` : `${value.toFixed(2).replace(/\.?0+$/, '')}MB`;
};