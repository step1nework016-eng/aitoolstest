/**
 * 進階安全工具函數
 * 提供更深入的安全防護措施
 */

/** ========= 驗證檔案 MIME 類型 ========= */
export function isValidImageMime(mimeType: string): boolean {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  return allowedMimes.includes(mimeType.toLowerCase());
}

/** ========= 驗證檔案大小 ========= */
export function isValidFileSize(size: number, maxSizeMB: number = 2): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size > 0 && size <= maxSizeBytes;
}

/** ========= 驗證檔案名稱 ========= */
export function sanitizeFileName(fileName: string): string {
  // 移除路徑分隔符和危險字符
  return fileName
    .replace(/[\/\\\?\*\|"<>:]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .slice(0, 255); // 檔案名稱長度限制
}

/** ========= 驗證 Data URL 格式 ========= */
export function isValidDataUrl(dataUrl: string): boolean {
  // 驗證 data URL 格式：data:[<mediatype>][;base64],<data>
  const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+\/=]+$/;
  if (!dataUrlPattern.test(dataUrl)) {
    return false;
  }

  // 驗證 base64 資料長度（防止過大的檔案）
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) return false;
  
  // base64 編碼後的長度約為原始資料的 4/3
  // 2MB 原始資料約為 2.67MB base64
  const maxBase64Length = Math.ceil(2 * 1024 * 1024 * 4 / 3);
  return base64Data.length <= maxBase64Length;
}

/** ========= 驗證 URL 是否為內部網路（SSRF 防護） ========= */
export function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 檢查是否為 localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    
    // 檢查是否為私有 IP 範圍
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/
    ];
    
    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      return true;
    }
    
    // 檢查是否為 .local 或 .internal 域名
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/** ========= 驗證 URL 是否安全（SSRF 防護） ========= */
export function isSafeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // 只允許 http 和 https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // 禁止內部網路 URL（SSRF 防護）
    if (isInternalUrl(url)) {
      return false;
    }
    
    // 禁止危險協議
    const dangerousProtocols = ['file:', 'javascript:', 'data:', 'vbscript:'];
    if (dangerousProtocols.includes(urlObj.protocol.toLowerCase())) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/** ========= 驗證密碼強度 ========= */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0-100
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('密碼長度至少需要 8 個字元');
    return { valid: false, score: 0, feedback };
  }
  
  score += 20; // 基本長度
  
  if (password.length >= 12) {
    score += 10; // 更長密碼
  }
  
  if (/[a-z]/.test(password)) {
    score += 10; // 包含小寫字母
  } else {
    feedback.push('建議包含小寫字母');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 10; // 包含大寫字母
  } else {
    feedback.push('建議包含大寫字母');
  }
  
  if (/[0-9]/.test(password)) {
    score += 10; // 包含數字
  } else {
    feedback.push('建議包含數字');
  }
  
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 10; // 包含特殊字符
  } else {
    feedback.push('建議包含特殊字符');
  }
  
  // 檢查常見弱密碼
  const commonPasswords = ['password', '12345678', 'admin', 'qwerty', 'letmein'];
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    score -= 20;
    feedback.push('避免使用常見密碼');
  }
  
  return {
    valid: score >= 50,
    score: Math.min(100, Math.max(0, score)),
    feedback: feedback.length > 0 ? feedback : ['密碼強度良好']
  };
}

/** ========= 生成請求簽名 ========= */
export function generateRequestSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  secret: string
): string {
  const crypto = window.crypto || (window as any).msCrypto;
  const encoder = new TextEncoder();
  const data = `${method}:${path}:${body}:${timestamp}:${secret}`;
  const dataBuffer = encoder.encode(data);
  
  return crypto.subtle.digest('SHA-256', dataBuffer).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

/** ========= 驗證請求時間戳（防止重放攻擊） ========= */
export function isValidTimestamp(timestamp: number, toleranceSeconds: number = 300): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= toleranceSeconds * 1000; // 5 分鐘容差
}

/** ========= 清理和驗證 JSON 資料 ========= */
export function sanitizeJsonData(data: any, maxDepth: number = 10, currentDepth: number = 0): any {
  if (currentDepth > maxDepth) {
    throw new Error('資料結構過深');
  }
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // 限制字串長度
    return data.slice(0, 10000);
  }
  
  if (typeof data === 'number') {
    // 檢查是否為有效數字
    if (!isFinite(data)) {
      return 0;
    }
    return data;
  }
  
  if (typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    // 限制陣列長度
    if (data.length > 1000) {
      throw new Error('陣列過長');
    }
    return data.map(item => sanitizeJsonData(item, maxDepth, currentDepth + 1));
  }
  
  if (typeof data === 'object') {
    // 限制物件鍵數量
    const keys = Object.keys(data);
    if (keys.length > 100) {
      throw new Error('物件鍵過多');
    }
    
    const sanitized: any = {};
    for (const key of keys) {
      // 清理鍵名
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
      if (cleanKey) {
        sanitized[cleanKey] = sanitizeJsonData(data[key], maxDepth, currentDepth + 1);
      }
    }
    return sanitized;
  }
  
  return null;
}

/** ========= 檢測可疑活動模式 ========= */
export function detectSuspiciousActivity(
  requestCount: number,
  timeWindow: number,
  threshold: number = 100
): boolean {
  // 簡單的異常檢測：短時間內大量請求
  const requestsPerSecond = requestCount / (timeWindow / 1000);
  return requestsPerSecond > threshold;
}

/** ========= 驗證檔案內容（簡單的魔數檢查） ========= */
export function validateImageFileContent(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 驗證圖片尺寸（防止超大圖片）
      if (img.width > 5000 || img.height > 5000) {
        resolve(false);
        return;
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

