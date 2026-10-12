// BÀI NỐI (sổ đại lý đợt 1, Task 11): bảng trượt "Ghi mức tay" dựng thân bằng `docThanGhiTay` (src/shared/phan-doi-tac-hien-thi.ts, chạy ở trình duyệt); máy chủ kiểm lại bằng `kiemThanGhiTay` + `kiemGhiTayVoiBanChup`
// (./thuong-mai.ts). Hai bên có CÙNG trần / luật ở hai nơi, nên bài này nối chúng bằng hàm THẬT của máy chủ: thân giao diện dựng ra mà máy chủ từ chối là bài đỏ — người dùng sẽ thấy lỗi
// sau khi đã qua kiểm ở trình duyệt; và ngược lại nơi giao diện chặn thì máy chủ cũng phải chặn (trần không lệch một đồng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_TOI_DA, LY_DO_TOI_THIEU, MOI_KHACH_TOI_DA, docThanGhiTay, docTienTay, docTyLeTay, type FormGhiTay } from "../../shared/phan-doi-tac-hien-thi.ts";
import { kiemGhiTayVoiBanChup, kiemThanGhiTay } from "./thuong-mai.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";

const CTY = "pty-cong-ty";
const NCC = "pty-nha-cung-cap";
const LY_DO = "Khách quen, đã thoả thuận mức mới";
const truoc: BanChup = {
  serviceId: "s1", beneficiaryPartyId: "dla",
  hoaHong: { status: "SET", kind: "RATE", rateBp: 1000, perPax: null, ruleId: "m1" },
  cungUng: { status: "SET", termId: "d1", sellerPartyId: CTY, supplierPartyId: null, costRateBp: null },
};
const form = (p: Partial<FormGhiTay> = {}): FormGhiTay => ({ kieu: "RATE", tyLe: "10", moiKhach: "", nguoiBan: { loai: "KHONG_DOI" }, lyDo: LY_DO, ...p });

test("mọi thân giao diện dựng ra đều được máy chủ nhận (kiểm dạng + kiểm với bản chụp)", () => {
  const cacForm: FormGhiTay[] = [
    form(),
    form({ tyLe: "0" }),
    form({ tyLe: "100" }),
    form({ tyLe: "12,5%" }),
    form({ tyLe: "0,01" }),
    form({ kieu: "PER_PAX", moiKhach: "50.000" }),
    form({ kieu: "PER_PAX", moiKhach: "0" }),
    form({ kieu: "PER_PAX", moiKhach: "100.000.000" }),
    form({ kieu: "KHONG_DOI", nguoiBan: { loai: "TOUR_DAO" } }),
    form({ kieu: "KHONG_DOI", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: NCC, tyLeMua: "70" } }),
    form({ kieu: "RATE", tyLe: "15", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: NCC, tyLeMua: "99,99" } }),
    form({ kieu: "PER_PAX", moiKhach: "30.000", nguoiBan: { loai: "TOUR_DAO" } }),
    form({ lyDo: "x".repeat(LY_DO_TOI_THIEU) }),
    form({ lyDo: "x".repeat(LY_DO_TOI_DA) }),
    form({ lyDo: `   ${LY_DO}   ` }),
  ];
  for (const f of cacForm) {
    const g = docThanGhiTay(f, CTY);
    assert.equal(g.ok, true, JSON.stringify(f));
    if (!g.ok) continue;
    const m = kiemThanGhiTay(JSON.parse(JSON.stringify(g.body)));
    assert.equal(m.ok, true, `máy chủ từ chối thân giao diện dựng: ${JSON.stringify(g.body)} → ${m.ok ? "" : m.message}`);
    if (!m.ok) continue;
    assert.deepEqual(m.value, g.body, "máy chủ đọc ra đúng điều giao diện gửi");
    const v = kiemGhiTayVoiBanChup(truoc, m.value, CTY);
    assert.equal(v.ok, true, `kiểm với bản chụp: ${v.ok ? "" : v.message}`);
  }
});

test("trần ở hai nơi không lệch một đồng: nơi giao diện chặn thì máy chủ cũng chặn, nơi giao diện cho thì máy chủ cũng cho", () => {
  const phanVan = (bp: number) => kiemThanGhiTay({ lyDo: LY_DO, hoaHong: { kieu: "RATE", tyLeBp: bp } }).ok;
  assert.equal(docTyLeTay("100").ok && phanVan(10_000), true);
  assert.equal(docTyLeTay("100,01").ok, false);
  assert.equal(phanVan(10_001), false, "máy chủ cũng chặn 100,01%");
  const moiKhach = (n: number) => kiemThanGhiTay({ lyDo: LY_DO, hoaHong: { kieu: "PER_PAX", moiKhach: n } }).ok;
  assert.equal(docTienTay("100.000.000").ok && moiKhach(MOI_KHACH_TOI_DA), true);
  assert.equal(docTienTay("100.000.001").ok, false);
  assert.equal(moiKhach(MOI_KHACH_TOI_DA + 1), false, "máy chủ cũng chặn quá trần một đồng");
  const lyDo = (s: string) => kiemThanGhiTay({ lyDo: s, hoaHong: { kieu: "RATE", tyLeBp: 100 } }).ok;
  const giaoDien = (s: string) => docThanGhiTay(form({ lyDo: s }), CTY).ok;
  for (const s of ["x".repeat(LY_DO_TOI_THIEU - 1), "x".repeat(LY_DO_TOI_THIEU), "x".repeat(LY_DO_TOI_DA), "x".repeat(LY_DO_TOI_DA + 1), "gọi 0905 123 456 nhé ạ", "số phòng 12 tầng 3 ạ", ""]) {
    assert.equal(giaoDien(s), lyDo(s), `lý do «${s.slice(0, 24)}…»: giao diện và máy chủ phải cùng đáp`);
  }
});

test("hai tổ hợp máy chủ chặn bằng câu riêng (Tour Đảo kèm tỷ lệ mua lại / nhà cung cấp thiếu tỷ lệ) mà giao diện KHÔNG BAO GIỜ dựng ra", () => {
  // Giao diện dựng "Tour Đảo" luôn không có tyLeMuaBp, "nhà cung cấp" luôn có — nên không rơi vào CAU_TY_LE_MUA_LAI. Ghi lại để nếu ai đổi hình dạng thân thì bài đỏ.
  const tourDao = docThanGhiTay(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "TOUR_DAO" } }), CTY);
  assert.ok(tourDao.ok && tourDao.body.nguoiBan && !("tyLeMuaBp" in tourDao.body.nguoiBan));
  const ncc = docThanGhiTay(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: NCC, tyLeMua: "70" } }), CTY);
  assert.ok(ncc.ok && ncc.body.nguoiBan?.tyLeMuaBp === 7000);
  assert.equal(kiemGhiTayVoiBanChup(truoc, { lyDo: LY_DO, nguoiBan: { partyId: CTY, tyLeMuaBp: 7000 } }, CTY).ok, false, "máy chủ chặn công ty kèm a%");
  assert.equal(kiemGhiTayVoiBanChup(truoc, { lyDo: LY_DO, nguoiBan: { partyId: NCC } }, CTY).ok, false, "máy chủ chặn nhà cung cấp thiếu a%");
});
