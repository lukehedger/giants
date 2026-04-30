import { describe, expect, test } from 'bun:test';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GiantsConfig } from '../GiantsConfig';

const synth = (props: ConstructorParameters<typeof GiantsConfig>[2]) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  new GiantsConfig(stack, 'Config', props);
  return Template.fromStack(stack);
};

describe('GiantsConfig', () => {
  test('creates an AppConfig application with the provided name', () => {
    const template = synth({ applicationName: 'example', profiles: [] });
    template.hasResourceProperties('AWS::AppConfig::Application', {
      Name: 'example',
    });
  });

  test('defaults the environment name to "default"', () => {
    const template = synth({ applicationName: 'example', profiles: [] });
    template.hasResourceProperties('AWS::AppConfig::Environment', {
      Name: 'default',
    });
  });

  test('respects a custom environment name', () => {
    const template = synth({
      applicationName: 'example',
      environmentName: 'prod',
      profiles: [],
    });
    template.hasResourceProperties('AWS::AppConfig::Environment', {
      Name: 'prod',
    });
  });

  test('exposes applicationName and environmentName on the instance', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const config = new GiantsConfig(stack, 'Config', {
      applicationName: 'example',
      environmentName: 'prod',
      profiles: [],
    });
    expect(config.applicationName).toBe('example');
    expect(config.environmentName).toBe('prod');
  });

  test('supports multiple GiantsConfig instances in the same stack', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new GiantsConfig(stack, 'ConfigA', {
      applicationName: 'app-a',
      profiles: [],
    });
    new GiantsConfig(stack, 'ConfigB', {
      applicationName: 'app-b',
      profiles: [],
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::AppConfig::Application', 2);
    template.resourceCountIs('AWS::AppConfig::Environment', 2);
    template.resourceCountIs('AWS::AppConfig::DeploymentStrategy', 2);
  });

  test('creates a hosted configuration per profile', () => {
    const template = synth({
      applicationName: 'example',
      profiles: [
        {
          name: 'alpha',
          content: JSON.stringify({ enabled: true }),
          jsonSchema: { type: 'object' },
        },
        {
          name: 'beta',
          content: JSON.stringify({ enabled: false }),
          jsonSchema: { type: 'object' },
        },
      ],
    });
    template.resourceCountIs('AWS::AppConfig::ConfigurationProfile', 2);
  });
});
