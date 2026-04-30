import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { Telemetry } from '../types.ts';

// ---------------------------------------------------------------------------
// localTelemetry
// ---------------------------------------------------------------------------

describe('localTelemetry', () => {
  const infoSpy = spyOn(console, 'info');
  const warnSpy = spyOn(console, 'warn');
  const errorSpy = spyOn(console, 'error');
  const debugSpy = spyOn(console, 'debug');

  afterEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
    debugSpy.mockClear();
  });

  const getLocalTelemetry = async () => {
    const { localTelemetry } = await import('../local.ts');
    return localTelemetry;
  };

  test('logger.info outputs structured JSON', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.info('hello', { key: 'value' });

    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'INFO',
        service: 'test-service',
        message: 'hello',
        key: 'value',
      }),
    );
  });

  test('logger.warn outputs structured JSON', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.warn('warning');

    expect(warnSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'WARN',
        service: 'test-service',
        message: 'warning',
      }),
    );
  });

  test('logger.error handles Error objects', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    const error = new Error('boom');
    logger.error('failed', error);

    const output = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(output.level).toBe('ERROR');
    expect(output.service).toBe('test-service');
    expect(output.message).toBe('failed');
    expect(output.error).toBe('boom');
    expect(output.stack).toBeDefined();
  });

  test('logger.error handles plain objects', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.error('failed', { code: 'TIMEOUT' });

    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'ERROR',
        service: 'test-service',
        message: 'failed',
        code: 'TIMEOUT',
      }),
    );
  });

  test('logger.debug outputs structured JSON', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.debug('details', { x: 1 });

    expect(debugSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'DEBUG',
        service: 'test-service',
        message: 'details',
        x: 1,
      }),
    );
  });

  test('logger.appendKeys includes keys in subsequent logs', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.appendKeys({ requestId: 'req-123', userId: 'u-456' });
    logger.info('request handled');

    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'INFO',
        service: 'test-service',
        message: 'request handled',
        requestId: 'req-123',
        userId: 'u-456',
      }),
    );
  });

  test('logger.resetKeys removes previously appended keys', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { logger } = localTelemetry({ serviceName: 'test-service' });

    logger.appendKeys({ requestId: 'req-123', userId: 'u-456' });
    logger.resetKeys(['userId']);
    logger.info('done');

    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'INFO',
        service: 'test-service',
        message: 'done',
        requestId: 'req-123',
      }),
    );
  });

  test('tracer.trace executes and returns the result', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { tracer } = localTelemetry({ serviceName: 'test-service' });

    const result = await tracer.trace('operation', async () => 42);

    expect(result).toBe(42);
  });

  test('tracer.trace re-throws errors', async () => {
    const localTelemetry = await getLocalTelemetry();
    const { tracer } = localTelemetry({ serviceName: 'test-service' });

    await expect(
      tracer.trace('operation', async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');
  });
});

// ---------------------------------------------------------------------------
// powertoolsTelemetry
// ---------------------------------------------------------------------------

const mockLoggerInfo = mock();
const mockLoggerWarn = mock();
const mockLoggerError = mock();
const mockLoggerDebug = mock();
const mockLoggerAppendKeys = mock();
const mockLoggerRemoveKeys = mock();

mock.module('@aws-lambda-powertools/logger', () => ({
  Logger: class {
    info = mockLoggerInfo;
    warn = mockLoggerWarn;
    error = mockLoggerError;
    debug = mockLoggerDebug;
    appendKeys = mockLoggerAppendKeys;
    removeKeys = mockLoggerRemoveKeys;
  },
}));

const mockSubsegmentClose = mock();
const mockSubsegmentAddError = mock();
const mockSubsegment = {
  close: mockSubsegmentClose,
  addError: mockSubsegmentAddError,
  parent: { name: 'parent' },
};

const mockGetSegment = mock(() => ({
  addNewSubsegment: mock(() => mockSubsegment),
}));
const mockSetSegment = mock();
const mockPutAnnotation = mock();
const mockPutMetadata = mock();

const mockAnnotateColdStart = mock();

mock.module('@aws-lambda-powertools/tracer', () => ({
  Tracer: class {
    annotateColdStart = mockAnnotateColdStart;
    getSegment = mockGetSegment;
    setSegment = mockSetSegment;
    putAnnotation = mockPutAnnotation;
    putMetadata = mockPutMetadata;
  },
}));

const mockAddMetric = mock();
const mockAddDimension = mock();
const mockAddDimensions = mock();
const mockPublishStoredMetrics = mock();

mock.module('@aws-lambda-powertools/metrics', () => ({
  Metrics: class {
    addMetric = mockAddMetric;
    addDimension = mockAddDimension;
    addDimensions = mockAddDimensions;
    publishStoredMetrics = mockPublishStoredMetrics;
  },
  MetricUnit: { Count: 'Count', Milliseconds: 'Milliseconds' },
}));

describe('powertoolsTelemetry', () => {
  afterEach(() => {
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerAppendKeys.mockClear();
    mockLoggerRemoveKeys.mockClear();
    mockGetSegment.mockClear();
    mockSetSegment.mockClear();
    mockAnnotateColdStart.mockClear();
    mockPutAnnotation.mockClear();
    mockPutMetadata.mockClear();
    mockSubsegmentClose.mockClear();
    mockSubsegmentAddError.mockClear();
    mockAddMetric.mockClear();
    mockAddDimension.mockClear();
    mockAddDimensions.mockClear();
    mockPublishStoredMetrics.mockClear();
  });

  const getTelemetry = async () => {
    const { powertoolsTelemetry } = await import('../powertools.ts');
    return powertoolsTelemetry({ serviceName: 'test-service' });
  };

  test('logger.info delegates to Powertools Logger', async () => {
    const { logger } = await getTelemetry();

    logger.info('hello', { key: 'value' });

    expect(mockLoggerInfo).toHaveBeenCalledWith('hello', { key: 'value' });
  });

  test('logger.info passes empty object when no extra provided', async () => {
    const { logger } = await getTelemetry();

    logger.info('hello');

    expect(mockLoggerInfo).toHaveBeenCalledWith('hello', {});
  });

  test('logger.error delegates to Powertools Logger', async () => {
    const { logger } = await getTelemetry();
    const error = new Error('boom');

    logger.error('failed', error);

    expect(mockLoggerError).toHaveBeenCalledWith('failed', error);
  });

  test('logger.appendKeys delegates to Powertools Logger', async () => {
    const { logger } = await getTelemetry();

    logger.appendKeys({ requestId: 'abc' });

    expect(mockLoggerAppendKeys).toHaveBeenCalledWith({ requestId: 'abc' });
  });

  test('logger.resetKeys delegates to Powertools Logger removeKeys', async () => {
    const { logger } = await getTelemetry();

    logger.resetKeys(['requestId']);

    expect(mockLoggerRemoveKeys).toHaveBeenCalledWith(['requestId']);
  });

  test('tracer.annotateColdStart delegates to Powertools Tracer', async () => {
    const { tracer } = await getTelemetry();

    tracer.annotateColdStart();

    expect(mockAnnotateColdStart).toHaveBeenCalled();
  });

  test('tracer.trace creates and closes a subsegment', async () => {
    const { tracer } = await getTelemetry();

    const result = await tracer.trace('operation', async () => 'done');

    expect(result).toBe('done');
    expect(mockSetSegment).toHaveBeenCalledWith(mockSubsegment);
    expect(mockSubsegmentClose).toHaveBeenCalled();
  });

  test('tracer.trace records errors on the subsegment', async () => {
    const { tracer } = await getTelemetry();
    const error = new Error('fail');

    await expect(
      tracer.trace('operation', async () => {
        throw error;
      }),
    ).rejects.toThrow('fail');

    expect(mockSubsegmentAddError).toHaveBeenCalledWith(error);
    expect(mockSubsegmentClose).toHaveBeenCalled();
  });

  test('metrics.addMetric delegates to Powertools Metrics', async () => {
    const { metrics } = await getTelemetry();

    metrics.addMetric('RequestHandled', 'Count', 1);

    expect(mockAddMetric).toHaveBeenCalledWith('RequestHandled', 'Count', 1);
  });

  test('metrics.flush calls publishStoredMetrics', async () => {
    const { metrics } = await getTelemetry();

    metrics.flush();

    expect(mockPublishStoredMetrics).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createTelemetry
// ---------------------------------------------------------------------------

describe('createTelemetry', () => {
  afterEach(() => {
    delete process.env.LOCAL;
  });

  test('returns local telemetry when LOCAL is set', async () => {
    process.env.LOCAL = 'true';
    const { createTelemetry } = await import('../telemetry.ts');

    const telemetry = createTelemetry({ serviceName: 'test' });

    const result = await telemetry.tracer.trace('test', async () => 'local');
    expect(result).toBe('local');
  });

  test('returns powertools telemetry when LOCAL is not set', async () => {
    delete process.env.LOCAL;
    const { createTelemetry } = await import('../telemetry.ts');

    const telemetry = createTelemetry({ serviceName: 'test' });

    expect(telemetry.logger).toBeDefined();
    expect(telemetry.tracer).toBeDefined();
    expect(telemetry.metrics).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// instrument
// ---------------------------------------------------------------------------

describe('instrument', () => {
  const makeEvent = (overrides?: Partial<APIGatewayProxyEvent>) =>
    ({
      resource: '/hello',
      httpMethod: 'GET',
      body: null,
      headers: {},
      pathParameters: null,
      queryStringParameters: null,
      ...overrides,
    }) as APIGatewayProxyEvent;

  const makeMockTelemetry = () => {
    const telemetry = {
      logger: {
        info: mock(),
        warn: mock(),
        error: mock(),
        debug: mock(),
        appendKeys: mock(),
        resetKeys: mock(),
      },
      tracer: {
        trace: mock(async (_name: string, fn: () => Promise<unknown>) => fn()),
        annotateColdStart: mock(),
        addAnnotation: mock(),
        addMetadata: mock(),
      },
      metrics: {
        addMetric: mock(),
        addDimension: mock(),
        addDimensions: mock(),
        flush: mock(),
      },
    };

    return telemetry as unknown as typeof telemetry & Telemetry;
  };

  test('traces the handler invocation', async () => {
    const { instrument } = await import('../instrument.ts');
    const telemetry = makeMockTelemetry();
    const handler = mock(async () => ({ statusCode: 200, body: 'ok' }));

    const instrumented = instrument(telemetry, handler);
    await instrumented(makeEvent());

    expect(telemetry.tracer.trace).toHaveBeenCalledWith(
      'handler',
      expect.any(Function),
    );
  });

  test('appends request context to logger', async () => {
    const { instrument } = await import('../instrument.ts');
    const telemetry = makeMockTelemetry();
    const handler = mock(async () => ({ statusCode: 200, body: 'ok' }));

    const instrumented = instrument(telemetry, handler);
    await instrumented(makeEvent());

    expect(telemetry.logger.appendKeys).toHaveBeenCalledWith({
      resource: '/hello',
      method: 'GET',
    });
  });

  test('emits info wide event with status code on success', async () => {
    const { instrument } = await import('../instrument.ts');
    const telemetry = makeMockTelemetry();
    const handler = mock(async () => ({ statusCode: 201, body: 'created' }));

    const instrumented = instrument(telemetry, handler);
    await instrumented(makeEvent());

    expect(telemetry.tracer.addAnnotation).toHaveBeenCalledWith(
      'status_code',
      201,
    );
    expect(telemetry.logger.info).toHaveBeenCalledWith('invocation');
    expect(telemetry.logger.error).not.toHaveBeenCalled();
  });

  test('emits error wide event on failure', async () => {
    const { instrument } = await import('../instrument.ts');
    const telemetry = makeMockTelemetry();
    const error = new Error('handler error');
    const handler = mock(async () => {
      throw error;
    });

    const instrumented = instrument(telemetry, handler);

    await expect(instrumented(makeEvent())).rejects.toThrow('handler error');
    expect(telemetry.logger.error).toHaveBeenCalledWith('invocation', error);
    expect(telemetry.logger.info).not.toHaveBeenCalled();
  });

  test('flushes metrics even when handler throws', async () => {
    const { instrument } = await import('../instrument.ts');
    const telemetry = makeMockTelemetry();
    const handler = mock(async () => {
      throw new Error('handler error');
    });

    const instrumented = instrument(telemetry, handler);

    await expect(instrumented(makeEvent())).rejects.toThrow('handler error');
    expect(telemetry.metrics.flush).toHaveBeenCalled();
  });
});
