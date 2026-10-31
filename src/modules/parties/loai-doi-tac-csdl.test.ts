// Mã định danh 5.26, Task 2 — loại đối tác có ghi chú + dấu vết (migration 0130). Câu SQL chạy trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, fakeD1 } from "../../../tests/audit/harness.mjs";
// repository.ts, không index.ts: node chạy .ts trực tiếp không nạp được import không đuôi; `loaiVaiChiTiet` chỉ ánh xạ `listRoleTypes` nên kiểm qua nó.
import { datHoatDongLoaiDoiTacStatement, listRoleTypes, suaLoaiDoiTacStatement, themLoaiDoiTacStatement } from "./repository.ts";

const AT = "2026-10-31T01:00:00.000Z";
const AT2 = "2026-10-31T02:00:00.000Z";
const NV = "nv-1";
type Hang = { name: string; note: string | null; created_at: string | null; created_by: string | null; updated_at: string | null; updated_by: string | null };
const hang = (w: ReturnType<typeof world>, code: string): Hang => ({ ...(w.q("SELECT name, note, created_at, created_by, updated_at, updated_by FROM pty_role_type WHERE code = ?", code)[0] as Hang) });

test("Dòng cũ của pty_role_type có 5 cột mới NULL", () => {
  const w = world();
  const cot = (w.q("PRAGMA table_info(pty_role_type)") as { name: string }[]).map((c) => c.name);
  for (const c of ["note", "created_at", "created_by", "updated_at", "updated_by"]) assert.ok(cot.includes(c), c);
  assert.deepEqual(hang(w, "TRAVEL_AGENCY"), { name: hang(w, "TRAVEL_AGENCY").name, note: null, created_at: null, created_by: null, updated_at: null, updated_by: null });
});

test("suaLoaiDoiTacStatement: khoá lạc quan theo updated_at, chỉ loại đối tác / vai bên ngoài", async () => {
  const w = world();
  const db = fakeD1(w.sqlite) as unknown as D1Database;
  const sua = async (code: string, truocLuc: string | null, at = AT) =>
    (await suaLoaiDoiTacStatement(db, { code, ten: "Đại lý lữ hành", ghiChu: "Ghi chú thử", at, staffId: NV, truocLuc }).run()).meta.changes;
  assert.equal(await sua("TRAVEL_AGENCY", null), 1);
  const h = hang(w, "TRAVEL_AGENCY");
  assert.deepEqual([h.name, h.note, h.updated_at, h.updated_by], ["Đại lý lữ hành", "Ghi chú thử", AT, NV]);
  assert.equal(await sua("TRAVEL_AGENCY", null, AT2), 0, "dòng đã đổi, truocLuc cũ ⇒ 0 dòng");
  assert.equal(await sua("TRAVEL_AGENCY", AT, AT2), 1, "đúng truocLuc ⇒ đổi");
  assert.equal(await sua("SALES", null), 0, "vai nội bộ không sửa được");
  assert.equal(await sua("MA_LA", null), 0);
});

test("Thêm loại ghi created_* và updated_*; Tắt đặt updated_*", async () => {
  const w = world();
  const db = fakeD1(w.sqlite) as unknown as D1Database;
  await themLoaiDoiTacStatement(db, { code: "LD_ABCDEFGH", ten: "Nhân viên spa", at: AT, staffId: NV }).run();
  const m = hang(w, "LD_ABCDEFGH");
  assert.deepEqual([m.created_at, m.created_by, m.updated_at, m.updated_by, m.note], [AT, NV, AT, NV, null]);
  assert.equal((await datHoatDongLoaiDoiTacStatement(db, "LD_ABCDEFGH", false, AT2, "nv-2").run()).meta.changes, 1);
  const t = hang(w, "LD_ABCDEFGH");
  assert.deepEqual([t.updated_at, t.updated_by, t.created_at, t.created_by], [AT2, "nv-2", AT, NV]);
  const ct = (await listRoleTypes(db)).find((x) => x.code === "LD_ABCDEFGH")!;
  assert.deepEqual([ct.note, ct.created_at, ct.created_by, ct.updated_at, ct.updated_by, ct.active], [null, AT, NV, AT2, "nv-2", 0]);
});

test("Ghi chú loại: rỗng (chuỗi 0 chữ) hoặc quá 500 chữ bị CSDL chặn", () => {
  const w = world();
  assert.throws(() => w.sqlite.exec("UPDATE pty_role_type SET note = '' WHERE code = 'TRAVEL_AGENCY'"));
  assert.throws(() => w.sqlite.prepare("UPDATE pty_role_type SET note = ? WHERE code = 'TRAVEL_AGENCY'").run("a".repeat(501)));
  w.sqlite.prepare("UPDATE pty_role_type SET note = ? WHERE code = 'TRAVEL_AGENCY'").run("a".repeat(500));
});
