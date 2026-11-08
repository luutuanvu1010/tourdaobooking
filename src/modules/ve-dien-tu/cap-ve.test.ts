// Giữ chỗ và trả vé nguyên tử (ADR-0153 Đ1; kế hoạch Task 3). SQLite thật + D1 giả chạy lần lượt như một lô (src/khung-thu-ve.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { soanCapVe, soanTraVe, veDangGiu } from "./cap-ve.ts";
import { AT, chayLo, d1That, dem, nhatKyThu, taoCsdl, themLo, themVe } from "../../khung-thu-ve.test.ts";

const NGAY = "2026-10-24";
const dich = (o: Partial<{ orderId: string; serviceId: string; pax: { adult: number; child: number; senior: number; infant: number }; nguonVe: "HANG_NGOAI" | "TOUR_DAO" }> = {}) => ({
  orderId: o.orderId ?? "o-1", serviceId: o.serviceId ?? "s-1", catalogCode: "V2D", ngayDi: NGAY, pax: o.pax ?? { adult: 2, child: 1, senior: 0, infant: 1 }, nguonVe: o.nguonVe ?? "HANG_NGOAI",
});
function kho(soAdult: number, soChild = 0) {
  const d = taoCsdl();
  const la = themLo(d);
  const lc = themLo(d, { nhom: "CHILD" });
  for (let i = 0; i < soAdult; i++) themVe(d, la);
  for (let i = 0; i < soChild; i++) themVe(d, lc);
  return d;
}
const cap = (d: ReturnType<typeof taoCsdl>, x = dich()) => chayLo(d, soanCapVe(d1That(d), x, "s-1", AT, nhatKyThu(d1That(d))).cau);
const giu = (d: ReturnType<typeof taoCsdl>, dv = "s-1") => dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE order_service_id = ? AND released_at IS NULL", dv);

// ---- ADR-0175 Đ1.5: giữ vé đúng nguồn theo ô «Vé do ai phát» của dịch vụ ---------------------------------------------------------------------------------
const loCuaVeGiu = (d: ReturnType<typeof taoCsdl>, dv = "s-1") =>
  (d.prepare("SELECT a.ticket_id AS t, b.source AS s FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id JOIN vdt_batch b ON b.id = t.batch_id WHERE a.order_service_id = ? AND a.released_at IS NULL ORDER BY a.slot_no").all(dv) as { t: string; s: string }[]);
function khoHaiNguon() {
  const d = taoCsdl();
  const hn = themLo(d);
  const td = themLo(d, { nguon: "TOUR_DAO" });
  for (let i = 0; i < 3; i++) { themVe(d, hn); themVe(d, td); }
  return d;
}

test("giữ đúng nguồn: dịch vụ Tour Đảo chỉ lấy vé lô Tour Đảo; dịch vụ hãng ngoài chỉ lấy vé lô hãng ngoài (cùng mã tour)", () => {
  const d = khoHaiNguon();
  cap(d, dich({ pax: { adult: 2, child: 0, senior: 0, infant: 0 }, nguonVe: "TOUR_DAO" }));
  assert.deepEqual(loCuaVeGiu(d).map((x) => x.s), ["TOUR_DAO", "TOUR_DAO"]);
  cap(d, dich({ serviceId: "s-2", orderId: "o-2", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, nguonVe: "HANG_NGOAI" }));
  assert.deepEqual(loCuaVeGiu(d, "s-2").map((x) => x.s), ["HANG_NGOAI", "HANG_NGOAI", "HANG_NGOAI"]);
  // Tour Đảo còn 1 vé: cần 3 thì chỉ giữ thêm 1, không lấy sang lô hãng ngoài.
  cap(d, dich({ serviceId: "s-3", orderId: "o-3", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, nguonVe: "TOUR_DAO" }));
  assert.deepEqual(loCuaVeGiu(d, "s-3").map((x) => x.s), ["TOUR_DAO"]);
});

test("đổi ô sau khi đã giữ: vé đã giữ không đổi; phần thiếu giữ sau lấy theo giá trị mới (Đ1.5)", () => {
  const d = khoHaiNguon();
  cap(d, dich({ pax: { adult: 1, child: 0, senior: 0, infant: 0 }, nguonVe: "HANG_NGOAI" }));
  const truoc = loCuaVeGiu(d);
  assert.deepEqual(truoc.map((x) => x.s), ["HANG_NGOAI"]);
  cap(d, dich({ pax: { adult: 2, child: 0, senior: 0, infant: 0 }, nguonVe: "TOUR_DAO" }));
  const sau = loCuaVeGiu(d);
  assert.equal(sau.length, 2, "chỉ giữ thêm phần thiếu");
  assert.deepEqual(sau[0], truoc[0], "vé đã giữ giữ nguyên, vẫn từ lô hãng ngoài");
  assert.equal(sau[1]!.s, "TOUR_DAO");
});

test("capDuVeDungNhom: 2 người lớn + 1 trẻ em + 1 em bé ⇒ 2 + 1 vé, em bé 0", async () => {
  const d = kho(5, 5);
  cap(d);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT'"), 2);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'CHILD'"), 1);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'ALLOCATED'"), 3);
});

test("veDangGiu: đếm vé đang giữ theo nhóm cho một dịch vụ (không trả mã)", async () => {
  const d = kho(5, 5);
  cap(d);
  assert.deepEqual(await veDangGiu(d1That(d), "s-1"), { ADULT: 2, CHILD: 1, SENIOR: 0 });
  assert.deepEqual(await veDangGiu(d1That(d), "s-khac"), { ADULT: 0, CHILD: 0, SENIOR: 0 });
});

test("capLaiLanHai_khongCapThua; chạy lại nhiều lần vẫn đúng số", async () => {
  const d = kho(5, 5);
  cap(d);
  cap(d);
  cap(d);
  assert.equal(giu(d), 3);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'ALLOCATED'"), 3);
});

test("khoThieu_capPhanCoVaBaoThieuDungSo: kho 1 người lớn, cần 2 ⇒ cấp 1; nhập thêm rồi cấp lại ⇒ đủ", async () => {
  const d = kho(1, 1);
  cap(d);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT'"), 1);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'CHILD'"), 1);
  themVe(d, (d.prepare("SELECT id FROM vdt_batch WHERE pax_group = 'ADULT'").get() as { id: string }).id);
  cap(d);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT' AND released_at IS NULL"), 2);
});

test("chaySauXacNhanBiNgat_donVanHienThieuVaCapBuDuoc: chưa chạy cấp ⇒ chưa có phân bổ; chạy sau thì đủ", async () => {
  const d = kho(3, 3);
  assert.equal(giu(d), 0);
  cap(d);
  assert.equal(giu(d), 3);
});

test("chỉ chọn vé đúng mã tour, đúng nhóm, đúng ngày; vé hết hạn sớm lấy trước", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const khac = themLo(d, { ma: "VB350" });
  const muon = themVe(d, lo, "2026-10-01", "2026-12-31", "t-muon");
  const som = themVe(d, lo, "2026-10-01", "2026-10-30", "t-som");
  themVe(d, lo, "2026-10-25", "2026-12-31", "t-chua-toi"); // chưa tới hạn dùng
  themVe(d, lo, "2026-09-01", "2026-10-23", "t-het-han");
  themVe(d, khac, "2026-10-01", "2026-12-31", "t-khac-tour");
  cap(d, dich({ pax: { adult: 2, child: 0, senior: 0, infant: 0 } }));
  const ids = (d.prepare("SELECT ticket_id FROM vdt_allocation ORDER BY slot_no").all() as { ticket_id: string }[]).map((r) => r.ticket_id);
  assert.deepEqual(ids, [som, muon], "vé hết hạn sớm nhất nhận vị trí 1");
});

test("lô chưa kích hoạt (PENDING) hoặc đã vô hiệu không cấp", async () => {
  const d = taoCsdl();
  themVe(d, themLo(d, { status: "PENDING" }));
  themVe(d, themLo(d, { status: "VOID" }));
  cap(d, dich({ pax: { adult: 2, child: 0, senior: 0, infant: 0 } }));
  assert.equal(giu(d), 0);
});

test("haiYeuCauDongThoiKhongCapThua: cùng một dịch vụ, hai lô soạn từ cùng một lúc ⇒ tổng vẫn đúng số cần", async () => {
  const d = kho(10, 10);
  const a = soanCapVe(d1That(d), dich(), "s-1", AT, nhatKyThu(d1That(d))).cau;
  const b = soanCapVe(d1That(d), dich(), "s-2", AT, nhatKyThu(d1That(d))).cau;
  chayLo(d, a);
  chayLo(d, b);
  assert.equal(giu(d), 3);
});

test("nhatKyKhongChuaMaVe: nhật ký ghi nhãn nhóm + số cần, không mã vé, không khoá kho", async () => {
  const d = kho(5, 5);
  cap(d);
  const rows = d.prepare("SELECT action, detail, target_id FROM audit_log WHERE action LIKE 've_%' ORDER BY created_at").all() as { action: string; detail: string; target_id: string }[];
  assert.ok(rows.length >= 2, "mỗi nhóm có cấp được thì một dòng");
  for (const r of rows) {
    assert.equal(r.action, "ve_giu_cho");
    assert.doesNotMatch(`${r.detail} ${r.target_id}`, /TA\.|SECRET|khoa-bi-mat|vdt\//);
  }
  cap(d); // chạy lại: không cấp thêm ⇒ không thêm dòng nhật ký
  assert.equal(dem(d, "SELECT count(*) AS c FROM audit_log WHERE action LIKE 've_%'"), rows.length);
});

test("huyDon_traVe_huyLapKhongTraHaiLan: vé chưa lộ về kho; huỷ lần hai không đổi gì", async () => {
  const d = kho(5, 5);
  cap(d);
  const tra = await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31" }, nhatKyThu(d1That(d)));
  assert.equal(tra.canhBaoVeDaGiaoConThua, false);
  chayLo(d, tra.cau);
  assert.equal(giu(d), 0);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'AVAILABLE'"), 10);
  const nhatKy = dem(d, "SELECT count(*) AS c FROM audit_log WHERE action = 've_tra_ve'");
  chayLo(d, (await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: "2026-10-31T06:00:00.000Z", by: "s-1", homNay: "2026-10-31" }, nhatKyThu(d1That(d)))).cau);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'AVAILABLE'"), 10);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE release_reason IS NOT NULL"), 3);
  assert.equal(dem(d, "SELECT count(*) AS c FROM audit_log WHERE action = 've_tra_ve'"), nhatKy, "huỷ lặp không thêm nhật ký");
  cap(d); // vé vừa trả cấp lại được cho đơn khác
  assert.equal(giu(d), 3);
});

test("trả vé hết hạn ⇒ VOID, không về kho", async () => {
  const d = kho(5, 5);
  cap(d);
  chayLo(d, (await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: AT, by: null, homNay: "2026-12-15" }, nhatKyThu(d1That(d)))).cau); // ngày hôm nay đã quá hạn vé
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'VOID'"), 3);
});

test("traVe_veDaRevealedKhongVeKho_veVoHieuVaCoCanhBao", async () => {
  const d = kho(5, 5);
  cap(d);
  d.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE pax_group = 'ADULT' AND slot_no = 1").run(AT, AT);
  const tra = await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31" }, nhatKyThu(d1That(d)));
  assert.equal(tra.canhBaoVeDaGiaoConThua, true);
  chayLo(d, tra.cau);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'VOID'"), 1, "vé đã lộ bị vô hiệu");
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'AVAILABLE'"), 9);
});

test("giamSoKhach_traVeChuaGiaoTruoc: giảm người lớn 2 → 1, vé đã lộ được giữ", async () => {
  const d = kho(5, 5);
  cap(d);
  d.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE pax_group = 'ADULT' AND slot_no = 1").run(AT, AT);
  const tra = await soanTraVe(d1That(d), { orderId: "o-1", serviceId: "s-1", lyDo: "GIAM_SO_KHACH", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31", conLai: { ADULT: 1, CHILD: 1, SENIOR: 0 } }, nhatKyThu(d1That(d)));
  assert.equal(tra.canhBaoVeDaGiaoConThua, false);
  chayLo(d, tra.cau);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT' AND released_at IS NULL"), 1);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT' AND released_at IS NULL AND revealed_at IS NOT NULL"), 1, "vé đã lộ còn lại");
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'CHILD' AND released_at IS NULL"), 1, "nhóm khác không đụng");
});

test("giamSoKhachKhiVeDaGiaoConThua_hienCanhBao: cả hai vé người lớn đã lộ, giảm còn 1 ⇒ không trả, cảnh báo", async () => {
  const d = kho(5, 5);
  cap(d);
  d.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE pax_group = 'ADULT'").run(AT, AT);
  const tra = await soanTraVe(d1That(d), { orderId: "o-1", serviceId: "s-1", lyDo: "GIAM_SO_KHACH", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31", conLai: { ADULT: 1, CHILD: 1, SENIOR: 0 } }, nhatKyThu(d1That(d)));
  assert.equal(tra.canhBaoVeDaGiaoConThua, true);
  chayLo(d, tra.cau);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE pax_group = 'ADULT' AND released_at IS NULL"), 2, "không tự thu hồi vé khách đang giữ");
});

test("trả vé dựng đủ ba nhóm dù lần đọc trước lô không thấy nhóm đó (lô cấp vé chen giữa vẫn bị trả)", async () => {
  const d = kho(5, 5);
  const truocKhiCap = await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31" }, nhatKyThu(d1That(d)));
  cap(d); // lô cấp vé chạy SAU lần đọc, TRƯỚC lô huỷ
  chayLo(d, truocKhiCap.cau);
  assert.equal(giu(d), 0, "đơn huỷ không còn giữ vé nào");
  assert.equal(dem(d, "SELECT count(*) AS c FROM audit_log WHERE action = 've_tra_ve'"), 2, "nhật ký cho mỗi nhóm thực sự có vé để trả (người lớn, trẻ em)");
});
