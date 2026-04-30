import { afterEach, describe, expect, mock, test } from 'bun:test';
import { powertoolsSecrets } from '../secrets';

const mockGetSecret = mock();

mock.module('@aws-lambda-powertools/parameters/secrets', () => ({
  getSecret: mockGetSecret,
}));

afterEach(() => {
  mockGetSecret.mockReset();
});

describe('powertoolsSecrets', () => {
  test('calls getSecret with default maxAge of 300', async () => {
    mockGetSecret.mockResolvedValueOnce({ key: 'value' });
    const secrets = powertoolsSecrets();

    await secrets.getSecret('my/secret');

    expect(mockGetSecret).toHaveBeenCalledWith('my/secret', {
      maxAge: 300,
      transform: 'json',
    });
  });

  test('calls getSecret with custom maxAge', async () => {
    mockGetSecret.mockResolvedValueOnce({ key: 'value' });
    const secrets = powertoolsSecrets(60);

    await secrets.getSecret('my/secret');

    expect(mockGetSecret).toHaveBeenCalledWith('my/secret', {
      maxAge: 60,
      transform: 'json',
    });
  });

  test('returns the secret value', async () => {
    const expected = { clientId: 'id', clientSecret: 'secret' };
    mockGetSecret.mockResolvedValueOnce(expected);
    const secrets = powertoolsSecrets();

    const result = await secrets.getSecret('my/secret');

    expect(result).toEqual(expected);
  });
});
