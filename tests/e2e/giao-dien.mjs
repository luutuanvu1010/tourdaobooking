// Giao diện công ty (ADR-0087, module giao-dien): quyền, kiểm hợp lệ, khoá lạc quan, CSS công khai + ETag, nhật ký, đường bảo trì. Khôi phục '{}' ở finally.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, session, sql, sqlRows } from "./lib.mjs";

const getCss = (etag) => fetch(`${BASE}/api/giao-dien.css`, { headers: etag ? { "if-none-match": etag } : {} });
const restore = () => sql("UPDATE gd_setting SET tokens = '{}', version = version + 1 WHERE id = 'default'");
let r;
try {
  const OWNER = await session(ACCOUNTS.superAdmin);
  const ADMIN = await session(ACCOUNTS.admin);
  const SALES = await session(ACCOUNTS.salesA);

  // 1) CSS công khai, chưa đăng nhập, mặc định rỗng
  let c = await getCss();
  assert.equal(c.status, 200);
  assert.match(c.headers.get("content-type"), /^text\/css/);
  assert.equal(await c.text(), ":root{}");
  const etag0 = c.headers.get("etag");
  assert.equal((await getCss(etag0)).status, 304, "cùng ETag → 304");
  console.log("✓ CSS công khai, mặc định rỗng, 304 theo ETag");

  // 2) Quyền: Quản trị, Bán hàng 403 cả GET lẫn PUT; Toàn quyền 200
  for (const [ten, ck] of [["Quản trị", ADMIN], ["Bán hàng", SALES]]) {
    assert.equal((await call(ck, "GET", "/api/giao-dien")).status, 403, ten);
    assert.equal((await call(ck, "PUT", "/api/giao-dien", { tokens: {}, version: 1 })).status, 403, ten);
  }
  r = await call(OWNER, "GET", "/api/giao-dien");
  assert.equal(r.status, 200);
  const v0 = r.body.version;
  console.log("✓ chỉ Toàn quyền đọc/ghi");

  // 3) Kiểm hợp lệ: tương phản, chèn CSS, khoá lạ → 400, không ghi, không nhật ký
  const moc = new Date().toISOString();
  for (const tokens of [{ "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#eeeeee" }, { "nen-trang": "#ffffff;}body{display:none}" }, { "khong-co": "#000000" }]) {
    r = await call(OWNER, "PUT", "/api/giao-dien", { tokens, version: v0 });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.ok(Array.isArray(r.body.error.loi) && r.body.error.loi.length > 0);
  }
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'giao_dien_changed' AND created_at >= '${moc}'`))[0].n, 0);
  console.log("✓ 400 khi khó đọc / chèn CSS / ô lạ — không ghi");

  // 4) Áp dụng: 200, version + 1, CSS mới, ETag đổi, đúng một dòng nhật ký có nhãn
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: { "nen-thanh-tren": "#0c4a6e", "chu-thanh-tren": "#ffffff" }, version: v0 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.version, v0 + 1);
  c = await getCss(etag0);
  assert.equal(c.status, 200);
  assert.match(await c.text(), /--c-bar-bg:#0c4a6e;.*--c-on-bar:#ffffff;/s);
  const nk = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'giao_dien_changed' AND created_at >= '${moc}'`);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /Nền thanh trên: mặc định → #0c4a6e/);
  console.log("✓ áp dụng: CSS mới + ETag mới + một dòng nhật ký");

  // 5) Lưu chồng: gửi version cũ → 409, không thêm nhật ký
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: {}, version: v0 });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, "stale");
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'giao_dien_changed' AND created_at >= '${moc}'`))[0].n, 1);
  console.log("✓ 409 khi lưu chồng");

  // 6) Dòng D1 có khoá lạ / giá trị hỏng (từ bản cũ): CSS vẫn 200, bỏ qua phần hỏng
  await sql(`UPDATE gd_setting SET tokens = '{"da-bo":"#000000","nen-trang":"x","nen-the":"#fafafa"}', version = version + 1 WHERE id = 'default'`);
  c = await getCss();
  assert.equal(c.status, 200);
  assert.equal(await c.text(), ":root{--c-surface:#fafafa;}");
  console.log("✓ dòng cũ hỏng không làm hỏng CSS");

  // 7) Bảo trì đang bật: CSS công khai vẫn 200
  await sql(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 600_000).toISOString()}' WHERE id = 'default'`);
  assert.equal((await getCss()).status, 200, "bảo trì không chặn CSS");
  await sql("UPDATE mnt_setting SET enabled = 0, ends_at = NULL WHERE id = 'default'");
  console.log("✓ bảo trì không chặn CSS");

  // 8) Về mặc định
  r = await call(OWNER, "GET", "/api/giao-dien");
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: {}, version: r.body.version });
  assert.equal(r.status, 200);
  assert.equal(await (await getCss()).text(), ":root{}");
  console.log("✓ về mặc định");
} finally {
  await restore();
  await sql("UPDATE mnt_setting SET enabled = 0, ends_at = NULL WHERE id = 'default'");
}
