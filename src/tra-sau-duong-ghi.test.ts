// Các đường làm TĂNG hoặc TRƯỢT nợ của đơn Trả sau (ADR-0168 Đ2 mục 5–6, Đ3 mục 3; kế hoạch 2026-11-05 Task 4): sửa số khách (văn phòng và hướng dẫn viên) chung MỘT cổng,
// đổi bên đặt, gộp hồ sơ, huỷ đơn khi vé đã mở (kể cả vé mở chen giữa lúc kiểm và lúc ghi), và bảng ĐƯỜNG GHI chạy thật (mỗi đường làm nợ đổi tăng phiên bản đúng 1).
// Cổng bắt buộc của `soanHuyDon`, `changeBooker`, `insertMoneyAdjustment` do kiểu mang nhãn ép (typecheck), không còn bài quét chữ. Khung thử thật (tests/audit/harness.mjs). Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, H, PARTNER, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { canhBaoVuotHanMuc } from "./shared/han-muc-tra-sau-hien-thi.ts";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801"; // bên đặt có hạn mức
const BEN = `pty-${DT}`;
const DT2 = "88888888-8888-4888-8888-888888888802"; // một hồ sơ khác để đổi bên đặt
const BEN2 = `pty-${DT2}`;
const T_ZB1 = 600_000; // 2 người lớn × 300.000

type W = ReturnType<typeof setup>;
function dung(tuyChon: Record<string, unknown> = {}): W {
  const w = setup(tuyChon);
  for (const [id, phone, ten] of [[DT, "0900000021", "Đối Tác Hưởng"], [DT2, "0900000022", "Đối Tác Khác"]] as const) {
    seedStaff(w.sqlite, { id, phone, name: ten, perms: ["PARTNER"] });
  }
  return w;
}
const hanMuc = (w: W, soTien: number, ben = BEN) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: ben, hanMuc: soTien, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
const phienBan = (w: W): number | null => w.q("SELECT version FROM bil_credit_guard WHERE party_id = ?", BEN)[0]?.version ?? null;
const no = async (w: W) => ((await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: SUP })).json.don as { no: number }[]).reduce((s, d) => s + d.no, 0);
/** Đơn Trả sau đã xác nhận (2 người lớn × 300.000 = 600.000) của BEN, do A lập. */
async function donTS(w: W, ben = BEN): Promise<{ id: string; updatedAt: string }> {
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: ben, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const x = await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: A })).json.order;
}
const thu = (w: W, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const svcId = (w: W, orderId: string): string => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });
const suaVP = (w: W, id: string, adult: number) => w.call("POST", `/api/orders/${id}/money-edit`, { as: A, body: { lyDo: "THEM_NGUOI", services: [{ id: svcId(w, id), pax: pax(adult) }] } });
const suaHDV = (w: W, id: string, adult: number) => w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: H, body: { reason: "Khách đổi số người", services: [{ id: svcId(w, id), pax: pax(adult) }] } });
const soDongDieuChinh = (w: W, id: string): number => w.q("SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = ?", id)[0].n;

// ---- Tiêu chí 9: sửa số khách (hai đường, MỘT cổng) ----
test("sửa số khách của văn phòng: tăng vượt hạn mức 409, tăng trong hạn mức được và tăng phiên bản, giảm hoặc y nguyên không gác", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  const v0 = phienBan(w);
  const vuot = await suaVP(w, d.id, 4); // 1.200.000
  assert.deepEqual([vuot.status, vuot.json.error.code], [409, "vuot_han_muc"], vuot.text);
  assert.match(vuot.json.error.message, /^Số tiền tăng thêm 600\.000 ₫ vượt hạn mức khả dụng của bên đặt là 400\.000 ₫/, "câu báo nói phần tăng và hạn mức khả dụng (Task 3; chữ «hạn mức khả dụng» chủ chọn 2026-11-06)");
  assert.equal(soDongDieuChinh(w, d.id), 0, "không để lại dòng điều chỉnh nào");
  assert.equal(phienBan(w), v0, "lô bị từ chối không tăng phiên bản");
  const duoc = await suaVP(w, d.id, 3); // 900.000 ≤ 1.000.000
  assert.equal(duoc.status, 200, duoc.text);
  assert.equal(phienBan(w), v0! + 1, "tăng tiền trong hạn mức thì tăng phiên bản");
  assert.equal(await no(w), 900_000);
  const giam = await suaVP(w, d.id, 1); // 300.000
  assert.equal(giam.status, 200, giam.text);
  assert.equal(phienBan(w), v0! + 1, "giảm tiền không cần gác phiên bản");
  assert.equal(await no(w), 300_000);
  const yNguyen = await suaVP(w, d.id, 1);
  assert.equal(yNguyen.status, 200, yNguyen.text);
  assert.equal(yNguyen.json.daGhi, false);
  assert.equal(phienBan(w), v0! + 1);
});

test("sửa số khách của hướng dẫn viên đi CHUNG cổng: vượt hạn mức 409, giảm được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  const v0 = phienBan(w);
  const vuot = await suaHDV(w, d.id, 4);
  assert.deepEqual([vuot.status, vuot.json.error.code], [409, "vuot_han_muc"], vuot.text);
  assert.equal(soDongDieuChinh(w, d.id), 0);
  assert.equal(phienBan(w), v0);
  const giam = await suaHDV(w, d.id, 1);
  assert.equal(giam.status, 200, giam.text);
  assert.equal(await no(w), 300_000);
});

test("hai lệnh cùng lúc: sửa tăng tiền chen với lệnh khác làm tăng nợ thì lệnh thua cả lô huỷ, đơn không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /order_money_adjustment/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN);
  });
  const r = await suaVP(w, d.id, 3);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "credit_version_stale");
  assert.equal(soDongDieuChinh(w, d.id), 0, "không dòng điều chỉnh nào");
  assert.equal(await no(w), T_ZB1, "tiền đơn y nguyên");
});

test("đơn Trả trước: sửa tăng số khách không chạm dòng phiên bản", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await suaVP(w, id, 4)).status, 200);
  assert.equal(phienBan(w), null);
});

// ---- Tiêu chí 10: đổi bên đặt, gộp hồ sơ ----
test("đổi bên đặt: đơn Trả sau đã xác nhận còn nợ 409; hết nợ thì đổi được; đơn nháp đổi thoải mái", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  const doi = (id: string, updatedAt: string) => w.call("PUT", `/api/orders/${id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN2, expectedUpdatedAt: updatedAt } });
  const r = await doi(d.id, d.updatedAt);
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_doi_ben_dat"], r.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN, "bên đặt không đổi");
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const moi = (await w.call("GET", `/api/orders/${d.id}`, { as: A })).json.order;
  const ok = await doi(d.id, moi.updatedAt);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN2);
  // đơn nháp Trả sau: chưa có nợ, đổi được
  const n = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(n.status, 201, n.text);
  assert.equal((await doi(n.json.order.id, n.json.order.updatedAt)).status, 200);
});

test("đổi bên đặt: có lệnh làm tăng nợ chen giữa lúc kiểm nợ và lúc ghi thì lô đổi thua (phiên bản của bên đặt CŨ), bên đặt không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201); // nợ 0 ⇒ phép đổi qua cổng
  const moi = (await w.call("GET", `/api/orders/${d.id}`, { as: A })).json.order;
  // Ngay trước lô đổi, một lệnh khác (vd đảo khoản thu) vừa làm tăng phiên bản của bên đặt cũ.
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /booker_party_id/.test(s.sql) && /UPDATE orders/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN);
  });
  const r = await w.call("PUT", `/api/orders/${d.id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN2, expectedUpdatedAt: moi.updatedAt } });
  assert.deepEqual([r.status, r.json.error.code], [409, "credit_version_stale"], r.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, BEN, "bên đặt không đổi");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'booker_changed'", d.id)[0].n, 0, "không nhật ký đổi nào");
});

test("gộp hồ sơ: hồ sơ phụ còn đơn Trả sau còn nợ thì xem trước báo chặn và lệnh gộp 409; hết nợ thì không chặn vì lý do này", async () => {
  const w = dung();
  const TEN = "Đại Lý Không Tài Khoản";
  const B = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Hồ Sơ Chính", phone: "0900000066", roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(B.status, 201, B.text);
  const bId = B.json.staff.partyId as string;
  const P = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912000222" }] } });
  assert.equal(P.status, 201, P.text);
  const aId = P.json.party.id as string;
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-gop', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(aId, AT, AT);
  assert.equal((await hanMuc(w, 1_000_000, aId)).status, 201);
  const d = await donTS(w, aId);
  // Hồ sơ phụ còn giữ vai đối tác thì đã bị chặn vì lý do khác (merge_source_account_role); kết thúc vai đó, đơn Trả sau vẫn còn nợ ⇒ phải còn một lý do chặn riêng.
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-06-01' WHERE id = 'r-gop'").run();
  const co = (r: { json: { chan: { code: string }[] } }) => r.json.chan.some((c) => c.code === "merge_credit_debt");
  const xem = await w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: bId } });
  assert.equal(xem.status, 200, xem.text);
  assert.ok(co(xem), JSON.stringify(xem.json.chan));
  const gop = await w.call("POST", `/api/parties/${aId}/merge`, { as: ADM, body: { intoPartyId: bId, xacNhan: TEN } });
  assert.equal(gop.status, 409, gop.text);
  assert.equal(gop.json.error.code, "merge_credit_debt");
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", d.id)[0].b, aId, "đơn không bị dời");
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const sau = await w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: bId } });
  assert.equal(sau.status, 200, sau.text);
  assert.ok(!co(sau), "hết nợ thì không còn chặn vì nợ");
});

// ---- Tiêu chí 11: huỷ đơn ----
const moVe = (w: W, orderId: string) => {
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES ('lo-ts', 'ZB1', 'ADULT', 'Vé thử', 'ACTIVE', ?, ?)").run(AT, AT);
  w.sqlite.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, stored_at, status, created_at, updated_at)
     VALUES ('ve-ts', 'lo-ts', 'BI.MAT.TS', '2026-01-01', '2099-12-31', 'k', 'image/png', 10, 'h', ?, 'AVAILABLE', ?, ?)`,
  ).run(AT, AT, AT);
  w.sqlite.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = 've-ts'").run();
  w.sqlite.prepare(
    `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, revealed_at, created_at, updated_at) VALUES ('pb-ts', 've-ts', ?, ?, 'ADULT', 1, ?, ?, ?, ?)`,
  ).run(orderId, svcId(w, orderId), AT, AT, AT, AT);
};
const huy = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });

test("huỷ đơn Trả sau còn nợ mà vé đã mở: /status 409; chưa mở vé thì huỷ được và nợ về 0; hết nợ thì huỷ được dù vé đã mở", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const mo = await donTS(w);
  moVe(w, mo.id);
  const r = await huy(w, mo.id);
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", mo.id)[0].status, "confirmed");
  const chua = await donTS(w);
  assert.equal(await no(w), 2 * T_ZB1);
  const h = await huy(w, chua.id);
  assert.equal(h.status, 200, h.text);
  assert.equal(await no(w), T_ZB1, "đơn huỷ chưa mở vé hết nợ");
  assert.equal((await thu(w, mo.id, T_ZB1)).status, 201);
  assert.equal((await huy(w, mo.id)).status, 200, "đã thu đủ thì huỷ được");
});

test("huỷ qua đường hướng dẫn viên (handler-cancel): còn nợ + vé đã mở 409; chưa mở vé thì huỷ được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const mo = await donTS(w);
  const chua = await donTS(w);
  for (const id of [mo.id, chua.id]) assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  moVe(w, mo.id);
  const r = await w.call("POST", `/api/orders/${mo.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.deepEqual([r.status, r.json.error.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", mo.id)[0].status, "confirmed");
  assert.equal((await w.call("POST", `/api/orders/${chua.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } })).status, 200);
});

// ---- Đảo và sửa khoản thu: KHÔNG bị chặn, nợ tăng đúng số, phiên bản tăng (chỉ khi đơn là Trả sau) ----
test("đảo khoản thu của đơn Trả sau: không bị chặn, nợ tăng đúng số, phiên bản tăng; đơn Trả trước không chạm dòng phiên bản", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  assert.equal(await no(w), 0);
  const v0 = phienBan(w)!;
  const rc = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", d.id)[0].id;
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "ghi nhầm số tiền khách đưa" } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal(await no(w), T_ZB1, "nợ tăng đúng số đã đảo");
  assert.equal(phienBan(w), v0 + 1, "đảo khoản thu tăng phiên bản");
  // đơn Trả trước: đảo không đụng dòng phiên bản
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await thu(w, r.json.order.id, T_ZB1)).status, 201);
  const rc2 = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", r.json.order.id)[0].id;
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_lan_thu", receiptId: rc2, lyDo: "ghi nhầm số tiền khách đưa" } })).status, 201);
  assert.equal(phienBan(w), v0 + 1, "đơn Trả trước không làm đổi phiên bản");
});

test("sửa (thay) khoản thu của đơn Trả sau: nợ tăng đúng số và phiên bản tăng", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  const v0 = phienBan(w)!;
  const rc = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", d.id)[0].id;
  const thay = await w.call("POST", "/api/ledger/receipt-replacements", {
    as: ACC, body: { orderId: d.id, cu: [rc], moi: [{ soTien: 400_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "khách đưa thiếu, sửa lại cho đúng" },
  });
  assert.equal(thay.status, 201, thay.text);
  assert.equal(await no(w), 200_000);
  assert.equal(phienBan(w), v0 + 1);
});

// ---- Kế hoạch 2026-11-05 Task 2 (nợ 2): vé mở CHEN GIỮA lúc kiểm và lúc huỷ — người bấm là văn phòng (không giữ quyền Đối tác) ----
const demBil = (w: W): string => JSON.stringify(["bil_payment_receipt", "bil_posting", "bil_debt_line", "bil_credit_guard"].map((t) => w.q(`SELECT count(*) AS n FROM ${t}`)[0].n));
const demNhatKy = (w: W, id: string): number => w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n;
const laLoHuy = (stmts: { sql: string }[]) => stmts.some((s) => /ord_cancel_reason/.test(s.sql));

test("Task 2: /status — văn phòng huỷ đơn Trả sau còn nợ, vé được mở đúng lúc giữa kiểm và ghi ⇒ 409 tra_sau_con_no_da_mo_ve; đơn còn confirmed, sổ và nhật ký không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donTS(w);
  const truoc = [demBil(w), demNhatKy(w, d.id)];
  w.chenTruocLo(laLoHuy, () => moVe(w, d.id));
  const r = await huy(w, d.id);
  assert.deepEqual([r.status, r.json.error?.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.match(r.json.error.message, /600\.000/, "câu nói số còn nợ");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
  assert.deepEqual([demBil(w), demNhatKy(w, d.id)], truoc, "không dòng sổ, không dòng nhật ký nào");
});

test("Task 2: handler-cancel — cùng ca chen giữa ⇒ 409 tra_sau_con_no_da_mo_ve; đơn còn confirmed, sổ và nhật ký không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  const truoc = [demBil(w), demNhatKy(w, d.id)];
  w.chenTruocLo(laLoHuy, () => moVe(w, d.id));
  const r = await w.call("POST", `/api/orders/${d.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.deepEqual([r.status, r.json.error?.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
  assert.deepEqual([demBil(w), demNhatKy(w, d.id)], truoc);
});

test("Task 2: huỷ lúc đã hết nợ cũng gác phiên bản — khoản thu bị đảo chen giữa (nợ lại có, vé đã mở) ⇒ 409 credit_version_stale, đơn không huỷ", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  moVe(w, d.id);
  w.chenTruocLo(laLoHuy, () => { w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN); });
  const r = await huy(w, d.id);
  assert.deepEqual([r.status, r.json.error?.code], [409, "credit_version_stale"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
});

test("Task 2: handler-cancel đơn Trả sau đã hết nợ thua khoá lạc quan (đơn vừa bị sửa) ⇒ 409, không sự kiện ABORT nào (câu gác không làm lệch `changes()` của câu nối sau nhật ký)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201); // hết nợ ⇒ lô huỷ mang câu gác phiên bản
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  const abort = () => w.q("SELECT count(*) AS n FROM dsp_release_event WHERE order_id = ? AND kind_code = 'ABORT'", d.id)[0].n;
  const a0 = abort();
  w.chenTruocLo(laLoHuy, () => { w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 60_000).toISOString(), d.id); });
  const r = await w.call("POST", `/api/orders/${d.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.deepEqual([r.status, r.json.error?.code], [409, "stale"], r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
  assert.equal(abort(), a0, "huỷ thua thì không ghi sự kiện ABORT");
});

// ---- Kế hoạch Task 2 (nợ 1, 4): bảng ĐƯỜNG GHI chạy thật — mỗi đường làm nợ đơn Trả sau có thể đổi phải tăng phiên bản bên đặt ĐÚNG 1 trong chính lô ----
const congTy = (w: W): string => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const khoanThu = (w: W, id: string): string => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY rowid LIMIT 1", id)[0].id);
/** Đơn đã thu đủ, «Khách đã trả đủ», có phân định 100.000 do Hướng Dẫn chịu (Quản trị quyết, có trả khách). Trả id phân định (bước RULING). */
async function giaoVaQuyet(w: W, id: string): Promise<string> {
  assert.equal((await thu(w, id, T_ZB1)).status, 201);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id); // «Khách đã trả đủ» chỉ từ ngày đi
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 200, g.text);
  const q = await w.call("POST", "/api/ledger/phan-dinh", { as: ACC, body: { orderId: id, soTien: 100_000, lyDo: "Khách phản ánh quên đón" } });
  assert.equal(q.status, 201, q.text);
  const r = await w.call("POST", `/api/ledger/phan-dinh/${q.json.id}/quyet`, { as: ADM, body: { soTien: 100_000, truongHop: "T6", coTienRa: true, lyDo: "Đã nghe hai bên trình bày", benChiuPartyId: `pty-${H}` } });
  assert.equal(r.status, 201, r.text);
  return r.json.id as string;
}
const ghiPD = (w: W, ruling: string) => w.call("POST", `/api/ledger/phan-dinh/${ruling}/ghi`, { as: ACC, body: { hinhThuc: "CASH" } });

const DUONG_GHI: { ten: string; truoc: (w: W, id: string) => Promise<unknown>; lam: (w: W, id: string, x: any) => Promise<{ status: number; text: string }> }[] = [
  {
    ten: "hoàn tiền cho khách",
    truoc: async (w, id) => assert.equal((await thu(w, id, T_ZB1)).status, 201),
    lam: (w, id) => w.call("POST", "/api/ledger/refunds", { as: ACC, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } }),
  },
  {
    ten: "đảo (huỷ) khoản thu",
    truoc: async (w, id) => assert.equal((await thu(w, id, T_ZB1)).status, 201),
    lam: (w, id) => w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_lan_thu", receiptId: khoanThu(w, id), lyDo: "ghi nhầm số tiền khách đưa" } }),
  },
  {
    ten: "sửa khoản thu",
    truoc: async (w, id) => assert.equal((await thu(w, id, T_ZB1)).status, 201),
    lam: (w, id) => w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu: [khoanThu(w, id)], moi: [{ soTien: 400_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "khách đưa thiếu, sửa lại cho đúng" } }),
  },
  {
    ten: "huỷ dòng giữ hộ (dòng giữ hộ của điều chỉnh đã duyệt)",
    truoc: async (w, id) => {
      const y = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dieu_chinh", orderId: id, benNo: `pty-${A}`, benDuocNo: congTy(w), soTien: 100_000, loaiDong: "HELD", lyDo: "nhân viên giữ hộ tiền khách đưa" } });
      assert.equal(y.status, 201, y.text);
      const duyet = await w.call("POST", `/api/ledger/adjustment-requests/${y.json.yeuCauId}/approve`, { as: SUP, body: {} });
      assert.ok(duyet.status === 200 || duyet.status === 201, duyet.text);
      return String(w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' AND reverses_line_id IS NULL", id)[0].id);
    },
    lam: (w, _id, dong) => w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_dong", lineId: dong, lyDo: "ghi nhầm dòng giữ hộ" } }),
  },
  {
    ten: "duyệt điều chỉnh sổ (người thứ hai duyệt)",
    truoc: async (w, id) => {
      const y = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dieu_chinh", orderId: id, benNo: `pty-${A}`, benDuocNo: congTy(w), soTien: 100_000, loaiDong: "HELD", lyDo: "nhân viên giữ hộ tiền khách đưa" } });
      assert.equal(y.status, 201, y.text);
      return y.json.yeuCauId as string;
    },
    lam: (w, _id, yc) => w.call("POST", `/api/ledger/adjustment-requests/${yc}/approve`, { as: SUP, body: {} }),
  },
  {
    ten: "huỷ dòng nộp",
    truoc: async (w, id) => {
      assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: A, body: { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
      assert.equal((await w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: `pty-${A}`, phanBo: [{ orderId: id, soTien: 100_000 }] } })).status, 201);
      return String(w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'SETTLEMENT' AND reverses_line_id IS NULL", id)[0].id);
    },
    lam: (w, _id, dong) => w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_dong", lineId: dong, lyDo: "ghi nhầm lần nộp" } }),
  },
  {
    ten: "chuyển cọc từ đơn huỷ sang đơn Trả sau",
    truoc: async (w, id) => {
      const r = await w.call("POST", "/api/orders", { as: DT2, body: { customerName: "Khách Hai", customerPhone: "0912345679", services: [svc("ZB1", inDays(3))], declaredDeposit: 200_000 } });
      assert.equal(r.status, 201, r.text);
      const cu = r.json.order.id as string;
      assert.equal((await w.call("POST", `/api/orders/${cu}/gui-don`, { as: DT2, body: {} })).status, 200);
      const don = (await w.call("GET", `/api/orders/${cu}`, { as: DT2 })).json.order;
      assert.equal((await w.call("POST", `/api/orders/${cu}/status`, { as: DT2, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: don.updatedAt } })).status, 200);
      const ma = String(w.q("SELECT order_code AS c FROM orders WHERE id = ?", id)[0].c);
      const d = await w.call("POST", `/api/orders/${cu}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien: 200_000, lyDo: "Lập lại đơn cho khách", donNhan: ma } });
      assert.ok(d.status === 200 || d.status === 201, d.text);
      return { cu, duyetId: d.json.duyetId };
    },
    lam: (w, _id, x) => w.call("POST", `/api/orders/${x.cu}/coc/chuyen`, { as: ACC, body: { duyetId: x.duyetId, soTien: 200_000, ngayPhatSinh: inDays(0), nguoiGiu: { partyId: BEN2 } } }),
  },
  {
    ten: "ghi sổ theo phân định (có trả khách)",
    truoc: (w, id) => giaoVaQuyet(w, id),
    lam: (w, _id, ruling) => ghiPD(w, ruling),
  },
  {
    ten: "ghi sổ phân định đổi bên chịu",
    truoc: async (w, id) => {
      assert.equal((await ghiPD(w, await giaoVaQuyet(w, id))).status, 201);
      const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
      const d = await w.call("POST", `/api/ledger/phan-dinh/${goc}/doi-ben-chiu`, { as: ADM, body: { truongHop: "T6", benChiuPartyId: `pty-${A}`, lyDo: "Phân định nhầm người, đổi bên chịu" } });
      assert.equal(d.status, 201, d.text);
      return d.json.id as string;
    },
    lam: (w, _id, ruling) => ghiPD(w, ruling),
  },
  {
    ten: "huỷ khoản theo phân định (đòi được khách)",
    truoc: async (w, id) => {
      assert.equal((await ghiPD(w, await giaoVaQuyet(w, id))).status, 201);
      return String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
    },
    lam: (w, _id, goc) => w.call("POST", `/api/ledger/phan-dinh/${goc}/huy`, { as: ACC, body: { soTien: 100_000, lyDo: "Khách đã trả lại một phần", moi: [{ soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }] } }),
  },
];

for (const dg of DUONG_GHI) {
  test(`ĐƯỜNG GHI (chạy thật): ${dg.ten} — phiên bản bên đặt tăng đúng 1`, async () => {
    const w = dung();
    assert.equal((await hanMuc(w, 5_000_000)).status, 201);
    // Bên đặt mang vai được hưởng: «Khách đã trả đủ» (hai dòng phân định) đòi có mức hoa hồng lúc xác nhận.
    assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01" } })).status, 201);
    const d = await donTS(w);
    const x = await dg.truoc(w, d.id);
    const v0 = phienBan(w);
    assert.notEqual(v0, null, "chống bài rỗng: bên đặt đã có dòng phiên bản trước lệnh");
    const r = await dg.lam(w, d.id, x);
    assert.ok(r.status === 200 || r.status === 201, r.text);
    assert.equal(phienBan(w), v0! + 1);
  });
}

// ---- Kế hoạch 2026-11-05 Task 3 (nợ 3): sửa tăng tính theo nợ CỦA ĐƠN + phần tăng, không coi cả tổng mới là nợ ----
/** Dịch vụ 200.000 ₫ / người lớn để 3, 4, 5 người lớn = 600.000, 800.000, 1.000.000. */
const svc200 = (adult: number) => ({ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZC2", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 200_000 }, departDate: inDays(3), legs: [] });
async function don600DaThu400(w: W): Promise<string> {
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZC2', 'Tour hai trăm', 'perPax', 200000, 1, '2026-01-01', '2026-01-01')");
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc200(3)] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await thu(w, id, 400_000)).status, 201);
  assert.equal(await no(w), 200_000);
  assert.equal((await hanMuc(w, 500_000)).status, 201, "hạ hạn mức còn 500.000 (đang nợ 200.000)");
  return id;
}

// Task 5 (việc B): có cờ «vé vừa mở» mà soạn câu trả vé lỗi ⇒ 503 câu tiếng Việt, không ghi gì (trước đây NÉM ra 500 thô). Hỏng ĐÚNG bước soạn trả vé: đổi tên cột
// `pax_group` mà câu đếm trả vé (DEM_TRA) đọc còn câu cổng «vé đã mở» (VE_DA_MO) không đọc — cổng vẫn đọc được, chỉ bước soạn lỗi.
const hongSoanTraVe = (w: W) => w.sqlite.exec("PRAGMA legacy_alter_table = ON; ALTER TABLE vdt_allocation RENAME COLUMN pax_group TO pax_group_hong");
for (const [ten, goi] of [
  ["/status", (w: W, id: string) => huy(w, id)],
  ["handler-cancel", (w: W, id: string) => w.call("POST", `/api/orders/${id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } })],
] as const) {
  test(`Task 5: ${ten} — đơn Trả sau còn nợ, soạn câu trả vé lỗi ⇒ 503 tra_sau_chua_dung_duoc, đơn còn confirmed, sổ và nhật ký không đổi`, async () => {
    const w = dung();
    assert.equal((await hanMuc(w, 2_000_000)).status, 201);
    const d = await donTS(w);
    if (ten === "handler-cancel") assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: A, body: { staffId: H } })).status, 200);
    const truoc = [demBil(w), demNhatKy(w, d.id), phienBan(w)];
    hongSoanTraVe(w);
    const r = await goi(w, d.id);
    assert.deepEqual([r.status, r.json.error?.code], [503, "tra_sau_chua_dung_duoc"], r.text);
    assert.match(r.json.error.message, /vé/, "câu tiếng Việt nói chuyện vé");
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", d.id)[0].status, "confirmed");
    assert.deepEqual([demBil(w), demNhatKy(w, d.id), phienBan(w)], truoc, "không dòng sổ, nhật ký, phiên bản nào");
  });
}

test("Task 3: hạn mức 500.000, đơn 600.000 đã về công ty 400.000 (nợ 200.000) — tăng lên 1.000.000 thì 409 nói đúng phần còn được dùng; tăng lên 800.000 thì được, nợ mới 400.000", async () => {
  const w = dung();
  const id = await don600DaThu400(w);
  const v0 = phienBan(w)!;
  const vuot = await suaVP(w, id, 5); // 1.000.000: phần tăng 400.000 > còn được dùng 300.000
  assert.deepEqual([vuot.status, vuot.json.error?.code], [409, "vuot_han_muc"], vuot.text);
  assert.equal(vuot.json.error.message, "Số tiền tăng thêm 400.000 ₫ vượt hạn mức khả dụng của bên đặt là 300.000 ₫ (hạn mức 500.000 ₫, đang nợ 200.000 ₫).");
  assert.equal(soDongDieuChinh(w, id), 0);
  assert.equal(phienBan(w), v0);
  const duoc = await suaVP(w, id, 4); // 800.000: phần tăng 200.000 ≤ 300.000
  assert.equal(duoc.status, 200, duoc.text);
  assert.equal(await no(w), 400_000, "nợ mới = 200.000 + 200.000");
  assert.equal(phienBan(w), v0 + 1);
});

test("Task 3: không đọc được nợ của đơn (hàm tiêm vắng) khi sửa tăng ⇒ 503 tra_sau_chua_dung_duoc, không ghi gì", async () => {
  const w = dung({ khongTiemTraSauCuaDon: true });
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const d = await donTS(w);
  const r = await suaVP(w, d.id, 3);
  assert.deepEqual([r.status, r.json.error?.code], [503, "tra_sau_chua_dung_duoc"], r.text);
  assert.equal(soDongDieuChinh(w, d.id), 0);
  assert.equal((await suaVP(w, d.id, 1)).status, 200, "giảm tiền không cần đọc nợ");
});

test("Task 3 (nợ 7): gộp hồ sơ — đọc nợ Trả sau LỖI thì xem trước và lệnh gộp đều không ghi gì; hồ sơ và đơn giữ nguyên", async () => {
  const w = dung();
  const TEN = "Đại Lý Không Tài Khoản";
  const B = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Hồ Sơ Chính", phone: "0900000066", roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(B.status, 201, B.text);
  const bId = B.json.staff.partyId as string;
  const P = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "0912000222" }] } });
  assert.equal(P.status, 201, P.text);
  const aId = P.json.party.id as string;
  // Làm hỏng nguồn đọc nợ (view công bố đơn Trả sau) — chỉ hàm đọc nợ dùng nó trên đường gộp.
  w.sqlite.exec("DROP VIEW v_ord_don_tra_sau");
  const truoc = [w.q("SELECT count(*) AS n FROM audit_log")[0].n, w.q("SELECT active FROM pty_party WHERE id = ?", aId)[0].active];
  const xem = await w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: bId } });
  assert.ok(xem.status >= 500, `xem trước không được coi như «không nợ»: ${xem.status} ${xem.text}`);
  const gop = await w.call("POST", `/api/parties/${aId}/merge`, { as: ADM, body: { intoPartyId: bId, xacNhan: TEN } });
  assert.ok(gop.status >= 500, `lệnh gộp không chạy: ${gop.status} ${gop.text}`);
  assert.deepEqual([w.q("SELECT count(*) AS n FROM audit_log")[0].n, w.q("SELECT active FROM pty_party WHERE id = ?", aId)[0].active], truoc, "không dòng nhật ký, hồ sơ phụ còn nguyên");
});

test("Task 3 (ghim nợ 6): đường hẹp con-duoc-dung — đúng ba khoá; Đối tác gửi benDat người khác vẫn nhận số của mình; Hướng dẫn viên 403", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  assert.equal((await hanMuc(w, 3_000_000, BEN2)).status, 201);
  const cua = (as: string, ben: string) => w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${ben}`, { as });
  const r = await cua(DT, BEN2);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ["coDonQuaHan", "coHanMuc", "conDuocDung"]);
  assert.equal(r.json.conDuocDung, 1_000_000, "số của chính Đối tác (hồ sơ phiên), không phải 3.000.000 của người khác");
  assert.equal((await cua(A, BEN2)).json.conDuocDung, 3_000_000, "văn phòng hỏi bên đặt đã chọn");
  assert.equal((await cua(H, BEN)).status, 403);
  assert.equal((await cua(PARTNER, BEN2)).json.coHanMuc, false, "Đối tác chưa có hạn mức: không thấy hạn mức người khác");
});

test("Task 3 (ghim nợ 5): hạ hạn mức xuống dưới số đang nợ — màn danh sách có cảnh báo, đơn Trả sau mới bị chặn, đơn cũ không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const cu = await donTS(w);
  assert.equal((await hanMuc(w, 500_000)).status, 201);
  const dong = ((await w.call("GET", "/api/tra-sau/han-muc", { as: SUP })).json.danhSach as { partyId: string; hanMuc: number | null; dangNo: number }[]).find((d) => d.partyId === BEN)!;
  assert.deepEqual([dong.hanMuc, dong.dangNo], [500_000, T_ZB1]);
  assert.equal(canhBaoVuotHanMuc(dong), "Đang nợ 600.000 ₫, vượt hạn mức hiện hành 500.000 ₫.");
  const moi = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(moi.status, 409, moi.text);
  assert.equal(moi.json.error.code, "vuot_han_muc");
  assert.deepEqual({ ...w.q("SELECT status, total FROM orders WHERE id = ?", cu.id)[0] }, { status: "confirmed", total: T_ZB1 }, "đơn cũ không đổi");
  assert.equal(await no(w), T_ZB1);
});

// Bốn bài QUÉT chữ cũ (soanHuyDon / changeBooker / soanSuaSoKhach phải có cổng đứng trước; đếm cauTangChoDon) đã XOÁ theo kế hoạch 2026-11-05 Task 2:
// ba hàm ghi nay đòi kiểu mang nhãn chỉ cổng tạo được (`npm run typecheck` buộc), và bảng ĐƯỜNG GHI ở trên chạy thật từng đường. Sổ: docs/SO-HANG-RAO.md.
