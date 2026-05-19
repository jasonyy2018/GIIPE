module.exports = {
  apps: [
    {
      name: 'conference-backend',
      script: 'dist/main.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.API_PORT || 3001,
        
        // Performance settings
        NODE_OPTIONS: '--max-old-space-size=2048',
        UV_THREADPOOL_SIZE: 16,
        
        // Admin interface specific settings
        ADMIN_SESSION_TIMEOUT: process.env.ADMIN_SESSION_TIMEOUT || 3600000,
        ADMIN_MAX_CONCURRENT_SESSIONS: process.env.ADMIN_MAX_CONCURRENT_SESSIONS || 3,
        WEBSOCKET_HEARTBEAT_INTERVAL: process.env.WEBSOCKET_HEARTBEAT_INTERVAL || 30000,
        WEBSOCKET_CONNECTION_TIMEOUT: process.env.WEBSOCKET_CONNECTION_TIMEOUT || 60000,
        
        // Cache settings
        CACHE_TTL_DASHBOARD_METRICS: process.env.CACHE_TTL_DASHBOARD_METRICS || 60,
        CACHE_TTL_USER_LIST: process.env.CACHE_TTL_USER_LIST || 180,
        CACHE_TTL_ANALYTICS: process.env.CACHE_TTL_ANALYTICS || 600,
        
        // Performance optimization
        DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE || 20,
        BULK_OPERATION_BATCH_SIZE: process.env.BULK_OPERATION_BATCH_SIZE || 100,
        MAX_CONCURRENT_BULK_OPERATIONS: process.env.MAX_CONCURRENT_BULK_OPERATIONS || 3,
      },
      
      // Resource limits
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || '1G',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: process.env.PM2_LOG_FILE || './logs/pm2.log',
      out_file: process.env.PM2_OUT_FILE || './logs/pm2-out.log',
      error_file: process.env.PM2_ERROR_FILE || './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Advanced PM2 features
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Auto restart conditions
      restart_delay: 4000,
      exponential_backoff_restart_delay: 100,
      
      // Instance configuration
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: process.env.PM2_CRON_RESTART || '0 3 * * *',
      
      // Automation
      automation: false,
      
      // Custom environment variables for admin interface
      env_vars: {
        // Feature flags
        ENABLE_REAL_TIME_UPDATES: process.env.ENABLE_REAL_TIME_UPDATES || 'true',
        ENABLE_ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS || 'true',
        ENABLE_BULK_OPERATIONS: process.env.ENABLE_BULK_OPERATIONS || 'true',
        ENABLE_AUDIT_LOGGING: process.env.ENABLE_AUDIT_LOGGING || 'true',
        ENABLE_SECURITY_MONITORING: process.env.ENABLE_SECURITY_MONITORING || 'true',
        ENABLE_PERFORMANCE_OPTIMIZATION: process.env.ENABLE_PERFORMANCE_OPTIMIZATION || 'true',
        
        // Security settings
        FAILED_LOGIN_THRESHOLD: process.env.FAILED_LOGIN_THRESHOLD || 5,
        FAILED_LOGIN_WINDOW_MS: process.env.FAILED_LOGIN_WINDOW_MS || 300000,
        IP_BLOCK_DURATION_MS: process.env.IP_BLOCK_DURATION_MS || 3600000,
        ENABLE_IP_BLOCKING: process.env.ENABLE_IP_BLOCKING || 'true',
        
        // Monitoring settings
        ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING || 'true',
        ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING || 'true',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        
        // Analytics settings
        ANALYTICS_RETENTION_DAYS: process.env.ANALYTICS_RETENTION_DAYS || 365,
        ANALYTICS_AGGREGATION_INTERVAL: process.env.ANALYTICS_AGGREGATION_INTERVAL || '1 hour',
        ENABLE_REAL_TIME_ANALYTICS: process.env.ENABLE_REAL_TIME_ANALYTICS || 'true',
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST || 'your-server.com',
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/conference-management.git',
      path: process.env.DEPLOY_PATH || '/var/www/conference-backend',
      
      // Pre-deployment commands
      'pre-deploy-local': 'echo "Starting deployment..."',
      
      // Post-receive commands
      'post-deploy': [
        'npm ci --production',
        'npm run build',
        'npm run db:migrate',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // Pre-setup commands
      'pre-setup': 'echo "Setting up production environment..."',
      
      // Post-setup commands  
      'post-setup': [
        'ls -la',
        'npm install',
        'npm run build',
        'pm2 start ecosystem.config.js --env production',
        'pm2 save',
        'pm2 startup'
      ].join(' && '),
      
      // Environment variables for deployment
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: process.env.STAGING_DEPLOY_USER || 'deploy',
      host: process.env.STAGING_DEPLOY_HOST || 'staging.your-server.com',
      ref: 'origin/develop',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/conference-management.git',
      path: process.env.STAGING_DEPLOY_PATH || '/var/www/conference-backend-staging',
      
      'post-deploy': [
        'npm ci',
        'npm run build',
        'npm run db:migrate',
        'pm2 reload ecosystem.config.js --env staging',
        'pm2 save'
      ].join(' && '),
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};

// Additional PM2 configuration for admin interface monitoring
if (process.env.NODE_ENV === 'production') {
  module.exports.apps[0].pmx = {
    // Custom metrics for admin interface
    custom_probes: [
      {
        name: 'Admin Active Sessions',
        agg_type: 'avg',
        alert: {
          mode: 'threshold',
          value: 100,
          msg: 'High number of admin sessions'
        }
      },
      {
        name: 'WebSocket Connections',
        agg_type: 'avg',
        alert: {
          mode: 'threshold', 
          value: 500,
          msg: 'High number of WebSocket connections'
        }
      },
      {
        name: 'Pending Moderation Items',
        agg_type: 'avg',
        alert: {
          mode: 'threshold',
          value: 1000,
          msg: 'High moderation queue backlog'
        }
      }
    ],
    
    // Network monitoring
    network: true,
    
    // Port monitoring
    ports: true,
    
    // Actions for remote control
    actions: [
      {
        action_name: 'refresh_dashboard_cache',
        action_type: 'http',
        target: 'http://localhost:3001/admin/cache/refresh-dashboard'
      },
      {
        action_name: 'clear_all_cache',
        action_type: 'http', 
        target: 'http://localhost:3001/admin/cache/clear-all'
      },
      {
        action_name: 'get_system_health',
        action_type: 'http',
        target: 'http://localhost:3001/admin/system/health'
      }
    ]
  };
}