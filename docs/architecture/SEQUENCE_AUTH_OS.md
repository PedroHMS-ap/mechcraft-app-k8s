# Diagrama de Sequencia - Autenticacao CPF e Abertura de OS

```mermaid
sequenceDiagram
  actor Cliente
  participant Gateway as API Gateway
  participant Function as Azure Function CPF Auth
  participant DB as PostgreSQL
  participant API as MechCraft API

  Cliente->>Gateway: POST /auth/cpf/token (cpf)
  Gateway->>Function: Encaminha requisicao de autenticacao
  Function->>Function: Valida CPF (algoritmo)
  Function->>DB: SELECT Customer by document
  DB-->>Function: Cliente + status(active)
  Function-->>Gateway: JWT customer token
  Gateway-->>Cliente: access_token

  Cliente->>Gateway: POST /customer/workorders (Bearer customer JWT)
  Gateway->>API: Encaminha requisicao protegida
  API->>API: JwtAuthGuard + CpfAuthGuard
  API->>DB: Validacoes + persistencia da OS
  DB-->>API: Ordem criada (publicCode)
  API-->>Gateway: OS criada
  Gateway-->>Cliente: 201 + publicCode
```
