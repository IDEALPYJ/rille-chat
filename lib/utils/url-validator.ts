/**
 * URL验证工具
 * 用于防止SSRF攻击
 */

import { logger } from '@/lib/logger';

/**
 * 检查URL是否是内网地址
 */
function isInternalIP(hostname: string): boolean {
  // 检查是否是IP地址
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;

  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split('.').map(Number);
    // 检查内网IP范围
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
  }

  // 检查本地主机名
  const lowerHostname = hostname.toLowerCase();
  if (lowerHostname === 'localhost' || lowerHostname === '127.0.0.1' || lowerHostname === '::1') {
    return true;
  }

  return false;
}

/**
 * 验证URL是否安全（防止SSRF）
 * @param url 要验证的URL
 * @param allowedHosts 允许的域名列表（可选）
 * @returns 验证结果
 */
export function validateURL(url: string, allowedHosts?: string[]): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // 只允许http和https协议
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // 检查是否是内网地址
    if (isInternalIP(parsed.hostname)) {
      return { valid: false, error: 'Internal IP addresses are not allowed' };
    }

    // 如果提供了允许的域名列表，检查是否在列表中
    if (allowedHosts && allowedHosts.length > 0) {
      const isAllowed = allowedHosts.some(host => {
        // 支持通配符 *.example.com
        if (host.startsWith('*.')) {
          const domain = host.slice(2);
          return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
        }
        return parsed.hostname === host;
      });

      if (!isAllowed) {
        return { valid: false, error: `Host ${parsed.hostname} is not in the allowed list` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * 安全地构建URL
 * @param baseURL 基础URL
 * @param path 路径
 * @returns 完整的URL
 */
export function buildSafeURL(baseURL: string, path: string): string {
  // 清理baseURL
  let cleanBase = baseURL.trim();

  // 移除尾部斜杠 - 使用简单循环代替正则，防止ReDoS
  while (cleanBase.endsWith('/')) {
    cleanBase = cleanBase.slice(0, -1);
  }

  // 确保路径以/开头
  const cleanPath = path.startsWith('/') ? path : '/' + path;

  return cleanBase + cleanPath;
}

/**
 * 验证并清理基础URL
 * @param baseURL 用户提供的baseURL
 * @param defaultURL 默认URL
 * @param allowedHosts 允许的域名列表
 * @returns 清理后的URL
 */
export function sanitizeBaseURL(
  baseURL: string | undefined,
  defaultURL: string,
  allowedHosts?: string[]
): string {
  if (!baseURL) {
    return defaultURL;
  }

  const validation = validateURL(baseURL, allowedHosts);

  if (!validation.valid) {
    logger.warn('Invalid baseURL provided, using default', {
      provided: baseURL,
      error: validation.error,
    });
    return defaultURL;
  }

  // 清理URL - 使用简单循环代替正则，防止ReDoS
  let cleaned = baseURL;
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}
