/* This test is generated using Gemini. */
import * as str from '../str';

describe('isUpper', () => {
  test('should return true for an empty string', () => {
    expect(str.isUpper('')).toBe(true);
  });

  test('should return true for a string with all uppercase letters', () => {
    expect(str.isUpper('HELLO')).toBe(true);
  });

  test('should return true for a string with mixed uppercase and non-alphabetic characters', () => {
    expect(str.isUpper('HELLO WORLD! 123')).toBe(true);
  });

  test('should return false for a string with any lowercase letters', () => {
    expect(str.isUpper('Hello')).toBe(false);
    expect(str.isUpper('hello')).toBe(false);
    expect(str.isUpper('HELLO world')).toBe(false);
  });

  test('should return true for a string with only numbers and symbols', () => {
    expect(str.isUpper('12345')).toBe(true);
    expect(str.isUpper('!@#$%^')).toBe(true);
    expect(str.isUpper('123!@#')).toBe(true);
  });

  test('should handle Unicode characters correctly (uppercase)', () => {
    expect(str.isUpper('ÄÖÜ')).toBe(true);
    expect(str.isUpper('ÇĞİŞ')).toBe(true);
  });

  test('should handle Unicode characters correctly (mixed case)', () => {
    expect(str.isUpper('ÄöÜ')).toBe(false);
    expect(str.isUpper('ÇğİŞ')).toBe(false);
  });
});

describe('isLower', () => {
  test('should return true for an empty string', () => {
    expect(str.isLower('')).toBe(true);
  });

  test('should return true for a string with all lowercase letters', () => {
    expect(str.isLower('hello')).toBe(true);
  });

  test('should return true for a string with mixed lowercase and non-alphabetic characters', () => {
    expect(str.isLower('hello world! 123')).toBe(true);
  });

  test('should return false for a string with any uppercase letters', () => {
    expect(str.isLower('Hello')).toBe(false);
    expect(str.isLower('HELLO')).toBe(false);
    expect(str.isLower('hello WORLD')).toBe(false);
  });

  test('should return true for a string with only numbers and symbols', () => {
    expect(str.isLower('12345')).toBe(true);
    expect(str.isLower('!@#$%^')).toBe(true);
    expect(str.isLower('123!@#')).toBe(true);
  });

  test('should handle Unicode characters correctly (lowercase)', () => {
    expect(str.isLower('äöü')).toBe(true);
    expect(str.isLower('çğiş')).toBe(true);
  });

  test('should handle Unicode characters correctly (mixed case)', () => {
    expect(str.isLower('ÄöÜ')).toBe(false);
    expect(str.isLower('ÇğİŞ')).toBe(false);
  });
});
