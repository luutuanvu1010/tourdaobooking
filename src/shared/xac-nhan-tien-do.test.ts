// Kiểu A (kiểm theo vai 2/10 — lộ trình 3/10 V1.4): hộp xác nhận "Đã trả cả điểm", "Kết thúc chuyến" ở màn tài xế + dòng "Vừa ghi … — Sai? Báo văn phòng"
// sau mỗi lệnh suất một chạm. Hàm thuần — giao diện chỉ vẽ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dongVuaGhi, hopKetThuc, hopTraCaDiem } from "./xac-nhan-tien-do.ts";

test("hopTraCaDiem: nêu nơi trả + số khách sẽ ghi 'Đã trả'; nút nói rõ số khách", () => {
  const h = hopTraCaDiem({ tenNoi: "Bến tàu du lịch Nha Trang", soKhach: 6 });
  assert.equal(h.tieuDe, "Trả khách ở Bến tàu du lịch Nha Trang?");
  assert.deepEqual(h.dong, [["Điểm trả", "Bến tàu du lịch Nha Trang"], ["Khách xuống", "6 khách đang trên xe"]]);
  assert.equal(h.canhBao, null);
  assert.equal(h.nutXacNhan, "Đã trả 6 khách");
  assert.match(h.ghiChu, /báo văn phòng/);
});

test("hopTraCaDiem: HT-02 — chưa có khách nào trên xe xuống ở đây → cảnh báo, nút chỉ ghi 'đã tới' (chữ ngắn — vừa khổ 390)", () => {
  const h = hopTraCaDiem({ tenNoi: "Bến tàu", soKhach: 0 });
  assert.equal(h.dong[1]![1], "Chưa có khách nào trên xe xuống ở điểm này");
  assert.match(h.canhBao!, /chưa đón ai xuống ở điểm này/);
  assert.equal(h.nutXacNhan, "Vẫn ghi đã tới");
});

test("hopKetThuc: tóm tắt kết quả khách (bỏ người đi kèm), nút 'Kết thúc chuyến'; kết thúc không tự mở lại được", () => {
  const s = (trangThai: string, loai: "PASSENGER" | "CREW" = "PASSENGER") => ({ trangThai, loai });
  const h = hopKetThuc({ ma: "CX-0210-03", suat: [s("DROPPED"), s("DROPPED"), s("NO_SHOW"), s("CANCELLED_AT_STOP"), s("DROPPED", "CREW")] });
  assert.equal(h.tieuDe, "Kết thúc CX-0210-03?");
  assert.deepEqual(h.dong, [["Đã trả", "2 khách"], ["Vắng", "1 khách"], ["Khách đã huỷ", "1 khách"]]);
  assert.equal(h.nutXacNhan, "Kết thúc chuyến");
  assert.match(h.ghiChu, /không mở lại được/);
  assert.deepEqual(hopKetThuc({ ma: "CX-1", suat: [] }).dong, [["Đã trả", "0 khách"], ["Vắng", "0 khách"], ["Khách đã huỷ", "0 khách"]]);
});

test("dongVuaGhi: 'Vừa ghi: <tên> — <kết quả>. Sai? Báo văn phòng.'; tên có dãy số dài bị che; lệnh lạ → null", () => {
  assert.equal(dongVuaGhi("don", "Khách 1"), "Vừa ghi: Khách 1 — Đã đón. Sai? Báo văn phòng.");
  assert.equal(dongVuaGhi("vang", "Nguyễn Văn A"), "Vừa ghi: Nguyễn Văn A — Vắng. Sai? Báo văn phòng.");
  assert.equal(dongVuaGhi("khach-huy", "Khách 2"), "Vừa ghi: Khách 2 — Khách đã huỷ. Sai? Báo văn phòng.");
  assert.equal(dongVuaGhi("di-kem-don", "HDV Lan"), "Vừa ghi: HDV Lan — Đã lên xe. Sai? Báo văn phòng.");
  assert.equal(dongVuaGhi("di-kem-tra", "HDV Lan"), "Vừa ghi: HDV Lan — Đã xuống. Sai? Báo văn phòng.");
  assert.doesNotMatch(dongVuaGhi("don", "Khách 0903123456")!, /0903123456/);
  assert.equal(dongVuaGhi("la" as never, "x"), null);
});
