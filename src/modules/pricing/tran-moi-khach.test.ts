// Ô «Số tiền mỗi khách» của giao diện (src/shared/so-dai-ly-nhap.ts: `MOI_KHACH_TOI_DA`) chặn trần ĐÚNG như máy chủ (`kiemThanMuc` ở rules.ts). Bài này nối hai bên bằng hàm thật của máy chủ:
// thân mà giao diện cho đi (vừa trần) PHẢI được máy chủ nhận, thân giao diện chặn (quá trần một đồng) PHẢI bị máy chủ từ chối — đổi trần ở một bên mà quên bên kia thì bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
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
