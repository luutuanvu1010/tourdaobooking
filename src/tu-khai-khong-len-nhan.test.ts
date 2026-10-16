// HÀNG RÀO 5.23 (ADR-0124 đ1, Hệ quả; lát H-3 Gói 2): giá trị TỰ KHAI chưa xác minh không bao giờ lên nhãn, đơn, chứng từ, Danh bạ. Chỉ bốn route /api/parties/cua-toi* đọc
// / ghi bảng pty_self_submission. Ba lưới: (1) chữ "pty_self_submission" chỉ ở src/modules/parties/repository.ts (ngoài tệp test); không view nào đọc bảng; (2) câu SQL đăng ký
// chạm bảng = ĐÚNG tập ghim; (3) trong index.ts, năm hàm repository chạm bảng chỉ xuất hiện trong khối import và trong thân route có đường bắt đầu /api/parties/cua-toi.
// Phá thử: gọi listPhieuCuaHoSo trong respondParty → (3) đỏ; thêm view chọn từ pty_self_submission vào migration → (1) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const BANG = "pty_self_submission";
const CAU_GHIM = ["find_self_submission_of_party", "insert_self_submission", "list_self_submissions_of_party", "withdraw_pending_self_submissions_of_party", "withdraw_self_submission"];
const HAM = ["ghiPhieuStatement", "listPhieuCuaHoSo", "timPhieuCuaHoSo", "rutPhieuStatement", "rutMoiPhieuChoStatement"];

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tepTs(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

test("(1) tên bảng chỉ ở parties/repository.ts; không view nào đọc bảng phiếu", () => {
  const co = tepTs(SRC).filter((p) => readFileSync(p, "utf8").includes(BANG)).map((p) => p.slice(SRC.length));
  assert.deepEqual(co, ["modules/parties/repository.ts"]);
  const mig = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(mig).filter((x) => x.endsWith(".sql"))) {
    for (const v of readFileSync(new URL(f, mig), "utf8").split(/;\s*\n/).filter((c) => /CREATE\s+VIEW/i.test(c))) assert.ok(!v.includes(BANG), `${f}: view đọc ${BANG}`);
  }
});

test("(2) câu SQL đăng ký chạm bảng phiếu = đúng tập ghim", async () => {
  await import("./modules/parties/repository.ts");
  const { registeredSql } = await import("./shared/sql-registry.ts");
  const ten = registeredSql().filter((e) => e.sql.includes(BANG)).map((e) => e.name).sort();
  assert.deepEqual(ten, CAU_GHIM);
});

test("(3) trong parties/index.ts, hàm chạm bảng phiếu chỉ được gọi trong thân route /api/parties/cua-toi*", () => {
  const src = readFileSync(join(SRC, "modules/parties/index.ts"), "utf8").replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "");
  const khuc = src.split(/(?=\broute\(")/);
  const loi: string[] = [];
  for (const k of khuc) {
    const m = /^route\("[A-Z]+", "([^"]+)"/.exec(k);
    const duong = m?.[1] ?? "(ngoài route)";
    for (const h of HAM) if (new RegExp(`\\b${h}\\b`).test(k) && !duong.startsWith("/api/parties/cua-toi")) loi.push(`${h} ở ${duong}`);
  }
  assert.deepEqual(loi, []);
  for (const h of HAM) assert.ok(khuc.some((k) => new RegExp(`\\b${h}\\b`).test(k)), `chống bài rỗng: ${h} phải được dùng`);
});
