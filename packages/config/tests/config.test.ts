import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { localConfig, powertoolsConfig } from '../config';

describe('localConfig', () => {
  const original = process.env.CONFIG_EXAMPLE;

  beforeEach(() => {
    delete process.env.CONFIG_EXAMPLE;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CONFIG_EXAMPLE;
    } else {
      process.env.CONFIG_EXAMPLE = original;
    }
  });

  test('reads from CONFIG_{PROFILE} env var and parses JSON', async () => {
    process.env.CONFIG_EXAMPLE = JSON.stringify({ enabled: true });
    const provider = localConfig();
    const value = await provider.getConfig<{ enabled: boolean }>('example');
    expect(value).toEqual({ enabled: true });
  });

  test('upcases and dash-normalises the profile name', async () => {
    process.env['CONFIG_MULTI_WORD'] = JSON.stringify({ ok: true });
    const provider = localConfig();
    const value = await provider.getConfig<{ ok: boolean }>('multi-word');
    expect(value).toEqual({ ok: true });
    delete process.env['CONFIG_MULTI_WORD'];
  });

  test('throws when the env var is missing', async () => {
    const provider = localConfig();
    await expect(provider.getConfig('example')).rejects.toThrow(
      'Missing environment variable: CONFIG_EXAMPLE',
    );
  });
});

const mockGetAppConfig = mock();

mock.module('@aws-lambda-powertools/parameters/appconfig', () => ({
  getAppConfig: mockGetAppConfig,
}));

describe('powertoolsConfig', () => {
  const originalEnvironment = process.env.APPCONFIG_ENVIRONMENT;

  afterEach(() => {
    mockGetAppConfig.mockReset();
    if (originalEnvironment === undefined) {
      delete process.env.APPCONFIG_ENVIRONMENT;
    } else {
      process.env.APPCONFIG_ENVIRONMENT = originalEnvironment;
    }
  });

  test('defaults environment to "default" when nothing is set', async () => {
    mockGetAppConfig.mockResolvedValueOnce({});
    delete process.env.APPCONFIG_ENVIRONMENT;
    await powertoolsConfig('example').getConfig('profile');
    expect(mockGetAppConfig).toHaveBeenCalledWith(
      'profile',
      expect.objectContaining({
        application: 'example',
        environment: 'default',
      }),
    );
  });

  test('reads APPCONFIG_ENVIRONMENT from the env when no option is passed', async () => {
    mockGetAppConfig.mockResolvedValueOnce({});
    process.env.APPCONFIG_ENVIRONMENT = 'prod';
    await powertoolsConfig('example').getConfig('profile');
    expect(mockGetAppConfig).toHaveBeenCalledWith(
      'profile',
      expect.objectContaining({ environment: 'prod' }),
    );
  });

  test('explicit options.environment wins over the env var', async () => {
    mockGetAppConfig.mockResolvedValueOnce({});
    process.env.APPCONFIG_ENVIRONMENT = 'prod';
    await powertoolsConfig('example', { environment: 'staging' }).getConfig(
      'profile',
    );
    expect(mockGetAppConfig).toHaveBeenCalledWith(
      'profile',
      expect.objectContaining({ environment: 'staging' }),
    );
  });

  test('defaults maxAge to 300s and respects options.maxAge', async () => {
    mockGetAppConfig.mockResolvedValueOnce({});
    await powertoolsConfig('example').getConfig('profile');
    expect(mockGetAppConfig).toHaveBeenCalledWith(
      'profile',
      expect.objectContaining({ maxAge: 300 }),
    );

    mockGetAppConfig.mockResolvedValueOnce({});
    await powertoolsConfig('example', { maxAge: 30 }).getConfig('profile');
    expect(mockGetAppConfig).toHaveBeenLastCalledWith(
      'profile',
      expect.objectContaining({ maxAge: 30 }),
    );
  });

  test('runs the raw value through an optional schema', async () => {
    const raw = { greeting: 'hi' };
    mockGetAppConfig.mockResolvedValueOnce(raw);
    const schema = {
      parse: mock((input: unknown) => input as typeof raw),
    };
    const result = await powertoolsConfig('example').getConfig(
      'profile',
      schema,
    );
    expect(schema.parse).toHaveBeenCalledWith(raw);
    expect(result).toEqual(raw);
  });

  test('propagates schema parse errors', async () => {
    mockGetAppConfig.mockResolvedValueOnce({ greeting: 42 });
    const schema = {
      parse: () => {
        throw new Error('bad shape');
      },
    };
    await expect(
      powertoolsConfig('example').getConfig('profile', schema),
    ).rejects.toThrow('bad shape');
  });
});

describe('localConfig with schema', () => {
  const original = process.env.CONFIG_EXAMPLE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CONFIG_EXAMPLE;
    } else {
      process.env.CONFIG_EXAMPLE = original;
    }
  });

  test('validates via schema.parse when supplied', async () => {
    process.env.CONFIG_EXAMPLE = JSON.stringify({ greeting: 'hi' });
    const schema = {
      parse: mock((input: unknown) => input as { greeting: string }),
    };
    const result = await localConfig().getConfig('example', schema);
    expect(schema.parse).toHaveBeenCalledWith({ greeting: 'hi' });
    expect(result).toEqual({ greeting: 'hi' });
  });
});
