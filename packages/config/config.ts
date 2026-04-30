import { getAppConfig } from '@aws-lambda-powertools/parameters/appconfig';

/**
 * Structural schema type — matches Zod, Valibot, ArkType, or any validator
 * that exposes a `parse(unknown): T` method.
 */
export interface Schema<T> {
  parse(input: unknown): T;
}

export interface ConfigProvider {
  getConfig<Configuration>(
    profileName: string,
    schema?: Schema<Configuration>,
  ): Promise<Configuration>;
}

export interface PowertoolsConfigOptions {
  environment?: string;
  maxAge?: number;
}

const validate = <Configuration>(
  raw: unknown,
  schema: Schema<Configuration> | undefined,
): Configuration => (schema ? schema.parse(raw) : (raw as Configuration));

export const localConfig = (): ConfigProvider => ({
  getConfig: async <Configuration>(
    profileName: string,
    schema?: Schema<Configuration>,
  ): Promise<Configuration> => {
    const key = `CONFIG_${profileName.toUpperCase().replaceAll('-', '_')}`;
    const value = process.env[key];

    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return validate(JSON.parse(value), schema);
  },
});

export const powertoolsConfig = (
  application: string,
  options: PowertoolsConfigOptions = {},
): ConfigProvider => ({
  getConfig: async <Configuration>(
    profileName: string,
    schema?: Schema<Configuration>,
  ): Promise<Configuration> => {
    const environment =
      options.environment ?? process.env.APPCONFIG_ENVIRONMENT ?? 'default';

    const raw = await getAppConfig(profileName, {
      application,
      environment,
      maxAge: options.maxAge ?? 300,
      transform: 'json',
    });

    return validate(raw, schema);
  },
});
