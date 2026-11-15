import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TRANG_THAI, chuyenHopLe, daKetThuc, type TrangThai } from "./rules.ts";

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
  for (const tu of TRANG_THAI) for (const den of TRANG_THAI) {
    const db = new DatabaseSync(":memory:");
    for (const f of files) db.exec(readFileSync(new URL(f, dir), "utf8"));
    // Đặt thẳng trạng thái xuất phát (bỏ trigger chuyển để dựng ca), rồi cài lại để thử.
    const trig = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'dk_registration_transition'").get() as { sql: string }).sql;
    db.exec("DROP TRIGGER dk_registration_transition");
    db.prepare(`INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES ('DK_AAAAAAAA', 'PERSON', 'DANG_DIEN', 'AGENT', 'a', 'a')`).run();
    db.prepare("UPDATE dk_registration SET status = ?").run(tu);
    db.exec(trig);
    let ok = true;
    try { db.prepare("UPDATE dk_registration SET status = ?").run(den as TrangThai); } catch { ok = false; }
    assert.equal(ok, tu === den || chuyenHopLe(tu, den), `${tu} → ${den}`);
  }
});
