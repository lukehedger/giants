/** biome-ignore-all lint/suspicious/noConsole: local telemetry uses console */
import type {
  Telemetry,
  TelemetryConfig,
  TelemetryLogger,
  TelemetryMetrics,
  TelemetryTracer,
} from './types.ts';

const createLocalLogger = (serviceName: string): TelemetryLogger => {
  let persistentKeys: Record<string, unknown> = {};

  const format = (
    level: string,
    message: string,
    extra?: Record<string, unknown>,
  ) =>
    JSON.stringify({
      level,
      service: serviceName,
      message,
      ...persistentKeys,
      ...extra,
    });

  return {
    debug: (message, extra) => console.debug(format('DEBUG', message, extra)),
    error: (message, error) => {
      if (error instanceof Error) {
        console.error(
          format('ERROR', message, {
            error: error.message,
            stack: error.stack,
          }),
        );
      } else {
        console.error(format('ERROR', message, error));
      }
    },
    info: (message, extra) => console.info(format('INFO', message, extra)),
    warn: (message, extra) => console.warn(format('WARN', message, extra)),
    appendKeys: (keys) => {
      persistentKeys = { ...persistentKeys, ...keys };
    },
    resetKeys: (keys) => {
      for (const key of keys) {
        delete persistentKeys[key];
      }
    },
  };
};

const noopTracer: TelemetryTracer = {
  addAnnotation: () => {},
  addMetadata: () => {},
  annotateColdStart: () => {},
  trace: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
};

const noopMetrics: TelemetryMetrics = {
  addDimension: () => {},
  addDimensions: () => {},
  addMetric: () => {},
  flush: () => {},
};

export const localTelemetry = (config: TelemetryConfig): Telemetry => ({
  logger: createLocalLogger(config.serviceName),
  metrics: noopMetrics,
  tracer: noopTracer,
});
