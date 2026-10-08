// Mốc tối thiểu (ADR-0049 D2 "Mốc tối thiểu 6 giờ"; C17, C18; ĐP2(i)–(v); Q2 = (a)) — luật THUẦN dùng chung máy chủ + màn hình (kế hoạch mục 1.1, Task A3,
// TC-16, TC-42 phần luật thuần). Ranh giới: còn ĐÚNG mốc (360 phút) là ĐẠT; thiếu một giây là DƯỚI mốc. Ngưỡng chuỗi `nguongMocVn` (dùng trong câu SQL xác
// nhận đơn — I15) và `kiemMocDat` (máy chủ + màn hình) là HAI cách nói của MỘT luật — bài tương đương dưới đây khoá điều đó (bẫy "hai luật", Đợt E).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LENH_KHOA_THEO_MOC, LENH_XEP, batDauSomNhatSauDoiGio, chuyenDuoiMoc, duQuyen, duoiMocKhiSua, gioXetMocXep, gioXetSuaChuyen, kiemMocDat, kiemMocXep, lopCanCho, lopCuaLuat,
  lopVuotMoc, lopVuotNghiCamKet, mucMoc, nguongMocVn, type LenhVuotMoc, type LopVuot,
} from "./moc-toi-thieu.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const chang = (ngayDon: string | null, gioDon: string | null, datGap = false) => ({ ngayDon, gioDon, datGap });
/** Chuyến cho luật mốc lúc xếp: giờ xuất bến HIỆN TẠI + giờ xuất bến dự kiến SỚM NHẤT từng có (R-P6 — mặc định bằng giờ hiện tại). */
const cx = (batDauMs: number, batDauSomNhatMs = batDauMs) => ({ batDauMs, batDauSomNhatMs });

test("nguongMocVn: chuỗi 'YYYY-MM-DD HH:MM' giờ VN của (bây giờ + mốc), làm tròn LÊN phút; qua nửa đêm; ca 00:00–07:00 VN; KHÔNG có nhánh 'mốc 0 = tắt'", () => {
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20"), 360), "2026-09-30 08:20");
  assert.equal(nguongMocVn(ms("2026-09-30", "20:15"), 360), "2026-10-01 02:15", "qua nửa đêm");
  assert.equal(nguongMocVn(Date.parse("2026-09-29T17:05:00.000Z"), 60), "2026-09-30 01:05", "00:05 VN (17:05 UTC hôm trước) + 60 phút");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20") + 30_000, 360), "2026-09-30 08:21", "có giây lẻ → làm tròn lên phút sau");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20") + 1, 360), "2026-09-30 08:21");
  // GA-5 (chủ trả lời lần 9: "Không cho tắt"): mốc phải > 0 (CHECK ở CSDL + kiemChinhSachMoi). Hàm không còn nhánh "0 = tắt → null": nếu dữ liệu hỏng
  // lọt con số 0 thì ngưỡng = bây giờ (giờ đã qua vẫn là dưới mốc) — không bao giờ "không có ngưỡng".
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20"), 0), "2026-09-30 02:20", "không còn trả null vì 0");
  assert.equal(nguongMocVn(ms("2026-09-30", "02:20"), 1), "2026-09-30 02:21");
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

test("kiemMocDat: chặng chưa chốt giờ (hoặc chưa có ngày) → KHÔNG kiểm (I13); chặng đặt gấp → qua; KHÔNG có nhánh 'mốc 0 = tắt' (GA-5)", () => {
  const bayGio = ms("2026-09-30", "05:00");
  assert.deepEqual(kiemMocDat(chang("2026-09-30", null), bayGio, 360), { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null });
  assert.deepEqual(kiemMocDat(chang(null, "06:30"), bayGio, 360), { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null });
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "06:30", true), bayGio, 360), { duoiMoc: false, lyDo: "DAT_GAP", phutConLai: 90 });
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "06:30"), bayGio, 1), { duoiMoc: false, lyDo: "DU_MOC", phutConLai: 90 }, "mốc 1 phút: còn 90 phút là đạt");
  assert.deepEqual(kiemMocDat(chang("2026-09-30", "04:00"), bayGio, 0), { duoiMoc: true, phutConLai: -60 }, "giờ đã qua luôn dưới mốc, kể cả khi dữ liệu hỏng lọt số 0");
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
    assert.deepEqual(kiemMocXep(cx(batDau), trongMoc, 360, { loai }), { canPhaLe: true, phutConLai: 359 }, loai);
  }
  for (const loai of ["DOI_THU_TU", "DOI_GIO_XE_TOI", "HUY_KHONG_KHACH"] as const) {
    assert.deepEqual(kiemMocXep(cx(batDau), trongMoc, 360, { loai }), { canPhaLe: false, lyDo: "LENH_KHONG_KHOA", phutConLai: 359 }, loai);
  }
  // Ngoài mốc (đúng 360 phút) → không khoá gì.
  for (const loai of LENH_XEP) {
    assert.equal(kiemMocXep(cx(batDau), batDau - 360 * PHUT, 360, { loai }).canPhaLe, false, loai);
  }
  // Không còn nhánh "mốc 0 = tắt" (GA-5): mốc 1 phút, chuyến còn 30 phút → không khoá; chuyến đã tới giờ → khoá.
  for (const loai of LENH_KHOA_THEO_MOC) {
    assert.equal(kiemMocXep(cx(batDau), batDau - 30 * PHUT, 1, { loai }).canPhaLe, false, loai);
    assert.equal(kiemMocXep(cx(batDau), batDau + 5 * PHUT, 1, { loai }).canPhaLe, true, loai);
  }
});

test("R-P6 khoá DÍNH (Q-A4-1; chủ trả lời lần 9 \"Khoá dính\"): chuyến đã vào vùng mốc thì GIỮ khoá dù giờ xuất bến bị dời ra xa — mốc tính theo min(giờ sớm nhất từng có, giờ hiện tại)", () => {
  const goc = ms("2026-09-30", "05:50");
  const doiRa = ms("2026-09-30", "12:00");
  const now = ms("2026-09-30", "02:30");
  // Chuyến gốc 05:50 (đã vào vùng lúc 02:30), bị dời ra 12:00: TRƯỚC R-P6 (chỉ giờ hiện tại) là ngoài mốc — nay mọi lệnh bị khoá vẫn khoá.
  for (const loai of LENH_KHOA_THEO_MOC) {
    assert.deepEqual(kiemMocXep(cx(doiRa, goc), now, 360, { loai }), { canPhaLe: true, phutConLai: 200 }, loai);
  }
  // Lệnh không khoá vẫn không khoá; chặng đặt gấp vẫn được xếp (ĐP2(ii)); tạo chuyến mới không khoá (Q2 = (a)).
  for (const loai of ["DOI_THU_TU", "DOI_GIO_XE_TOI", "HUY_KHONG_KHACH"] as const) assert.equal(kiemMocXep(cx(doiRa, goc), now, 360, { loai }).canPhaLe, false, loai);
  assert.equal(kiemMocXep(cx(doiRa, goc), now, 360, { loai: "XEP", datGap: true }).canPhaLe, false);
  // Chuyến CHƯA BAO GIỜ vào vùng (giờ sớm nhất cũng xa) → không khoá.
  assert.equal(kiemMocXep(cx(doiRa, doiRa), now, 360, { loai: "XEP" }).canPhaLe, false);
  // Giờ sớm nhất lệch (lớn hơn giờ hiện tại) → vẫn lấy giờ hiện tại: không bao giờ lỏng hơn luật cũ.
  assert.equal(kiemMocXep(cx(goc, doiRa), now, 360, { loai: "XEP" }).canPhaLe, true);
});

test("TC-42 (Q2 = (a)) kiemMocXep: TẠO chuyến trong mốc không cần phá lệ; xếp CHẶNG ĐẶT GẤP qua; xếp chặng chưa đặt gấp, đổi xe / tài xế sau khi tạo → cần phá lệ", () => {
  const batDau = ms("2026-09-30", "05:50");
  const now = ms("2026-09-30", "02:30");
  assert.deepEqual(kiemMocXep(cx(batDau), now, 360, { loai: "TAO" }), { canPhaLe: false, lyDo: "TAO_CHUYEN", phutConLai: 200 });
  assert.deepEqual(kiemMocXep(cx(batDau), now, 360, { loai: "XEP", datGap: true }), { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: 200 });
  assert.deepEqual(kiemMocXep(cx(batDau), now, 360, { loai: "DOI_DEN", datGap: true }), { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: 200 });
  assert.deepEqual(kiemMocXep(cx(batDau), now, 360, { loai: "XEP" }), { canPhaLe: true, phutConLai: 200 });
  assert.deepEqual(kiemMocXep(cx(batDau), now, 360, { loai: "XEP", datGap: false }), { canPhaLe: true, phutConLai: 200 });
  // Đặt gấp chỉ miễn cho CHÍNH chặng đó khi vào xe — rút / dời khách khỏi chuyến, đổi xe, đổi tài xế vẫn khoá (datGap không có tác dụng).
  for (const loai of ["RUT", "DOI_DI", "DOI_XE", "DOI_TAI_XE", "HUY_CO_KHACH"] as const) {
    assert.equal(kiemMocXep(cx(batDau), now, 360, { loai, datGap: true }).canPhaLe, true, loai);
  }
});

test("R-P7 (tinh chỉnh R-P6): giờ sớm nhất SAU KHI SỬA giờ xuất bến — đang trong vùng khoá lúc sửa ⇒ MIN(sớm nhất, giờ mới) (giữ khoá dính); NGOÀI vùng ⇒ đặt lại = giờ mới", () => {
  const goc = ms("2026-09-30", "05:50");
  const doiRa = ms("2026-09-30", "12:00");
  // (a) Đang trong vùng (02:30, còn 3 giờ 20 tới 05:50) mà dời ra 12:00 → giữ 05:50 ⇒ lệnh sau vẫn khoá (chuỗi lách 3 bước vẫn chặn).
  const a = batDauSomNhatSauDoiGio(cx(goc), doiRa, ms("2026-09-30", "02:30"), 360);
  assert.equal(a, goc);
  assert.equal(kiemMocXep(cx(doiRa, a), ms("2026-09-30", "02:40"), 360, { loai: "DOI_TAI_XE" }).canPhaLe, true);
  // Trong vùng mà dời SỚM hơn → giờ mới (nhỏ hơn) thành giờ sớm nhất.
  assert.equal(batDauSomNhatSauDoiGio(cx(goc), ms("2026-09-30", "05:00"), ms("2026-09-30", "02:30"), 360), ms("2026-09-30", "05:00"));
  // (b) Dời từ XA (hôm trước 20:00, chuyến 06:00 còn 10 giờ — chưa vào vùng) sang 10:00 → đặt lại = 10:00 ⇒ 00:00–04:00 hôm sau KHÔNG bị khoá thừa.
  const sau = ms("2026-09-30", "06:00");
  const moi = ms("2026-09-30", "10:00");
  const b = batDauSomNhatSauDoiGio(cx(sau), moi, ms("2026-09-29", "20:00"), 360);
  assert.equal(b, moi, "ngoài vùng khoá lúc sửa → đặt lại");
  assert.equal(kiemMocXep(cx(moi, b), ms("2026-09-30", "01:00"), 360, { loai: "DOI_TAI_XE" }).canPhaLe, false, "01:00: còn 9 giờ tới 10:00 — không khoá");
  assert.equal(kiemMocXep(cx(moi, b), ms("2026-09-30", "04:30"), 360, { loai: "DOI_TAI_XE" }).canPhaLe, true, "04:30: còn 5 giờ 30 tới 10:00 — khoá bình thường");
  // Chuyến ĐÃ từng dính (sớm nhất 05:50 < giờ hiện hành 12:00) mà lúc sửa vẫn trong vùng theo giờ sớm nhất → vẫn giữ.
  assert.equal(batDauSomNhatSauDoiGio(cx(doiRa, goc), ms("2026-09-30", "14:00"), ms("2026-09-30", "03:00"), 360), goc);
  // (c) Vùng tính bằng chính sách HIỆN HÀNH lúc sửa: cùng chuyến, cùng lúc sửa — mốc 360 → trong vùng (giữ); mốc 120 → ngoài vùng (đặt lại).
  const luc = ms("2026-09-30", "02:30");
  assert.equal(batDauSomNhatSauDoiGio(cx(goc), doiRa, luc, 360), goc);
  assert.equal(batDauSomNhatSauDoiGio(cx(goc), doiRa, luc, 120), doiRa);
  // Ranh giới đúng mốc: còn ĐÚNG 360 phút là ngoài vùng (đặt lại); thiếu một giây là trong vùng (giữ).
  assert.equal(batDauSomNhatSauDoiGio(cx(goc), doiRa, goc - 360 * PHUT, 360), doiRa);
  assert.equal(batDauSomNhatSauDoiGio(cx(goc), doiRa, goc - 360 * PHUT + 1000, 360), goc);
});

test("ADR-0050 VK1-B: lệnh 'cập nhật điểm theo đơn' (DOI_DIEM_THEO_CHANG) là lệnh lúc xếp nhưng KHÔNG khoá theo mốc — trong mốc không cần phá lệ (TC-51 (c))", () => {
  assert.ok((LENH_XEP as readonly string[]).includes("DOI_DIEM_THEO_CHANG"));
  assert.ok(!(LENH_KHOA_THEO_MOC as readonly string[]).includes("DOI_DIEM_THEO_CHANG"), "không vào LENH_KHOA_THEO_MOC");
  const batDau = ms("2026-09-30", "06:00");
  const r = kiemMocXep(cx(batDau), batDau - 60 * PHUT, 360, { loai: "DOI_DIEM_THEO_CHANG" });
  assert.equal(r.canPhaLe, false, "một giờ trước xuất bến vẫn cập nhật điểm được");
});
test("R-P29 (chủ lần 16): lệnh 'cập nhật khách theo đơn' (DOI_KHACH_THEO_DON) là lệnh lúc xếp nhưng KHÔNG khoá theo mốc — trong mốc không cần phá lệ", () => {
  assert.ok((LENH_XEP as readonly string[]).includes("DOI_KHACH_THEO_DON"));
  assert.ok(!(LENH_KHOA_THEO_MOC as readonly string[]).includes("DOI_KHACH_THEO_DON"), "không vào LENH_KHOA_THEO_MOC");
  const batDau = ms("2026-09-30", "06:00");
  assert.equal(kiemMocXep(cx(batDau), batDau - 60 * PHUT, 360, { loai: "DOI_KHACH_THEO_DON" }).canPhaLe, false, "một giờ trước xuất bến vẫn cập nhật khách được");
});

test("mucMoc: quá mốc (dưới mốc) → đỏ; sát mốc (dưới mốc + cảnh báo) → vàng; còn lại bình thường; ranh giới đúng phút", () => {
  const leg = ms("2026-09-30", "12:00");
  assert.equal(mucMoc(leg, leg - 359 * PHUT, 360, 120), "QUA_MOC");
  assert.equal(mucMoc(leg, leg - 360 * PHUT, 360, 120), "SAT_MOC");
  assert.equal(mucMoc(leg, leg - 479 * PHUT, 360, 120), "SAT_MOC");
  assert.equal(mucMoc(leg, leg - 480 * PHUT, 360, 120), "BINH_THUONG");
  assert.equal(mucMoc(leg, leg - 100 * PHUT, 1, 120), "SAT_MOC", "mốc 1 phút: còn 100 phút < 1 + 120 → sát mốc");
  assert.equal(mucMoc(leg, leg - 100 * PHUT, 1, 0), "BINH_THUONG");
  assert.equal(mucMoc(leg, leg + 10 * PHUT, 0, 0), "QUA_MOC", "không còn nhánh 'mốc 0 = tắt': giờ đã qua luôn quá mốc");
});

test("duoiMocKhiSua (chuyển từ orders/dat-gap.ts sang đây — một luật cho máy chủ và bảng Sửa đưa đón): dưới mốc nếu chặng CŨ hoặc chặng MỚI dưới mốc; chưa chốt giờ thì không xét", () => {
  const bayGio = ms("2027-03-11", "08:00");
  const g = (d: string | null, t: string | null) => ({ pickupDate: d, pickupTime: t });
  assert.equal(duoiMocKhiSua(null, g("2027-03-11", "13:00"), bayGio, 360), true, "thêm dưới mốc");
  assert.equal(duoiMocKhiSua(null, g("2027-03-11", "14:00"), bayGio, 360), false, "đúng mốc là đạt");
  assert.equal(duoiMocKhiSua(g("2027-03-11", "13:00"), g("2027-03-11", "16:00"), bayGio, 360), true, "cũ dưới mốc, mới trên mốc → vẫn dưới");
  assert.equal(duoiMocKhiSua(g("2027-03-11", "16:00"), g("2027-03-11", "13:00"), bayGio, 360), true, "mới dưới mốc");
  assert.equal(duoiMocKhiSua(g("2027-03-11", "16:00"), g("2027-03-12", "09:00"), bayGio, 360), false);
  assert.equal(duoiMocKhiSua(g("2027-03-11", null), g("2027-03-11", null), bayGio, 360), false, "chưa chốt giờ cả hai phía");
  assert.equal(duoiMocKhiSua(null, null, bayGio, 360), false);
});

// ---- ADR-0104 Đ1 (Q-1 b): lớp vượt luật cấu hình ------------------------------------------------------------------------------------------------------------
const TAM_LENH: LenhVuotMoc[] = [...LENH_KHOA_THEO_MOC, "THEM_KHI_CHAY"];

test("ADR-0104 Đ1 mục 2: lopVuotMoc = KHAN_CAP cho cả bảy lệnh bị khoá + thêm khách khi xe chạy (Q-1 b: Bán hàng cũng được); nhiều lệnh một request cũng KHAN_CAP", () => {
  assert.deepEqual(TAM_LENH.map((l) => lopVuotMoc(l)), TAM_LENH.map(() => "KHAN_CAP"));
  assert.equal(lopVuotMoc("DOI_XE", "DOI_TAI_XE"), "KHAN_CAP");
  assert.equal(lopVuotMoc("DOI_DI", "DOI_DEN"), "KHAN_CAP");
  assert.equal(lopVuotMoc(), "KHAN_CAP", "không lệnh nào (cờ mốc gửi kèm lệnh sửa không đổi xe / tài xế)");
});

test("ADR-0104 Đ1 mục 2 (lời chủ 2026-10-08 'Chỉ khi chuyến còn dưới 6 giờ'): lopVuotNghiCamKet — dưới mốc KHAN_CAP, ngoài mốc QUAN_TRI", () => {
  assert.equal(lopVuotNghiCamKet(true), "KHAN_CAP");
  assert.equal(lopVuotNghiCamKet(false), "QUAN_TRI");
});

test("ADR-0104 Đ1 mục 0: chuyenDuoiMoc — CÙNG phép so của kiemMocXep (còn đúng mốc là ngoài, thiếu 1 ms là dưới); xe đang chạy luôn dưới (xét trước chính sách); không chính sách → ngoài", () => {
  const bayGio = ms("2027-03-11", "06:00");
  assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: bayGio + 360 * PHUT }, bayGio, 360), false, "còn ĐÚNG 360 phút → ngoài mốc");
  assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: bayGio + 360 * PHUT - 1 }, bayGio, 360), true, "thiếu 1 ms → dưới mốc");
  assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: bayGio - 60 * PHUT }, bayGio, 360), true, "quá giờ mà chưa chạy → dưới mốc");
  assert.equal(chuyenDuoiMoc({ dangChay: true, gioXetMs: bayGio + 3000 * PHUT }, bayGio, 360), true, "xe đang chạy luôn dưới mốc");
  assert.equal(chuyenDuoiMoc({ dangChay: true, gioXetMs: bayGio + 3000 * PHUT }, bayGio, null), true, "xe đang chạy dưới mốc kể cả khi không có chính sách");
  assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: bayGio + 10 * PHUT }, bayGio, null), false, "không có chính sách → coi là ngoài mốc (giả định chặt hơn)");
  // Cùng một phép với luật khoá: mọi khoảng quanh ranh giới cho cùng kết luận với kiemMocXep (lệnh khoá XEP, không đặt gấp).
  for (const lech of [-1, 0, 1, 359 * PHUT, 360 * PHUT - 1, 360 * PHUT, 360 * PHUT + 1, 2000 * PHUT]) {
    const c = cx(bayGio + lech);
    assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: gioXetMocXep(c) }, bayGio, 360), kiemMocXep(c, bayGio, 360, { loai: "XEP" }).canPhaLe, `lệch ${lech} ms`);
  }
});

test("ADR-0104 Đ1 mục 0: dấu đặt gấp KHÔNG làm chuyến thôi dưới mốc — chỉ miễn luật mốc của XEP / DOI_DEN; chuyenDuoiMoc không nhận dấu", () => {
  const bayGio = ms("2027-03-11", "06:00");
  const c = cx(bayGio + 60 * PHUT);
  assert.equal(kiemMocXep(c, bayGio, 360, { loai: "XEP", datGap: true }).canPhaLe, false, "đặt gấp miễn mốc lúc xếp");
  assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: gioXetMocXep(c) }, bayGio, 360), true, "nhưng chuyến vẫn dưới mốc → khoảng nghỉ / cam kết lớp KHAN_CAP");
  assert.equal(lopVuotNghiCamKet(chuyenDuoiMoc({ dangChay: false, gioXetMs: gioXetMocXep(c) }, bayGio, 360)), "KHAN_CAP");
});

test("ADR-0104 Đ1 mục 0 (chủ 2026-10-08 'Cho qua, tính là sát giờ'): gioXetSuaChuyen = min(cũ, mới, sớm nhất từng có) — CÙNG phép luật khoá đổi xe / tài xế dùng", () => {
  const g = (t: string) => ms("2027-03-11", t);
  assert.equal(gioXetSuaChuyen(g("15:00"), g("10:00"), g("15:00")), g("10:00"), "dời giờ VÀO mốc trong cùng lệnh → xét theo giờ mới");
  assert.equal(gioXetSuaChuyen(g("10:00"), g("15:00"), g("10:00")), g("10:00"), "dời giờ RA xa → vẫn xét giờ cũ");
  assert.equal(gioXetSuaChuyen(g("15:00"), g("16:00"), g("09:00")), g("09:00"), "khoá dính: giờ sớm nhất từng có");
  assert.equal(gioXetSuaChuyen(g("15:00"), g("16:00"), null), g("15:00"), "không có giờ sớm nhất → giờ cũ");
});

test("ADR-0104 Đ1 mục 2: lopCanCho / duQuyen — lớp 409 theo MỌI luật đang thiếu; canQuyen = đủ ô cho mọi luật theo lớp của nó", () => {
  const banHang = (lop: LopVuot) => lop === "KHAN_CAP";
  const quanTri = (_lop: LopVuot) => true;
  const keToan = (_lop: LopVuot) => false;
  // Dưới mốc: mọi luật KHAN_CAP.
  assert.equal(lopCanCho(["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"], true, ["XEP"]), "KHAN_CAP");
  assert.equal(duQuyen(["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"], true, ["XEP"], banHang), true);
  // Ngoài mốc, chỉ thiếu khoảng nghỉ / cam kết: QUAN_TRI — Bán hàng không đủ, Quản trị đủ.
  for (const thieu of [["KHOANG_NGHI"], ["CAM_KET"], ["KHOANG_NGHI", "CAM_KET"]] as const) {
    assert.equal(lopCanCho(thieu, false, []), "QUAN_TRI", thieu.join(","));
    assert.equal(duQuyen(thieu, false, [], banHang), false, thieu.join(","));
    assert.equal(duQuyen(thieu, false, [], quanTri), true, thieu.join(","));
  }
  // Dời: nguồn dưới mốc (DOI_DI — mốc), đích ngoài mốc (cam kết của đích) → lớp QUAN_TRI; Bán hàng thiếu quyền cho phần cam kết.
  assert.equal(lopCanCho(["MOC_TOI_THIEU", "CAM_KET"], false, ["DOI_DI", "DOI_DEN"]), "QUAN_TRI");
  assert.equal(duQuyen(["MOC_TOI_THIEU", "CAM_KET"], false, ["DOI_DI", "DOI_DEN"], banHang), false);
  assert.equal(lopCuaLuat("MOC_TOI_THIEU", false, ["DOI_DI"]), "KHAN_CAP", "mốc luôn theo lệnh, không theo 'dưới mốc' của đích");
  assert.equal(duQuyen(["MOC_TOI_THIEU"], true, ["XEP"], keToan), false);
  assert.equal(duQuyen([], false, [], keToan), true, "không thiếu gì → đủ");
});
