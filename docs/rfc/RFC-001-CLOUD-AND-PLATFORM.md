# RFC-001 - Escolha de Nuvem e Plataforma

## Contexto
Necessidade de infraestrutura gerenciada para Kubernetes, banco relacional, API gateway e serverless.

## Decisao proposta
- Nuvem: Azure.
- Kubernetes: AKS.
- Banco: Azure Database for PostgreSQL Flexible Server.
- Function Serverless: Azure Functions HTTP Trigger.
- API Gateway: Traefik em Kubernetes.

## Justificativa
- AKS e PostgreSQL gerenciado reduzem operacao de plataforma.
- Traefik simplifica roteamento e controle de entrada para ambiente K8s.
- Azure Function desacopla autenticacao por CPF da API principal sem sair do ecossistema Azure.

## Impacto
- Separacao clara de responsabilidades.
- Pipeline e governanca por contexto (app, infra k8s, infra db, function).
- Custo operacional menor em relacao a stack autogerenciada.
