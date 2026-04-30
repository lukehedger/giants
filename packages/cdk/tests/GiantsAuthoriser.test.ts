import { describe, expect, test } from 'bun:test';
import { App, Stack } from 'aws-cdk-lib';
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { GiantsAuthoriser } from '../GiantsAuthoriser';

describe('GiantsAuthoriser', () => {
  test('exposes Cognito method options', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const authoriser = new GiantsAuthoriser(stack, 'Authoriser', {
      userPoolArn:
        'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_abc',
    });
    expect(authoriser.methodOptions.authorizationType).toBe(
      AuthorizationType.COGNITO,
    );
    expect(authoriser.methodOptions.authorizer).toBeDefined();
  });
});
