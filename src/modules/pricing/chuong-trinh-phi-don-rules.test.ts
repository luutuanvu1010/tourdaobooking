// Luật khớp CHƯƠNG TRÌNH MIỄN PHÍ ĐƯA ĐÓN (ADR-0218 Đ2; kế hoạch 2026-11-18 Task 4 bước 1). Bài này CHỈ dùng ĐẦU VÀO của sổ vàng `golden/phi-dua-don-gia-goc.json`
// (chương trình, bên đặt, lượt đón) để kiểm «khớp hay không, khớp chương trình nào»; KHÔNG kiểm tiền (sổ vàng chưa được xác nhận). Dữ liệu tự tạo, không tên thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chuongTrinhKhop, type ChuongTrinh } from "./chuong-trinh-phi-don-rules.ts";

const golden = JSON.parse(readFileSync(new URL("../../../golden/phi-dua-don-gia-goc.json", import.meta.url), "utf8"));
type CT = { ten: string; pham_vi: "TAT_CA" | "DICH_VU" | "DOI_TAC"; danh_sach: string[]; tu: string; den: string; gom_xe_rieng: boolean };

function dungChuongTrinh(ma: string, ct: CT, thuTu: number): ChuongTrinh {
  return {
    id: ma, name: ct.ten, scope: ct.pham_vi === "TAT_CA" ? "ALL" : ct.pham_vi === "DICH_VU" ? "SERVICES" : "PARTNERS",
    tripFrom: ct.tu, tripTo: ct.den, includePrivate: ct.gom_xe_rieng,
    createdAt: `2026-11-01T00:00:${String(thuTu).padStart(2, "0")}.000Z`,
    services: ct.pham_vi === "DICH_VU" ? ct.danh_sach : [], parties: ct.pham_vi === "DOI_TAC" ? ct.danh_sach : [],
  };
}

test("sổ vàng: mọi lượt của mọi ca có đáp án — khớp đúng chương trình khi nguồn là CHUONG_TRINH, ngược lại không khớp", () => {
  let soLuot = 0;
  for (const ca of golden.cac_ca) {
    const dapAn = ca.dap_an?.luot ?? [];
    const dauVao = ca.dau_vao?.luot;
    if (!dauVao || dapAn.length === 0 || dapAn.length !== dauVao.length) continue; // GG-16 (chưa áp), GG-19 (không có chương trình)
    const tatCa: Record<string, CT> = { ...golden.chuong_trinh, ...(ca.dau_vao.chuong_trinh_them ?? {}) };
    const bat: string[] = ca.dau_vao.chuong_trinh_bat ?? [];
    const ds = bat.map((m, i) => dungChuongTrinh(m, tatCa[m]!, i));
    dauVao.forEach((l: any, i: number) => {
      const kq = chuongTrinhKhop(ds, { catalogCode: l.dich_vu, bookerPartyId: ca.dau_vao.ben_dat, pickupDate: l.ngay_don, xeRieng: l.xe_rieng });
      const mong = dapAn[i].nguon === "CHUONG_TRINH" ? dapAn[i].chuong_trinh : null;
      assert.equal(kq?.id ?? null, mong, `${ca.ma} lượt ${i}`);
      soLuot++;
    });
  }
  assert.ok(soLuot >= 15, `chỉ kiểm được ${soLuot} lượt`);
});

const ct = (p: Partial<ChuongTrinh> & { id: string }): ChuongTrinh => ({
  name: p.id, scope: "ALL", tripFrom: "2026-12-01", tripTo: "2026-12-31", includePrivate: false, createdAt: "2026-11-01T00:00:00.000Z", services: [], parties: [], ...p,
});
const luot = (p: Partial<{ catalogCode: string; bookerPartyId: string | null; pickupDate: string | null; xeRieng: boolean }> = {}) => ({ catalogCode: "A", bookerPartyId: null, pickupDate: "2026-12-05", xeRieng: false, ...p });

test("nháp chưa có ngày đón ⇒ không chương trình nào khớp", () => {
  assert.equal(chuongTrinhKhop([ct({ id: "x" })], luot({ pickupDate: null })), null);
});

test("hai chương trình cùng khớp ⇒ chương trình tạo sớm nhất; bằng giờ thì mã nhỏ hơn", () => {
  const a = ct({ id: "b", createdAt: "2026-11-02T00:00:00.000Z" });
  const b = ct({ id: "a", createdAt: "2026-11-03T00:00:00.000Z" });
  assert.equal(chuongTrinhKhop([b, a], luot())?.id, "b");
  const c = ct({ id: "z", createdAt: "2026-11-02T00:00:00.000Z" });
  assert.equal(chuongTrinhKhop([c, a], luot())?.id, "b");
});

test("biên ngày: đúng ngày đầu và ngày cuối khớp, sát ngoài không khớp", () => {
  const d = [ct({ id: "x" })];
  assert.equal(chuongTrinhKhop(d, luot({ pickupDate: "2026-12-01" }))?.id, "x");
  assert.equal(chuongTrinhKhop(d, luot({ pickupDate: "2026-12-31" }))?.id, "x");
  assert.equal(chuongTrinhKhop(d, luot({ pickupDate: "2026-11-30" })), null);
  assert.equal(chuongTrinhKhop(d, luot({ pickupDate: "2027-01-01" })), null);
});

test("phạm vi dịch vụ và đối tác; bên đặt vắng không khớp phạm vi đối tác; xe riêng cần cờ", () => {
  assert.equal(chuongTrinhKhop([ct({ id: "s", scope: "SERVICES", services: ["B"] })], luot()), null);
  assert.equal(chuongTrinhKhop([ct({ id: "s", scope: "SERVICES", services: ["A"] })], luot())?.id, "s");
  assert.equal(chuongTrinhKhop([ct({ id: "p", scope: "PARTNERS", parties: ["P1"] })], luot({ bookerPartyId: null })), null);
  assert.equal(chuongTrinhKhop([ct({ id: "p", scope: "PARTNERS", parties: ["P1"] })], luot({ bookerPartyId: "P2" })), null);
  assert.equal(chuongTrinhKhop([ct({ id: "p", scope: "PARTNERS", parties: ["P1"] })], luot({ bookerPartyId: "P1" }))?.id, "p");
  assert.equal(chuongTrinhKhop([ct({ id: "x" })], luot({ xeRieng: true })), null);
  assert.equal(chuongTrinhKhop([ct({ id: "x", includePrivate: true })], luot({ xeRieng: true }))?.id, "x");
});
