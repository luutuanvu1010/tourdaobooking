// Tiện ích HTTP dùng chung cho mọi module. Route/khung xử lý ở ./router.ts.

/** id sinh bởi crypto.randomUUID() (đơn, nhân viên). */
export const UUID_RE = /^[0-9a-f-]{36}$/;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Phản hồi CSS (route DUY NHẤT hiện có: GET /giao-dien.css và đường cũ GET /api/giao-dien.css, ADR-0087/ADR-0102). `no-cache` = trình duyệt được giữ nhưng phải hỏi lại (ETag → 304). */
export function css(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache", ...headers } });
}

/**
 * ĐỊA CHỈ KẾT QUẢ (ADR-0094 A-10): gắn header `Location` = đường dẫn TRANG nội bộ CHỈ CHỨA ID (`/trang` hoặc `/trang?id=<id>`) vào phản hồi của route tạo
 * (201). Lớp chống ghi trùng lưu nó làm `ket_qua`; gửi lặp cùng vé thì giao diện mở thẳng trang này. Không đặt tên, SĐT, chữ người dùng vào đường dẫn.
 * Lệnh ghi lên một đơn (lần thu, hoàn…) trỏ trang đơn (`trangDon`).
 */
export function kemLocation(res: Response, duong: string): Response {
  const h = new Headers(res.headers);
  h.set("location", duong);
  return new Response(res.body, { status: res.status, headers: h });
}
export const trangDon = (orderId: string): string => `/order?id=${orderId}`;

export function error(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Tham số số nguyên của query string, kẹp trong [min, max]; thiếu/sai → fallback. */
export function intParam(v: string | null, fallback: number, min: number, max: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/** Thoát ký tự đặc biệt của LIKE (dùng kèm `ESCAPE '\'`). */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** D1 từ chối mẫu LIKE/GLOB dài hơn 50 BYTE UTF-8 ("LIKE or GLOB pattern too complex" ⇒ route 500). Mỗi chữ tiếng Việt có dấu 2–3 byte nên rất dễ chạm. */
export const LIKE_TOI_DA_BYTE = 50;

const byteUtf8 = (c: string): number => {
  const cp = c.codePointAt(0) ?? 0;
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; // nửa cặp thay thế (U+D800–DFFF) cũng 3 byte: TextEncoder đổi nó thành U+FFFD
};

/**
 * Mẫu `%…%` dựng từ chữ người dùng gõ, KHÔNG BAO GIỜ quá `LIKE_TOI_DA_BYTE` byte (tính cả hai dấu `%` và các dấu `\` thoát). Chữ dài hơn thì cắt ở CUỐI: mẫu
 * chỉ còn là một đoạn ĐẦU của chữ tìm, nên khớp mọi dòng mà mẫu đầy đủ khớp — kết quả chỉ rộng hơn một chút, không bao giờ mất dòng cần tìm. Đi từng ký tự
 * (điểm mã) và cộng cả dấu thoát của nó, nên không xé đôi ký tự UTF-8, cặp thay thế UTF-16 hay cặp thoát `\%`. Dùng cho mọi mẫu LIKE dựng từ chữ người gõ.
 */
export function mauLikeChua(s: string): string {
  let chu = "";
  let byte = 2; // hai dấu %
  for (const c of s) {
    const t = escapeLike(c);
    byte += t === c ? byteUtf8(c) : 2;
    if (byte > LIKE_TOI_DA_BYTE) break;
    chu += t;
  }
  return `%${chu}%`;
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
