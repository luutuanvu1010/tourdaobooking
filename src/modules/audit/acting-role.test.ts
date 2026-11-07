// ADR-0180 Đ2 — mọi dòng nhật ký ghi khi Toàn quyền đang "xem như" vai khác mang dấu mã vai (`audit_log.acting_role`). Hàm ghi duy nhất `insertStatement`
// tự điền cột bằng truy vấn con theo `staff_id` (không có AsyncLocalStorage vì Worker không bật nodejs_compat). Chạy trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff, world } from "../../../tests/audit/harness.mjs";
import * as esbuild from "esbuild";

const HERE = new URL("./", import.meta.url).pathname;
const built = await esbuild.build({
  stdin: { contents: 'export { auditStatement } from "./index";', resolveDir: HERE, loader: "ts" },
  bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
});
const { auditStatement } = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as typeof import("./index.ts");

const CHU = "77777777-7777-4777-8777-777777777777";
const AN = "11111111-1111-4111-8111-111111111111";
const PHUT = 60_000;

function dung() {
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: AN, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}
/** Chèn một phiên còn sống của `staffId`, đang đóng `vai`, hoạt động gần nhất cách đây `phutTruoc` phút. */
function phien(w: any, staffId: string, vai: string | null, phutTruoc: number): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  const tao = new Date(now - (phutTruoc + 5) * PHUT).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by, acting_role) " +
      "VALUES (?1, ?2, 'PIN', 0, NULL, 'Máy thử', NULL, NULL, ?3, ?4, ?5, NULL, NULL, NULL, ?2, ?3, NULL, ?6)",
  ).run(id, staffId, tao, new Date(now - phutTruoc * PHUT).toISOString(), new Date(now + 7 * 24 * 60 * PHUT).toISOString(), vai);
  return id;
}
async function ghi(w: any, staffId: string | null | undefined, onlyIf?: string): Promise<string | null | undefined> {
  const id = crypto.randomUUID();
  await auditStatement(w.env.DB, { id, staffId, action: "staff_updated", at: new Date().toISOString(), targetType: "staff", targetId: AN }, onlyIf).run();
  return w.q("SELECT acting_role FROM audit_log WHERE id = ?", id)[0]?.acting_role;
}

test("(a) Toàn quyền có phiên đang đóng Bán hàng, vừa thao tác → dòng nhật ký mang acting_role = 'SALES'", async () => {
  const w = dung();
  phien(w, CHU, "SALES", 1);
  assert.equal(await ghi(w, CHU), "SALES");
});

test("(a') nhiều phiên đang đóng: lấy vai của phiên hoạt động gần nhất", async () => {
  const w = dung();
  phien(w, CHU, "SALES", 30);
  phien(w, CHU, "ACCOUNTING", 2);
  assert.equal(await ghi(w, CHU), "ACCOUNTING");
});

test("(b) Toàn quyền không đóng vai → acting_role NULL", async () => {
  const w = dung();
  phien(w, CHU, null, 1);
  assert.equal(await ghi(w, CHU), null);
});

test("(c) phiên đóng vai đã quá 60 phút không thao tác → NULL; còn trong 59 phút → có dấu", async () => {
  const w = dung();
  phien(w, CHU, "SALES", 61);
  assert.equal(await ghi(w, CHU), null);
  phien(w, CHU, "HR", 59);
  assert.equal(await ghi(w, CHU), "HR");
});

test("(c') phiên đã kết thúc hoặc mốc last_seen_at hỏng → NULL", async () => {
  const w = dung();
  const id = phien(w, CHU, "SALES", 1);
  w.sqlite.prepare("UPDATE aut_session SET ended_at = ?2, end_reason = 'dang_xuat' WHERE id = ?1").run(id, new Date().toISOString());
  assert.equal(await ghi(w, CHU), null);
  const id2 = phien(w, CHU, "SALES", 1);
  w.sqlite.prepare("UPDATE aut_session SET last_seen_at = 'zzz' WHERE id = ?1").run(id2);
  assert.equal(await ghi(w, CHU), null);
});

test("(d) không có người thao tác (hệ thống) → NULL", async () => {
  const w = dung();
  phien(w, CHU, "SALES", 1);
  assert.equal(await ghi(w, null), null);
  assert.equal(await ghi(w, undefined), null);
});

test("(g) tài khoản không giữ Toàn quyền mà dòng phiên có cột vai (dữ liệu hỏng) → NULL, như currentStaff bỏ qua cột", async () => {
  const w = dung();
  phien(w, AN, "SALES", 1);
  assert.equal(await ghi(w, AN), null);
});

test("onlyIf vẫn chạy: điều kiện sai thì không ghi dòng; đúng thì ghi kèm dấu", async () => {
  const w = dung();
  phien(w, CHU, "SALES", 1);
  assert.equal(await ghi(w, CHU, "1 = 0"), undefined);
  assert.equal(await ghi(w, CHU, "1 = 1"), "SALES");
});

// (f) Dòng nhật ký của chính route bật / thoát (Task 4).
const DUONG = "/api/auth/xem-nhu-vai";
const dauCua = (w: any, action: string) => w.q("SELECT acting_role FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => r.acting_role);

test("(f) bật từ chỗ không đóng vai: dòng acting_role_set mang NULL (ghi TRƯỚC câu đặt vai; mã vai đã ở detail); thoát: dòng acting_role_cleared mang vai vừa rời", async () => {
  const w = dung();
  await w.token(CHU);
  assert.equal((await w.call("POST", DUONG, { as: CHU, body: { role: "SALES" } })).status, 200);
  assert.deepEqual(dauCua(w, "acting_role_set"), [null]);
  assert.equal((await w.call("DELETE", DUONG, { as: CHU })).status, 200);
  assert.deepEqual(dauCua(w, "acting_role_cleared"), ["SALES"]);
});

test("(f') đổi thẳng từ vai này sang vai khác: dòng acting_role_set thứ hai mang vai ĐANG RỜI (đúng thiết kế, không phải lỗi)", async () => {
  const w = dung();
  await w.token(CHU);
  await w.call("POST", DUONG, { as: CHU, body: { role: "SALES" } });
  await w.call("POST", DUONG, { as: CHU, body: { role: "DRIVER_PARTNER" } });
  assert.deepEqual(dauCua(w, "acting_role_set"), [null, "SALES"]);
});

test("(f'') thao tác khác lúc đang đóng vai mang dấu vai", async () => {
  const w = dung();
  await w.token(CHU);
  await w.call("POST", DUONG, { as: CHU, body: { role: "ACCOUNTING" } });
  assert.equal(await ghi(w, CHU), "ACCOUNTING");
});

// (e) Bài khoá: không đường ghi nhật ký nào bỏ qua insertStatement.
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const HAM_GHI = "src/modules/audit/repository.ts";
function tep(dir: string): string[] {
  const out: string[] = [];
  for (const ten of readdirSync(dir)) {
    if (ten === "node_modules") continue;
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) out.push(...tep(p));
    else if (/\.(ts|mjs|js)$/.test(ten) && !/\.test\.ts$/.test(ten)) out.push(p);
  }
  return out;
}
test("(e) không có `INSERT INTO audit_log` nào ngoài tệp của insertStatement (src/, web/, scripts/ — trừ bài kiểm)", () => {
  const MAU = /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+audit_log\b/i;
  const lech = [...tep(join(ROOT, "src")), ...tep(join(ROOT, "web")), ...tep(join(ROOT, "scripts"))]
    .map((p) => relative(ROOT, p))
    .filter((r) => r !== HAM_GHI && MAU.test(readFileSync(join(ROOT, r), "utf8")));
  assert.deepEqual(lech, [], "ghi nhật ký phải đi qua insertStatement / auditStatement để có dấu vai (ADR-0180 Đ2)");
  // Bài tự kiểm: mẫu phải bắt được chính câu của hàm ghi (không thì bài khoá rỗng).
  assert.match(readFileSync(join(ROOT, HAM_GHI), "utf8"), MAU);
});
