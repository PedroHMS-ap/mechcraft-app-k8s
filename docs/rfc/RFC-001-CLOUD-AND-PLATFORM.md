# RFC-001 - Escolha de Nuvem e Plataforma

## Contexto
Necessidade de infraestrutura gerenciada para Kubernetes, banco relacional, API gateway e serverless.

## Decisao proposta
- Nuvem: Azure.
- Kubernetes: AKS.
- Banco: Azure Database for PostgreSQL Flexible Server.
- Function Serverless: AWS Lambda (modelo portavel por HTTP/gateway).
- API Gateway: Traefik em Kubernetes.

## Justificativa
- AKS e PostgreSQL gerenciado reduzem operacao de plataforma.
- Traefik simplifica roteamento e controle de entrada para ambiente K8s.
- Lambda desacopla autenticacao por CPF da API principal.

## Impacto
- Separacao clara de responsabilidades.
- Pipeline e governanca por contexto (app, infra k8s, infra db, lambda).
- Custo operacional menor em relacao a stack autogerenciada.

