export function developerMode() {
  return localStorage.getItem('dev') == 'true';
}
export function time(name) {
  if (developerMode()) {
    console.time(name);
  }
}
export function timeEnd(name) {
  if (developerMode()) {
    console.timeEnd(name);
  }
}
