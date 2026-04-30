import { App } from 'aws-cdk-lib';
import { Example } from './stack.ts';

const app = new App();

new Example(app, 'example', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
