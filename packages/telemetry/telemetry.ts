import { localTelemetry } from './local.ts';
import { powertoolsTelemetry } from './powertools.ts';
import type { Telemetry, TelemetryConfig } from './types.ts';

export const createTelemetry = (config: TelemetryConfig): Telemetry =>
  process.env.LOCAL ? localTelemetry(config) : powertoolsTelemetry(config);
