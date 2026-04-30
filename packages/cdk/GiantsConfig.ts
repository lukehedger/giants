import { Duration } from 'aws-cdk-lib';
import {
  Application,
  ConfigurationContent,
  DeploymentStrategy,
  Environment,
  HostedConfiguration,
  JsonSchemaValidator,
  RolloutStrategy,
} from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';

export interface ConfigProfile {
  content: string;
  jsonSchema: Record<string, unknown>;
  name: string;
}

export interface GiantsConfigProps {
  applicationName: string;
  environmentName?: string;
  profiles: ConfigProfile[];
}

export class GiantsConfig extends Construct {
  public readonly applicationName: string;
  public readonly environmentName: string;

  constructor(scope: Construct, id: string, props: GiantsConfigProps) {
    super(scope, id);

    this.applicationName = props.applicationName;
    this.environmentName = props.environmentName ?? 'default';

    const application = new Application(this, 'Application', {
      applicationName: this.applicationName,
    });

    const environment = new Environment(this, 'Environment', {
      application,
      environmentName: this.environmentName,
    });

    const deploymentStrategy = new DeploymentStrategy(
      this,
      'DeploymentStrategy',
      {
        deploymentStrategyName: `${this.applicationName}-${this.environmentName}-instant`,
        rolloutStrategy: RolloutStrategy.linear({
          deploymentDuration: Duration.minutes(0),
          growthFactor: 100,
          finalBakeTime: Duration.minutes(0),
        }),
      },
    );

    for (const profile of props.profiles) {
      new HostedConfiguration(this, `Profile-${profile.name}`, {
        application,
        content: ConfigurationContent.fromInlineJson(profile.content),
        deployTo: [environment],
        deploymentStrategy,
        name: profile.name,
        validators: [
          JsonSchemaValidator.fromInline(JSON.stringify(profile.jsonSchema)),
        ],
      });
    }
  }
}
