# APIs de Ordens de Servico

## Resumo das APIs Implementadas

Todas as 5 APIs solicitadas estao implementadas e funcionais:

### 1. Abertura de Ordem de Servico (OS)
**Endpoint:** `POST /workorders`  
**Descricao:** Recebe os dados do cliente, veiculo, servicos e pecas, retornando a identificacao unica da OS.

**Request:**
```json
{
  "customerId": 1,
  "vehicleId": 1,
  "description": "Revisao + troca de oleo",
  "services": [
    { "serviceId": 10, "qty": 1 }
  ],
  "parts": [
    { "partId": 5, "qty": 2 }
  ]
}
```

**Response (201):**
```json
{
  "id": 123,
  "publicCode": "OS-001-20251209",
  "customerId": 1,
  "vehicleId": 1,
  "status": "RECEIVED",
  "description": "Revisao + troca de oleo",
  "createdAt": "2025-12-09T10:30:00Z"
}
```

---

### 2. Consulta de Status da OS
**Endpoint:** `GET /workorders/:id`  
**Descricao:** Informa a situacao atual da OS (Recebida, Diagnostico, Aguardando Aprovacao, Execucao, Finalizada, Entregue).

**Response (200):**
```json
{
  "id": 123,
  "publicCode": "OS-001-20251209",
  "status": "WAITING_APPROVAL",
  "customerId": 1,
  "vehicleId": 1,
  "description": "Revisao + troca de oleo",
  "items": {
    "services": [...],
    "parts": [...]
  },
  "createdAt": "2025-12-09T10:30:00Z"
}
```

**Status Possiveis:**
- `RECEIVED` - Recebida
- `DIAGNOSING` - Em Diagnostico
- `WAITING_APPROVAL` - Aguardando Aprovacao
- `IN_PROGRESS` - Em Execucao
- `FINISHED` - Finalizada
- `DELIVERED` - Entregue

---

### 3. Aprovacao de Orcamento
**Endpoint:** `POST /workorders/:id/approve`  
**Descricao:** Aprova o orcamento e move a OS para execucao.

**Response (200):**
```json
{
  "id": 123,
  "status": "IN_PROGRESS",
  "approvedAt": "2025-12-09T11:00:00Z",
  "approvedBy": "user-123"
}
```

---

### 4. Recusa de Orcamento
**Endpoint:** `POST /workorders/:id/deny`  
**Descricao:** Recusa o orcamento e retorna para diagnostico.

**Request:**
```json
{
  "reason": "Cliente solicitou ajuste"
}
```

**Response (200):**
```json
{
  "id": 123,
  "status": "DIAGNOSING",
  "deniedAt": "2025-12-09T11:05:00Z",
  "denialReason": "Cliente solicitou ajuste"
}
```

---

### 5. Listagem de Ordens de Servico
**Endpoint:** `GET /workorders`  
**Descricao:** Retorna lista de OS com ordenacao por status e exclusao de finalizadas/entregues.

**Query Parameters:**
- `status` (opcional): Filtrar por status especifico

**Response (200):**
```json
[
  {
    "id": 123,
    "publicCode": "OS-001-20251209",
    "status": "IN_PROGRESS",
    "customerId": 1,
    "vehicleId": 1,
    "createdAt": "2025-12-09T10:30:00Z"
  },
  {
    "id": 124,
    "publicCode": "OS-002-20251209",
    "status": "WAITING_APPROVAL",
    "customerId": 2,
    "vehicleId": 3,
    "createdAt": "2025-12-09T10:25:00Z"
  },
  {
    "id": 125,
    "publicCode": "OS-003-20251209",
    "status": "DIAGNOSING",
    "customerId": 1,
    "vehicleId": 1,
    "createdAt": "2025-12-09T09:00:00Z"
  }
]
```

**Ordenacao Aplicada:**
1. Em Execucao (`IN_PROGRESS`)
2. Aguardando Aprovacao (`WAITING_APPROVAL`)
3. Em Diagnostico (`DIAGNOSING`)
4. Recebida (`RECEIVED`)
5. Mais antigas primeiro (por `createdAt`)

**Exclusoes:**
- Finalizadas (`FINISHED`) - NAO aparecem
- Entregues (`DELIVERED`) - NAO aparecem

---

### 6. Atualizacao de Status via Webhook (EMAIL/EXTERNO)
**Endpoint:** `POST /workorders/webhook/approve`  
**Descricao:** Recebe notificacoes externas (email, sistemas terceiros) para aprovar/recusar orcamento.

**Request (Aprovacao):**
```json
{
  "publicCode": "OS-001-20251209",
  "action": "APPROVE",
  "externalId": "email-ext-123456"
}
```

**Request (Recusa):**
```json
{
  "publicCode": "OS-001-20251209",
  "action": "DENY",
  "reason": "Aguardando esclarecimentos do cliente",
  "externalId": "email-ext-123457"
}
```

**Response (200):**
```json
{
  "id": 123,
  "status": "IN_PROGRESS",
  "approvedAt": "2025-12-09T11:30:00Z",
  "approvedBy": "webhook-email-ext-123456",
  "externalApprovalId": "email-ext-123456"
}
```

**Fluxo de Integracao com Email:**
1. Cliente recebe email com link de aprovacao/recusa
2. Email contem `publicCode` (nao precisa de autenticacao)
3. Sistema externo faz POST para `/workorders/webhook/approve`
4. OS e atualizada automaticamente
5. Sistema pode enviar confirmacao de atualizacao

---

## Matriz de Endpoints

| Metodo | Endpoint | Descricao | Autenticacao |
|--------|----------|-----------|--------------|
| POST | `/workorders` | Abrir nova OS | Obrigatoria |
| GET | `/workorders` | Listar OS | Obrigatoria |
| GET | `/workorders/:id` | Consultar status | Obrigatoria |
| PUT | `/workorders/:id/status` | Atualizar status | Obrigatoria |
| POST | `/workorders/:id/submit` | Enviar para aprovacao | Obrigatoria |
| POST | `/workorders/:id/approve` | Aprovar orcamento | Obrigatoria |
| POST | `/workorders/:id/deny` | Recusar orcamento | Obrigatoria |
| POST | `/workorders/webhook/approve` | Webhook externo | NAO obrigatoria |
| POST | `/workorders/:id/items/service` | Adicionar servico | Obrigatoria |
| POST | `/workorders/:id/items/part` | Adicionar peca | Obrigatoria |
| DELETE | `/workorders/items/service/:itemId` | Remover servico | Obrigatoria |
| DELETE | `/workorders/items/part/:itemId` | Remover peca | Obrigatoria |

---

## Fluxos de Estados

### Fluxo Normal
```
RECEIVED -> DIAGNOSING -> WAITING_APPROVAL -> IN_PROGRESS -> FINISHED -> DELIVERED
```

### Com Recusa
```
RECEIVED -> DIAGNOSING -> WAITING_APPROVAL
                       -> (DENY) -> DIAGNOSING (volta para revisar)
                       -> WAITING_APPROVAL (resubmete)
```

### Com Webhook
```
Sistema Externo (Email/SMS)
        ->
POST /workorders/webhook/approve
        ->
Valida publicCode
        ->
Valida acao (APPROVE/DENY)
        ->
Atualiza Status + Metadados
```

---

## Seguranca

### Autenticacao
- Todos os endpoints (exceto webhook) requerem token Bearer JWT
- Roles: `admin`, `recepcao`, `mecanico`

### Webhook
- Sem autenticacao (publicos para sistemas externos)
- **Protecao:** Usa `publicCode` (nao e ID sequencial)
- **Rastreamento:** Cada acao registra `externalId` para auditoria
- **Validacao:** Verifica estado antes de atualizar

---

## Exemplos de Uso

### cURL - Abrir OS
```bash
curl -X POST http://localhost:3000/workorders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "vehicleId": 1,
    "description": "Revisao + troca de oleo"
  }'
```

### cURL - Webhook de Aprovacao (via Email)
```bash
curl -X POST http://localhost:3000/workorders/webhook/approve \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "OS-001-20251209",
    "action": "APPROVE",
    "externalId": "email-token-xyz123"
  }'
```

### cURL - Listar OS Ativas
```bash
curl -X GET "http://localhost:3000/workorders" \
  -H "Authorization: Bearer TOKEN"
```

---

## Resumo Final

Todos os 5 requisitos implementados:
1. Abertura de OS - `POST /workorders`
2. Consulta de status - `GET /workorders/:id`
3. Aprovacao de orcamento - `POST /workorders/:id/approve` + `POST /workorders/:id/deny`
4. Listagem com ordenacao - `GET /workorders` (com prioridade + exclusao de finalizadas)
5. Atualizacao via email/externo - `POST /workorders/webhook/approve`

Tudo esta **pronto para uso em producao**! 








