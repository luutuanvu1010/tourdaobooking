// Tiền xe thuê (ADR-0057 T1 + T2 — kế hoạch Đợt 4 Task 4, 9, 10) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) T1: Kế toán thêm tuyến, cỡ xe, giá thuê cho nhà xe; Bán hàng đọc TÊN tuyến 200, bảng giá 403; thêm giá chồng 409; tiền lưu INTEGER trên D1.
// Dữ liệu độc nhất theo lần chạy (tên theo Date.now()). Tên nhà xe là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows } from "./lib.mjs";

const ACC = await session(ACCOUNTS.accountant);
const SALES = await session(ACCOUNTS.salesA);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

// --- Nền: nhà xe đối tác đang hợp tác (hồ sơ tổ chức + vai CARRIER) ---
const nx = uuid();
await sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${nx}', 'ORGANIZATION', 'Nhà xe E2E ${duoi}', 1, '${AT}', '${AT}')`);
await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('${uuid()}', '${nx}', 'CARRIER', NULL, '2026-09-01', '${AT}', '${AT}')`);

// --- (1) T1 ---
r = await call(ACC, "POST", "/api/van-chuyen/tuyen", { ten: `Nha Trang – Cam Ranh E2E ${duoi}` });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tuyen = r.body.tuyen.find((t) => t.ten === `Nha Trang – Cam Ranh E2E ${duoi}`).ma;
r = await call(ACC, "POST", "/api/van-chuyen/bang-gia", { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe: null, soTien: 1200000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null });
assert.equal(r.status, 201, JSON.stringify(r.body));
const giaId = r.body.dong.id;
r = await call(ACC, "POST", "/api/van-chuyen/bang-gia", { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe: null, soTien: 1300000, tuNgay: "2026-12-01", denNgay: null, ghiChu: null, thayDongId: null });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "gia_chong");
r = await call(SALES, "GET", "/api/van-chuyen/tuyen");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.tuyen.some((t) => t.ma === tuyen));
assert.ok(!JSON.stringify(r.body).includes("1200000"), "Bán hàng đọc tên tuyến, không thấy giá");
assert.equal((await call(SALES, "GET", "/api/van-chuyen/bang-gia")).status, 403);
r = await call(ACC, "GET", `/api/van-chuyen/bang-gia?nha-xe=${nx}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.dong.some((d) => d.id === giaId && d.soTien === 1200000));
const [{ t }] = await sqlRows(`SELECT typeof(amount) AS t FROM vc_rental_rate WHERE id = '${giaId}'`);
assert.equal(t, "integer", "tiền là INTEGER trên D1");

console.log("tien-xe-thue: OK");
