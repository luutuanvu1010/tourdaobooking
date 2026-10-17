// HÀNG RÀO "chạm quyền truy cập" (ADR-0125 đ5; lát H-4 Gói 2). (1) MỌI hành động nhóm staff được xếp vào ĐÚNG MỘT tầng (TAO / VINH_VIEN / CUA_SO_30 / theo chi tiết /
// KHONG_CHAM có lý do) — thêm hành động tài khoản mới mà quên xếp thì đỏ (giữ vế vĩnh viễn không hở khi lát ADR-0121 thêm sự kiện). (2) Hằng khớp TỪNG CHỮ với view của
// migration *_xac_minh_ho_so.sql. (3) Chữ đổi SĐT là MỘT hằng, nơi ghi (accounts) dùng chính hằng đó. (4) Câu SQL GHI cột hạn lớp hai (mfa_grace_until, mfa_enroll_until)
// = đúng tập ghim — câu mới (vd "mở lại 24 giờ" của ADR-0121) phải ghi sự kiện tầng VINH_VIEN cùng lô và được thêm vào đây có lý do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT_ACTIONS } from "../../shared/audit-actions.ts";
import { CHAM_TAI_KHOAN, CHI_TIET_DOI_SDT } from "./cham-tai-khoan.ts";

const nhomStaff = Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.group === "staff").map(([k]) => k).sort();
const xep: string[] = [
  ...CHAM_TAI_KHOAN.TAO, ...CHAM_TAI_KHOAN.VINH_VIEN, ...CHAM_TAI_KHOAN.CUA_SO_30,
  ...CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET.map((x) => x.action), ...Object.keys(CHAM_TAI_KHOAN.KHONG_CHAM),
];

test("(1) mọi hành động nhóm staff được xếp đúng một tầng; KHONG_CHAM có lý do", () => {
  assert.deepEqual([...xep].sort(), nhomStaff, "hành động nhóm staff chưa xếp tầng hoặc xếp trùng");
  assert.equal(new Set(xep).size, xep.length, "một hành động ở hai tầng");
  for (const [a, lyDo] of Object.entries(CHAM_TAI_KHOAN.KHONG_CHAM)) assert.ok(lyDo && lyDo.trim().length > 10, `${a}: thiếu lý do`);
  for (const a of ["pin_reset", "mfa_reset", "mfa_grace_reopened", "mfa_exception_set"]) assert.ok((CHAM_TAI_KHOAN.VINH_VIEN as readonly string[]).includes(a), `${a} phải VĨNH VIỄN (ADR-0125 đ5)`);
});

test("(2) hằng khớp từng chữ với view của migration", () => {
  const mig = new URL("../../../migrations/", import.meta.url);
  const f = readdirSync(mig).find((x) => x.endsWith("_xac_minh_ho_so.sql"))!;
  const view = readFileSync(new URL(f, mig), "utf8").split(/CREATE VIEW v_aud_cham_tai_khoan/)[1]!.split(";")[0]!;
  const inVinhVien = view.match(/WHEN action IN \(([^)]*)\) THEN 'VINH_VIEN'/)![1]!.match(/'([a-z_]+)'/g)!.map((s) => s.slice(1, -1));
  assert.deepEqual([...inVinhVien].sort(), [...CHAM_TAI_KHOAN.VINH_VIEN].sort());
  const inTatCa = view.match(/AND \(action IN \(([^)]*)\)/)![1]!.match(/'([a-z_]+)'/g)!.map((s) => s.slice(1, -1));
  assert.deepEqual([...inTatCa].sort(), [...CHAM_TAI_KHOAN.TAO, ...CHAM_TAI_KHOAN.VINH_VIEN, ...CHAM_TAI_KHOAN.CUA_SO_30].sort());
  for (const x of CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET) assert.ok(view.includes(`action = '${x.action}' AND instr(COALESCE(detail, ''), '${x.chua}') > 0`), x.action);
});

test("(3) chữ đổi SĐT là MỘT hằng; accounts ghi bằng hằng đó, không viết tay", () => {
  assert.equal(CHI_TIET_DOI_SDT, "đổi SĐT đăng nhập");
  assert.deepEqual(CHAM_TAI_KHOAN.CUA_SO_30_THEO_CHI_TIET, [{ action: "staff_updated", chua: CHI_TIET_DOI_SDT }]);
  const acc = readFileSync(new URL("../accounts/index.ts", import.meta.url), "utf8");
  assert.match(acc, /CHI_TIET_DOI_SDT/);
  assert.doesNotMatch(acc.replace(/\/\/.*$/gm, ""), /"đổi SĐT đăng nhập"/, "accounts phải dùng hằng, không viết tay chữ");
});

test("(4) câu SQL GHI cột hạn lớp hai = đúng tập ghim", () => {
  const SRC = fileURLToPath(new URL("../../", import.meta.url));
  const tep = (d: string): string[] => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
  const ghi: string[] = [];
  for (const p of tep(SRC)) {
    for (const m of readFileSync(p, "utf8").matchAll(/defineSql\(\s*"([a-z-]+)",\s*"([a-z_]+)",\s*[`"]([^`"]*)[`"]/g)) {
      if (/\b(UPDATE|INSERT)\b/i.test(m[3]!) && /mfa_grace_until|mfa_enroll_until/.test(m[3]!)) ghi.push(`${m[1]}/${m[2]}`);
    }
  }
  // Ghim 2026-10-17: tạo tài khoản (ân hạn lúc tạo), đặt ân hạn khi NULL (trở thành nội bộ / kích hoạt lại — không trao quyền đăng nhập thay ai),
  // cửa sổ bật lại 24 giờ (CHỈ trong lô mfa_reset — đã là tầng VINH_VIEN). Thêm câu mới ⇒ ghi sự kiện tầng VINH_VIEN cùng lô rồi mới thêm vào đây.
  assert.deepEqual(ghi.sort(), ["staff/insert", "staff/mfa_enroll_set", "staff/mfa_grace_if_null"].sort());
});
