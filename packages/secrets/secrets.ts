import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

/**
 * Structural schema type — matches Zod, Valibot, ArkType, or any validator
 * that exposes a `parse(unknown): T` method.
 */
export interface Schema<T> {
  parse(input: unknown): T;
}

export interface SecretsProvider {
  getSecret<Credentials>(
    secretName: string,
    schema?: Schema<Credentials>,
  ): Promise<Credentials>;
}

export const powertoolsSecrets = (maxAge = 300): SecretsProvider => ({
  getSecret: async <Credentials>(
    secretName: string,
    schema?: Schema<Credentials>,
  ): Promise<Credentials> => {
    const raw = await getSecret(secretName, {
      maxAge,
      transform: 'json',
    });

    return schema ? schema.parse(raw) : (raw as Credentials);
  },
});
