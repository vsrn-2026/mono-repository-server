# Monitoring & Alerting Setup

## Overview
mono-server uses Prometheus for metrics collection and Grafana for visualization and alerting.

## Components

### Prometheus
- **Port**: 9090
- **Metrics Endpoint**: `http://localhost:8080/api/v1/metrics`
- **Configuration**: `backend/prometheus.yml`

### Grafana
- **Port**: 3000
- **Default Credentials**: admin / admin (change on first login)
- **Data Source**: Prometheus (http://prometheus:9090)

## Available Metrics

### HTTP Metrics
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total HTTP requests counter
- `http_errors_total` - Total HTTP errors counter

### Cache Metrics
- `cache_hits_total` - Cache hit counter
- `cache_misses_total` - Cache miss counter

### Queue Metrics
- `queue_depth` - Current job queue depth

### System Metrics (Default)
- CPU usage
- Memory usage
- Event loop lag
- Active handles

### Alerting Rules
- **HighAPILatency**: p95 > 1s for 2 minutes
- **HighErrorRate**: Error rate > 5% for 2 minutes
- **LowCacheHitRate**: Cache hit rate < 70% for 5 minutes
- **HighQueueDepth**: Queue depth > 1000 for 5 minutes

## Quick Start

1. Start all services:
```bash
docker-compose up -d
```

2. Access Grafana:
```
http://localhost:3000
```

3. Add Prometheus data source:
- URL: `http://prometheus:9090`
- Access: Server (default)

4. Import dashboards or create custom ones

## Production Considerations

1. **Storage**: Use persistent volumes for metrics data
2. **Security**: Enable authentication and HTTPS
3. **Backup**: Regular backup of Grafana dashboards
4. **Scaling**: Consider Prometheus federation for multi-instance deployments