#!/usr/bin/env node

/**
 * 前后端诊断工具
 * 检查服务状态、端口占用、API连接、数据库连接等
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 检查端口是否被占用
async function checkPort(port, serviceName) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} || ss -tlnp | grep :${port}`;

    exec(command, (error, stdout) => {
      if (error || !stdout || stdout.trim() === '') {
        logError(`${serviceName} (端口 ${port}): 未运行`);
        resolve(false);
      } else {
        logSuccess(`${serviceName} (端口 ${port}): 正在运行`);
        resolve(true);
      }
    });
  });
}

// HTTP 请求检查
function httpRequest(url, timeout = 5000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          data: data.substring(0, 200), // 只取前200字符
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: '请求超时',
      });
    });
  });
}

// 检查 API 端点
async function checkApiEndpoint(url, name) {
  logInfo(`检查 ${name}...`);
  const result = await httpRequest(url);
  if (result.success) {
    logSuccess(`${name}: 可访问 (状态码: ${result.statusCode})`);
    return true;
  } else {
    logError(`${name}: 不可访问 - ${result.error || `状态码: ${result.statusCode}`}`);
    return false;
  }
}

// 检查 Docker 容器
async function checkDockerContainer(containerName) {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Names}}\t{{.Status}}"`);
    if (stdout && stdout.includes(containerName)) {
      const status = stdout.split('\t')[1] || '运行中';
      logSuccess(`Docker 容器 ${containerName}: ${status}`);
      return true;
    } else {
      logError(`Docker 容器 ${containerName}: 未运行`);
      return false;
    }
  } catch (error) {
    logWarning(`无法检查 Docker 容器 ${containerName} (Docker 可能未安装或未运行)`);
    return false;
  }
}

// 检查环境变量文件
function checkEnvFile(filePath, requiredVars = []) {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(filePath)) {
    logError(`环境变量文件不存在: ${filePath}`);
    return false;
  }

  logSuccess(`环境变量文件存在: ${filePath}`);
  
  if (requiredVars.length > 0) {
    const content = fs.readFileSync(filePath, 'utf8');
    const missing = requiredVars.filter(varName => !content.includes(varName));
    if (missing.length > 0) {
      logWarning(`缺少环境变量: ${missing.join(', ')}`);
    } else {
      logSuccess(`必需的环境变量都已配置`);
    }
  }
  
  return true;
}

// 检查数据库连接（通过 API）
async function checkDatabase() {
  logInfo('通过 API 检查数据库连接...');
  const result = await httpRequest('http://localhost:3001/api/health', 3000);
  if (result.success) {
    try {
      const data = JSON.parse(result.data);
      if (data.database === 'connected') {
        logSuccess('数据库: 已连接');
        return true;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  logWarning('无法通过 API 检查数据库状态');
  return false;
}

// 主诊断函数
async function diagnose() {
  console.clear();
  log('\n🔍 GIIPE 前后端诊断工具\n', 'bright');

  const results = {
    ports: {},
    apis: {},
    docker: {},
    env: {},
  };

  // 1. 检查端口
  logSection('1. 端口检查');
  results.ports.frontend = await checkPort(3000, '前端服务');
  results.ports.backend = await checkPort(3001, '后端服务');
  results.ports.postgres = await checkPort(5432, 'PostgreSQL 数据库');
  results.ports.redis = await checkPort(6379, 'Redis 缓存');

  // 2. 检查 Docker 容器（如果使用 Docker）
  logSection('2. Docker 容器检查');
  const dockerAvailable = await checkDockerContainer('conference_backend');
  if (dockerAvailable) {
    await checkDockerContainer('conference_frontend');
    await checkDockerContainer('conference_postgres');
    await checkDockerContainer('conference_redis');
  }

  // 3. 检查 API 端点
  logSection('3. API 端点检查');
  results.apis.backendHealth = await checkApiEndpoint(
    'http://localhost:3001/api/health',
    '后端健康检查'
  );
  results.apis.frontend = await checkApiEndpoint(
    'http://localhost:3000',
    '前端首页'
  );
  results.apis.backendApi = await checkApiEndpoint(
    'http://localhost:3001/api/events',
    '后端 Events API'
  );

  // 4. 检查数据库
  logSection('4. 数据库连接检查');
  results.database = await checkDatabase();

  // 5. 检查环境变量文件
  logSection('5. 环境变量文件检查');
  const path = require('path');
  results.env.backend = checkEnvFile(
    path.join(__dirname, 'backend', '.env'),
    ['DATABASE_URL', 'JWT_SECRET', 'REDIS_HOST']
  );
  results.env.frontend = checkEnvFile(
    path.join(__dirname, 'frontend', '.env.local'),
    ['NEXT_PUBLIC_API_URL', 'NEXTAUTH_SECRET']
  );

  // 6. 检查 Node.js 版本
  logSection('6. 环境信息');
  const nodeVersion = process.version;
  logInfo(`Node.js 版本: ${nodeVersion}`);
  logInfo(`平台: ${process.platform} ${process.arch}`);

  // 7. 总结
  logSection('诊断总结');
  
  const allPortsOk = Object.values(results.ports).every(v => v);
  const allApisOk = Object.values(results.apis).every(v => v);
  
  if (allPortsOk && allApisOk) {
    logSuccess('所有服务运行正常！', 'green');
  } else {
    logError('发现问题，请检查上述错误信息', 'red');
    
    if (!results.ports.backend) {
      logInfo('建议: 运行 cd backend && npm run start:dev');
    }
    if (!results.ports.frontend) {
      logInfo('建议: 运行 cd frontend && npm run dev');
    }
    if (!results.ports.postgres && !dockerAvailable) {
      logInfo('建议: 启动 PostgreSQL 数据库或使用 Docker Compose');
    }
  }

  console.log('\n');
}

// 运行诊断
diagnose().catch((error) => {
  logError(`诊断过程出错: ${error.message}`);
  process.exit(1);
});

