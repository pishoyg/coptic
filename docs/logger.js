/** Package logger defines logging helpers. */
/* eslint-disable no-console */
import * as dev from './dev.js';
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
/**
 * Start a timer (only if developer mode is active).
 * @param name - Timer name.
 */
export function time(name) {
  if (dev.get()) {
    console.time(name);
  }
}
/**
 * End a timer (only if developer mode is active).
 * @param name
 */
export function timeEnd(name) {
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
function print(color, recolor, severity, throwException = false, ...args) {
  const message = `\x1b[2m${color}${severity ? `${severity.charAt(0).toUpperCase() + severity.slice(1)}: ` : ''}\x1b[0m${args
    .map((arg, idx) => (idx & 1 ? recolor : color) + String(arg))
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
export function info(...message) {
  print(Colors.GREEN, Colors.BLUE, 'info', false, ...message);
}
/**
 * Log a warning message to the console.
 * @param {...any} message - Message to log.
 */
export function warn(...message) {
  print(Colors.YELLOW, Colors.CYAN, 'warn', false, ...message);
}
/**
 * Log an error message to the console.
 * @param {...any} message - Message to log.
 */
export function error(...message) {
  print(Colors.RED, Colors.PURPLE, 'error', false, ...message);
}
/**
 * Raise an exception, and log an error message to the console.
 *
 * @param {...any} message - Message to log.
 */
export function fatal(...message) {
  print(Colors.RED, Colors.PURPLE, 'error', true, ...message);
}
/**
 * Evaluate the condition. If it fails, raise an exception, and log an error
 * message to the console.
 *
 * @param condition - Condition to evaluate.
 * @param {...any} message - Message to log (if the condition is not satisfied).
 */
export function ensure(condition, ...message) {
  if (!condition) {
    fatal(...message);
  }
}
/**
 *
 * @param condition
 * @param {...any} message
 * TODO: (#0) Prefer using `check` to `error`.
 */
export function check(condition, ...message) {
  if (!condition) {
    error(...message);
  }
}
