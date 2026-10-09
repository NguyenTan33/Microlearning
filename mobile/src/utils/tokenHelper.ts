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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) {
    normalized += '=';
  }

  let bc = 0;
  let bs = 0;
  let idx = 0;

  while (idx < normalized.length) {
    const char = normalized.charAt(idx++);
    const charIndex = chars.indexOf(char);
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }

  try {
    return decodeURIComponent(
      output
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return output;
  }
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
