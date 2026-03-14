# Relatório de Auditoria de Segurança – MechCraft API

**Data:** 26/10/2025  
**Ambiente:** Produção (`npm ci --omit=dev`)  
**Comando executado:** `npm audit --production`

---

## 🔍 Resumo

- **Total de vulnerabilidades:** 8  
- **Nível de severidade:** moderado  
- **Origem:** dependência transitiva `class-validator` → `validator`  
- **Advisory:** [GHSA-9965-vmph-33xx](https://github.com/advisories/GHSA-9965-vmph-33xx)  
- **Descrição:** vulnerabilidade de *bypass* em `validator.isURL()`.  
- **Impacto no projeto:** **nenhum**, pois a função `isURL()` não é utilizada em nenhum DTO ou validador do sistema.

---

## 🧠 Análise de Exploitação

Durante a análise do código, foi verificado que:
- Nenhum dos DTOs utiliza o decorator `@IsUrl` ou qualquer função baseada em `isURL`.
- O projeto faz validação apenas de strings, números e enums relacionados a entidades do domínio.
- Não há pontos de entrada que aceitem URLs vindas do cliente.

Logo, o advisory não é explorável dentro do contexto da aplicação MechCraft.

---

## 🛠️ Mitigações Aplicadas

1. O projeto foi instalado em modo de produção:
   ```bash
   npm ci --omit=dev
   ```

2. As versões vulneráveis foram **travadas manualmente** via `overrides` no `package.json`:

   ```json
   {
     "overrides": {
       "validator": "^13.15.0",
       "class-validator": "^0.14.2"
     }
   }
   ```

3. Auditoria executada:
   ```bash
   npm audit --production
   npm ls validator
   ```

4. Configurado script para auditorias futuras no pipeline CI/CD:
   ```json
   {
     "scripts": {
       "audit:prod": "npm audit --omit=dev --audit-level=high",
       "audit:report": "npm audit --omit=dev --json > audit-report.json || exit 0"
     }
   }
   ```

---

## ✅ Decisão de Risco

- **Risco residual:** Baixo / não explorável.  
- **Ação:** Aceitar risco.  
- **Motivo:** A vulnerabilidade se aplica apenas quando há uso do validador de URLs, o que não ocorre neste sistema.  
- **Medida contínua:** Rodar `npm run audit:prod` a cada release de produção.

---

## 📊 Resultado Atual

```bash
npm audit --production
8 moderate severity vulnerabilities
No high or critical vulnerabilities found
```

---

**Conclusão:**  
A aplicação não possui vulnerabilidades exploráveis conhecidas no ambiente de produção.  
Todos os pacotes foram instalados com dependências de execução apenas (`--omit=dev`) e versões críticas foram travadas manualmente.  
O monitoramento contínuo foi estabelecido via scripts de auditoria no `package.json`.
