import { describe, expect, test } from 'bun:test';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { GiantsFunction } from '../GiantsFunction';

const synth = (
  props: Partial<ConstructorParameters<typeof GiantsFunction>[2]> = {},
) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  new GiantsFunction(stack, 'TestFunction', {
    appConfigApplication: 'example',
    entry: new URL('fixtures/handler.ts', import.meta.url).pathname,
    ...props,
  });
  return Template.fromStack(stack);
};

describe('GiantsFunction', () => {
  test('uses ARM64 architecture', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Architectures: ['arm64'],
    });
  });

  test('uses Node.js 24 runtime', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs24.x',
    });
  });

  test('sets source maps env var', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          NODE_OPTIONS: '--enable-source-maps',
        }),
      },
    });
  });

  test('does not set TABLE_NAME when no table is provided', () => {
    const template = synth();
    const fn = template.findResources('AWS::Lambda::Function');
    const entry = Object.values(fn)[0] as {
      Properties: { Environment: { Variables: Record<string, unknown> } };
    };
    expect(entry.Properties.Environment.Variables.TABLE_NAME).toBeUndefined();
  });

  test('does not set APPCONFIG_ENVIRONMENT when not provided', () => {
    const template = synth();
    const fn = template.findResources('AWS::Lambda::Function');
    const entry = Object.values(fn)[0] as {
      Properties: { Environment: { Variables: Record<string, unknown> } };
    };
    expect(
      entry.Properties.Environment.Variables.APPCONFIG_ENVIRONMENT,
    ).toBeUndefined();
  });

  test('sets APPCONFIG_ENVIRONMENT when appConfigEnvironment is provided', () => {
    const template = synth({ appConfigEnvironment: 'prod' });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ APPCONFIG_ENVIRONMENT: 'prod' }),
      },
    });
  });

  test('grants AppConfig IAM permissions', () => {
    const template = synth();
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              'appconfig:GetLatestConfiguration',
              'appconfig:StartConfigurationSession',
            ],
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  test('grants Secrets Manager IAM when secrets prop is set', () => {
    const template = synth({ secrets: ['my-service/'] });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  test('enables X-Ray active tracing by default', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      TracingConfig: { Mode: 'Active' },
    });
  });

  test('grants X-Ray IAM permissions by default', () => {
    const template = synth();
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  test('disables tracing when tracing prop is false', () => {
    const template = synth({ tracing: false });
    template.hasResourceProperties('AWS::Lambda::Function', {
      TracingConfig: Match.absent(),
    });
  });

  test('grants DynamoDB read/write by default when table prop is set', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const table = new Table(stack, 'TestTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
    });
    new GiantsFunction(stack, 'TestFunction', {
      appConfigApplication: 'example',
      entry: new URL('fixtures/handler.ts', import.meta.url).pathname,
      table,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'dynamodb:BatchGetItem',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
            ]),
          }),
        ]),
      },
    });
  });

  test('grants read-only DynamoDB access when tableAccess is "read"', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const table = new Table(stack, 'TestTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
    });
    new GiantsFunction(stack, 'TestFunction', {
      appConfigApplication: 'example',
      entry: new URL('fixtures/handler.ts', import.meta.url).pathname,
      table,
      tableAccess: 'read',
    });
    const template = Template.fromStack(stack);

    const policies = template.findResources('AWS::IAM::Policy');
    const actions = new Set<string>();
    for (const policy of Object.values(policies)) {
      const doc = (
        policy as {
          Properties: {
            PolicyDocument: { Statement: Array<{ Action: string | string[] }> };
          };
        }
      ).Properties.PolicyDocument.Statement;
      for (const statement of doc) {
        const raw = statement.Action;
        for (const action of Array.isArray(raw) ? raw : [raw]) {
          actions.add(action);
        }
      }
    }
    expect(actions.has('dynamodb:GetItem')).toBe(true);
    expect(actions.has('dynamodb:PutItem')).toBe(false);
    expect(actions.has('dynamodb:DeleteItem')).toBe(false);
  });

  test('does not hardcode a functionName (avoids cross-stack collisions)', () => {
    const template = synth();
    const fn = template.findResources('AWS::Lambda::Function');
    const entry = Object.values(fn)[0] as {
      Properties: { FunctionName?: unknown };
    };
    expect(entry.Properties.FunctionName).toBeUndefined();
  });
});
