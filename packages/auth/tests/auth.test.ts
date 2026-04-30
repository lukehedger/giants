import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { getClientId } from '../auth';

const buildEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent =>
  ({
    headers: {},
    requestContext: {
      authorizer: undefined,
    },
    ...overrides,
  }) as unknown as APIGatewayProxyEvent;

describe('getClientId', () => {
  const originalLocal = process.env.LOCAL;

  beforeEach(() => {
    delete process.env.LOCAL;
  });

  afterEach(() => {
    if (originalLocal !== undefined) {
      process.env.LOCAL = originalLocal;
    }
  });

  test('returns client_id from Cognito authorizer claims', () => {
    const event = buildEvent({
      requestContext: {
        authorizer: { claims: { client_id: 'abc123' } },
      } as unknown as APIGatewayProxyEvent['requestContext'],
    });
    expect(getClientId(event)).toBe('abc123');
  });

  test('returns undefined when no authorizer and not local', () => {
    const event = buildEvent({ headers: { 'Client-Id': 'ignored' } });
    expect(getClientId(event)).toBeUndefined();
  });

  test('falls back to Client-Id header when LOCAL is set', () => {
    process.env.LOCAL = 'true';
    const event = buildEvent({ headers: { 'Client-Id': 'local-client' } });
    expect(getClientId(event)).toBe('local-client');
  });

  test('header lookup is case-insensitive (API Gateway lowercases)', () => {
    process.env.LOCAL = 'true';
    const event = buildEvent({ headers: { 'client-id': 'local-client' } });
    expect(getClientId(event)).toBe('local-client');
  });

  test('handles mixed-case header keys', () => {
    process.env.LOCAL = 'true';
    const event = buildEvent({ headers: { 'CLIENT-ID': 'local-client' } });
    expect(getClientId(event)).toBe('local-client');
  });
});
