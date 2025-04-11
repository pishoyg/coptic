var Colors;
(function (Colors) {
  Colors['RESET'] = '\u001B[0m';
  Colors['BLACK'] = '\u001B[30m';
  Colors['RED'] = '\u001B[31m';
  Colors['GREEN'] = '\u001B[32m';
  Colors['YELLOW'] = '\u001B[33m';
  Colors['BLUE'] = '\u001B[34m';
  Colors['PURPLE'] = '\u001B[35m';
  Colors['CYAN'] = '\u001B[36m';
  Colors['WHITE'] = '\u001B[37m';
})(Colors || (Colors = {}));
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
function _print(color, recolor, severity, throwException = false, ...args) {
  const message =
    `\x1b[2m${color}` +
    (severity
      ? `${severity.charAt(0).toUpperCase() + severity.slice(1)}: `
      : '') +
    '\x1b[0m' +
    args
      .map((arg, idx) => (idx % 2 === 0 ? color : recolor) + String(arg))
      .join(' ') +
    Colors.RESET;
  if (throwException) {
    throw new Error(message);
  } else {
    console.log(message);
  }
}
export function info(...message) {
  _print(Colors.GREEN, Colors.BLUE, 'info', false, ...message);
}
export function warn(...message) {
  _print(Colors.YELLOW, Colors.CYAN, 'warn', false, ...message);
}
export function error(...message) {
  _print(Colors.RED, Colors.PURPLE, 'error', false, ...message);
}
// Raise an exception.
export function raise(...message) {
  _print(Colors.RED, Colors.PURPLE, 'error', true, ...message);
}
export function fatal(...message) {
  _print(Colors.RED, Colors.PURPLE, 'fatal', false, ...message);
  process.exit(1);
}
// Evaluate the condition. If it fails, log an error message!
export function err(condition, ...message) {
  if (condition) {
    return;
  }
  error(...message);
}
// Evaluate the condition. If it fails, raise an exception.
export function ass(condition, ...message) {
  if (condition) {
    return;
  }
  raise(...message);
}
// Evaluate the condition. If it fails, exit!
export function assass(condition, ...message) {
  if (condition) {
    return;
  }
  fatal(...message);
}
