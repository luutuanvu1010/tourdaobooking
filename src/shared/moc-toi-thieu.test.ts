// Mốc tối thiểu (ADR-0049 D2 "Mốc tối thiểu 6 giờ"; C17, C18; ĐP2(i)–(v); Q2 = (a)) — luật THUẦN dùng chung máy chủ + màn hình (kế hoạch mục 1.1, Task A3,
// TC-16, TC-42 phần luật thuần). Ranh giới: còn ĐÚNG mốc (360 phút) là ĐẠT; thiếu một giây là DƯỚI mốc. Ngưỡng chuỗi `nguongMocVn` (dùng trong câu SQL xác
// nhận đơn — I15) và `kiemMocDat` (máy chủ + màn hình) là HAI cách nói của MỘT luật — bài tương đương dưới đây khoá điều đó (bẫy "hai luật", Đợt E).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LENH_KHOA_THEO_MOC, LENH_XEP, kiemMocDat, kiemMocXep, mucMoc, nguongMocVn } from "./moc-toi-thieu.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const chang = (ngayDon: string | null, gioDon: string | null, datGap = false) => ({ ngayDon, gioDon, datGap });

test("nguongMocVn: chuỗi 'YYYY-MM-DD HH:MM' giờ VN của (bây giờ + mốc), làm tròn LÊN phút; qua nửa đêm; ca 00:00–07:00 VN; mốc 0 = tắt → null", () => {
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20"), 360), "2026-09-30 08:20");
  assert.equal(nguongMocVn(ms("2026-09-30", "20:15"), 360), "2026-10-01 02:15", "qua nửa đêm");
  assert.equal(nguongMocVn(Date.parse("2026-09-29T17:05:00.000Z"), 60), "2026-09-30 01:05", "00:05 VN (17:05 UTC hôm trước) + 60 phút");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20") + 30_000, 360), "2026-09-30 08:21", "có giây lẻ → làm tròn lên phút sau");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20") + 1, 360), "2026-09-30 08:21");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20"), 0), null, "G2: mốc 0 = tắt mốc — không có ngưỡng");
});

test("TC-16 kiemMocDat ranh giới ĐÚNG mốc: 360 phút → đạt; 359 phút → dưới mốc; thiếu MỘT giây → dưới mốc", () => {
  const leg = chang("2026-09-30", "08:20");
  const legMs = ms("2026-09-30", "08:20");
  assert.deepEqual(kiemMocDat(leg, legMs - 360 * PHUT, 360), { duoiMoc: false, lyDo: "DU_MOC", phutConLai: 360 });
  assert.deepEqual(kiemMocDat(leg, legMs - 359 * PHUT, 360), { duoiMoc: true, phutConLai: 359 });
  const r = kiemMocDat(leg, legMs - 360 * PHUT + 1000, 360);
  assert.equal(r.duoiMoc, true, "5 giờ 59 phút 59 giây là dưới mốc");
  assert.deepEqual(kiemMocDat(leg, legMs - 400 * PHUT, 360), { duoiMoc: false, lyDo: "DU_MOC", phutConLai: 400 });
  assert.deepEqual(kiemMocDat(leg, legMs - 250 * PHUT, 360), { duoiMoc: true, phutConLai: 250 }, "02:20 cho giờ đón 06:30 kiểu: 4 giờ 10 phút");
  assert.deepEqual(kiemMocDat(leg, legMs + 30 * PHUT, 360), { duoiMoc: true, phutConLai: -30 }, "giờ đón đã qua");
});

test("kiemMocDat: chặng chưa chốt giờ (hoặc chưa có ngày) → KHÔNG kiểm (I13); chặng đặt gấp → qua; mốc 0 → tắt", () => {
  const bayGio = ms("2026-09-30", "05:00");
  assert.deepEqual(kiemMocDat(chang("2026-09-30", null), bayGio, 360), { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null });
  assert.deepEqual(kiemMocDat(chang(null, "06:30"), bayGio, 360), { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null });
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "06:30", true), bayGio, 360), { duoiMoc: false, lyDo: "DAT_GAP", phutConLai: 90 });
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "06:30"), bayGio, 0), { duoiMoc: false, lyDo: "TAT_MOC", phutConLai: 90 });
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "04:00"), bayGio, 0), { duoiMoc: false, lyDo: "TAT_MOC", phutConLai: -60 }, "mốc tắt: giờ đã qua cũng không chặn");
});

test("MỘT luật, hai cách nói: `ngày giờ` < nguongMocVn(bây giờ, mốc) ⇔ kiemMocDat(...).duoiMoc — bây giờ có giây lẻ, giờ đón 00:00–07:00 VN, qua nửa đêm", () => {
  const nows = [
    Date.parse("2026-09-29T17:00:00.000Z"), // 00:00:00 VN 30/09
    Date.parse("2026-09-29T17:00:00.001Z"),
    Date.parse("2026-09-29T19:20:37.250Z"), // 02:20:37 VN
    Date.parse("2026-09-30T13:59:59.999Z"), // 20:59:59 VN
    Date.parse("2026-09-30T16:30:30.000Z"), // 23:30:30 VN
  ];
  const ngays = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
  let so = 0;
  for (const now of nows) {
    for (const phut of [1, 59, 120, 359, 360, 361, 720, 1440, 2880]) {
      const nguong = nguongMocVn(now, phut)!;
      for (const d of ngays) {
        for (let m = 0; m < 24 * 60; m += 13) {
          const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
          const chuoi = `${d} ${t}` < nguong;
          const luat = kiemMocDat(chang(d, t), now, phut).duoiMoc;
          assert.equal(chuoi, luat, `now=${new Date(now).toISOString()} mốc=${phut} chặng=${d} ${t} ngưỡng=${nguong}`);
          so++;
        }
      }
    }
  }
  assert.ok(so > 10_000, `đủ ca: ${so}`);
});

test("kiemMocXep: trong mốc khoá 'ai đi xe nào', đổi xe, đổi tài xế, huỷ chuyến còn khách; KHÔNG khoá đổi thứ tự điểm, giờ xe tới (ĐP2(iii))", () => {
  const batDau = ms("2026-09-30", "05:50");
  const trongMoc = batDau - 359 * PHUT;
  assert.deepEqual([...LENH_KHOA_THEO_MOC].sort(), ["DOI_DEN", "DOI_DI", "DOI_TAI_XE", "DOI_XE", "HUY_CO_KHACH", "RUT", "XEP"]);
  for (const loai of LENH_KHOA_THEO_MOC) {
    assert.deepEqual(kiemMocXep({ batDauMs: batDau }, trongMoc, 360, { loai }), { canPhaLe: true, phutConLai: 359 }, loai);
  }
  for (const loai of ["DOI_THU_TU", "DOI_GIO_XE_TOI", "HUY_KHONG_KHACH"] as const) {
    assert.deepEqual(kiemMocXep({ batDauMs: batDau }, trongMoc, 360, { loai }), { canPhaLe: false, lyDo: "LENH_KHONG_KHOA", phutConLai: 359 }, loai);
  }
  // Ngoài mốc (đúng 360 phút) → không khoá gì.
  for (const loai of LENH_XEP) {
    assert.equal(kiemMocXep({ batDauMs: batDau }, batDau - 360 * PHUT, 360, { loai }).canPhaLe, false, loai);
  }
  // Mốc tắt (0) → không khoá gì, kể cả chuyến đã tới giờ.
  for (const loai of LENH_XEP) assert.equal(kiemMocXep({ batDauMs: batDau }, batDau + 5 * PHUT, 0, { loai }).canPhaLe, false, loai);
});

test("TC-42 (Q2 = (a)) kiemMocXep: TẠO chuyến trong mốc không cần phá lệ; xếp CHẶNG ĐẶT GẤP qua; xếp chặng chưa đặt gấp, đổi xe / tài xế sau khi tạo → cần phá lệ", () => {
  const batDau = ms("2026-09-30", "05:50");
  const now = ms("2026-09-30", "02:30");
  assert.deepEqual(kiemMocXep({ batDauMs: batDau }, now, 360, { loai: "TAO" }), { canPhaLe: false, lyDo: "TAO_CHUYEN", phutConLai: 200 });
  assert.deepEqual(kiemMocXep({ batDauMs: batDau }, now, 360, { loai: "XEP", datGap: true }), { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: 200 });
  assert.deepEqual(kiemMocXep({ batDauMs: batDau }, now, 360, { loai: "DOI_DEN", datGap: true }), { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: 200 });
  assert.deepEqual(kiemMocXep({ batDauMs: batDau }, now, 360, { loai: "XEP" }), { canPhaLe: true, phutConLai: 200 });
  assert.deepEqual(kiemMocXep({ batDauMs: batDau }, now, 360, { loai: "XEP", datGap: false }), { canPhaLe: true, phutConLai: 200 });
  // Đặt gấp chỉ miễn cho CHÍNH chặng đó khi vào xe — rút / dời khách khỏi chuyến, đổi xe, đổi tài xế vẫn khoá (datGap không có tác dụng).
  for (const loai of ["RUT", "DOI_DI", "DOI_XE", "DOI_TAI_XE", "HUY_CO_KHACH"] as const) {
    assert.equal(kiemMocXep({ batDauMs: batDau }, now, 360, { loai, datGap: true }).canPhaLe, true, loai);
  }
});

test("mucMoc: quá mốc (dưới mốc) → đỏ; sát mốc (dưới mốc + cảnh báo) → vàng; còn lại bình thường; ranh giới đúng phút", () => {
  const leg = ms("2026-09-30", "12:00");
  assert.equal(mucMoc(leg, leg - 359 * PHUT, 360, 120), "QUA_MOC");
  assert.equal(mucMoc(leg, leg - 360 * PHUT, 360, 120), "SAT_MOC");
  assert.equal(mucMoc(leg, leg - 479 * PHUT, 360, 120), "SAT_MOC");
  assert.equal(mucMoc(leg, leg - 480 * PHUT, 360, 120), "BINH_THUONG");
  assert.equal(mucMoc(leg, leg - 100 * PHUT, 0, 120), "SAT_MOC", "mốc tắt vẫn cảnh báo sát giờ theo phần cảnh báo");
  assert.equal(mucMoc(leg, leg - 100 * PHUT, 0, 0), "BINH_THUONG");
});
