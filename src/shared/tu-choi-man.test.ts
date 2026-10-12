// Luật thuần màn tài xế cho Từ chối chuyến + Báo bận (kế hoạch A4 T9, G-A4-16).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauThayKhach, daiHanTuChoi, loiTuChoi, sangODatetime, tuODatetime } from "./tu-choi-man.ts";

const HAN = { ngay: "2027-03-12", gio: "00:30" };

test("daiHanTuChoi: chỉ chuyến chưa chạy CÓ hạn; còn hạn theo cờ máy chủ (không tự so giờ); quá hạn → câu gọi văn phòng khi có số, báo văn phòng khi chưa có số", () => {
  assert.equal(daiHanTuChoi({ trangThai: "PLANNED", tuChoiDuoc: false }, "2027-03-11"), null, "tài xế công ty — không vế hạn");
  assert.equal(daiHanTuChoi({ trangThai: "RUNNING", tuChoiDuoc: false, hanTuChoi: HAN }, "2027-03-11"), null);
  const con = daiHanTuChoi({ trangThai: "PLANNED", tuChoiDuoc: true, hanTuChoi: HAN, sdtVanPhong: "0258123456" }, "2027-03-11")!;
  assert.equal(con.loai, "con_han");
  assert.equal(con.tieuDe, "Từ chối được tới 00:30 12/03");
  assert.equal(con.sdt, "0258123456");
  const qua = daiHanTuChoi({ trangThai: "PLANNED", tuChoiDuoc: false, hanTuChoi: HAN, sdtVanPhong: "0258123456" }, "2027-03-11")!;
  assert.deepEqual([qua.loai, qua.tieuDe, qua.dong], ["qua_han", "Đã quá hạn từ chối (00:30 12/03)", ["Không chạy được thì gọi văn phòng ngay."]]);
  const khongSo = daiHanTuChoi({ trangThai: "PLANNED", tuChoiDuoc: false, hanTuChoi: HAN }, "2027-03-11")!;
  assert.equal(khongSo.sdt, null);
  assert.deepEqual(khongSo.dong, ["Không chạy được thì báo văn phòng ngay."]);
  assert.equal(daiHanTuChoi({ trangThai: "PLANNED", tuChoiDuoc: true, hanTuChoi: { ngay: "2028-01-02", gio: "07:00" } }, "2027-12-31")!.tieuDe, "Từ chối được tới 07:00 02/01/2028");
});

test("cauThayKhach, loiTuChoi, ô datetime-local", () => {
  assert.equal(cauThayKhach(undefined, "2027-03-11"), null);
  assert.equal(cauThayKhach(HAN, "2027-03-11"), "Bạn thấy tên khách và mã đơn từ 00:30 12/03.");
  assert.equal(loiTuChoi({ status: 409, code: "stale", message: "x" }).hanhDong, "doc_lai");
  assert.equal(loiTuChoi({ status: 409, code: "refuse_deadline_passed", message: "x" }).hanhDong, "doc_lai");
  assert.equal(loiTuChoi({ status: 409, code: "trip_not_planned", message: "x" }).hanhDong, "doc_lai");
  assert.equal(loiTuChoi({ status: 404, code: "not_found", message: "x" }).hanhDong, "ve_cuoc");
  assert.deepEqual(loiTuChoi({ status: 400, code: "invalid_input", message: "Chọn lý do." }), { cau: "Chọn lý do.", hanhDong: "giu" });
  for (const l of [loiTuChoi({ status: 409, code: "stale", message: "" }), loiTuChoi({ status: 404, code: "", message: "" })]) assert.doesNotMatch(l.cau, /[a-z]+_[a-z]+/);
  assert.deepEqual(tuODatetime("2027-03-12T08:05"), { ngay: "2027-03-12", gio: "08:05" });
  assert.equal(tuODatetime("2027-03-12 08:05"), null);
  assert.equal(tuODatetime(""), null);
  assert.equal(sangODatetime({ ngay: "2027-03-12", gio: "08:05" }), "2027-03-12T08:05");
});
