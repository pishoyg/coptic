export function browser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function node(): boolean {
  return !browser();
}
