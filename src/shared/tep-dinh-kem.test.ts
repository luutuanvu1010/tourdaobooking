// Luật thuần dùng chung của tệp đính kèm (ADR-0123 cơ chế; ADR-0144 tệp kèm tin vé hỗ trợ). Bài của phần kiểm MỘT tệp (chữ ký, base64, khoá, băm, header) vẫn
// nằm ở src/modules/parties/tep.test.ts (gọi qua parties/tep.ts) — ở đây chỉ canh phần mới: tham số hoá tiền tố / tên tải về và kiểm DANH SÁCH tệp của một tin.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHUA_TAI_DUOC_SAU_MS, TEP_MOI_GIO, TEP_MOI_TIN, TOI_DA_BASE64_TIN, TOI_DA_THAN_TIN_CO_TEP, TONG_BYTE_MOI_TIN, TOI_DA_BYTE,
  dauPhanHoiTepChung, kiemTepCuaTin, taoKhoaNgauNhien,
} from "./tep-dinh-kem.ts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const PDF = new TextEncoder().encode("%PDF-1.7\n%%EOF\n");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const tep = (u: Uint8Array) => ({ noiDung: b64(u) });

test("hằng số của tin: 5 tệp, tổng 10 MB, trần base64 = 4·⌈10 MB/3⌉, trần thân = base64 + 64 KB (chữ của tin), 20 tệp/giờ, «chưa tải được» sau 10 phút", () => {
  assert.equal(TEP_MOI_TIN, 5);
  assert.equal(TONG_BYTE_MOI_TIN, TOI_DA_BYTE);
  assert.equal(TOI_DA_BASE64_TIN, Math.ceil(TONG_BYTE_MOI_TIN / 3) * 4);
  assert.equal(TOI_DA_THAN_TIN_CO_TEP, TOI_DA_BASE64_TIN + 64 * 1024);
  assert.equal(TEP_MOI_GIO, 20);
  assert.equal(CHUA_TAI_DUOC_SAU_MS, 10 * 60 * 1000);
});

test("taoKhoaNgauNhien: <tiền tố>/ + 32 hex thường; hai tiền tố đã biết; không lặp", () => {
  const a = taoKhoaNgauNhien("fbk");
  assert.match(a, /^fbk\/[0-9a-f]{32}$/);
  assert.match(taoKhoaNgauNhien("pty"), /^pty\/[0-9a-f]{32}$/);
  assert.notEqual(a, taoKhoaNgauNhien("fbk"));
});

test("dauPhanHoiTepChung: tên tải về theo tiền tố tên + 8 ký tự đầu mã, không tên gốc; đủ header an toàn", () => {
  const h = dauPhanHoiTepChung({ id: "abcdef12-3456-4789-8abc-def012345678", loai: "png", tenDau: "ho-tro" });
  assert.equal(h["content-disposition"], 'inline; filename="ho-tro-abcdef12.png"');
  assert.equal(h["cache-control"], "no-store");
  assert.equal(h["x-content-type-options"], "nosniff");
  assert.equal(h["content-security-policy"], "default-src 'none'; sandbox");
  assert.equal(h["cross-origin-resource-policy"], "same-origin");
  assert.equal(h["content-type"], "image/png");
  assert.equal(dauPhanHoiTepChung({ id: "abcdef12-x", loai: "pdf", tenDau: "ho-tro" })["content-disposition"], 'attachment; filename="ho-tro-abcdef12.pdf"');
});

test("kiemTepCuaTin: vắng / [] ⇒ không tệp; một PNG + một PDF ⇒ đúng loại, đúng byte, đúng thứ tự", () => {
  assert.deepEqual(kiemTepCuaTin(undefined), { ok: true, tep: [] });
  assert.deepEqual(kiemTepCuaTin([]), { ok: true, tep: [] });
  const r = kiemTepCuaTin([tep(PNG), tep(PDF)]);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.tep.map((t) => t.loai), ["png", "pdf"]);
  assert.deepEqual([...r.tep[1]!.bytes], [...PDF]);
});

test("kiemTepCuaTin: hình dạng sai ⇒ 400; quá 5 tệp ⇒ 400 câu tiếng Việt", () => {
  for (const sai of [null, "x", {}, [1], [{}], [{ noiDung: 5 }], [{ noiDung: "@@@@" }], [{ noiDung: "" }]]) {
    const r = kiemTepCuaTin(sai);
    assert.equal(r.ok, false, JSON.stringify(sai));
    if (!r.ok) assert.equal(r.status, 400, JSON.stringify(sai));
  }
  const nhieu = kiemTepCuaTin(Array.from({ length: 6 }, () => tep(PNG)));
  assert.ok(!nhieu.ok && nhieu.status === 400 && nhieu.message === "Mỗi tin đính kèm tối đa 5 tệp.");
});

test("kiemTepCuaTin: HTML / SVG đổi đuôi ⇒ 415 (theo chữ ký, không theo tên)", () => {
  for (const s of ["<html><script>alert(1)</script></html>", '<svg xmlns="http://www.w3.org/2000/svg"/>']) {
    const r = kiemTepCuaTin([tep(PNG), tep(new TextEncoder().encode(s))]);
    assert.ok(!r.ok && r.status === 415 && r.message === "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.", s);
  }
});

test("kiemTepCuaTin: TỔNG quá 10 MB ⇒ 413 dù từng tệp nhỏ hơn; tổng chuỗi base64 quá trần ⇒ 413 TRƯỚC khi giải (chuỗi rác dài vẫn 413, không 400)", () => {
  const nua = new Uint8Array(6 * 1024 * 1024);
  nua.set(PNG);
  const r = kiemTepCuaTin([{ noiDung: b64(nua) }, { noiDung: b64(nua) }]);
  assert.ok(!r.ok && r.status === 413 && r.message === "Tổng các tệp của một tin không được quá 10 MB.");
  const rac = "@".repeat(TOI_DA_BASE64_TIN - 3);
  const r2 = kiemTepCuaTin([{ noiDung: rac }, { noiDung: "@@@@@@@@" }]);
  assert.ok(!r2.ok && r2.status === 413, "đếm độ dài trước, không giải chuỗi");
  const vua = new Uint8Array(TONG_BYTE_MOI_TIN);
  vua.set(PNG);
  assert.equal(kiemTepCuaTin([{ noiDung: b64(vua) }]).ok, true, "đúng 10 MB qua");
});
