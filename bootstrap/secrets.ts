export interface SecretDefinition {
  description: string;
  name: string;
  template: Record<string, unknown>;
}

export const secrets: SecretDefinition[] = [
  // Add your app's secrets here. Example:
  //
  // {
  //   description: 'Example API credentials',
  //   name: 'example/credentials',
  //   template: { apiKey: '' },
  // },
];
