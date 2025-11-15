/**
 * 安全工具函數
 * 用於防止 XSS、輸入驗證等安全措施
 */

/** ========= 清理 HTML 內容，防止 XSS ========= */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/** ========= 驗證 URL 是否安全 ========= */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    // 只允許 http 和 https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // SSRF 防護：禁止內部網路 URL
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }
    
    // 禁止私有 IP 範圍
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
    ];
    
    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/** ========= 驗證和清理應用程式名稱 ========= */
export function sanitizeAppName(name: string): string {
  // 移除危險字符，只保留字母、數字、中文、空格和基本標點
  return name
    .replace(/[<>\"'&]/g, '') // 移除 HTML 特殊字符
    .trim()
    .slice(0, 100); // 限制長度
}

/** ========= 驗證和清理描述文字 ========= */
export function sanitizeDescription(desc: string): string {
  // 移除腳本標籤和危險內容
  return desc
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // 移除事件處理器
    .trim()
    .slice(0, 500); // 限制長度
}

/** ========= 驗證分類名稱 ========= */
export function sanitizeCategoryName(name: string): string {
  return name
    .replace(/[<>\"'&]/g, '')
    .trim()
    .slice(0, 50);
}

/** ========= 驗證標籤 ========= */
export function sanitizeTags(tags: string[]): string[] {
  return tags
    .map(tag => tag.replace(/[<>\"'&,]/g, '').trim().slice(0, 20))
    .filter(tag => tag.length > 0)
    .slice(0, 10); // 最多 10 個標籤
}

/** ========= 驗證圖示路徑 ========= */
export function isValidIcon(icon: string): boolean {
  // 允許 emoji、相對路徑、絕對 URL、data URL
  if (icon.startsWith('/images/')) return true;
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return isValidUrl(icon);
  }
  if (icon.startsWith('data:image/')) {
    // 驗證 data URL 格式
    return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(icon);
  }
  // emoji 或其他安全內容
  return icon.length <= 100;
}

/** ========= 驗證 Catalog 資料結構 ========= */
export function validateCatalog(catalog: any): { valid: boolean; error?: string } {
  if (!catalog || typeof catalog !== 'object') {
    return { valid: false, error: '無效的 catalog 格式' };
  }

  if (!Array.isArray(catalog.categories)) {
    return { valid: false, error: 'categories 必須是陣列' };
  }

  if (!Array.isArray(catalog.apps)) {
    return { valid: false, error: 'apps 必須是陣列' };
  }

  // 驗證分類數量
  if (catalog.categories.length > 50) {
    return { valid: false, error: '分類數量過多（最多 50 個）' };
  }

  // 驗證應用程式數量
  if (catalog.apps.length > 500) {
    return { valid: false, error: '應用程式數量過多（最多 500 個）' };
  }

  // 驗證每個應用程式
  for (const app of catalog.apps) {
    if (!app.name || typeof app.name !== 'string' || app.name.length > 100) {
      return { valid: false, error: '應用程式名稱無效' };
    }
    if (!app.href || typeof app.href !== 'string' || !isValidUrl(app.href)) {
      return { valid: false, error: '應用程式連結無效' };
    }
    if (app.icon && !isValidIcon(app.icon)) {
      return { valid: false, error: '應用程式圖示無效' };
    }
  }

  return { valid: true };
}

/** ========= 生成 CSRF Token ========= */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** ========= 驗證 CSRF Token ========= */
export function verifyCSRFToken(token: string, storedToken: string | null): boolean {
  if (!token || !storedToken) return false;
  // 使用時間安全比較
  if (token.length !== storedToken.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}

