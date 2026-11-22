// Luật thuần «Ảnh bàn giao» (ADR-0232 Đ5): kiểm thân tải, nhận JPEG còn Exif, hạn giữ; con số cỡ / trần khớp migration 0190.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANH_TOI_DA_MOI_DON, TOI_DA_ANH_NHO, TOI_DA_ANH_XEM, coExif, hanGiuAnh, kiemAnhBanGiao, kiemLyDoAnh } from "./anh-ban-giao.ts";

const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
/** JPEG tối giản: SOI + (tuỳ chọn APP0 JFIF / APP1 Exif) + SOS + EOI. */
function jpeg(opt: { exif?: boolean; pad?: number } = {}): Uint8Array {
  const parts: number[] = [0xff, 0xd8];
  parts.push(0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0); // APP0 JFIF (16 byte)
  if (opt.exif) parts.push(0xff, 0xe1, 0x00, 0x0e, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8); // APP1 Exif
  parts.push(0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0); // SOS
  for (let i = 0; i < (opt.pad ?? 10); i++) parts.push(0x11);
  parts.push(0xff, 0xd9);
  return new Uint8Array(parts);
}
const than = (o: Record<string, unknown> = {}) => ({ anhNho: b64(jpeg()), anhXem: b64(jpeg()), loaiViec: "GIAO_KHACH", ...o });

test("coExif: JPEG sạch (chỉ JFIF) ⇒ false; có APP1 Exif ⇒ true; cấu trúc hỏng ⇒ true", () => {
  assert.equal(coExif(jpeg()), false);
  assert.equal(coExif(jpeg({ exif: true })), true);
  assert.equal(coExif(new Uint8Array([0xff, 0xd8, 0x00, 0x00])), true);
  assert.equal(coExif(new Uint8Array([0x89, 0x50])), true);
});

test("kiemAnhBanGiao: thân hợp lệ ⇒ ok; loại việc lạ, ghi chú dài, gắn cả dịch vụ lẫn lượt đón ⇒ 400; không phải JPEG hay còn Exif ⇒ 415; quá cỡ ⇒ 413", () => {
  const k = kiemAnhBanGiao(than({ ghiChu: "  Giao vé tại khách sạn ", changId: "leg-1" }));
  assert.ok(k.ok);
  if (k.ok) assert.deepEqual({ g: k.value.ghiChu, c: k.value.changId, d: k.value.dichVuId }, { g: "Giao vé tại khách sạn", c: "leg-1", d: null });
  const st = (o: Record<string, unknown>) => { const r = kiemAnhBanGiao(than(o)); return r.ok ? 200 : r.status; };
  assert.equal(st({ loaiViec: "LA" }), 400);
  assert.equal(st({ ghiChu: "x".repeat(201) }), 400);
  assert.equal(st({ dichVuId: "s1", changId: "l1" }), 400);
  assert.equal(st({ anhXem: b64(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])) }), 415);
  assert.equal(st({ anhNho: b64(jpeg({ exif: true })) }), 415);
  assert.equal(st({ anhXem: b64(jpeg({ pad: TOI_DA_ANH_XEM })) }), 413);
  assert.equal(st({ anhNho: b64(jpeg({ pad: TOI_DA_ANH_NHO })) }), 413);
  assert.equal(st({ anhNho: "không-phải-base64" }), 400);
  assert.equal(kiemAnhBanGiao(null).ok, false);
});

test("hạn giữ = giờ tải + số năm, cùng khuôn chuỗi toISOString", () => {
  assert.equal(hanGiuAnh("2026-11-22T03:04:05.678Z", 5), "2031-11-22T03:04:05.678Z");
  assert.equal(hanGiuAnh("2028-02-29T00:00:00.000Z", 1), "2029-03-01T00:00:00.000Z");
});

test("lý do ẩn / ghi chú yêu cầu xoá: 3–300 ký tự sau khi bỏ khoảng trắng", () => {
  assert.equal(kiemLyDoAnh("  ab "), null);
  assert.equal(kiemLyDoAnh("Chụp nhầm đơn"), "Chụp nhầm đơn");
  assert.equal(kiemLyDoAnh("x".repeat(301)), null);
  assert.equal(kiemLyDoAnh(5), null);
});

test("con số khớp migration 0190: cỡ ảnh nhỏ / ảnh xem, 30 ảnh mỗi đơn", () => {
  const sql = readFileSync(new URL("../../migrations/0190_anh_ban_giao.sql", import.meta.url), "utf8");
  assert.match(sql, new RegExp(`thumb_size BETWEEN 1 AND ${TOI_DA_ANH_NHO}\\b`));
  assert.match(sql, new RegExp(`view_size BETWEEN 1 AND ${TOI_DA_ANH_XEM}\\b`));
  assert.match(sql, new RegExp(`p\\.hidden_at IS NULL\\) >= ${ANH_TOI_DA_MOI_DON}\\b`));
});
