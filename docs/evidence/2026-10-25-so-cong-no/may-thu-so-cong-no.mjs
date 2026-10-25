// Máy thử TẠM (chỉ 127.0.0.1, dữ liệu giả trên SQLite của khung thử): phục vụ public/ + chuyển /api/* vào ứng dụng thật với tài khoản Kế toán giả.
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { world, seedStaff } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/so-cong-no-kiem-718026/tests/audit/harness.mjs";
const R = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/so-cong-no-kiem-718026";
const KT = "44444444-4444-4444-8444-444444444444", SUPER = "33333333-3333-4333-8333-333333333333", HDV = "22222222-2222-4222-8222-222222222222", PT = "66666666-6666-4666-8666-666666666666", SALES = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-01T00:00:00.000Z";
const vn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const w = world();
for (const [id, phone, name, perms] of [[SALES,"0900000001","An Bán",["SALES"]],[HDV,"0900000002","Nam HDV",["FIELD"]],[SUPER,"0900000003","Chủ",["SUPER_ADMIN"]],[KT,"0900000005","Lan Kế Toán",["ACCOUNTING"]],[PT,"0900000008","Đại Lý A",["PARTNER"]]]) seedStaff(w.sqlite, { id, phone, name, perms });
w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r1', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run("pty-" + PT, AT, AT);
await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
let seq = 0;
async function don(owner, booker, gia) {
  const id = "98989898-9898-4989-8989-" + String(++seq).padStart(12, "0");
  w.sqlite.prepare("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, 0, ?, ?, ?, ?, ?)").run(id, "TD-10" + String(seq).padStart(2, "0"), owner, gia, gia, gia, booker, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Tour đảo', 'perPax', 1, ?)").run(id + "-s", id, vn());
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)").run(id + "-i", id, id + "-s", gia, gia, gia);
  await w.call("POST", "/api/orders/" + id + "/status", { as: SUPER, body: { status: "confirmed" } });
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)").run(id + "-a", id, "pty-" + HDV, AT, AT, AT);
  return id;
}
const thu = (as, id, so, nguoiThu) => w.call("POST", "/api/orders/" + id + "/payments", { as, body: { soTien: so, hinhThuc: "CASH", nguoiThu } });
const giao = (id) => w.call("POST", "/api/orders/" + id + "/delivered", { as: HDV, body: {} });
const a = await don(PT, "pty-" + PT, 5_000_000); await thu(PT, a, 3_000_000, "toi"); await thu(HDV, a, 2_000_000, "toi"); await giao(a);
const b = await don(PT, "pty-" + PT, 1_200_000); await thu(HDV, b, 1_200_000, "toi"); await giao(b);
const c = await don(PT, "pty-" + PT, 7_900_000); await thu(HDV, c, 7_900_000, "toi"); await giao(c);
const d = await don(SALES, null, 1_250_000_000); await thu(SALES, d, 1_250_000_000, "toi");
const e = await don(PT, "pty-" + PT, 450_000); await thu(PT, e, 450_000, "toi");
await w.call("POST", "/api/orders/" + e + "/status", { as: SUPER, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
// Thêm nhiều bên (tên dài) bằng hồ sơ + lần thu Kế toán ghi thẳng
for (let i = 1; i <= 8; i++) {
  const p = "pty-thu-" + i;
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(p, i === 1 ? "Công ty TNHH Du lịch Biển Xanh Nha Trang Khánh Hoà" : "Đại lý thử số " + i, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run("r-" + p, p, AT, AT);
  const o = await don(SALES, p, 300_000 * i); await thu(KT, o, 100_000 * i, { partyId: p });
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    const chunks = []; for await (const ch of req) chunks.push(ch);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
    const r = await w.call(req.method, u.pathname + u.search, { as: process.env.AS || KT, body });
    res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/json" }); res.end(Buffer.from(r.bytes)); return;
  }
  let f = join(R, "public", u.pathname === "/" ? "home.html" : u.pathname);
  if (!extname(f)) f += ".html";
  if (!existsSync(f)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(8899, "127.0.0.1", () => console.log("MAY THU READY http://127.0.0.1:8899/so-cong-no"));
