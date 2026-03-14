# Webhook Seguro para Aprovação de Ordens de Serviço

## Visão Geral

Este documento descreve a implementação de um endpoint de webhook seguro para aprovação/recusa de Ordens de Serviço (OS) via `POST /workorders/webhook/secure-approve`.

## Endpoints

### 1. Webhook Legado (sem segurança)
**`POST /workorders/webhook/approve`**
- **Autenticação**: Nenhuma (para retrocompatibilidade)
- **Body**:
```json
{
  "publicCode": "uuid-da-os",
  "action": "APPROVE" | "DENY",
  "reason": "motivo (opcional, para DENY)",
  "externalId": "id-externo (rastreamento)"
}
```

### 2. Webhook Seguro (recomendado)
**`POST /workorders/webhook/secure-approve`**
- **Autenticação**: Header `X-Webhook-Token` (obrigatório)
- **Body**:
```json
{
  "publicCode": "uuid-da-os",
  "action": "APPROVE" | "DENY",
  "reason": "motivo (opcional, para DENY)",
  "externalId": "id-externo (rastreamento)",
  "idempotencyKey": "chave-idempotencia (opcional)"
}
```

## Recursos de Segurança

### 1. Validação de Token
- **Mecanismo**: Header `X-Webhook-Token`
- **Variável de Ambiente**: `EXTERNAL_SERVICE_TOKEN`
- **Implementação**: Guard `WebhookTokenGuard` valida o token antes de processar a requisição
- **Resposta se inválido**: `401 Unauthorized`

**Exemplo de requisição**:
```bash
curl -X POST http://localhost:3000/workorders/webhook/secure-approve \
  -H "X-Webhook-Token: seu-token-secreto" \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "uuid-123-456",
    "action": "APPROVE",
    "externalId": "webhook-ext-001"
  }'
```

### 2. Identificação Pública (publicCode)
- A OS é identificada por um UUID público (`publicCode`) em vez do ID interno numérico.
- Protege a exposição da estrutura interna do banco de dados.
- Exemplo: `POST /workorders/webhook/secure-approve` com `publicCode: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"`

### 3. Idempotência
O endpoint detecta e trata requisições duplicadas sem fazer alterações múltiplas.

**Como funciona**:
1. **Chave de Idempotência**: Cada requisição usa uma chave única (`idempotencyKey` ou `externalId`)
2. **Cache em Memória**: Requisições processadas são armazenadas em cache
3. **Resposta Consistente**: Requisições duplicadas retornam o resultado anterior sem refazer a operação

**Exemplo de idempotência**:
```bash
# Primeira requisição - aprova a OS
curl -X POST http://localhost:3000/workorders/webhook/secure-approve \
  -H "X-Webhook-Token: token" \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "uuid-123",
    "action": "APPROVE",
    "idempotencyKey": "webhook-001"
  }'
# Resposta: { "id": 1, "status": "IN_PROGRESS", "approvedAt": "..." }

# Segunda requisição com mesma chave - retorna resultado anterior
curl -X POST http://localhost:3000/workorders/webhook/secure-approve \
  -H "X-Webhook-Token: token" \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "uuid-123",
    "action": "APPROVE",
    "idempotencyKey": "webhook-001"
  }'
# Resposta: { "id": 1, "status": "IN_PROGRESS", "message": "OS já estava aprovada" }
```

## Transições de Estado

O webhook respeita as transições de estado válidas:

```
WAITING_APPROVAL
├─ APPROVE → IN_PROGRESS
└─ DENY → DIAGNOSING
```

**Validações**:
- Só processa se a OS está em `WAITING_APPROVAL`
- Se a OS já foi aprovada (`IN_PROGRESS`) e recebe outro APPROVE, retorna idempotentemente
- Se a OS foi recusada (`DIAGNOSING` com `deniedAt`) e recebe outro DENY, retorna idempotentemente
- Erros para transições inválidas: `400 Bad Request`

## Tratamento de Erros

| Erro | Status | Descrição |
|------|--------|-----------|
| Token ausente/inválido | 401 | Falha na autenticação do webhook |
| publicCode vazio | 400 | Validação de entrada |
| action inválido | 400 | Validação de entrada |
| OS não encontrada | 404 | publicCode não corresponde a nenhuma OS |
| OS não aguarda aprovação | 400 | Status atual não permite transição |

## Implementação Interna

### Arquivos principais
1. **DTO**: `src/modules/workorders/dto/webhook-approval-request.dto.ts`
   - Define contrato de entrada com validações

2. **Guard**: `src/modules/workorders/guards/webhook-token.guard.ts`
   - Valida header `X-Webhook-Token`

3. **Use-case**: `src/modules/workorders/application/secure-webhook-approval.usecase.ts`
   - Lógica de aprovação/recusa com idempotência
   - Cache em memória de requisições processadas
   - Transições de estado validadas

4. **Controller**: `src/modules/workorders/workorders.controller.ts`
   - Endpoint `POST /workorders/webhook/secure-approve`
   - Aplica guard `@UseGuards(WebhookTokenGuard)`

5. **Testes**: `test/unit/secure-webhook-approval.usecase.spec.ts`
   - 11 testes cobrindo validação, transições e idempotência

## Configuração do Token

### Desenvolvimento
Configure a variável de ambiente:
```bash
export EXTERNAL_SERVICE_TOKEN="seu-token-secreto-desenvolvimento"
```

### Produção
1. Gere um token seguro (ex.: `openssl rand -hex 32`)
2. Armazene em variável de ambiente segura (ex.: Azure Key Vault, HashiCorp Vault)
3. Configure no repositório GitHub Secrets se usar CI/CD

**Exemplo para GitHub**:
```bash
gh secret set EXTERNAL_SERVICE_TOKEN --body "seu-token-secreto-producao" --repo seu-usuario/seu-repo
```

## Melhorias Futuras

1. **Redis**: Mover cache de memória para Redis (escalável para múltiplas instâncias)
2. **HMAC-SHA256**: Substituir token simples por assinatura HMAC (mais seguro)
3. **Rate Limiting**: Adicionar limite de requisições por token/IP
4. **Audit Log**: Registrar todas as aprovações/recusas externas
5. **Webhooks Outbound**: Notificar sistema externo do resultado via webhook reverso

## Testes

Executar testes do webhook seguro:
```bash
npm test -- --testPathPattern="secure-webhook" --silent
```

Resultado esperado:
```
Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

## Compatibilidade

- ✅ Endpoint seguro novo: `/workorders/webhook/secure-approve`
- ✅ Endpoint legado mantido: `/workorders/webhook/approve` (sem token)
- ✅ Clientes podem migrar gradualmente

## Resumo de Segurança

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Autenticação | Nenhuma | Token via header |
| Identificação de OS | ID numérico exposto | UUID público |
| Idempotência | Não | Sim (cache + chave) |
| Validações | Básicas | Completas (transições) |
| Testes | 0 | 11 testes |
