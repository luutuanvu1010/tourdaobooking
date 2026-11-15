import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TRANG_THAI, chuanHoaEmail, chuyenHopLe, daKetThuc, sinhMaEmail, type TrangThai } from "./rules.ts";

const HOP_LE = new Set([
  "DANG_DIEN>CHO_XAC_MINH", "CHO_XAC_MINH>CAN_BO_SUNG", "CHO_XAC_MINH>CHO_DUYET", "CAN_BO_SUNG>CHO_XAC_MINH", "CHO_DUYET>DA_DUYET",
  ...["DANG_DIEN", "CHO_XAC_MINH", "CAN_BO_SUNG", "CHO_DUYET"].flatMap((t) => ["TU_CHOI", "DA_RUT", "HET_HAN"].map((d) => `${t}>${d}`)),
]);

test("chuyenHopLe: đúng đồ thị ADR-0206 Đ4 với MỌI cặp trạng thái", () => {
  for (const tu of TRANG_THAI) for (const den of TRANG_THAI) assert.equal(chuyenHopLe(tu, den), HOP_LE.has(`${tu}>${den}`), `${tu} → ${den}`);
});

test("bốn trạng thái kết thúc không đi đâu; còn lại không kết thúc", () => {
  assert.deepEqual(TRANG_THAI.filter(daKetThuc), ["DA_DUYET", "TU_CHOI", "DA_RUT", "HET_HAN"]);
  for (const t of TRANG_THAI.filter(daKetThuc)) for (const d of TRANG_THAI) assert.equal(chuyenHopLe(t, d), false);
});

test("hàm khớp trigger dk_registration_transition của CSDL (mọi cặp)", () => {
  const dir = new URL("../../../migrations/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const db = new DatabaseSync(":memory:");
  for (const f of files) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const trig = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'dk_registration_transition'").get() as { sql: string }).sql;
  for (const tu of TRANG_THAI) for (const den of TRANG_THAI) {
    db.exec("SAVEPOINT cap");
    // Đặt thẳng trạng thái xuất phát (bỏ trigger chuyển để dựng ca), rồi cài lại để thử; mọi thay đổi được cuộn lại sau mỗi cặp.
    db.exec("DROP TRIGGER dk_registration_transition");
    db.prepare(`INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES ('DK_AAAAAAAA', 'PERSON', 'DANG_DIEN', 'AGENT', 'a', 'a')`).run();
    db.prepare("UPDATE dk_registration SET status = ?").run(tu);
    db.exec(trig);
    let ok = true;
    try { db.prepare("UPDATE dk_registration SET status = ?").run(den as TrangThai); } catch { ok = false; }
    db.exec("ROLLBACK TO cap");
    db.exec("RELEASE cap");
    assert.equal(ok, tu === den || chuyenHopLe(tu, den), `${tu} → ${den}`);
  }
});

test("chuanHoaEmail: «An@Gmail.com » và «an@gmail.com» là MỘT khoá; sai dạng ⇒ null", () => {
  assert.equal(chuanHoaEmail("  An@Gmail.com "), "an@gmail.com");
  assert.equal(chuanHoaEmail("AN@GMAIL.COM"), chuanHoaEmail("an@gmail.com"));
  for (const x of ["", "a", "a@b", "a b@c.vn", "@c.vn", 5, null, undefined, `${"a".repeat(250)}@b.vn`]) assert.equal(chuanHoaEmail(x), null, String(x));
});

test("sinhMaEmail: đúng độ dài với MỌI giá trị CHECK cho phép (4, 6, 9, 10), giữ số 0 đầu, bỏ byte lệch (≥ 250)", () => {
  const tu = (...bytes: number[]) => (b: Uint8Array) => { b.fill(0); bytes.forEach((x, i) => { b[i] = x; }); };
  assert.equal(sinhMaEmail(4, tu(0, 0, 4, 2)), "0042");
  assert.equal(sinhMaEmail(4, tu(1, 255, 2, 250, 3, 251, 4)), "1234", "byte 250–255 bị bỏ, không lấy dư");
  assert.equal(sinhMaEmail(4, tu(19, 28, 37, 46)), "9876", "chữ số = byte mod 10");
  for (const n of [4, 6, 9, 10]) for (let i = 0; i < 40; i++) assert.match(sinhMaEmail(n), new RegExp(`^\\d{${n}}$`), `độ dài ${n}`);
  // phân bố: mỗi chữ số xuất hiện, không chữ số nào gấp đôi mức đều (kiểm thô)
  const dem = new Array(10).fill(0);
  for (let i = 0; i < 300; i++) for (const c of sinhMaEmail(10)) dem[Number(c)]++;
  for (const d of dem) assert.ok(d > 150 && d < 450, `phân bố lệch: ${dem.join(",")}`);
});
