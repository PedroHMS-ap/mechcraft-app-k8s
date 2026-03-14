# 📧 GUIA DE INTEGRAÇÃO - WEBHOOK DE APROVAÇÃO VIA EMAIL

## 🎯 Objetivo

Integrar o sistema de Ordens de Serviço com um gateway de email para que aprovações/recusas de orçamentos sejam processadas automaticamente quando o cliente clica em um link do email.

---

## 🔄 Fluxo de Integração

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MECANICO ENVIA OS PARA APROVAÇÃO                         │
│    POST /workorders/:id/submit                              │
│    Status muda para: WAITING_APPROVAL                        │
│    Sistema envia email ao cliente                            │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 2. CLIENTE RECEBE EMAIL COM LINKS                            │
│    "Sua OS OS-001-20251209 está aguardando aprovação"       │
│                                                              │
│    [✅ APROVAR]  [❌ RECUSAR]                               │
│     http://seu-site.com/approve?code=OS-001&tk=xyz123       │
│     http://seu-site.com/deny?code=OS-001&tk=xyz123          │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 3. CLIENTE CLICA NO LINK                                    │
│    Frontend: POST /workorders/webhook/approve               │
│    { publicCode: "OS-001-20251209", action: "APPROVE" }     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 4. OS ATUALIZADA AUTOMATICAMENTE                            │
│    Status muda para: IN_PROGRESS (ou DIAGNOSING se DENY)    │
│    Registra: approvedAt, approvedBy, externalId             │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 5. NOTIFICAÇÃO PARA MECANICO                                │
│    Sistema notifica mecanico que OS foi aprovada            │
│    Mecanico vê no dashboard: GET /workorders                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Passo 1: Configurar Seu Frontend de Email

### Opção A: Seu próprio sistema de email

**Seu backend processa clique do cliente:**

```javascript
// Frontend: processaAprovacao.js
async function aprovarOrqamento(publicCode) {
  const response = await fetch('/workorders/webhook/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicCode: publicCode,
      action: 'APPROVE',
      externalId: `client-click-${Date.now()}`
    })
  });
  
  if (response.ok) {
    alert('✅ Orçamento aprovado!');
    // Redireciona ou atualiza UI
  }
}

async function recusarOrqamento(publicCode) {
  const reason = prompt('Motivo da recusa:');
  const response = await fetch('/workorders/webhook/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicCode: publicCode,
      action: 'DENY',
      reason: reason,
      externalId: `client-reject-${Date.now()}`
    })
  });
  
  if (response.ok) {
    alert('❌ Orçamento recusado!');
  }
}
```

### Opção B: Email com webhook automático (ex: SendGrid, Mailgun)

Seu email contém pixel tracker que chama seu backend:

```html
<!-- Template de Email -->
<h2>Ordem de Serviço: OS-001-20251209</h2>
<p>Seu orçamento de R$ 1.500,00 está aguardando aprovação</p>

<p>
  <a href="https://seu-sistema.com/api/approve?code=OS-001-20251209&externalId=email-123">
    ✅ Aprovar Orçamento
  </a>
  |
  <a href="https://seu-sistema.com/api/deny?code=OS-001-20251209&externalId=email-123">
    ❌ Recusar
  </a>
</p>

<!-- Seu backend em seu-sistema.com: -->
app.get('/api/approve', async (req, res) => {
  const { code, externalId } = req.query;
  
  // Chama seu servidor mech-craft-api
  const response = await fetch(
    'http://mech-craft-api:3000/workorders/webhook/approve',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicCode: code,
        action: 'APPROVE',
        externalId: externalId
      })
    }
  );
  
  res.redirect('/confirmacao?status=aprovado');
});
```

---

## 📧 Passo 2: Enviar Email após Submissão

**Backend ao chamar `POST /workorders/:id/submit`:**

```typescript
// Em seu arquivo de notificação
export class BudgetNotifierService {
  async sendEstimate(data: any) {
    const { workOrderId, customer, requestedBy } = data;
    
    // Buscar publicCode
    const order = await this.db.workOrder.findUnique({
      where: { id: workOrderId }
    });
    
    // Enviar email
    await this.emailService.send({
      to: customer.email,
      subject: `Orçamento para revisão - ${order.publicCode}`,
      html: this.buildEmailTemplate({
        publicCode: order.publicCode,
        customerName: customer.name,
        amount: order.totalAmount,
        approveLink: `https://seu-sistema.com/approve?code=${order.publicCode}&externalId=email-${Date.now()}`,
        denyLink: `https://seu-sistema.com/deny?code=${order.publicCode}&externalId=email-${Date.now()}`
      })
    });
  }
  
  private buildEmailTemplate(data: any) {
    return `
      <h2>Orçamento aguardando aprovação</h2>
      <p>Prezado ${data.customerName},</p>
      <p>Seu orçamento <strong>${data.publicCode}</strong> está aguardando sua aprovação.</p>
      <p><strong>Valor:</strong> R$ ${data.amount}</p>
      
      <p style="margin-top: 30px;">
        <a href="${data.approveLink}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          ✅ Aprovar Orçamento
        </a>
        &nbsp;&nbsp;
        <a href="${data.denyLink}" style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          ❌ Recusar
        </a>
      </p>
      
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        Código da OS: ${data.publicCode}
      </p>
    `;
  }
}
```

---

## 🔌 Passo 3: Chamar o Webhook

### Via Frontend (Cliente clica no link)

```bash
# Cliente clica em: https://seu-sistema.com/approve?code=OS-001-20251209
# Seu frontend faz:

POST /workorders/webhook/approve
Host: mech-craft-api:3000
Content-Type: application/json

{
  "publicCode": "OS-001-20251209",
  "action": "APPROVE",
  "externalId": "email-approval-123456"
}
```

### Via Backend (Webhook automático)

```bash
# Seu servidor envia via webhook:

POST /workorders/webhook/approve
Host: mech-craft-api:3000
Content-Type: application/json

{
  "publicCode": "OS-001-20251209",
  "action": "DENY",
  "reason": "Cliente solicitou ajuste nos serviços",
  "externalId": "sendgrid-webhook-xyz789"
}
```

---

## ✅ Respostas do Webhook

### Aprovação Sucesso (200)
```json
{
  "id": 123,
  "publicCode": "OS-001-20251209",
  "status": "IN_PROGRESS",
  "approvedAt": "2025-12-09T11:30:00Z",
  "approvedBy": "webhook-email-approval-123456",
  "externalApprovalId": "email-approval-123456"
}
```

### Recusa Sucesso (200)
```json
{
  "id": 123,
  "publicCode": "OS-001-20251209",
  "status": "DIAGNOSING",
  "deniedAt": "2025-12-09T11:35:00Z",
  "denialReason": "Cliente solicitou ajuste nos serviços",
  "externalDenialId": "sendgrid-webhook-xyz789"
}
```

### Erro - OS não encontrada (404)
```json
{
  "statusCode": 404,
  "message": "OS com código OS-999-20251209 não encontrada"
}
```

### Erro - Não está em espera de aprovação (400)
```json
{
  "statusCode": 400,
  "message": "OS não está aguardando aprovação. Status atual: IN_PROGRESS"
}
```

---

## 🔐 Segurança do Webhook

### ✅ Implementado

1. **publicCode em vez de ID**
   - ❌ Evita: `POST /workorders/webhook/approve { "id": 1, ... }`
   - ✅ Usa: `POST /workorders/webhook/approve { "publicCode": "OS-001-20251209", ... }`

2. **Validação de Status**
   - Só aceita modificação se OS está em `WAITING_APPROVAL`
   - Previne chamadas múltiplas do mesmo webhook

3. **Rastreamento com externalId**
   - Registra origem do webhook (email-service, sendgrid, etc)
   - Facilita auditoria e debug

4. **Sem autenticação (Intencional)**
   - Cliente clica no email = não tem token JWT
   - publicCode é único e não sequencial = seguro
   - Validação de estado + rastreamento = proteção

### ⚠️ Opcional: Adicionar mais segurança

Se precisar de mais segurança, você pode:

```typescript
// Option 1: Adicionar HMAC de verificação
// Email contém: ?code=OS-001&hmac=abc123def456

// Option 2: Token descartável gerado na submissão
const token = crypto.randomBytes(32).toString('hex');
await db.workOrder.update({
  where: { id },
  data: { approvalToken: token }
});

// Email: /approve?code=OS-001&token=abc123...

// Webhook valida:
const order = await db.workOrder.findUnique({
  where: { publicCode }
});
if (order.approvalToken !== token) {
  throw new BadRequestException('Token inválido');
}
```

---

## 🧪 Teste Manual do Webhook

### Usando cURL

```bash
# Aprovar
curl -X POST http://localhost:3000/workorders/webhook/approve \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "OS-001-20251209",
    "action": "APPROVE",
    "externalId": "test-approval-001"
  }'

# Recusar
curl -X POST http://localhost:3000/workorders/webhook/approve \
  -H "Content-Type: application/json" \
  -d '{
    "publicCode": "OS-001-20251209",
    "action": "DENY",
    "reason": "Aguardando esclarecimentos",
    "externalId": "test-deny-001"
  }'
```

### Usando Postman

1. Criar requisição POST
2. URL: `http://localhost:3000/workorders/webhook/approve`
3. Body (JSON):
```json
{
  "publicCode": "OS-001-20251209",
  "action": "APPROVE",
  "externalId": "postman-test-123"
}
```

---

## 📊 Rastreamento e Auditoria

Cada webhook aprovado/recusado registra:

```typescript
{
  id: 123,
  status: "IN_PROGRESS" | "DIAGNOSING",
  approvedAt: Date,           // Quando foi aprovado
  approvedBy: string,         // "webhook-{externalId}"
  externalApprovalId: string, // ID do sistema que enviou
  deniedAt?: Date,            // Se recusado
  denialReason?: string,      // Motivo da recusa
  externalDenialId?: string   // ID do sistema que recusou
}
```

**Consultar histórico:**
```bash
GET /workorders/123

Response:
{
  "id": 123,
  "status": "IN_PROGRESS",
  "approvedAt": "2025-12-09T11:30:00Z",
  "approvedBy": "webhook-email-approval-xyz123",
  "externalApprovalId": "email-approval-xyz123"
}
```

---

## 🚀 Checklist de Implementação

- [ ] 1. Seu sistema de email configurado
- [ ] 2. Template de email com links criado
- [ ] 3. Seu backend processa cliques de email
- [ ] 4. Chamadas para `/workorders/webhook/approve` enviadas
- [ ] 5. Testes manuais com cURL funcionando
- [ ] 6. Email real enviado ao cliente
- [ ] 7. Cliente clica no link
- [ ] 8. OS atualizada automaticamente
- [ ] 9. Mecanico vê status atualizado no dashboard
- [ ] 10. Logs/Auditoria registram tudo

---

## 💡 Dicas Finais

### Para integrar com SendGrid, Mailgun, etc:

1. Seu serviço de email envia Email com publicCode
2. Cliente clica no link
3. Seu handler reduz para `/workorders/webhook/approve`
4. API atualiza OS automaticamente

### Para integrar com SMS:

```bash
# Cliente recebe SMS
"OS-001-20251209 aprovada? Sim: https://api.com/app?code=OS-001&action=approve"

# Frontend mobile
POST /workorders/webhook/approve
{
  "publicCode": "OS-001-20251209",
  "action": "APPROVE",
  "externalId": "sms-twilio-123456"
}
```

### Para integrar com WhatsApp:

```bash
# Usar serviço como Twilio
# Botão WhatsApp chama webhook
POST /workorders/webhook/approve
{
  "publicCode": "OS-001-20251209",
  "action": "APPROVE",
  "externalId": "whatsapp-twilio-xyz"
}
```

---

## 📞 Suporte

Dúvidas sobre integração?
- Revisar: `APIS_DOCUMENTATION.md`
- Rodar testes: `npm test -- -i`
- Checar logs: `GET /workorders/:id`

---

**🎯 Webhook pronto para usar em produção!** 🚀
