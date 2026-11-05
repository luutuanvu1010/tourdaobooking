// Ô «Có vé» (ADR-0174) qua ứng dụng THẬT: máy chỉ giữ vé và báo thiếu cho dịch vụ Có vé; dòng dịch vụ thắng dòng nhóm; ai được đặt; đơn đã đi không báo thiếu.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, NOW_GIA, PARTNER, SALES, SUP, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { canBangVeTheoSoKhach } from "./noi-orders.ts";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";

/** Mọi bài ở đây bắt đầu từ dịch vụ CHƯA KHAI (khung thử mặc định gieo Có vé cho ZA1 để các bài kho vé cũ không phải khai). */
const the = () => setup({ chuaKhaiCoVe: true });
const doi = (w: any, pham: string, ma: string, coVe: boolean, as = ADM) => w.call("POST", "/api/catalog/co-ve", { as, body: { pham, ma, coVe } });
async function nhapKho(w: any, soVe: number, ma = "CV", lech = 0) {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: `${ma}${i + 1}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } })).json.themDuoc, soVe);
  return w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} });
}
const nhomCua = async (w: any, id: string) => {
  const r = await w.call("GET", `/api/ve/don/${id}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  return r.json.dichVu.flatMap((d: { nhom: unknown[] }) => d.nhom) as { can: number; giu: number; thieu: number }[];
};
const giu = (w: any, id: string) => w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL", id)[0].n as number;
const ganNhom = (w: any, ma: string, nhom: string, seq: number) =>
  w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), ma, nhom, seq, AT, AT, AT);
const nhomThu = (w: any, ...ma: string[]) => { for (const m of ma) w.sqlite.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 99, 1, ?, ?)").run(m, `Nhóm ${m}`, AT, AT); };
const coCua = async (w: any, ma: string) => (await w.call("GET", "/api/catalog/co-ve", { as: ADM })).json.dichVu.find((d: { code: string }) => d.code === ma);

test("dichVuChuaKhai_khongBaoThieu: dịch vụ chưa khai là Không vé: không có dòng thiếu, gọi thẳng cấp vé không giữ vé", async () => {
  const tat = batDongHo();
  try {
    const w = the();
    const d = await don(w, { soNguoi: 2 });
    assert.deepEqual(await nhomCua(w, d.id), []);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.equal(giu(w, d.id), 0);
  } finally { tat(); }
});

test("coVe_baoThieuDung: Có vé mà kho rỗng hoặc thiếu thì vẫn báo đúng số", async () => {
  const tat = batDongHo();
  try {
    const w = the();
    assert.equal((await doi(w, "SERVICE", "ZA1", true)).status, 200);
    const d = await don(w, { soNguoi: 2 });
    assert.deepEqual((await nhomCua(w, d.id)).map((n) => [n.can, n.giu, n.thieu]), [[2, 0, 2]]);
    await nhapKho(w, 1);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.deepEqual((await nhomCua(w, d.id)).map((n) => [n.can, n.giu, n.thieu]), [[2, 1, 1]]);
  } finally { tat(); }
});

test("dongDichVuThangNhom: dòng riêng thắng nhóm cả hai chiều; dịch vụ không có dòng riêng đi theo nhóm hiện hành", async () => {
  const tat = batDongHo();
  try {
    const w = the();
    nhomThu(w, "NCV", "NKV");
    ganNhom(w, "ZA1", "NCV", 1);
    assert.equal((await doi(w, "GROUP", "NCV", true)).status, 200);
    assert.equal((await coCua(w, "ZA1")).coVe, true);
    assert.equal((await coCua(w, "ZA1")).nguon, "GROUP");
    const d = await don(w, { soNguoi: 2 });
    assert.equal((await nhomCua(w, d.id))[0]!.thieu, 2, "nhóm Có vé");
    // đổi nhóm: chưa có dòng riêng thì theo nhóm mới
    ganNhom(w, "ZA1", "NKV", 2);
    assert.equal((await coCua(w, "ZA1")).coVe, false, "nhóm mới chưa khai");
    assert.deepEqual(await nhomCua(w, d.id), []);
    assert.equal((await doi(w, "GROUP", "NKV", true)).status, 200);
    assert.equal((await nhomCua(w, d.id))[0]!.thieu, 2, "nhóm mới Có vé");
    // dòng riêng Không vé thắng nhóm Có vé
    assert.equal((await doi(w, "SERVICE", "ZA1", false)).status, 200);
    assert.equal((await coCua(w, "ZA1")).nguon, "SERVICE");
    assert.deepEqual(await nhomCua(w, d.id), []);
    // dòng riêng Có vé thắng nhóm Không vé
    assert.equal((await doi(w, "GROUP", "NKV", false)).status, 200);
    assert.equal((await doi(w, "SERVICE", "ZA1", true)).status, 200);
    assert.equal((await nhomCua(w, d.id))[0]!.thieu, 2);
  } finally { tat(); }
});

test("khongVe_coLo_khongGiuVe: Không vé mà có lô đang hoạt động: xác nhận đơn và cấp vé đều không giữ; xác nhận lô có báo", async () => {
  const tat = batDongHo();
  try {
    const w = the();
    const lo = await nhapKho(w, 3);
    assert.equal(lo.status, 200, lo.text);
    assert.equal(lo.json.dichVuKhongVe, true, "xác nhận lô phải báo dịch vụ đang Không vé");
    assert.equal(w.q("SELECT status FROM vdt_batch")[0].status, "ACTIVE", "không chặn nhập lô");
    const d = await don(w, { soNguoi: 2 });
    assert.equal(giu(w, d.id), 0);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.equal(giu(w, d.id), 0);
    // (a): bật ô thì đơn đã xác nhận chưa đi được báo thiếu và cấp được vé
    assert.equal((await doi(w, "SERVICE", "ZA1", true)).status, 200);
    assert.equal((await nhomCua(w, d.id))[0]!.thieu, 2);
    assert.equal((await w.call("POST", "/api/ve/cap", { as: SALES, body: { orderId: d.id } })).status, 200);
    assert.equal(giu(w, d.id), 2);
    const lo2 = await nhapKho(w, 1, "CW", 50);
    assert.equal(lo2.json.dichVuKhongVe, false);
  } finally { tat(); }
});

test("veDaGiuKhongBiThuLai: chuyển sang Không vé: vé đã giữ còn nguyên và vẫn hiện, không báo thiếu; giảm khách vẫn trả vé chưa lộ", async () => {
  const tat = batDongHo();
  try {
    const w = the();
    await doi(w, "SERVICE", "ZA1", true);
    await nhapKho(w, 1);
    const d = await don(w, { soNguoi: 2 });
    assert.equal(giu(w, d.id), 1);
    assert.equal((await doi(w, "SERVICE", "ZA1", false)).status, 200);
    assert.equal(giu(w, d.id), 1, "không thu lại");
    assert.deepEqual((await nhomCua(w, d.id)).map((n) => [n.giu, n.thieu]), [[1, 0]]);
    const serviceId = w.q("SELECT id FROM order_service WHERE order_id = ?", d.id)[0].id as string;
    const dv = { orderId: d.id, serviceId, catalogCode: "ZA1", ngayDi: "2027-03-11", coVe: false, pax: { adult: 0, child: 0, senior: 0, infant: 0 } };
    await canBangVeTheoSoKhach(w.env.DB, [dv], SALES, (() => w.env.DB.prepare("SELECT 1")) as any, "2027-03-11T00:00:00.000Z", "2027-03-11");
    assert.equal(giu(w, d.id), 0, "giảm khách vẫn trả vé dù ô đang Không vé");
    await canBangVeTheoSoKhach(w.env.DB, [{ ...dv, pax: { ...dv.pax, adult: 2 } }], SALES, (() => w.env.DB.prepare("SELECT 1")) as any, "2027-03-11T00:00:00.000Z", "2027-03-11");
    assert.equal(giu(w, d.id), 0, "Không vé thì không cấp thêm");
  } finally { tat(); }
});

test("donDaDi_khongBaoThieu: Có vé nhưng ngày đi đã qua thì không báo thiếu; đúng ngày đi vẫn báo", async () => {
  let tat = batDongHo();
  try {
    const w = the();
    await doi(w, "SERVICE", "ZA1", true);
    const d = await don(w, { soNguoi: 2 });
    assert.equal((await nhomCua(w, d.id))[0]!.thieu, 2, "đúng ngày đi");
    tat();
    tat = batDongHo(NOW_GIA + 3 * 86_400_000);
    assert.deepEqual(await nhomCua(w, d.id), []);
  } finally { tat(); }
});

test("quyen_chiQuanTriToanQuyen: Quản trị, Toàn quyền đặt được, có nhật ký; người khác 403; gửi đúng giá trị đang có không ghi", async () => {
  const w = the();
  for (const as of [SALES, ACC, PARTNER]) {
    assert.equal((await doi(w, "SERVICE", "ZA1", true, as)).status, 403);
    assert.equal((await w.call("GET", "/api/catalog/co-ve", { as })).status, 403);
  }
  const nk = () => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ticket_flag_changed'")[0].n as number;
  const bang = () => w.q("SELECT count(*) AS n FROM ctl_service_ticket_flag")[0].n as number;
  assert.equal(bang(), 0);
  assert.equal((await doi(w, "SERVICE", "ZA1", true, ADM)).status, 200);
  assert.deepEqual([bang(), nk()], [1, 1]);
  assert.equal((await doi(w, "SERVICE", "ZA1", true, SUP)).status, 200);
  assert.deepEqual([bang(), nk()], [1, 1], "cùng giá trị: không ghi");
  assert.equal((await doi(w, "SERVICE", "ZA1", false, SUP)).status, 200);
  assert.deepEqual([bang(), nk()], [2, 2]);
  assert.equal((await doi(w, "SERVICE", "KHONGCO", true)).status, 400);
  assert.equal((await doi(w, "GROUP", "KHONGCO", true)).status, 400);
  assert.equal((await doi(w, "LA", "ZA1", true)).status, 400);
});
