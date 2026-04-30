import { Arn, ArnFormat, Duration, Stack } from 'aws-cdk-lib';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import {
  LogLevel,
  NodejsFunction,
  type NodejsFunctionProps,
  OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';

export type TableAccess = 'read' | 'readwrite';

export interface GiantsFunctionProps {
  appConfigApplication: string;
  appConfigEnvironment?: string;
  description?: string;
  entry: string;
  environment?: NodejsFunctionProps['environment'];
  memorySize?: number;
  secrets?: string[];
  table?: ITable;
  tableAccess?: TableAccess;
  timeout?: number;
  tracing?: boolean;
}

const buildEnvironment = (
  props: GiantsFunctionProps,
): NodejsFunctionProps['environment'] => {
  const env: Record<string, string> = {
    APPCONFIG_APPLICATION: props.appConfigApplication,
    NODE_OPTIONS: '--enable-source-maps',
  };
  if (props.appConfigEnvironment) {
    env.APPCONFIG_ENVIRONMENT = props.appConfigEnvironment;
  }
  if (props.table) {
    env.TABLE_NAME = props.table.tableName;
  }
  return { ...env, ...props.environment };
};

export class GiantsFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: GiantsFunctionProps) {
    const { tracing = true } = props;

    super(scope, id, {
      architecture: Architecture.ARM_64,
      bundling: {
        banner:
          'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
        format: OutputFormat.ESM,
        logLevel: LogLevel.SILENT,
        minify: true,
        sourceMap: true,
      },
      description: props.description,
      entry: props.entry,
      environment: buildEnvironment(props),
      memorySize: props.memorySize ?? 128,
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(props.timeout ?? 10),
      tracing: tracing ? Tracing.ACTIVE : Tracing.DISABLED,
    });

    // AppConfig resource-level ARNs require the application ID (a GUID), not
    // the name we're given. Wildcard here is scoped by action to AppConfig's
    // read-only configuration APIs; tighten by threading the Application
    // construct through if the blast radius matters for a given service.
    this.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'appconfig:GetLatestConfiguration',
          'appconfig:StartConfigurationSession',
        ],
        effect: Effect.ALLOW,
        resources: ['*'],
      }),
    );

    if (props.secrets?.length) {
      this.addToRolePolicy(
        new PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          effect: Effect.ALLOW,
          resources: props.secrets.map((prefix) =>
            Arn.format(
              {
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                resource: 'secret',
                resourceName: `${prefix}*`,
                service: 'secretsmanager',
              },
              Stack.of(this),
            ),
          ),
        }),
      );
    }

    if (tracing) {
      // X-Ray Put* actions don't support resource-level permissions.
      this.addToRolePolicy(
        new PolicyStatement({
          actions: ['xray:PutTelemetryRecords', 'xray:PutTraceSegments'],
          effect: Effect.ALLOW,
          resources: ['*'],
        }),
      );
    }

    if (props.table) {
      // Default to read-only — least privilege wins unless the handler
      // actively needs to write. Opt in to 'readwrite' per-route when it
      // does.
      const access = props.tableAccess ?? 'read';
      if (access === 'readwrite') {
        props.table.grantReadWriteData(this);
      } else {
        props.table.grantReadData(this);
      }
    }
  }
}
