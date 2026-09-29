// GIỜ XẢY RA khi văn phòng bấm thay (ADR-0050 VK1-A; kế hoạch I33–I35, TC-46): hàm thuần `kiemGioXayRa` — năm vế kẹp của ADR-0050 + chặn khai giờ cho
// loại sự kiện không phải tiến độ. Mỗi ca một mã; bỏ vế tương ứng trong hàm → ca đó đỏ (P16). Giờ trong bài là giờ Việt Nam.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MA_GIO_XAY_RA, NHAN_GIO_XAY_RA, kiemGioXayRa, type KiemGioXayRaVao, type SuKienDaCo } from "./gio-xay-ra.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const t = (hhmm: string) => vnLocalToMs("2026-09-30", hhmm)!;
const sk = (loai: SuKienDaCo["loai"], xayRa: string, ghiNhan = xayRa, v: Partial<SuKienDaCo> = {}): SuKienDaCo => ({
  loai, xayRaMs: t(xayRa), ghiNhanMs: t(ghiNhan), diemId: null, suatId: null, ...v,
});
/** Chuyến đã xuất bến 07:00 (ghi nhận 07:00), tạo lúc 05:00, xếp khách lúc 05:10. */
const NEN: SuKienDaCo[] = [sk("CREATED", "05:00"), sk("ALLOCATED", "05:10"), sk("DEPARTED", "07:00")];
const vao = (v: Partial<KiemGioXayRaVao>): KiemGioXayRaVao => ({
  loai: "PASSENGER_BOARDED", khai: true, xayRaMs: t("07:31"), ghiNhanMs: t("07:45"), kepLuiPhut: 180, suKien: NEN, diemId: "d-1", suatId: "s-1",
  suatMoTuMs: t("05:10"), ketThucChuyenTruocMs: [], ...v,
});
const chan = (v: Partial<KiemGioXayRaVao>) => {
  const r = kiemGioXayRa(vao(v));
  return r.ok ? [] : r.chan;
};

test("mã đóng + nhãn tiếng Việt (không lộ mã)", () => {
  assert.deepEqual([...MA_GIO_XAY_RA], [
    "LOAI_KHONG_KHAI_GIO", "TUONG_LAI", "LUI_QUA_KEP", "DAO_THU_TU", "CHONG_CHUYEN_TRUOC", "TRUOC_SUA_KE_HOACH", "TRUOC_DOI_THU_TU", "TRUOC_MO_SUAT",
  ]);
  for (const m of MA_GIO_XAY_RA) {
    assert.ok(NHAN_GIO_XAY_RA[m].trim().length > 0, m);
    assert.doesNotMatch(NHAN_GIO_XAY_RA[m], /[A-Z]{2,}_/, m);
  }
});

test("ví dụ của ADR-0050: tài xế báo 'đón xong lúc 7:31', văn phòng bấm lúc 7:45 → đạt; máy chủ tự ghi (không khai) → đạt", () => {
  assert.deepEqual(kiemGioXayRa(vao({})), { ok: true });
  assert.deepEqual(kiemGioXayRa(vao({ khai: false, xayRaMs: t("07:45") })), { ok: true });
});

test("TC-46 LOAI_KHONG_KHAI_GIO: khai giờ cho sự kiện kế hoạch / đổi thứ tự → từ chối; tám loại tiến độ → không vướng mã này", () => {
  for (const loai of ["CREATED", "ALLOCATED", "ALLOCATION_STOP_CHANGED", "STOPS_REORDERED", "CANCELLED"] as const) {
    assert.ok(chan({ loai, diemId: null, suatId: null }).includes("LOAI_KHONG_KHAI_GIO"), loai);
  }
  assert.ok(!chan({}).includes("LOAI_KHONG_KHAI_GIO"));
  assert.ok(!chan({ loai: "STOPS_REORDERED", khai: false, xayRaMs: t("07:45"), diemId: null, suatId: null }).includes("LOAI_KHONG_KHAI_GIO"), "máy chủ tự ghi thì không xét");
});

test("TC-46 TUONG_LAI: giờ xảy ra SAU giờ ghi nhận (dù 1 ms) → chặn; bằng → đạt", () => {
  assert.deepEqual(chan({ xayRaMs: t("07:45") + 1 }), ["TUONG_LAI"]);
  assert.deepEqual(chan({ xayRaMs: t("07:45") }), []);
});

test("TC-46 LUI_QUA_KEP: sớm hơn ghi nhận − kẹp → chặn; đúng ranh giới kẹp → đạt; kẹp đọc từ chính sách (tham số)", () => {
  const ghi = t("11:00"); // 180 phút trước = 08:00, sau xuất bến 07:00 (không vướng DAO_THU_TU)
  assert.deepEqual(chan({ ghiNhanMs: ghi, xayRaMs: ghi - 180 * PHUT }), [], "đúng 180 phút");
  assert.deepEqual(chan({ ghiNhanMs: ghi, xayRaMs: ghi - 180 * PHUT - 1 }), ["LUI_QUA_KEP"]);
  assert.deepEqual(chan({ ghiNhanMs: ghi, xayRaMs: ghi - 60 * PHUT, kepLuiPhut: 30 }), ["LUI_QUA_KEP"], "kẹp 30 phút của chính sách khác");
});

test("TC-46 DAO_THU_TU: xuất bến sau một tiến độ đã có; đã tới sau đã đón của điểm đó; đã đón sau đã trả của cùng suất; kết thúc trước một tiến độ đã có; tiến độ trước xuất bến", () => {
  // xuất bến khai 07:20 khi đã có "đã tới" xảy ra 07:10 (khung: chuyến CHƯA xuất bến ở nền này)
  const chuaXuatBen = [sk("CREATED", "05:00"), sk("STOP_ARRIVED", "07:10", "07:15", { diemId: "d-1" })];
  assert.deepEqual(chan({ loai: "DEPARTED", xayRaMs: t("07:20"), ghiNhanMs: t("07:50"), suKien: chuaXuatBen, diemId: null, suatId: null }), ["DAO_THU_TU"]);
  // đã tới d-1 khai 07:35 khi "đã đón" ở d-1 xảy ra 07:31
  const coDon = [...NEN, sk("PASSENGER_BOARDED", "07:31", "07:45", { diemId: "d-1", suatId: "s-1" })];
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", xayRaMs: t("07:35"), ghiNhanMs: t("07:50"), suKien: coDon, suatId: null }), ["DAO_THU_TU"]);
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", xayRaMs: t("07:30"), ghiNhanMs: t("07:50"), suKien: coDon, suatId: null }), [], "tới 07:30, đón 07:31 → đúng thứ tự");
  // đã đón ở d-1 khai 07:20 khi "đã tới" d-1 xảy ra 07:25
  const coToi = [...NEN, sk("STOP_ARRIVED", "07:25", "07:26", { diemId: "d-1" })];
  assert.deepEqual(chan({ xayRaMs: t("07:20"), suKien: coToi }), ["DAO_THU_TU"]);
  // đã đón s-1 khai 08:10 khi "đã trả" s-1 xảy ra 08:00
  const coTra = [...NEN, sk("PASSENGER_DROPPED", "08:00", "08:01", { diemId: "d-9", suatId: "s-1" })];
  assert.deepEqual(chan({ xayRaMs: t("08:10"), ghiNhanMs: t("08:20"), suKien: coTra }), ["DAO_THU_TU"]);
  // đã trả s-1 khai 07:40 khi "đã đón" s-1 xảy ra 07:50
  const coDon2 = [...NEN, sk("PASSENGER_BOARDED", "07:50", "07:51", { diemId: "d-1", suatId: "s-1" })];
  assert.deepEqual(chan({ loai: "PASSENGER_DROPPED", diemId: "d-9", xayRaMs: t("07:40"), ghiNhanMs: t("08:00"), suKien: coDon2 }), ["DAO_THU_TU"]);
  // kết thúc khai 08:00 khi "đã trả" xảy ra 08:10
  const coTra2 = [...NEN, sk("PASSENGER_DROPPED", "08:10", "08:11", { diemId: "d-9", suatId: "s-1" })];
  assert.deepEqual(chan({ loai: "ENDED", xayRaMs: t("08:00"), ghiNhanMs: t("08:30"), suKien: coTra2, diemId: null, suatId: null }), ["DAO_THU_TU"]);
  assert.deepEqual(chan({ loai: "ENDED", xayRaMs: t("08:10"), ghiNhanMs: t("08:30"), suKien: coTra2, diemId: null, suatId: null }), [], "kết thúc = tiến độ cuối → đạt");
  // tiến độ khai 06:59 khi xuất bến xảy ra 07:00
  assert.deepEqual(chan({ xayRaMs: t("06:59") }), ["DAO_THU_TU"]);
});

test("TC-46 CHONG_CHUYEN_TRUOC: xuất bến sớm hơn giờ XẢY RA kết thúc của chuyến liền trước cùng xe / cùng tài xế → chặn; bằng → đạt", () => {
  const v = { loai: "DEPARTED" as const, suKien: [sk("CREATED", "05:00")], diemId: null, suatId: null, ghiNhanMs: t("08:30") };
  assert.deepEqual(chan({ ...v, xayRaMs: t("08:10"), ketThucChuyenTruocMs: [t("07:50"), t("08:15")] }), ["CHONG_CHUYEN_TRUOC"]);
  assert.deepEqual(chan({ ...v, xayRaMs: t("08:15"), ketThucChuyenTruocMs: [t("07:50"), t("08:15")] }), []);
});

test("TC-46 TRUOC_SUA_KE_HOACH (ví dụ ADR-0050): 7:10 đổi tài xế (ghi nhận); 7:45 văn phòng khai 'xuất bến 7:00' → chặn; khai 7:10 → đạt", () => {
  const ke = [sk("CREATED", "05:00"), sk("UPDATED", "07:10")];
  const v = { loai: "DEPARTED" as const, suKien: ke, diemId: null, suatId: null, ghiNhanMs: t("07:45") };
  assert.deepEqual(chan({ ...v, xayRaMs: t("07:00") }), ["TRUOC_SUA_KE_HOACH"]);
  assert.deepEqual(chan({ ...v, xayRaMs: t("07:10") }), []);
  // so với GIỜ GHI NHẬN của sự kiện trước, không phải giờ xảy ra của nó
  const khaiLui = [sk("CREATED", "05:00"), sk("ALLOCATED", "05:10", "07:20")];
  assert.deepEqual(chan({ ...v, suKien: khaiLui, xayRaMs: t("07:15") }), ["TRUOC_SUA_KE_HOACH"]);
});

test("TC-46 TRUOC_DOI_THU_TU: đã tới sớm hơn giờ ghi nhận lần đổi thứ tự điểm cuối → chặn", () => {
  const coDoi = [...NEN, sk("STOPS_REORDERED", "07:20")];
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", xayRaMs: t("07:10"), ghiNhanMs: t("07:40"), suKien: coDoi, suatId: null }), ["TRUOC_DOI_THU_TU"]);
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", xayRaMs: t("07:20"), ghiNhanMs: t("07:40"), suKien: coDoi, suatId: null }), []);
});

test("GA-25 (chủ chốt 29/9, Trả lời lần 11 — \"Chặn\"): đã tới điểm TRẢ ≤ đã trả khách ở điểm đó, hai chiều; khai ngược → DAO_THU_TU", () => {
  // đã trả ở d-9 khai 08:00 khi "đã tới" d-9 xảy ra 08:05
  const coToiXuong = [...NEN, sk("PASSENGER_BOARDED", "07:31", "07:32", { diemId: "d-1", suatId: "s-1" }), sk("STOP_ARRIVED", "08:05", "08:06", { diemId: "d-9" })];
  assert.deepEqual(chan({ loai: "PASSENGER_DROPPED", diemId: "d-9", xayRaMs: t("08:00"), ghiNhanMs: t("08:20"), suKien: coToiXuong }), ["DAO_THU_TU"]);
  assert.deepEqual(chan({ loai: "PASSENGER_DROPPED", diemId: "d-9", xayRaMs: t("08:05"), ghiNhanMs: t("08:20"), suKien: coToiXuong }), [], "trả = tới → đạt");
  // đã tới d-9 khai 08:10 khi "đã trả" ở d-9 xảy ra 08:05
  const coTraXuong = [...NEN, sk("PASSENGER_BOARDED", "07:31", "07:32", { diemId: "d-1", suatId: "s-1" }), sk("PASSENGER_DROPPED", "08:05", "08:06", { diemId: "d-9", suatId: "s-1" })];
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", diemId: "d-9", suatId: null, xayRaMs: t("08:10"), ghiNhanMs: t("08:20"), suKien: coTraXuong }), ["DAO_THU_TU"]);
  assert.deepEqual(chan({ loai: "STOP_ARRIVED", diemId: "d-9", suatId: null, xayRaMs: t("08:05"), ghiNhanMs: t("08:20"), suKien: coTraXuong }), []);
});

test("TC-46 TRUOC_MO_SUAT: đã đón / vắng / khách huỷ / đã trả sớm hơn lúc MỞ suất → chặn", () => {
  for (const loai of ["PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED"] as const) {
    assert.deepEqual(chan({ loai, suatMoTuMs: t("07:35"), xayRaMs: t("07:31") }), ["TRUOC_MO_SUAT"], loai);
    assert.deepEqual(chan({ loai, suatMoTuMs: t("07:31"), xayRaMs: t("07:31") }), [], loai);
  }
});
