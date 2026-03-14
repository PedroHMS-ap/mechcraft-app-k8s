# ADR-001 - API Gateway com Traefik

## Status
Aceito

## Contexto
Necessidade de camada de entrada para roteamento, controle e evolucao dos endpoints sem acoplar na API.

## Decisao
Adotar Traefik como API Gateway no cluster Kubernetes.

## Consequencias
- Positivas:
  - Roteamento centralizado.
  - Facilidade para expor rotas de app e function.
  - Menor complexidade operacional no ecossistema K8s.
- Negativas:
  - Dependencia adicional no cluster.
  - Exige governanca de regras/host/path.

## Implementacao
- `k8s/gateway/traefik-gateway.yaml`
- `k8s/gateway/api-gateway-routing.yaml`

