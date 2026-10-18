// Thẻ dịch vụ GẬP của form Tạo/sửa đơn (thiết kế lại 18/10/2026, đặc tả mục 3C) — luật thuần src/shared/dong-gap-the.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TU_DO, themChangDi, themChieuVe, type ChangNhap } from "./chang-form.ts";
import {
  CHIP_DAT_GAP, canhBaoChuyenThe, chipThieu, chipTuCanhBao, coLoiChanLuuDangHien, donGon, dongGapThe, soKhachGon, theMoKhiNap,
} from "./dong-gap-the.ts";
import type { CatalogService } from "./order-lines.ts";
import { newCatalogDraft, newManualDraft, setGuests, setPax, setUnitPrice, type CatalogDraft } from "./service-form.ts";

const NGAY = "2026-10-20";
const HOM_NAY = "2026-10-18";
const KS_ID = "22222222-2222-4222-8222-222222222222";
const SAN_BAY_ID = "44444444-4444-4444-8444-444444444444";
const NHAN: Record<string, string> = { [KS_ID]: "Khách sạn Biển Xanh", [SAN_BAY_ID]: "Sân bay Cam Ranh" };
const nhanTheoId = (id: string): string | null => NHAN[id] ?? null;
const laSanBay = (id: string): boolean => id === SAN_BAY_ID;

const tour: CatalogService = {
  code: "TD2", name: "Tour 2 đảo: Hòn Mun + Hòn Tằm + buffet trưa", unit: "perPax",
  prices: { adult: 1350000, child: 1200000, senior: 1350000, infant: 0 },
  notes: { child: "cao 1–1,4 m", senior: "từ 60 tuổi", infant: "dưới 1 m, miễn phí" },
};
const phao: CatalogService = { code: "TTBPC", name: "Phao chuối (5 pax) Hòn Tằm", unit: "per5Pax", prices: { adult: 1300000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null } };

const chang = (p: Partial<ChangNhap> = {}): ChangNhap => ({ ...themChangDi(null, NGAY, "c1"), ...p });
/** Chặng "sạch" đủ thông tin: điểm danh mục, có giờ, cùng ngày đi. */
const changDu = (p: Partial<ChangNhap> = {}): ChangNhap => chang({ don: KS_ID, pickupTime: "07:30", ...p });
const td2 = (pax: Partial<Record<"adult" | "child" | "senior" | "infant", number>> = { adult: 2, child: 1, infant: 1 }, legs: ChangNhap[] = [changDu()]): CatalogDraft => {
  let d = newCatalogDraft(tour, "k1");
  for (const [c, n] of Object.entries(pax)) d = setPax(d, c as "adult", n);
  return { ...d, legs, trip: { ...d.trip, departDate: NGAY } };
};

test("soKhachGon: chỉ loại có người, đúng ví dụ \"2 NL · 1 TE · 1 EB\"; người cao tuổi là NCT", () => {
  assert.equal(soKhachGon({ nl: 2, te: 1, nc: 0, eb: 1 }), "2 NL · 1 TE · 1 EB");
  assert.equal(soKhachGon({ nl: 3, te: 0, nc: 0, eb: 0 }), "3 NL", "chỉ người lớn");
  assert.equal(soKhachGon({ nl: 2, te: 0, nc: 1, eb: 0 }), "2 NL · 1 NCT");
  assert.equal(soKhachGon({ nl: 0, te: 0, nc: 0, eb: 0 }), "", "không khách → chuỗi rỗng (dòng gập không in gì)");
  assert.equal(soKhachGon({ nl: 0, te: 2, nc: 0, eb: 0 }), "2 TE");
});

test("donGon: \"đón 07:30 KS Biển Xanh\"; thiếu giờ không ghép chữ \"chưa chốt\" (chip riêng); thiếu cả hai → null", () => {
  assert.equal(donGon("07:30", "KS Biển Xanh"), "đón 07:30 KS Biển Xanh");
  assert.equal(donGon("07:30", "Khách sạn Biển Xanh"), "đón 07:30 KS Biển Xanh", "\"Khách sạn \" đầu tên rút thành \"KS \" cho dòng gập ở 390");
  assert.equal(donGon(null, "Khách sạn Biển Xanh"), "đón KS Biển Xanh", "thiếu giờ: chỉ nơi");
  assert.equal(donGon("", "12 Trần Phú"), "đón 12 Trần Phú");
  assert.equal(donGon("07:30", null), "đón 07:30", "thiếu nơi: chỉ giờ");
  assert.equal(donGon("07:30", "  "), "đón 07:30");
  assert.equal(donGon(null, null), null);
  assert.equal(donGon("", ""), null);
  assert.equal(donGon("07:30", "Sân bay Cam Ranh"), "đón 07:30 Sân bay Cam Ranh", "chỉ rút \"Khách sạn\" ở ĐẦU tên");
});

test("chipThieu: \"Chưa chốt giờ đón\", \"Chưa có nơi đón\" theo đúng thứ tự; đủ cả hai → rỗng", () => {
  assert.deepEqual(chipThieu({ coGioDon: false, coNoiDon: false }), ["Chưa chốt giờ đón", "Chưa có nơi đón"]);
  assert.deepEqual(chipThieu({ coGioDon: false, coNoiDon: true }), ["Chưa chốt giờ đón"]);
  assert.deepEqual(chipThieu({ coGioDon: true, coNoiDon: false }), ["Chưa có nơi đón"]);
  assert.deepEqual(chipThieu({ coGioDon: true, coNoiDon: true }), []);
});

test("chipTuCanhBao: lấy phần trước \" — \" của câu cảnh báo thật (một nguồn chữ), bỏ dấu chấm cuối", () => {
  assert.equal(chipTuCanhBao("Ngày khởi hành đã qua — vẫn lưu được, nhưng chưa thể xác nhận."), "Ngày khởi hành đã qua");
  assert.equal(chipTuCanhBao("Giờ đón sau giờ khởi hành — kiểm tra lại."), "Giờ đón sau giờ khởi hành");
  assert.equal(chipTuCanhBao("Một câu không có gạch."), "Một câu không có gạch");
});

test("coLoiChanLuuDangHien: thẻ mới chưa có nơi đón KHÔNG bị ép mở trước khi bấm Lưu; sau khi bấm Lưu thì có", () => {
  const moi = td2({ adult: 2 }, [chang()]);
  assert.equal(coLoiChanLuuDangHien(moi, false), false, "thêm 3 dịch vụ liền tay: thẻ thiếu nơi đón vẫn gập được");
  assert.equal(coLoiChanLuuDangHien(moi, true), true, "Lưu bị từ chối: thẻ có lỗi mở ra");
  assert.equal(coLoiChanLuuDangHien(td2(), false), false);
  assert.equal(coLoiChanLuuDangHien(td2(), true), false, "thẻ đủ, không lỗi");
});

test("coLoiChanLuuDangHien: lỗi hiện NGAY (không chờ Lưu) ép mở: \"Tối đa 50 khách.\", số người chiều về quá số khách, số chỗ sai, phải chọn lại từ danh mục", () => {
  assert.equal(coLoiChanLuuDangHien(td2({ adult: 51 }), false), true, "Tối đa 50 khách.");
  const ve = { ...themChieuVe([changDu()], null, NGAY, "c2"), soVe: "9" };
  assert.equal(coLoiChanLuuDangHien(td2({ adult: 2 }, [changDu(), ve]), false), true, "Số người chiều về không được quá 2.");
  assert.equal(coLoiChanLuuDangHien(td2({ adult: 2 }, [changDu({ choToiThieu: "0" })]), false), true, "Số chỗ từ 1 đến 100");
  assert.equal(coLoiChanLuuDangHien({ ...td2(), repick: true }, false), true, "dịch vụ rời danh mục, thiếu giá danh mục → chưa lưu được");
  assert.equal(coLoiChanLuuDangHien(setPax(newCatalogDraft(tour, "k"), "adult", 0), false), false, "\"Nhập số khách.\" chỉ hiện sau khi bấm Lưu");
});

test("theMoKhiNap: nháp sạch (chặng gọn, không thông tin chuyến) → gập; có giá trị bị giấu hoặc có lỗi → mở", () => {
  assert.equal(theMoKhiNap(td2(), NGAY, laSanBay), false, "chặng đủ nơi đón, không ô ít dùng: gập");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, []), NGAY, laSanBay), false, "không đưa đón: gập");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ pickupTime: "" })]), NGAY, laSanBay), false, "chưa chốt giờ: chip, vẫn gập");
  const coChuyen = td2();
  assert.equal(theMoKhiNap({ ...coChuyen, trip: { ...coChuyen.trip, checkinPlace: "Cảng Vinpearl" } }, NGAY, laSanBay), true, "Thông tin chuyến có giá trị: không giấu");
  assert.equal(theMoKhiNap({ ...coChuyen, trip: { ...coChuyen.trip, note: "Mang đồ bơi" } }, NGAY, laSanBay), true);
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ xeRieng: true })]), NGAY, laSanBay), true, "xe riêng: không giấu");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ choToiThieu: "7" })]), NGAY, laSanBay), true, "xe tối thiểu: không giấu");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ don: SAN_BAY_ID })]), NGAY, laSanBay), true, "sân bay: ô số hiệu chuyến bay hiện sẵn");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ flightCode: "VN123" })]), NGAY, laSanBay), true);
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [changDu({ pickupDate: "2026-10-21" })]), NGAY, laSanBay), true, "đón khác ngày đi");
  assert.equal(theMoKhiNap(td2({ adult: 2 }, [chang()]), NGAY, laSanBay), true, "chặng thiếu nơi đón (dữ liệu cũ) phải mở để nhập");
  assert.equal(theMoKhiNap(td2({ adult: 51 }), NGAY, laSanBay), true, "có lỗi chặn lưu");
});

test("dongGapThe: tên · số khách · giờ và nơi đón · chip thiếu (đúng ví dụ bản vẽ)", () => {
  const r = dongGapThe(td2(), { today: HOM_NAY, nhanTheoId });
  assert.deepEqual(r, { khach: "2 NL · 1 TE · 1 EB", don: "đón 07:30 KS Biển Xanh", chips: [] });
  const tuDo = dongGapThe(td2({ adult: 2 }, [chang({ don: TU_DO, donTuDo: " 12 Trần Phú ", pickupTime: "07:30" })]), { today: HOM_NAY, nhanTheoId });
  assert.equal(tuDo.don, "đón 07:30 12 Trần Phú", "Gõ tự do: lấy địa chỉ đã gõ");
  const thieu = dongGapThe(td2({ adult: 2 }, [chang()]), { today: HOM_NAY, nhanTheoId });
  assert.deepEqual(thieu, { khach: "2 NL", don: null, chips: ["Chưa chốt giờ đón", "Chưa có nơi đón"] });
  const tuDoRong = dongGapThe(td2({ adult: 2 }, [chang({ don: TU_DO, donTuDo: "  ", pickupTime: "08:00" })]), { today: HOM_NAY, nhanTheoId });
  assert.deepEqual(tuDoRong.chips, ["Chưa có nơi đón"], "chọn Gõ tự do mà chưa gõ địa chỉ = chưa có nơi đón");
  assert.deepEqual(dongGapThe(td2({ adult: 2 }, []), { today: HOM_NAY, nhanTheoId }), { khach: "2 NL", don: null, chips: [] }, "không đưa đón: không chip thiếu");
  const ngung = dongGapThe(td2({ adult: 2 }, [changDu({ don: "99999999-9999-4999-8999-999999999999" })]), { today: HOM_NAY, nhanTheoId });
  assert.equal(ngung.don, "đón 07:30 Điểm đã ngưng", "điểm đã ngưng, không nhãn đã lưu: như dòng tóm tắt chặng");
});

test("dongGapThe: chặng hiện trên dòng gập là chiều đi đầu tiên (chiều về đứng trước cũng không lấy)", () => {
  const ve = { ...themChieuVe([changDu()], null, NGAY, "c2"), pickupTime: "16:00", don: SAN_BAY_ID };
  assert.equal(dongGapThe(td2({ adult: 2 }, [ve, changDu()]), { today: HOM_NAY, nhanTheoId }).don, "đón 07:30 KS Biển Xanh");
});

test("dongGapThe: dịch vụ theo nhóm và nhập tay ghi \"N khách\" (không phải \"N NL\")", () => {
  const nhom = { ...setPax(newCatalogDraft(phao, "k2"), "adult", 7), trip: { ...newCatalogDraft(phao, "k2").trip, departDate: NGAY } };
  assert.equal(dongGapThe(nhom, { today: HOM_NAY, nhanTheoId }).khach, "7 khách");
  const tay = setGuests({ ...newManualDraft("k3"), name: "Xe riêng" }, 3);
  assert.equal(dongGapThe({ ...tay, trip: { ...tay.trip, departDate: NGAY } }, { today: HOM_NAY, nhanTheoId }).khach, "3 khách");
  assert.equal(dongGapThe({ ...tay, guests: 0, trip: { ...tay.trip, departDate: NGAY } }, { today: HOM_NAY, nhanTheoId }).khach, "");
});

test("dongGapThe: cảnh báo của thẻ mở cũng thành chip khi gập (giá danh mục đổi, đã ẩn khỏi danh mục, khác giá danh mục, ngày đã qua, đặt gấp)", () => {
  assert.deepEqual(dongGapThe({ ...td2(), catalogStatus: "price_changed" }, { today: HOM_NAY, nhanTheoId }).chips, ["Giá danh mục đã đổi"]);
  assert.deepEqual(dongGapThe({ ...td2(), catalogStatus: "unavailable" }, { today: HOM_NAY, nhanTheoId }).chips, ["Dịch vụ đã ẩn khỏi danh mục"]);
  assert.deepEqual(dongGapThe(setUnitPrice(td2(), "adult", 1250000), { today: HOM_NAY, nhanTheoId }).chips, ["Khác giá danh mục"]);
  const qua = td2();
  assert.deepEqual(dongGapThe({ ...qua, trip: { ...qua.trip, departDate: "2026-10-10" } }, { today: HOM_NAY, nhanTheoId }).chips, ["Ngày khởi hành đã qua"]);
  assert.deepEqual(dongGapThe(td2(), { today: HOM_NAY, nhanTheoId, chipNgoai: [CHIP_DAT_GAP] }).chips, ["Cần đặt gấp"]);
  const nhieu = dongGapThe({ ...td2({ adult: 2 }, [chang()]), catalogStatus: "price_changed" }, { today: HOM_NAY, nhanTheoId, chipNgoai: [CHIP_DAT_GAP, CHIP_DAT_GAP] });
  assert.deepEqual(nhieu.chips, ["Chưa chốt giờ đón", "Chưa có nơi đón", "Giá danh mục đã đổi", "Cần đặt gấp"], "thiếu trước, cảnh báo sau, không lặp");
});

test("canhBaoChuyenThe: giờ đón so với giờ khởi hành lấy giờ của chiều đi SỚM NHẤT có giờ (như cảnh báo của thẻ mở)", () => {
  const d = td2({ adult: 2 }, [changDu({ pickupTime: "09:00" }), changDu({ pickupTime: "08:15" })]);
  assert.deepEqual(canhBaoChuyenThe({ ...d, trip: { ...d.trip, departTime: "08:00" } }, HOM_NAY).map((w) => w.code), ["pickup_after_depart"]);
  assert.deepEqual(canhBaoChuyenThe({ ...d, trip: { ...d.trip, departTime: "08:30" } }, HOM_NAY), []);
});
