export type MetricUnit =
  | 'Seconds'
  | 'Microseconds'
  | 'Milliseconds'
  | 'Bytes'
  | 'Kilobytes'
  | 'Megabytes'
  | 'Gigabytes'
  | 'Terabytes'
  | 'Bits'
  | 'Kilobits'
  | 'Megabits'
  | 'Gigabits'
  | 'Terabits'
  | 'Percent'
  | 'Count'
  | 'Bytes/Second'
  | 'Kilobytes/Second'
  | 'Megabytes/Second'
  | 'Gigabytes/Second'
  | 'Terabytes/Second'
  | 'Bits/Second'
  | 'Kilobits/Second'
  | 'Megabits/Second'
  | 'Gigabits/Second'
  | 'Terabits/Second'
  | 'Count/Second'
  | 'None';

export interface TelemetryLogger {
  debug(message: string, extra?: Record<string, unknown>): void;
  error(message: string, error: Error | Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  appendKeys(keys: Record<string, unknown>): void;
  resetKeys(keys: string[]): void;
}

export interface TelemetryMetrics {
  addDimension(name: string, value: string): void;
  addDimensions(dimensions: Record<string, string>): void;
  addMetric(name: string, unit: MetricUnit, value: number): void;
  flush(): void;
}

export interface TelemetryTracer {
  addAnnotation(key: string, value: string | number | boolean): void;
  addMetadata(key: string, value: unknown): void;
  annotateColdStart(): void;
  trace<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export interface Telemetry {
  readonly logger: TelemetryLogger;
  readonly metrics: TelemetryMetrics;
  readonly tracer: TelemetryTracer;
}

export interface TelemetryConfig {
  serviceName: string;
  namespace?: string;
}
