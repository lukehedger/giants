import { randomUUID } from 'node:crypto';
import type { TelemetryLogger } from '@giants/telemetry';

export interface ErrorResponse {
  statusCode: number;
  body: string;
}

interface ErrorBody {
  errorId: string;
  errorCode: string;
  message: string;
}

const respond = (statusCode: number, body: ErrorBody): ErrorResponse => ({
  statusCode,
  body: JSON.stringify(body),
});

export const mapErrorToResponse = (
  error: unknown,
  logger: TelemetryLogger,
): ErrorResponse => {
  const errorId = randomUUID();

  logger.error('mapErrorToResponse', error as Error);
  // Append errorId so the wide-event emitted at end-of-invocation carries
  // the same id that's in the response body — lets clients quote errorId
  // when asking for diagnostics.
  logger.appendKeys({ errorId });

  return respond(500, {
    errorId,
    errorCode: 'InternalServerError',
    message: 'Unexpected Error',
  });
};
