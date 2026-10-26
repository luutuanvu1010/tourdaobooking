// Task 3.2b (kế hoạch 2026-10-19-xac-nhan-don): `confirmOrder` tách thành `soanXacNhan` (SOẠN lô chưa chạy) + vỏ mỏng gọi `db.batch` — KHÔNG đổi hành vi.
// Bài này ghim: (1) lô soạn ra có ĐÚNG thứ tự câu của lô cũ [điền ngày đón → đổi trạng thái → nhật ký "confirmed" → câu kèm (bản chụp mức)];
// (2) `confirmOrder` chạy đúng MỘT `db.batch` với đúng các câu đó; (3) thắng thua đọc ở câu thứ hai (`daXacNhan`).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const HERE = new URL("./", import.meta.url).pathname;
type Mod = typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const repo = await loadModule();

interface Cau { sql: string; args: unknown[]; marker?: string }
/** CSDL giả chỉ ghi lại câu đã chuẩn bị + các lô đã chạy; `batch` trả `changes` theo kịch bản. */
function fakeDb(changes: number[] = [0, 1, 1, 1]) {
  const lo: Cau[][] = [];
  const db = {
    prepare(sql: string) {
      return { bind: (...args: unknown[]): Cau => ({ sql, args }) };
    },
    async batch(cau: Cau[]) {
      lo.push(cau);
      return cau.map((_, i) => ({ meta: { changes: changes[i] ?? 1 }, results: [] }));
    },
  };
  return { db: db as unknown as D1Database, lo };
}
const IN = { id: "11111111-1111-4111-8111-111111111111", staffId: "s1", today: "2026-10-26", prev: "2026-10-26T03:00:00.000Z", nguong: "2026-10-26 13:00" };
const kem = (at: string): D1PreparedStatement[] => [{ sql: `CHUP ${at}`, args: [] } as unknown as D1PreparedStatement];

test("soanXacNhan: lô gồm điền ngày đón → đổi trạng thái → nhật ký confirmed → câu kèm, theo ĐÚNG thứ tự, chưa chạy gì", () => {
  const { db, lo } = fakeDb();
  const { cau } = repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem);
  assert.equal(lo.length, 0, "soạn không chạy batch");
  assert.equal(cau.length, 4);
  const sqls = (cau as unknown as Cau[]).map((c) => c.sql);
  assert.match(sqls[0]!, /ord_transfer_leg/i);
  assert.match(sqls[1]!, /UPDATE\s+orders/i);
  assert.match(sqls[1]!, /confirmed/);
  assert.match(sqls[2]!, /audit_log/i);
  assert.match(sqls[3]!, /^CHUP /, "câu kèm (bản chụp mức) đi cùng mảng, đứng SAU nhật ký, nhận đúng mốc `at` của lô");
  const at = (cau[3] as unknown as Cau).sql.slice(5);
  assert.ok(at > IN.prev, "mốc updated_at mới lớn hơn mốc đã đọc (nextStamp)");
});

test("soanXacNhan: không câu kèm thì chỉ ba câu", () => {
  const { db } = fakeDb();
  assert.equal(repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined).cau.length, 3);
});

test("daXacNhan đọc câu thứ hai (chỉ số 1): thắng ⇔ đổi một dòng", () => {
  assert.equal(repo.daXacNhan([{ meta: { changes: 0 } }, { meta: { changes: 1 } }] as never), true);
  assert.equal(repo.daXacNhan([{ meta: { changes: 1 } }, { meta: { changes: 0 } }] as never), false);
  assert.equal(repo.daXacNhan([] as never), false);
});

test("confirmOrder = vỏ mỏng: chạy ĐÚNG MỘT db.batch với đúng các câu của soanXacNhan, trả theo câu thứ hai", async () => {
  const a = fakeDb([0, 1, 1, 1]);
  const ok = await repo.confirmOrder(a.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem);
  assert.equal(ok, true);
  assert.equal(a.lo.length, 1);
  const soan = repo.soanXacNhan(fakeDb().db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem).cau as unknown as Cau[];
  const bo = (c: Cau[]) => c.map((x) => x.sql.replace(/^CHUP .*/, "CHUP")); // mốc `at` lấy theo đồng hồ nên bỏ phần mốc khi so
  assert.deepEqual(bo(a.lo[0]!), bo(soan));
  const b = fakeDb([0, 0, 0, 0]);
  assert.equal(await repo.confirmOrder(b.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined), false);
});
