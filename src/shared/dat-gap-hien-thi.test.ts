// Luật thuần HIỂN THỊ mốc 6 giờ + đặt gấp trên biểu mẫu đơn / trang đơn (ADR-0049 D2, V12; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07; chủ H4 / N-14;
// ruling R-P15, R-P18) — src/shared/dat-gap-hien-thi.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LUA_CHON_LY_DO_DAT_GAP, canhBaoChangForm, cauMoc, changDuoiMoc, datGapGiuTrenForm, nhanDatGap, thanDatGap, tomTatChanXacNhan } from "./dat-gap-hien-thi.ts";
import { GHI_CHU_DAT_GAP_TOI_DA, LY_DO_DAT_GAP } from "./chang-dua-don.ts";
import type { LegDto, OrderDetailDto } from "./contracts.ts";
import { vnLocalToMs } from "./vn-date.ts";

const BAY_GIO = vnLocalToMs("2026-09-30", "07:50")!;
const leg = (o: Partial<LegDto> = {}): LegDto => ({
  id: "l1", direction: "OUT", pickupDate: "2026-09-30", pickupTime: "12:00", pickupLocationId: null, pickupPlace: "Sheraton", pickupLabel: "Sheraton",
  dropoffLocationId: null, dropoffPlace: null, dropoffLabel: null, updatedAt: "t", datGap: null, ...o,
});
const don = (status: OrderDetailDto["status"], services: { id: string; name: string; legs: LegDto[] }[]) =>
  ({ status, services }) as unknown as Pick<OrderDetailDto, "status" | "services">;

test("cauMoc: câu của bản vẽ 07 ('Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ'); giờ đã qua nói rõ", () => {
  assert.equal(cauMoc(250, 360), "Giờ đón cách bây giờ 4 giờ 10 phút — quá hạn chốt 6 giờ");
  assert.equal(cauMoc(45, 360), "Giờ đón cách bây giờ 45 phút — quá hạn chốt 6 giờ");
  assert.equal(cauMoc(0, 360), "Giờ đón đã qua — quá hạn chốt 6 giờ");
  assert.equal(cauMoc(-41, 90), "Giờ đón đã qua — quá hạn chốt 1 giờ 30 phút");
});

test("nhanDatGap: văn phòng (khoá đủ) → 'Đặt gấp — lý do — người duyệt HH:MM' + ghi chú; chỉ cờ → 'Đặt gấp — Quản trị đã duyệt'; không tự lọc theo vai", () => {
  const du = { daDuyet: true as const, lyDo: "KHACH_DOAN_GOI_GAP", lyDoNhan: "Khách đoàn gọi gấp", nguoiDuyet: "Phạm Thu Hoa", luc: "2026-09-30T00:55:00.000Z", ghiChu: "Khách đoàn gọi lúc 07:40" };
  assert.deepEqual(nhanDatGap(du, BAY_GIO), { chinh: "Đặt gấp — Khách đoàn gọi gấp — Phạm Thu Hoa duyệt 07:55", ghiChu: "Khách đoàn gọi lúc 07:40" });
  // Khác ngày: thêm ngày; khác năm: thêm năm.
  assert.equal(nhanDatGap({ ...du, luc: "2026-09-29T09:10:00.000Z" }, BAY_GIO).chinh, "Đặt gấp — Khách đoàn gọi gấp — Phạm Thu Hoa duyệt 16:10 29/09");
  assert.equal(nhanDatGap({ ...du, luc: "2025-12-31T09:10:00.000Z" }, BAY_GIO).chinh, "Đặt gấp — Khách đoàn gọi gấp — Phạm Thu Hoa duyệt 16:10 31/12/2025");
  // Người duyệt không còn hồ sơ (null) → không đoán tên.
  assert.equal(nhanDatGap({ ...du, nguoiDuyet: null, ghiChu: null }, BAY_GIO).chinh, "Đặt gấp — Khách đoàn gọi gấp — duyệt 07:55");
  assert.deepEqual(nhanDatGap({ daDuyet: true }, BAY_GIO), { chinh: "Đặt gấp — Quản trị đã duyệt", ghiChu: null });
  assert.doesNotMatch(nhanDatGap(du, BAY_GIO).chinh, /KHACH_DOAN/);
});

test("changDuoiMoc: chỉ đơn NHÁP, chỉ chặng có giờ, chưa đặt gấp, dưới mốc (luật kiemMocDat); mốc chưa có → rỗng", () => {
  const d = don("draft", [
    { id: "s1", name: "Vé cáp treo", legs: [leg(), leg({ id: "l2", direction: "RETURN", pickupTime: "18:00" })] },
    { id: "s2", name: "Tour đảo", legs: [leg({ id: "l3", datGap: { daDuyet: true } }), leg({ id: "l4", pickupTime: null })] },
  ]);
  assert.deepEqual(changDuoiMoc(d, 360, BAY_GIO), [{ serviceId: "s1", tenDichVu: "Vé cáp treo", legId: "l1", chieu: "Chiều đi", phutConLai: 250 }]);
  assert.deepEqual(changDuoiMoc(d, null, BAY_GIO), []);
  assert.deepEqual(changDuoiMoc(don("confirmed", [{ id: "s1", name: "x", legs: [leg()] }]), 360, BAY_GIO), []);
  // Đúng mốc là đạt (TC-16): 12:00 − 6 giờ = 06:00.
  assert.deepEqual(changDuoiMoc(d, 360, vnLocalToMs("2026-09-30", "06:00")!), []);
  assert.equal(changDuoiMoc(d, 360, vnLocalToMs("2026-09-30", "06:01")!).length, 1);
});

test("tomTatChanXacNhan: khoá nút Xác nhận khi còn chặng cần đặt gấp — câu khác cho người được đặt gấp và người không", () => {
  assert.equal(tomTatChanXacNhan([], true), null);
  const c = [{ serviceId: "s1", tenDichVu: "x", legId: "l1", chieu: "Chiều đi", phutConLai: 250 }];
  assert.equal(tomTatChanXacNhan(c, false), "Cần Quản trị duyệt đặt gấp");
  assert.equal(tomTatChanXacNhan(c, true), "Duyệt đặt gấp xong thì xác nhận được.");
});

test("canhBaoChangForm + datGapGiuTrenForm: cảnh báo trên đơn CHƯA lưu (R-P15) — chặng giữ nguyên ngày / giờ / nơi của chặng đã đặt gấp thì không cảnh báo", () => {
  assert.equal(canhBaoChangForm({ ngayDon: "2026-09-30", gioDon: "12:00", datGap: false }, 360, BAY_GIO), "Giờ đón cách bây giờ 4 giờ 10 phút — quá hạn chốt 6 giờ");
  assert.equal(canhBaoChangForm({ ngayDon: "2026-09-30", gioDon: "12:00", datGap: true }, 360, BAY_GIO), null);
  assert.equal(canhBaoChangForm({ ngayDon: "2026-09-30", gioDon: "", datGap: false }, 360, BAY_GIO), null);
  assert.equal(canhBaoChangForm({ ngayDon: "", gioDon: "12:00", datGap: false }, 360, BAY_GIO), null);
  assert.equal(canhBaoChangForm({ ngayDon: "2026-09-30", gioDon: "12:00", datGap: false }, null, BAY_GIO), null);
  assert.equal(canhBaoChangForm({ ngayDon: "2026-10-01", gioDon: "12:00", datGap: false }, 360, BAY_GIO), null);
  const cu = leg({ datGap: { daDuyet: true } });
  assert.equal(datGapGiuTrenForm(cu, { departDate: "2026-09-30", pickupTime: "12:00", pickupPlace: "Sheraton" }), true);
  assert.equal(datGapGiuTrenForm(cu, { departDate: "2026-09-30", pickupTime: "12:10", pickupPlace: "Sheraton" }), false);
  assert.equal(datGapGiuTrenForm(cu, { departDate: "2026-09-30", pickupTime: "12:00", pickupPlace: "Novotel" }), false);
  assert.equal(datGapGiuTrenForm(leg(), { departDate: "2026-09-30", pickupTime: "12:00", pickupPlace: "Sheraton" }), false);
  assert.equal(datGapGiuTrenForm(undefined, { departDate: "2026-09-30", pickupTime: "12:00", pickupPlace: "Sheraton" }), false);
});

test("LUA_CHON_LY_DO_DAT_GAP + thanDatGap: lý do lấy từ LY_DO_DAT_GAP (không chép cứng); ghi chú ≤ 120, trống → null", () => {
  assert.deepEqual(LUA_CHON_LY_DO_DAT_GAP, Object.entries(LY_DO_DAT_GAP).map(([value, label]) => ({ value, label })));
  const code = Object.keys(LY_DO_DAT_GAP)[0]!;
  assert.deepEqual(thanDatGap(code, "  Khách đoàn gọi lúc 07:40 "), { ok: true, value: { lyDo: code, ghiChu: "Khách đoàn gọi lúc 07:40" } });
  assert.deepEqual(thanDatGap(code, "   "), { ok: true, value: { lyDo: code, ghiChu: null } });
  assert.deepEqual(thanDatGap("", "x"), { ok: false, loi: "Chọn lý do đặt gấp." });
  assert.deepEqual(thanDatGap("KHONG_CO", "x"), { ok: false, loi: "Chọn lý do đặt gấp." });
  assert.deepEqual(thanDatGap(code, "a".repeat(GHI_CHU_DAT_GAP_TOI_DA + 1)), { ok: false, loi: `Ghi chú ngắn tối đa ${GHI_CHU_DAT_GAP_TOI_DA} ký tự.` });
  assert.ok(thanDatGap(code, "a".repeat(GHI_CHU_DAT_GAP_TOI_DA)).ok);
});
