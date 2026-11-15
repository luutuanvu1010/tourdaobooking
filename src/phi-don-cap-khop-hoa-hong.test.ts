// Điểm 3 «phải đóng» của Đợt C: cấp của hồ sơ cho PHÍ ĐƯA ĐÓN (`capCuaHoSoNgay`) phải ra CÙNG cấp với phép chọn mức TA của HOA HỒNG (`chonMuc` ở `pricing/rules.ts`) trên cùng bộ gán, nhiều ngày.
// Hồ sơ một cấp ⇒ cùng cấp; không cấp ⇒ hoa hồng «không có mức»; hai cấp ⇒ hoa hồng «xung đột» (phí báo DAI_LY_HAI_CAP). Tệp ở `src/` để được import cả hai tệp luật thuần của `pricing`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { capCuaHoSoNgay } from "./modules/pricing/phi-don-rules.ts";
import { chonMuc, type DongMuc, type GanLoaiMuc, type GanRieng } from "./modules/pricing/rules.ts";

const CAP = ["T1", "T2", "T3"] as const;
const VAI = ["V1", "V2", "V3"] as const;
const NGAY = ["2026-01-01", "2026-03-15", "2026-06-30", "2026-07-01", "2026-09-10", "2026-12-31"] as const;
const dongCap = (t: string, i: number): DongMuc => ({ id: `R${t}`, targetPartyId: null, targetRoleCode: null, targetTierCode: t, scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000 * (i + 1), perPaxAmount: null, validFrom: "2000-01-01", validTo: null });

// bộ sinh giả ngẫu nhiên cố định (lặp lại được)
let seed = 20261115;
const rnd = (n: number): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
const khoang = (): { validFrom: string; validTo: string | null } => {
  const a = NGAY[rnd(NGAY.length)]!;
  const b = NGAY.filter((d) => d >= a);
  return { validFrom: a, validTo: rnd(3) === 0 ? null : b[rnd(b.length)]! };
};

test("cấp phí đưa đón khớp cấp hoa hồng: cùng bộ gán, nhiều ngày", () => {
  const dong = CAP.map(dongCap);
  let motCap = 0, khongCap = 0, haiCap = 0, rieng = 0;
  for (let k = 0; k < 4000; k++) {
    const vai = VAI.filter(() => rnd(2) === 0);
    const gan: GanLoaiMuc[] = Array.from({ length: rnd(5) }, () => ({ roleTypeCode: VAI[rnd(3)]!, tierCode: CAP[rnd(3)]!, ...khoang() }));
    const ganRieng: GanRieng[] = Array.from({ length: rnd(3) === 0 ? 1 : 0 }, () => ({ partyId: "p", tierCode: CAP[rnd(3)]!, ...khoang() }));
    for (const ngay of NGAY) {
      const phi = capCuaHoSoNgay({ partyId: "p", vai, ngay, gan, ganRieng });
      const hh = chonMuc({ nguoiHuong: { loai: "HUONG", partyId: "p", vai }, catalogCode: "S", groupCode: null, ngay, dong, gan, ganRieng });
      const nhan = `lần ${k} ngày ${ngay} vai ${vai} gan ${JSON.stringify(gan)} riêng ${JSON.stringify(ganRieng)}`;
      if (phi.loai === "CO_CAP") {
        motCap += 1;
        assert.ok(hh.trangThai === "SET" && hh.dong.targetTierCode === phi.tierCode, `một cấp phải ra cùng cấp — ${nhan}: ${JSON.stringify(hh)}`);
        if (ganRieng.some((g) => ngay >= g.validFrom && (g.validTo === null || ngay <= g.validTo))) rieng += 1;
      } else if (phi.loai === "KHONG_CAP") {
        khongCap += 1;
        assert.deepEqual(hh, { trangThai: "MISSING", lyDo: "NO_RULE" }, nhan);
      } else {
        haiCap += 1;
        assert.deepEqual(hh, { trangThai: "MISSING", lyDo: "RULE_CONFLICT" }, nhan);
      }
    }
  }
  assert.ok(motCap > 1000 && khongCap > 500 && haiCap > 100 && rieng > 100, `phủ đủ các nhánh: ${motCap}/${khongCap}/${haiCap}/${rieng}`);
});
