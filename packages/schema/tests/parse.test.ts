import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { parseRequest } from '../parse';

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
});

describe('parseRequest', () => {
  test('returns the parsed value on success', () => {
    const result = parseRequest({ name: 'Luke', age: 30 }, schema);
    expect(result).toEqual({ name: 'Luke', age: 30 });
  });

  test('returns a 400 ErrorResponse on failure', () => {
    const result = parseRequest({ name: '', age: -1 }, schema);
    expect(result).toMatchObject({ statusCode: 400 });
    if ('statusCode' in result) {
      const body = JSON.parse(result.body);
      expect(body.errorCode).toBe('ValidationError');
      expect(body.details.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('issue paths become dotted property strings', () => {
    const nested = z.object({
      user: z.object({ email: z.email() }),
    });
    const result = parseRequest({ user: { email: 'not-an-email' } }, nested);
    if ('statusCode' in result) {
      const body = JSON.parse(result.body);
      expect(body.details[0].property).toBe('user.email');
    } else {
      throw new Error('expected validation failure');
    }
  });

  test('empty path becomes "(root)"', () => {
    const result = parseRequest('not-an-object', schema);
    if ('statusCode' in result) {
      const body = JSON.parse(result.body);
      expect(body.details[0].property).toBe('(root)');
    } else {
      throw new Error('expected validation failure');
    }
  });
});
