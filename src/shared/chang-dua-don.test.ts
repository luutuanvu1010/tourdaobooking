// Luật thuần của chặng đưa đón (ADR-0047 A1; kế hoạch Task A3). Chạy trực tiếp bằng `node --test` (import đuôi .ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHIEU_LABEL, LY_DO_DONG_CHANG, MAX_CHANG_MOI_DICH_VU, NGAY_DON_SAU_NGAY_DI, NGAY_DON_TRUOC_NGAY_DI, NOI_DON_CHUA_GHI, chieuDiDau, doiNgayChang, isLyDoDongChang,
  khoangNgayDon, kiemChang, moTaChang, tronChangCu, type ChangDaLuu,
} from "./chang-dua-don.ts";

const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const LEG = "11111111-2222-3333-4444-555555555555";
const base = { direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: null, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "" };
const ctx = { at: "Dịch vụ 1, chặng 1", departDate: "2026-10-10" };

test("hằng: trần 10 chặng mỗi dịch vụ; khoảng ngày đón −1/+7 (chủ trả lời Q2 'Sớm 1 ngày, muộn 7 ngày'); nhãn chiều tiếng Việt", () => {
  assert.equal(MAX_CHANG_MOI_DICH_VU, 10);
  assert.equal(NGAY_DON_TRUOC_NGAY_DI, 1);
  assert.equal(NGAY_DON_SAU_NGAY_DI, 7);
  assert.deepEqual(CHIEU_LABEL, { OUT: "Chiều đi", RETURN: "Chiều về" });
  assert.deepEqual(khoangNgayDon("2026-10-01"), { from: "2026-09-30", to: "2026-10-08" });
});

test("LY_DO_DONG_CHANG: đúng ba mã R6, nhãn tiếng Việt; mã lạ không nhận", () => {
  assert.deepEqual(Object.keys(LY_DO_DONG_CHANG), ["NOT_NEEDED", "WRONG_ENTRY", "REPLACED"]);
  assert.equal(LY_DO_DONG_CHANG.NOT_NEEDED, "Khách không cần đưa đón nữa");
  assert.equal(LY_DO_DONG_CHANG.WRONG_ENTRY, "Nhập nhầm");
  assert.equal(LY_DO_DONG_CHANG.REPLACED, "Đổi sang chặng khác");
  assert.equal(isLyDoDongChang("NOT_NEEDED"), true);
  assert.equal(isLyDoDongChang("cancelled"), false);
  assert.equal(isLyDoDongChang(undefined), false);
});

test("kiemChang: hợp lệ → chuẩn hoá (rỗng → null; ngày đón trống + có ngày đi → điền ngày đi — R4b); nơi chữ gộp khoảng trắng", () => {
  const r = kiemChang({ ...base, pickupTime: "06:30", pickupPlace: "  Khách sạn   Mường Thanh " }, ctx);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.value, {
    id: null, direction: "OUT", pickupDate: "2026-10-10", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Mường Thanh", dropoffLocationId: null, dropoffPlace: null,
  });
  const noDepart = kiemChang({ ...base, pickupLocationId: LOC }, { ...ctx, departDate: null });
  assert.ok(noDepart.ok);
  assert.equal(noDepart.value.pickupDate, null, "đơn nháp chưa có ngày đi: ngày đón để trống được (R4a)");
  const withId = kiemChang({ ...base, id: LEG, direction: "RETURN", pickupDate: "2026-10-12", pickupLocationId: LOC, dropoffPlace: "Nhà riêng" }, ctx);
  assert.ok(withId.ok);
  assert.equal(withId.value.id, LEG);
  assert.equal(withId.value.direction, "RETURN");
  assert.equal(withId.value.dropoffPlace, "Nhà riêng");
});

test("kiemChang: nơi đón ĐÚNG MỘT (thiếu cả hai / có cả hai → lỗi tiếng Việt); nơi trả TỐI ĐA MỘT", () => {
  const none = kiemChang({ ...base }, ctx);
  assert.equal(none.ok, false);
  assert.match(!none.ok ? none.message : "", /^Dịch vụ 1, chặng 1: cần nơi đón/);
  const both = kiemChang({ ...base, pickupLocationId: LOC, pickupPlace: "Bến" }, ctx);
  assert.equal(both.ok, false);
  assert.match(!both.ok ? both.message : "", /nơi đón: chọn điểm có sẵn HOẶC gõ chữ/);
  const drop2 = kiemChang({ ...base, pickupLocationId: LOC, dropoffLocationId: LOC2, dropoffPlace: "Nhà" }, ctx);
  assert.equal(drop2.ok, false);
  assert.match(!drop2.ok ? drop2.message : "", /nơi trả: chọn điểm có sẵn HOẶC gõ chữ/);
  assert.ok(kiemChang({ ...base, pickupLocationId: LOC }, ctx).ok, "không có nơi trả → được (nơi trả chưa chốt)");
});

test("kiemChang: giờ 24:00, ngày sai lịch, chữ > 200, chiều lạ, id sai dạng, điểm sai dạng → lỗi", () => {
  const cases: Record<string, unknown>[] = [
    { ...base, pickupLocationId: LOC, pickupTime: "24:00" },
    { ...base, pickupLocationId: LOC, pickupDate: "2026-02-30" },
    { ...base, pickupPlace: "x".repeat(201) },
    { ...base, pickupLocationId: LOC, dropoffPlace: "y".repeat(201) },
    { ...base, pickupLocationId: LOC, direction: "BOTH" },
    { ...base, pickupLocationId: LOC, id: "khong-phai-uuid" },
    { ...base, pickupLocationId: "abc" },
  ];
  for (const c of cases) assert.equal(kiemChang(c, ctx).ok, false, JSON.stringify(c).slice(0, 80));
  assert.equal(kiemChang(null, ctx).ok, false);
  assert.equal(kiemChang([], ctx).ok, false);
});

test("kiemChang: ngày đón ngoài khoảng [ngày đi − 1, ngày đi + 7] → lỗi (Q2); biên là được", () => {
  for (const d of ["2026-10-09", "2026-10-10", "2026-10-17"]) assert.ok(kiemChang({ ...base, pickupLocationId: LOC, pickupDate: d }, ctx).ok, d);
  for (const d of ["2026-10-08", "2026-10-18"]) {
    const r = kiemChang({ ...base, pickupLocationId: LOC, pickupDate: d }, ctx);
    assert.equal(r.ok, false, d);
    assert.match(!r.ok ? r.message : "", /ngày đón phải từ 2026-10-09 đến 2026-10-17/);
  }
});

test("kiemChang: đơn đã xác nhận — ngày đón MỚI/ĐỔI phải ≥ hôm nay (giờ VN); giữ nguyên ngày cũ đã qua thì vẫn lưu được", () => {
  const confirmed = { ...ctx, departDate: "2026-10-10", today: "2026-10-10" };
  const past = kiemChang({ ...base, pickupLocationId: LOC, pickupDate: "2026-10-09" }, confirmed);
  assert.equal(past.ok, false);
  assert.match(!past.ok ? past.message : "", /ngày đón đã qua/);
  assert.ok(kiemChang({ ...base, pickupLocationId: LOC, pickupDate: "2026-10-09" }, { ...confirmed, ngayCu: "2026-10-09" }).ok, "không đổi ngày → không chặn");
  assert.ok(kiemChang({ ...base, pickupLocationId: LOC, pickupDate: "2026-10-10" }, confirmed).ok);
});

test("kiemChang: chiều cố định từ ngữ cảnh (route sửa chặng) — bỏ qua khoá direction của thân", () => {
  const r = kiemChang({ pickupDate: "", pickupTime: "07:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "" }, { ...ctx, direction: "RETURN" });
  assert.ok(r.ok);
  assert.equal(r.value.direction, "RETURN");
});

const stored = (over: Partial<ChangDaLuu>): ChangDaLuu => ({
  id: LEG, direction: "OUT", pickupDate: "2026-10-10", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn A", pickupLabel: "Khách sạn A",
  dropoffLocationId: null, dropoffPlace: null, dropoffLabel: null, ...over,
});

test("chieuDiDau: chiều đi SỚM NHẤT (ngày, rồi giờ có trước giờ trống, rồi id); không có chiều đi → hai khoá null; điểm danh mục → tên điểm", () => {
  assert.deepEqual(chieuDiDau([]), { pickupTime: null, pickupPlace: null });
  assert.deepEqual(chieuDiDau([stored({ direction: "RETURN" })]), { pickupTime: null, pickupPlace: null });
  const legs = [
    stored({ id: "c", pickupDate: "2026-10-10", pickupTime: null, pickupPlace: "Không giờ", pickupLabel: "Không giờ" }),
    stored({ id: "b", pickupDate: "2026-10-10", pickupTime: "07:00", pickupPlace: "Bảy giờ", pickupLabel: "Bảy giờ" }),
    stored({ id: "a", pickupDate: "2026-10-11", pickupTime: "05:00", pickupPlace: "Hôm sau", pickupLabel: "Hôm sau" }),
    stored({ id: "z", direction: "RETURN", pickupDate: "2026-10-09", pickupTime: "01:00" }),
  ];
  assert.deepEqual(chieuDiDau(legs), { pickupTime: "07:00", pickupPlace: "Bảy giờ" });
  const tie = [stored({ id: "y", pickupTime: "07:00", pickupLabel: "Y" }), stored({ id: "x", pickupTime: "07:00", pickupLabel: "X" })];
  assert.deepEqual(chieuDiDau(tie), { pickupTime: "07:00", pickupPlace: "X" }, "hoà thì theo id");
  const noDate = [stored({ id: "n", pickupDate: null, pickupLabel: "N" }), stored({ id: "d", pickupDate: "2026-10-12", pickupLabel: "D" })];
  assert.equal(chieuDiDau(noDate).pickupPlace, "D", "ngày trống xếp sau ngày có");
  assert.deepEqual(chieuDiDau([stored({ pickupLocationId: LOC, pickupPlace: null, pickupLabel: "Bến tàu du lịch Nha Trang" })]), {
    pickupTime: "06:30", pickupPlace: "Bến tàu du lịch Nha Trang",
  });
});

test("doiNgayChang: dời CÙNG số ngày (qua tháng, qua năm); ngày trống giữ trống; ngày đi từ trống sang có → điền ngày mới cho chặng trống; không có ngày mới → giữ", () => {
  const legs = [{ pickupDate: "2026-10-30" }, { pickupDate: "2026-10-31" }, { pickupDate: null }];
  assert.deepEqual(doiNgayChang(legs, "2026-10-31", "2026-11-02").map((l) => l.pickupDate), ["2026-11-01", "2026-11-02", null]);
  assert.deepEqual(doiNgayChang([{ pickupDate: "2026-12-31" }], "2026-12-31", "2027-01-01").map((l) => l.pickupDate), ["2027-01-01"]);
  assert.deepEqual(doiNgayChang([{ pickupDate: "2026-10-09" }], "2026-10-10", "2026-10-05").map((l) => l.pickupDate), ["2026-10-04"], "đón tối hôm trước vẫn là hôm trước");
  assert.deepEqual(doiNgayChang([{ pickupDate: null }, { pickupDate: "2026-10-01" }], null, "2026-10-10").map((l) => l.pickupDate), ["2026-10-10", "2026-10-01"]);
  assert.deepEqual(doiNgayChang([{ pickupDate: "2026-10-01" }], "2026-10-01", null).map((l) => l.pickupDate), ["2026-10-01"]);
  assert.deepEqual(doiNgayChang([{ pickupDate: "2026-10-01" }], "2026-10-01", "2026-10-01").map((l) => l.pickupDate), ["2026-10-01"]);
  const src = [{ pickupDate: "2026-10-01", x: 1 }];
  const out = doiNgayChang(src, "2026-10-01", "2026-10-02");
  assert.equal(src[0]!.pickupDate, "2026-10-01", "không sửa mảng nguồn");
  assert.equal(out[0]!.x, 1, "giữ các trường khác");
});

test("tronChangCu: khoá vắng → trả NGUYÊN; chưa có chiều đi → tạo chiều đi (ngày = ngày đi, nơi trả trống); đã có → chỉ đổi giờ/nơi", () => {
  const ret = stored({ id: "r", direction: "RETURN", pickupDate: "2026-10-12", dropoffPlace: "Sân bay", dropoffLabel: "Sân bay" });
  const out = stored({ id: "o", dropoffLocationId: LOC2, dropoffLabel: "Bến cảng Vinpearl" });
  assert.deepEqual(tronChangCu([out, ret], {}, "2026-10-10"), { legs: [out, ret].map(strip), boChieuDi: null });

  const created = tronChangCu([ret], { pickupTime: "08:00", pickupPlace: "Khách sạn B" }, "2026-10-10");
  assert.equal(created.boChieuDi, null);
  assert.deepEqual(created.legs, [strip(ret), {
    id: null, direction: "OUT", pickupDate: "2026-10-10", pickupTime: "08:00", pickupLocationId: null, pickupPlace: "Khách sạn B", dropoffLocationId: null, dropoffPlace: null,
  }]);

  const changed = tronChangCu([out, ret], { pickupTime: "07:15", pickupPlace: "Khách sạn C" }, "2026-10-10");
  assert.deepEqual(changed.legs, [{ ...strip(out), pickupTime: "07:15", pickupPlace: "Khách sạn C", pickupLocationId: null }, strip(ret)], "chiều về, nơi trả không đổi");
});

test("tronChangCu: chữ TRÙNG tên điểm danh mục → giữ pickupLocationId (bảng cũ gửi lại tên dẫn xuất); khác tên → thành chữ tự do", () => {
  const atLoc = stored({ id: "o", pickupLocationId: LOC, pickupPlace: null, pickupLabel: "Bến tàu du lịch Nha Trang" });
  const same = tronChangCu([atLoc], { pickupTime: "09:00", pickupPlace: "Bến tàu du lịch Nha Trang" }, "2026-10-10");
  assert.deepEqual(same.legs, [{ ...strip(atLoc), pickupTime: "09:00" }]);
  const diff = tronChangCu([atLoc], { pickupTime: "06:30", pickupPlace: "Cổng sau bến tàu" }, "2026-10-10");
  assert.deepEqual(diff.legs, [{ ...strip(atLoc), pickupLocationId: null, pickupPlace: "Cổng sau bến tàu" }]);
});

test("tronChangCu: cả giờ và nơi đều trống → đánh dấu BỎ chiều đi (chiều về giữ); chưa có chiều đi thì không làm gì", () => {
  const ret = stored({ id: "r", direction: "RETURN" });
  const out = stored({ id: "o" });
  assert.deepEqual(tronChangCu([out, ret], { pickupTime: null, pickupPlace: null }, "2026-10-10"), { legs: [strip(ret)], boChieuDi: "o" });
  assert.deepEqual(tronChangCu([ret], { pickupTime: null, pickupPlace: null }, "2026-10-10"), { legs: [strip(ret)], boChieuDi: null });
});

test("tronChangCu: có giờ mà nơi trống → nơi đón thành chữ tạm NOI_DON_CHUA_GHI (nơi đón bắt buộc — giả định theo Q1 (a))", () => {
  const created = tronChangCu([], { pickupTime: "06:00", pickupPlace: null }, "2026-10-10");
  assert.equal(created.legs[0]!.pickupPlace, NOI_DON_CHUA_GHI);
  assert.equal(NOI_DON_CHUA_GHI, "(chưa ghi nơi đón)");
  const cleared = tronChangCu([stored({ id: "o", pickupLocationId: LOC, pickupPlace: null, pickupLabel: "Bến" })], { pickupTime: "06:30", pickupPlace: null }, "2026-10-10");
  assert.deepEqual([cleared.legs[0]!.pickupLocationId, cleared.legs[0]!.pickupPlace], [null, NOI_DON_CHUA_GHI]);
});

test("moTaChang: sửa → 'Chiều đi · <tên>: giờ đón 06:30 → 07:00; nơi đón A → B'; dãy từ 8 chữ số bị che ở tên + nơi; ngày không bị che; không in id", () => {
  const truoc = { direction: "OUT" as const, pickupDate: "2026-10-10", pickupTime: "06:30", noiDon: "Khách sạn A", noiTra: null };
  const sau = { ...truoc, pickupTime: "07:00", noiDon: "Nhà riêng, gọi 0905 123 456" };
  const s = moTaChang("Tour 4 đảo", truoc, sau)!;
  assert.equal(s, "Chiều đi · Tour 4 đảo: giờ đón 06:30 → 07:00; nơi đón Khách sạn A → Nhà riêng, gọi •••• ••• •••");
  assert.equal(moTaChang("Tour", truoc, truoc), null, "không đổi gì → null");
  const them = moTaChang("Tour 0905123456", null, { direction: "RETURN", pickupDate: "2026-10-12", pickupTime: null, noiDon: "Sân bay", noiTra: null })!;
  assert.equal(them, "Chiều về · Tour ••••••••••: thêm — ngày đón 2026-10-12, giờ đón (chưa chốt), nơi đón Sân bay, nơi trả (chưa chốt)");
  const bo = moTaChang("Tour", truoc, null, "WRONG_ENTRY")!;
  assert.equal(bo, "Chiều đi · Tour: bỏ — Nhập nhầm");
  const ngay = moTaChang("Tour", truoc, { ...truoc, pickupDate: "2026-10-09", noiTra: "Bến" })!;
  assert.equal(ngay, "Chiều đi · Tour: ngày đón 2026-10-10 → 2026-10-09; nơi trả (trống) → Bến");
  for (const x of [s, them, bo, ngay]) assert.doesNotMatch(x, /[0-9a-f]{8}-[0-9a-f]{4}/, "không in id");
});

/** Chặng đã lưu → dạng ghi (bỏ nhãn đọc). */
function strip(l: ChangDaLuu) {
  const { pickupLabel: _a, dropoffLabel: _b, ...rest } = l;
  return rest;
}
