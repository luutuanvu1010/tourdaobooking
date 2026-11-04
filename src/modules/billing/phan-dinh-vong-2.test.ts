// ADR-0116 vòng sửa sau kiểm độc lập: chặn đổi / huỷ khoản đã nộp, biên nhận biết giảm trừ, tách khoản phải nộp khỏi "đang giữ", tin bên chịu cũ, danh sách không rơi phiếu chờ, Thay trùng hai luật. Qua ROUTE THẬT trên khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const TT = "88888888-8888-4888-8888-888888888888";
const TX = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KT2 = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [QT, "0900000003", "Quản Trị", ["ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]], [TT, "0900000009", "Thực Tập", ["INTERN"]], [TX, "0900000010", "Tài Xế", ["DRIVER"]],
    [KT2, "0900000011", "Mai Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
const congTy = (w: W) => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const hdv = `pty-${HDV}`;
/** Đơn đã xác nhận `tong` đồng, ngày đi hôm nay, người phụ trách = HDV. */
function don(w: W, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, hdv, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown = "cong_ty", extra: Record<string, unknown> = {}) =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu, ...extra } });
const giao = (w: W, id: string) => w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
/** Đơn đã giao, khách đã trả đủ cho công ty. */
async function daGiao(w: W, tong = 1_000_000): Promise<string> {
  const id = don(w, tong);
  const t = await thu(w, KT, id, tong);
  assert.equal(t.status, 201, t.text);
  const g = await giao(w, id);
  assert.equal(g.status, 200, g.text);
  return id;
}
const deNghi = (w: W, orderId: string, soTien: number, as = KT) => w.call("POST", "/api/ledger/phan-dinh", { as, body: { orderId, soTien, lyDo: "Khách phản ánh HDV quên đón" } });
const quyet = (w: W, id: string, body: Record<string, unknown>, as = QT) => w.call("POST", `/api/ledger/phan-dinh/${id}/quyet`, { as, body: { lyDo: "Đã nghe hai bên, HDV nhận lỗi", ...body } });
const ghi = (w: W, id: string, body: Record<string, unknown> = {}, as = KT) => w.call("POST", `/api/ledger/phan-dinh/${id}/ghi`, { as, body });
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const tien = async (w: W, orderId: string) => (await w.call("GET", `/api/orders/${orderId}/payments`, { as: KT })).json;
const noCua = (w: W, orderId: string, ben: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ?2 THEN amount WHEN creditor_party_id = ?2 THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?1 AND kind_code = 'ATTRIBUTION'`, orderId, ben)[0].n);
const daThuRong = (w: W, orderId: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END), 0) AS n FROM bil_payment_receipt r WHERE r.order_id = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`, orderId)[0].n);
const phaiThuView = (w: W, orderId: string) => Number(w.q("SELECT phai_thu AS n FROM v_bil_phai_thu_hien_hanh WHERE order_id = ?", orderId)[0].n);
const I1 = (w: W, orderId: string) => assert.equal(daThuRong(w, orderId), phaiThuView(w, orderId), "I1: đã thu ròng = phải thu hiện hành");
/** Đề nghị + phân định, trả id phân định. */
async function deNghiVaQuyet(w: W, orderId: string, soTien: number, body: Record<string, unknown>): Promise<{ q: string; r: string }> {
  const q = await deNghi(w, orderId, soTien);
  assert.equal(q.status, 201, q.text);
  const r = await quyet(w, q.json.id, { soTien, ...body });
  assert.equal(r.status, 201, r.text);
  return { q: q.json.id, r: r.json.id };
}
const lanThuId = (w: W, orderId: string, soTien: number) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND amount = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY created_at", orderId, soTien)[0].id);

import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { buildConfirmation } from "../../shared/order-confirmation.ts";

const viPham = (w: W): string[] => (CHECKS as any[]).flatMap((c) => {
  if (!c.code.startsWith("R-BIL") || c.level !== "fail") return [];
  const r = w.sqlite.prepare(c.sql).get() as Record<string, unknown>;
  return Number(Object.values(r)[0]) > 0 ? [c.code] : [];
});
const pd = (id: string, duoi: string) => `/api/ledger/phan-dinh/${id}/${duoi}`;
const nop = (w: W, id: string, so: number, partyId = hdv) => w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId, phanBo: [{ orderId: id, soTien: so }] } });
const nopAs = (w: W, as: string, id: string, so: number, partyId: string) => w.call("POST", "/api/ledger/settlements", { as, body: { chieu: "nop", partyId, phanBo: [{ orderId: id, soTien: so }] } });
const gocCua = (w: W, id: string) => String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
const doi = (w: W, goc: string) => w.call("POST", pd(goc, "doi-ben-chiu"), { as: QT, body: { truongHop: "T10", lyDo: "Xét lại do bão, không ai lỗi" } });
const huy = (w: W, goc: string, so: number) => w.call("POST", pd(goc, "huy"), { as: KT, body: { soTien: so, lyDo: "Đòi được khách số tiền này", moi: [{ soTien: so, hinhThuc: "CASH", nguoiThu: "cong_ty" }], boQuaTrung: { ma: "lan_thu_tien_mat", lyDo: "Khách trả thêm lần thật" } } });
/** Đơn đã giao, khách trả đủ công ty; khoản T6 HDV chịu, đã trả khách. */
async function khoanHdv(w: W, so = 100_000): Promise<{ id: string; goc: string }> {
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, so, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  return { id, goc: gocCua(w, id) };
}
const daoLanNop = async (w: W, id: string) => {
  const dong = w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'SETTLEMENT' AND reverses_line_id IS NULL", id);
  for (const d of dong) {
    const r = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_dong", lineId: d.id, lyDo: "Công ty trả lại tiền đã nộp" } });
    assert.equal(r.status, 201, r.text);
  }
};

test("Nộp đủ rồi đổi bên chịu ⇒ 409 attribution_da_nop, câu bảo trả lại trước; không dòng mới; R-BIL sạch", async () => {
  const w = setup();
  const { id, goc } = await khoanHdv(w);
  assert.equal((await nop(w, id, 100_000)).status, 201);
  const r = await doi(w, goc);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "attribution_da_nop");
  assert.match(r.json.error.message, /báo Toàn quyền/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_attribution WHERE root_id = ?", goc), 0);
  assert.deepEqual(viPham(w), []);
});

test("Nộp đủ rồi huỷ khoản ⇒ 409; nộp MỘT PHẦN rồi đổi hoặc huỷ (kể cả huỷ một phần) ⇒ 409", async () => {
  const w = setup();
  const a = await khoanHdv(w);
  assert.equal((await nop(w, a.id, 100_000)).status, 201);
  const h1 = await huy(w, a.goc, 100_000);
  assert.equal(h1.status, 409, h1.text);
  assert.equal(h1.json.error.code, "attribution_da_nop");
  const b = await khoanHdv(w);
  assert.equal((await nop(w, b.id, 30_000)).status, 201);
  assert.equal((await doi(w, b.goc)).json.error.code, "attribution_da_nop");
  assert.equal((await huy(w, b.goc, 50_000)).json.error.code, "attribution_da_nop");
  assert.deepEqual(viPham(w), []);
});

test("Phân định đổi mở TRƯỚC, bên chịu nộp SAU: lúc ghi vẫn chặn", async () => {
  const w = setup();
  const { id, goc } = await khoanHdv(w);
  const d = await doi(w, goc);
  assert.equal(d.status, 201, d.text);
  assert.equal((await nop(w, id, 100_000)).status, 201);
  const g = await ghi(w, d.json.id, {});
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "attribution_da_nop");
  assert.deepEqual(viPham(w), []);
});

test("Đã trả lại (huỷ lần nộp) rồi đổi bên chịu được; rồi huỷ được; R-BIL sạch", async () => {
  const w = setup();
  const { id, goc } = await khoanHdv(w);
  assert.equal((await nop(w, id, 100_000)).status, 201);
  assert.equal((await doi(w, goc)).status, 409);
  await daoLanNop(w, id);
  const d = await doi(w, goc);
  assert.equal(d.status, 201, d.text);
  assert.equal((await ghi(w, d.json.id, {})).status, 201);
  assert.equal(noCua(w, id, hdv), 0);
  assert.deepEqual(viPham(w), []);
  const x = await khoanHdv(w);
  assert.equal((await nop(w, x.id, 100_000)).status, 201);
  await daoLanNop(w, x.id);
  const h2 = await huy(w, x.goc, 100_000);
  assert.equal(h2.status, 201, h2.text);
  assert.deepEqual(viPham(w), []);
});

test("Tiền nộp chỉ phủ tiền mặt đang giữ ⇒ chưa nộp khoản phân định, đổi được; nộp lấn sang khoản ⇒ chặn", async () => {
  const w = setup();
  const id = don(w, 1_000_000);
  assert.equal((await thu(w, HDV, id, 1_000_000, "toi")).status, 201);
  assert.equal((await giao(w, id)).status, 200);
  const { r } = await deNghiVaQuyet(w, id, 300_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH", nguoiTra: { partyId: hdv } })).status, 201);
  assert.equal((await nop(w, id, 700_000)).status, 201); // giữ 1.000.000 − đã trả khách 300.000
  const goc = gocCua(w, id);
  const d = await doi(w, goc);
  assert.equal(d.status, 201, d.text);
  const y = don(w, 1_000_000);
  assert.equal((await thu(w, HDV, y, 1_000_000, "toi")).status, 201);
  assert.equal((await giao(w, y)).status, 200);
  const { r: r2 } = await deNghiVaQuyet(w, y, 300_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal((await ghi(w, r2, { hinhThuc: "CASH", nguoiTra: { partyId: hdv } })).status, 201);
  assert.equal((await nop(w, y, 800_000)).status, 201);
  assert.equal((await doi(w, gocCua(w, y))).json.error.code, "attribution_da_nop");
  assert.deepEqual(viPham(w), []);
});

test("Bên chịu là công ty (T10): không có nộp, đổi hay huỷ không bị luật này chặn", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 100_000, { truongHop: "T10", benChiuPartyId: "cong_ty", coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  const h2 = await huy(w, gocCua(w, id), 100_000);
  assert.equal(h2.status, 201, h2.text);
});

test("Biên nhận đơn một người bán: tổng − giảm trừ − đã trả = còn lại; có dòng giải thích; không báo còn nợ phần đã giảm", async () => {
  const w = setup();
  await khoanHdv(w, 300_000);
  const id = String(w.q("SELECT order_id FROM bil_attribution LIMIT 1")[0].order_id);
  const bn = await w.call("GET", `/api/orders/${id}/receipt`, { as: KT });
  assert.equal(bn.status, 200, bn.text);
  const j = bn.json.receipt;
  assert.deepEqual([j.total, j.giamTru, j.daTra, j.conLai], [1_000_000, 300_000, 700_000, 0]);
  assert.equal(j.total - j.giamTru - j.daTra, j.conLai);
  assert.equal(j.phan.length, 1);
  assert.deepEqual([j.phan[0].tong, j.phan[0].giamTru, j.phan[0].daTra, j.phan[0].conLai], [700_000, 300_000, 700_000, 0]);
  const tom = (buildConfirmation(j, "Nam") as any).blocks.find((b: any) => b.kind === "summary");
  const dong = tom.rows.map((x: any) => x.label);
  assert.ok(dong.some((l: string) => /sau khi giao/i.test(l)), JSON.stringify(dong));
  assert.doesNotMatch(JSON.stringify(j), /phân định/i, "biên nhận gửi khách không nói chuyện nội bộ");
});

test("Sổ của tôi: khoản phân định tách khỏi đang giữ; nộp rồi không thành «công ty nợ»", async () => {
  const w = setup();
  const { id } = await khoanHdv(w, 100_000);
  const a = (await w.call("GET", "/api/ledger/mine", { as: HDV })).json;
  assert.equal(a.dangGiu, 0);
  assert.equal(a.khoanPhanDinh, 100_000);
  assert.ok(a.dong.every((d: { loai: string; soDu: number }) => typeof d.soDu === "number"));
  assert.equal((await nop(w, id, 40_000)).status, 201);
  const b = (await w.call("GET", "/api/ledger/mine", { as: HDV })).json;
  assert.deepEqual([b.dangGiu, b.khoanPhanDinh], [0, 60_000]);
});

test("Sổ công nợ, chi tiết một bên và bảng khoá tháng: cột riêng cho khoản phân định; số dư sổ không đổi", async () => {
  const w = setup();
  const id = don(w, 1_000_000);
  assert.equal((await thu(w, HDV, id, 600_000, "toi")).status, 201);
  assert.equal((await thu(w, KT, id, 400_000)).status, 201);
  assert.equal((await giao(w, id)).status, 200);
  const { r } = await deNghiVaQuyet(w, id, 200_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  const so = (await w.call("GET", "/api/ledger", { as: KT })).json;
  const dong = so.soDu.find((x: { partyId: string }) => x.partyId === hdv);
  assert.deepEqual([dong.dangGiu, dong.khoanPhanDinh], [600_000, 200_000]);
  assert.equal(so.tongDangGiu, 600_000);
  assert.equal(so.tongPhanDinh, 200_000);
  const ben = (await w.call("GET", `/api/ledger/ben/${hdv}`, { as: KT })).json;
  assert.equal(ben.soDu, 800_000, "số dư sổ vẫn đủ hai phần");
  assert.equal(ben.dangGiu.tong, 600_000);
  assert.equal(ben.khoanPhanDinh.tong, 200_000);
  assert.equal(ben.lech, 0);
  // Bảng kiểm khoá tháng: đưa mọi ngày phát sinh về một tháng đã qua để tháng đó khoá được.
  for (const { name } of w.q("SELECT name FROM sqlite_master WHERE type = 'trigger' AND (tbl_name = 'bil_posting' OR tbl_name = 'bil_payment_receipt') AND sql LIKE '%BEFORE UPDATE%'")) w.sqlite.exec(`DROP TRIGGER "${name}"`);
  w.sqlite.exec("UPDATE bil_posting SET occurred_date = '2026-01-15'; UPDATE bil_payment_receipt SET occurred_date = '2026-01-15'");
  const ky = (await w.call("GET", "/api/ledger/ky", { as: KT })).json;
  assert.equal(ky.bangKiem.thang, "2026-01");
  const dk = ky.bangKiem.soDuCuoiThang.find((x: { ten: string }) => x.ten === dong.ten);
  assert.deepEqual([dk.soDu, dk.khoanPhanDinh], [600_000, 200_000]);
});

test("balancesAt của bảng khoá tháng: tính đến ngày trước khoản thì không có khoản phân định", async () => {
  const { phanDinhTheoBen } = await import("./repository.ts");
  const w = setup();
  await khoanHdv(w, 100_000);
  assert.deepEqual((await phanDinhTheoBen(w.env.DB, "9999-12-31")).map((x: { party_id: string; khoan: number }) => [x.party_id, x.khoan]), [[hdv, 100_000]]);
  assert.deepEqual(await phanDinhTheoBen(w.env.DB, "2000-01-01"), []);
});

test("Tin: bên chịu cũ nhận đúng câu đổi / câu huỷ, không nhận câu «phản hồi trong 3 ngày»; bên mới nhận câu khoản mới", async () => {
  const w = setup();
  const { goc } = await khoanHdv(w);
  const d = await w.call("POST", pd(goc, "doi-ben-chiu"), { as: QT, body: { truongHop: "T6", benChiuPartyId: `pty-${SALES}`, lyDo: "Xét lại, lỗi do người bán" } });
  assert.equal(d.status, 201, d.text);
  assert.equal((await ghi(w, d.json.id, {})).status, 201);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'attribution_reassigned' AND target_type = 'staff' AND target_id = ?", HDV), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'attribution_posted' AND target_type = 'staff' AND target_id = ?", SALES), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'attribution_posted' AND target_type = 'staff' AND target_id = ? AND detail LIKE '%đã đổi%'", HDV), 0);
  const x = await khoanHdv(w);
  assert.equal((await huy(w, x.goc, 50_000)).status, 201);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'attribution_reversed' AND target_type = 'staff' AND target_id = ?", HDV), 1);
  const { CAU_DIEU_CHINH } = await import("../../shared/thong-bao.ts");
  assert.match(CAU_DIEU_CHINH.attribution_reassigned.khongTen("TD-1"), /không còn chịu/);
  assert.match(CAU_DIEU_CHINH.attribution_reversed.khongTen("TD-1"), /huỷ hoặc giảm/);
  assert.doesNotMatch(CAU_DIEU_CHINH.attribution_reassigned.khongTen("TD-1"), /3 ngày/);
});

test("Danh sách: hơn 200 đơn mới hơn cũng không làm phiếu chờ cũ rơi khỏi danh sách và ô đếm", async () => {
  const w = setup();
  const id = await daGiao(w);
  const cu = await deNghi(w, id, 100_000);
  assert.equal(cu.status, 201);
  w.sqlite.exec("DROP TRIGGER bil_attribution_request_check; PRAGMA foreign_keys = OFF;");
  const ins = w.sqlite.prepare("INSERT INTO bil_attribution (id, order_id, step_code, amount, reason, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'REQUEST', 1000, 'Lý do đủ dài để qua', ?, ?, ?, ?)");
  for (let i = 0; i < 205; i++) ins.run(uuid(), uuid(), AT, KT, AT, KT);
  const r = (await w.call("GET", "/api/ledger/phan-dinh", { as: KT })).json;
  assert.ok(r.phieu.some((p: { id: string }) => p.id === cu.json.id), "phiếu chờ cũ còn trong danh sách");
  assert.equal(r.choPhanDinh, 206);
});

test("Lô Thay trùng cả tiền mặt lẫn mã: gửi một lý do thì vẫn hỏi lý do còn lại; gửi cả hai thì ghi được, không lặp mãi", async () => {
  const { gopBoQua, kiemTrung } = await import("../../shared/luat-trung.ts");
  const uv = [{ soTien: 1, ngay: "2026-11-02" }];
  const m1 = { ma: "lan_thu_tien_mat", lyDo: "Khách trả hai lần thật" } as const;
  const m2 = { ma: "ma_giao_dich_khac_don", lyDo: "Một lần chuyển trả hai đơn" } as const;
  const hai = gopBoQua(m1, m2);
  assert.equal(kiemTrung("lan_thu_tien_mat", { ungVien: uv, boQua: hai }).ok, true);
  assert.equal(kiemTrung("ma_giao_dich_khac_don", { ungVien: uv, boQua: hai }).ok, true);
  assert.equal(kiemTrung("ma_giao_dich_khac_don", { ungVien: uv, boQua: m1 }).ok, false);
  assert.deepEqual(gopBoQua(hai, { ma: "lan_thu_tien_mat", lyDo: "Lý do mới hơn nhiều" }), [m2, { ma: "lan_thu_tien_mat", lyDo: "Lý do mới hơn nhiều" }]);
});

test("Mục 3: T4 toàn bộ phải thu mà sổ đang ghi đã thu ⇒ chặn NGAY ở bước phân định (không để phiếu nằm chờ ghi mãi); câu nói xử lý ngoài Nền tảng; T4 một phần vẫn đi đường cũ", async () => {
  const w = setup();
  const id = await daGiao(w);
  const q = await deNghi(w, id, 1_000_000);
  const r = await quyet(w, q.json.id, { soTien: 1_000_000, truongHop: "T4", benChiuPartyId: `pty-${KT}`, coTienRa: false });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "attribution_i1");
  assert.match(r.json.error.message, /chưa trả đồng nào.*ngoài Nền tảng/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_attribution WHERE order_id = ? AND step_code = 'RULING'", id), 0);
  const y = await daGiao(w);
  const b = await deNghiVaQuyet(w, y, 300_000, { truongHop: "T4", benChiuPartyId: `pty-${KT}`, coTienRa: false });
  const g2 = await ghi(w, b.r, { thay: { cu: [lanThuId(w, y, 1_000_000)], moi: [{ soTien: 700_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách thật sự chỉ trả 700.000" } }, KT2);
  assert.equal(g2.status, 201, g2.text);
});

test("Mục 2: người giữ ledger.write đọc được ĐÚNG dòng «Vẫn ghi» kèm lý do ở lịch sử đơn, không dòng ẩn khác; Bán hàng, Đối tác không thấy", async () => {
  const w = setup();
  const id = await daGiao(w, 1_000_000);
  void id;
  const o = don(w, 2_000_000);
  assert.equal((await thu(w, KT, o, 500_000)).status, 201);
  assert.equal((await thu(w, KT, o, 500_000, "cong_ty", { boQuaTrung: { ma: "lan_thu_tien_mat", lyDo: "Khách trả hai lần thật" } })).status, 201);
  // Một dòng ẨN khác của cùng đơn: không ai ngoài danh sách được thấy.
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, detail, created_at) VALUES (?, ?, ?, 'ledger_settlement', 'dòng ẩn phải giấu', ?)").run(uuid(), o, KT, AT);
  const lichSu = async (as: string) => { const r = await w.call("GET", `/api/orders/${o}`, { as }); return r.status === 200 ? (r.json.history ?? []) as { action: string; detail: string | null; staffName: string }[] : []; };
  const kt = await lichSu(KT);
  const dong = kt.filter((e) => e.action === "ledger_duplicate_overridden");
  assert.equal(dong.length, 1);
  assert.match(dong[0]!.detail ?? "", /Khách trả hai lần thật/);
  assert.equal(dong[0]!.staffName, "", "không tên người làm");
  assert.equal(kt.some((e) => e.action === "ledger_settlement"), false, "không mở dòng ẩn khác");
  for (const as of [SALES, DT, QT]) assert.equal((await lichSu(as)).some((e) => e.action === "ledger_duplicate_overridden"), false, as);
});

test("Danh sách phiếu: đã nộp ⇒ ẩn nút đổi / huỷ, có số đã nộp, KHÔNG có đường trả lại trên màn này", async () => {
  const w = setup();
  const { id } = await khoanHdv(w);
  assert.equal((await nop(w, id, 40_000)).status, 201);
  const xem = async (as = KT) => (await w.call("GET", "/api/ledger/phan-dinh", { as })).json.phieu.find((p: { orderId: string }) => p.orderId === id);
  const a = await xem();
  assert.equal(a.ghi.daNop, 40_000);
  assert.equal("lanNop" in a.ghi, false);
  assert.equal(a.coTheHuy, false);
  assert.equal((await xem(QT)).coTheDoiBenChiu, false);
  const { readFileSync } = await import("node:fs");
  const trang = readFileSync(new URL("../../../web/phan-dinh.ts", import.meta.url), "utf8");
  assert.doesNotMatch(trang, /dao_dong|tra-lai|Trả lại/);
  assert.match((await doi(w, a.ghi.id)).json.error.message, /không đổi bên chịu hay huỷ khoản được trên Nền tảng.*báo Toàn quyền/i);
});

test("Tự ghi «đã nộp» khoản của chính mình ⇒ 409, không dòng mới; người khác ghi được; hai lớp", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 200_000, { truongHop: "T6", benChiuPartyId: `pty-${KT2}`, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  const tu = await nopAs(w, KT2, id, 200_000, `pty-${KT2}`);
  assert.equal(tu.status, 409, tu.text);
  assert.equal(tu.json.error.code, "attribution_tu_nop");
  assert.match(tu.json.error.message, /người khác ghi/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'SETTLEMENT'", id), 0);
  assert.equal((await nopAs(w, SA, id, 50_000, `pty-${KT2}`)).status, 201, "Toàn quyền ghi cho người khác");
  assert.equal((await nopAs(w, KT, id, 50_000, `pty-${KT2}`)).status, 201, "Kế toán khác ghi");
  // Kế toán đang giữ tiền, không có khoản phân định: vẫn tự ghi như cũ.
  const o = don(w, 300_000);
  assert.equal((await thu(w, KT2, o, 300_000, "toi")).status, 201);
  assert.equal((await nopAs(w, KT2, o, 300_000, `pty-${KT2}`)).status, 201, "không có khoản phân định ⇒ luật này không chặn");
});

test("T8, T9: công ty còn nợ giá vốn / hoa hồng của bên chịu ⇒ khoản vẫn hiện «phải nộp», không bị nuốt", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 200_000, { truongHop: "T9", benChiuPartyId: `pty-${KT2}`, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  const giao0 = String(w.q("SELECT id FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0].id);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  w.sqlite.prepare("INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, order_service_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 500000, 'HOA_HONG', ?, ?, ?, ?, ?, ?)").run(uuid(), giao0, ct, `pty-${KT2}`, id, `${id}-s`, AT, KT, AT, KT);
  const so = (await w.call("GET", "/api/ledger", { as: KT })).json.soDu.find((x: { partyId: string }) => x.partyId === `pty-${KT2}`);
  assert.deepEqual([so.dangGiu, so.khoanPhanDinh], [-500_000, 200_000]);
  const toi = (await w.call("GET", "/api/ledger/mine", { as: KT2 })).json;
  assert.deepEqual([toi.dangGiu, toi.khoanPhanDinh], [-500_000, 200_000]);
  const ben = (await w.call("GET", `/api/ledger/ben/pty-${KT2}`, { as: KT })).json;
  assert.deepEqual([ben.congTyNo.tong, ben.khoanPhanDinh.tong, ben.lech], [500_000, 200_000, 0]);
});

test("tachKhoanPhanDinh: chỉ tiền NỘP vượt tiền giữ mới trừ vào khoản; số tổng không đổi", async () => {
  const { tachKhoanPhanDinh: t } = await import("./rules.ts");
  assert.deepEqual(t({ giuHo: -40, nop: -40, khac: 0, khoan: 100 }), { dangGiu: 0, phaiNop: 60 });
  assert.deepEqual(t({ giuHo: 0, nop: 0, khac: -500, khoan: 200 }), { dangGiu: -500, phaiNop: 200 });
  assert.deepEqual(t({ giuHo: -30, nop: 0, khac: 0, khoan: 100 }), { dangGiu: -30, phaiNop: 100 }, "ứng tiền hoàn khách không phải nộp");
  assert.deepEqual(t({ giuHo: 50, nop: -10, khac: 0, khoan: 100 }), { dangGiu: 50, phaiNop: 100 });
});

test("ADR-0155 Đ1.5: phiếu phân định cờ benChiuKhongTaiKhoan — true khi bên chịu là hồ sơ chưa có tài khoản (công ty lữ hành, cộng tác viên…); false khi có tài khoản, khi là công ty, khi chưa phân định", async () => {
  const w = setup();
  const KHONG_TK = "dda00000-0000-4000-8000-0000000000e1";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Lữ hành Không Tài Khoản', 1, ?, ?)").run(KHONG_TK, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(KHONG_TK, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ktk', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(KHONG_TK, AT, AT);
  const cua = async (orderId: string) => (await w.call("GET", "/api/ledger/phan-dinh", { as: KT })).json.phieu.find((p: { orderId: string }) => p.orderId === orderId);
  // chưa phân định
  const id0 = await daGiao(w);
  const q0 = await deNghi(w, id0, 100_000);
  assert.equal(q0.status, 201, q0.text);
  assert.equal((await cua(id0)).benChiuKhongTaiKhoan, false, "chưa có bên chịu");
  // bên chịu chưa có tài khoản — đã phân định, chờ ghi
  const id1 = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id1, 100_000, { truongHop: "T6", benChiuPartyId: KHONG_TK, coTienRa: true });
  assert.equal((await cua(id1)).benChiuKhongTaiKhoan, true, "đã phân định, chờ ghi");
  // …và sau khi ghi sổ
  const g = await ghi(w, r, { hinhThuc: "CASH", nguoiTra: "cong_ty" });
  assert.equal(g.status, 201, g.text);
  assert.equal((await cua(id1)).benChiuKhongTaiKhoan, true, "đã ghi sổ");
  // bên chịu có tài khoản
  const id2 = await daGiao(w);
  await deNghiVaQuyet(w, id2, 100_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: false });
  assert.equal((await cua(id2)).benChiuKhongTaiKhoan, false, "bên chịu có tài khoản");
  // bên chịu là công ty
  const id3 = await daGiao(w);
  await deNghiVaQuyet(w, id3, 100_000, { truongHop: "T10", coTienRa: false });
  assert.equal((await cua(id3)).benChiuKhongTaiKhoan, false, "công ty chịu");
  // bên chịu có tài khoản nhưng đã NGƯNG: cũng không nhận được tin ⇒ true; bật lại ⇒ false
  const id4 = await daGiao(w);
  await deNghiVaQuyet(w, id4, 100_000, { truongHop: "T6", benChiuPartyId: `pty-${TT}`, coTienRa: false });
  assert.equal((await cua(id4)).benChiuKhongTaiKhoan, false, "tài khoản đang hoạt động");
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(TT);
  assert.equal((await cua(id4)).benChiuKhongTaiKhoan, true, "tài khoản đã ngưng ⇒ không nhận được tin");
  w.sqlite.prepare("UPDATE staff SET active = 1 WHERE id = ?").run(TT);
  assert.equal((await cua(id4)).benChiuKhongTaiKhoan, false, "bật lại");
});
