export interface UserTokenPayload {
  userId: string;
  phoneNumber?: string;
  fullName?: string;
  email?: string;
  roles: string[];
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  displayName: string;
}

/**
 * Giải mã an toàn chuỗi Base64 / Base64Url đa nền tảng (React Native & Web)
 */
function base64Decode(str: string): string {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < normalized.length; i++) {
    const val = chars.indexOf(normalized[i]);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  let output = '';
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c > 191 && c < 224) {
      const c2 = bytes[i++];
      output += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    } else if (c > 223 && c < 240) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      output += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
    } else if (c <= 127) {
      output += String.fromCharCode(c);
    } else {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      const code = (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
      output += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    }
  }
  return output;
}

/**
 * Trích xuất an toàn payload của JWT Access Token
 */
export function parseJwtToken(token: string): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const decoded = base64Decode(parts[1]);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (err) {
    console.warn('[tokenHelper] Lỗi giải mã JWT token:', err);
    return null;
  }
}

/**
 * Trích xuất toàn bộ vai trò (Roles) và thông tin người dùng từ JWT
 */
export function getCurrentUserFromToken(token: string): UserTokenPayload | null {
  const data = parseJwtToken(token);
  if (!data) return null;

  try {
    const rawRoles =
      data['role'] ||
      data['roles'] ||
      data['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      [];

    const roles: string[] = Array.isArray(rawRoles)
      ? (rawRoles as string[])
      : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];

    const userId = String(
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      data['nameid'] ||
      data['sub'] ||
      data['id'] ||
      ''
    );

    const phoneNumber = String(
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone'] ||
      data['phone'] ||
      data['phoneNumber'] ||
      ''
    );

    const rawFullName = String(
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      data['name'] ||
      data['fullName'] ||
      ''
    );

    const email = String(
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      data['email'] ||
      ''
    );

    const isAdmin = roles.some((r) => r.toLowerCase() === 'admin');
    const isTeacher = roles.some((r) => r.toLowerCase() === 'teacher') || isAdmin;
    const isStudent = roles.some((r) => r.toLowerCase() === 'student') || (!isAdmin && !isTeacher);

    let displayName = rawFullName;
    if (!displayName || displayName.startsWith('gg_') || displayName.startsWith('fb_')) {
      if (phoneNumber) {
        displayName = phoneNumber;
      } else if (email) {
        displayName = email.split('@')[0];
      } else {
        displayName = isAdmin ? 'Quản trị viên' : isTeacher ? 'Giáo viên' : 'Học viên';
      }
    }

    return {
      userId,
      phoneNumber,
      fullName: rawFullName || displayName,
      email: email || undefined,
      roles,
      isAdmin,
      isTeacher,
      isStudent,
      displayName,
    };
  } catch (err) {
    console.warn('[tokenHelper] Parse error:', err);
    return null;
  }
}

/**
 * Kiểm tra xem JWT Access Token đã hết hạn hay chưa (kèm dung sai thời gian skewSeconds)
 */
export function isTokenExpired(token: string | null, skewSeconds = 10): boolean {
  if (!token) return true;
  const data = parseJwtToken(token);
  if (!data || typeof data['exp'] !== 'number') return false;
  return (data['exp'] - skewSeconds) * 1000 < Date.now();
}