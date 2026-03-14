# Arquitetura Do Repositorio Da Aplicacao

```mermaid
flowchart LR
  Dev[Desenvolvedor] --> GHA[GitHub Actions]
  GHA --> DockerHub[Docker Hub]
  GHA --> AKS[Cluster Kubernetes]
  AKS --> Gateway[Traefik / API Gateway]
  Gateway --> API[MechCraft API]
  API --> Postgres[(PostgreSQL)]
  API --> NR[New Relic]
```

## Escopo deste repositorio

- Codigo-fonte da API NestJS.
- Dockerfile e docker-compose para desenvolvimento local.
- Manifests Kubernetes da aplicacao.
- Gateway HTTP para roteamento do endpoint de autenticacao CPF.
- Integracao com New Relic no cluster.
