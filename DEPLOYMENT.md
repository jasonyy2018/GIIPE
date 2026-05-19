# Conference Management Platform - Deployment Guide

## 🚀 Production Deployment

This guide covers the complete deployment process for the Conference Management Platform, including prerequisites, configuration, deployment, and maintenance.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Network**: Ports 80, 443, and 22 (SSH) accessible

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For version control
- **SSL Certificate**: Recommended for production (Let's Encrypt or commercial)

### Installation Commands

#### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Reboot to apply Docker group changes
sudo reboot
```

#### CentOS/RHEL
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install git -y

# Reboot to apply Docker group changes
sudo reboot
```

## 🔧 Configuration

### 1. Environment Setup

Run the interactive environment setup script:

```bash
# Make script executable
chmod +x scripts/env-setup.sh

# Run environment setup for production
./scripts/env-setup.sh production
```

This will prompt you for:
- Database configuration
- Domain name and URLs
- Email/SMTP settings
- Storage configuration (Local/AWS S3)
- Security settings (automatically generated)

### 2. SSL Certificate Setup (Recommended)

#### Option A: Let's Encrypt (Free, Automated)
```bash
# Install Certbot
sudo apt install certbot -y  # Ubuntu/Debian
# OR
sudo yum install certbot -y   # CentOS/RHEL

# Stop any running web services
sudo systemctl stop nginx apache2 2>/dev/null || true
docker-compose down 2>/dev/null || true

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 600 nginx/ssl/*.pem
```

#### Option B: Self-Signed (Development/Testing)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

chmod 600 nginx/ssl/*.pem
```

### 3. Domain Configuration

Update your domain's DNS records to point to your server:
- **A Record**: `yourdomain.com` → `YOUR_SERVER_IP`
- **A Record**: `www.yourdomain.com` → `YOUR_SERVER_IP`

Update the Nginx configuration with your domain:
```bash
# Edit nginx/conf.d/default.conf
sed -i 's/localhost/yourdomain.com/g' nginx/conf.d/default.conf
```

## 🚀 Deployment Process

### Automated Deployment

Use the deployment script for a complete automated deployment:

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy the application
./scripts/deploy.sh deploy
```

The deployment script will:
1. Check prerequisites
2. Create automatic backup
3. Build Docker images
4. Deploy services
5. Run database migrations
6. Perform health checks
7. Clean up unused resources

### Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Build images
docker build -f backend/Dockerfile.prod -t conference-backend:latest backend/
docker build -f frontend/Dockerfile.prod -t conference-frontend:latest frontend/

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 4. Check health
curl http://localhost/api/health
```

## 🔍 Verification

### Health Checks

```bash
# Automated health check
./scripts/deploy.sh health

# Manual checks
curl -f http://localhost/api/health
curl -f http://localhost/api/docs
```

### Service Status
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔒 Security Configuration

### Firewall Setup

#### Ubuntu (UFW)
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

#### CentOS (firewalld)
```bash
# Start firewall
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow services
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload configuration
sudo firewall-cmd --reload
```

### SSL Certificate Auto-Renewal

Add to crontab for automatic certificate renewal:
```bash
# Edit crontab
sudo crontab -e

# Add renewal job (runs daily at 2 AM)
0 2 * * * /usr/bin/certbot renew --quiet --post-hook "docker-compose -f /path/to/your/docker-compose.prod.yml restart nginx"
```

## 📊 Monitoring and Maintenance

### Log Management

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Check log sizes
docker system df
```

### Backup and Restore

#### Create Backup
```bash
# Automated backup
./scripts/deploy.sh backup

# Manual backup
mkdir -p backups/manual_$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U conference_user -d conference_platform > backups/manual_$(date +%Y%m%d_%H%M%S)/database.sql
```

#### Restore from Backup
```bash
# Automated rollback to last backup
./scripts/deploy.sh rollback

# Manual restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_platform < backup_path/database.sql
```

### System Monitoring

```bash
# Check system resources
df -h                    # Disk usage
free -h                  # Memory usage
docker stats             # Container resource usage
docker system df         # Docker disk usage

# Clean up Docker resources
docker system prune -f   # Remove unused containers, networks, images
```

## 🔄 Updates and Maintenance

### Application Updates

```bash
# 1. Create backup
./scripts/deploy.sh backup

# 2. Pull latest code
git pull origin main

# 3. Deploy updates
./scripts/deploy.sh deploy

# 4. If issues occur, rollback
./scripts/deploy.sh rollback
```

### Database Maintenance

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform

# Vacuum and analyze (inside PostgreSQL)
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('conference_platform'));
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U conference_user

# Reset database (CAUTION: This will delete all data)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Check certificate expiration
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal
```

#### Performance Issues
```bash
# Check container resource usage
docker stats

# Check system load
top
htop

# Check disk I/O
iotop

# Optimize database
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "VACUUM ANALYZE;"
```

### Emergency Procedures

#### Complete System Recovery
```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Clean Docker system
docker system prune -a -f

# 3. Restore from backup
./scripts/deploy.sh rollback

# 4. If rollback fails, manual restore
# Restore database from backup
# Restore uploaded files
# Redeploy application
```

#### Data Recovery
```bash
# Export current database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U conference_user -d conference_platform > emergency_backup.sql

# Copy uploaded files
cp -r uploads/ emergency_uploads_backup/
```

## 📞 Support and Resources

### Log Locations
- **Application Logs**: `docker-compose logs`
- **Nginx Logs**: `/var/log/nginx/` (inside nginx container)
- **PostgreSQL Logs**: `docker-compose logs postgres`

### Configuration Files
- **Environment**: `.env.production`
- **Docker Compose**: `docker-compose.prod.yml`
- **Nginx**: `nginx/conf.d/default.conf`
- **SSL Certificates**: `nginx/ssl/`

### Useful Commands Reference
```bash
# Service management
docker-compose -f docker-compose.prod.yml up -d      # Start services
docker-compose -f docker-compose.prod.yml down       # Stop services
docker-compose -f docker-compose.prod.yml restart    # Restart services
docker-compose -f docker-compose.prod.yml ps         # Check status

# Logs and debugging
docker-compose -f docker-compose.prod.yml logs -f    # Follow logs
docker-compose -f docker-compose.prod.yml exec backend sh  # Access backend container
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform  # Access database

# Maintenance
./scripts/deploy.sh backup    # Create backup
./scripts/deploy.sh health    # Health check
./scripts/deploy.sh deploy    # Full deployment
./scripts/deploy.sh rollback  # Rollback to last backup
```

---

## 🎉 Success!

Once deployed successfully, your Conference Management Platform will be available at:

- **Frontend**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api`
- **API Documentation**: `https://yourdomain.com/api/docs`
- **Health Check**: `https://yourdomain.com/api/health`

The first user to register will automatically become an administrator.

For ongoing support and updates, refer to the project repository and documentation.