enum Colors {
  RESET = '\x1b[0m',
  BLACK = '\x1b[30m',
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  PURPLE = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m',
}

/**
 *
 */
export function developerMode() {
  return localStorage.getItem('dev') == 'true';
}

/**
 *
 * @param name
 */
export function time(name: string) {
  if (developerMode()) {
    console.time(name);
  }
}

/**
 *
 * @param name
 */
export function timeEnd(name: string) {
  if (developerMode()) {
    console.timeEnd(name);
  }
}

/**
 *
 * @param color
 * @param recolor
 * @param severity
 * @param throwException
 * @param {...any} args
 */
function _print(
  color: string,
  recolor: string,
  severity: '' | 'info' | 'warn' | 'error' | 'fatal',
  throwException = false,
  ...args: unknown[]
): void {
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

/**
 *
 * @param {...any} message
 */
export function info(...message: unknown[]): void {
  _print(Colors.GREEN, Colors.BLUE, 'info', false, ...message);
}

/**
 *
 * @param {...any} message
 */
export function warn(...message: unknown[]): void {
  _print(Colors.YELLOW, Colors.CYAN, 'warn', false, ...message);
}

/**
 *
 * @param {...any} message
 */
export function error(...message: unknown[]): void {
  _print(Colors.RED, Colors.PURPLE, 'error', false, ...message);
}

// Raise an exception.
/**
 *
 * @param {...any} message
 */
export function raise(...message: unknown[]) {
  _print(Colors.RED, Colors.PURPLE, 'error', true, ...message);
}

/**
 *
 * @param {...any} message
 */
export function fatal(...message: unknown[]) {
  _print(Colors.RED, Colors.PURPLE, 'fatal', false, ...message);
  process.exit(1);
}

// Evaluate the condition. If it fails, log an error message!
/**
 *
 * @param condition
 * @param {...any} message
 */
export function err(condition: boolean, ...message: unknown[]) {
  if (condition) {
    return;
  }
  error(...message);
}

// Evaluate the condition. If it fails, raise an exception.
/**
 *
 * @param condition
 * @param {...any} message
 */
export function ass(condition: boolean, ...message: unknown[]) {
  if (condition) {
    return;
  }
  raise(...message);
}

// Evaluate the condition. If it fails, exit!
/**
 *
 * @param condition
 * @param {...any} message
 */
export function assass(condition: boolean, ...message: unknown[]) {
  if (condition) {
    return;
  }
  fatal(...message);
}
