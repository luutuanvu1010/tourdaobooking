// Soát tiền hằng ngày (Đợt 2 sau kiểm toán, đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md mục 2 «Soát tiền hằng ngày»):
// chạy đúng lượt 7 giờ sáng giờ VN, dùng chính danh sách kiểm của scripts/audit-checks.mjs, thư chỉ khi lệch, thư không chứa dữ liệu khách, chỉ tác nhân của nó chạy được.
// Chạy CẢ Worker trên SQLite thật (tests/audit/harness.mjs); bộ gửi thư là bản giả ghi lại thư.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../tests/audit/harness.mjs";
import { CHECKS } from "../scripts/audit-checks.mjs";
import { KIEM_TIEN_VE, laLuotBayGioSang, soatTienVe, soatTienHangNgay } from "./soat-tien-hang-ngay.ts";
import { tacNhan } from "./shared/permissions.ts";

const BAY_GIO_SANG = Date.parse("2026-11-16T00:05:00Z"); // 07:05 giờ VN
const TAM_GIO_SANG = Date.parse("2026-11-16T01:05:00Z"); // 08:05 giờ VN
const NGUOI_NHAN = "chu@vi-du.test";

function moiTruong() {
  const w = world();
  const thu: { to: string; subject: string; text?: string; html?: string }[] = [];
  // Chỉ ghi thư soát tiền: lượt 7 giờ còn có thư báo việc tự động lỗi (khung thử không có Google Sheet ⇒ đồng bộ danh mục lỗi) — bài src/bao-loi-dinh-gio.test.ts.
  const env = { ...w.env, EMAIL: { send: async (m: (typeof thu)[number]) => void (/soát tiền/.test(m.subject) && thu.push(m)) }, FEEDBACK_MAIL_FROM: "noreply@vi-du.test", FEEDBACK_NOTIFY_EMAIL: NGUOI_NHAN };
  return { w, env, thu };
}

/** Một đơn Trả trước mang hạn trả — R-CRD-2 lệch. Tên và SĐT khách cố ý dễ nhận để kiểm thư không lộ. */
function lamLechMotDong(w: any): void {
  seedStaff(w.sqlite, { id: "s-an", phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
    VALUES ('o-lech', 'TD-LECH', 's-an', 'draft', 'Khách Bí Mật', '0911222333', '2026-11-15T00:00:00.000Z', '2026-11-15T00:00:00.000Z')`);
  w.sqlite.exec(`UPDATE orders SET payment_term = 'PREPAID', credit_due_date = '2026-11-30' WHERE id = 'o-lech'`);
}

async function chayCron(env: unknown, scheduledTime: number): Promise<void> {
  const cho: Promise<unknown>[] = [];
  await app.default.scheduled({ cron: "*/15 * * * *", scheduledTime }, env, { waitUntil: (p: Promise<unknown>) => void cho.push(p), passThroughOnException() {} });
  await Promise.all(cho);
}

test("nhóm kiểm = mọi luật R-BIL/R-KY/R-VDT/R-CRD mức làm đỏ --strict của scripts/audit-checks.mjs (một nguồn)", () => {
  const mong = CHECKS.filter((c: any) => /^R-(BIL|KY|VDT|CRD)-/.test(c.code) && c.level !== "warn").map((c: any) => c.code);
  assert.deepEqual(KIEM_TIEN_VE.map((c) => c.code), mong);
  assert.ok(mong.length >= 40, `nhóm tiền và vé phải đủ lớn (đang ${mong.length})`);
  assert.ok(mong.includes("R-CRD-2") && mong.includes("R-KY-1") && mong.includes("R-VDT-1") && mong.includes("R-BIL-NP1"));
});

test("chỉ lượt 00:00–00:14 UTC (7 giờ sáng giờ VN) là lượt soát", () => {
  assert.equal(laLuotBayGioSang(Date.parse("2026-11-16T00:00:00Z")), true);
  assert.equal(laLuotBayGioSang(Date.parse("2026-11-16T00:14:59Z")), true);
  assert.equal(laLuotBayGioSang(Date.parse("2026-11-16T00:15:00Z")), false);
  assert.equal(laLuotBayGioSang(Date.parse("2026-11-15T23:59:00Z")), false);
});

test("dữ liệu sạch: Cron 7 giờ chạy đủ nhóm kiểm trên SQLite thật, không gửi thư", async () => {
  const { env, thu } = moiTruong();
  const lech = await soatTienVe(env.DB, tacNhan("SOAT_TIEN_HANG_NGAY"));
  assert.deepEqual(lech, [], "cơ sở dữ liệu mới không lệch luật nào — mọi câu SQL chạy được");
  await chayCron(env, BAY_GIO_SANG);
  assert.equal(thu.length, 0);
});

test("cố ý làm lệch một dòng ⇒ thư 7 giờ nêu mã luật và số chỗ lệch, không tên khách, không SĐT; lượt 8 giờ không gửi; sửa lại ⇒ hôm sau không thư", async () => {
  const { w, env, thu } = moiTruong();
  lamLechMotDong(w);
  await chayCron(env, TAM_GIO_SANG);
  assert.equal(thu.length, 0, "lượt không phải 7 giờ không soát");
  await chayCron(env, BAY_GIO_SANG);
  assert.equal(thu.length, 1);
  const t = thu[0]!;
  assert.equal(t.to, NGUOI_NHAN);
  assert.match(t.subject, /16\/11\/2026 có 1 luật lệch/);
  assert.match(t.text ?? "", /R-CRD-2: .* — 1 chỗ lệch/);
  for (const bi of ["Khách Bí Mật", "0911222333", "TD-LECH", "o-lech"]) assert.ok(!`${t.subject}\n${t.text}\n${t.html ?? ""}`.includes(bi), `thư không được chứa ${bi}`);
  w.sqlite.exec(`UPDATE orders SET credit_due_date = NULL WHERE id = 'o-lech'`);
  await chayCron(env, BAY_GIO_SANG + 86_400_000);
  assert.equal(thu.length, 1, "đã sửa ⇒ không thêm thư");
});

test("bên không giữ ô audit.money.daily (tác nhân khác, người có quyền) ⇒ không chạm cơ sở dữ liệu, không thư", async () => {
  const { w, env, thu } = moiTruong();
  lamLechMotDong(w);
  for (const ben of [tacNhan("DON_ANH_VE"), { id: "s-an", permissions: ["SALES", "ACCOUNTING", "ADMIN"] as const }]) {
    let goi = 0;
    const db = { ...env.DB, batch: async () => (goi++, []), prepare: () => (goi++, {}) } as unknown as D1Database;
    assert.equal(await soatTienVe(db, ben as any), null);
    assert.equal(goi, 0);
    await soatTienHangNgay({ ...env }, BAY_GIO_SANG, ben as any);
  }
  assert.equal(thu.length, 0);
});

test("thiếu người nhận hoặc bộ gửi ném ⇒ không ném ra Cron (việc định giờ khác vẫn chạy)", async () => {
  const { w, env } = moiTruong();
  lamLechMotDong(w);
  await soatTienHangNgay({ ...env, FEEDBACK_NOTIFY_EMAIL: "" }, BAY_GIO_SANG);
  await soatTienHangNgay({ ...env, EMAIL: { send: async () => { throw new Error("hỏng"); } } }, BAY_GIO_SANG);
  await soatTienHangNgay({ ...env, DB: { batch: async () => { throw new Error("D1 hỏng"); }, prepare: () => ({}) } as unknown as D1Database }, BAY_GIO_SANG);
});
