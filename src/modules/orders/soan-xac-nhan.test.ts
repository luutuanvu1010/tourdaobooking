// Task 3.2b (kế hoạch 2026-10-19-xac-nhan-don): `confirmOrder` tách thành `soanXacNhan` (SOẠN lô chưa chạy) + vỏ mỏng gọi `db.batch` — KHÔNG đổi hành vi.
// Bài này ghim: (1) lô soạn ra có ĐÚNG thứ tự câu của lô cũ [điền ngày đón → đổi trạng thái → nhật ký "confirmed" → câu kèm (bản chụp mức)];
// (2) `confirmOrder` chạy đúng MỘT `db.batch` với đúng các câu đó; (3) thắng thua đọc ở câu đổi trạng thái (`daXacNhan(kq, chiSoXacNhan)` — câu thứ hai khi không có phí).
// Đợt C, Task 4: câu phí đưa đón đứng TRƯỚC câu đổi trạng thái, câu chốt đứng CUỐI phần soạn (sau chuỗi changes() của nhật ký confirmed và bản chụp).
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
const KHONG = () => [];
const kem = (at: string): D1PreparedStatement[] => [{ sql: `CHUP ${at}`, args: [] } as unknown as D1PreparedStatement];

test("soanXacNhan: lô gồm điền ngày đón → đổi trạng thái → nhật ký confirmed → câu kèm, theo ĐÚNG thứ tự, chưa chạy gì", () => {
  const { db, lo } = fakeDb();
  const { cau } = repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem, KHONG, KHONG, KHONG);
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
  assert.equal(repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined, undefined, KHONG, KHONG, KHONG).cau.length, 3);
});

test("daXacNhan đọc ĐÚNG chỉ số được truyền (chiSoXacNhan): thắng ⇔ câu đó đổi một dòng", () => {
  assert.equal(repo.daXacNhan([{ meta: { changes: 0 } }, { meta: { changes: 1 } }] as never, 1), true);
  assert.equal(repo.daXacNhan([{ meta: { changes: 1 } }, { meta: { changes: 0 } }] as never, 1), false);
  assert.equal(repo.daXacNhan([{ meta: { changes: 1 } }, { meta: { changes: 0 } }, { meta: { changes: 0 } }, { meta: { changes: 1 } }] as never, 3), true);
  assert.equal(repo.daXacNhan([{ meta: { changes: 1 } }, { meta: { changes: 1 } }, { meta: { changes: 1 } }, { meta: { changes: 0 } }] as never, 3), false);
  assert.equal(repo.daXacNhan([] as never, 1), false);
});

// ---- Đợt C, Task 4: câu phí đưa đón đứng TRƯỚC câu đổi trạng thái (trigger 0081), câu chốt đứng CUỐI phần soạn (câu chốt bị trigger bỏ qua để lại changes() = 0) ----
const PHI = (moc: string): D1PreparedStatement[] => ["PHI_XOA", "PHI_CHEN", "PHI_TIEN"].map((x) => ({ sql: `${x} ${moc}`, args: [] }) as unknown as D1PreparedStatement);
const COC = ({ auditId }: { at: string; auditId: string }): D1PreparedStatement[] => [{ sql: `COC ${auditId}`, args: [] } as unknown as D1PreparedStatement];

test("soanXacNhan có câu phí: [phí…] → điền ngày → đổi trạng thái (chiSoXacNhan) → nhật ký confirmed NGAY SAU → câu kèm → cọc → … → câu chốt CUỐI; câu phí nhận đúng mốc đã đọc", () => {
  const { db } = fakeDb();
  const xn = repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem, COC, KHONG, PHI);
  const sqls = (xn.cau as unknown as Cau[]).map((c) => c.sql);
  assert.deepEqual(sqls.slice(0, 3), [`PHI_XOA ${IN.prev}`, `PHI_CHEN ${IN.prev}`, `PHI_TIEN ${IN.prev}`], "câu phí gác bằng mốc `prevUpdatedAt` — cùng mốc câu xác nhận khoá");
  assert.equal(xn.chiSoXacNhan, 4);
  assert.match(sqls[3]!, /ord_transfer_leg/i, "điền ngày đón ngay trước câu đổi trạng thái");
  assert.match(sqls[xn.chiSoXacNhan]!, /status = 'confirmed'/);
  assert.match(sqls[xn.chiSoXacNhan + 1]!, /audit_log/i, "nhật ký confirmed đứng NGAY sau câu đổi trạng thái (chuỗi changes() > 0)");
  assert.match(sqls[xn.chiSoXacNhan + 2]!, /^CHUP /);
  assert.equal(sqls[xn.chiSoXacNhan + 3], `COC ${xn.auditId}`);
  assert.match(sqls.at(-1)!, /INSERT INTO ord_xac_nhan_phi_gac/, "câu chốt là câu CUỐI của phần soạn");
  assert.equal(sqls.filter((x) => /ord_xac_nhan_phi_gac/.test(x)).length, 1);
  assert.equal(sqls.length, 3 + 1 + 1 + 1 + 1 + 1 + 1);
});

test("soanXacNhan không câu phí (phí chưa áp, không dòng cũ): lô như trước Đợt C — không câu chốt, chiSoXacNhan = 1", () => {
  const { db } = fakeDb();
  const xn = repo.soanXacNhan(db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem, COC, KHONG, KHONG);
  const sqls = (xn.cau as unknown as Cau[]).map((c) => c.sql);
  assert.equal(xn.chiSoXacNhan, 1);
  assert.equal(sqls.filter((x) => /ord_xac_nhan_phi_gac/.test(x)).length, 0);
  assert.equal(sqls.length, 5);
});

test("confirmOrder có câu phí đọc thắng / thua ở chiSoXacNhan, không ở chỉ số 1", async () => {
  const thang = fakeDb([1, 1, 1, 0, 1, 1, 1, 1]);
  assert.equal(await repo.confirmOrder(thang.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined, undefined, KHONG, KHONG, PHI), true);
  const thua = fakeDb([1, 1, 1, 1, 0, 0, 0, 0]);
  assert.equal(await repo.confirmOrder(thua.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined, undefined, KHONG, KHONG, PHI), false);
});

test("confirmOrder = vỏ mỏng: chạy ĐÚNG MỘT db.batch với đúng các câu của soanXacNhan, trả theo câu thứ hai", async () => {
  const a = fakeDb([0, 1, 1, 1]);
  const ok = await repo.confirmOrder(a.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem, KHONG, KHONG, KHONG);
  assert.equal(ok, true);
  assert.equal(a.lo.length, 1);
  const soan = repo.soanXacNhan(fakeDb().db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, "chi tiết", kem, KHONG, KHONG, KHONG).cau as unknown as Cau[];
  const bo = (c: Cau[]) => c.map((x) => x.sql.replace(/^CHUP .*/, "CHUP")); // mốc `at` lấy theo đồng hồ nên bỏ phần mốc khi so
  assert.deepEqual(bo(a.lo[0]!), bo(soan));
  const b = fakeDb([0, 0, 0, 0]);
  assert.equal(await repo.confirmOrder(b.db, IN.id, IN.staffId, IN.today, IN.prev, IN.nguong, undefined, undefined, KHONG, KHONG, KHONG), false);
});
