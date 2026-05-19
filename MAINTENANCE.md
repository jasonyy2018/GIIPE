# Conference Management Platform - Maintenance Guide

## 🔧 Regular Maintenance Tasks

### Daily Tasks (Automated)
- SSL certificate renewal check
- Log rotation
- Database backup
- Health monitoring

### Weekly Tasks
- Review system logs
- Check disk space usage
- Monitor application performance
- Review security logs

### Monthly Tasks
- Update system packages
- Review and rotate secrets
- Performance optimization
- Backup verification

## 📊 Monitoring

### System Health Checks

```bash
# Quick health check
./scripts/deploy.sh health

# Detailed system status
docker-compose -f docker-compose.prod.yml ps
docker stats --no-stream
df -h
free -h
```

### Application Metrics

```bash
# API health endpoint
curl -s http://localhost/api/health | jq

# Database connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "SELECT count(*) FROM pg_stat_activity;"

# Redis status
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats
```

### Log Analysis

```bash
# View recent errors
docker-compose -f docker-compose.prod.yml logs --since=1h | grep -i error

# Monitor real-time logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Check log sizes
docker-compose -f docker-compose.prod.yml exec backend du -sh /app/logs/
```

## 🔄 Backup and Recovery

### Automated Backup Schedule

Create a cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Add backup jobs
# Daily backup at 2 AM
0 2 * * * /path/to/project/scripts/deploy.sh backup

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 /path/to/project/scripts/deploy.sh backup && tar -czf /backups/weekly_$(date +\%Y\%m\%d).tar.gz /path/to/project/backups/
```

### Backup Verification

```bash
# List available backups
ls -la backups/

# Verify backup integrity
./scripts/verify-backup.sh backups/backup_20231201_020000

# Test restore process (on staging)
./scripts/deploy.sh rollback
```

### Backup Retention Policy

```bash
# Clean old backups (keep last 30 days)
find backups/ -name "backup_*" -mtime +30 -delete

# Archive old backups to external storage
rsync -av backups/ user@backup-server:/backups/conference-platform/
```

## 🔒 Security Maintenance

### SSL Certificate Management

```bash
# Check certificate expiration
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Test certificate renewal
sudo certbot renew --dry-run

# Force certificate renewal
sudo certbot renew --force-renewal
sudo docker-compose -f docker-compose.prod.yml restart nginx
```

### Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
sudo yum update -y                      # CentOS/RHEL

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
./scripts/deploy.sh deploy

# Check for security vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image conference-backend:latest
```

### Access Control Review

```bash
# Review user accounts
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio

# Check failed login attempts
docker-compose -f docker-compose.prod.yml logs backend | grep "authentication failed"

# Review admin activities
docker-compose -f docker-compose.prod.yml logs backend | grep "admin action"
```

## 📈 Performance Optimization

### Database Maintenance

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform

# Inside PostgreSQL:
# Analyze database performance
ANALYZE;

# Vacuum database
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('conference_platform'));

# Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema','pg_catalog') 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Cache Optimization

```bash
# Redis cache statistics
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory

# Clear cache if needed
docker-compose -f docker-compose.prod.yml exec redis redis-cli flushall

# Monitor cache hit rate
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats | grep keyspace
```

### Resource Optimization

```bash
# Check container resource usage
docker stats --no-stream

# Optimize Docker images
docker image prune -f
docker container prune -f
docker volume prune -f

# Check disk usage
du -sh uploads/
du -sh backups/
docker system df
```

## 🚨 Incident Response

### Service Outage Response

1. **Immediate Assessment**
   ```bash
   # Check service status
   ./scripts/deploy.sh health
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Quick Recovery**
   ```bash
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   
   # If restart fails, rollback
   ./scripts/deploy.sh rollback
   ```

3. **Root Cause Analysis**
   ```bash
   # Check logs for errors
   docker-compose -f docker-compose.prod.yml logs --since=1h
   
   # Check system resources
   df -h
   free -h
   top
   ```

### Database Issues

```bash
# Check database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U conference_user

# Check database locks
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check database connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "SELECT count(*) FROM pg_stat_activity;"

# Emergency database restart
docker-compose -f docker-compose.prod.yml restart postgres
```

### Performance Issues

```bash
# Check resource usage
docker stats
htop

# Check slow queries
docker-compose -f docker-compose.prod.yml logs backend | grep "slow query"

# Check database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

## 📋 Maintenance Checklists

### Weekly Maintenance Checklist

- [ ] Check system health status
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Check disk space usage (should be < 80%)
- [ ] Monitor SSL certificate expiration
- [ ] Review security logs
- [ ] Check database performance
- [ ] Verify cache performance
- [ ] Test health endpoints

### Monthly Maintenance Checklist

- [ ] Update system packages
- [ ] Update Docker images
- [ ] Review and rotate secrets
- [ ] Perform database maintenance (VACUUM, ANALYZE)
- [ ] Clean up old backups
- [ ] Review user accounts and permissions
- [ ] Check for security vulnerabilities
- [ ] Performance optimization review
- [ ] Test backup and restore procedures
- [ ] Review monitoring and alerting

### Quarterly Maintenance Checklist

- [ ] Security audit
- [ ] Performance benchmarking
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Capacity planning review
- [ ] SSL certificate renewal (if not automated)
- [ ] Third-party service review
- [ ] Compliance review

## 🔧 Maintenance Scripts

### Create Maintenance Scripts

```bash
# Create maintenance script directory
mkdir -p scripts/maintenance

# System health check script
cat > scripts/maintenance/health-check.sh << 'EOF'
#!/bin/bash
echo "=== System Health Check ==="
echo "Date: $(date)"
echo

echo "=== Docker Services ==="
docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== System Resources ==="
echo "Disk Usage:"
df -h
echo -e "\nMemory Usage:"
free -h

echo -e "\n=== Application Health ==="
curl -s http://localhost/api/health | jq || echo "Health check failed"

echo -e "\n=== Database Status ==="
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U conference_user

echo -e "\n=== Recent Errors ==="
docker-compose -f docker-compose.prod.yml logs --since=24h | grep -i error | tail -10
EOF

chmod +x scripts/maintenance/health-check.sh
```

### Log Rotation Script

```bash
cat > scripts/maintenance/rotate-logs.sh << 'EOF'
#!/bin/bash
echo "Rotating Docker logs..."

# Rotate Docker container logs
docker-compose -f docker-compose.prod.yml logs --no-color > logs/app-$(date +%Y%m%d).log
docker-compose -f docker-compose.prod.yml restart

# Compress old logs
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;

# Remove old compressed logs (older than 30 days)
find logs/ -name "*.log.gz" -mtime +30 -delete

echo "Log rotation completed"
EOF

chmod +x scripts/maintenance/rotate-logs.sh
```

### Database Maintenance Script

```bash
cat > scripts/maintenance/db-maintenance.sh << 'EOF'
#!/bin/bash
echo "Starting database maintenance..."

# Run VACUUM and ANALYZE
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "VACUUM ANALYZE;"

# Check database size
echo "Database size:"
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "SELECT pg_size_pretty(pg_database_size('conference_platform'));"

# Check table sizes
echo "Largest tables:"
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_platform -c "
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema','pg_catalog') 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;"

echo "Database maintenance completed"
EOF

chmod +x scripts/maintenance/db-maintenance.sh
```

## 📞 Emergency Contacts and Procedures

### Emergency Response Team
- **System Administrator**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]
- **Development Team**: [Contact Information]

### Escalation Procedures
1. **Level 1**: Service degradation - Monitor and attempt automatic recovery
2. **Level 2**: Service outage - Immediate manual intervention required
3. **Level 3**: Data loss or security breach - Emergency response team activation

### Communication Channels
- **Status Page**: [URL]
- **Incident Chat**: [Slack/Teams Channel]
- **Email List**: [Emergency notification list]

---

This maintenance guide should be reviewed and updated regularly to ensure it remains current with your deployment and operational needs.