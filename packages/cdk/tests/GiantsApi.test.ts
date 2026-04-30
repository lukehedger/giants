import { describe, expect, test } from 'bun:test';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GiantsApi } from '../GiantsApi';

const fixture = new URL('fixtures', import.meta.url).pathname;

const findLambdaEnv = (template: Template): Record<string, unknown> => {
  const fns = template.findResources('AWS::Lambda::Function');
  const first = Object.values(fns)[0] as {
    Properties: { Environment: { Variables: Record<string, unknown> } };
  };
  return first.Properties.Environment.Variables;
};

describe('GiantsApi', () => {
  test('creates a REST API with the provided name', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      basePath: fixture,
      name: 'example',
      routes: [{ method: 'GET', path: 'handler' }],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'example',
    });
  });

  test('deploys a Lambda per route', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      basePath: fixture,
      name: 'example',
      routes: [
        { method: 'GET', path: 'handler' },
        { method: 'POST', path: 'handler', entry: 'handler' },
      ],
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  test('skips routes marked local:false when isLocal is true', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      basePath: fixture,
      isLocal: true,
      name: 'example',
      routes: [
        { method: 'GET', path: 'handler' },
        { method: 'POST', path: 'handler', entry: 'handler', local: false },
      ],
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('wires an API Gateway method per route', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      basePath: fixture,
      name: 'example',
      routes: [{ method: 'GET', path: 'handler' }],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'GET',
      AuthorizationType: Match.stringLikeRegexp('NONE'),
    });
  });

  test('per-route environment overrides stack-wide environment', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      basePath: fixture,
      name: 'example',
      environment: { FEATURE_FLAG: 'off', STACK_ONLY: 'yes' },
      routes: [
        {
          method: 'GET',
          path: 'handler',
          environment: { FEATURE_FLAG: 'on' },
        },
      ],
    });
    const template = Template.fromStack(stack);
    const env = findLambdaEnv(template);
    expect(env.FEATURE_FLAG).toBe('on');
    expect(env.STACK_ONLY).toBe('yes');
  });

  test('threads appConfigEnvironment through to each handler', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsApi(stack, 'Api', {
      appConfigApplication: 'example',
      appConfigEnvironment: 'prod',
      basePath: fixture,
      name: 'example',
      routes: [{ method: 'GET', path: 'handler' }],
    });
    const template = Template.fromStack(stack);
    const env = findLambdaEnv(template);
    expect(env.APPCONFIG_ENVIRONMENT).toBe('prod');
  });
});
