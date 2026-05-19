#!/usr/bin/env node

/**
 * 前端日志分析工具
 * 分析 Next.js 生产环境日志，识别问题和模式
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function analyzeLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`❌ 日志文件不存在: ${filePath}`, 'red');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  log('\n📊 前端日志分析报告\n', 'cyan');
  log('='.repeat(60), 'cyan');

  // 1. 基本信息
  log('\n1. 基本信息', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  const serverStarts = lines.filter(line => line.includes('Starting Next.js server')).length;
  const readyMessages = lines.filter(line => line.includes('Ready in')).length;
  const backendUrlLogs = lines.filter(line => line.includes('[Events API] Backend URL')).length;
  
  log(`✅ 服务器启动次数: ${serverStarts}`, serverStarts > 1 ? 'yellow' : 'green');
  log(`✅ Ready 消息次数: ${readyMessages}`, 'green');
  log(`✅ API 请求次数: ${backendUrlLogs}`, 'green');

  // 提取启动时间
  const readyTimes = lines
    .filter(line => line.includes('Ready in'))
    .map(line => {
      const match = line.match(/Ready in (\d+)ms/);
      return match ? parseInt(match[1]) : null;
    })
    .filter(time => time !== null);

  if (readyTimes.length > 0) {
    const avgTime = Math.round(readyTimes.reduce((a, b) => a + b, 0) / readyTimes.length);
    const maxTime = Math.max(...readyTimes);
    const minTime = Math.min(...readyTimes);
    log(`   平均启动时间: ${avgTime}ms`, 'blue');
    log(`   最快启动时间: ${minTime}ms`, 'green');
    log(`   最慢启动时间: ${maxTime}ms`, maxTime > 2000 ? 'yellow' : 'blue');
  }

  // 2. 后端连接分析
  log('\n2. 后端连接分析', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  const backendUrls = lines
    .filter(line => line.includes('[Events API] Backend URL'))
    .map(line => {
      const match = line.match(/Backend URL: (http:\/\/[^\s]+)/);
      return match ? match[1] : null;
    })
    .filter(url => url !== null);

  if (backendUrls.length > 0) {
    const uniqueUrls = [...new Set(backendUrls)];
    log(`✅ 使用的后端 URL:`, 'green');
    uniqueUrls.forEach(url => {
      const count = backendUrls.filter(u => u === url).length;
      log(`   ${url} (${count} 次请求)`, 'blue');
    });

    // 检查 URL 类型
    if (uniqueUrls.some(url => url.includes('backend:'))) {
      log(`✅ 使用 Docker 容器名称 (backend:3001)`, 'green');
      log(`   说明: 在 Docker 环境中运行`, 'blue');
    } else if (uniqueUrls.some(url => url.includes('localhost'))) {
      log(`⚠️  使用 localhost`, 'yellow');
      log(`   说明: 如果在 Docker 中，应使用容器名称`, 'yellow');
    }
  }

  // 3. API 请求模式分析
  log('\n3. API 请求模式分析', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  const queryStrings = lines
    .filter(line => line.includes('[Events API] Query string'))
    .map(line => {
      const match = line.match(/Query string: (.+)/);
      return match ? match[1] : null;
    })
    .filter(qs => qs !== null);

  // 分析查询参数
  const statusCounts = {};
  const queryTypes = {};

  queryStrings.forEach(qs => {
    const params = new URLSearchParams(qs);
    const status = params.get('status') || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // 识别查询类型
    const hasOffset = params.has('offset');
    const hasLimit = params.has('limit');
    const hasSort = params.has('sortBy');
    const type = `${hasOffset ? 'paginated' : ''}${hasSort ? '-sorted' : ''}`.trim() || 'simple';
    queryTypes[type] = (queryTypes[type] || 0) + 1;
  });

  log(`✅ 请求状态分布:`, 'green');
  Object.entries(statusCounts).forEach(([status, count]) => {
    log(`   ${status}: ${count} 次`, 'blue');
  });

  log(`✅ 查询类型分布:`, 'green');
  Object.entries(queryTypes).forEach(([type, count]) => {
    log(`   ${type}: ${count} 次`, 'blue');
  });

  // 4. 错误分析
  log('\n4. 错误分析', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  const errorLines = lines.filter(line => 
    line.toLowerCase().includes('error') ||
    line.toLowerCase().includes('fail') ||
    line.toLowerCase().includes('exception') ||
    line.toLowerCase().includes('timeout')
  );

  if (errorLines.length > 0) {
    log(`❌ 发现 ${errorLines.length} 个可能的错误:`, 'red');
    errorLines.slice(0, 10).forEach((line, index) => {
      log(`   ${index + 1}. ${line.substring(0, 80)}...`, 'red');
    });
    if (errorLines.length > 10) {
      log(`   ... 还有 ${errorLines.length - 10} 个错误`, 'yellow');
    }
  } else {
    log(`✅ 未发现明显的错误信息`, 'green');
    log(`⚠️  注意: 日志中没有显示 API 响应状态`, 'yellow');
    log(`   建议: 检查后端日志确认请求是否成功`, 'yellow');
  }

  // 5. 服务器重启分析
  log('\n5. 服务器重启分析', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  if (serverStarts > 1) {
    log(`⚠️  服务器重启了 ${serverStarts} 次`, 'yellow');
    log(`   可能原因:`, 'yellow');
    log(`   - 代码更改触发热重载`, 'blue');
    log(`   - 容器重启`, 'blue');
    log(`   - 内存不足导致崩溃`, 'blue');
    log(`   - 手动重启`, 'blue');
    
    // 检查重启间隔
    const startIndices = [];
    lines.forEach((line, index) => {
      if (line.includes('Starting Next.js server')) {
        startIndices.push(index);
      }
    });

    if (startIndices.length > 1) {
      log(`   重启位置:`, 'blue');
      startIndices.forEach((idx, i) => {
        if (i > 0) {
          const linesBetween = idx - startIndices[i - 1];
          log(`   第 ${i} 次重启: 第 ${idx + 1} 行 (距上次 ${linesBetween} 行)`, 'blue');
        }
      });
    }
  } else {
    log(`✅ 服务器运行稳定，未发现重启`, 'green');
  }

  // 6. 性能分析
  log('\n6. 性能分析', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  if (readyTimes.length > 0) {
    const avgTime = readyTimes.reduce((a, b) => a + b, 0) / readyTimes.length;
    if (avgTime < 1000) {
      log(`✅ 启动性能良好 (平均 ${Math.round(avgTime)}ms)`, 'green');
    } else if (avgTime < 3000) {
      log(`⚠️  启动时间较长 (平均 ${Math.round(avgTime)}ms)`, 'yellow');
    } else {
      log(`❌ 启动时间过长 (平均 ${Math.round(avgTime)}ms)`, 'red');
    }
  }

  // 7. 建议
  log('\n7. 诊断建议', 'cyan');
  log('-'.repeat(40), 'cyan');
  
  const suggestions = [];

  if (backendUrls.some(url => url.includes('localhost')) && process.env.DOCKER_ENV) {
    suggestions.push('在 Docker 环境中应使用容器名称 (backend:3001) 而不是 localhost');
  }

  if (errorLines.length === 0 && queryStrings.length > 0) {
    suggestions.push('日志中没有显示 API 响应，建议：');
    suggestions.push('  - 检查后端日志确认请求是否成功');
    suggestions.push('  - 在前端代码中添加响应状态日志');
    suggestions.push('  - 使用网络工具检查 HTTP 状态码');
  }

  if (serverStarts > 1) {
    suggestions.push('服务器多次重启，建议：');
    suggestions.push('  - 检查容器资源使用情况 (docker stats)');
    suggestions.push('  - 检查是否有内存泄漏');
    suggestions.push('  - 查看完整的容器日志');
  }

  if (suggestions.length > 0) {
    suggestions.forEach(suggestion => {
      log(`💡 ${suggestion}`, 'blue');
    });
  } else {
    log(`✅ 未发现明显问题`, 'green');
  }

  // 8. 下一步操作
  log('\n8. 建议的下一步操作', 'cyan');
  log('-'.repeat(40), 'cyan');
  log(`1. 检查后端容器日志:`, 'blue');
  log(`   docker logs conference_backend --tail 100`, 'blue');
  log(`2. 检查容器网络连接:`, 'blue');
  log(`   docker exec conference_frontend ping -c 3 conference_backend`, 'blue');
  log(`3. 检查 API 响应:`, 'blue');
  log(`   curl http://localhost:3001/api/health`, 'blue');
  log(`4. 查看容器资源使用:`, 'blue');
  log(`   docker stats conference_frontend conference_backend`, 'blue');

  log('\n' + '='.repeat(60) + '\n', 'cyan');
}

// 主函数
const logFile = process.argv[2] || 'c:\\Users\\jason\\Downloads\\conference-frontend-prod-20251114110656.log';

if (!logFile) {
  log('使用方法: node analyze-log.js <日志文件路径>', 'yellow');
  process.exit(1);
}

analyzeLogFile(logFile);

