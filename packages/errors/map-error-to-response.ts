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

  // Append errorId before logging so the ERROR line itself carries the id
  // the client will see in the response body — plus every subsequent log
  // in the invocation, including the end-of-invocation wide-event.
  logger.appendKeys({ errorId });
  logger.error('mapErrorToResponse', error as Error);

  return respond(500, {
    errorId,
    errorCode: 'InternalServerError',
    message: 'Unexpected Error',
  });
};
