// ADR-0217 Đ1, Đ2, Đ3 — kiểm migration 0177 (số sê-ri, dấu huỷ vé, cờ nhập tay) trên SQLite thật (node:sqlite): chặn nằm ở CƠ SỞ DỮ LIỆU, không ở mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-11-17T03:00:00.000Z";
const SAU = "2026-11-17T04:00:00.000Z";
const GOC = files.findIndex((f) => f.endsWith("_ve_so_seri.sql"));

function dbSau(dung: number) {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files.slice(0, dung)) d.exec(sqlOf(f));
  return d;
}
const db = () => dbSau(files.length);
let n = 0;
const lo = (d: DatabaseSync) => {
  const id = `b-${++n}`;
  d.prepare(`INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES (?, 'V2D', 'ADULT', 'Vé mẫu', 'ACTIVE', ?, ?)`).run(id, AT, AT);
  return id;
};
const veSql = (cot: string, giaTri: string) =>
  `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at${cot})
   VALUES (?, ?, ?, '2026-10-24', '2026-11-23', ?, 'image/jpeg', 1, ?, 'AVAILABLE', ?, ?, ?${giaTri})`;
const ve = (d: DatabaseSync, batch: string, serial?: string) => {
  const id = `t-${++n}`;
  const t = [id, batch, `TA.${id}`, `vdt/${id}`, `bam-${id}`, AT, AT, AT];
  if (serial === undefined) d.prepare(veSql("", "")).run(...t);
  else d.prepare(veSql(", serial", ", ?")).run(...t, serial);
  return id;
};
const cap = (d: DatabaseSync, batch: string, serial: string) =>
  d.prepare("INSERT INTO vdt_serial (serial, batch_id, created_at, updated_at) VALUES (?, ?, ?, ?)").run(serial, batch, AT, AT);
const serialCua = (d: DatabaseSync, id: string) => (d.prepare("SELECT serial FROM vdt_ticket WHERE id = ?").get(id) as { serial: string }).serial;

test("0177: đúng MỘT tệp `*_ve_so_seri.sql`, số ≥ 0177", () => {
  assert.equal(files.filter((f) => f.endsWith("_ve_so_seri.sql")).length, 1);
  assert.ok(files[GOC]! >= "0177", files[GOC]);
});

test("vé đã có trước 0177 được gán số, số vào sổ, mỗi vé một số khác nhau, dạng VE_ + 8 chữ hoa", () => {
  const d = dbSau(GOC); // trước 0177
  d.exec("PRAGMA foreign_keys = ON");
  d.prepare(`INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES ('b-cu', 'V2D', 'ADULT', 'Vé cũ', 'ACTIVE', ?, ?)`).run(AT, AT);
  for (let i = 0; i < 30; i++) {
    d.prepare(`INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at) VALUES (?, 'b-cu', ?, '2026-10-24', '2026-11-23', ?, 'image/jpeg', 1, ?, 'AVAILABLE', ?, ?)`)
      .run(`cu-${i}`, `MA.${i}`, `k-${i}`, `h-${i}`, AT, AT);
  }
  d.exec(sqlOf(files[GOC]!));
  const so = d.prepare("SELECT serial FROM vdt_ticket ORDER BY id").all() as { serial: string }[];
  assert.equal(so.length, 30);
  assert.equal(new Set(so.map((s) => s.serial)).size, 30);
  for (const s of so) assert.match(s.serial, /^VE_[A-Z]{8}$/);
  assert.equal((d.prepare("SELECT count(*) AS c FROM vdt_serial").get() as { c: number }).c, 30);
});

test("vé chèn KHÔNG mang số được cấp số và ghi sổ; số duy nhất giữa các vé", () => {
  const d = db();
  const b = lo(d);
  const a = ve(d, b);
  const c = ve(d, b);
  assert.match(serialCua(d, a), /^VE_[A-Z]{8}$/);
  assert.notEqual(serialCua(d, a), serialCua(d, c));
  assert.equal((d.prepare("SELECT count(*) AS c FROM vdt_serial WHERE batch_id = ?").get(b) as { c: number }).c, 2);
});

test("vé chèn CÓ số: số phải có sẵn trong sổ và cùng lô; trùng số bị chặn", () => {
  const d = db();
  const b = lo(d);
  const b2 = lo(d);
  assert.throws(() => ve(d, b, "VE_AAAAAAAA"), /vdt_one_way: số sê-ri/); // chưa cấp
  cap(d, b2, "VE_BBBBBBBB");
  assert.throws(() => ve(d, b, "VE_BBBBBBBB"), /vdt_one_way: số sê-ri/); // cấp cho lô khác
  cap(d, b, "VE_CCCCCCCC");
  const t = ve(d, b, "VE_CCCCCCCC");
  assert.equal(serialCua(d, t), "VE_CCCCCCCC");
  assert.throws(() => ve(d, b, "VE_CCCCCCCC"), /UNIQUE/i); // một số một vé
});

test("sổ số sê-ri: dạng sai bị CHECK chặn; không xoá, không sửa", () => {
  const d = db();
  const b = lo(d);
  assert.throws(() => cap(d, b, "VE_abcdefgh"), /CHECK/i);
  assert.throws(() => cap(d, b, "VE_ABC"), /CHECK/i);
  assert.throws(() => cap(d, b, "XX_ABCDEFGH"), /CHECK/i);
  cap(d, b, "VE_DDDDDDDD");
  assert.throws(() => d.exec("DELETE FROM vdt_serial"), /vdt_append_only/);
  assert.throws(() => d.exec("UPDATE vdt_serial SET batch_id = batch_id"), /vdt_append_only/);
});

test("số sê-ri của vé không đổi sau khi đã có", () => {
  const d = db();
  const t = ve(d, lo(d));
  assert.throws(() => d.prepare("UPDATE vdt_ticket SET serial = 'VE_ZZZZZZZZ' WHERE id = ?").run(t), /vdt_append_only/);
  assert.throws(() => d.prepare("UPDATE vdt_ticket SET serial = NULL WHERE id = ?").run(t), /vdt_append_only/);
});

test("dấu huỷ vé: chỉ cùng lúc VOID, một lần, lý do 5–300 ký tự; vé mới không mang dấu", () => {
  const d = db();
  const b = lo(d);
  const t = ve(d, b);
  const huy = (id: string, st: string, lyDo: string | null, luc: string | null = SAU) =>
    d.prepare("UPDATE vdt_ticket SET status = ?, voided_at = ?, voided_by = 'nv', void_reason = ?, updated_at = ? WHERE id = ?").run(st, luc, lyDo, SAU, id);
  assert.throws(() => huy(t, "AVAILABLE", "Vé in sai ngày"), /vdt_one_way: dấu huỷ/); // không phải VOID
  assert.throws(() => huy(t, "VOID", "ngắn"), /vdt_one_way: dấu huỷ/); // lý do quá ngắn
  assert.throws(() => huy(t, "VOID", "x".repeat(301)), /vdt_one_way: dấu huỷ/);
  assert.throws(() => huy(t, "VOID", null), /vdt_one_way: dấu huỷ/);
  assert.throws(() => huy(t, "VOID", "Vé in sai ngày", null), /vdt_one_way: dấu huỷ/);
  huy(t, "VOID", "Vé in sai ngày");
  assert.throws(() => d.prepare("UPDATE vdt_ticket SET void_reason = 'Lý do khác nữa' WHERE id = ?").run(t), /vdt_one_way: dấu huỷ/); // ghi một lần
  assert.throws(() => d.prepare("UPDATE vdt_ticket SET voided_at = NULL WHERE id = ?").run(t), /vdt_one_way: dấu huỷ/);
  assert.throws(() => d.prepare("UPDATE vdt_ticket SET status = 'AVAILABLE' WHERE id = ?").run(t), /vdt_one_way/); // VOID không sống lại (trigger cũ)
  assert.throws(() => d.prepare(veSql(", voided_at", ", ?")).run("x", b, "MA.x", "vdt/x", "bam-x", AT, AT, AT, SAU), /vdt_one_way: vé mới vào kho không mang dấu huỷ/);
});

test("lượt quét: cờ nhập tay mặc định 0, chỉ nhận 0/1, bất biến (không đổi được sau khi ghi)", () => {
  const d = db();
  const t = ve(d, lo(d));
  const chen = (id: string, nhap?: number) =>
    d.prepare(`INSERT INTO vdt_scan (id, ticket_id, ket_qua, scanned_at, scanned_by, created_at, updated_at${nhap === undefined ? "" : ", nhap_tay"}) VALUES (?, ?, 'DA_TINH', ?, 'nv', ?, ?${nhap === undefined ? "" : ", ?"})`)
      .run(id, t, AT, AT, AT, ...(nhap === undefined ? [] : [nhap]));
  chen("s-1");
  assert.equal((d.prepare("SELECT nhap_tay FROM vdt_scan WHERE id = 's-1'").get() as { nhap_tay: number }).nhap_tay, 0);
  assert.throws(() => chen("s-2", 2), /CHECK/i);
  assert.throws(() => d.prepare("UPDATE vdt_scan SET nhap_tay = 1 WHERE id = 's-1'").run(), /vdt_append_only/);
  d.prepare("UPDATE vdt_scan SET voided_at = ?, voided_by = 'ad', void_reason = 'bỏ thử nghiệm', updated_at = ? WHERE id = 's-1'").run(SAU, SAU); // bỏ lượt vẫn chạy
});
