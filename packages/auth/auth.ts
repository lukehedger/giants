import type { APIGatewayProxyEvent } from 'aws-lambda';

const findHeader = (
  headers: APIGatewayProxyEvent['headers'],
  target: string,
): string | undefined => {
  const normalised = target.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === normalised && value !== undefined) {
      return value;
    }
  }
  return undefined;
};

export const getClientId = (
  event: APIGatewayProxyEvent,
): string | undefined => {
  if (event.requestContext.authorizer?.claims?.client_id) {
    return event.requestContext.authorizer.claims.client_id;
  }

  if (process.env.LOCAL) {
    return findHeader(event.headers, 'Client-Id');
  }
};
