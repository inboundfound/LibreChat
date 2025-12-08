#!/bin/bash
# SSL Certificate Renewal Script for LibreChat

# Stop nginx container
docker stop LibreChat-NGINX

# Renew certificate
sudo certbot renew --cert-name ch.utilitybar.ai --standalone

# Start nginx container
docker start LibreChat-NGINX

# Log the renewal
echo "SSL renewal completed at $(date)" >> /home/ubuntu/LibreChat/logs/ssl-renewal.log