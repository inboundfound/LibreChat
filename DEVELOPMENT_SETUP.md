# LibreChat Development Setup Documentation

## Overview
This document describes the development setup for LibreChat with local builds and MCP server integration. The setup ensures that local code changes are applied and MCP servers are properly detected.

## Issues Resolved

### 1. Local Changes Not Being Applied
**Problem**: Code changes weren't reflected in the running application because LibreChat was using pre-built Docker images from GitHub Container Registry instead of building from local source.

**Original Configuration**:
```yaml
# docker-compose.yml (problematic)
services:
  api:
    image: ghcr.io/danny-avila/librechat-dev:latest  # Pre-built image
```

**Solution**: Implemented local building through `docker-compose.override.yml`

### 2. MCP Servers Not Being Detected
**Problem**: MCP servers configured in `librechat.yaml` weren't being detected, resulting in no MCP tools being available.

**Root Cause**: The `librechat.yaml` configuration file wasn't being mounted into the Docker container.

**Error Messages**:
```
Config file YAML format is invalid: ENOENT: no such file or directory, open '/app/librechat.yaml'
```

**Solution**: Added proper volume mount for the configuration file.

## Final Architecture

### File Structure
```
LibreChat/
├── docker-compose.yml              # Main compose file (unchanged from upstream)
├── docker-compose.override.yml     # Development customizations
├── librechat.yaml                  # MCP server configuration
├── .env                           # Environment variables
└── ... (other project files)
```

### Docker Compose Configuration

#### Main File (`docker-compose.yml`)
- Kept as original from upstream repository
- Uses pre-built images: `ghcr.io/danny-avila/librechat-dev:latest`
- Standard volume mounts (excludes `librechat.yaml`)

#### Override File (`docker-compose.override.yml`)
```yaml
services:
  api:
    # LOCAL BUILD - Build from local source code instead of using pre-built images
    image: librechat
    build:
      context: .
      target: node
    
    # CUSTOM VOLUME MOUNTS
    volumes:
      # Mount librechat.yaml configuration file
      - type: bind
        source: ./librechat.yaml
        target: /app/librechat.yaml
```

## MCP Server Configuration

### Current MCP Servers
Located in `librechat.yaml`:

```yaml
mcpServers:
  if-core-app-mcp:
    type: sse
    url: 'http://host.docker.internal:15532/sse'
    name: 'Pitchmesh and LaunchGuardian operations'
    description: 'Pitchmesh and LaunchGuardian operations via MCP'
    customJWTAuth: 'ubAuthToken' 
    headers:
      Authorization: '{{Authorization}}'
```

### Available MCP Tools
The system successfully detects **12 MCP tools**:
- `get_user_profile`
- `get_my_websites`
- `get_lg_operation_status`
- `create_new_crawl_operation`
- `add_website`
- `get_sender_group_list`
- `get_company_lists`
- `create_graph_extraction_operation`
- `create_sender_group`
- `add_company`
- `render_crawl_form`
- `render_custom_form`

## Development Workflow

### Initial Setup
1. **Clone the repository**
2. **Create the override file** (already done):
   ```bash
   # File: docker-compose.override.yml
   # Content: See configuration above
   ```
3. **Configure MCP servers in `librechat.yaml`** (already done)

### Daily Development Workflow
1. **Make code changes** to any LibreChat source files
2. **Rebuild the application**:
   ```bash
   docker compose build
   ```
3. **Restart the services**:
   ```bash
   docker compose up -d
   ```

### Alternative Commands
- **Full rebuild without cache**: `docker compose build --no-cache`
- **Stop services**: `docker compose down`
- **View logs**: `docker logs LibreChat -f`
- **View MCP-specific logs**: `docker logs LibreChat 2>&1 | grep MCP`

## Verification Steps

### 1. Check Local Build is Active
```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep LibreChat
# Should show: LibreChat    librechat
# NOT: LibreChat    ghcr.io/danny-avila/librechat-dev:latest
```

### 2. Verify Configuration File Mount
```bash
docker exec LibreChat ls -la /app/librechat.yaml
# Should show the file exists with correct timestamp
```

### 3. Check MCP Server Detection
```bash
docker logs LibreChat 2>&1 | grep "MCP servers initialized"
# Should show: "MCP servers initialized successfully. Added 12 MCP tools."
```

### 4. Verify No Configuration Errors
```bash
docker logs LibreChat 2>&1 | grep "Config file"
# Should NOT show any ENOENT errors
```

## Log Monitoring

### View Real-time Backend Logs
```bash
docker logs -f LibreChat
```

### Filter for MCP Messages
```bash
docker logs LibreChat 2>&1 | grep -E "(MCP|mcpConfig|mcpServers)"
```

### View Last 20 Log Lines
```bash
docker logs LibreChat 2>&1 | tail -20
```

## Benefits of This Setup

### ✅ **Development Benefits**
- **Local changes applied**: All code modifications are included in builds
- **Fast iteration**: No need to push to registry or wait for external builds
- **Debugging-friendly**: Full control over the build process

### ✅ **Configuration Management**
- **Clean separation**: Main compose file stays pristine
- **Git-friendly**: Override file can be committed or gitignored as needed
- **Upstream compatibility**: Easy to merge upstream changes

### ✅ **MCP Integration**
- **Proper detection**: All MCP servers and tools are recognized
- **Configuration flexibility**: Easy to add/modify MCP servers
- **Authentication support**: Custom JWT auth working correctly

## Troubleshooting

### Issue: Changes Not Reflected
**Solution**: Ensure you're rebuilding after changes:
```bash
docker compose build && docker compose up -d
```

### Issue: MCP Servers Not Detected
**Check**: Verify `librechat.yaml` is mounted:
```bash
docker exec LibreChat cat /app/librechat.yaml | head -5
```

### Issue: Using Wrong Image
**Check**: Confirm override is working:
```bash
docker compose config | grep -A 5 "image:"
```

### Issue: Configuration Errors
**Check**: Look for YAML syntax issues:
```bash
docker logs LibreChat 2>&1 | grep -i "yaml\|config"
```

## Security Notes

### JWT Authentication
- MCP server uses custom JWT auth via `ubAuthToken` cookie
- Authorization header is dynamically populated from the cookie
- Connections use `host.docker.internal` for local development

### Volume Mounts
- Configuration files are bind-mounted (not copied) for real-time updates
- Sensitive files (like `.env`) are properly secured

## Future Maintenance

### Updating LibreChat
1. **Pull upstream changes**: `git pull upstream main`
2. **Rebuild**: `docker compose build`
3. **Restart**: `docker compose up -d`

### Adding New MCP Servers
1. **Edit `librechat.yaml`**: Add new server configuration
2. **Restart**: `docker compose restart api`
3. **Verify**: Check logs for new server detection

### Modifying Build Configuration
- Edit `docker-compose.override.yml` for build changes
- Keep main `docker-compose.yml` unchanged to ease upstream merges

---

*Last updated: September 10, 2025*
*Setup verified working with LibreChat v0.8.0-rc3*