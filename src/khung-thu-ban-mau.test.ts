// Việc 2.5 (kế hoạch 2026-11-15-buoc-2-3): khung thử (tests/audit/harness.mjs) dựng CSDL mẫu MỘT lần mỗi tiến trình rồi sao chép cho mỗi `world()` /
// `openDb()`, thay cho áp lại toàn bộ migration mỗi lần. Bài này giữ hai điều bản sao phải bằng cách cũ: (1) hai CSDL liên tiếp ĐỘC LẬP (ghi vào cái này
// không thấy ở cái kia); (2) bản sao có ĐỦ bảng, view, trigger, chỉ mục như CSDL dựng thẳng từ migration.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { dungTuMigration, openDb, world } from "../tests/audit/harness.mjs";

const cauTruc = (db: { prepare: (s: string) => { all: () => unknown[] } }) =>
  db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all().map((r) => JSON.stringify(r));

test("hai world() liên tiếp độc lập: ghi vào cái này không thấy ở cái kia", () => {
  const a = world();
  const b = world();
  assert.notEqual(a.sqlite, b.sqlite);
  a.sqlite.exec("CREATE TABLE zz_thu_ban_mau (x INTEGER)");
  a.sqlite.exec("INSERT INTO zz_thu_ban_mau VALUES (1)");
  assert.equal((a.sqlite.prepare("SELECT count(*) AS n FROM zz_thu_ban_mau").get() as { n: number }).n, 1);
  assert.throws(() => b.sqlite.prepare("SELECT count(*) FROM zz_thu_ban_mau").get(), /no such table/);
  // Dữ liệu trong bảng có sẵn cũng không lan: đếm audit_log của b không đổi khi a ghi.
  const truoc = (b.sqlite.prepare("SELECT count(*) AS n FROM audit_log").get() as { n: number }).n;
  a.sqlite.exec("DELETE FROM zz_thu_ban_mau");
  const c = world();
  assert.throws(() => c.sqlite.prepare("SELECT count(*) FROM zz_thu_ban_mau").get(), /no such table/, "world() sau không thừa hưởng bảng world() trước tạo");
  assert.equal((b.sqlite.prepare("SELECT count(*) AS n FROM audit_log").get() as { n: number }).n, truoc);
});

test("bản sao có đủ bảng, view, trigger, chỉ mục như CSDL dựng thẳng từ migration; khoá ngoại bật", () => {
  const thang = dungTuMigration();
  const sao = openDb();
  const dem = (db: typeof thang) => (db.prepare("SELECT count(*) AS n FROM sqlite_master").get() as { n: number }).n;
  assert.ok(dem(thang) > 100, `CSDL dựng thẳng phải có nhiều đối tượng (thấy ${dem(thang)})`);
  assert.equal(dem(sao), dem(thang));
  assert.deepEqual(cauTruc(sao), cauTruc(thang));
  assert.equal((sao.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number }).foreign_keys, 1);
  // Dữ liệu gieo sẵn trong migration (bảng tra cứu) cũng phải có.
  const soDong = (db: typeof thang) => (db.prepare("SELECT count(*) AS n FROM stf_permission_type").get() as { n: number }).n;
  assert.ok(soDong(thang) > 0);
  assert.equal(soDong(sao), soDong(thang));
  // Từ 25/11/2026 tệp mẫu DÙNG CHUNG giữa các tiến trình (đặt tên theo dấu nội dung migration): mọi dòng dữ liệu cũng phải bằng dựng thẳng (bỏ giờ tạo),
  // để một tệp mẫu cũ (dữ liệu gieo khác) không lọt qua chỉ vì cấu trúc giống.
  const duLieu = (db: typeof thang) =>
    (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map((t) => [
      t.name,
      db.prepare(`SELECT * FROM "${t.name}"`).all().map((r) => JSON.stringify(r).replace(/\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(\.\d+)?Z?/g, "<GIO>").replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b[0-9a-f]{32}\b/g, "<ID>")).sort(),
    ]);
  assert.deepEqual(duLieu(sao), duLieu(thang));
});
