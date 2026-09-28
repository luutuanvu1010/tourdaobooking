// Luật thuần của module bangtin (ADR-0022 — Bảng tin: thông báo tức thì qua WebSocket). Không I/O, không import module
// nào khác, không `env.DB`/SQL: đây là module hạng KHONG_DB (chủ duyệt 2026-09-25, `src/architecture.test.ts`).
// Lớp Durable Object (`tram.ts`) chỉ là vỏ gọi API của Cloudflare; mọi QUYẾT ĐỊNH của nó (đóng/gửi/bỏ qua, báo thức kế) nằm ở
// `keHoachTram` dưới đây để kiểm được bằng `node --test` (tram.ts không nạp được ngoài Worker).

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

/** Một kết nối như trạm thấy lúc xét: nhãn gắn lúc nhận, mốc hết hạn (0 nếu mất gắn kèm → coi như quá hạn), còn MỞ không (`readyState` OPEN). */
export interface KetNoiXet {
  nhan: readonly string[];
  hetHan: number;
  mo: boolean;
}

/** Chỉ số (trong mảng đầu vào) các kết nối cần đóng mã 4001 / cần gửi tin; `baoThucKe` = mốc báo thức kế tiếp, null nếu không còn ai. */
export interface KeHoachTram {
  dong: number[];
  gui: number[];
  baoThucKe: number | null;
}

/**
 * Trạm quyết định gì cho từng kết nối (KN-1, NT-2). Chỉ xét kết nối đang MỞ — `getWebSockets()` có thể trả cả kết nối đang đóng (tài liệu
 * Cloudflare `api/state`), những kết nối đó không đóng lại, không gửi, không làm mốc báo thức. Quá hạn (đúng mốc = quá hạn) → đóng, KHÔNG gửi.
 * Còn hạn và có ít nhất một nhãn chung với sự kiện → gửi; mỗi kết nối nhiều nhất MỘT lần vì xét theo chỉ số kết nối, không gom theo từng nhãn
 * (tài liệu không hứa `getWebSockets(tag)` trả cùng một đối tượng qua các lần gọi). `nhanSuKien` null = lượt báo thức: chỉ đóng quá hạn.
 * `baoThucKe` = mốc hết hạn sớm nhất của các kết nối mở còn hạn.
 */
export function keHoachTram(ketNoi: readonly KetNoiXet[], nhanSuKien: readonly string[] | null, nay: number): KeHoachTram {
  const mo = ketNoi.map((k, i) => ({ i, k, hetHan: k.hetHan })).filter((x) => x.k.mo);
  const quaHan = new Set(ketNoiQuaHan(mo, nay).map((x) => x.i));
  const nhanCanGui = new Set(nhanSuKien ?? []);
  const dong: number[] = [];
  const gui: number[] = [];
  let baoThucKe: number | null = null;
  for (const { i, k } of mo) {
    if (quaHan.has(i)) {
      dong.push(i);
      continue;
    }
    if (baoThucKe === null || k.hetHan < baoThucKe) baoThucKe = k.hetHan;
    if (k.nhan.some((n) => nhanCanGui.has(n))) gui.push(i);
  }
  return { dong, gui, baoThucKe };
}

/** Khoảng cách giữa hai lượt gửi lô gõ cửa (Web Push, ADR-0036) khi hàng đợi còn lô. */
export const GIAN_CACH_LO_MS = 1000;

/**
 * Mốc báo thức kế của trạm — MỘT báo thức cho hai việc: `keKetNoi` (hạn sớm nhất của kết nối còn mở, null nếu không còn) và lô gõ cửa còn chờ
 * (`conLo` → lượt kế sau `GIAN_CACH_LO_MS`). Lấy mốc sớm hơn; không việc nào → null (không đặt báo thức).
 */
export function mocBaoThuc(keKetNoi: number | null, conLo: boolean, now: number): number | null {
  const lo = conLo ? now + GIAN_CACH_LO_MS : null;
  if (keKetNoi === null) return lo;
  return lo === null ? keKetNoi : Math.min(keKetNoi, lo);
}
