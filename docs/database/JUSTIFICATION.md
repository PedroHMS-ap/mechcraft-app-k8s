# Justificativa do Banco e Modelo Relacional

## Banco escolhido
PostgreSQL gerenciado (Azure Database for PostgreSQL Flexible Server).

## Razoes tecnicas
- Consistencia transacional para ordens de servico, itens e estoque.
- Modelo relacional adequado para integridade referencial (FKs) entre cliente, veiculo e OS.
- Maturidade operacional, backup e alta disponibilidade em oferta gerenciada.
- Boa compatibilidade com Prisma e ecossistema Node/Nest.

## Ajustes realizados no modelo
- Inclusao do campo `Customer.active` para suportar autenticacao por CPF com status de cliente.
- Uso de `publicCode` em `WorkOrder` para identificacao externa sem expor ID interno.
- Campos de trilha de status (`approvedAt`, `deniedAt`, `startedAt`, `finishedAt`, `deliveredAt`) para observabilidade.

## Relacionamentos
- `Customer 1:N Vehicle`
- `Customer 1:N WorkOrder`
- `Vehicle 1:N WorkOrder`
- `WorkOrder 1:N WorkOrderService`
- `WorkOrder 1:N WorkOrderPart`
- `ServiceCatalog 1:N WorkOrderService`
- `Part 1:N WorkOrderPart`

