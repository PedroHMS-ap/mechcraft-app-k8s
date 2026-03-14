# Observabilidade com New Relic

## Integracao
- Agente de infraestrutura no cluster: `k8s/observability/newrelic-agent.yaml`.
- Logs estruturados da API em JSON ja disponiveis via `RequestLoggerInterceptor`.
- Metricas de negocio expostas em:
  - `GET /metrics/daily-volume`
  - `GET /metrics/avg-time-by-status`
  - `GET /metrics/integration-errors`

## Pre-requisitos
Criar secret no cluster com a license key:
```bash
kubectl -n mechcraft create secret generic newrelic-license \
  --from-literal=license_key="<NEW_RELIC_LICENSE_KEY>"
```

Aplicar agente:
```bash
kubectl apply -f k8s/observability/newrelic-agent.yaml
```

## Dashboards recomendados
1. Volume diario de ordens de servico
   - Fonte: endpoint `/metrics/daily-volume`
2. Tempo medio por etapa
   - Fonte: endpoint `/metrics/avg-time-by-status`
3. Erros em integracoes externas
   - Fonte: endpoint `/metrics/integration-errors`
4. CPU e Memoria no Kubernetes
   - Fonte: New Relic Infrastructure / Kubernetes cluster explorer
5. Latencia e uptime da API
   - Fonte: logs estruturados (`durationMs`) + healthcheck (`GET /health`)

## Alertas recomendados
- API Latency alta
  - Condicao: p95 `durationMs` > 1500ms por 5 min
- Falha de processamento de OS
  - Condicao: `totalIntegrationFailures > 0` por 10 min
- Pod CrashLoop/Down
  - Condicao: pods indisponiveis no deployment `mechcraft-api`
- Consumo elevado de recursos
  - Condicao: CPU > 80% ou memoria > 85% por 10 min

