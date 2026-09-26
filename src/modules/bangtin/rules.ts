// Luật thuần của module bangtin (ADR-0022 — Bảng tin: thông báo tức thì qua WebSocket). Không I/O, không import module
// nào khác, không `env.DB`/SQL: đây là module hạng KHONG_DB (chủ duyệt 2026-09-25, `src/architecture.test.ts`).
// Lớp Durable Object (`tram.ts`) và route bắt tay (`index.ts`) là việc của lượt giao sau (Task 4b).

/** Mốc hết hạn (mili-giây epoch) của một kết nối bắt đầu lúc `nay` (mili-giây epoch), sống `hanGiay` giây (KN-1). */
export function hetHan(nay: number, hanGiay: number): number {
  return nay + hanGiay * 1000;
}

/** Trong `danhSach`, các phần tử đã tới hoặc quá mốc hết hạn tại thời điểm `nay` — cần bị trạm đóng (mã 4001). */
export function ketNoiQuaHan<T extends { hetHan: number }>(danhSach: readonly T[], nay: number): T[] {
  return danhSach.filter((x) => x.hetHan <= nay);
}

/**
 * Đọc hạn sống (giây) từ biến môi trường `BANG_TIN_HAN_GIAY` (KN-1: chỉ để e2e rút ngắn, production không đặt).
 * Mặc định 900 khi vắng hoặc không phải số nguyên dương; giới hạn về [5, 3600] khi hợp lệ nhưng ngoài khoảng.
 */
export function docHanGiay(env: { BANG_TIN_HAN_GIAY?: string }): number {
  const raw = env.BANG_TIN_HAN_GIAY;
  if (raw === undefined) return 900;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return 900;
  if (n < 5) return 5;
  if (n > 3600) return 3600;
  return n;
}

/**
 * Kiểm Origin cùng site cho bắt tay WebSocket (BT-1): `true` chỉ khi trình duyệt gửi header `Origin` VÀ nó khớp đúng
 * origin của URL đang xử lý. Không dựa vào `sec-fetch-site` — WebSocket của trình duyệt luôn gửi `Origin` nên không
 * cần suy đoán qua một header có thể vắng.
 */
export function kiemOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === url.origin;
}
