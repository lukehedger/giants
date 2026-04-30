# giants

A lightweight starter for building serverless services on AWS with Bun, CDK and Lambda. Named for standing on the shoulders of.

## What's in the box

- Four CDK constructs (`packages/cdk/`): `GiantsFunction`, `GiantsApi`, `GiantsConfig`, `GiantsAuthoriser`.
- Runtime helpers:
  - `packages/config/` - `ConfigProvider` backed by AppConfig (prod) or env vars (local).
  - `packages/secrets/` - `SecretsProvider` backed by Secrets Manager.
  - `packages/telemetry/` - Powertools logger/metrics/tracer abstraction with local no-op fallbacks.
  - `packages/auth/` - Cognito `client_id` extraction helper.
  - `packages/errors/` - baseline error response shape.
  - `packages/schema/` - Zod request/response schemas for API handlers, plus a `parseRequest` helper that returns either the typed value or a ready-to-return `ValidationError` response.
- `infra/` - CDK app with a minimal example stack wired through the constructs.
- `infra/local.ts` - LocalStack bootstrap for running the stack offline.
- `api/hello.ts` - one example handler so the stack deploys a working endpoint out of the box.
- `bootstrap/` - Secrets Manager seeding script. Starts empty; populate `bootstrap/secrets.ts` with the secrets your service needs.

## Quick start

```sh
bun install
bun infra/local.ts   # spin LocalStack, bootstrap CDK, deploy the example stack
```

The output prints an API Gateway URL. Hit `/hello` on it (optionally with `?name=...`).

Deploy to a real AWS account (credentials must already be in the shell via SSO / `aws configure` / assumed role):

```sh
bun bootstrap/aws.ts         # seed Secrets Manager entries from bootstrap/secrets.ts
bun infra/synth.ts test      # cdk synth
bun infra/deploy.ts test     # cdk deploy
```

## Runtime target

Lambdas bundle with `esbuild` via `NodejsFunction` (Node.js 24, ARM64, ESM, sourcemaps). Bun runs the dev tooling; the Lambdas themselves run on Node.

## Scripts

- `bun run fmt` - format and lint with Biome.
- `bun run types` - type-check the whole workspace.
- `bun run test:unit` - run `bun test` across workspaces via Turbo.

## Monorepo layout

- **Bun workspaces** (`api`, `bootstrap`, `infra`, `packages/*`).
- **Local packages only** - `@giants/*` packages are internal `workspace:*` deps, never published. Each `package.json` is already shaped for publishing if you decide to lift one out.
- **Bun catalog** - dependency versions live in the root `catalog` and each package pulls with `"catalog:"`. One place to bump a version; all workspaces follow.
- **Turbo** is wired for unit tests only (parallel across packages with caching). Lint and types are fast enough to run without it.

## CI / CD

Three workflows under `.github/workflows/`:

- `ci.yml` - runs on every pull request. Installs deps, lints with Biome, type-checks, runs unit tests. Caches the Bun package cache (keyed on `bun pm hash`) and the Turbo cache (keyed on SHA with a fall-through prefix) so reruns are cheap.
- `cd.yml` - runs on push to `main` (scoped with `paths:` so docs-only changes don't deploy). Assumes an AWS OIDC role at `arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-role`. Caches `infra/cdk.out` keyed on the hash of source paths so unchanged Lambdas skip rebundling.
- `dependencies.yml` - weekly (Monday ~10am London). Bumps every entry in the Bun `catalog` to latest via `npm view`, runs `bun update --latest`, runs `bun audit`, and opens or updates a single long-lived PR (`automated/dependency-updates`) with the audit report in the body. Replaces Dependabot with one consolidated PR per week.

No Dependabot. No GitHub Actions fan-out to dev/acc/prod - the template is one env; split jobs yourself when you want staging.
