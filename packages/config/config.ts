export interface ConfigProvider {
  getConfig<Configuration>(profileName: string): Promise<Configuration>;
}

export interface PowertoolsConfigOptions {
  environment?: string;
  maxAge?: number;
}

export const localConfig = (): ConfigProvider => ({
  getConfig: async <Configuration>(
    profileName: string,
  ): Promise<Configuration> => {
    const key = `CONFIG_${profileName.toUpperCase().replaceAll('-', '_')}`;
    const value = process.env[key];

    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return JSON.parse(value) as Configuration;
  },
});

export const powertoolsConfig = (
  application: string,
  options: PowertoolsConfigOptions = {},
): ConfigProvider => ({
  getConfig: async <Configuration>(
    profileName: string,
  ): Promise<Configuration> => {
    const { getAppConfig } = await import(
      '@aws-lambda-powertools/parameters/appconfig'
    );

    const environment =
      options.environment ?? process.env.APPCONFIG_ENVIRONMENT ?? 'default';

    const config = await getAppConfig(profileName, {
      application,
      environment,
      maxAge: options.maxAge ?? 300,
      transform: 'json',
    });

    return config as Configuration;
  },
});
