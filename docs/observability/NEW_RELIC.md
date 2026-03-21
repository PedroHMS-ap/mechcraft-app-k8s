# Observabilidade com New Relic

## O que fica monitorado

### Aplicacao

- Latencia das APIs via APM do agente Node (`Transaction`).
- Healthchecks e uptime via transacoes `/health` e `/health/ready` mais eventos `HealthCheckResult`.
- Logs estruturados em JSON com `requestId`, `path`, `statusCode`, `durationMs`, `trace.id` e `span.id`.
- Eventos de negocio e integracao:
  - `WorkOrderCreated`
  - `WorkOrderStatusChanged`
  - `WorkOrderStageDuration`
  - `WorkOrderIntegrationProcessed`
  - `WorkOrderIntegrationFailure`
  - `WorkOrderProcessingFailure`

### Kubernetes

- CPU, memoria, pods, deployments, eventos e entidades de cluster via `nri-bundle` oficial do New Relic.
- `kube-state-metrics` habilitado, requisito para a visao de Kubernetes/Cluster Explorer.

## Componentes da integracao

- Agente Node do New Relic carregado no startup (`node -r newrelic dist/main.js`).
- Configuracao do agente em `newrelic.js`.
- Bundle Kubernetes do New Relic configurado em `k8s/observability/newrelic-values.yaml`.
- Templates versionados:
  - `docs/observability/newrelic-dashboard.json`
  - `docs/observability/newrelic-alerts.json`

## Pre-requisitos

Garantir que o deployment da API esteja com estas variaveis:

- `NEW_RELIC_ENABLED=true`
- `NEW_RELIC_APP_NAME=mechcraft-api`
- `NEW_RELIC_LICENSE_KEY` vindo do secret `newrelic-license`

Para a instrumentacao completa do cluster, a pipeline aplica o chart oficial `newrelic/nri-bundle` com base em `k8s/observability/newrelic-values.yaml`.

## Como importar dashboard e alertas

1. Abra `Dashboards` no New Relic.
2. Importe `docs/observability/newrelic-dashboard.json`.
3. Crie ou atualize a policy com `docs/observability/newrelic-alerts.json`.
4. Ajuste `accountIds`, nome do cluster e thresholds conforme o ambiente real.

## Cobertura dos requisitos

- Latencia das APIs
  - Query base: `FROM Transaction SELECT percentile(duration, 95) FACET path TIMESERIES`
- Consumo de CPU e memoria no Kubernetes
  - Query base: `FROM K8sContainerSample SELECT average(cpuUsedCores), average(memoryWorkingSetBytes)`
- Healthchecks e uptime
  - Query base: `FROM HealthCheckResult SELECT percentage(count(*), WHERE isHealthy = true) FACET checkType`
- Alertas para falhas no processamento de ordens de servico
  - Eventos `WorkOrderProcessingFailure` e `WorkOrderIntegrationFailure`
- Logs estruturados com correlacao
  - JSON em stdout e `recordLogEvent` com `trace.id`, `span.id` e `requestId`
- Dashboards de negocio
  - `WorkOrderCreated` para volume diario
  - `WorkOrderStageDuration` para tempo medio por etapa
  - `WorkOrderIntegrationFailure` para erros/falhas de integracao

## Endpoints uteis na demonstracao

- Gateway: `http://20.12.160.207`
- Healthcheck: `http://20.12.160.207/health`
- Readiness: `http://20.12.160.207/health/ready`
- Swagger: `http://20.12.160.207/docs`

## Referencia oficial

- New Relic recomenda instalar a integracao Kubernetes via Helm e informa que `kube-state-metrics` e necessario para a integracao funcionar corretamente:
  - https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/advanced-configuration/create-your-own-manifest/
