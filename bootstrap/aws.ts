/** biome-ignore-all lint/suspicious/noConsole: cli script */
import { $ } from 'bun';
import { secrets } from './secrets.ts';

console.log('Bootstrapping AWS secrets');

for (const secret of secrets) {
  const value = JSON.stringify(secret.template);

  try {
    await $`aws secretsmanager create-secret \
      --name ${secret.name} \
      --description ${secret.description} \
      --secret-string ${value}`.quiet();

    console.log(`Created: ${secret.name}`);
  } catch (error) {
    const stderr =
      (error as { stderr?: Buffer })?.stderr?.toString() ?? String(error);

    if (stderr.includes('ResourceExistsException')) {
      console.log(`Exists:  ${secret.name}`);
    } else {
      console.error(`Failed:  ${secret.name}`);
      console.error(stderr);
      process.exit(1);
    }
  }
}
