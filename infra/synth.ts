import { $ } from 'bun';

const env = process.argv[2] ?? 'test';

await $`cd ${import.meta.dir} && bunx cdk synth --context env=${env}`;
