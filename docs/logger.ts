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
 * Start a timer (only if developer mode is active).
 * @param name - Timer name.
 */
export function time(name: string): void {
  if (dev.get()) {
    console.time(name);
  }
}

/**
 * End a timer (only if developer mode is active).
 * @param name
 */
export function timeEnd(name: string): void {
  if (dev.get()) {
    console.timeEnd(name);
  }
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
): void {
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
 * @param {...any} message - Message to log.
 */
export function info(...message: unknown[]): void {
  print(Colors.GREEN, Colors.BLUE, 'info', false, ...message);
}

/**
 * Log a warning message to the console.
 * @param {...any} message - Message to log.
 */
export function warn(...message: unknown[]): void {
  print(Colors.YELLOW, Colors.CYAN, 'warn', false, ...message);
}

/**
 * Log an error message to the console.
 * @param {...any} message - Message to log.
 *
 * TODO: (#457) Abandon mere error message. Always use exceptions.
 */
export function error(...message: unknown[]): void {
  print(Colors.RED, Colors.PURPLE, 'error', false, ...message);
}

/**
 * Raise an exception, and log an error message to the console.
 *
 * @param {...any} message - Message to log.
 */
export function raise(...message: unknown[]): void {
  print(Colors.RED, Colors.PURPLE, 'error', true, ...message);
}

/**
 * Exit with a non-zero error code, and log an error message to the console.
 * NOTE: This is only available in Node.js, not in the browser.
 * TODO: (#457) Abandon Node.js validation.
 *
 * @param {...any} message - Message to log.
 */
export function fatal(...message: unknown[]): void {
  print(Colors.RED, Colors.PURPLE, 'fatal', false, ...message);
  process.exit(1);
}

/**
 * Evaluate the condition. If it fails, log an error message!
 *
 * @param condition - Condition to evaluate.
 * @param {...any} message - Message to log (if the condition is not satisfied).
 *
 * TODO: (#457): What is the point of an error message that we may or may not
 * see in the console? We should probably rely on exceptions to catch errors in
 * the pre-publish step.
 */
export function err(condition: boolean, ...message: unknown[]): void {
  if (condition) {
    return;
  }
  error(...message);
}

/**
 * Evaluate the condition. If it fails, raise an exception, and log an error
 * message to the console.
 *
 * @param condition - Condition to evaluate.
 * @param {...any} message - Message to log (if the condition is not satisfied).
 */
export function ass(condition: boolean, ...message: unknown[]): void {
  if (condition) {
    return;
  }
  raise(...message);
}

/**
 * Evaluate the condition. If it fails, exit with a non-zero status, and log an
 * error message to the console.
 * NOTE: This is only available in Node.js.
 *
 * @param condition - Condition to evaluate.
 * @param {...any} message - Message to log (if the condition is not satisfied).
 */
export function assass(condition: boolean, ...message: unknown[]): void {
  if (condition) {
    return;
  }
  fatal(...message);
}
