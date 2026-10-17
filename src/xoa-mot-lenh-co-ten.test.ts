// HÀNG RÀO 5.24 (ADR-0126 tiêu chí nghiệm thu cuối; Hiến chương 5.24: ẩn danh hoá là ngoại lệ CÓ TÊN của 5.5): chỉ MỘT lệnh có tên được ghi đè nội dung dòng đã khoá. Ba lưới:
// (1) câu SQL đăng ký đặt `erased_at` trên pty_person_document / pty_self_submission = ĐÚNG hai câu của lệnh ẩn danh hoá (sửa thường nội dung dòng ĐÃ khoá — đã gia hạn / đã huỷ /
// đã xử lý / đã ẩn danh — vốn bị trigger chặn; miễn trừ CHỈ mở cho câu đặt erased_at, nên ghim câu đặt erased_at là đủ); (2) chữ `erased_at` trong mã nguồn chỉ ở
// parties/repository.ts (ngoài migrations/ và scripts/audit-checks.mjs, không thuộc src/ và web/); (3) `anDanhStatements(` chỉ được GỌI trong thân route thực hiện phiếu của parties/index.ts.
// Phá thử: đăng ký thêm defineSql("parties", "thu_x", "UPDATE pty_person_document SET erased_at = ?1 WHERE id = ?2") → (1) đỏ; gọi anDanhStatements trong route khác → (3) đỏ.
// Task 5 (lát H-5): (3) ghim ĐÚNG MỘT lời gọi anDanhStatements( và nó nằm trong thân route thực hiện phiếu của parties/index.ts (không bọc qua hàm phụ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const WEB = fileURLToPath(new URL("../web/", import.meta.url));
const TEN_DUOC_PHEP = ["parties:an_danh_giay_to", "parties:an_danh_phieu_tu_khai"];
const ROUTE_THUC_HIEN = "POST /api/parties/phieu-xoa/:pid/thuc-hien";
const SO_LOI_GOI_DUOC = 1; // đúng một lời gọi, trong thân route thực hiện (Task 5 Step 8)

/** Câu đặt `erased_at` trên hai bảng có cột đó: một lệnh UPDATE vào bảng, trong phần sau SET có `erased_at =`. */
const DAT_ERASED_AT = /^\s*UPDATE\s+pty_(?:person_document|self_submission)\b[\s\S]*?\bSET\b[\s\S]*?\berased_at\s*=/i;
/** Câu CHÈN dòng mang cột erased_at vào hai bảng đó: cột nằm trong danh sách cột ngay sau tên bảng (chữ erased_at ở câu con SELECT không tính). */
const CHEN_ERASED_AT = /^\s*INSERT\b[\s\S]*?\bINTO\s+pty_(?:person_document|self_submission)\s*\([^)]*\berased_at\b/i;

function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return tepTs(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

test("bộ bắt tự kiểm: bắt câu đặt / chèn erased_at, bỏ qua câu thường (rào không rỗng)", () => {
  assert.ok(DAT_ERASED_AT.test("UPDATE pty_person_document SET erased_at = ?1 WHERE id = ?2"));
  assert.ok(DAT_ERASED_AT.test("UPDATE pty_self_submission SET birth_date = NULL,\n erased_at = ?3 WHERE id = ?1"));
  assert.ok(!DAT_ERASED_AT.test("UPDATE pty_person_document SET voided_at = ?1 WHERE id = ?2"));
  assert.ok(!DAT_ERASED_AT.test("UPDATE pty_contact_point SET value = 'x', erased_at = ?1 WHERE id = ?2"));
  assert.ok(CHEN_ERASED_AT.test("INSERT INTO pty_person_document (id, erased_at) VALUES (?1, ?2)"));
  assert.ok(!CHEN_ERASED_AT.test("INSERT INTO pty_person_document (id, document_number) VALUES (?1, ?2)"));
});

test("(1) câu SQL đăng ký đặt erased_at = ĐÚNG hai câu của lệnh ẩn danh hoá; không câu nào CHÈN dòng mang erased_at", async () => {
  await import("./modules/parties/repository.ts");
  const { registeredSql } = await import("./shared/sql-registry.ts");
  const dat = registeredSql().filter((e) => DAT_ERASED_AT.test(e.sql)).map((e) => `${e.module}:${e.name}`).sort();
  assert.deepEqual(dat, [...TEN_DUOC_PHEP].sort(), "chỉ lệnh ẩn danh hoá có tên được đặt erased_at (thêm câu thứ ba = sửa danh sách này có chủ đích, có chủ duyệt)");
  const chen = registeredSql().filter((e) => CHEN_ERASED_AT.test(e.sql)).map((e) => `${e.module}:${e.name}`);
  assert.deepEqual(chen, []);
});

test("(2) chữ erased_at trong mã nguồn chỉ ở parties/repository.ts (ngoài migrations/ và scripts/audit-checks.mjs)", () => {
  const co = [...tepTs(SRC), ...tepTs(WEB)].filter((p) => readFileSync(p, "utf8").includes("erased_at")).map((p) => (p.startsWith(SRC) ? p.slice(SRC.length) : `web/${p.slice(WEB.length)}`));
  assert.deepEqual(co, ["modules/parties/repository.ts"]);
});

test("(3) anDanhStatements chỉ được GỌI trong thân route thực hiện phiếu của parties/index.ts", () => {
  const dung = [...tepTs(SRC), ...tepTs(WEB)].filter((p) => /\banDanhStatements\b/.test(readFileSync(p, "utf8"))).map((p) => (p.startsWith(SRC) ? p.slice(SRC.length) : `web/${p.slice(WEB.length)}`)).sort();
  const hopLe = SO_LOI_GOI_DUOC > 0 ? ["modules/parties/index.ts", "modules/parties/repository.ts"] : ["modules/parties/repository.ts"];
  assert.deepEqual(dung, hopLe, "mọi tệp khác không nhắc tên hàm (không nhập, không bí danh)");
  const repo = readFileSync(join(SRC, "modules/parties/repository.ts"), "utf8");
  assert.equal(repo.match(/\banDanhStatements\b/g)?.length, 1, "trong repository.ts chỉ một lần — lúc định nghĩa");
  const index = readFileSync(join(SRC, "modules/parties/index.ts"), "utf8").replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "");
  const loi: string[] = [];
  let goiTrongRoute = 0;
  for (const k of index.split(/(?=\broute\(")/)) {
    const m = /^route\("([A-Z]+)", "([^"]+)"/.exec(k);
    const khoa = m ? `${m[1]} ${m[2]}` : "(ngoài route)";
    const goi = k.match(/\banDanhStatements\s*\(/g)?.length ?? 0;
    const nhac = k.match(/\banDanhStatements\b/g)?.length ?? 0;
    if (nhac !== goi) loi.push(`anDanhStatements được nhắc mà không gọi ở ${khoa} (gán / truyền đi là đường vòng)`);
    if (goi > 0 && khoa !== ROUTE_THUC_HIEN) loi.push(`anDanhStatements gọi ở ${khoa} (chỉ route ${ROUTE_THUC_HIEN})`);
    if (khoa === ROUTE_THUC_HIEN) goiTrongRoute += goi;
  }
  assert.deepEqual(loi, []);
  assert.equal(goiTrongRoute, SO_LOI_GOI_DUOC);
});
