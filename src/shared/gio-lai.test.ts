// Luật thuần giờ lái (ADR-0055 VK2-B; kế hoạch Đợt 3 Task 3): thời lượng theo giờ xảy ra, cộng theo ngày chạy giờ VN, khử trùng id, hai loại cảnh báo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canhBaoGioLai, gioLaiTaiXe, thoiLuongChuyenMs, type ChuyenGioLai } from "./gio-lai.ts";

const D = "2026-10-05";
const ms = (hhmm: string, d = 0) => Date.parse(`${D}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const CS = { dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240 };
const c = (o: Partial<ChuyenGioLai> & { id: string }): ChuyenGioLai =>
  ({ ma: `CX-${o.id}`, taiXePartyId: "tx1", batDauMs: ms("08:00"), ketThucMs: ms("10:00"), ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null, ...o });

test("thoiLuongChuyenMs: chưa chạy = dự kiến; đang chạy = bây giờ − xuất bến; đã kết thúc = kết thúc thật − xuất bến (GIỜ XẢY RA — ADR-0050)", () => {
  assert.equal(thoiLuongChuyenMs(c({ id: "a" }), ms("12:00")), 2 * 3600e3);
  assert.equal(thoiLuongChuyenMs(c({ id: "b", trangThai: "RUNNING", xuatBenMs: ms("08:30") }), ms("09:00")), 30 * 60e3);
  assert.equal(thoiLuongChuyenMs(c({ id: "c", trangThai: "ENDED", xuatBenMs: ms("08:10"), ketThucThatMs: ms("11:40") }), ms("23:00")), 210 * 60e3);
});

test("ADR tiêu chí 4: ba chuyến tổng 8 giờ 10 phút cùng ngày chạy → vượt; đúng 8 giờ → KHÔNG vượt (K10); chuyến huỷ, chuyến tài xế khác không tính", () => {
  const ds = [
    c({ id: "1", batDauMs: ms("05:00"), ketThucMs: ms("08:00") }),
    c({ id: "2", batDauMs: ms("09:00"), ketThucMs: ms("12:00") }),
    c({ id: "3", batDauMs: ms("13:00"), ketThucMs: ms("15:10") }),
    c({ id: "h", batDauMs: ms("16:00"), ketThucMs: ms("20:00"), trangThai: "CANCELLED" }),
    c({ id: "k", taiXePartyId: "tx2", batDauMs: ms("16:00"), ketThucMs: ms("20:00") }),
  ];
  const r = gioLaiTaiXe("tx1", ds, D, CS, ms("00:00"));
  assert.equal(r.tongMs, 490 * 60e3);
  assert.equal(r.vuot, true);
  assert.deepEqual(r.chuyenIds, ["1", "2", "3"]);
  assert.equal(gioLaiTaiXe("tx1", ds.slice(0, 2).concat(c({ id: "4", batDauMs: ms("13:00"), ketThucMs: ms("15:00") })), D, CS, 0).vuot, false);
});

test("Review Focus 1: chuyến 23:30 D qua nửa đêm tính TRỌN cho D; chuyến 06:00 VN ngày D+1 (= 23:00 UTC ngày D) tính cho D+1, không cho D", () => {
  const dem = c({ id: "dem", batDauMs: ms("23:30"), ketThucMs: ms("03:30", 1) });
  const sang = c({ id: "sang", batDauMs: ms("06:00", 1), ketThucMs: ms("07:00", 1) });
  assert.equal(new Date(sang.batDauMs).toISOString().slice(0, 10), D, "tiền đề: 06:00 VN ngày D+1 là ngày D theo UTC");
  assert.equal(gioLaiTaiXe("tx1", [dem, sang], D, CS, 0).tongMs, 4 * 3600e3);
  assert.equal(gioLaiTaiXe("tx1", [dem, sang], "2026-10-06", CS, 0).tongMs, 3600e3);
});

test("trùng id (cùng chuyến ở hai danh sách) chỉ cộng một lần", () => {
  const a = c({ id: "a", batDauMs: ms("05:00"), ketThucMs: ms("10:00") });
  assert.equal(gioLaiTaiXe("tx1", [a, { ...a }], D, CS, 0).tongMs, 5 * 3600e3);
});

test("canhBaoGioLai (K9): GIO_LAI_VUOT gắn MỖI chuyến chưa kết thúc của tài xế-ngày vượt; chuyến > 4 giờ (chưa kết thúc) → CHUYEN_DAI_CAN_NGHI; chính sách rỗng → []", () => {
  const ds = [
    c({ id: "xong", trangThai: "ENDED", xuatBenMs: ms("04:00"), ketThucThatMs: ms("08:00"), batDauMs: ms("04:00"), ketThucMs: ms("08:00") }),
    c({ id: "dai", batDauMs: ms("09:00"), ketThucMs: ms("13:30") }),
  ];
  const cb = canhBaoGioLai(ds, CS, ms("08:30"));
  assert.deepEqual(cb.map((x) => `${x.loai}:${x.tripId}`).sort(), ["CHUYEN_DAI_CAN_NGHI:dai", "GIO_LAI_VUOT:dai"]);
  assert.equal(cb.find((x) => x.loai === "GIO_LAI_VUOT")!.tongPhut, 510);
  assert.deepEqual(canhBaoGioLai(ds, null, 0), []);
  assert.deepEqual(canhBaoGioLai(ds, CS, ms("08:30"), new Set(["khac"])), [], "chiChuyen lọc chuyến được gắn cảnh báo");
  // Đúng 4 giờ → không nhắc nghỉ (K10: "quá" = lớn hơn hẹn).
  assert.deepEqual(canhBaoGioLai([c({ id: "bon", batDauMs: ms("09:00"), ketThucMs: ms("13:00") })], CS, 0), []);
  // Chuyến không có tài xế → không cảnh báo.
  assert.deepEqual(canhBaoGioLai([c({ id: "trong", taiXePartyId: null, batDauMs: ms("09:00"), ketThucMs: ms("14:00") })], CS, 0), []);
});
