import { mapErrorToResponse } from '@giants/errors';
import {
  type HelloResponse,
  helloRequestSchema,
  parseRequest,
} from '@giants/schema';
import { createTelemetry, instrument } from '@giants/telemetry';
import type { APIGatewayProxyHandler } from 'aws-lambda';

const telemetry = createTelemetry({ serviceName: 'hello' });

export const handler: APIGatewayProxyHandler = instrument(
  telemetry,
  async (event) => {
    try {
      const request = parseRequest(
        event.queryStringParameters ?? {},
        helloRequestSchema,
      );
      if ('statusCode' in request) return request;

      const body: HelloResponse = {
        message: `hello, ${request.name ?? 'world'}`,
      };

      return {
        statusCode: 200,
        body: JSON.stringify(body),
      };
    } catch (error) {
      return mapErrorToResponse(error, telemetry.logger);
    }
  },
);
