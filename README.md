# MechCraft App K8s

Repositorio principal da aplicacao MechCraft executando em Kubernetes.

## Tecnologias

- NestJS
- Prisma
- PostgreSQL
- Docker
- Kubernetes
- GitHub Actions
- New Relic

## Estrutura

- `src/`: codigo-fonte da API.
- `prisma/`: schema e migrations.
- `test/`: testes unitarios e de integracao.
- `k8s/`: manifests da aplicacao, gateway e observabilidade.
- `docs/openapi.yaml`: contrato da API.
- `docs/guides/WEBHOOK_INTEGRATION.md`: exemplos de consumo.

## Arquitetura

- [Diagrama deste repositorio](docs/architecture/APP_K8S.md)

## Execucao local

### Opcao 1: docker-compose

```powershell
docker compose up --build
```

### Opcao 2: local puro

```powershell
npm ci
npx prisma generate
npm run start:dev
```

## Testes

```powershell
npm run test -- --coverage --runInBand
```

## Deploy em Kubernetes

1. Configure os secrets do repositorio no GitHub:
   - `AZURE_CREDENTIALS`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `EXTERNAL_SERVICE_TOKEN`
   - `CPF_AUTH_HOST`
   - `NEW_RELIC_LICENSE_KEY` (opcional)
   - `NEW_RELIC_CLUSTER_NAME` (opcional)
   - `CPF_AUTH_HOST` deve conter apenas o host publico da Azure Function de CPF, sem `https://`
2. Faca merge em `homolog` ou `main`.
3. A pipeline publica a imagem no Azure Container Registry e aplica os manifests em `k8s/`.

## Swagger / Postman

- [OpenAPI local](docs/openapi.yaml)
- Swagger publicado: `http://20.12.160.207/docs`
- Healthcheck publicado: `http://20.12.160.207/health`
- Readiness publicada: `http://20.12.160.207/health/ready`
- Endpoint de autenticacao CPF: `http://20.12.160.207/auth/cpf/token`

## Observabilidade

- Bundle oficial do New Relic via Helm com valores versionados em `k8s/observability/newrelic-values.yaml`
- Metricas da aplicacao expostas por `/metrics/*`
- Logs estruturados JSON com `x-request-id`
- Templates versionados:
  - `docs/observability/newrelic-dashboard.json`
  - `docs/observability/newrelic-alerts.json`

## Observacao

Os manifests de gateway so sao aplicados automaticamente quando o secret `CPF_AUTH_HOST` estiver configurado com o host da Azure Function de autenticacao CPF.
