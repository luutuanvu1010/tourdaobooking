// Bán hàng phụ trách (ADR-0142, Task 3): hàm đọc, câu lệnh chưa chạy và luật lô của `dispatch/ban-hang.ts` trên SQLite thật (schema từ mọi migration, qua khung
// tests/audit/harness.mjs). Hàm được gói bằng esbuild như han-muc-sql.test.ts; câu lệnh chạy trong db.batch() của D1 giả (BEGIN … COMMIT/ROLLBACK như D1 thật).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const HERE = new URL("./", import.meta.url).pathname;
type Mod = typeof import("./ban-hang.ts") & typeof import("./ban-hang-moi.ts") & typeof import("../../shared/ban-hang-phu-trach.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./ban-hang"; export * from "./ban-hang-moi"; export * from "../../shared/ban-hang-phu-trach";', resolveDir: HERE, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const M = await loadModule();

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const HDV = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const LAI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // Bán hàng + Đối tác
const NGUNG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // Bán hàng, đã ngưng
const pty = (id: string) => `pty-${id}`; // seedStaff đặt hồ sơ = pty-<id>

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000004", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000005", name: "Hướng dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000010", name: "Lai Đôi", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: NGUNG, phone: "0900000011", name: "Đã Nghỉ", perms: ["SALES"] });
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(NGUNG);
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
/** Đơn nháp do SALES lập (qua API thật). */
async function newDraft(w: any): Promise<string> {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }] },
  });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const xacNhanBangSql = (w: any, orderId: string) => w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(new Date().toISOString(), orderId);
/** Một dòng nhật ký của «lệnh đơn» (hành động nằm trong view v_aud_order_ban_hang). */
function ghiNhatKy(w: any, orderId: string, action = "confirmed"): string {
  const id = crypto.randomUUID();
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, ?, ?, ?, ?)").run(id, orderId, SALES, action, new Date().toISOString());
  return id;
}
const NOW = () => new Date().toISOString();
const HAN = "2099-01-01T00:00:00.000Z";
const moLoiMoi = (w: any, orderId: string, inviteeStaff: string) =>
  w.env.DB.batch([M.cauMoLoiMoi(w.env.DB, { orderId, inviteePartyId: pty(inviteeStaff), invitedBy: SALES, at: NOW(), hanIso: HAN, auditId: ghiNhatKy(w, orderId) })]);
const dongMo = (w: any, orderId: string) => w.q("SELECT * FROM dsp_sales_owner WHERE order_id = ? AND valid_to_at IS NULL", orderId);
const loiMoi = (w: any, orderId: string) => w.q("SELECT * FROM dsp_sales_invite WHERE order_id = ? ORDER BY created_at", orderId);

test("kiemBanHangMoi loại HDV thuần, Kế toán, tài khoản lai Bán hàng + Đối tác, tài khoản ngưng; nhận Bán hàng", async () => {
  const w = setup();
  for (const id of [HDV, KT, ADM, PARTNER, LAI, NGUNG, "99999999-9999-4999-8999-999999999999"]) {
    const r = await M.kiemBanHangMoi(w.env.DB, id);
    assert.equal(r.ok, false, `${id} không được mời`);
  }
  const ok = await M.kiemBanHangMoi(w.env.DB, SALES2);
  assert.deepEqual(ok, { ok: true, partyId: pty(SALES2), name: "Bình" });
});

test("danhSachBanHangMoi chỉ có staffId và name (không có khoá phone / email), đúng những người mời được", async () => {
  const w = setup();
  const ds = await M.danhSachBanHangMoi(w.env.DB);
  assert.deepEqual(ds.map((x) => x.staffId).sort(), [SALES, SALES2].sort());
  for (const x of ds) assert.deepEqual(Object.keys(x).sort(), ["name", "staffId"]);
  assert.ok(!JSON.stringify(ds).match(/phone|email|0900/));
});

test("hai lô đua cauMoBanHangNeuTrong: đúng một changes = 1, một dòng mở; câu khép của bên thua không ghi gì", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  await moLoiMoi(w, orderId, SALES2);
  const lo = (idO: string, partyStaff: string) => [
    M.cauMoBanHangNeuTrong(w.env.DB, { id: idO, orderId, partyId: pty(partyStaff), actorId: partyStaff, at: NOW() }),
    M.cauKhepLoiMoiSauNhan(w.env.DB, { orderId, outcome: partyStaff === SALES2 ? "NHAN" : "NGUOI_KHAC", at: NOW(), actorId: partyStaff, ownerRowId: idO }),
  ];
  const a = await w.env.DB.batch(lo("owner-a", SALES2));
  const b = await w.env.DB.batch(lo("owner-b", SALES));
  assert.equal(M.banHangThang(a, 0), true);
  assert.equal(M.banHangThang(a, 1), true);
  assert.equal(M.banHangThang(b, 0), false);
  assert.equal(M.banHangThang(b, 1), false, "bên thua không khép lời mời");
  assert.equal(dongMo(w, orderId).length, 1);
  assert.equal(dongMo(w, orderId)[0].id, "owner-a");
  const [inv] = loiMoi(w, orderId);
  assert.equal(inv.outcome, "NHAN");
  assert.equal(inv.closed_by, SALES2);
});

test("cauMoBanHangBatBuoc với auditId không có trong view ⇒ 0 dòng, không lỗi", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  const kq = await w.env.DB.batch([M.cauMoBanHangBatBuoc(w.env.DB, { id: "o1", orderId, partyId: pty(SALES), actorId: SALES, at: NOW(), auditId: "khong-co" })]);
  assert.equal(M.banHangThang(kq, 0), false);
  assert.equal(dongMo(w, orderId).length, 0);
  // nhật ký có thật nhưng hành động ngoài danh sách gác cũng không mở được
  const kq2 = await w.env.DB.batch([M.cauMoBanHangBatBuoc(w.env.DB, { id: "o2", orderId, partyId: pty(SALES), actorId: SALES, at: NOW(), auditId: ghiNhatKy(w, orderId, "updated") })]);
  assert.equal(M.banHangThang(kq2, 0), false);
});

test("cauMoBanHangBatBuoc khi ô đã có người ⇒ cả lô hỏng (db.batch ném lỗi), câu khác trong lô không còn hiệu lực, laVaChamOBanHang nhận ra", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  await w.env.DB.batch([M.cauMoBanHangNeuTrong(w.env.DB, { id: "co-san", orderId, partyId: pty(SALES2), actorId: SALES2, at: NOW() })]);
  await moLoiMoi(w, orderId, SALES);
  const auditId = ghiNhatKy(w, orderId);
  let loi: unknown = null;
  try {
    await w.env.DB.batch([
      M.cauKhepLoiMoiSauLenhDon(w.env.DB, { orderId, outcome: "NHAN", at: NOW(), actorId: SALES, auditId }),
      M.cauMoBanHangBatBuoc(w.env.DB, { id: "moi", orderId, partyId: pty(SALES), actorId: SALES, at: NOW(), auditId }),
    ]);
  } catch (e) { loi = e; }
  assert.ok(loi, "lô phải ném lỗi");
  assert.equal(M.laVaChamOBanHang(loi), true);
  assert.equal(loiMoi(w, orderId)[0].closed_at, null, "câu khép trong cùng lô không còn hiệu lực");
  assert.equal(dongMo(w, orderId)[0].id, "co-san");
});

test("cauKhepLoiMoiSauLenhDon với auditId không có thật ⇒ lời mời vẫn mở; có thật ⇒ khép đúng kết quả, closed_by = người thao tác", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  await moLoiMoi(w, orderId, SALES2);
  const kq = await w.env.DB.batch([M.cauKhepLoiMoiSauLenhDon(w.env.DB, { orderId, outcome: "HUY_DON", at: NOW(), actorId: ADM, auditId: "khong-co" })]);
  assert.equal(M.banHangThang(kq, 0), false);
  assert.equal(loiMoi(w, orderId)[0].closed_at, null);
  const that = await w.env.DB.batch([M.cauKhepLoiMoiSauLenhDon(w.env.DB, { orderId, outcome: "HUY_DON", at: NOW(), actorId: ADM, auditId: ghiNhatKy(w, orderId, "cancelled") })]);
  assert.equal(M.banHangThang(that, 0), true);
  assert.deepEqual([loiMoi(w, orderId)[0].outcome, loiMoi(w, orderId)[0].closed_by], ["HUY_DON", ADM]);
});

test("cauTuChoiLoiMoi chỉ khép lời mời của đúng người được mời", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  await moLoiMoi(w, orderId, SALES2);
  const sai = await w.env.DB.batch([M.cauTuChoiLoiMoi(w.env.DB, { orderId, inviteePartyId: pty(SALES), at: NOW(), actorId: SALES })]);
  assert.equal(M.banHangThang(sai, 0), false);
  const dung = await w.env.DB.batch([M.cauTuChoiLoiMoi(w.env.DB, { orderId, inviteePartyId: pty(SALES2), at: NOW(), actorId: SALES2 })]);
  assert.equal(M.banHangThang(dung, 0), true);
  assert.equal(loiMoi(w, orderId)[0].outcome, "TU_CHOI");
});

test("laBanHangPhuTrach: đơn nháp ⇒ false (dù có dòng mở); đơn đã xác nhận ⇒ đúng người true, người khác false", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  await w.env.DB.batch([M.cauMoBanHangBatBuoc(w.env.DB, { id: "o1", orderId, partyId: pty(SALES2), actorId: ADM, at: NOW(), auditId: ghiNhatKy(w, orderId) })]); // câu «nếu trống» không mở trên nháp, nên gieo qua câu bắt buộc
  assert.equal(await M.laBanHangPhuTrach(w.env.DB, SALES2, orderId), false, "đơn nháp");
  xacNhanBangSql(w, orderId);
  assert.equal(await M.laBanHangPhuTrach(w.env.DB, SALES2, orderId), true);
  assert.equal(await M.laBanHangPhuTrach(w.env.DB, SALES, orderId), false);
  const m = await M.banHangCuaDon(w.env.DB, [orderId, "khong-co"]);
  assert.deepEqual([...m.entries()], [[orderId, { staffId: SALES2, partyId: pty(SALES2), name: "Bình" }]]);
  assert.equal((await M.banHangCuaDon(w.env.DB, [])).size, 0);
});

test("cauDoiBanHang: ba câu; khép lời mời mở bằng NGUOI_KHAC; đổi người và gỡ đúng chỉ số", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  await moLoiMoi(w, orderId, SALES2);
  const lo1 = await w.env.DB.batch(M.cauDoiBanHang(w.env.DB, { orderId, partyIdCu: null, idMoi: "d1", partyIdMoi: pty(SALES), actorId: ADM, at: NOW() }));
  assert.deepEqual([0, 1, 2].map((i) => M.banHangThang(lo1, i)), [false, true, true]);
  assert.equal(loiMoi(w, orderId)[0].outcome, "NGUOI_KHAC");
  // đổi sang người khác: khép dòng cũ, mở dòng mới
  const lo2 = await w.env.DB.batch(M.cauDoiBanHang(w.env.DB, { orderId, partyIdCu: pty(SALES), idMoi: "d2", partyIdMoi: pty(SALES2), actorId: ADM, at: NOW() }));
  assert.deepEqual([0, 1].map((i) => M.banHangThang(lo2, i)), [true, true]);
  assert.equal(dongMo(w, orderId)[0].id, "d2");
  // khoá lạc quan: partyIdCu cũ (đã đổi) ⇒ câu khép 0 dòng, câu mở bị chặn, dòng d2 còn nguyên
  const lo3 = await w.env.DB.batch(M.cauDoiBanHang(w.env.DB, { orderId, partyIdCu: pty(SALES), idMoi: "d3", partyIdMoi: pty(ADM), actorId: ADM, at: NOW() }));
  assert.deepEqual([0, 1, 2].map((i) => M.banHangThang(lo3, i)), [false, false, false]);
  assert.equal(dongMo(w, orderId)[0].id, "d2");
  // gỡ: partyIdMoi null
  const lo4 = await w.env.DB.batch(M.cauDoiBanHang(w.env.DB, { orderId, partyIdCu: pty(SALES2), idMoi: "d4", partyIdMoi: null, actorId: ADM, at: NOW() }));
  assert.deepEqual([0, 1, 2].map((i) => M.banHangThang(lo4, i)), [true, false, false]);
  assert.equal(dongMo(w, orderId).length, 0);
});

test("loiMoiMoCua và khungGioHanhChinh đọc đúng view", async () => {
  const w = setup();
  const orderId = await newDraft(w);
  xacNhanBangSql(w, orderId);
  assert.equal(await M.loiMoiMoCua(w.env.DB, orderId), null);
  await moLoiMoi(w, orderId, SALES2);
  assert.deepEqual(await M.loiMoiMoCua(w.env.DB, orderId), { staffId: SALES2, name: "Bình", hanIso: HAN, xConHopLe: true });
  w.sqlite.prepare("UPDATE stf_permission SET valid_to_at = '2026-09-02T00:00:00.000Z' WHERE staff_id = ? AND permission_type_code = 'SALES'").run(SALES2);
  assert.equal((await M.loiMoiMoCua(w.env.DB, orderId))?.xConHopLe, false, "mất quyền Bán hàng ⇒ hết hợp lệ");
  const k = await M.khungGioHanhChinh(w.env.DB);
  assert.equal(k?.phutUuTien, 15);
  assert.equal(k?.tuPhut, 420);
  assert.equal(k?.denPhut, 1020);
  assert.match(k!.mocPhatHanh, /^\d{4}-\d\d-\d\dT/);
});
