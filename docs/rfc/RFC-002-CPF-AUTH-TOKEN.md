# RFC-002 - Estrategia de Autenticacao por CPF

## Contexto
As rotas sensiveis precisam ser protegidas com identidade do cliente (CPF) e token JWT.

## Decisao proposta
- A autenticacao CPF ocorre em Function Serverless (`repos/lambda-auth`).
- A function valida CPF, consulta cliente ativo no banco e emite JWT com claims:
  - `sub`
  - `customerId`
  - `cpf`
  - `tokenType=customer`
  - `roles=['customer']`
- A API valida JWT e aplica guard dedicado (`CpfAuthGuard`) em rotas de cliente.

## Alternativas avaliadas
- Autenticacao CPF dentro da API principal.
  - Rejeitada para reduzir acoplamento e facilitar escala independente da autenticacao.

## Impacto
- Isolamento do fluxo de autenticacao.
- Maior rastreabilidade de acessos por CPF.
- Possibilidade de evoluir policy/token sem afetar o core de OS.

