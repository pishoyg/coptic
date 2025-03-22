export function developerMode() {
  return localStorage.getItem('dev') == 'true';
}

export function time(name: string) {
  if (developerMode()) {
    console.time(name);
  }
}

export function timeEnd(name: string) {
  if (developerMode()) {
    console.timeEnd(name);
  }
}
