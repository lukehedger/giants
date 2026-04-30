import { describe, expect, test } from 'bun:test';
import { helloRequestSchema, helloResponseSchema } from '../hello';

describe('helloRequestSchema', () => {
  test('accepts an empty object (name is optional)', () => {
    const result = helloRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('accepts a short name', () => {
    const result = helloRequestSchema.safeParse({ name: 'world' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('world');
    }
  });

  test('rejects a name longer than 100 characters', () => {
    const result = helloRequestSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  test('rejects a non-string name', () => {
    const result = helloRequestSchema.safeParse({ name: 42 });
    expect(result.success).toBe(false);
  });
});

describe('helloResponseSchema', () => {
  test('accepts a message string', () => {
    const result = helloResponseSchema.safeParse({ message: 'hello, world' });
    expect(result.success).toBe(true);
  });

  test('rejects a missing message', () => {
    const result = helloResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
