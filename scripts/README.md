# Conference Management Platform - Deployment Scripts

This directory contains all the scripts needed for deploying, maintaining, and managing the Conference Management Platform.

## 📁 Script Overview

### Environment Setup Scripts
- **`env-setup.sh`** - Interactive environment configuration for Linux/macOS
- **`env-setup.ps1`** - Interactive environment configuration for Windows

### Deployment Scripts
- **`deploy.sh`** - Main deployment script for Linux/macOS
- **`deploy.ps1`** - Main deployment script for Windows

### Backup and Verification Scripts
- **`verify-backup.sh`** - Backup verification script for Linux/macOS
- **`verify-backup.ps1`** - Backup verification script for Windows

## 🚀 Quick Start

### 1. Environment Setup

**Linux/macOS:**
```bash
chmod +x scripts/env-setup.sh
./scripts/env-setup.sh production
```

**Windows:**
```powershell
.\scripts\env-setup.ps1 production
```

### 2. Deployment

**Linux/macOS:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy
```

**Windows:**
```powershell
.\scripts\deploy.ps1 deploy
```

### 3. Backup Verification

**Linux/macOS:**
```bash
chmod +x scripts/verify-backup.sh
./scripts/verify-backup.sh backups/backup_20231201_020000
```

**Windows:**
```powershell
.\scripts\verify-backup.ps1 backups\backup_20231201_020000
```

## 📋 Detailed Script Documentation

### Environment Setup Scripts

#### `env-setup.sh` / `env-setup.ps1`

Interactive script that helps configure environment variables for different deployment environments.

**Usage:**
```bash
./scripts/env-setup.sh <environment>
```

**Parameters:**
- `environment` - Target environment (development, staging, production)

**Features:**
- Interactive prompts for all configuration options
- Automatic generation of secure secrets
- Validation of required settings
- Support for multiple storage backends (local, AWS S3)
- Email/SMTP configuration
- Database configuration
- Security settings

**Generated Files:**
- `.env.<environment>` - Environment configuration file

### Deployment Scripts

#### `deploy.sh` / `deploy.ps1`

Comprehensive deployment script with backup, rollback, and health check capabilities.

**Usage:**
```bash
./scripts/deploy.sh [action]
```

**Actions:**
- `deploy` (default) - Full deployment process
- `rollback` - Rollback to previous backup
- `health` - Perform health checks only
- `backup` - Create backup only

**Features:**
- Prerequisite checking (Docker, Docker Compose, environment files)
- Automatic backup creation before deployment
- Docker image building and optimization
- Service orchestration with proper startup order
- Database migration execution
- Comprehensive health checks
- Automatic cleanup of unused Docker resources
- Detailed logging and error handling
- Rollback capability with automatic restore

**Deployment Process:**
1. Check prerequisites
2. Create backup of current deployment
3. Build Docker images
4. Deploy services with rolling updates
5. Run database migrations
6. Perform health checks
7. Clean up unused resources

### Backup Verification Scripts

#### `verify-backup.sh` / `verify-backup.ps1`

Script to verify the integrity and completeness of backup files.

**Usage:**
```bash
./scripts/verify-backup.sh <backup_directory> [--test-integrity]
```

**Parameters:**
- `backup_directory` - Path to backup directory to verify
- `--test-integrity` - Optional flag to perform database integrity test

**Features:**
- Backup directory structure validation
- Database backup file verification
- Uploads directory verification
- Environment file verification
- Optional database integrity testing
- Comprehensive verification report generation

**Verification Checks:**
- Backup info file presence and content
- Database backup file size and format
- Uploads directory file count and size
- Environment file required variables
- Database restore test (optional)

## 🔧 Configuration

### Environment Variables

The scripts use the following environment variables:

#### Database Configuration
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `DATABASE_URL` - Full database connection string

#### Application Configuration
- `NODE_ENV` - Environment (production, staging, development)
- `APP_PORT` - Frontend application port
- `API_PORT` - Backend API port
- `APP_URL` - Frontend application URL
- `API_URL` - Backend API URL

#### Security Configuration
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `CSRF_SECRET` - CSRF protection secret

#### Email Configuration
- `EMAIL_HOST` - SMTP server host
- `EMAIL_PORT` - SMTP server port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password
- `EMAIL_FROM` - From email address

#### Storage Configuration
- `STORAGE_TYPE` - Storage backend (local, s3)
- `AWS_ACCESS_KEY_ID` - AWS access key (for S3)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (for S3)
- `AWS_REGION` - AWS region (for S3)
- `AWS_S3_BUCKET` - S3 bucket name (for S3)

### File Locations

- **Environment Files**: `.env.production`, `.env.staging`, `.env.development`
- **Docker Compose**: `docker-compose.prod.yml`
- **Backups**: `backups/` directory
- **SSL Certificates**: `nginx/ssl/`
- **Logs**: Docker container logs (accessible via `docker-compose logs`)

## 🔍 Troubleshooting

### Common Issues

#### Permission Denied (Linux/macOS)
```bash
chmod +x scripts/*.sh
```

#### Docker Not Running
```bash
# Linux
sudo systemctl start docker

# macOS
open -a Docker

# Windows
Start-Service docker
```

#### Environment File Not Found
```bash
# Run environment setup first
./scripts/env-setup.sh production
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U conference_user
```

#### SSL Certificate Issues
```bash
# Check certificate files
ls -la nginx/ssl/

# Verify certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout
```

### Debug Mode

Enable debug mode by setting environment variables:

**Linux/macOS:**
```bash
export DEBUG=true
export VERBOSE=true
./scripts/deploy.sh deploy
```

**Windows:**
```powershell
$env:DEBUG = "true"
$env:VERBOSE = "true"
.\scripts\deploy.ps1 deploy
```

### Log Files

Scripts generate logs in the following locations:
- **Deployment Log**: `deployment.log` (in project root)
- **Docker Logs**: `docker-compose -f docker-compose.prod.yml logs`
- **Verification Reports**: `backups/<backup_name>/verification_report.txt`

## 🔒 Security Considerations

### Script Security
- Scripts validate input parameters
- Environment files are created with restricted permissions (600)
- Secrets are generated using cryptographically secure methods
- Database credentials are handled securely

### Backup Security
- Backup files contain sensitive data and should be secured
- Consider encrypting backups for long-term storage
- Implement proper access controls for backup directories
- Regular backup verification is recommended

### Deployment Security
- Scripts check for required security configurations
- SSL/TLS certificates are validated
- Security headers are configured automatically
- Rate limiting and CSRF protection are enabled

## 📞 Support

### Getting Help

1. **Check the logs** - Most issues are logged with detailed error messages
2. **Verify prerequisites** - Ensure all required software is installed
3. **Check environment configuration** - Verify all required variables are set
4. **Review documentation** - Check DEPLOYMENT.md and MAINTENANCE.md

### Common Commands

```bash
# Check script syntax (Linux/macOS)
bash -n scripts/deploy.sh

# View script help
./scripts/deploy.sh --help

# Check environment variables
env | grep -E "(POSTGRES|JWT|EMAIL)"

# Test Docker connectivity
docker info
docker-compose --version
```

### Emergency Procedures

If deployment fails:
1. Check the deployment log for errors
2. Verify all services are running: `docker-compose ps`
3. Check individual service logs: `docker-compose logs <service>`
4. If necessary, rollback: `./scripts/deploy.sh rollback`

---

## 📝 Script Maintenance

### Updating Scripts

When updating scripts:
1. Test changes in a development environment first
2. Update version numbers and documentation
3. Verify backward compatibility
4. Update this README if new features are added

### Adding New Scripts

When adding new scripts:
1. Follow the existing naming convention
2. Include proper error handling and logging
3. Add documentation to this README
4. Make scripts executable and cross-platform compatible
5. Include usage examples and parameter documentation

---

For more detailed information, see:
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Complete deployment guide
- [MAINTENANCE.md](../MAINTENANCE.md) - Maintenance and monitoring guide
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment checklist