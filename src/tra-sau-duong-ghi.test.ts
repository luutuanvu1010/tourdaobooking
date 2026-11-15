// Các đường làm TĂNG hoặc TRƯỢT nợ của đơn Trả sau (ADR-0168 Đ2 mục 5–6, Đ3 mục 3; kế hoạch 2026-11-05 Task 4): sửa số khách (văn phòng và hướng dẫn viên) chung MỘT cổng,
// đổi bên đặt, gộp hồ sơ, huỷ đơn khi vé đã mở (kể cả vé mở chen giữa lúc kiểm và lúc ghi), và bảng ĐƯỜNG GHI chạy thật (mỗi đường làm nợ đổi tăng phiên bản đúng 1).
// Cổng bắt buộc của `soanHuyDon`, `changeBooker`, `insertMoneyAdjustment` do kiểu mang nhãn ép (typecheck), không còn bài quét chữ. Khung thử thật (tests/audit/harness.mjs). Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, H, PARTNER, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { canhBaoVuotHanMuc } from "./shared/han-muc-tra-sau-hien-thi.ts";
import { cachBayGio, datQuaHan } from "../tests/audit/tra-sau-moc.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
const phienBan = (w: W, ben = BEN): number | null => w.q("SELECT version FROM bil_credit_guard WHERE party_id = ?", ben)[0]?.version ?? null;
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
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201); // ADR-0188: hết nợ chỉ đổi sang bên có hạn mức
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
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201); // ADR-0188: bên mới phải có hạn mức
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

// ---- ADR-0188 (T-03): hết nợ chỉ đổi bên đặt sang bên có hạn mức trả sau còn hiệu lực, không đơn quá hạn; không đổi sang khách lẻ ----
const DOC_TEP = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");
const benDatCua = (w: W, id: string): string | null => w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b;
const doiBen = (w: W, id: string, updatedAt: string, ben: string | null) =>
  w.call("PUT", `/api/orders/${id}/booker`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: ben, expectedUpdatedAt: updatedAt } });
const capNhat = async (w: W, id: string): Promise<string> => (await w.call("GET", `/api/orders/${id}`, { as: A })).json.order.updatedAt;
/** Đơn Trả sau của BEN đã xác nhận và đã thu đủ (nợ 0) — sẵn sàng qua điều kiện «hết nợ». */
async function donHetNo(w: W): Promise<{ id: string; updatedAt: string }> {
  const d = await donTS(w);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  return { id: d.id, updatedAt: await capNhat(w, d.id) };
}

test("ADR-0188 câu a, b, c: ba hằng của đường đổi bên đặt đúng nguyên văn ADR (bài DUY NHẤT so nguyên câu)", () => {
  const tep = DOC_TEP("src/modules/orders/tra-sau-cong.ts");
  const hang = (ten: string): string => new RegExp(`${ten} = "([^"]+)"`).exec(tep)?.[1] ?? "";
  assert.equal(hang("CAU_DOI_BEN_KHONG_HAN_MUC"), "Đơn trả sau đã xác nhận chỉ đổi được sang bên đặt có hạn mức trả sau còn hiệu lực. Nhờ Quản trị hoặc Toàn quyền cấp hạn mức cho bên mới, hoặc giữ bên đặt cũ.");
  assert.equal(hang("CAU_DOI_BEN_QUA_HAN"), "Bên đặt mới còn đơn trả sau quá hạn chưa thanh toán nên chưa nhận thêm đơn trả sau.");
  assert.equal(hang("CAU_DOI_BEN_KHACH_LE"), "Đơn trả sau đã xác nhận phải có bên đặt là đối tác có hạn mức trả sau — không đổi sang khách lẻ được.");
});

test("ADR-0188 T3-a: hết nợ, đổi sang bên KHÔNG có hạn mức ⇒ 409 khong_co_han_muc, đơn không đổi, không phiên bản nào tăng", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donHetNo(w);
  const truoc = phienBan(w);
  const r = await doiBen(w, d.id, d.updatedAt, BEN2);
  assert.deepEqual([r.status, r.json.error?.code], [409, "khong_co_han_muc"], r.text);
  assert.doesNotMatch(r.json.error.message, /thanh toán ngay/i, "không mượn câu của cửa xác nhận (bảo chọn thanh toán ngay — việc không làm được)");
  assert.equal(benDatCua(w, d.id), BEN);
  assert.equal(phienBan(w), truoc);
  assert.equal(phienBan(w, BEN2), null);
});

test("ADR-0188 T3-b: hết nợ, đổi sang khách lẻ (bên đặt rỗng) ⇒ 409 tra_sau_thieu_ben_dat, đơn không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const d = await donHetNo(w);
  const r = await doiBen(w, d.id, d.updatedAt, null);
  assert.deepEqual([r.status, r.json.error?.code], [409, "tra_sau_thieu_ben_dat"], r.text);
  assert.equal(benDatCua(w, d.id), BEN);
});

test("ADR-0188 T3-c: hết nợ, bên mới có hạn mức nhưng còn đơn quá hạn chưa trả ⇒ 409 co_don_qua_han, đơn không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  assert.equal((await hanMuc(w, 5_000_000, BEN2)).status, 201);
  const cuaBen2 = await donTS(w, BEN2);
  datQuaHan(w.sqlite, cuaBen2.id);
  const d = await donHetNo(w);
  const r = await doiBen(w, d.id, d.updatedAt, BEN2);
  assert.deepEqual([r.status, r.json.error?.code], [409, "co_don_qua_han"], r.text);
  assert.equal(benDatCua(w, d.id), BEN);
});

test("ADR-0188 T3-d: hết nợ, bên mới có hạn mức ⇒ 200; phiên bản bên cũ và bên mới mỗi bên tăng đúng 1", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201);
  const d = await donHetNo(w);
  const [cu, moi] = [phienBan(w), phienBan(w, BEN2)];
  assert.ok(cu !== null && moi !== null);
  const r = await doiBen(w, d.id, d.updatedAt, BEN2);
  assert.equal(r.status, 200, r.text);
  assert.equal(benDatCua(w, d.id), BEN2);
  assert.deepEqual([phienBan(w), phienBan(w, BEN2)], [cu! + 1, moi! + 1]);
});

test("ADR-0188 T3-e: lệnh khác làm đổi phiên bản bên MỚI chen giữa lúc kiểm và lúc ghi ⇒ 409 credit_version_stale, bên đặt không đổi", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201);
  const d = await donHetNo(w);
  let doi = 0;
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /booker_party_id/.test(s.sql) && /UPDATE orders/.test(s.sql)), () => {
    doi = Number(w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN2).changes);
  });
  const r = await doiBen(w, d.id, d.updatedAt, BEN2);
  assert.equal(doi, 1, "lệnh chen giữa đổi thật phiên bản của bên mới");
  assert.deepEqual([r.status, r.json.error?.code], [409, "credit_version_stale"], r.text);
  assert.equal(benDatCua(w, d.id), BEN);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'booker_changed'", d.id)[0].n, 0);
});

test("ADR-0188 T3-f: đơn nháp Trả sau và đơn Thanh toán ngay đã xác nhận đổi sang bên KHÔNG hạn mức vẫn 200, không câu gác nào", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 1_000_000)).status, 201);
  const truoc = phienBan(w);
  const n = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(n.status, 201, n.text);
  assert.equal((await doiBen(w, n.json.order.id, n.json.order.updatedAt, BEN2)).status, 200);
  const p = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal(p.status, 201, p.text);
  assert.equal((await w.call("POST", `/api/orders/${p.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const r = await doiBen(w, p.json.order.id, await capNhat(w, p.json.order.id), BEN2);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([phienBan(w), phienBan(w, BEN2)], [truoc, null], "không câu gác nào");
});

test("ADR-0188: gốc lắp ráp không tiêm cổng hạn mức (kiemTraSau null) ⇒ đổi bên đặt đơn Trả sau đã xác nhận hết nợ 503; còn nợ vẫn 409 tra_sau_con_no_doi_ben_dat (đứng trước)", async () => {
  const w = dung({ khongTiemTraSau: true });
  // Không tiêm cổng thì không lập được đơn Trả sau: lập đơn Thanh toán ngay, xác nhận, rồi lật hình thức thẳng CSDL (gỡ tạm trigger khoá cột, dựng lại đúng câu cũ).
  const p = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal(p.status, 201, p.text);
  const id = p.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const t = w.sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'orders_payment_term_locked'").get() as { sql: string };
  w.sqlite.exec("DROP TRIGGER orders_payment_term_locked");
  try {
    w.sqlite.prepare("UPDATE orders SET payment_term = 'CREDIT' WHERE id = ?").run(id);
  } finally {
    w.sqlite.exec(t.sql);
  }
  const conNo = await doiBen(w, id, await capNhat(w, id), BEN2);
  assert.deepEqual([conNo.status, conNo.json.error?.code], [409, "tra_sau_con_no_doi_ben_dat"], conNo.text);
  assert.equal((await thu(w, id, T_ZB1)).status, 201);
  const r = await doiBen(w, id, await capNhat(w, id), BEN2);
  assert.deepEqual([r.status, r.json.error?.code], [503, "tra_sau_chua_dung_duoc"], r.text);
  assert.equal(benDatCua(w, id), BEN);
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

// ---- ADR-0188 mục 4(a): cửa gộp hồ sơ — hồ sơ phụ có đơn Trả sau đã xác nhận (kể cả hết nợ) chỉ gộp vào hồ sơ chính có hạn mức, không đơn quá hạn ----
const TEN_PHU = "Đại Lý Gộp Thử";
/** Hồ sơ phụ không tài khoản, có hạn mức và MỘT đơn Trả sau đã xác nhận ĐÃ THU ĐỦ; vai đối tác kết thúc sau đó (không bị chặn vì vai). Hồ sơ chính = BEN2 (tài khoản Đối tác). */
async function nenGop(w: W): Promise<{ aId: string; donId: string }> {
  const P = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN_PHU, contacts: [{ kind: "PHONE", value: "0912000333" }] } });
  assert.equal(P.status, 201, P.text);
  const aId = P.json.party.id as string;
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-gop-0188', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(aId, AT, AT);
  assert.equal((await hanMuc(w, 1_000_000, aId)).status, 201);
  const d = await donTS(w, aId);
  assert.equal((await thu(w, d.id, T_ZB1)).status, 201);
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-06-01' WHERE id = 'r-gop-0188'").run();
  return { aId, donId: d.id };
}
const xemGop = (w: W, aId: string) => w.call("POST", `/api/parties/${aId}/merge/preview`, { as: ADM, body: { intoPartyId: BEN2 } });
const lenhGop = (w: W, aId: string) => w.call("POST", `/api/parties/${aId}/merge`, { as: ADM, body: { intoPartyId: BEN2, xacNhan: TEN_PHU } });
const maChan = (r: { json: { chan: { code: string; message: string }[] } }) => r.json.chan.map((c) => c.code);

test("ADR-0188 4(a): hồ sơ phụ có đơn Trả sau đã hết nợ, hồ sơ chính KHÔNG hạn mức ⇒ xem trước báo chặn (câu nói «hồ sơ chính»), lệnh gộp 409; không gì đổi", async () => {
  const w = dung();
  const { aId, donId } = await nenGop(w);
  const xem = await xemGop(w, aId);
  assert.equal(xem.status, 200, xem.text);
  assert.deepEqual(maChan(xem), ["merge_credit_no_limit"], JSON.stringify(xem.json.chan));
  assert.match(xem.json.chan[0].message, /hồ sơ chính/);
  const r = await lenhGop(w, aId);
  assert.deepEqual([r.status, r.json.error?.code], [409, "merge_credit_no_limit"], r.text);
  assert.equal(benDatCua(w, donId), aId, "đơn không bị dời");
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", aId)[0].active, 1);
});

test("ADR-0188 4(a): hồ sơ chính có hạn mức nhưng còn đơn quá hạn chưa trả ⇒ chặn ở cả xem trước lẫn lệnh gộp (merge_credit_overdue)", async () => {
  const w = dung();
  const { aId, donId } = await nenGop(w);
  assert.equal((await hanMuc(w, 5_000_000, BEN2)).status, 201);
  const cuaB = await donTS(w, BEN2);
  datQuaHan(w.sqlite, cuaB.id);
  const xem = await xemGop(w, aId);
  assert.deepEqual(maChan(xem), ["merge_credit_overdue"], JSON.stringify(xem.json.chan));
  assert.match(xem.json.chan[0].message, /hồ sơ chính/i);
  const r = await lenhGop(w, aId);
  assert.deepEqual([r.status, r.json.error?.code], [409, "merge_credit_overdue"], r.text);
  assert.equal(benDatCua(w, donId), aId);
});

test("ADR-0188 4(a): hồ sơ chính có hạn mức ⇒ gộp được, đơn sang hồ sơ chính, phiên bản hạn mức hồ sơ chính tăng đúng 1 (lô mang câu gác)", async () => {
  const w = dung();
  const { aId, donId } = await nenGop(w);
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201);
  const truoc = phienBan(w, BEN2);
  assert.ok(truoc !== null);
  const xem = await xemGop(w, aId);
  assert.deepEqual(maChan(xem), [], JSON.stringify(xem.json.chan));
  const r = await lenhGop(w, aId);
  assert.equal(r.status, 200, r.text);
  assert.equal(benDatCua(w, donId), BEN2);
  assert.equal(phienBan(w, BEN2), truoc! + 1);
});

test("ADR-0188 4(a): phiên bản hạn mức hồ sơ chính đổi chen giữa lúc tính và lúc ghi ⇒ 409 credit_version_stale (không phải merge_stale), không gì đổi", async () => {
  const w = dung();
  const { aId, donId } = await nenGop(w);
  assert.equal((await hanMuc(w, 1_000_000, BEN2)).status, 201);
  let doi = 0;
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => String(s.sql).includes("merged_into_id = (SELECT")), () => {
    doi = Number(w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN2).changes);
  });
  const r = await lenhGop(w, aId);
  assert.equal(doi, 1, "lệnh chen giữa đổi thật phiên bản hồ sơ chính");
  assert.deepEqual([r.status, r.json.error?.code], [409, "credit_version_stale"], r.text);
  assert.equal(benDatCua(w, donId), aId);
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", aId)[0].active, 1);
});

test("ADR-0188 4(a): gốc lắp ráp không tiêm cổng hạn mức ⇒ xem trước và lệnh gộp hồ sơ có đơn Trả sau đã xác nhận đều 503; hồ sơ không có đơn Trả sau không bị ảnh hưởng", async () => {
  const w = dung({ khongTiemTraSau: true });
  const P = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN_PHU, contacts: [{ kind: "PHONE", value: "0912000333" }] } });
  assert.equal(P.status, 201, P.text);
  const aId = P.json.party.id as string;
  assert.deepEqual(maChan(await xemGop(w, aId)), [], "không đơn Trả sau ⇒ không cần cổng hạn mức");
  // Đơn Trả sau đã xác nhận dựng thẳng CSDL (không tiêm cổng thì không lập được qua route): đơn Thanh toán ngay rồi lật hình thức (gỡ tạm trigger khoá cột).
  const p = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, services: [svc("ZB1", inDays(3))] } });
  assert.equal(p.status, 201, p.text);
  const id = p.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const t = w.sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'orders_payment_term_locked'").get() as { sql: string };
  w.sqlite.exec("DROP TRIGGER orders_payment_term_locked");
  try {
    w.sqlite.prepare("UPDATE orders SET payment_term = 'CREDIT', booker_party_id = ? WHERE id = ?").run(aId, id);
  } finally {
    w.sqlite.exec(t.sql);
  }
  const xem = await xemGop(w, aId);
  assert.deepEqual([xem.status, xem.json.error?.code], [503, "tra_sau_chua_dung_duoc"], xem.text);
  const r = await lenhGop(w, aId);
  assert.deepEqual([r.status, r.json.error?.code], [503, "tra_sau_chua_dung_duoc"], r.text);
  assert.equal(benDatCua(w, id), aId);
});

// ---- ADR-0197 Đ4 phương án (c1): Đối tác không tự huỷ đơn Trả sau ĐÃ xác nhận còn cọc ở tay mình; người của Công ty huỷ được; luật cũ đứng trước --------------------------
// «Cọc còn ở tay Đối tác» = phần khoản khai theo `phanKhaiCuaDon` (dấu ghi chú HOẶC chuyển từ đơn huỷ) còn số dư giữ hộ chưa nộp — CÙNG cách sổ nợ (`noTheoDon`) tính.
const CAU_CON_COC = "Đơn trả sau còn tiền cọc của khách ở tay bạn nên bạn chưa tự huỷ được. Hãy nhờ Quản trị huỷ.";
const thanDT = (coc: number, term: "CREDIT" | "PREPAID", ngay = inDays(3)) => ({ customerName: "Khách Thử", customerPhone: "0912345678", paymentTerm: term, declaredDeposit: coc, services: [svc("ZB1", ngay)] });
/** Đơn do Đối tác DT lập (bên đặt = BEN), khai cọc, tự «Gửi đơn» (nhánh B: xác nhận ngay). */
async function donDT(w: W, coc: number, term: "CREDIT" | "PREPAID" = "CREDIT", ngay?: string): Promise<{ id: string; orderCode: string; updatedAt: string }> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: thanDT(coc, term, ngay) });
  assert.equal(r.status, 201, r.text);
  const g = await w.call("POST", `/api/orders/${r.json.order.id}/gui-don`, { as: DT, body: {} });
  assert.equal(g.status, 200, g.text);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: DT })).json.order;
}
const huyBoi = (w: W, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
const nopVe = (w: W, id: string, soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: BEN, phanBo: [{ orderId: id, soTien }] } });
const trangThaiDon = (w: W, id: string): string => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const noDon = async (w: W, id: string): Promise<number | undefined> =>
  ((await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: SUP })).json.don as { orderId: string; no: number }[]).find((d) => d.orderId === id)?.no;

test("ADR-0197 Đ4 (c1): Đối tác tự huỷ đơn Trả sau còn cọc ⇒ 409 câu «Hãy nhờ Quản trị huỷ»; Kế toán bấm huỷ ⇒ 403; Quản trị huỷ được, cọc hiện ở màn cọc đơn huỷ, «Nộp về công ty» vẫn chạy (không bế tắc)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donDT(w, 200_000);
  assert.equal(await noDon(w, d.id), T_ZB1, "cọc không làm giảm nợ");
  const tu = await huyBoi(w, d.id, DT);
  assert.deepEqual([tu.status, tu.json.error?.code, tu.json.error?.message], [409, "tra_sau_con_coc_o_doi_tac", CAU_CON_COC], tu.text);
  assert.equal(trangThaiDon(w, d.id), "confirmed");
  const kt = await huyBoi(w, d.id, ACC);
  assert.equal(kt.status, 403, "Kế toán không huỷ được đơn (không đổi ô quyền)");
  assert.equal(trangThaiDon(w, d.id), "confirmed");
  const qt = await huyBoi(w, d.id, ADM);
  assert.equal(qt.status, 200, qt.text);
  assert.equal(trangThaiDon(w, d.id), "cancelled");
  const coc = await w.call("GET", "/api/ledger/coc", { as: ACC });
  assert.equal(coc.status, 200, coc.text);
  assert.ok(coc.text.includes(d.orderCode), "cọc của đơn huỷ hiện ở màn cọc đơn huỷ (luồng ADR-0089)");
  const nop = await nopVe(w, d.id, 200_000);
  assert.equal(nop.status, 201, nop.text);
});

test("ADR-0197 Đ4 (c1): Kế toán ghi «Nộp về công ty» một phần ⇒ vẫn 409; nộp đủ số cọc ⇒ Đối tác tự huỷ được (đơn còn nợ, vé chưa mở)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donDT(w, 200_000);
  assert.equal((await nopVe(w, d.id, 100_000)).status, 201);
  const motPhan = await huyBoi(w, d.id, DT);
  assert.deepEqual([motPhan.status, motPhan.json.error?.code], [409, "tra_sau_con_coc_o_doi_tac"], motPhan.text);
  assert.equal((await nopVe(w, d.id, 100_000)).status, 201);
  const du = await huyBoi(w, d.id, DT);
  assert.equal(du.status, 200, du.text);
  assert.equal(trangThaiDon(w, d.id), "cancelled");
});

test("ADR-0197 Đ4 (c1): đơn Trả sau KHÔNG khai cọc mà nhận cọc CHUYỂN từ đơn huỷ (`transfer_of_id`, không mang dấu ghi chú) ⇒ Đối tác tự huỷ vẫn 409; nợ của đơn không giảm (huỷ để lập lại sang đơn Trả sau)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const cu = await donDT(w, 200_000, "PREPAID");
  const h = await w.call("POST", `/api/orders/${cu.id}/status`, { as: DT, body: { status: "cancelled", lyDo: "SAI_THONG_TIN" } });
  assert.equal(h.status, 200, "đơn Thanh toán ngay có cọc: Đối tác tự huỷ như hôm nay");
  const moi = await donDT(w, 0);
  const duyet = await w.call("POST", `/api/orders/${cu.id}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien: 200_000, lyDo: "Lập lại đơn cho khách", donNhan: moi.orderCode } });
  assert.ok(duyet.status === 200 || duyet.status === 201, duyet.text);
  const chuyen = await w.call("POST", `/api/orders/${cu.id}/coc/chuyen`, { as: ACC, body: { duyetId: duyet.json.duyetId, soTien: 200_000, ngayPhatSinh: inDays(0), nguoiGiu: { partyId: BEN } } });
  assert.ok(chuyen.status === 200 || chuyen.status === 201, chuyen.text);
  const khoan = w.q("SELECT note, transfer_of_id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", moi.id) as { note: string | null; transfer_of_id: string | null }[];
  assert.equal(khoan.length, 1);
  assert.ok(khoan[0]!.transfer_of_id !== null && khoan[0]!.note !== "Khách đặt cọc trước", "khoản chuyển không mang dấu ghi chú");
  assert.equal(await noDon(w, moi.id), T_ZB1, "sổ nợ coi cọc chuyển sang là tiền ở tay Đối tác");
  const tu = await huyBoi(w, moi.id, DT);
  assert.deepEqual([tu.status, tu.json.error?.code], [409, "tra_sau_con_coc_o_doi_tac"], tu.text);
  assert.equal((await huyBoi(w, moi.id, ADM)).status, 200, "Quản trị huỷ được");
});

test("ADR-0197 Đ4: đơn Trả sau có cọc mà vé hãng ngoài đã mở (còn nợ) ⇒ văn phòng 409 tra_sau_con_no_da_mo_ve như cũ; Đối tác gặp lớp chặn ADR-0170 (vé đã mở), không gặp lớp mới", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donDT(w, 200_000);
  moVe(w, d.id);
  const vp = await huyBoi(w, d.id, ADM);
  assert.deepEqual([vp.status, vp.json.error?.code], [409, "tra_sau_con_no_da_mo_ve"], vp.text);
  const dt = await huyBoi(w, d.id, DT);
  assert.equal(dt.status, 409, dt.text);
  assert.notEqual(dt.json.error?.code, "tra_sau_con_coc_o_doi_tac", "lớp ADR-0170 đứng trước, hai lớp không đụng nhau");
  assert.equal(trangThaiDon(w, d.id), "confirmed");
});

test("ADR-0197 Đ4: Hướng dẫn viên đang phụ trách huỷ được đơn Trả sau còn cọc của Đối tác (handler-cancel)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donDT(w, 200_000);
  assert.equal((await w.call("PUT", `/api/orders/${d.id}/handler`, { as: ADM, body: { staffId: H } })).status, 200);
  const r = await w.call("POST", `/api/orders/${d.id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThaiDon(w, d.id), "cancelled");
});

test("ADR-0197 Đ4: đơn Thanh toán ngay có cọc ⇒ Đối tác tự huỷ như hôm nay (lớp mới chỉ áp đơn Trả sau)", async () => {
  const w = dung();
  const d = await donDT(w, 200_000, "PREPAID");
  assert.equal((await huyBoi(w, d.id, DT)).status, 200);
});

test("ADR-0197 «Chưa kiểm» — sửa số khách làm tổng xuống DƯỚI số cọc: được như đơn Thanh toán ngay; nợ = tổng mới (không âm); Đối tác vẫn không tự huỷ", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 2_000_000)).status, 201);
  const d = await donDT(w, 500_000); // tổng 600.000, cọc 500.000
  const giam = await w.call("POST", `/api/orders/${d.id}/money-edit`, { as: ADM, body: { lyDo: "THEM_NGUOI", services: [{ id: svcId(w, d.id), pax: pax(1) }] } });
  assert.equal(giam.status, 200, giam.text);
  assert.equal(await noDon(w, d.id), 300_000, "nợ = tổng mới: cọc ở tay Đối tác không trừ, cũng không làm nợ âm");
  assert.deepEqual([(await huyBoi(w, d.id, DT)).json.error?.code], ["tra_sau_con_coc_o_doi_tac"]);
});

test("ADR-0197 «Chưa kiểm» — hoa hồng, chủ dự án 12/11 «Chặn tới khi nộp» (ADR-0173 Đ3.1): đơn Trả sau thu đủ nhưng cọc còn ở tay Đối tác ⇒ «Khách đã trả đủ» 409, không dòng hoa hồng; nộp đủ cọc rồi mới giao được, hoa hồng bằng đơn không cọc", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01" } })).status, 201);
  const homNay = inDays(0);
  const khong = await donDT(w, 0, "CREDIT", homNay);
  const co = await donDT(w, 200_000, "CREDIT", homNay);
  const giao = (id: string) => w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  const hh = (id: string) => Number(w.q("SELECT COALESCE(SUM(amount), 0) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HOA_HONG'", id)[0].n);
  assert.equal((await thu(w, khong.id, T_ZB1)).status, 201);
  assert.equal((await giao(khong.id)).status, 200);
  assert.ok(hh(khong.id) > 0, "có hoa hồng");
  assert.equal((await thu(w, co.id, T_ZB1 - 200_000)).status, 201);
  // Màn đơn báo trước lý do giữ (cùng một hàm với route ghi).
  const xem = await w.call("GET", `/api/orders/${co.id}/payments`, { as: SUP });
  assert.equal(xem.status, 200, xem.text);
  assert.equal(xem.json.lyDoChuaGiao?.ma, "deposit_held");
  assert.equal(xem.json.coTheGiao, false);
  const chan = await giao(co.id);
  assert.equal(chan.status, 409, chan.text);
  assert.equal(chan.json.error?.code, "not_deliverable");
  assert.match(chan.json.error?.message ?? "", /200\.000 ₫/);
  assert.equal(hh(co.id), 0, "bị chặn ⇒ chưa có dòng hoa hồng");
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", co.id)[0].delivered_at, null, "đơn chưa sang «Khách đã trả đủ»");
  // Nộp một phần: vẫn chặn.
  assert.equal((await nopVe(w, co.id, 50_000)).status, 201);
  assert.equal((await giao(co.id)).status, 409);
  // Nộp đủ: giao được, hoa hồng bằng đơn không cọc.
  assert.equal((await nopVe(w, co.id, 150_000)).status, 201);
  const g = await giao(co.id);
  assert.equal(g.status, 200, g.text);
  assert.equal(hh(co.id), hh(khong.id), "cọc không làm đổi hoa hồng");
  assert.equal(await noDon(w, co.id), undefined, "nộp đủ thì hết nợ (đơn rời danh sách còn nợ)");
});
