// BÀI SONG SINH (ADR-0032; kế hoạch 2026-10-23 mục 3d): bản SQL của luật đếm (`han-muc-repo.ts`: `dem_tu_choi`, `dem_theo_nguoi`, câu đầu lô `chen_tu_choi`)
// phải cho CÙNG kết quả với bản thuần `demTuChoi` (`src/shared/han-muc-tu-choi.ts`) trên (1) bộ ca chung `han-muc-tu-choi-ca.ts` và (2) 500 chuỗi sự kiện
// sinh ngẫu nhiên có HẠT CỐ ĐỊNH. Thêm: kế hoạch truy vấn không quét cả sổ sự kiện (bảng chỉ thêm, lớn dần, không bao giờ xoá).
// SQLite thật (node:sqlite), schema từ mọi migration; gói bằng esbuild như service.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import { CA_DEM, DAU_TUAN } from "../../shared/han-muc-tu-choi-ca.ts";
import { demTuChoi, quyetDinhHanMuc, type LoaiSuKien, type SuKien } from "../../shared/han-muc-tu-choi.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./han-muc-repo.ts") & typeof import("../../shared/sql-registry.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./han-muc-repo"; export * from "../../shared/sql-registry";', resolveDir: HERE, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const { demTuChoiCua, demTheoNguoi, chenTuChoiStatement, registeredSql } = await loadModule();

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })) }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (ss: { sql: string; args: SupportedValueType[] }[]) => {
      sqlite.exec("BEGIN");
      try { const out = ss.map((s) => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } })); sqlite.exec("COMMIT"); return out; } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  } as unknown as D1Database;
}

const AT = "2026-09-01T00:00:00.000Z";
/** Lúc hỏi cài đặt: TRƯỚC dòng gieo của migration (gieo = lúc áp, luôn ≥ 23/10/2026) — dòng «Chặn 2/15» của bài (từ 01/01/2026) là dòng hiệu lực. */
const LUC = "2026-10-22T00:00:00.000Z";

function moi(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const f of FILES) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Lập Đơn', 1, '${AT}', '${AT}')`);
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  sqlite.exec(`INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by, updated_at, updated_by)
               VALUES ('bai-chan', 'BLOCK', 2, 15, '2026-01-01T00:00:00.000Z', '${AT}', NULL, '${AT}', NULL)`);
  return { sqlite, db: fakeD1(sqlite) };
}
const nguoi = (sqlite: DatabaseSync, id: string) =>
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Người', 1, ?, ?)").run(id, AT, AT);
function don(sqlite: DatabaseSync, id: string): void {
  if (sqlite.prepare("SELECT 1 FROM orders WHERE id = ?").get(id)) return;
  sqlite.prepare("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's1', 'confirmed', 'K', '0900000009', ?, ?)").run(id, `TD-${id}`, AT, AT);
}
let seq = 0;
function chen(sqlite: DatabaseSync, party: string, loai: LoaiSuKien, orderId: string | null, at: string): number {
  if (orderId) don(sqlite, orderId);
  const s = ++seq;
  sqlite.prepare(`INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`).run(`e${s}`, s, party, orderId, loai, loai === "REFUSE" ? "BAN_LICH" : null, at, at, at);
  return s;
}

test("bộ ca chung: dem_tu_choi (đơn X) và dem_theo_nguoi (bảng tổng) == demTuChoi; câu đầu lô chen_tu_choi chèn ⇔ quyetDinhHanMuc ≠ chặn", async () => {
  const { sqlite, db } = moi();
  for (const [i, ca] of CA_DEM.entries()) {
    const p = `pty-ca-${i}`;
    nguoi(sqlite, p);
    const o = (x: string | null) => (x === null ? null : `ca${i}-${x}`);
    const thuan: SuKien[] = ca.suKien.map(([loai, orderId, at]) => ({ seq: chen(sqlite, p, loai, o(orderId), at), loai, orderId: o(orderId), at }));
    assert.deepEqual(demTuChoi(thuan, o(ca.x), ca.dauTuan), ca.mong, `${ca.ten}: bản thuần (đổi tên đơn) vẫn đúng`);
    const sql = await demTuChoiCua(db, { partyId: p, orderId: o(ca.x), dauTuan: ca.dauTuan, luc: LUC });
    assert.deepEqual(sql, { cs: { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 }, dem: ca.mong }, `${ca.ten}: dem_tu_choi`);
    const [tong] = await demTheoNguoi(db, [p], ca.dauTuan);
    assert.deepEqual({ chuoi: tong!.chuoi, tuan: tong!.tuan }, demTuChoi(thuan, null, ca.dauTuan), `${ca.ten}: dem_theo_nguoi`);
    if (ca.x === null) continue;
    // Câu đầu lô: gieo dòng phụ trách mở của P trên X, chạy câu chèn REFUSE với Chặn 2/15, người bị giới hạn.
    const x = o(ca.x)!;
    don(sqlite, x);
    sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at)
                    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`).run(`h-${x}`, x, p, AT, AT, AT);
    const truoc = Number((sqlite.prepare("SELECT max(seq) AS s FROM dsp_release_event").get() as { s: number }).s);
    const [kq] = await db.batch([chenTuChoiStatement(db, { id: `tc-${i}`, partyId: p, orderId: x, dauTuan: ca.dauTuan, at: LUC, lyDo: "BAN_LICH", actorId: "s1", biGioiHan: true })]);
    const nenChen = quyetDinhHanMuc({ cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 }, ca.mong, true) !== "chan";
    assert.equal(kq!.meta.changes, nenChen ? 1 : 0, `${ca.ten}: câu đầu lô`);
    if (nenChen) assert.equal((sqlite.prepare("SELECT seq FROM dsp_release_event WHERE id = ?").get(`tc-${i}`) as { seq: number }).seq, truoc + 1, "seq = max + 1");
    seq = Number((sqlite.prepare("SELECT max(seq) AS s FROM dsp_release_event").get() as { s: number }).s);
    // Người KHÔNG bị giới hạn (?8 = 0) luôn chèn được khi đang phụ trách (ca đã chèn thì dòng phụ trách vẫn mở — câu này không đóng dòng).
    const [kq2] = await db.batch([chenTuChoiStatement(db, { id: `tc2-${i}`, partyId: p, orderId: x, dauTuan: ca.dauTuan, at: LUC, lyDo: "OTHER", actorId: "s1", biGioiHan: false })]);
    assert.equal(kq2!.meta.changes, 1, `${ca.ten}: không bị giới hạn ⇒ luôn chèn`);
    seq = Number((sqlite.prepare("SELECT max(seq) AS s FROM dsp_release_event").get() as { s: number }).s);
  }
});

test("câu đầu lô: không có dòng phụ trách mở của CHÍNH người gọi ⇒ không chèn (vế b); không có dòng cài đặt hiệu lực ⇒ không chèn", async () => {
  const { sqlite, db } = moi();
  nguoi(sqlite, "pty-a");
  nguoi(sqlite, "pty-b");
  don(sqlite, "o-x");
  sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES ('h', 'o-x', 'HANDLE', 'pty-b', 'PENDING', ?, ?, ?)`).run(AT, AT, AT);
  const cau = (party: string, luc: string) => chenTuChoiStatement(db, { id: crypto.randomUUID(), partyId: party, orderId: "o-x", dauTuan: DAU_TUAN, at: luc, lyDo: "BAN_LICH", actorId: "s1", biGioiHan: false });
  assert.equal((await db.batch([cau("pty-a", LUC)]))[0]!.meta.changes, 0, "người khác đang phụ trách");
  assert.equal((await db.batch([cau("pty-b", "2025-01-01T00:00:00.000Z")]))[0]!.meta.changes, 0, "chưa có cài đặt hiệu lực lúc đó");
  assert.equal(await demTuChoiCua(db, { partyId: "pty-b", orderId: "o-x", dauTuan: DAU_TUAN, luc: "2025-01-01T00:00:00.000Z" }), null);
  assert.equal((await db.batch([cau("pty-b", LUC)]))[0]!.meta.changes, 1);
});

/** PRNG mulberry32 — hạt cố định để lần chạy nào cũng cùng chuỗi; in hạt + chuỗi khi lệch. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HAT = 20261023;

test(`500 chuỗi ngẫu nhiên (hạt ${HAT}; 3 người × 6 đơn × 5 loại, mốc trải hai tuần): demTuChoi == dem_tu_choi mọi (người, đơn) và == dem_theo_nguoi`, async () => {
  const { sqlite, db } = moi();
  const rnd = mulberry32(HAT);
  const LOAI: LoaiSuKien[] = ["CLAIM", "ASSIGN", "REFUSE", "ABORT", "RESET"];
  const DON = Array.from({ length: 6 }, (_, i) => `rd-${i}`);
  const goc = Date.parse(DAU_TUAN) - 7 * 86400e3;
  for (let lan = 0; lan < 500; lan++) {
    const nguoiCuaLan = [0, 1, 2].map((k) => `pty-r${lan}-${k}`);
    nguoiCuaLan.forEach((p) => nguoi(sqlite, p));
    const cua = new Map<string, SuKien[]>(nguoiCuaLan.map((p) => [p, []]));
    const so = 5 + Math.floor(rnd() * 21);
    // Mốc tăng dần như đời thật (seq và giờ cùng chiều) — rơi đúng vài mốc lên ranh giới tuần để thử biên.
    let ms = goc;
    for (let k = 0; k < so; k++) {
      ms += Math.floor(rnd() * (14 * 86400e3 / so));
      const at = rnd() < 0.05 ? new Date(Date.parse(DAU_TUAN) - (rnd() < 0.5 ? 1 : 0)).toISOString() : new Date(ms).toISOString();
      const p = nguoiCuaLan[Math.floor(rnd() * 3)]!;
      const loai = LOAI[Math.floor(rnd() * (rnd() < 0.9 ? 4 : 5))]!;
      const orderId = loai === "RESET" ? null : DON[Math.floor(rnd() * 6)]!;
      cua.get(p)!.push({ seq: chen(sqlite, p, loai, orderId, at), loai, orderId, at });
    }
    const tong = new Map((await demTheoNguoi(db, nguoiCuaLan, DAU_TUAN)).map((r) => [r.party_id, r]));
    for (const p of nguoiCuaLan) {
      const ev = cua.get(p)!;
      for (const x of [...DON, null]) {
        const mong = demTuChoi(ev, x, DAU_TUAN);
        const sql = await demTuChoiCua(db, { partyId: p, orderId: x, dauTuan: DAU_TUAN, luc: LUC });
        assert.deepEqual(sql?.dem, mong, `lệch ở lần ${lan}, người ${p}, đơn ${x} — hạt ${HAT}; chuỗi: ${JSON.stringify(ev)}`);
      }
      const t = tong.get(p)!;
      assert.deepEqual({ chuoi: t.chuoi, tuan: t.tuan }, demTuChoi(ev, null, DAU_TUAN), `dem_theo_nguoi lệch ở lần ${lan}, người ${p}`);
      assert.equal(t.huy_tuan, ev.filter((e) => e.loai === "ABORT" && e.at >= DAU_TUAN).length, "huỷ tuần này (không bị RESET cắt)");
      const cuoi = [...ev].filter((e) => e.loai === "REFUSE").sort((a, b) => b.seq - a.seq)[0];
      assert.equal(t.cuoi_luc, cuoi?.at ?? null);
      assert.equal(t.cuoi_ly_do, cuoi ? "BAN_LICH" : null);
    }
  }
});

test("kế hoạch truy vấn: mọi câu đếm/chèn của han-muc-repo không QUÉT sổ sự kiện (chỉ SEARCH theo chỉ mục)", () => {
  const { sqlite } = moi();
  const cau = registeredSql().filter((e) => e.module === "dispatch" && /dsp_release_event/.test(e.sql));
  assert.ok(cau.length >= 7, `thấy ${cau.length} câu`);
  for (const e of cau) {
    const plan = (sqlite.prepare(`EXPLAIN QUERY PLAN ${e.sql}`).all() as { detail: string }[]).map((r) => r.detail);
    // Bí danh của sổ sự kiện trong các câu: r, t, c, f, l, a (p = bảng phụ một dòng cài đặt, j = json_each — quét được).
    const quet = plan.filter((d) => /^SCAN (dsp_release_event|r|t|c|f|l|a)\b/.test(d) && !/USING (COVERING )?INDEX/.test(d));
    assert.deepEqual(quet, [], `${e.name}: ${plan.join(" | ")}`);
  }
});
