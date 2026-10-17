// HÀNG RÀO 5.23 (ADR-0124 đ1, Hệ quả; lát H-3 Gói 2): giá trị TỰ KHAI chưa xác minh không bao giờ lên nhãn, đơn, chứng từ, Danh bạ. Chỉ bốn route /api/parties/cua-toi* đọc
// / ghi bảng pty_self_submission. Ba lưới: (1) chữ "pty_self_submission" chỉ ở src/modules/parties/repository.ts (ngoài tệp test); không view nào đọc bảng; (2) câu SQL đăng ký
// chạm bảng = ĐÚNG tập ghim; (3) năm hàm repository chạm bảng chỉ được GỌI trong thân route /api/parties/cua-toi* của parties/index.ts — mọi tệp parties khác không nhắc,
// không bí danh, không nhập cả gói (vòng sửa 1, M-1).
// ADR-0125 đ1 (lát H-4): năm route /api/parties/xac-minh… được đọc phiếu ĐANG CHỜ để xác minh — liệt kê từng route ở bài (3) (mở ở việc 3, 4 khi route có thật).
// Phá thử: gọi listPhieuCuaHoSo trong respondParty → (3) đỏ; thêm view chọn từ pty_self_submission vào migration → (1) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const BANG = "pty_self_submission";
const CAU_GHIM = [
  "find_self_submission_of_party", "insert_self_submission", "list_self_submissions_of_party", "withdraw_pending_self_submissions_of_party", "withdraw_self_submission",
  // ADR-0125 (lát H-4): xác minh — đọc phiếu ĐANG CHỜ (không số đủ, trừ find_pending_self_submission_number) + câu quyết có lính gác + năm câu phụ thuộc có điều kiện thắng
  "accept_self_submission_address", "accept_self_submission_birth_date", "accept_self_submission_document", "accept_self_submission_touch_party", "accept_self_submission_verification",
  "decide_self_submission", "find_pending_self_submission_number", "find_self_submission_for_verify", "list_decided_self_submissions", "list_pending_self_submissions",
].sort();
const HAM = ["ghiPhieuStatement", "listPhieuCuaHoSo", "timPhieuCuaHoSo", "rutPhieuStatement", "rutMoiPhieuChoStatement"];
// ADR-0125 đ1 (lát H-4): các route /api/parties/xac-minh… được đọc phiếu ĐANG CHỜ để xác minh — chỉ trong thân route có tiền tố này. Route có thật ở việc 3, 4 của lát
// (hôm nay CHƯA route nào gọi nên chưa đòi "phải được gọi"); tới lúc đó bài (3) liệt kê từng route.
const HAM_XAC_MINH = [
  "listPhieuCho", "listPhieuDaXuLy", "timPhieuChoXet", "soDuCuaPhieuCho", "quyetPhieuStatement",
  "ghiNgaySinhTuPhieuStatement", "ghiDiaChiTuPhieuStatement", "ghiGiayToTuPhieuStatement", "lamMoiHoSoTuPhieuStatement", "ghiXacMinhTuPhieuStatement",
];
const TIEN_TO_XAC_MINH = "/api/parties/xac-minh";

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

// Vòng sửa 1 (M-1): lưới (3) quét MỌI tệp .ts của modules/parties (trừ repository.ts và tệp test), và chặn đường vòng: bí danh khi nhập (`h as x`, `{ h: x }`),
// nhập cả gói repository (`import * as`), dùng tên hàm mà không gọi (gán sang biến khác). Trong repository.ts mỗi hàm chỉ xuất hiện đúng một lần (lúc định nghĩa).
test("(3) hàm chạm bảng phiếu chỉ được GỌI trong thân route /api/parties/cua-toi* của parties/index.ts — mọi tệp parties khác không nhắc; không bí danh", () => {
  const THU_MUC = join(SRC, "modules/parties");
  const loi: string[] = [];
  let coIndex = false;
  for (const f of tepTs(THU_MUC).filter((p) => !p.endsWith("/repository.ts"))) {
    const ten = f.slice(SRC.length);
    const goc = readFileSync(f, "utf8");
    if (/import\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\s+"\.\/repository(\.ts)?"/.test(goc)) loi.push(`nhập cả gói repository ở ${ten}`);
    for (const h of [...HAM, ...HAM_XAC_MINH]) if (new RegExp(`\\b${h}\\s+as\\b|\\b${h}\\s*:\\s*[A-Za-z_$]`).test(goc)) loi.push(`bí danh ${h} ở ${ten}`);
    const src = goc.replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "");
    if (!f.endsWith("/parties/index.ts")) {
      for (const h of [...HAM, ...HAM_XAC_MINH]) if (new RegExp(`\\b${h}\\b`).test(src)) loi.push(`${h} ở ${ten} (ngoài index.ts)`);
      continue;
    }
    coIndex = true;
    const khuc = src.split(/(?=\broute\(")/);
    for (const k of khuc) {
      const m = /^route\("[A-Z]+", "([^"]+)"/.exec(k);
      const duong = m?.[1] ?? "(ngoài route)";
      for (const h of HAM_XAC_MINH) {
        if (new RegExp(`\\b${h}\\b`).test(k) && !duong.startsWith(TIEN_TO_XAC_MINH)) loi.push(`${h} ở ${duong} (chỉ route ${TIEN_TO_XAC_MINH}…)`);
        if (new RegExp(`\\b${h}\\b(?!\\s*\\()`).test(k)) loi.push(`${h} được nhắc mà không gọi ở ${duong} (gán / truyền đi là đường vòng)`);
      }
      for (const h of HAM) {
        if (new RegExp(`\\b${h}\\b`).test(k) && !duong.startsWith("/api/parties/cua-toi")) loi.push(`${h} ở ${duong}`);
        if (new RegExp(`\\b${h}\\b(?!\\s*\\()`).test(k)) loi.push(`${h} được nhắc mà không gọi ở ${duong} (gán / truyền đi là đường vòng)`);
      }
    }
    for (const h of HAM) assert.ok(khuc.some((k) => new RegExp(`\\b${h}\\s*\\(`).test(k)), `chống bài rỗng: ${h} phải được gọi`);
  }
  assert.ok(coIndex, "chống bài rỗng: phải quét được parties/index.ts");
  const repo = readFileSync(join(THU_MUC, "repository.ts"), "utf8");
  for (const h of [...HAM, ...HAM_XAC_MINH]) {
    const n = repo.match(new RegExp(`\\b${h}\\b`, "g"))?.length ?? 0;
    if (n !== 1) loi.push(`repository.ts nhắc ${h} ${n} lần (chỉ được đúng một — lúc định nghĩa)`);
  }
  assert.deepEqual(loi, []);
});
