import { randomUUID } from 'node:crypto';

import type { ErrorResponse } from './map-error-to-response.ts';

export interface ValidationErrorDetail {
  message: string;
  property: string;
}

export const validationErrorResponse = (
  details: ValidationErrorDetail[],
): ErrorResponse => ({
  statusCode: 400,
  body: JSON.stringify({
    errorId: randomUUID(),
    errorCode: 'ValidationError',
    message: 'Request failed validation',
    details,
  }),
});
