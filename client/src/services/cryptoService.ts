/**
 * Tính mã băm SHA-256 của dữ liệu nhị phân (ArrayBuffer) sử dụng Web Crypto API có sẵn trong trình duyệt.
 * Kết quả trả về là chuỗi Hex 64 ký tự viết thường, tương thích 100% với hàm SHA256 của .NET 8 Backend.
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Trình duyệt không hỗ trợ Web Crypto API để kiểm tra tính toàn vẹn file.');
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex.toLowerCase();
}
