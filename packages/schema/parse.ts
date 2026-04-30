import type { ErrorResponse } from '@giants/errors';
import { validationErrorResponse } from '@giants/errors';
import type { ZodType } from 'zod';

/**
 * Parse `input` against `schema`. On success, returns the typed value.
 * On failure, returns the validation error response ready to hand back
 * from a Lambda handler.
 *
 * Usage:
 *   const request = parseRequest(event.queryStringParameters ?? {}, helloRequestSchema);
 *   if ('statusCode' in request) return request;
 *   // request is typed as HelloRequest here
 */
export const parseRequest = <T>(
  input: unknown,
  schema: ZodType<T>,
): T | ErrorResponse => {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  return validationErrorResponse(
    result.error.issues.map((issue) => ({
      property: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  );
};
