import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import type {
  Telemetry,
  TelemetryConfig,
  TelemetryLogger,
  TelemetryMetrics,
  TelemetryTracer,
} from './types.ts';

const createLogger = (serviceName: string): TelemetryLogger => {
  const logger = new Logger({ serviceName });

  return {
    info: (message, extra) => logger.info(message, extra ?? {}),
    warn: (message, extra) => logger.warn(message, extra ?? {}),
    error: (message, error) => logger.error(message, error as Error),
    debug: (message, extra) => logger.debug(message, extra ?? {}),
    appendKeys: (keys) => logger.appendKeys(keys),
    resetKeys: (keys) => logger.removeKeys(keys),
  };
};

const createMetrics = (
  serviceName: string,
  namespace: string,
): TelemetryMetrics => {
  const metrics = new Metrics({ serviceName, namespace });

  return {
    addDimension: (name, value) => metrics.addDimension(name, value),
    addDimensions: (dimensions) => metrics.addDimensions(dimensions),
    addMetric: (name, unit, value) =>
      metrics.addMetric(
        name,
        unit as Parameters<Metrics['addMetric']>[1],
        value,
      ),
    flush: () => metrics.publishStoredMetrics(),
  };
};

const createTracer = (serviceName: string): TelemetryTracer => {
  const tracer = new Tracer({ serviceName });

  return {
    addAnnotation: (key, value) => tracer.putAnnotation(key, value),
    addMetadata: (key, value) => tracer.putMetadata(key, value),
    annotateColdStart: () => tracer.annotateColdStart(),
    trace: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const segment = tracer.getSegment();
      const subsegment = segment?.addNewSubsegment(name);

      if (subsegment) {
        tracer.setSegment(subsegment);
      }

      try {
        const result = await fn();

        return result;
      } catch (error) {
        subsegment?.addError(error as Error);

        throw error;
      } finally {
        subsegment?.close();

        if (segment) {
          tracer.setSegment(segment);
        }
      }
    },
  };
};

export const powertoolsTelemetry = (config: TelemetryConfig): Telemetry => {
  const namespace = config.namespace ?? 'Giants';

  return {
    logger: createLogger(config.serviceName),
    metrics: createMetrics(config.serviceName, namespace),
    tracer: createTracer(config.serviceName),
  };
};
