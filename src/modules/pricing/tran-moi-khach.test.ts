// Ô «Số tiền mỗi khách» của giao diện (src/shared/so-dai-ly-nhap.ts: `MOI_KHACH_TOI_DA`) chặn trần ĐÚNG như máy chủ (`kiemThanMuc` ở rules.ts). Bài này nối hai bên bằng hàm thật của máy chủ:
// thân mà giao diện cho đi (vừa trần) PHẢI được máy chủ nhận, thân giao diện chặn (quá trần một đồng) PHẢI bị máy chủ từ chối — đổi trần ở một bên mà quên bên kia thì bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { maskSource } from "../../../scripts/source-mask-lib.mjs";
import { kiemThanMuc } from "./rules.ts";
import { MOI_KHACH_TOI_DA, docThanMuc, type FormMuc } from "../../shared/so-dai-ly-nhap.ts";

const form = (moiKhach: string): FormMuc => ({
  doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", catalogCode: "", groupCode: "", kieu: "PER_PAX", tyLe: "", moiKhach, tuNgay: "2026-10-01", denNgay: "", ghiChu: "",
});
const dinhDang = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

test("trần «Số tiền mỗi khách»: giao diện và máy chủ cùng nhận MOI_KHACH_TOI_DA, cùng từ chối MOI_KHACH_TOI_DA + 1", () => {
  const vua = docThanMuc(form(dinhDang(MOI_KHACH_TOI_DA)));
  assert.equal(vua.ok, true, "giao diện cho thân vừa trần đi");
  if (vua.ok) assert.equal(kiemThanMuc(vua.body).ok, true, "máy chủ nhận thân vừa trần do giao diện dựng");
  const qua = docThanMuc(form(dinhDang(MOI_KHACH_TOI_DA + 1)));
  assert.equal(qua.ok, false, "giao diện chặn quá trần một đồng");
  const thanQua = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", tuNgay: "2026-10-01", kieu: "PER_PAX", moiKhach: MOI_KHACH_TOI_DA + 1 };
  assert.equal(kiemThanMuc(thanQua).ok, false, "máy chủ từ chối quá trần một đồng");
});

// ---- MỘT hằng cho cả ba nơi (sổ đại lý đợt 1, Task 14, nợ (a)) ----
// Trước đây trần «Số tiền mỗi khách» có BA bản (giao diện + hai nơi máy chủ viết thẳng 100.000.000); bài trên chỉ nối chúng bằng giá trị. Nay chỉ còn MỘT định nghĩa ở src/shared/so-dai-ly-nhap.ts
// và hai nơi máy chủ (luật mức của pricing, thân ghi mức tay của orders) nhập nó. Bài này quét mã nguồn (đã che chú thích): đỏ nếu một nơi máy chủ quay lại số viết thẳng hoặc thôi nhập hằng chung.
// Giới hạn: canh QUÊN / viết lại tay, không chứng minh giá trị đúng (giá trị do bài trên và bài ghim ở so-dai-ly-nhap.test.ts giữ).
const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../../../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("trần «Số tiền mỗi khách»: giao diện, luật mức của pricing và thân ghi mức tay của orders dùng CÙNG MỘT hằng MOI_KHACH_TOI_DA (không còn số viết thẳng)", () => {
  assert.equal((doc("src/shared/so-dai-ly-nhap.ts").match(/export const MOI_KHACH_TOI_DA\s*=/g) ?? []).length, 1, "đúng một nơi định nghĩa hằng");
  for (const tep of ["src/modules/pricing/rules.ts", "src/modules/orders/thuong-mai.ts"]) {
    const ma = doc(tep);
    assert.match(ma, /import\s*\{[^}]*\bMOI_KHACH_TOI_DA\b[^}]*\}\s*from\s*"\.\.\/\.\.\/shared\/so-dai-ly-nhap\.ts"/, `${tep}: nhập MOI_KHACH_TOI_DA từ src/shared/so-dai-ly-nhap.ts`);
    // cấm MỌI số viết nhóm ba chữ số từ một triệu trở lên (100_000_000, 200_000_000, "100.000.000đ"…): trần chỉ được đến từ hằng chung
    assert.doesNotMatch(ma, /(?<![\d_.])\d{1,3}(?:[_.]\d{3}){2,}(?![\d_])/, `${tep}: không viết thẳng số từ một triệu trở lên (dùng MOI_KHACH_TOI_DA)`);
  }
});
