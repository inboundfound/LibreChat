# LibreChat Development Troubleshooting Checklist

## Quick Diagnostic Commands

Run these commands to quickly diagnose common issues:

### 1. Check Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```
**Expected**: All containers should be "Up" and LibreChat should use `librechat` image.

### 2. Verify Local Build
```bash
docker images | grep librechat
```
**Expected**: Should show a local `librechat` image with recent timestamp.

### 3. Check Configuration Mount
```bash
docker exec LibreChat ls -la /app/librechat.yaml
```
**Expected**: File should exist with correct size (19435 bytes as of last check).

### 4. Verify MCP Initialization
```bash
docker logs LibreChat 2>&1 | grep "MCP servers initialized"
```
**Expected**: `MCP servers initialized successfully. Added 12 MCP tools.`

### 5. Check for Configuration Errors
```bash
docker logs LibreChat 2>&1 | grep -i "error\|enoent"
```
**Expected**: No ENOENT errors for librechat.yaml file.

## Common Issues & Solutions

### ❌ **Issue**: Changes not applied after editing code
**Quick Fix**:
```bash
docker compose build && docker compose up -d
```

### ❌ **Issue**: MCP servers not detected
**Diagnosis**:
```bash
# Check if config file is mounted
docker exec LibreChat ls -la /app/librechat.yaml

# Check for config errors in logs
docker logs LibreChat 2>&1 | tail -20
```

**Fix**: If file not found, restart containers:
```bash
docker compose down && docker compose up -d
```

### ❌ **Issue**: Using pre-built image instead of local build
**Diagnosis**:
```bash
docker ps | grep LibreChat
```
If showing `ghcr.io/danny-avila/librechat-dev:latest`:

**Fix**:
```bash
# Ensure override file exists
cat docker-compose.override.yml

# Rebuild
docker compose build && docker compose up -d
```

### ❌ **Issue**: No MCP tools available in UI
**Diagnosis**:
```bash
# Check MCP server connection
docker logs LibreChat 2>&1 | grep -E "if-core-app-mcp.*SSE transport"

# Check available tools
docker logs LibreChat 2>&1 | grep "Tools:"
```

**Fix**: Restart just the API service:
```bash
docker compose restart api
```

## Emergency Reset

If everything is broken, nuclear option:

```bash
# Stop everything
docker compose down

# Remove containers and rebuild
docker compose build --no-cache

# Start fresh
docker compose up -d

# Verify everything
docker logs LibreChat 2>&1 | tail -30
```

## Environment Variables Check

```bash
# Check if problematic UID/GID warnings are present
docker compose config 2>&1 | grep -i warn

# Check environment file
ls -la .env
```

## Quick Health Check Script

Save this as `health-check.sh`:

```bash
#!/bin/bash

echo "=== LibreChat Health Check ==="
echo

echo "1. Container Status:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "(LibreChat|mongodb|meilisearch|rag_api|vectordb)"
echo

echo "2. Using Local Build:"
docker ps --format "{{.Image}}" | grep "librechat" > /dev/null && echo "✅ Local build active" || echo "❌ Using pre-built image"
echo

echo "3. Config File Mounted:"
docker exec LibreChat ls /app/librechat.yaml > /dev/null 2>&1 && echo "✅ librechat.yaml mounted" || echo "❌ Config file missing"
echo

echo "4. MCP Status:"
MCP_TOOLS=$(docker logs LibreChat 2>&1 | grep "MCP servers initialized" | tail -1)
if [[ -n "$MCP_TOOLS" ]]; then
    echo "✅ $MCP_TOOLS"
else
    echo "❌ MCP servers not initialized"
fi
echo

echo "5. Recent Errors:"
ERRORS=$(docker logs LibreChat 2>&1 | grep -i "error" | tail -3)
if [[ -n "$ERRORS" ]]; then
    echo "⚠️  Recent errors found:"
    echo "$ERRORS"
else
    echo "✅ No recent errors"
fi
```

Make it executable: `chmod +x health-check.sh`

---

*Quick reference for development troubleshooting*