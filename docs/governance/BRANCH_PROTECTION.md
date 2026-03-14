# Regras de Protecao de Branch

## Objetivo
Garantir que `main/master` nao recebam commits diretos e que todo merge passe por Pull Request com validacao de CI/CD.

## Regras obrigatorias
- Bloquear push direto em `main` e `master`.
- Exigir Pull Request para merge.
- Exigir pelo menos 1 aprovacao.
- Exigir status checks da pipeline (`App K8s CI/CD / build-and-test`).
- Exigir branch atualizada com base branch antes do merge.
- Bloquear force-push e delete da branch protegida.

## Automacao
Script: `scripts/configure-branch-protection.ps1`

Exemplo:
```powershell
./scripts/configure-branch-protection.ps1 -Owner "PedroHMS-ap" -Repo "mech-craft-api" -Branches @("main")
```

