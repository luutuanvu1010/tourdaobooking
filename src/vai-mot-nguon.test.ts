// Bài canh «một nguồn» của vai đối tác (ADR-0212 Đ1 mục 5, Đ2): danh sách loại đăng ký được là DỮ LIỆU `pty_role_type`. Không tệp mã nguồn nào ngoài `src/shared/roles.ts`
// được tự viết một mảng chuỗi chứa từ hai mã vai đối tác trở lên — trừ các dòng trong DANH_SACH_CHO_PHEP bên dưới, mỗi dòng có lý do. Trang đăng ký phía giao diện không import `roles`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROLE_CODES, ROLES } from "./shared/roles.ts";

const GOC = join(import.meta.dirname, "..");
const MA_DOI_TAC = ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL");

/**
 * Danh sách cho phép: tệp (tính từ gốc kho) → lý do. Người kiểm độc lập đọc từng dòng. Một dòng ở đây KHÔNG phải danh sách «vai nào đăng ký được» — đó chỉ là chỗ đọc `pty_role_type`.
 */
const DANH_SACH_CHO_PHEP: Record<string, string> = {
  "src/shared/roles.ts": "Nguồn của BỘ QUYỀN MẶC ĐỊNH theo mã vai (ADR-0018 điều 2) và danh sách mã tĩnh ROLE_CODES; không phải danh sách loại đăng ký được.",
};

function* duyetTep(thuMuc: string): Generator<string> {
  for (const ten of readdirSync(thuMuc)) {
    const duong = join(thuMuc, ten);
    if (statSync(duong).isDirectory()) { yield* duyetTep(duong); continue; }
    if (/\.(ts|mjs)$/.test(ten) && !/\.test\.(ts|mjs)$/.test(ten)) yield duong;
  }
}

/** Mọi nhóm `[ … ]` không lồng trong tệp mà có từ hai mã vai đối tác trở lên viết thành chuỗi. */
export function mangVaiDoiTac(noiDung: string): string[][] {
  const kq: string[][] = [];
  for (const m of noiDung.matchAll(/\[[^\[\]]*\]/g)) {
    const thay = new Set<string>();
    for (const c of m[0].matchAll(/["'`]([A-Z_]+)["'`]/g)) if ((MA_DOI_TAC as readonly string[]).includes(c[1]!)) thay.add(c[1]!);
    if (thay.size >= 2) kq.push([...thay]);
  }
  return kq;
}

test("bộ phát hiện: bắt mảng viết tay, bỏ qua một mã đơn lẻ và chuỗi không nằm trong mảng", () => {
  assert.equal(mangVaiDoiTac(`const X = ["GUIDE_FREELANCE","TAXI_DRIVER"];`).length, 1);
  assert.equal(mangVaiDoiTac(`new Set(['TAXI_DRIVER',\n  'COLLABORATOR'])`).length, 1, "mảng nằm trong Set vẫn là mảng");
  assert.equal(mangVaiDoiTac(`new Set(["TAXI_DRIVER", "COLLABORATOR"].map(f))`).length, 1);
  assert.equal(mangVaiDoiTac(`const X = ["TAXI_DRIVER", "DIRECTOR"];`).length, 0);
  assert.equal(mangVaiDoiTac(`x === "TAXI_DRIVER" || y === "COLLABORATOR"`).length, 0);
});

test("không tệp nào ngoài roles.ts khai một mảng mã vai đối tác viết tay (trừ danh sách cho phép có lý do)", () => {
  const vi: string[] = [];
  for (const thuMuc of ["src", "web"]) {
    for (const tep of duyetTep(join(GOC, thuMuc))) {
      const ten = relative(GOC, tep).replaceAll("\\", "/");
      if (DANH_SACH_CHO_PHEP[ten]) continue;
      const mang = mangVaiDoiTac(readFileSync(tep, "utf8"));
      if (mang.length) vi.push(`${ten}: ${mang.map((m) => `[${m.join(", ")}]`).join(" ")}`);
    }
  }
  assert.deepEqual(vi, [], `Danh sách vai đối tác phải đọc từ pty_role_type (parties.vaiDangKyDuoc), không viết tay:\n${vi.join("\n")}`);
});

test("danh sách cho phép không có dòng thừa: tệp có thật và đúng là có mảng mã vai", () => {
  for (const [ten, lyDo] of Object.entries(DANH_SACH_CHO_PHEP)) {
    assert.ok(lyDo.length > 20, `${ten}: phải có lý do`);
    assert.ok(statSync(join(GOC, ten)).isFile(), `${ten}: tệp phải có thật`);
    assert.ok(mangVaiDoiTac(readFileSync(join(GOC, ten), "utf8")).length > 0, `${ten}: không còn mảng nào, bỏ khỏi danh sách`);
  }
});

test("trang đăng ký phía giao diện không import roles (tên vai do máy chủ trả)", () => {
  for (const tep of ["web/dang-ky.ts", "web/dang-ky-chinh-sach.ts"]) {
    const nd = readFileSync(join(GOC, tep), "utf8");
    assert.equal(/from\s+["'][^"']*\/roles(\.ts)?["']/.test(nd), false, `${tep} không được import roles`);
  }
});

test("hàng chờ duyệt: tên vai hiện từ máy chủ, không tra ROLES trong mã (ô chọn vai lúc duyệt thuộc Task 2)", () => {
  const nd = readFileSync(join(GOC, "web/dang-ky-hang-cho.ts"), "utf8");
  assert.equal(/const tenVai\b[^\n]*ROLES/.test(nd), false, "tenVai không được tra ROLES");
  assert.equal(/isRoleCode\(/.test(nd), false, "không đoán tên vai bằng isRoleCode");
});
