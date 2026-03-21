# Kubernetes Manifests

## Manifests principais
- `namespace.yaml`
- `configmap.yaml`
- `deployment.yaml`
- `service.yaml`
- `hpa.yaml`
- `db.yaml`

## API Gateway (Traefik)
- `gateway/traefik-gateway.yaml`
- `gateway/api-gateway-routing.yaml`

## Observabilidade (New Relic)
- `observability/newrelic-values.yaml`

Crie o secret antes de aplicar o agente:
```bash
kubectl -n mechcraft create secret generic newrelic-license \
  --from-literal=license_key="<NEW_RELIC_LICENSE_KEY>"
```

## Apply rapido
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/gateway/traefik-gateway.yaml
kubectl apply -f k8s/gateway/api-gateway-routing.yaml
helm upgrade --install newrelic newrelic/nri-bundle \
  --namespace mechcraft \
  --create-namespace \
  -f k8s/observability/newrelic-values.yaml
```
