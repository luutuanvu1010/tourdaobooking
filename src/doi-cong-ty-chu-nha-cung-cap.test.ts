// Việc 15 (kế hoạch 16 việc, mục 6 điểm 6): đổi công ty chủ (ADR-0024 6.4, ADR-0043) làm công ty CŨ bị coi là nhà cung cấp?
// Bài tái hiện ở MỨC TIỀN, trên khung thử với route thật: e2e chung không được đổi công ty chủ (N17 — không đổi lại được trong ngày, đầu tests/e2e/company.mjs).
// Đổi công ty chủ đi đúng đường của người dùng: Bán hàng lập hồ sơ tổ chức đủ thông tin + Hotline, Toàn quyền gán vai «Công ty chủ» (khuôn `toChucDu`
// ở src/modules/parties/cong-ty-chu.test.ts). Không ai làm bước «đóng dòng Mọi dịch vụ cũ, mở dòng mới» (bẫy 64 CHANGE-GUIDE) — đúng tình huống người dùng quên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { CAU_DOC_CHIA_PHAN } from "../scripts/cau-doc-chia-phan-nha-cung-cap.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `95959595-9595-4959-8959-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function dung(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('ZNC1', 'Tour thử', 'perPax', 500000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  return w;
}
/** Đơn khách lẻ nháp (SQL), một dịch vụ danh mục 2 × 500.000, ngày đi hôm nay. Chưa xác nhận. */
function donNhap(w: W): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 0, 1000000, 1000000, NULL, ?, ?)`).run(id, `TD-NCC-${seq}`, SALES, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZNC1', 'Tour thử', 'perPax', 2, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZNC1', 'adult', 'Người lớn', 2, 500000, 500000, 1000000)`)
    .run(`${s}-i`, id, s);
  return id;
}
async function xacNhan(w: W, id: string) {
  const r = await w.xacNhanDon(id, SALES);
  assert.equal(r.status, 200, r.text);
}
/** Đổi công ty chủ qua route thật; trả id hồ sơ công ty chủ mới. */
async function doiCongTyChu(w: W): Promise<string> {
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Pháp nhân Mới", legalName: "CÔNG TY PHÁP NHÂN MỚI", taxCode: "0312345678", address: "2 Đường Thử" } });
  assert.equal(r.status, 201, r.text);
  const moi = String(r.json.party.id);
  assert.equal((await w.call("POST", `/api/parties/${moi}/contacts`, { as: SALES, body: { kind: "PHONE", value: "0901 234 567", label: "Hotline", isPrimary: true } })).status, 201);
  r = await w.call("POST", `/api/parties/${moi}/roles`, { as: SA, body: { roleTypeCode: "OWNER_COMPANY" } });
  assert.equal(r.status, 201, r.text);
  assert.equal(String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id), moi, "công ty chủ đã đổi");
  return moi;
}
const bienNhan = async (w: W, id: string) => {
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  return r.json.receipt;
};

test("đổi công ty chủ, chưa ai đụng dòng «Mọi dịch vụ»: biên nhận vẫn MỘT phần của công ty chủ (hiện tại), không bảo khách «thanh toán tại quầy» công ty cũ — đơn xác nhận trước và sau khi đổi", async () => {
  const w = dung();
  const cu = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  const truoc = donNhap(w);
  await xacNhan(w, truoc); // chụp khi công ty cũ còn là công ty chủ
  const sau = donNhap(w);
  await doiCongTyChu(w);
  await xacNhan(w, sau); // chụp SAU khi đổi: dòng gieo `prc-st-goc-all` vẫn trỏ công ty cũ
  assert.equal(String(w.q("SELECT seller_party_id AS s FROM ord_service_terms t JOIN order_service x ON x.id = t.order_service_id WHERE x.order_id = ?", sau)[0].s), cu,
    "bản chụp mới chép người bán của dòng gieo = công ty cũ (thiết kế đặc tả §13: phải đóng dòng cũ, mở dòng mới)");
  for (const [ten, id] of [["xác nhận trước khi đổi", truoc], ["xác nhận sau khi đổi", sau]] as const) {
    const r = await bienNhan(w, id);
    assert.equal(r.phan.length, 1, `${ten}: ${JSON.stringify(r.phan)}`);
    assert.deepEqual([r.phan[0].nguoiBan, r.phan[0].vaiTourDao, r.phan[0].traTaiQuay, r.phan[0].tong], [r.company.name, "nguoi_ban", false, 1_000_000],
      `${ten}: phần Tour Đảo, không phải «thanh toán tại quầy» công ty cũ — ${JSON.stringify(r.phan)}`);
  }
});

test("việc 15 B1 + B2: sau khi đổi công ty chủ, dòng gieo cũ báo NGUNG_VA_THAY; ngừng tới D ⇒ cùng lô mở dòng «Mọi dịch vụ» của công ty chủ mới từ D+1, hai dòng nhật ký; đơn xác nhận sau đó chụp dòng mới; dòng mới thì không ngừng được (409)", async () => {
  const w = dung();
  const cu = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  const moi = await doiCongTyChu(w);
  let ds = await w.call("GET", "/api/pricing/cung-ung", { as: KT });
  assert.deepEqual(ds.json.dong.map((d: { id: string; cachNgung: string; nguoiBan: { partyId: string; laCongTy: boolean } }) => [d.id, d.cachNgung, d.nguoiBan.partyId, d.nguoiBan.laCongTy]),
    [["prc-st-goc-all", "NGUNG_VA_THAY", cu, true]], "dòng gieo còn ghi công ty cũ; vẫn là phần của chính công ty (không có nhà cung cấp mua lại)");
  const homQua = new Date(Date.now() + 7 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
  const r = await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: KT, body: { denNgay: homQua } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.dong.denNgay, r.json.dong.cachNgung], [homQua, "KHONG_NGUNG"]);
  const dongMoi = w.q("SELECT id, scope, seller_party_id AS s, supplier_party_id AS sp, cost_rate_bp AS bp, valid_from_date AS tu, valid_to_date AS den FROM prc_supply_term WHERE id <> 'prc-st-goc-all'");
  assert.equal(dongMoi.length, 1);
  assert.deepEqual([dongMoi[0].scope, dongMoi[0].s, dongMoi[0].sp, dongMoi[0].bp, dongMoi[0].tu, dongMoi[0].den], ["ALL", moi, null, null, vnHomNay(), null], "không khe, không chồng");
  assert.deepEqual(w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'prc_supply_term_%' ORDER BY rowid").map((x: { action: string; detail: string }) => [x.action, x.detail]),
    [["prc_supply_term_closed", `mọi dịch vụ · đến ${homQua}`], ["prc_supply_term_added", `mọi dịch vụ · nhà cung cấp Tour Đảo · từ ${vnHomNay()} (thay dòng của công ty chủ cũ)`]]);
  const id = donNhap(w);
  await xacNhan(w, id);
  assert.deepEqual(Object.values(w.q("SELECT t.supply_status AS st, t.supply_term_id AS term, t.seller_party_id AS s FROM ord_service_terms t JOIN order_service x ON x.id = t.order_service_id WHERE x.order_id = ?", id)[0]),
    ["SET", dongMoi[0].id, moi], "đơn mới không thiếu nhà cung cấp, chụp dòng của công ty chủ mới");
  ds = await w.call("GET", "/api/pricing/cung-ung", { as: KT });
  assert.equal(ds.json.dong.find((d: { id: string }) => d.id === dongMoi[0].id).cachNgung, "KHONG_NGUNG");
  const lai = await w.call("POST", `/api/pricing/cung-ung/${dongMoi[0].id}/dong`, { as: KT, body: { denNgay: "2099-12-31" } });
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "moi_dich_vu_bat_buoc");
});

test("câu đọc cho chủ (scripts/cau-doc-chia-phan-nha-cung-cap.mjs): chưa đổi công ty chủ ⇒ ca_1 = ca_2 = 0 dù có đơn của nhà cung cấp; đổi công ty chủ ⇒ đếm đúng hai bản chụp lệch (ca_1)", async () => {
  const w = dung();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('ZNC2', 'Vé nhà cung cấp', 'perPax', 500000, NULL, NULL, NULL, 2, 1, '${AT}', '${AT}')`);
  assert.equal((await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "ZNC2", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-01-01" } })).status, 201);
  const dem = () => Object.values(w.q(CAU_DOC_CHIA_PHAN)[0]).map(Number);
  assert.deepEqual(dem(), [1, 1, 0, 0], "D1 mới: một dòng vai công ty chủ, không bản chụp");
  const a = donNhap(w);
  await xacNhan(w, a);
  const b = donNhap(w);
  w.sqlite.prepare("UPDATE order_service SET catalog_code = 'ZNC2', name = 'Vé nhà cung cấp' WHERE order_id = ?").run(b);
  w.sqlite.prepare("UPDATE order_item SET catalog_code = 'ZNC2' WHERE order_id = ?").run(b);
  await xacNhan(w, b);
  assert.equal(String(w.q("SELECT supplier_party_id AS s FROM ord_service_terms t JOIN order_service x ON x.id = t.order_service_id WHERE x.order_id = ?", b)[0].s), "pty-ncc");
  assert.deepEqual(dem(), [1, 1, 0, 0], "chưa đổi công ty chủ: đơn Tour Đảo và đơn nhà cung cấp đều không lệch");
  const c = donNhap(w);
  await doiCongTyChu(w);
  await xacNhan(w, c);
  assert.deepEqual(dem(), [2, 1, 2, 0], "đổi công ty chủ: bản chụp của đơn a (trước) và c (sau) lệch — luật cũ coi công ty cũ là quầy");
});
