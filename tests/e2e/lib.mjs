// Dùng chung cho các kịch bản e2e. Chạy qua `npm run test:e2e` (tests/e2e/run.mjs dựng D1 tạm + wrangler dev riêng).
// Chạy lẻ một kịch bản: đặt E2E_BASE_URL (server đang chạy) và E2E_PERSIST_TO (thư mục D1 local của server đó).
import { execFileSync } from "node:child_process";

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

/** Chạy SQL thẳng vào D1 local của server đang test (chỉ để giả lập Sheet đổi dữ liệu). */
export function sql(q) {
  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--command", q];
  if (PERSIST) args.push("--persist-to", PERSIST);
  return execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

export const randomPhone = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
