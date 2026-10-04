// ADR-0090 — tài khoản có quyền tiền: chỉ Toàn quyền đặt lại PIN (đ1i), gán vai Kế toán / cộng tay quyền tiền (đ1ii), tạo tài khoản mang quyền tiền (đ1iii).
// Chạy ROUTER THẬT của ứng dụng trên SQLite dựng từ migrations/*.sql (khung thử tests/audit/harness.mjs). Kịch bản gốc: QT04 + GD-P-01 (đánh giá UX 1/10).
// Tiêu chí Q-T2…Q-T6, Q-T8 ở kế hoạch docs/superpowers/plans/2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md §2.3.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const QT = "0b000000-0000-4000-8000-000000000001"; // Quản trị
const NS = "0b000000-0000-4000-8000-000000000002"; // Nhân sự
const KT = "0b000000-0000-4000-8000-000000000003"; // Kế toán
const BH = "0b000000-0000-4000-8000-000000000004"; // Bán hàng
const TQ = "0b000000-0000-4000-8000-000000000005"; // Toàn quyền
const TIEN = "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này."; // ADR-0090 đ1, nguyên văn

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: QT, phone: "0901000001", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: NS, phone: "0901000002", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: KT, phone: "0901000003", name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: BH, phone: "0901000004", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: TQ, phone: "0901000005", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  return w;
}
const dem = (w: ReturnType<typeof world>, sql: string, ...a: unknown[]): number => Number((w.q(sql, ...a)[0] as { n: number }).n);
const quyen = (w: ReturnType<typeof world>, id: string): string[] =>
  (w.q("SELECT permission_type_code AS p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY p", id) as { p: string }[]).map((r) => r.p);
const soTaiKhoan = (w: ReturnType<typeof world>) => dem(w, "SELECT count(*) AS n FROM staff");

test("Q-T2 (QT04): Quản trị đặt lại PIN của Kế toán → 403 câu đ1; PIN, phiên của Kế toán không đổi; không có nhật ký pin_reset", async () => {
  const w = setup();
  await w.token(KT); // Kế toán đang có một phiên sống
  const pinTruoc = w.q("SELECT pin_hash FROM staff WHERE id = ?", KT);
  const r = await w.call("POST", `/api/staff/${KT}/reset-pin`, { as: QT });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.message, TIEN);
  assert.equal(r.json.pin, undefined, "không trả PIN");
  assert.deepEqual(w.q("SELECT pin_hash FROM staff WHERE id = ?", KT), pinTruoc, "PIN không đổi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM aut_session WHERE staff_id = ? AND ended_at IS NULL", KT), 1, "phiên của Kế toán còn sống");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action IN ('pin_reset', 'passkey_removed') AND target_id = ?", KT), 0);
  // Bán hàng kiêm Kế toán cũng là tài khoản tiền.
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${BH}-ACC', '${BH}', 'ACCOUNTING', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`);
  assert.equal((await w.call("POST", `/api/staff/${BH}/reset-pin`, { as: QT })).status, 403, "Bán hàng kiêm Kế toán");
});

test("Q-T2 đối chứng: Quản trị vẫn đặt lại PIN Bán hàng (ADR-0042) → 200", async () => {
  const w = setup();
  const r = await w.call("POST", `/api/staff/${BH}/reset-pin`, { as: QT });
  assert.equal(r.status, 200, r.text);
  assert.match(r.json.pin, /^\d{6}$/);
});

test("Q-T3 (QT04 biến thể): Quản trị / Nhân sự gán vai Kế toán hoặc cộng tay Kế toán cho Bán hàng → 403 câu đ1, quyền không đổi", async () => {
  const w = setup();
  for (const as of [QT, NS]) {
    for (const body of [{ roles: ["SALES_STAFF", "ACCOUNTANT"] }, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm" }]) {
      const r = await w.call("PUT", `/api/staff/${BH}/roles`, { as, body });
      assert.equal(r.status, 403, `${as} ${JSON.stringify(body)}: ${r.text}`);
      assert.equal(r.json.error.message, TIEN);
    }
  }
  assert.deepEqual(quyen(w, BH), ["SALES"]);
});

test("Q-T4 (GD-P-01): Nhân sự tạo tài khoản mang vai Kế toán / quyền Kế toán qua CẢ HAI đường của POST /api/staff → 403 câu đ1, không có tài khoản mới", async () => {
  const w = setup();
  const truoc = soTaiKhoan(w);
  for (const body of [
    { taoHoSoMoi: true, fullName: "Kế Toán Mới", phone: "0901000011", roles: ["ACCOUNTANT"] }, // đường vai
    { taoHoSoMoi: true, fullName: "Kế Toán Mới", phone: "0901000012", roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm" },
    { taoHoSoMoi: true, fullName: "Kế Toán Cũ", phone: "0901000013", permissions: ["ACCOUNTING"] }, // đường cũ
  ]) {
    const r = await w.call("POST", "/api/staff", { as: NS, body });
    assert.equal(r.status, 403, `${JSON.stringify(body)}: ${r.text}`);
    assert.equal(r.json.error.message, TIEN);
  }
  assert.equal(soTaiKhoan(w), truoc);
  // Đối chứng: Nhân sự vẫn tạo Bán hàng.
  assert.equal((await w.call("POST", "/api/staff", { as: NS, body: { taoHoSoMoi: true, fullName: "Bán Hàng Mới", phone: "0901000014", roles: ["SALES_STAFF"] } })).status, 201);
});

test("Q-T5 (đ3): Quản trị vẫn đổi tên, ngưng, kích hoạt, mở khoá tài khoản Kế toán", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: QT, body: { fullName: "Kế Toán Đổi Tên" } })).status, 200);
  assert.equal((await w.call("POST", `/api/staff/${KT}/unlock`, { as: QT })).status, 200);
  const ngung = await w.call("PATCH", `/api/staff/${KT}`, { as: QT, body: { active: false } });
  assert.equal(ngung.status, 200, ngung.text);
  assert.equal(ngung.json.staff.active, false);
  assert.deepEqual(quyen(w, KT), ["ACCOUNTING"], "ngưng không đổi quyền");
});

test("Q-T6: Toàn quyền làm được cả bốn việc (đặt lại PIN Kế toán, gán vai Kế toán, tạo tài khoản Kế toán hai đường)", async () => {
  const w = setup();
  assert.equal((await w.call("POST", `/api/staff/${KT}/reset-pin`, { as: TQ })).status, 200);
  const gan = await w.call("PUT", `/api/staff/${BH}/roles`, { as: TQ, body: { roles: ["SALES_STAFF", "ACCOUNTANT"] } });
  assert.equal(gan.status, 200, gan.text);
  assert.deepEqual(quyen(w, BH), ["ACCOUNTING", "SALES"]);
  assert.equal((await w.call("POST", "/api/staff", { as: TQ, body: { taoHoSoMoi: true, fullName: "Kế Toán Vai", phone: "0901000021", roles: ["ACCOUNTANT"] } })).status, 201);
  assert.equal((await w.call("POST", "/api/staff", { as: TQ, body: { taoHoSoMoi: true, fullName: "Kế Toán Cũ", phone: "0901000022", permissions: ["ACCOUNTING"] } })).status, 201);
});

test("Q-T8 (ghim): PUT /api/staff/:id/permissions vẫn chỉ Toàn quyền — Quản trị, Nhân sự → 403", async () => {
  const w = setup();
  for (const as of [QT, NS]) assert.equal((await w.call("PUT", `/api/staff/${BH}/permissions`, { as, body: { permissions: ["SALES", "ACCOUNTING"] } })).status, 403, as);
  assert.deepEqual(quyen(w, BH), ["SALES"]);
});

// ADR-0090 đ2 (Q-T7, phần máy chủ): GET /api/staff trả cờ `datLaiPinDuoc` THEO DÒNG, tính bằng CÙNG hàm với cổng route — đối chiếu cờ với mã trả thật của
// POST /api/staff/:id/reset-pin cho mọi cặp (người xem, dòng): cờ true ⇔ 200. Lệch là hai luật.
test("ADR-0090 đ2: cờ datLaiPinDuoc theo dòng của GET /api/staff khớp mã trả của route reset-pin (Quản trị, Nhân sự, Toàn quyền × mọi dòng)", async () => {
  const mong: Record<string, Record<string, boolean>> = {
    [QT]: { [KT]: false, [BH]: true, [QT]: false, [NS]: false, [TQ]: false },
    [TQ]: { [KT]: true, [BH]: true, [QT]: true, [NS]: true, [TQ]: false },
    [NS]: { [KT]: false, [BH]: false, [QT]: false, [NS]: false, [TQ]: false },
  };
  for (const xem of [QT, TQ, NS]) {
    const w = setup();
    const r = await w.call("GET", "/api/staff", { as: xem });
    assert.equal(r.status, 200, r.text);
    const co = Object.fromEntries((r.json.staff as { id: string; datLaiPinDuoc: unknown }[]).map((s) => [s.id, s.datLaiPinDuoc]));
    assert.deepEqual(co, mong[xem], `người xem ${xem}`);
    for (const [id, duoc] of Object.entries(co)) {
      const kq = await w.call("POST", `/api/staff/${id}/reset-pin`, { as: xem });
      assert.equal(kq.status === 200, duoc, `người xem ${xem}, dòng ${id}: cờ ${duoc} nhưng route trả ${kq.status}`);
    }
  }
});

test.todo("ADR-0090 đ1(iv): tắt bảo mật hai lớp của tài khoản có quyền tiền — chỉ Toàn quyền (chờ ADR-0074 Phần B thi công)");
