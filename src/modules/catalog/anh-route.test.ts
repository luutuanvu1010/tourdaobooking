// Ảnh đại diện dịch vụ (ADR-0201 Đ3) qua ứng dụng THẬT: tải lên kho riêng, xem qua Worker, gỡ được, ảnh cũ không xoá khỏi kho, giữ tên hiển thị / mô tả.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, PARTNER, SALES, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 9, 9, 9, 9]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const URL_ANH = "/api/catalog/ZA1/anh";
const tai = (w: any, noiDung: string | null, as = ADM) => w.call("PUT", URL_ANH, { as, body: { noiDung } });
const nk = (w: any) => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'service_detail_changed'")[0].n as number;
const bang = (w: any) => w.q("SELECT count(*) AS n FROM ctl_service_detail")[0].n as number;
const khoaHienHanh = (w: any) => w.q("SELECT image_key FROM v_ctl_service_detail WHERE code = 'ZA1'")[0]?.image_key ?? null;

test("tải ảnh JPG: lưu vào kho riêng, dòng chi tiết mang khoá, nhật ký «đổi ảnh đại diện»; GET trả đúng byte và loại", async () => {
  const w = setup();
  const r = await tai(w, b64(JPG));
  assert.equal(r.status, 200, r.text);
  const khoa = khoaHienHanh(w);
  assert.match(khoa, /^anh\/[0-9a-f]{32}$/);
  assert.match(r.json.anh, /^\/api\/catalog\/ZA1\/anh\?v=[0-9a-f]{12}$/);
  assert.ok(await w.r2AnhDichVu.get(khoa), "đối tượng có trong kho ảnh dịch vụ");
  assert.equal(await w.r2BienLai.get(khoa), null, "không lẫn sang kho khác");
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
  assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'service_detail_changed'")[0].detail, /ảnh đại diện/);
  for (const as of [SALES, ACC, ADM]) {
    const g = await w.call("GET", URL_ANH, { as });
    assert.equal(g.status, 200, `${as}: ${g.text}`);
    assert.equal(g.headers.get("content-type"), "image/jpeg");
    assert.equal(g.headers.get("x-content-type-options"), "nosniff");
  }
});

test("đổi ảnh giữ tên hiển thị và mô tả; ảnh cũ vẫn còn trong kho; gỡ ảnh → GET 404", async () => {
  const w = setup();
  assert.equal((await w.call("PUT", "/api/catalog/ZA1/chi-tiet", { as: ADM, body: { tenHienThi: "Tour đẹp", moTa: "Mô tả" } })).status, 200);
  assert.equal((await tai(w, b64(JPG))).status, 200);
  const cu = khoaHienHanh(w);
  assert.equal((await tai(w, b64(PNG))).status, 200);
  const moi = khoaHienHanh(w);
  assert.notEqual(cu, moi);
  assert.ok(await w.r2AnhDichVu.get(cu), "ảnh cũ không xoá khỏi kho (lịch sử)");
  const ct = (await w.call("GET", "/api/catalog/ZA1/chi-tiet", { as: ADM })).json;
  assert.equal(ct.tenHienThi, "Tour đẹp");
  assert.equal(ct.moTa, "Mô tả");
  assert.ok(ct.anh);
  assert.equal((await tai(w, null)).status, 200);
  assert.equal(khoaHienHanh(w), null);
  assert.equal((await w.call("GET", URL_ANH, { as: ADM })).status, 404);
  assert.equal((await w.call("GET", "/api/catalog/ZA1/chi-tiet", { as: ADM })).json.tenHienThi, "Tour đẹp", "gỡ ảnh không làm mất tên hiển thị");
  const n = bang(w);
  assert.equal((await tai(w, null)).status, 200);
  assert.equal(bang(w), n, "gỡ khi đã không có ảnh: không ghi");
});

test("ảnh hiện trong danh sách quản trị", async () => {
  const w = setup();
  assert.equal((await tai(w, b64(JPG))).status, 200);
  const it = (await w.call("GET", "/api/catalog/admin", { as: ADM })).json.items.find((i: any) => i.code === "ZA1");
  assert.match(it.anh, /^\/api\/catalog\/ZA1\/anh\?v=/);
});

test("quyền: chỉ Quản trị / Toàn quyền tải; Bán hàng, Kế toán, Đối tác 403; Đối tác không xem ảnh qua route này", async () => {
  const w = setup();
  for (const as of [SALES, ACC, PARTNER]) assert.equal((await tai(w, b64(JPG), as)).status, 403);
  assert.equal(bang(w), 0);
  assert.equal((await tai(w, b64(JPG))).status, 200);
  assert.equal((await w.call("GET", URL_ANH, { as: PARTNER })).status, 403);
});

test("tệp sai: PDF 415, base64 hỏng 400, quá cỡ 413 (chặn từ Content-Length), mã không có 404 — không ghi, không đặt kho", async () => {
  const w = setup();
  assert.equal((await tai(w, b64(new TextEncoder().encode("%PDF-1.7 thử...")))).status, 415);
  assert.equal((await tai(w, "khong-phai-base64!")).status, 400);
  assert.equal((await w.call("PUT", URL_ANH, { as: ADM, body: { noiDung: "A".repeat(1_500_000) } })).status, 413);
  assert.equal((await w.call("PUT", "/api/catalog/KHONGCO/anh", { as: ADM, body: { noiDung: b64(JPG) } })).status, 404);
  assert.equal(bang(w), 0);
  assert.equal((await w.call("GET", URL_ANH, { as: ADM })).status, 404, "chưa có ảnh");
});

test("thiếu kho: tải và xem trả 503 với câu tiếng Việt, không ghi dòng", async () => {
  const w = setup();
  delete w.env.ANH_DICH_VU;
  const r = await tai(w, b64(JPG));
  assert.equal(r.status, 503);
  assert.match(r.json.error.message, /ảnh/u);
  assert.equal(bang(w), 0);
});
