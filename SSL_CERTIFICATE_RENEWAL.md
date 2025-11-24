# SSL Certificate Renewal Guide for LibreChat

This guide documents the process for renewing SSL certificates for LibreChat deployed with Docker and nginx.

## Overview

LibreChat uses Let's Encrypt SSL certificates managed by Certbot. The nginx container mounts these certificates from the host system at `/etc/letsencrypt`.

## Prerequisites

- Certbot installed on the host system
- Docker and docker-compose
- Root/sudo access
- Domain properly pointed to the server (in this case: vibe.inboundfound.com)

## Certificate Configuration

### Nginx Configuration

The SSL certificates are configured in `/home/ubuntu/LibreChat/client/nginx.conf`:

```nginx
ssl_certificate /etc/letsencrypt/live/vibe.inboundfound.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/vibe.inboundfound.com/privkey.pem;
```

### Docker Configuration

The nginx container mounts the certificates as read-only volumes in `deploy-compose.yml`:

```yaml
client:
  image: nginx:1.27.0-alpine
  container_name: LibreChat-NGINX
  volumes:
    - ./client/nginx.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

## Manual Renewal Process

### Step 1: Check Certificate Status

```bash
sudo certbot certificates
```

This shows all certificates, their expiry dates, and paths.

### Step 2: Stop Nginx Container

The nginx container must be stopped to free up port 80 for the renewal process:

```bash
docker stop LibreChat-NGINX
```

### Step 3: Renew Certificate

Use certbot's standalone method to renew the certificate:

```bash
sudo certbot renew --cert-name vibe.inboundfound.com --standalone
```

### Step 4: Restart Nginx Container

```bash
docker start LibreChat-NGINX
```

### Step 5: Verify Renewal

```bash
sudo certbot certificates
```

Confirm the new expiry date (should be ~90 days from renewal).

## Automated Renewal Setup

### Option 1: Cron Job

Create a renewal script at `/home/ubuntu/LibreChat/scripts/renew-ssl.sh`:

```bash
#!/bin/bash
# SSL Certificate Renewal Script for LibreChat

# Stop nginx container
docker stop LibreChat-NGINX

# Renew certificate
sudo certbot renew --cert-name vibe.inboundfound.com --standalone

# Start nginx container
docker start LibreChat-NGINX

# Log the renewal
echo "SSL renewal completed at $(date)" >> /home/ubuntu/LibreChat/logs/ssl-renewal.log
```

Make it executable:

```bash
chmod +x /home/ubuntu/LibreChat/scripts/renew-ssl.sh
```

Add to crontab (runs weekly on Sunday at 3 AM):

```bash
sudo crontab -e
# Add this line:
0 3 * * 0 /home/ubuntu/LibreChat/scripts/renew-ssl.sh
```

### Option 2: Systemd Timer

Create a systemd service at `/etc/systemd/system/librechat-ssl-renewal.service`:

```ini
[Unit]
Description=LibreChat SSL Certificate Renewal
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStartPre=/usr/bin/docker stop LibreChat-NGINX
ExecStart=/usr/bin/certbot renew --cert-name vibe.inboundfound.com --standalone
ExecStartPost=/usr/bin/docker start LibreChat-NGINX
StandardOutput=journal
StandardError=journal
```

Create a timer at `/etc/systemd/system/librechat-ssl-renewal.timer`:

```ini
[Unit]
Description=Run LibreChat SSL renewal weekly
Requires=librechat-ssl-renewal.service

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable librechat-ssl-renewal.timer
sudo systemctl start librechat-ssl-renewal.timer
```

## Troubleshooting

### Certificate Not Renewing

1. Check if port 80 is free: `sudo netstat -tlnp | grep :80`
2. Ensure the domain is properly pointed to the server
3. Check certbot logs: `sudo cat /var/log/letsencrypt/letsencrypt.log`

### Nginx Not Starting After Renewal

1. Check nginx logs: `docker logs LibreChat-NGINX`
2. Verify certificate files exist: `sudo ls -la /etc/letsencrypt/live/vibe.inboundfound.com/`
3. Test nginx configuration: `docker exec LibreChat-NGINX nginx -t`

### Multiple Domains

If you need to add more domains, update:

1. The nginx.conf file with additional server blocks
2. The renewal script to include all domains
3. Request new certificates: `sudo certbot certonly --standalone -d new-domain.com`

## Important Notes

- Let's Encrypt certificates are valid for 90 days
- Certbot typically auto-renews certificates 30 days before expiry
- Always test the renewal process manually before relying on automation
- Keep backups of your certificates in `/etc/letsencrypt/`
- Monitor renewal logs to ensure certificates don't expire

## Related Files

- Nginx config: `/home/ubuntu/LibreChat/client/nginx.conf`
- Docker compose: `/home/ubuntu/LibreChat/deploy-compose.yml`
- Certificates: `/etc/letsencrypt/live/vibe.inboundfound.com/`
- Certbot logs: `/var/log/letsencrypt/letsencrypt.log`
