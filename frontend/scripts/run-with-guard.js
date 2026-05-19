/**
 * Wrapper to start Next.js server:
 * 1. Redirect buggy dep "let" file paths to /tmp/giip-tmp/let (always writable in Linux containers).
 * 2. Suppress any remaining EACCES/EPERM on *let as uncaughtException/unhandledRejection.
 */
'use strict';

var path = require('path');
var fs = require('fs');

// IMPORTANT: Do NOT derive SAFE_LET from TMPDIR when compose sets TMPDIR=/app/.tmp/
// — subpaths like /app/.tmp/giip-tmp/let can still EACCES (overlay/permissions), which
// crashes Next and causes NPM 502. Always use OS /tmp on Linux containers.
var SAFE_LET_DIR =
  process.platform === 'win32'
    ? path.join(process.env.TEMP || process.env.TMP || 'C:\\Temp', 'giip-tmp')
    : '/tmp/giip-tmp';
var SAFE_LET = path.join(SAFE_LET_DIR, 'let');

function isLetPath(filePath) {
  if (typeof filePath !== 'string') return false;
  var n = filePath.trim();
  // IMPORTANT: Never redirect the safe-let path itself — that would cause an infinite loop.
  if (n === SAFE_LET || n === SAFE_LET_DIR) return false;
  // Known bad patterns observed in logs: /dev/shmlet, /var/let, /etc/let, /let, let
  if (n === 'let' || n === '/let') return true;
  // Match paths that END in /let segment (but not our own /tmp/giip-tmp/let)
  if (n.endsWith('/let') && n !== SAFE_LET) return true;
  // /dev/shmlet suffix
  if (n.endsWith('shmlet')) return true;
  // Some libs build paths like "/app/.tmp/let" or "/var/lib/let" etc.
  // Be careful: only match if the segment is exactly "let" (not "wallet", "bullet", etc.)
  // Use regex to match /let at a path boundary.
  if (/[/\\]let([/\\]|$)/.test(n) && n !== SAFE_LET) return true;
  return false;
}

function redirectLetPath(filePath) {
  if (!isLetPath(filePath)) return filePath;
  return SAFE_LET;
}

// Ensure target exists so open won't fail.
// Suppress all errors including EPERM (container may not allow chmod on /tmp).
try {
  if (!fs.existsSync(SAFE_LET_DIR)) fs.mkdirSync(SAFE_LET_DIR, { recursive: true });
  if (!fs.existsSync(SAFE_LET)) fs.writeFileSync(SAFE_LET, '');
  // chmod may fail with EPERM in some container setups - that's OK, just log once.
  try { fs.chmodSync(SAFE_LET, 0o666); } catch (e) {
    // Silently ignore - the file is still usable without chmod
  }
} catch (e) {
  // Directory creation may fail in read-only container environments - that's OK
}

var origOpen = fs.open;
var origOpenSync = fs.openSync;
fs.open = function (pathArg, flags, mode, callback) {
  if (typeof mode === 'function') { callback = mode; mode = undefined; }
  pathArg = redirectLetPath(pathArg);
  return origOpen.call(fs, pathArg, flags, mode, callback);
};
fs.openSync = function (pathArg, flags, mode) {
  pathArg = redirectLetPath(pathArg);
  return origOpenSync.call(fs, pathArg, flags, mode);
};
if (fs.promises && typeof fs.promises.open === 'function') {
  var origPromisesOpen = fs.promises.open;
  fs.promises.open = function (pathArg, flags, mode) {
    pathArg = redirectLetPath(pathArg);
    return origPromisesOpen.call(fs.promises, pathArg, flags, mode);
  };
}

// Some buggy deps chmod/chown *let paths; redirect those too.
var origChmod = fs.chmod;
var origChmodSync = fs.chmodSync;
if (typeof origChmod === 'function') {
  fs.chmod = function (pathArg, mode, callback) {
    if (typeof mode === 'function') { callback = mode; mode = undefined; }
    pathArg = redirectLetPath(pathArg);
    return origChmod.call(fs, pathArg, mode, callback);
  };
}
if (typeof origChmodSync === 'function') {
  fs.chmodSync = function (pathArg, mode) {
    pathArg = redirectLetPath(pathArg);
    return origChmodSync.call(fs, pathArg, mode);
  };
}
if (fs.promises && typeof fs.promises.chmod === 'function') {
  var origPromisesChmod = fs.promises.chmod;
  fs.promises.chmod = function (pathArg, mode) {
    pathArg = redirectLetPath(pathArg);
    return origPromisesChmod.call(fs.promises, pathArg, mode);
  };
}

function isLetPathError(err) {
  if (!err || typeof err !== 'object') return false;
  var code = err.code;
  var pathStr = (err.path != null) ? String(err.path) : '';
  var msgStr = (err.message != null) ? String(err.message) : '';
  var hasLet = pathStr.indexOf('let') !== -1 || msgStr.indexOf('let') !== -1;
  var giipTmp = pathStr.indexOf('giip-tmp') !== -1 || msgStr.indexOf('giip-tmp') !== -1;
  // ENOENT can happen for chmod('/dev/let') style calls; treat as non-fatal if it's a let path.
  return (code === 'EACCES' || code === 'EPERM' || code === 'ENOENT') && (hasLet || giipTmp);
}

// Avoid log storms: only emit a suppressed log once per key per interval.
var _lastLetLogAt = Object.create(null);
var LET_LOG_INTERVAL_MS = 5000;
function shouldLogSuppressed(err) {
  try {
    var key = String((err && (err.path || err.message || err.code)) || 'unknown');
    var now = Date.now();
    var last = _lastLetLogAt[key] || 0;
    if (now - last < LET_LOG_INTERVAL_MS) return false;
    _lastLetLogAt[key] = now;
    return true;
  } catch (e) {
    return true;
  }
}

function suppressOrExit(err, label) {
  if (isLetPathError(err)) {
    if (shouldLogSuppressed(err)) {
      console.warn('[Guard] Suppressed ' + label + ':', err.code, err.path || err.message || '');
    }
    return true;
  }
  return false;
}

process.on('uncaughtException', function (err) {
  if (suppressOrExit(err, 'uncaughtException')) return;
  console.error('uncaughtException', err);
  process.exit(1);
});

process.on('unhandledRejection', function (reason) {
  if (suppressOrExit(reason, 'unhandledRejection')) return;
  console.error('unhandledRejection', reason);
});

console.warn('[Guard] Active - *let paths redirected to ' + SAFE_LET + ', EACCES/EPERM suppressed');
require(path.join(__dirname, '..', 'server.js'));
