// Luật thuần của bước xác minh phiếu đăng ký (ADR-0207 Đ2, Đ3; ADR-0210 Đ1). Không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MA_LY_DO_PHIEU, laMaLyDoPhieu, nhanLyDoPhieu } from "../../shared/dang-ky-hien-thi.ts";
import { LY_DO_TU_CHOI } from "../../shared/xac-minh-hien-thi.ts";
import { kiemDat, kiemKetLuan, kiemLyDo, laMaPhieu, laMaTep, mucBatBuoc, mucChuaDat } from "./xac-minh.ts";

const BAT_BUOC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];

test("mục bắt buộc = hợp của mục chỉ phiếu cần và mục của hồ sơ, không trùng, bỏ mã sai dạng", () => {
  assert.deepEqual(mucBatBuoc("ROLE,CALLED", ["HO_TEN", "NGAY_SINH", "CCCD"]), BAT_BUOC);
  assert.deepEqual(mucBatBuoc("ROLE, HO_TEN ,,x y", ["HO_TEN"]), ["ROLE", "HO_TEN"]);
  assert.deepEqual(mucBatBuoc("", []), []);
});

test("mục chưa đạt: chưa kết luận hoặc «không đạt» đều chưa đạt", () => {
  const kl = new Map<string, "DAT" | "KHONG_DAT">([["ROLE", "DAT"], ["CALLED", "KHONG_DAT"], ["HO_TEN", "DAT"]]);
  assert.deepEqual(mucChuaDat(BAT_BUOC, kl), ["CALLED", "NGAY_SINH", "CCCD"]);
});

test("chín mã lý do: bảy dùng lại nhãn phiếu tự khai (bỏ «hồ sơ đã gộp»), hai mã mới", () => {
  assert.equal(MA_LY_DO_PHIEU.length, 9);
  assert.equal(laMaLyDoPhieu("HO_SO_DA_GOP"), false);
  const dungLai = Object.keys(LY_DO_TU_CHOI).filter((m) => m !== "HO_SO_DA_GOP");
  assert.equal(dungLai.length, 7);
  for (const m of dungLai) assert.equal(nhanLyDoPhieu(m), LY_DO_TU_CHOI[m as keyof typeof LY_DO_TU_CHOI]);
  assert.deepEqual(MA_LY_DO_PHIEU.filter((m) => !dungLai.includes(m)).sort(), ["KHONG_LIEN_LAC_DUOC", "KHONG_THUOC_DIEN"]);
  assert.equal(nhanLyDoPhieu("MA_LA"), "Lý do khác");
});

test("kiemKetLuan: đạt không kèm lý do; không đạt đòi mã trong danh sách; mục phải thuộc tập; không trường thừa", () => {
  assert.deepEqual(kiemKetLuan({ muc: "CALLED", dat: true }, BAT_BUOC), { ok: true, value: { muc: "CALLED", dat: true, lyDo: null } });
  assert.deepEqual(kiemKetLuan({ muc: "CCCD", dat: false, lyDo: "GIAY_TO_HET_HAN" }, BAT_BUOC), { ok: true, value: { muc: "CCCD", dat: false, lyDo: "GIAY_TO_HET_HAN" } });
  for (const x of [null, {}, { muc: "X", dat: true }, { muc: "CCCD", dat: "co" }, { muc: "CCCD", dat: false }, { muc: "CCCD", dat: false, lyDo: "tuy-y" }, { muc: "CCCD", dat: true, lyDo: "KHONG_DOC_DUOC" }, { muc: "CCCD", dat: true, a: 1 }]) {
    assert.equal(kiemKetLuan(x as never, BAT_BUOC).ok, false, JSON.stringify(x));
  }
});

test("kiemLyDo, kiemDat, mã phiếu, mã tệp", () => {
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN" }).ok, true);
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN", ghiChu: "x" }).ok, false);
  assert.equal(kiemLyDo(null).ok, false);
  assert.deepEqual(kiemDat({}), { ok: true, value: { hoSo: null, nguoiGioiThieuPartyId: null } });
  assert.deepEqual(kiemDat({ hoSo: { kieu: "MOI" } }), { ok: true, value: { hoSo: { kieu: "MOI" }, nguoiGioiThieuPartyId: null } });
  assert.deepEqual(kiemDat({ hoSo: { kieu: "CO_SAN", partyId: "pty-1" }, nguoiGioiThieuPartyId: "pty-2" }), { ok: true, value: { hoSo: { kieu: "CO_SAN", partyId: "pty-1" }, nguoiGioiThieuPartyId: "pty-2" } });
  for (const x of [{ hoSo: { kieu: "CO_SAN" } }, { hoSo: { kieu: "MOI", partyId: "p" } }, { hoSo: "MOI" }, { hoSo: { kieu: "CO_SAN", partyId: "a b" } }, { x: 1 }, { nguoiGioiThieuPartyId: 5 }]) {
    assert.equal(kiemDat(x as never).ok, false, JSON.stringify(x));
  }
  assert.equal(laMaPhieu("DK_ABCDEFGH"), true);
  assert.equal(laMaPhieu("DK_abcdefgh"), false);
  assert.equal(laMaTep(crypto.randomUUID()), true);
  assert.equal(laMaTep("../x"), false);
});
