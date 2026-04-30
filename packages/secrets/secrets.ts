export interface SecretsProvider {
  getSecret<Credentials>(secretName: string): Promise<Credentials>;
}

export const powertoolsSecrets = (maxAge = 300): SecretsProvider => ({
  getSecret: async <Credentials>(secretName: string): Promise<Credentials> => {
    const { getSecret } = await import(
      '@aws-lambda-powertools/parameters/secrets'
    );

    const secret = await getSecret(secretName, {
      maxAge,
      transform: 'json',
    });

    return secret as Credentials;
  },
});
