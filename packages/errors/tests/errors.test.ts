import { describe, expect, mock, test } from 'bun:test';
import type { TelemetryLogger } from '@giants/telemetry';
import { mapErrorToResponse } from '../map-error-to-response';
import { validationErrorResponse } from '../validation-error-response';

const stubLogger = (): TelemetryLogger => ({
  debug: mock(() => {}),
  error: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  appendKeys: mock(() => {}),
  resetKeys: mock(() => {}),
});

describe('mapErrorToResponse', () => {
  test('returns a 500 with an InternalServerError body', () => {
    const res = mapErrorToResponse(new Error('boom'), stubLogger());
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.errorCode).toBe('InternalServerError');
    expect(body.errorId).toEqual(expect.any(String));
  });

  test('calls logger.error with the original error', () => {
    const logger = stubLogger();
    const error = new Error('boom');
    mapErrorToResponse(error, logger);
    expect(logger.error).toHaveBeenCalledWith('mapErrorToResponse', error);
  });

  test('appends errorId to the logger so the wide-event carries it', () => {
    const logger = stubLogger();
    const res = mapErrorToResponse(new Error('boom'), logger);
    const body = JSON.parse(res.body);
    expect(logger.appendKeys).toHaveBeenCalledWith({ errorId: body.errorId });
  });

  test('appends errorId BEFORE logging so the ERROR line carries it too', () => {
    const order: string[] = [];
    const logger: TelemetryLogger = {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      resetKeys: mock(() => {}),
      appendKeys: mock(() => {
        order.push('appendKeys');
      }),
      error: mock(() => {
        order.push('error');
      }),
    };
    mapErrorToResponse(new Error('boom'), logger);
    expect(order).toEqual(['appendKeys', 'error']);
  });
});

describe('validationErrorResponse', () => {
  test('returns a 400 with the supplied details', () => {
    const res = validationErrorResponse([
      { property: 'amount', message: 'must be positive' },
    ]);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.errorCode).toBe('ValidationError');
    expect(body.details).toEqual([
      { property: 'amount', message: 'must be positive' },
    ]);
  });
});
