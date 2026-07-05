# Deployment and Operations

This is the durable operations guide for local development, health checks, Docker, AWS ECS Fargate, secrets, CI/CD, and common failures.

## Local operations

```sh
yarn install
cp .env.example .env
docker compose up -d
yarn db:migrate
yarn dev
```

Local defaults:

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api`
- Basic health: `http://localhost:4000/health`

## Health endpoints

| Endpoint | Dependency behavior | Use |
| --- | --- | --- |
| `/health` and `/api/health` | Fast process check; no database query. | Uptime monitoring and container health. |
| `/health/deep` and `/api/health/deep` | Checks database connectivity. | Dependency alerting and debugging. |
| `/ready` and `/api/ready` | Checks whether the API can safely serve traffic. | Load balancer/orchestrator readiness. |

The frontend also serves `/health` as static JSON in production builds so static hosting can be monitored independently from the API.

## Docker image

The root `Dockerfile` builds the API runtime image.

Runtime expectations:

- Node 20 Alpine base image.
- Non-root runtime user.
- Port `3000` inside the container.
- Built API output in `dist/api`.
- Prisma schema/client available at runtime.
- Startup command runs `yarn start:api`, which executes already-built JavaScript.

Local image test:

```sh
docker build -t interviews-tracker:test .
docker run --rm -p 3000:3000 --env-file .env interviews-tracker:test
curl http://localhost:3000/health
```

## AWS ECS Fargate architecture

Production API deployment uses:

```text
GitHub Actions → ECR image → ECS Fargate service → Application Load Balancer → API container
                                      │
                                      ├─ AWS SSM Parameter Store for secrets
                                      └─ CloudWatch Logs for container logs
```

Terraform lives in `infra/` and manages the ECS cluster/service, task definition, IAM roles, load balancer, target group, security groups, log group, and outputs.

Typical infrastructure commands:

```sh
cd infra
terraform init
terraform plan
terraform apply
terraform output
```

## CI/CD

The deployment workflow is `.github/workflows/deploy-api-ecs.yml`.

High-level flow:

1. Check out code.
2. Configure AWS credentials.
3. Log in to ECR.
4. Build Docker image.
5. Push image with Git SHA and latest tags.
6. Render a new ECS task definition with the image.
7. Deploy the ECS service and wait for stability.
8. Verify health.

## Required production configuration

Core API/runtime variables:

```text
DATABASE_URL
ALLOWED_EMAIL
AUTH0_DOMAIN
AUTH0_AUDIENCE
OPENAI_API_KEY
```

Gmail integration:

```text
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REDIRECT_URI
GMAIL_TOKEN_ENCRYPTION_KEY
```

Telegram bot:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET_TOKEN
TELEGRAM_BACKEND_WEBHOOK_URL
OPPORTUNITY_WEBHOOK_SECRET
TELEGRAM_ALLOWED_USER_IDS
TELEGRAM_ALLOWED_CHAT_IDS
```

Frontend build variables:

```text
VITE_API_BASE_URL
VITE_AUTH0_DOMAIN
VITE_AUTH0_CLIENT_ID
VITE_AUTH0_AUDIENCE
VITE_ALLOWED_EMAIL
```

Optional services include Sentry and external research providers such as Exa/Perplexity depending on the configured provider path.

## Secret verification

Production secrets are expected under `/interviews-tracker/prod` in AWS SSM Parameter Store. Verify access with:

```sh
yarn secrets:verify
```

Never commit real secrets. Keep examples in `.env.example` or Terraform example files only.

## Telegram production runbook

1. Configure bot token and webhook secrets in SSM.
2. Configure at least one allowed Telegram user ID or chat ID. Authorization fails closed when neither is present.
3. Set or verify the Telegram webhook URL.
4. Restart/redeploy the ECS service so new SSM values are loaded.
5. Send `/start` and a small test message from an allowed user.
6. Check CloudWatch logs for authorization decisions and handler errors.

## Common troubleshooting

### Docker build cannot resolve workspaces

Yarn workspaces need the root package files and workspace directories available before install/build. The Dockerfile should copy root package metadata plus `apps`, `packages`, `prisma`, and scripts needed by the build.

### Runtime says built API output is missing

`yarn start:api` expects prior build output. Run:

```sh
yarn build:api
yarn start:api
```

Production containers should fail loudly rather than compiling TypeScript at startup.

### Health is up but app requests fail

Check `/health/deep` and `/ready`. `/health` only proves that the process is alive; it intentionally avoids database queries.

### Telegram rejects every message

Verify `TELEGRAM_ALLOWED_USER_IDS` or `TELEGRAM_ALLOWED_CHAT_IDS` is configured in the runtime environment/SSM and that ECS tasks were restarted after the change.

### Gmail import cannot refresh tokens

Verify Google OAuth credentials, redirect URI, encryption key, and stored refresh-token state. Auth0 tokens are unrelated to Gmail access.
