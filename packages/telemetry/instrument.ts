import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Telemetry } from './types.ts';

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export const instrument =
  (telemetry: Telemetry, handler: Handler): Handler =>
  async (event) => {
    const { logger, metrics, tracer } = telemetry;

    logger.appendKeys({ method: event.httpMethod, resource: event.resource });

    tracer.annotateColdStart();

    let error: unknown;

    try {
      const result = await tracer.trace('handler', () => handler(event));

      tracer.addAnnotation('status_code', result.statusCode);

      logger.appendKeys({ status_code: result.statusCode });

      return result;
    } catch (e) {
      error = e;

      throw e;
    } finally {
      if (error) {
        logger.error('invocation', error as Error);
      } else {
        logger.info('invocation');
      }

      metrics.flush();
    }
  };
