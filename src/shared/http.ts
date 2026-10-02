// Tiện ích HTTP dùng chung cho mọi module. Route/khung xử lý ở ./router.ts.

/** id sinh bởi crypto.randomUUID() (đơn, nhân viên). */
export const UUID_RE = /^[0-9a-f-]{36}$/;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Phản hồi CSS (route DUY NHẤT hiện có: GET /api/giao-dien.css, ADR-0087). `no-cache` = trình duyệt được giữ nhưng phải hỏi lại (ETag → 304). */
export function css(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache", ...headers } });
}

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

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
