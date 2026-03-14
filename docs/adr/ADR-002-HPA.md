# ADR-002 - Escalabilidade Horizontal com HPA

## Status
Aceito

## Contexto
Carga de ordens de servico e picos de uso exigem escalabilidade elastica.

## Decisao
Usar Horizontal Pod Autoscaler para a API com limites de CPU/memoria.

## Consequencias
- Positivas:
  - Escala automatica conforme demanda.
  - Melhor disponibilidade em picos.
- Negativas:
  - Exige metric-server operacional.
  - Pode aumentar custo em picos longos.

## Implementacao
- Manifest: `k8s/hpa.yaml`

