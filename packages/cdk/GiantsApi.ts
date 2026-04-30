import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import type { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import type { GiantsAuthoriser } from './GiantsAuthoriser.ts';
import {
  GiantsFunction,
  type GiantsFunctionProps,
  type TableAccess,
} from './GiantsFunction.ts';

export type Route = {
  auth?: boolean;
  authScopes?: string[];
  configure?: (handler: GiantsFunction) => void;
  description?: string;
  entry?: string;
  environment?: GiantsFunctionProps['environment'];
  local?: boolean;
  memory?: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  secrets?: string[];
  tableAccess?: TableAccess;
  timeout?: number;
  tracing?: boolean;
};

export interface GiantsApiProps {
  appConfigApplication: string;
  appConfigEnvironment?: string;
  authoriser?: GiantsAuthoriser;
  basePath: string;
  database?: ITable;
  description?: string;
  environment?: NodejsFunctionProps['environment'];
  isLocal?: boolean;
  name: string;
  routes: Route[];
}

export class GiantsApi extends Construct {
  constructor(scope: Construct, id: string, props: GiantsApiProps) {
    super(scope, id);

    const api = new RestApi(this, 'Resource', {
      deployOptions: {
        metricsEnabled: true,
        tracingEnabled: true,
      },
      description: props.description,
      restApiName: props.name,
    });

    for (const route of props.routes) {
      if (props.isLocal && route.local === false) continue;

      const entry = route.entry ?? route.path;
      const sanitisedPath = route.path
        .replaceAll('/', '-')
        .replaceAll(/[{}]/g, '');
      const name = `${route.method}-${sanitisedPath}`.replace(/^-|-$/g, '');

      // Stack-wide env provides defaults; per-route env overrides them so
      // route-specific keys (e.g. a legacy URL for just one route) beat the
      // stack baseline.
      const environment = { ...props.environment, ...route.environment };

      const handler = new GiantsFunction(this, name, {
        appConfigApplication: props.appConfigApplication,
        appConfigEnvironment: props.appConfigEnvironment,
        description: route.description,
        entry: `${props.basePath}/${entry}.ts`,
        environment,
        memorySize: route.memory,
        secrets: route.secrets,
        table: props.database,
        tableAccess: route.tableAccess,
        timeout: route.timeout,
        tracing: route.tracing,
      });

      route.configure?.(handler);

      const authOptions =
        route.auth && props.authoriser
          ? {
              ...props.authoriser.methodOptions,
              authorizationScopes: route.authScopes,
            }
          : undefined;

      api.root
        .resourceForPath(route.path)
        .addMethod(route.method, new LambdaIntegration(handler), authOptions);
    }
  }
}
