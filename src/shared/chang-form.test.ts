// Mô hình thuần khối "Đưa đón" (bản vẽ the-dua-don.dc.html — M1, M4, M6) — src/shared/chang-form.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TU_DO, canHienNgayDon, cauDoiNgay, chiTietChangCoGiaTri, giuDatGapNhap, changDaDoi, changNenGon, changTaoSan, changTuDto, coOSoHieu, doiNgayDi, goiYChang, legInput, loiChang, loiDanhSachChang, suaChang, themChangDi, themChieuVe, tomTatChang,
} from "./chang-form.ts";
import { CHO_TOI_THIEU_MAX, CHO_TOI_THIEU_MIN, NOI_DON_CHUA_GHI } from "./chang-dua-don.ts";
import type { MauChang } from "./chang-mac-dinh.ts";
import type { LegDto } from "./contracts.ts";

const GA = "11111111-1111-4111-8111-111111111111";
const KS = "22222222-2222-4222-8222-222222222222";
const HAI_CHIEU: MauChang = { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinh: { id: GA, ten: "Ga cáp treo Vinpearl" } };
let n = 0;
const k = () => `c${++n}`;
const dto = (o: Partial<LegDto> = {}): LegDto => ({
  id: "33333333-3333-4333-8333-333333333333", direction: "OUT", pickupDate: "2026-09-30", pickupTime: "07:30", pickupLocationId: KS, pickupPlace: null, pickupLabel: "KS",
  dropoffLocationId: GA, dropoffPlace: null, dropoffLabel: "Ga", updatedAt: "t1", flightCode: null, paxOverride: null, exclusiveVehicle: false, minVehicleSeats: null, datGap: null, ...o,
});

test("M6: mẫu Hai chiều tạo sẵn chiều đi + chiều về; nơi trả gợi ý; chiều về đi theo chiều đi; câu ghi chú đúng bản vẽ", () => {
  const r = changTaoSan(HAI_CHIEU, "2026-09-30", k);
  assert.equal(r.taoSan, "Đã tạo sẵn chiều đi và chiều về theo dịch vụ — sửa hoặc bỏ nếu khác.");
  const [di, ve] = r.legs;
  assert.equal(di!.direction, "OUT");
  assert.equal(di!.don, "");
  assert.equal(di!.tra, GA);
  assert.equal(di!.pickupDate, "2026-09-30");
  assert.deepEqual(goiYChang(di!, "2026-09-30"), { ngay: "Bằng ngày đi", gio: "", don: "", tra: "gợi ý theo dịch vụ" });
  assert.equal(ve!.direction, "RETURN");
  assert.equal(ve!.don, GA);
  assert.equal(ve!.pickupTime, "16:30");
  assert.deepEqual(goiYChang(ve!, "2026-09-30"), { ngay: "Bằng ngày đi", gio: "gợi ý theo dịch vụ", don: "theo nơi trả chiều đi", tra: "theo nơi đón chiều đi" });
  const mot = changTaoSan({ mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinh: null }, "", k);
  assert.equal(mot.taoSan, "Đã tạo sẵn chiều đi theo dịch vụ — sửa hoặc bỏ nếu khác.");
  assert.equal(mot.legs.length, 1);
  assert.deepEqual(changTaoSan(null, "", k), { legs: [], taoSan: null });
  assert.deepEqual(changTaoSan({ mode: "NONE", returnTimeHint: null, noiTraMacDinh: null }, "", k), { legs: [], taoSan: null });
});

test("M6: chọn nơi đón chiều đi → chiều về tự đảo (nơi trả về = nơi đón đi); sửa ô của chiều về thì ô đó thôi đi theo", () => {
  let legs = changTaoSan(HAI_CHIEU, "2026-09-30", k).legs;
  legs = suaChang(legs, 0, { don: KS });
  assert.equal(legs[1]!.tra, KS);
  legs = suaChang(legs, 0, { don: TU_DO, donTuDo: "12 Số 5" });
  assert.equal(legs[1]!.tra, TU_DO);
  assert.equal(legs[1]!.traTuDo, "12 Số 5");
  legs = suaChang(legs, 1, { tra: GA });
  assert.equal(legs[1]!.theoTra, false);
  assert.equal(goiYChang(legs[1]!, "2026-09-30").tra, "");
  legs = suaChang(legs, 0, { don: KS });
  assert.equal(legs[1]!.tra, GA, "đã thôi đi theo");
  // Đổi nơi trả chiều đi → nơi đón chiều về (còn đi theo) đổi theo.
  legs = suaChang(legs, 0, { tra: KS });
  assert.equal(legs[1]!.don, KS);
  // Sửa giờ chiều về → mất chữ "gợi ý theo dịch vụ".
  legs = suaChang(legs, 1, { pickupTime: "17:00" });
  assert.equal(goiYChang(legs[1]!, "2026-09-30").gio, "");
});

test("thêm chặng / thêm chiều về theo bản vẽ", () => {
  const di = themChangDi(HAI_CHIEU, "2026-09-30", k());
  assert.equal(di.tra, GA);
  assert.equal(di.goiYTra, true);
  assert.equal(themChangDi(null, "", k()).tra, "");
  const ve = themChieuVe([{ ...di, don: KS }], HAI_CHIEU, "2026-09-30", k());
  assert.deepEqual([ve.direction, ve.don, ve.tra, ve.pickupTime, ve.theoDon, ve.theoTra], ["RETURN", GA, KS, "16:30", true, true]);
});

test("dời ngày đón theo ngày đi mới; câu 'Đã dời ngày đón của N chặng theo ngày đi mới'", () => {
  const legs = [changTuDto(dto(), k()), changTuDto(dto({ pickupDate: "2026-09-29" }), k()), { ...themChangDi(null, "", k()) }];
  const r = doiNgayDi(legs, "2026-09-30", "2026-10-02");
  assert.deepEqual(r.legs.map((l) => l.pickupDate), ["2026-10-02", "2026-10-01", ""]);
  assert.equal(r.soDoi, 2);
  assert.equal(cauDoiNgay(2), "Đã dời ngày đón của 2 lượt đưa đón theo ngày đi mới");
  assert.equal(goiYChang(r.legs[1]!, "2026-10-02").ngay, "Khác ngày đi (02/10)");
  // Chưa có ngày đi → điền ngày mới cho chặng chưa có ngày.
  assert.deepEqual(doiNgayDi([themChangDi(null, "", k())], "", "2026-10-02").legs.map((l) => l.pickupDate), ["2026-10-02"]);
});

test("ngưỡng số chỗ tối thiểu của form trùng hằng phía máy chủ (không viết cứng)", () => {
  const l = themChangDi(null, "", k());
  const loi = (v: number) => loiChang({ ...l, choToiThieu: String(v) }, 1, 4, false).choToiThieu;
  assert.equal(loi(CHO_TOI_THIEU_MIN), null);
  assert.equal(loi(CHO_TOI_THIEU_MAX), null);
  assert.notEqual(loi(CHO_TOI_THIEU_MIN - 1), null);
  assert.notEqual(loi(CHO_TOI_THIEU_MAX + 1), null);
});

test("lỗi dòng đúng chữ bản vẽ: nơi đón chỉ sau khi bấm Lưu; số người chiều về quá số khách báo ngay", () => {
  const l = themChangDi(null, "", k());
  assert.deepEqual(loiChang(l, 1, 4, false), { don: null, donTuDo: null, soVe: null, choToiThieu: null });
  assert.equal(loiChang(l, 1, 4, true).don, "Lượt 1: chưa có nơi đón.");
  assert.equal(loiChang({ ...l, don: TU_DO }, 1, 4, true).donTuDo, "Lượt 1: chưa ghi địa chỉ đón.");
  const ve = { ...themChieuVe([l], null, "", k()), don: GA, soVe: "5" };
  assert.equal(loiChang(ve, 2, 4, false).soVe, "Số người chiều về không được quá 4.");
  assert.deepEqual(loiDanhSachChang([l, ve], 4), ["Lượt 1: chưa có nơi đón.", "Số người chiều về không được quá 4."]);
});

test("legInput: nơi đón ĐÚNG MỘT (điểm hoặc chữ); nơi trả trống = chưa chốt; paxOverride CHỈ khi được sửa (văn phòng) và chỉ chiều về", () => {
  const di = { ...themChangDi(null, "2026-09-30", k()), don: TU_DO, donTuDo: "  12 Số 5 ", pickupTime: "07:30", flightCode: "vn1553" };
  assert.deepEqual(legInput(di, true), {
    direction: "OUT", pickupDate: "2026-09-30", pickupTime: "07:30", pickupLocationId: null, pickupPlace: "12 Số 5", dropoffLocationId: null, dropoffPlace: "", flightCode: "vn1553",
    exclusiveVehicle: false, minVehicleSeats: null,
  });
  const ve = changTuDto(dto({ direction: "RETURN", paxOverride: 2 }), k());
  assert.equal(legInput(ve, true).paxOverride, 2);
  assert.equal(legInput({ ...ve, soVe: "" }, true).paxOverride, null);
  assert.equal("paxOverride" in legInput(ve, false), false, "Đối tác / Thực tập: khoá vắng = giữ");
  assert.equal(legInput(ve, true).id, ve.id);
  assert.equal("pickupTime" in legInput(ve, true), true);
});

test("changTuDto: chữ tạm '(chưa ghi nơi đón)' hiện như chưa chọn; chữ tự do → 'Gõ tự do…'", () => {
  const a = changTuDto(dto({ pickupLocationId: null, pickupPlace: NOI_DON_CHUA_GHI }), k());
  assert.equal(a.don, "");
  const b = changTuDto(dto({ pickupLocationId: null, pickupPlace: "Nhà riêng", dropoffLocationId: null, dropoffPlace: null }), k());
  assert.deepEqual([b.don, b.donTuDo, b.tra], [TU_DO, "Nhà riêng", ""]);
});

test("changDaDoi: y nguyên → false; đổi giờ / nơi trả / số hiệu → true; chặng mới → true", () => {
  const l = changTuDto(dto(), k());
  assert.equal(changDaDoi(l, true), false);
  assert.equal(changDaDoi(suaChang([l], 0, { pickupTime: "08:00" })[0]!, true), true);
  assert.equal(changDaDoi(suaChang([l], 0, { tra: "" })[0]!, true), true);
  assert.equal(changDaDoi(suaChang([l], 0, { flightCode: "vn1" })[0]!, true), true);
  assert.equal(changDaDoi(themChangDi(null, "", k()), true), true);
});

test("ô số hiệu chuyến bay: hiện khi nơi đón / nơi trả là sân bay hoặc đã có số hiệu", () => {
  const sb = (id: string) => id === GA;
  const l = changTuDto(dto({ dropoffLocationId: KS }), k());
  assert.equal(coOSoHieu(l, sb), false);
  assert.equal(coOSoHieu({ ...l, tra: GA }, sb), true);
  assert.equal(coOSoHieu({ ...l, flightCode: "VN1" }, sb), true);
});

test("giuDatGapNhap: chặng đã đặt gấp giữ nguyên ngày/giờ/nơi → giữ dấu; đổi giờ → mất; chặng không dấu → false", () => {
  const l = changTuDto(dto({ datGap: { daDuyet: true } }), k());
  assert.equal(giuDatGapNhap(l), true);
  assert.equal(giuDatGapNhap(suaChang([l], 0, { flightCode: "VN1" })[0]!), true, "ô phụ không làm mất dấu");
  assert.equal(giuDatGapNhap(suaChang([l], 0, { pickupTime: "09:00" })[0]!), false);
  assert.equal(giuDatGapNhap(changTuDto(dto(), k())), false);
});

test("Đợt 7 / 8b: ô mới của chặng mới và của mẫu = tắt / để trống; changTuDto đọc từ chặng đã lưu", () => {
  for (const l of [themChangDi(null, "", k()), themChieuVe([themChangDi(null, "", k())], null, "", k()), ...changTaoSan(HAI_CHIEU, "2026-09-30", k).legs]) {
    assert.equal(l.xeRieng, false);
    assert.equal(l.choToiThieu, "");
  }
  const c = changTuDto(dto({ exclusiveVehicle: true, minVehicleSeats: 15 }), k());
  assert.deepEqual([c.xeRieng, c.choToiThieu], [true, "15"]);
  assert.deepEqual([changTuDto(dto(), k()).xeRieng, changTuDto(dto(), k()).choToiThieu], [false, ""]);
});

test("Đợt 7 / 8b: legInput LUÔN gửi hai khoá cam kết (kể cả guiSoVe = false); ô trống → null", () => {
  const l = changTuDto(dto(), k());
  for (const gui of [true, false]) {
    const x = legInput(l, gui);
    assert.equal(x.exclusiveVehicle, false);
    assert.equal(x.minVehicleSeats, null);
  }
  const co = suaChang([l], 0, { xeRieng: true, choToiThieu: "15" })[0]!;
  assert.equal(legInput(co, false).exclusiveVehicle, true);
  assert.equal(legInput(co, false).minVehicleSeats, 15);
  assert.equal(legInput({ ...co, choToiThieu: "" }, false).minVehicleSeats, null);
});

test("Đợt 7 / 8b: suaChang lọc ô số chỗ chỉ còn chữ số, tối đa 3 ký tự", () => {
  const l = themChangDi(null, "", k());
  assert.equal(suaChang([l], 0, { choToiThieu: "1a5-" })[0]!.choToiThieu, "15");
  assert.equal(suaChang([l], 0, { choToiThieu: "12345" })[0]!.choToiThieu, "123");
});

test("Đợt 7 / 8b: changDaDoi chỉ-bật-xe-riêng / chỉ-đổi-số-chỗ → true, kể cả guiSoVe = false", () => {
  const l = changTuDto(dto(), k());
  assert.equal(changDaDoi(suaChang([l], 0, { xeRieng: true })[0]!, false), true);
  assert.equal(changDaDoi(suaChang([l], 0, { choToiThieu: "15" })[0]!, true), true);
  assert.equal(changDaDoi(suaChang([l], 0, { choToiThieu: "15" })[0]!, false), true);
  const co = changTuDto(dto({ exclusiveVehicle: true, minVehicleSeats: 15 }), k());
  assert.equal(changDaDoi(co, false), false);
});

test("Đợt 7 / 8b: loiChang số chỗ — '0' và '120' báo 'Số chỗ từ 1 đến 100'; 1, 100, trống thì không; dải lỗi có tiền tố chặng", () => {
  const l = themChangDi(null, "", k());
  const loi = (v: string) => loiChang({ ...l, choToiThieu: v }, 2, 4, false).choToiThieu;
  assert.equal(loi("0"), "Số chỗ từ 1 đến 100");
  assert.equal(loi("120"), "Số chỗ từ 1 đến 100");
  for (const ok of ["", "1", "15", "100"]) assert.equal(loi(ok), null, `"${ok}"`);
  assert.deepEqual(loiDanhSachChang([{ ...l, don: GA, choToiThieu: "120" }], 4), ["Lượt 1: số chỗ từ 1 đến 100."]);
});

test("Đợt 1 #9: canHienNgayDon — form Tạo đơn ẩn 'Ngày đón' khi chặng cùng ngày đi hoặc chưa có ngày (máy chủ tự điền); LUÔN hiện khi chặng có ngày đón khác ngày đi", () => {
  const NGAY = "2026-10-16";
  assert.equal(canHienNgayDon({ pickupDate: NGAY }, NGAY), false, "cùng ngày đi");
  assert.equal(canHienNgayDon({ pickupDate: "" }, NGAY), false, "chưa có ngày đón → máy chủ điền ngày đi (Ruling R4b)");
  assert.equal(canHienNgayDon({ pickupDate: "" }, ""), false, "đơn chưa chọn ngày: không có gì để lệch");
  assert.equal(canHienNgayDon({ pickupDate: "2026-10-15" }, NGAY), true, "đón hôm trước");
  assert.equal(canHienNgayDon({ pickupDate: "2026-10-17" }, NGAY), true, "đón hôm sau");
  assert.equal(canHienNgayDon({ pickupDate: "2026-10-17" }, ""), true, "có ngày đón mà đơn chưa có ngày đi: vẫn hiện, không giấu một giá trị đang có");
  // dời ngày đi cả đơn: chặng đang cùng ngày đi dời theo (vẫn ẩn); chặng đã lệch giữ lệch (vẫn hiện)
  const l1 = { ...themChangDi(null, NGAY, k()), pickupDate: NGAY };
  const l2 = { ...themChangDi(null, NGAY, k()), pickupDate: "2026-10-17" };
  const r = doiNgayDi([l1, l2], NGAY, "2026-10-20");
  assert.deepEqual(r.legs.map((l) => canHienNgayDon(l, "2026-10-20")), [false, true]);
});

// ---- bản "bốn bước" (14/10/2026): chặng gọn một dòng + chi tiết ít dùng gập -------------------------------------------------------------------------------------------------------

const NGAY_DI = "2026-09-30";
const chang = (o: Partial<LegDto> = {}, key = "g1") => changTuDto(dto(o), key);

test("bốn bước: chiTietChangCoGiaTri — xe riêng Bật, số chỗ tối thiểu: có giá trị thì khối chi tiết phải tự mở; số hiệu chuyến bay KHÔNG còn nằm trong khối gập (sau kiểm độc lập 14/10: hiện sẵn khi chặng tới / từ sân bay)", () => {
  const l = chang();
  assert.equal(chiTietChangCoGiaTri(l), false);
  assert.equal(chiTietChangCoGiaTri({ ...l, flightCode: "VN1553" }), false, "số hiệu hiện sẵn ngoài khối gập nên không làm khối gập tự mở");
  assert.equal(chiTietChangCoGiaTri({ ...l, xeRieng: true }), true);
  assert.equal(chiTietChangCoGiaTri({ ...l, choToiThieu: "7" }), true);
});

test("bốn bước: changNenGon — chỉ gọn khi đủ nơi đón và KHÔNG có gì bị giấu sau dòng tóm tắt", () => {
  assert.equal(changNenGon(chang(), 1, 2, NGAY_DI), true, "chặng đã lưu đủ nơi đón, không ô ít dùng nào: gọn");
  assert.equal(changNenGon(changTuDto(dto({ pickupLocationId: null, pickupPlace: "12 Trần Phú" }), "g2"), 1, 2, NGAY_DI), true, "nơi gõ tự do có địa chỉ: gọn");
  assert.equal(changNenGon({ ...chang(), don: "" }, 1, 2, NGAY_DI), false, "chưa có nơi đón (chặng vừa tạo): mở sẵn để nhập");
  assert.equal(changNenGon({ ...chang(), don: TU_DO, donTuDo: "  " }, 1, 2, NGAY_DI), false, "Gõ tự do nhưng chưa ghi địa chỉ: mở");
  assert.equal(changNenGon({ ...chang(), xeRieng: true }, 1, 2, NGAY_DI), false, "xe riêng Bật: mở (không giấu)");
  assert.equal(changNenGon({ ...chang(), choToiThieu: "7" }, 1, 2, NGAY_DI), false);
  assert.equal(changNenGon({ ...chang(), flightCode: "VN1553" }, 1, 2, NGAY_DI), false);
  assert.equal(changNenGon(chang(), 1, 2, NGAY_DI, true), false, "chặng có ô số hiệu chuyến bay (điểm sân bay): mở sẵn để ô hiện, không gập một dòng");
  assert.equal(changNenGon(chang(), 1, 2, NGAY_DI, false), true);
  assert.equal(changNenGon({ ...chang(), pickupDate: "2026-09-29" }, 1, 2, NGAY_DI), false, "đón khác ngày đi: mở (ô ngày đang có giá trị)");
  assert.equal(changNenGon({ ...chang(), pickupDate: NGAY_DI }, 1, 2, NGAY_DI), true, "cùng ngày đi: không có gì khác");
  assert.equal(changNenGon({ ...chang({ direction: "RETURN", paxOverride: 1 }), soVe: "1" }, 1, 2, NGAY_DI), false, "chiều về có số người về: mở");
  assert.equal(changNenGon({ ...chang({ direction: "RETURN" }), soVe: "5" }, 1, 2, NGAY_DI), false, "số người về quá số khách (lỗi): mở");
  assert.equal(changNenGon({ ...chang(), choToiThieu: "0" }, 1, 2, NGAY_DI), false, "số chỗ sai (lỗi): mở");
});

test("bốn bước: tomTatChang — 'Chiều đi · Đón 07:30 · Khách sạn ABC → Cảng Vinpearl'; thiếu giờ / nơi trả; điểm đã ngưng dùng nhãn đã lưu", () => {
  const tra = (id: string) => ({ [KS]: "Khách sạn ABC", [GA]: "Cảng Vinpearl" })[id] ?? null;
  assert.equal(tomTatChang(chang(), tra), "Chiều đi · Đón 07:30 · Khách sạn ABC → Cảng Vinpearl");
  assert.equal(tomTatChang({ ...chang(), pickupTime: "", tra: "" }, tra), "Chiều đi · Chưa chốt giờ · Khách sạn ABC");
  assert.equal(tomTatChang({ ...chang({ direction: "RETURN" }), don: TU_DO, donTuDo: " 12 Trần Phú ", tra: TU_DO, traTuDo: "Sân bay Cam Ranh" }, tra), "Chiều về · Đón 07:30 · 12 Trần Phú → Sân bay Cam Ranh");
  assert.equal(tomTatChang(chang({ pickupLabel: "KS cũ" }), () => null), "Chiều đi · Đón 07:30 · KS cũ → Ga", "điểm không còn trong danh mục: nhãn đã lưu của chặng");
});
