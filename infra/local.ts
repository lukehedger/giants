/** biome-ignore-all lint/suspicious/noConsole: cli script */
import { $ } from 'bun';

const LOCALSTACK_URL = 'http://localhost:4566';
const CONTAINER_NAME = 'localstack-giants';

console.log('Starting LocalStack...');
const running = await $`docker ps -q -f name=^${CONTAINER_NAME}$`
  .quiet()
  .text();

if (running.trim()) {
  console.log('LocalStack already running.');
} else {
  await $`docker rm -f ${CONTAINER_NAME}`.quiet().nothrow();
  await $`docker run -d \
    --name ${CONTAINER_NAME} \
    -p 4566:4566 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    localstack/localstack`.quiet();
}

console.log('Waiting for LocalStack...');
const MAX_RETRIES = 30;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const res = await fetch(`${LOCALSTACK_URL}/_localstack/health`);
    if (res.ok) break;
  } catch {}
  await Bun.sleep(1000);
}

$.env({
  ...process.env,
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_DEFAULT_REGION: 'us-east-1',
  AWS_REGION: 'us-east-1',
  CDK_DISABLE_LEGACY_EXPORT_WARNING: '1',
});

console.log('Bootstrapping CDK...');
await $`cd ${import.meta.dir} && bunx cdklocal bootstrap --context env=local`;

console.log('Bootstrapping secrets...');
await $`AWS_ENDPOINT_URL=${LOCALSTACK_URL} bun ${import.meta.dir}/../bootstrap/aws.ts`;

console.log('Deploying stack...');
await $`cd ${import.meta.dir} && bunx cdklocal deploy --context env=local --require-approval never`;

interface StackOutput {
  Stacks: { Outputs: { OutputKey: string; OutputValue: string }[] }[];
}

const stack =
  (await $`aws --endpoint-url=${LOCALSTACK_URL} cloudformation describe-stacks --stack-name example`
    .quiet()
    .json()) as StackOutput;

const apiUrl = stack.Stacks[0]?.Outputs.find((o) =>
  o.OutputKey.startsWith('ApiEndpoint'),
)?.OutputValue;

if (apiUrl) {
  console.log(`\nAPI Gateway URL: ${apiUrl}`);
} else {
  console.log('\nStack deployed (could not resolve API Gateway URL).');
}
