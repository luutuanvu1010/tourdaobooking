// Form tạo đơn biết đơn đang soạn có đủ «Trả sau theo dịch vụ» không (ADR-0230 Đ1 mục 5): luật hiển thị thuần, dùng chung với cổng lưu của máy chủ (`hinhThucDuocNhan`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauChonTraSau, duongConDuocDung, hinhThucDuocNhan, trangThaiTuConDuocDung, CAU_TRA_SAU_DOI_TAC } from "./han-muc-tra-sau-hien-thi.ts";

test("đối tác KHÔNG hạn mức, đơn đủ điều kiện theo dịch vụ ⇒ hiện, câu lời thường kèm số giờ, chỉ «Trả sau»", () => {
  const r = { coHanMuc: false, conDuocDung: 0, coDonQuaHan: false, traSauDichVu: { gioTra: 24 } };
  const c = cauChonTraSau({ ...r, laDoiTac: true });
  assert.deepEqual(c, { hien: true, khoa: null, cau: "Đơn này được trả sau: vé hiện ngay, trả Tour Đảo trong 24 giờ (1 ngày)." });
  assert.doesNotMatch(c.cau, /hạn mức/i, "đối tác không thấy chữ «hạn mức» (ADR-0198 Đ1)");
  const t = trangThaiTuConDuocDung(r, false);
  assert.equal(t, "dung_duoc");
  assert.deepEqual(hinhThucDuocNhan({ laDoiTac: true, traSau: t }).chonDuoc, ["CREDIT"]);
});

test("văn phòng «Qua đối tác», đơn đủ điều kiện ⇒ hiện Trả sau với tên «Trả sau theo dịch vụ»; có hạn mức vẫn ưu tiên câu theo dịch vụ", () => {
  assert.deepEqual(cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false, traSauDichVu: { gioTra: 36 }, laDoiTac: false }), { hien: true, khoa: null, cau: "Trả sau theo dịch vụ · trả trong 36 giờ" });
  assert.equal(cauChonTraSau({ coHanMuc: true, conDuocDung: 5, coDonQuaHan: false, traSauDichVu: { gioTra: 48 }, laDoiTac: false }).cau, "Trả sau theo dịch vụ · trả trong 48 giờ (2 ngày)");
});

test("đơn đủ điều kiện nhưng bên đặt có đơn quá hạn ⇒ khoá, trạng thái qua_han; không đủ điều kiện ⇒ như hôm nay", () => {
  const r = { coHanMuc: false, conDuocDung: 0, coDonQuaHan: true, traSauDichVu: { gioTra: 24 } };
  assert.notEqual(cauChonTraSau({ ...r, laDoiTac: true }).khoa, null);
  assert.equal(trangThaiTuConDuocDung(r, false), "qua_han");
  const hom = { coHanMuc: true, conDuocDung: 5, coDonQuaHan: false, traSauDichVu: null };
  assert.deepEqual(cauChonTraSau({ ...hom, laDoiTac: true }), { hien: true, khoa: null, cau: CAU_TRA_SAU_DOI_TAC });
  assert.equal(trangThaiTuConDuocDung(hom, true), "vuot");
  assert.equal(trangThaiTuConDuocDung({ ...hom, coHanMuc: false }, false), "khong_co");
  assert.deepEqual(cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false, traSauDichVu: null, laDoiTac: true }).hien, false);
});

test("duongConDuocDung: gửi mã các dòng (mã hoá), dòng nhập tay ⇒ nhapTay=1; không dòng nào ⇒ chỉ bên đặt", () => {
  assert.equal(duongConDuocDung("pty-1", []), "/api/tra-sau/con-duoc-dung?benDat=pty-1");
  assert.equal(duongConDuocDung("pty-1", ["ZA1", null, "Z B"]), "/api/tra-sau/con-duoc-dung?benDat=pty-1&dv=ZA1&dv=Z%20B&nhapTay=1");
});

test("màn nợ (ADR-0230 Đ1 mục 4): tách «Đang nợ theo hạn mức» và «Đang nợ Trả sau theo dịch vụ»; đối tác không thấy chữ «hạn mức»; không có nợ theo dịch vụ ⇒ giữ câu cũ", async () => {
  const { cauDangNo, dongTraSauCuaToi } = await import("./han-muc-tra-sau-hien-thi.ts");
  assert.equal(cauDangNo({ dangNo: 10_000_000, dangNoDichVu: 3_000_000 }, false), "Đang nợ theo hạn mức 10.000.000 ₫ · Đang nợ Trả sau theo dịch vụ 3.000.000 ₫");
  const dt = cauDangNo({ dangNo: 10_000_000, dangNoDichVu: 3_000_000 }, true);
  assert.equal(dt, "Đang nợ 13.000.000 ₫, trong đó đơn Trả sau theo dịch vụ 3.000.000 ₫");
  assert.doesNotMatch(dt, /hạn mức/i);
  assert.equal(cauDangNo({ dangNo: 500_000, dangNoDichVu: 0 }, false), "Đang nợ 500.000 ₫");
  assert.equal(cauDangNo({ dangNo: 500_000, dangNoDichVu: 0 }, true), "Đang nợ 500.000 ₫");
  const r = { coHanMuc: true, hanMuc: 10_000_000, gioTra: 24, gioAnHan: 0, dangNo: 10_000_000, dangNoDichVu: 3_000_000, conDuocDung: 0 };
  assert.equal(dongTraSauCuaToi(r, true).dong2, dt);
  assert.equal(dongTraSauCuaToi(r, false).dong2, "Đang nợ theo hạn mức 10.000.000 ₫ · Hạn mức khả dụng 0 ₫ · Đang nợ Trả sau theo dịch vụ 3.000.000 ₫");
});

test("Việc 11 (người chấm giao diện): đối tác không hạn mức nhưng có nợ / Trả sau theo dịch vụ ⇒ không hiện «Chưa cấp» (không có dòng một), không chữ «hạn mức»", async () => {
  const { dongTraSauCuaToi } = await import("./han-muc-tra-sau-hien-thi.ts");
  const r = { coHanMuc: false, hanMuc: null, gioTra: null, gioAnHan: null, dangNo: 0, dangNoDichVu: 200_000, conDuocDung: null };
  const dt = dongTraSauCuaToi(r, true);
  assert.equal(dt.dong1, null, "không có dòng một: dòng hai đã nói số nợ, kể cả phần Trả sau theo dịch vụ");
  assert.doesNotMatch(dt.dong2, /hạn mức|chưa cấp/i);
  // văn phòng: nói rõ là chưa cấp HẠN MỨC (vẫn còn Trả sau theo dịch vụ)
  assert.equal(dongTraSauCuaToi(r, false).dong1, "Chưa cấp hạn mức");
});

test("Việc 11: cauHanMucVanPhong — chưa có hạn mức mà còn nợ ⇒ «Chưa cấp hạn mức»; không nợ ⇒ giữ «Chưa cấp»; có hạn mức ⇒ như cauHanMuc", async () => {
  const { cauHanMucVanPhong, cauHanMuc } = await import("./han-muc-tra-sau-hien-thi.ts");
  const chua = { hanMuc: null, gioTra: null, gioAnHan: null };
  assert.equal(cauHanMucVanPhong({ ...chua, dangNo: 0, dangNoDichVu: 200_000 }), "Chưa cấp hạn mức");
  assert.equal(cauHanMucVanPhong({ ...chua, dangNo: 0, dangNoDichVu: 0 }), "Chưa cấp");
  const co = { hanMuc: 5_000_000, gioTra: 24, gioAnHan: 0, dangNo: 0, dangNoDichVu: 0 };
  assert.equal(cauHanMucVanPhong(co), cauHanMuc(co));
});

test("Việc 11: dongDangNo — văn phòng có nợ theo dịch vụ ⇒ hai dòng có tên đầy đủ (không cắt «Đang nợ», không chữ thường hoá tên khái niệm)", async () => {
  const { dongDangNo } = await import("./han-muc-tra-sau-hien-thi.ts");
  assert.deepEqual(dongDangNo({ dangNo: 0, dangNoDichVu: 200_000 }), ["Theo hạn mức: 0 ₫", "Trả sau theo dịch vụ: 200.000 ₫"]);
  assert.deepEqual(dongDangNo({ dangNo: 500_000, dangNoDichVu: 0 }), ["500.000 ₫"]);
});
