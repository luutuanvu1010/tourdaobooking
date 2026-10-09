// Luật THUẦN "Chỉ đường" (ADR-0105, accepted 2026-10-08 — lượt duyệt 8b câu 1 Q-1 b, câu 2 Q-2 a; phán quyết G12, G13, G18). Dùng chung máy chủ ↔ màn tài xế
// (`web/cuoc-chuyen.ts`). Không I/O, không đọc `navigator`; import nội bộ src/shared kèm đuôi .ts. Bài cạnh tệp: chi-duong.test.ts; bài tĩnh: src/chi-duong-tinh.test.ts.
// - ĐÂY LÀ CHỖ DUY NHẤT trong repo viết hai địa chỉ gốc bản đồ (Google Maps URLs, Apple unified Maps URLs). Không chỗ nào khác tự dựng liên kết bản đồ.
// - Tham số mang dữ liệu duy nhất là `destination` (một chuỗi đích). KHÔNG tham số điểm xuất phát (`origin`, `source`, `saddr`) hay điểm giữa — vị trí điện
//   thoại là việc giữa máy tài xế và Google / Apple, ngoài Nền tảng. Không khoá dịch vụ, không gọi từ máy chủ, không nhúng bản đồ.
// - KHÔNG cắt chuỗi: địa chỉ cắt dở dẫn sai đường. Liên kết Google quá 2 048 ký tự → không nút nào; hai nút CÙNG có hoặc CÙNG không.
// - Chuỗi đích (mục 3): điểm danh mục → địa chỉ nếu có, không thì tên; chữ tự do → ĐÚNG tên nơi tài xế đang thấy (đã che). Kiểu vào không có trường khoá nơi
//   (`place_key`, `khoaNoi*`), nên hàm không thể nhận khoá nơi.

const GOC_GOOGLE = "https://www.google.com/maps/dir/?api=1&destination=";
const GOC_APPLE = "https://maps.apple.com/directions?destination=";
/** Giới hạn độ dài liên kết Google Maps URLs (tài liệu Google; RANG_BUOC_NGOAI.md G2). Apple không nêu giới hạn — dùng chung ngưỡng để hai nút cùng có / cùng không. */
export const GIOI_HAN_GOOGLE = 2048;

/** Hai liên kết chỉ đường từ CÙNG một chuỗi đích. Chuỗi rỗng / toàn khoảng trắng, hoặc liên kết Google dài quá giới hạn → `null` (không nút nào). */
export function lienKetChiDuong(chuoiDich: string): { google: string; apple: string } | null {
  const s = chuoiDich.trim();
  if (!s) return null;
  // encodeURIComponent: dấu cách → %20, "+" → %2B, "&" "#" "/" "?" đều mã hoá (encodeURI / URLSearchParams làm đổi điểm đến).
  const d = encodeURIComponent(s);
  const google = `${GOC_GOOGLE}${d}&travelmode=driving`;
  if (google.length > GIOI_HAN_GOOGLE) return null;
  return { google, apple: `${GOC_APPLE}${d}&mode=driving` };
}

/**
 * Máy Apple (phán quyết G13): iPhone, iPad, iPod, Mac — cả ba loại máy có sẵn Apple Maps; iPadOS có lúc tự báo là Mac (`Macintosh`) nên không tách được iPad khỏi
 * Mac. Nút Apple chỉ hiện trên máy Apple; hoàn tác = bỏ điều kiện này. Màn hình truyền `navigator.userAgent` vào — hàm không tự đọc.
 */
export const laMayApple = (ua: string): boolean => /iPhone|iPad|iPod|Macintosh/.test(ua);

/** Chuỗi đích của một điểm (ADR-0105 mục 3). Kiểu vào KHÔNG có khoá nơi. */
export function chuoiDichChiDuong(d: { laDanhMuc: boolean; diaChi: string | null; tenNoi: string }): string {
  return (d.laDanhMuc && d.diaChi?.trim()) || d.tenNoi;
}

/** Nhãn hai nút — chuỗi nguyên (bài A2 của hướng dẫn tìm `[[Google Maps]]`, `[[Apple Maps]]` trong mã giao diện). */
export const NHAN_BAN_DO = { google: "Google Maps", apple: "Apple Maps" } as const;

export interface NutChiDuong {
  banDo: "google" | "apple";
  nhan: string;
  href: string;
}
type TrangThaiChuyen = "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
type TrangThaiDiem = "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";

/**
 * Điểm nào có nút, nút nào (kế hoạch NT-8, NT-9; tự áp A — G18): có chuỗi đích (DTO chỉ gửi trong ngày chạy) VÀ chuyến kế hoạch / đang chạy VÀ điểm chưa xong
 * (`PENDING` / `ARRIVED`). Liên kết là điều hướng, không phải lệnh, nên không cần chuyến `RUNNING`; chuyến đã kết thúc trong hôm nay thì hết nút. Google mọi máy,
 * Apple chỉ máy Apple, theo thứ tự Google → Apple.
 */
export function nutChiDuongCuaDiem(v: { trangThaiChuyen: TrangThaiChuyen; trangThaiDiem: TrangThaiDiem; chuoiDich: string | undefined; ua: string }): NutChiDuong[] {
  if (v.chuoiDich === undefined) return [];
  if (v.trangThaiChuyen !== "PLANNED" && v.trangThaiChuyen !== "RUNNING") return [];
  if (v.trangThaiDiem !== "PENDING" && v.trangThaiDiem !== "ARRIVED") return [];
  const lk = lienKetChiDuong(v.chuoiDich);
  if (!lk) return [];
  const nut: NutChiDuong[] = [{ banDo: "google", nhan: NHAN_BAN_DO.google, href: lk.google }];
  if (laMayApple(v.ua)) nut.push({ banDo: "apple", nhan: NHAN_BAN_DO.apple, href: lk.apple });
  return nut;
}

/**
 * Giữ chuỗi đích khi đọc lại GET sau lệnh tiến độ HỎNG (tự áp B — phản hồi lệnh không kèm khoá này): chép từ lần GET trước theo id điểm, CHỈ khi phản hồi lệnh
 * vẫn nói trong ngày chạy. Cũ `null` → trả nguyên; điểm mới đã có khoá → giữ của mới. Chỉ bộ nhớ trang (khuôn `giuTenKhach`).
 */
export function giuChiDuong<T extends { trongNgayChay: boolean; diem: readonly { id: string; diaChiChiDuong?: string }[] }>(
  moi: T,
  cu: { diem: readonly { id: string; diaChiChiDuong?: string }[] } | null,
): T {
  if (!cu || !moi.trongNgayChay) return moi;
  const truoc = new Map(cu.diem.flatMap((d) => (d.diaChiChiDuong !== undefined ? [[d.id, d.diaChiChiDuong] as const] : [])));
  return { ...moi, diem: moi.diem.map((d) => (d.diaChiChiDuong !== undefined || !truoc.has(d.id) ? d : { ...d, diaChiChiDuong: truoc.get(d.id)! })) };
}
