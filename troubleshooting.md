# LibreChat Troubleshooting Guide

## 502 Bad Gateway Error After Container Restart

### Problem
After restarting LibreChat containers, you may encounter a `502 Bad Gateway` error from nginx.

### Root Causes
1. **Wrong compose file**: Using `docker-compose.yml` instead of `deploy-compose.yml`
2. **Stale nginx proxy connections** after API container restart

### Solution

#### 1. Use the Correct Compose File
Always use `deploy-compose.yml` for production deployments:

```bash
# CORRECT - uses deploy-compose.yml which includes librechat.yaml volume mount
docker compose -f deploy-compose.yml up -d

# INCORRECT - docker-compose.yml doesn't mount librechat.yaml
docker compose up -d
```

#### 2. Restart Nginx After API Changes
When you restart the API container, nginx may have stale connections. Always restart nginx:

```bash
# Restart API
docker compose -f deploy-compose.yml restart api

# Then restart nginx to reconnect
docker compose -f deploy-compose.yml restart client
```

Or restart everything:
```bash
docker compose -f deploy-compose.yml down
docker compose -f deploy-compose.yml up -d
```

### Key Differences Between Compose Files

**docker-compose.yml**
- Development-focused
- Does NOT mount librechat.yaml
- Results in "ENOENT: no such file or directory" errors

**deploy-compose.yml**
- Production-ready
- Includes volume mount for librechat.yaml:
  ```yaml
  volumes:
    - type: bind
      source: ./librechat.yaml
      target: /app/librechat.yaml
  ```

### Verification Steps
```bash
# Check if all containers are running
docker compose -f deploy-compose.yml ps

# Test API directly (should return 200 OK)
curl -I http://localhost:3080/health

# Test nginx proxy (should return 200 OK)
curl -I http://localhost/
```