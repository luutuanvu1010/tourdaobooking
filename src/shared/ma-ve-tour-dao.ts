// Luật THUẦN mã vé Tour Đảo (ADR-0175 Đ1.6): `TD1.` + đúng 26 ký tự base32 RFC 4648 (`A-Z2-7`, bỏ đệm) của 16 byte ngẫu nhiên.
// Trình duyệt người tạo sinh mã (gọi với `crypto.getRandomValues`); máy chủ chỉ kiểm dạng. Mã là bí mật như `ticket_code`: không vào nhật ký, URL, phản hồi ghi, câu lỗi.
// Không I/O, không import module. Test cạnh tệp: ma-ve-tour-dao.test.ts.

export const DANG_MA_VE_TD = /^TD1\.[A-Z2-7]{26}$/;
const BANG_CHU = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SO_BYTE = 16;

/** `ngauNhien(16)` phải trả 16 byte ngẫu nhiên mật mã (ở trình duyệt: `(n) => crypto.getRandomValues(new Uint8Array(n))`). */
export function taoMaVeTourDao(ngauNhien: (n: number) => Uint8Array): string {
  const b = ngauNhien(SO_BYTE);
  if (b.length !== SO_BYTE) throw new Error("taoMaVeTourDao: cần đúng 16 byte ngẫu nhiên");
  let ra = "";
  let dem = 0;
  let bit = 0;
  for (const x of b) {
    dem = (dem << 8) | x;
    bit += 8;
    while (bit >= 5) {
      ra += BANG_CHU[(dem >>> (bit - 5)) & 31];
      bit -= 5;
    }
    dem &= (1 << bit) - 1;
  }
  if (bit > 0) ra += BANG_CHU[(dem << (5 - bit)) & 31];
  return `TD1.${ra}`;
}
