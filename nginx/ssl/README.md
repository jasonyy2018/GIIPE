# SSL Certificate Configuration

This directory should contain your SSL certificates for HTTPS configuration.

## For Let's Encrypt (Recommended)

1. Install Certbot:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   
   # CentOS/RHEL
   sudo yum install certbot python3-certbot-nginx
   ```

2. Obtain certificates:
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. The certificates will be automatically placed in `/etc/letsencrypt/live/your-domain.com/`

4. Copy or symlink them to this directory:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./fullchain.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./privkey.pem
   ```

## For Custom Certificates

Place your certificate files in this directory:
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

## Certificate Renewal

Set up automatic renewal with cron:
```bash
# Add to crontab (sudo crontab -e)
0 12 * * * /usr/bin/certbot renew --quiet --post-hook "docker-compose -f /path/to/your/docker-compose.prod.yml restart nginx"
```

## Security Notes

- Ensure certificate files have proper permissions (600 for private key)
- Keep private keys secure and never commit them to version control
- Monitor certificate expiration dates
- Use strong cipher suites in nginx configuration