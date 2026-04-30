import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GiantsApi,
  GiantsAuthoriser,
  GiantsConfig,
  type Route,
} from '@giants/cdk';
import { type App, Stack, type StackProps } from 'aws-cdk-lib';
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { z } from 'zod';

const APP_NAME = 'example';

const exampleConfigSchema = z.object({
  greeting: z.string(),
});

const readEnvironment = (env: string, name: string): string =>
  readFileSync(
    join(import.meta.dir, `environments/${env}/${name}.json`),
    'utf-8',
  );

export class Example extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const env = this.node.getContext('env');
    const isLocal = env === 'local';

    let appConfigApplication = APP_NAME;
    let appConfigEnvironment: string | undefined;

    if (!isLocal) {
      const appConfig = new GiantsConfig(this, 'Config', {
        applicationName: APP_NAME,
        profiles: [
          {
            content: readEnvironment(env, 'example'),
            jsonSchema: z.toJSONSchema(exampleConfigSchema),
            name: 'example',
          },
        ],
      });
      appConfigApplication = appConfig.applicationName;
      appConfigEnvironment = appConfig.environmentName;
    }

    const localEnvironment = isLocal
      ? {
          CONFIG_EXAMPLE: readEnvironment('test', 'example'),
          LOCAL: 'true',
        }
      : undefined;

    const table = new TableV2(this, 'Table', {
      billing: Billing.onDemand(),
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      tableName: `${APP_NAME}-table`,
    });

    const userPoolArn = process.env.GIANTS_USER_POOL_ARN;
    const authoriser =
      !isLocal && userPoolArn
        ? new GiantsAuthoriser(this, 'Authoriser', { userPoolArn })
        : undefined;

    const routes: Route[] = [
      {
        method: 'GET',
        path: 'hello',
        description: 'Hello world',
        memory: 128,
        tableAccess: 'read',
        timeout: 10,
      },
    ];

    new GiantsApi(this, 'Api', {
      appConfigApplication,
      appConfigEnvironment,
      authoriser,
      basePath: join(import.meta.dir, '../api'),
      database: table,
      description: 'Example API',
      environment: localEnvironment,
      isLocal,
      name: APP_NAME,
      routes,
    });
  }
}
