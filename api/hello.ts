import { mapErrorToResponse, validationErrorResponse } from '@giants/errors';
import { createTelemetry, instrument } from '@giants/telemetry';
import type { APIGatewayProxyHandler } from 'aws-lambda';

const telemetry = createTelemetry({ serviceName: 'hello' });

const MAX_NAME_LENGTH = 100;

export const handler: APIGatewayProxyHandler = instrument(
  telemetry,
  async (event) => {
    try {
      const name = event.queryStringParameters?.name ?? 'world';

      if (name.length > MAX_NAME_LENGTH) {
        return validationErrorResponse([
          { property: 'name', message: `must be <= ${MAX_NAME_LENGTH} chars` },
        ]);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: `hello, ${name}` }),
      };
    } catch (error) {
      return mapErrorToResponse(error, telemetry.logger);
    }
  },
);
