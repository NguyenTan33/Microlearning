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

export function getCurrentUser(): UserTokenPayload | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const data = JSON.parse(jsonPayload);
    const rawRoles =
      data['role'] ||
      data['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      [];
    const roles: string[] = Array.isArray(rawRoles) ? rawRoles : [rawRoles];

    const userId =
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      data.sub ||
      '';

    const phoneNumber =
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone'] ||
      data.phone ||
      '';

    const rawFullName =
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      data.name ||
      data.fullName ||
      '';

    const email =
      data['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      data.email ||
      '';

    const isAdmin = roles.some((r) => r.toLowerCase() === 'admin');
    const isTeacher = roles.some((r) => r.toLowerCase() === 'teacher');
    const isStudent = roles.some((r) => r.toLowerCase() === 'student') || (!isAdmin && !isTeacher);

    // Tính toán tên hiển thị sạch sẽ và thân thiện cho người dùng, loại bỏ mã thô OAuth gg_...
    const isRawOAuthId = (str: string) => str.startsWith('gg_') || str.startsWith('fb_');

    let displayName = '';
    if (rawFullName && !isRawOAuthId(rawFullName)) {
      displayName = rawFullName;
    } else if (email) {
      displayName = email.split('@')[0];
    } else if (phoneNumber && !isRawOAuthId(phoneNumber)) {
      displayName = phoneNumber;
    } else {
      displayName = isAdmin ? 'Quản trị viên' : isTeacher ? 'Giáo viên' : 'Học viên';
    }

    return {
      userId,
      phoneNumber,
      fullName: rawFullName,
      email,
      roles,
      isAdmin,
      isTeacher,
      isStudent,
      displayName,
    };
  } catch {
    return null;
  }
}
