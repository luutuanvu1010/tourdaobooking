// Thí nghiệm chỉ-đọc trên CSDL SQLite trong bộ nhớ (bộ khung tests/audit/harness.mjs). Không mạng, không đụng D1.
// Chạy 2 lần: (1) mặc định = mã trên main; (2) AUDIT_ROOT=<bản sao> trong đó FIELD có order.view = any (điều ADR-0017 đòi).
import { world, seedStaff } from "../../../../tests/audit/harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // SALES
const B = "22222222-2222-4222-8222-222222222222"; // SALES khác
const ADM = "33333333-3333-4333-8333-333333333333"; // ADMIN
const F = "44444444-4444-4444-8444-444444444444"; // FIELD
const w = world();
seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
seedStaff(w.sqlite, { id: B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
seedStaff(w.sqlite, { id: F, phone: "0900000004", name: "Hướng dẫn", perms: ["FIELD"] });
// 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không nhận dịch vụ nhập tay MỚI (400) → đơn thử dùng dịch vụ danh mục
// GIẢ ZA1 (cùng số tiền 2 × 500.000 với dịch vụ nhập tay cũ; cùng cách tests/audit/doi-tac.test.mjs). Kết quả các ca H* không phụ thuộc loại dịch vụ.
w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
const inDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra = {}) => ({
  customerName: "Khách Một", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  depositAmount: 200000, depositMethod: "cash", ...extra,
});
const label = () => w.q("SELECT label FROM v_stf_staff_label WHERE id = ?", ADM)[0].label;
const out = (k, v) => console.log(`${k}: ${v}`);

out("MÔI TRƯỜNG", process.env.AUDIT_ROOT ? "bản sao — FIELD có order.view = any" : "main — mã hiện tại");

// H2 — SALES thêm số điện thoại vào hồ sơ của quản trị viên
const c = await w.call("POST", `/api/parties/pty-${ADM}/contacts`, { as: B, body: { kind: "PHONE", value: "0911222333", label: "Zalo", isPrimary: true } });
out("H2 SALES thêm SĐT vào hồ sơ ADMIN", `${c.status}${c.status === 200 ? " — đã thêm" : " " + c.text.slice(0, 80)}`);

// H3 — FIELD (HDV) vào các route Hồ sơ
const g = await w.call("GET", `/api/parties/pty-${ADM}`, { as: F });
out("H3a FIELD xem hồ sơ ADMIN", g.status);
if (g.status === 200) {
  const r = await w.call("PUT", `/api/parties/pty-${ADM}`, { as: F, body: { familyName: null, middleName: null, givenName: "HDV Mạo Danh", active: true, expectedUpdatedAt: g.json.party.updatedAt } });
  out("H3b FIELD đổi tên ADMIN", `${r.status} — nhãn tài khoản ADMIN nay là "${label()}"`);
  const c2 = await w.call("POST", `/api/parties/pty-${ADM}/contacts`, { as: F, body: { kind: "PHONE", value: "0933444555", label: "công việc", isPrimary: true } });
  out("H3c FIELD thêm SĐT vào hồ sơ ADMIN", c2.status);
} else out("H3b/H3c", "không tới được (bị chặn ở cổng)");

// H7 — SALES B ngưng hồ sơ KHÁCH mà đồng nghiệp A đang dùng làm người đặt → A sửa đơn nháp của mình được không?
const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody({ newBooker: { fullName: "Trần Khách", phone: "0912345678" } }) })).json.order;
const pid = w.q("SELECT booker_party_id p FROM orders WHERE id = ?", o.id)[0].p;
const pk = (await w.call("GET", `/api/parties/${pid}`, { as: B })).json.party;
const off = await w.call("PUT", `/api/parties/${pid}`, { as: B, body: { familyName: null, middleName: null, givenName: pk.givenName ?? "Khách", active: false, expectedUpdatedAt: pk.updatedAt } });
const edit = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { ...orderBody(), bookerPartyId: pid, expectedUpdatedAt: o.updatedAt } });
out("H7 B ngưng hồ sơ khách", off.status);
out("H7 A sửa đơn nháp của mình sau đó", `${edit.status}${edit.status !== 200 ? " " + edit.text.slice(0, 90) : ""}`);
out("H7 nhật ký ghi gì khi B ngưng hồ sơ", JSON.stringify(w.q("SELECT action, detail FROM audit_log WHERE target_id = ? ORDER BY rowid DESC LIMIT 1", pid)[0]));
