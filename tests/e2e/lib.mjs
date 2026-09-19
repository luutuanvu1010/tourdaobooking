// Dùng chung cho các kịch bản e2e. Chạy qua `npm run test:e2e` (tests/e2e/run.mjs dựng D1 tạm + wrangler dev riêng).
// Chạy lẻ một kịch bản: đặt E2E_BASE_URL (server đang chạy) và E2E_PERSIST_TO (thư mục D1 local của server đó).
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8787";
const PERSIST = process.env.E2E_PERSIST_TO;

/** Tài khoản test cố định — run.mjs nạp chúng vào D1 tạm. Chỉ có ý nghĩa ở local. */
export const ACCOUNTS = {
  salesA: { name: "NV Bán A (test)", phone: "0900000002", pin: "246810", role: "sales" },
  salesB: { name: "NV Bán B (test)", phone: "0900000003", pin: "135790", role: "sales" },
  admin: { name: "QTV Test", phone: "0900000004", pin: "112233", role: "admin" },
};

let ipn = 0;
/** IP giả khác nhau cho từng request để bộ đếm chống dò theo IP không chặn nhầm kịch bản. */
export const freshIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${(++ipn % 250) + 1}`;

/** Gọi API như trình duyệt cùng trang (có Origin + JSON). Trả status, body JSON, cookie phiên mới (nếu có), headers. */
export async function call(cookie, method, path, body, ip = freshIp()) {
  const r = await fetch(BASE + path, {
    method,
    headers: { cookie: cookie ?? "", "content-type": "application/json", origin: BASE, "cf-connecting-ip": ip },
    body: body !== undefined && method !== "GET" ? JSON.stringify(body) : undefined,
  });
  const setCookie = r.headers.get("set-cookie");
  return { status: r.status, body: await r.json().catch(() => null), cookie: setCookie?.split(";")[0] ?? null, headers: r.headers };
}

export function login(phone, pin, ip) {
  return call(null, "POST", "/api/auth/login", { phone, pin }, ip);
}

/** Đăng nhập tài khoản test, trả cookie phiên. */
export async function session(account) {
  const r = await login(account.phone, account.pin);
  if (r.status !== 200) throw new Error(`Không đăng nhập được ${account.phone}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.cookie;
}

/**
 * Chạy SQL thẳng vào D1 local của server đang test (giả lập Sheet đổi dữ liệu, thử chốt chặn SQL). Lỗi SQL → reject kèm stderr.
 * Cố ý BẤT ĐỒNG BỘ: bản đồng bộ chặn event loop ~1–2 giây, server đóng kết nối keep-alive trong lúc đó mà fetch không hay
 * → request kế tiếp dùng lại socket đã đóng và gặp ECONNRESET (lỗi chập chờn đã gặp khi chạy e2e).
 */
export async function sql(q) {
  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--command", q];
  if (PERSIST) args.push("--persist-to", PERSIST);
  try {
    return (await execFileAsync("npx", args, { encoding: "utf8" })).stdout;
  } catch (e) {
    throw new Error(`${e.stderr ?? ""}${e.stdout ?? ""}`);
  }
}

/** Như sql() nhưng trả các dòng kết quả của câu SELECT (wrangler --json). */
export async function sqlRows(q) {
  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--json", "--command", q];
  if (PERSIST) args.push("--persist-to", PERSIST);
  try {
    const out = (await execFileAsync("npx", args, { encoding: "utf8" })).stdout;
    return JSON.parse(out)[0].results;
  } catch (e) {
    throw new Error(`${e.stderr ?? ""}${e.stdout ?? ""}`);
  }
}

export const randomPhone = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam, cách hôm nay `days` ngày — cùng quy ước với src/shared/vn-date.ts. */
export function vnDate(days = 0) {
  return new Date(Date.now() + 7 * 3600_000 + days * 86400_000).toISOString().slice(0, 10);
}

/** Dịch vụ nhập tay tối thiểu (đủ ngày khởi hành + 1 khách để xác nhận được). `extra` ghi đè/bổ sung trường. */
export const manualService = (items, extra = {}) => ({ kind: "manual", name: "Dịch vụ thử", pax: { adult: 1 }, departDate: vnDate(7), items, ...extra });

/** Đơn hợp lệ tối thiểu; `extra` ghi đè trường cấp đơn (vd `services`, `discount`). */
export const orderInput = (extra = {}) => ({
  customerName: "Nguyễn Văn A",
  customerPhone: "0901 234 567",
  services: [manualService([{ description: "Tour", quantity: 1, unitPrice: 100000 }])],
  ...extra,
});
