// Bài đi kèm tests/audit/nhat-ky-hang.mjs (Hiến chương 5.20: nhật ký không chứa dữ liệu hạng N3, N4; lát H-0 Gói 2). Ba việc:
//  (1) MỌI cột BẢNG hạng N3/N4 của sổ dữ liệu có bài chạy cả ứng dụng chịu trách nhiệm sinh dữ liệu thật (PHU_TRACH) hoặc có tên ở MIEN kèm lý do — thêm cột
//      N3/N4 mà quên ⇒ đỏ;
//  (2) mỗi tệp ở PHU_TRACH thật sự gọi `doNhatKyHang(` và nhắc đúng tên cột (không khai suông);
//  (3) bộ dò bắt đúng: giá trị băm nằm trong detail ⇒ lộ; số giấy tờ viết cách quãng ⇒ vẫn lộ; detail sạch ⇒ không; cột phụ trách rỗng ⇒ báo "rỗng".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { MIEN, PHU_TRACH, cotN3N4, doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";

test("(1) mọi cột N3/N4 có bài phụ trách hoặc được miễn có lý do; không trùng, không thừa", () => {
  const cot = cotN3N4() as string[];
  assert.ok(cot.length >= 8, `sổ dữ liệu phải có ít nhất 8 cột N3/N4, thấy ${cot.length}`);
  const pt = Object.keys(PHU_TRACH);
  const mien = Object.keys(MIEN);
  assert.deepEqual(pt.filter((k) => mien.includes(k)), [], "một cột không vừa phụ trách vừa miễn");
  assert.deepEqual([...pt, ...mien].sort(), cot);
  for (const [k, ly] of Object.entries(MIEN)) assert.ok(String(ly).trim().length > 10, `${k}: miễn phải có lý do`);
});

test("(2) tệp phụ trách thật sự gọi doNhatKyHang và nhắc tên cột trong danh sách phải có dữ liệu", () => {
  for (const [cot, tep] of Object.entries(PHU_TRACH) as [string, string][]) {
    const src = readFileSync(new URL(`../${tep}`, import.meta.url), "utf8");
    assert.match(src, /doNhatKyHang\(/, `${tep} chưa gọi doNhatKyHang`);
    assert.ok(src.includes(`"${cot}"`), `${tep} chưa nhắc "${cot}"`);
  }
});

function schema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  return db;
}

test("(3) bộ dò: băm trong detail ⇒ lộ; số viết cách quãng ⇒ lộ; detail sạch ⇒ không; cột phụ trách rỗng ⇒ rỗng", () => {
  const db = schema();
  const AT = "2026-10-16T01:00:00.000Z";
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-1', 'PERSON', 'An', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-1', 'An', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s-1', '', '0900000001', 'pbkdf2$100000$MUOIBAYKYTU$abcdef0123456789', 'sales', 1, '${AT}', 'p-1')`);
  db.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('d-1', 'p-1', 'CCCD', '079 888 777 666', '079888777666', '${AT}', '${AT}')`);
  const log = (id: string, detail: string) =>
    db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_updated', 'party', 'p-1', ?, ?)").run(id, detail, AT);
  log("l-1", "cá nhân — đổi giới tính");
  let r = doNhatKyHang(db, ["staff.pin_hash", "pty_person_document.number_key", "aut_trusted_device.token_hash"]) as { lo: string[]; rong: string[] };
  assert.deepEqual(r.lo, []);
  assert.deepEqual(r.rong, ["aut_trusted_device.token_hash"]);
  log("l-2", "lỡ ghi pbkdf2$100000$MUOIBAYKYTU$abcdef0123456789");
  log("l-3", "CCCD 079.888.777-666");
  r = doNhatKyHang(db, []) as { lo: string[]; rong: string[] };
  assert.equal(r.lo.filter((x) => x.startsWith("staff.pin_hash ")).length, 1);
  assert.ok(r.lo.some((x) => x.startsWith("pty_person_document.number_key ")));
  assert.ok(r.lo.every((x) => !x.includes("079888777666") && !x.includes("abcdef0123456789")), "thông báo lộ không được in lại giá trị");
});
