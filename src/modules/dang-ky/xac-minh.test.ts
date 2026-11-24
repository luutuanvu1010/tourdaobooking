// Luật thuần của bước xác minh phiếu đăng ký (ADR-0207 Đ2, Đ3; ADR-0210 Đ1). Không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MA_LY_DO_PHIEU, laMaLyDoPhieu, nhanLyDoPhieu } from "../../shared/dang-ky-hien-thi.ts";
import { LY_DO_TU_CHOI } from "../../shared/xac-minh-hien-thi.ts";
import { kiemDat, kiemDuyet, kiemKetLuan, kiemLyDo, laMaPhieu, laMaTep, loiLoDuyet, mucBatBuoc, mucChuaDat } from "./xac-minh.ts";

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
  assert.deepEqual(kiemKetLuan({ muc: "CALLED", dat: true, phienBan: 1 }, BAT_BUOC), { ok: true, value: { muc: "CALLED", dat: true, lyDo: null, phienBan: 1 } });
  assert.deepEqual(kiemKetLuan({ muc: "CCCD", dat: false, lyDo: "GIAY_TO_HET_HAN", phienBan: 3 }, BAT_BUOC), { ok: true, value: { muc: "CCCD", dat: false, lyDo: "GIAY_TO_HET_HAN", phienBan: 3 } });
  for (const x of [null, {}, { muc: "X", dat: true, phienBan: 1 }, { muc: "CCCD", dat: "co", phienBan: 1 }, { muc: "CCCD", dat: false, phienBan: 1 }, { muc: "CCCD", dat: false, lyDo: "tuy-y", phienBan: 1 }, { muc: "CCCD", dat: true, lyDo: "KHONG_DOC_DUOC", phienBan: 1 }, { muc: "CCCD", dat: true, a: 1, phienBan: 1 },
    { muc: "CCCD", dat: true }, { muc: "CCCD", dat: true, phienBan: 0 }, { muc: "CCCD", dat: true, phienBan: 1.5 }, { muc: "CCCD", dat: true, phienBan: "1" }]) {
    assert.equal(kiemKetLuan(x as never, BAT_BUOC).ok, false, JSON.stringify(x));
  }
});

test("kiemLyDo, kiemDat, mã phiếu, mã tệp", () => {
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN", phienBan: 1 }).ok, true);
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN" }).ok, false, "thiếu phienBan");
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN", phienBan: 0 }).ok, false);
  assert.equal(kiemLyDo({ lyDo: "KHONG_THUOC_DIEN", phienBan: 1, ghiChu: "x" }).ok, false);
  assert.equal(kiemLyDo(null).ok, false);
  assert.deepEqual(kiemDat({ phienBan: 1 }), { ok: true, value: { hoSo: null, hoSoToChuc: null, nguoiGioiThieuPartyId: null, phienBan: 1 } });
  assert.deepEqual(kiemDat({ hoSo: { kieu: "MOI" }, phienBan: 2 }), { ok: true, value: { hoSo: { kieu: "MOI" }, hoSoToChuc: null, nguoiGioiThieuPartyId: null, phienBan: 2 } });
  assert.deepEqual(kiemDat({ hoSo: { kieu: "CO_SAN", partyId: "pty-1" }, nguoiGioiThieuPartyId: "pty-2", phienBan: 1 }), { ok: true, value: { hoSo: { kieu: "CO_SAN", partyId: "pty-1" }, hoSoToChuc: null, nguoiGioiThieuPartyId: "pty-2", phienBan: 1 } });
  // Kết luận Danh bạ của tổ chức (ADR-0212 Đ5; đợt 2 Task 6): cùng dạng với của người, độc lập.
  assert.deepEqual(kiemDat({ hoSoToChuc: { kieu: "CO_SAN", partyId: "org-1" }, phienBan: 1 }), { ok: true, value: { hoSo: null, hoSoToChuc: { kieu: "CO_SAN", partyId: "org-1" }, nguoiGioiThieuPartyId: null, phienBan: 1 } });
  assert.equal(kiemDat({ hoSoToChuc: { kieu: "MOI", partyId: "x" }, phienBan: 1 }).ok, false, "hồ sơ tổ chức mới không kèm mã");
  assert.equal(kiemDat({ hoSoToChuc: "MOI", phienBan: 1 }).ok, false);
  assert.equal(kiemDat({}).ok, false, "thiếu phienBan");
  for (const x of [{ hoSo: { kieu: "CO_SAN" } }, { hoSo: { kieu: "MOI", partyId: "p" } }, { hoSo: "MOI" }, { hoSo: { kieu: "CO_SAN", partyId: "a b" } }, { x: 1 }, { nguoiGioiThieuPartyId: 5 }].map((o) => ({ ...o, phienBan: 1 }))) {
    assert.equal(kiemDat(x as never).ok, false, JSON.stringify(x));
  }
  assert.equal(laMaPhieu("DK_ABCDEFGH"), true);
  assert.equal(laMaPhieu("DK_abcdefgh"), false);
  assert.equal(laMaTep(crypto.randomUUID()), true);
  assert.equal(laMaTep("../x"), false);
});

test("Task 13 vòng sửa 1: lô hỏng ở liên kết người quản lý (trigger hai đầu, chỉ mục một người quản lý) ⇒ 409 org_link_failed, KHÔNG câu chung «số điện thoại»", () => {
  for (const m of ["pty_relationship_org_link_org: liên kết phải trỏ tới hồ sơ tổ chức đang mang vai đối tác", "pty_relationship_org_link_person: x", "UNIQUE constraint failed: pty_party_relationship.to_party_id"]) {
    const l = loiLoDuyet(new Error(m));
    assert.equal(l?.code, "org_link_failed", m);
    assert.equal(/điện thoại/.test(l!.message), false);
  }
  assert.equal(loiLoDuyet(new Error("UNIQUE constraint failed: staff.phone"))?.code, "registration_conflict");
});

test("Task 13: thân lệnh duyệt — roleCode null được (route kiểm tiếp); roleCodeToChuc vắng ⇒ undefined, null ⇒ null; ô lạ / mã sai ⇒ không hợp lệ", () => {
  assert.deepEqual(kiemDuyet({ roleCode: null, phienBan: 1 }), { ok: true, value: { roleCode: null, roleCodeToChuc: undefined, phienBan: 1 } });
  assert.deepEqual(kiemDuyet({ roleCode: "GUIDE_FREELANCE", roleCodeToChuc: null, phienBan: 1 }), { ok: true, value: { roleCode: "GUIDE_FREELANCE", roleCodeToChuc: null, phienBan: 1 } });
  for (const b of [{ phienBan: 1 }, { roleCode: "x", phienBan: 1 }, { roleCode: null, roleCodeToChuc: 7, phienBan: 1 }, { roleCode: null, phienBan: 1, la: 1 }]) assert.equal(kiemDuyet(b as any).ok, false, JSON.stringify(b));
});
