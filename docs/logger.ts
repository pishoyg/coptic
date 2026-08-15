/** Package logger defines logging helpers. */
/* eslint-disable no-console */
import * as dev from './dev.js';

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
 * Log the given message to the console, alternative the colors of the arguments
 * using the two given colors.
 *
 * @param color - First color.
 * @param recolor - Second color.
 * @param severity - Severity.
 * @param throwException - Whether to throw an exception.
 * @param {...any} args - Printable arguments.
 */
function print(
  color: string,
  recolor: string,
  severity: '' | 'info' | 'warn' | 'error' | 'fatal',
  throwException = false,
  ...args: unknown[]
): void | never {
  const message = `\x1b[2m${color}${
    severity ? `${severity.charAt(0).toUpperCase() + severity.slice(1)}: ` : ''
  }\x1b[0m${args
    .map(
      (arg: unknown, idx: number): string =>
        (idx & 1 ? recolor : color) + String(arg)
    )
    .join(' ')}${Colors.RESET} `;

  if (throwException) {
    throw new Error(message);
  } else {
    console.log(message);
  }
}

/**
 * Log an info message to the console.
 *
 * NOTE: Informational messages are only logged in developer mode.
 *
 * @param {...any} message - Message to log.
 */
export function info(...message: unknown[]): void {
  dev.play(() => {
    print(Colors.GREEN, Colors.BLUE, 'info', false, ...message);
  });
}

/**
 * Log a warning message to the console.
 * @param {...any} message - Message to log.
 */
export function warn(...message: unknown[]): void {
  print(Colors.YELLOW, Colors.CYAN, 'warn', false, ...message);
}

// NOTE: Aim to avoid expensive sanity checks in production code. Instead, only
// execute them in a development environment. See `dev.ts`.
// Cheaper validations are OK to execute anywhere.

/**
 * Log an error message, or throw an exception in a development environment.
 *
 * - If this is a development environment (see `dev.dev`), throw an exception.
 * - Otherwise, simply log an error message to the console.
 *
 * Use the `error` method to report errors, and add graceful recovery logic
 * following the error message. In a plain user session, the function logs the
 * message and the recovery code is executed. In a development environment, the
 * exception alerts us to the error, giving us an opportunity to fix it.
 *
 * @param {...any} message - Message to log.
 */
export function error(...message: unknown[]): void {
  print(Colors.RED, Colors.PURPLE, 'error', dev.dev(), ...message);
}

/**
 * Raise an exception.
 *
 * @param {...any} message - Message to log.
 */
export function fatal(...message: unknown[]): never {
  print(Colors.RED, Colors.PURPLE, 'error', true, ...message);
  // The following line shouldn't be executed because the above line should
  // throw an exception.
  throw new Error();
}

/**
 * Evaluate the condition. If it fails, raise an exception.
 *
 * @param condition - Condition to evaluate.
 * @param {...any} message - Message to log (if the condition is not satisfied).
 */
export function ensure(
  condition: unknown,
  ...message: unknown[]
): asserts condition {
  if (!condition) {
    fatal(...message);
  }
}
