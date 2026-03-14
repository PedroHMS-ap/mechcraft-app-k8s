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
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
   - `KUBE_CONFIG_DATA`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `EXTERNAL_SERVICE_TOKEN`
   - `CPF_AUTH_HOST`
   - `NEW_RELIC_LICENSE_KEY` (opcional)
   - `NEW_RELIC_CLUSTER_NAME` (opcional)
2. Faça merge em `homolog` ou `main`.
3. A pipeline publica a imagem Docker e aplica os manifests em `k8s/`.

## Swagger / Postman

- [OpenAPI local](docs/openapi.yaml)
- Swagger publicado: `https://<gateway-ou-loadbalancer>/docs`

## Observabilidade

- Agent do New Relic em `k8s/observability/newrelic-agent.yaml`
- Metricas da aplicacao expostas por `/metrics/*`
- Logs estruturados JSON com `x-request-id`

## Observacao

Os manifests de gateway so sao aplicados automaticamente quando o secret `CPF_AUTH_HOST` estiver configurado.
