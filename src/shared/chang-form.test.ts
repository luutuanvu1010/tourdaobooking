// Mô hình thuần khối "Đưa đón" (bản vẽ the-dua-don.dc.html — M1, M4, M6) — src/shared/chang-form.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TU_DO, cauDoiNgay, giuDatGapNhap, changDaDoi, changTaoSan, changTuDto, coOSoHieu, doiNgayDi, goiYChang, legInput, loiChang, loiDanhSachChang, suaChang, themChangDi, themChieuVe,
} from "./chang-form.ts";
import { NOI_DON_CHUA_GHI } from "./chang-dua-don.ts";
import type { MauChang } from "./chang-mac-dinh.ts";
import type { LegDto } from "./contracts.ts";

const GA = "11111111-1111-4111-8111-111111111111";
const KS = "22222222-2222-4222-8222-222222222222";
const HAI_CHIEU: MauChang = { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinh: { id: GA, ten: "Ga cáp treo Vinpearl" } };
let n = 0;
const k = () => `c${++n}`;
const dto = (o: Partial<LegDto> = {}): LegDto => ({
  id: "33333333-3333-4333-8333-333333333333", direction: "OUT", pickupDate: "2026-09-30", pickupTime: "07:30", pickupLocationId: KS, pickupPlace: null, pickupLabel: "KS",
  dropoffLocationId: GA, dropoffPlace: null, dropoffLabel: "Ga", updatedAt: "t1", flightCode: null, paxOverride: null, datGap: null, ...o,
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
  assert.equal(cauDoiNgay(2), "Đã dời ngày đón của 2 chặng theo ngày đi mới");
  assert.equal(goiYChang(r.legs[1]!, "2026-10-02").ngay, "Khác ngày đi (02/10)");
  // Chưa có ngày đi → điền ngày mới cho chặng chưa có ngày.
  assert.deepEqual(doiNgayDi([themChangDi(null, "", k())], "", "2026-10-02").legs.map((l) => l.pickupDate), ["2026-10-02"]);
});

test("lỗi dòng đúng chữ bản vẽ: nơi đón chỉ sau khi bấm Lưu; số người chiều về quá số khách báo ngay", () => {
  const l = themChangDi(null, "", k());
  assert.deepEqual(loiChang(l, 1, 4, false), { don: null, donTuDo: null, soVe: null });
  assert.equal(loiChang(l, 1, 4, true).don, "Chặng 1: chưa có nơi đón.");
  assert.equal(loiChang({ ...l, don: TU_DO }, 1, 4, true).donTuDo, "Chặng 1: chưa ghi địa chỉ đón.");
  const ve = { ...themChieuVe([l], null, "", k()), don: GA, soVe: "5" };
  assert.equal(loiChang(ve, 2, 4, false).soVe, "Số người chiều về không được quá 4.");
  assert.deepEqual(loiDanhSachChang([l, ve], 4), ["Chặng 1: chưa có nơi đón.", "Số người chiều về không được quá 4."]);
});

test("legInput: nơi đón ĐÚNG MỘT (điểm hoặc chữ); nơi trả trống = chưa chốt; paxOverride CHỈ khi được sửa (văn phòng) và chỉ chiều về", () => {
  const di = { ...themChangDi(null, "2026-09-30", k()), don: TU_DO, donTuDo: "  12 Số 5 ", pickupTime: "07:30", flightCode: "vn1553" };
  assert.deepEqual(legInput(di, true), {
    direction: "OUT", pickupDate: "2026-09-30", pickupTime: "07:30", pickupLocationId: null, pickupPlace: "12 Số 5", dropoffLocationId: null, dropoffPlace: "", flightCode: "vn1553",
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
