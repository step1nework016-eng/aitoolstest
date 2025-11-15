/**
 * 伺服器端進階安全工具
 */

const crypto = require('crypto');

/** ========= 安全審計日誌 ========= */
class SecurityAuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // 最多保留 1000 條日誌
  }

  log(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      ip: details.ip || 'unknown'
    };
    
    this.logs.push(logEntry);
    
    // 限制日誌數量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 根據事件類型決定日誌級別
    if (event.includes('FAILED') || event.includes('ATTACK') || event.includes('SUSPICIOUS')) {
      console.error(`🚨 [SECURITY] ${event}`, details);
    } else if (event.includes('SUCCESS') || event.includes('LOGIN')) {
      console.log(`✅ [SECURITY] ${event}`, details);
    } else {
      console.log(`ℹ️ [SECURITY] ${event}`, details);
    }
  }

  getRecentLogs(limit = 50) {
    return this.logs.slice(-limit);
  }

  getLogsByEvent(event, limit = 50) {
    return this.logs
      .filter(log => log.event === event)
      .slice(-limit);
  }
}

const auditLogger = new SecurityAuditLogger();

/** ========= 進階 Rate Limiting（基於多個因素） ========= */
class AdvancedRateLimiter {
  constructor() {
    this.store = new Map();
    this.suspiciousIPs = new Set();
  }

  getKey(req) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    // 組合 IP 和 User-Agent 作為鍵
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  check(req, maxRequests, windowMs, endpoint) {
    const key = this.getKey(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!this.store.has(key)) {
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
        requests: [{ time: now, endpoint }],
        firstRequest: now
      });
      return { allowed: true };
    }

    const record = this.store.get(key);

    // 檢查是否超過時間窗口
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      record.requests = [{ time: now, endpoint }];
      record.firstRequest = now;
      return { allowed: true };
    }

    // 檢查請求頻率
    record.count++;
    record.requests.push({ time: now, endpoint });

    // 清理舊請求記錄（只保留最近 1 分鐘的）
    record.requests = record.requests.filter(r => now - r.time < 60000);

    if (record.count > maxRequests) {
      // 標記為可疑 IP
      this.suspiciousIPs.add(ip);
      
      auditLogger.log('RATE_LIMIT_EXCEEDED', {
        ip,
        endpoint,
        count: record.count,
        maxRequests,
        userAgent: req.headers['user-agent']
      });

      return {
        allowed: false,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
        reason: '請求過於頻繁'
      };
    }

    // 檢測異常模式（短時間內大量請求）
    const recentRequests = record.requests.filter(r => now - r.time < 10000); // 最近 10 秒
    if (recentRequests.length > 20) {
      auditLogger.log('SUSPICIOUS_ACTIVITY_DETECTED', {
        ip,
        endpoint,
        requestsIn10s: recentRequests.length,
        userAgent: req.headers['user-agent']
      });
    }

    return { allowed: true };
  }

  isSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  clear() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime + 60000) { // 保留 1 分鐘過期記錄
        this.store.delete(key);
      }
    }
  }
}

const advancedRateLimiter = new AdvancedRateLimiter();

// 每 5 分鐘清理一次
setInterval(() => {
  advancedRateLimiter.clear();
}, 5 * 60 * 1000);

/** ========= IP 白名單檢查 ========= */
function checkIPWhitelist(req, whitelist) {
  if (!whitelist || whitelist.length === 0) {
    return true; // 沒有白名單，允許所有
  }

  const ip = req.ip || req.connection.remoteAddress || '';
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = forwarded ? forwarded.split(',')[0].trim() : ip;

  return whitelist.some(allowed => {
    if (allowed === realIp) return true;
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(realIp);
    }
    return false;
  });
}

/** ========= 驗證請求簽名 ========= */
function verifyRequestSignature(req, secret) {
  const signature = req.headers['x-request-signature'];
  const timestamp = parseInt(req.headers['x-request-timestamp'] || '0', 10);

  if (!signature || !timestamp) {
    return { valid: false, reason: '缺少簽名或時間戳' };
  }

  // 檢查時間戳（防止重放攻擊）
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  if (diff > 300000) { // 5 分鐘容差
    return { valid: false, reason: '時間戳過期' };
  }

  // 計算預期簽名
  const method = req.method;
  const path = req.path;
  const body = JSON.stringify(req.body || {});
  const data = `${method}:${path}:${body}:${timestamp}:${secret}`;
  const expectedSignature = crypto.createHash('sha256').update(data).digest('hex');

  // 時間安全比較
  let result = 0;
  if (signature.length !== expectedSignature.length) {
    result = 1;
  } else {
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
  }

  if (result !== 0) {
    return { valid: false, reason: '簽名驗證失敗' };
  }

  return { valid: true };
}

/** ========= 檢測 SSRF 攻擊 ========= */
function detectSSRF(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();

    // 檢查是否為內部網路
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { isSSRF: true, reason: 'localhost' };
    }

    // 檢查私有 IP 範圍
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
    ];

    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      return { isSSRF: true, reason: '私有 IP' };
    }

    // 檢查 .local 或 .internal 域名
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { isSSRF: true, reason: '內部域名' };
    }

    return { isSSRF: false };
  } catch {
    return { isSSRF: true, reason: '無效的 URL' };
  }
}

/** ========= 驗證和清理 JSON 資料 ========= */
function sanitizeJsonData(data, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    throw new Error('資料結構過深');
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.slice(0, 10000); // 限制字串長度
  }

  if (typeof data === 'number') {
    if (!isFinite(data)) {
      return 0;
    }
    return data;
  }

  if (typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    if (data.length > 1000) {
      throw new Error('陣列過長');
    }
    return data.map(item => sanitizeJsonData(item, maxDepth, currentDepth + 1));
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 100) {
      throw new Error('物件鍵過多');
    }

    const sanitized = {};
    for (const key of keys) {
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
      if (cleanKey) {
        sanitized[cleanKey] = sanitizeJsonData(data[key], maxDepth, currentDepth + 1);
      }
    }
    return sanitized;
  }

  return null;
}

module.exports = {
  auditLogger,
  advancedRateLimiter,
  checkIPWhitelist,
  verifyRequestSignature,
  detectSSRF,
  sanitizeJsonData
};

