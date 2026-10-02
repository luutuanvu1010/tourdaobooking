// HÀNG RÀO "MỘT NGUỒN TÍNH" chi phí xe thuê (ADR-0057 C6; Hiến chương 5.4 — kế hoạch Đợt 4 Task 11 bước 2; khuôn src/buildlines-guard.test.ts). Quét MÃ CHẠY
// THẬT (`src/**`, `web/**`, bỏ `*.test.ts` và `migrations/`), che chú thích:
//   (1) không chuỗi nào (SQL) vừa nhắc `vc_trip_cost_line` vừa có `sum(` / `total(` — cộng tiền chi phí ở SQL là nguồn tính thứ hai;
//   (2) `tongChiPhiChuyen`, `tongBangKe`, `tongDieuChinh` chỉ ĐỊNH NGHĨA ở src/modules/van-chuyen/tien-xe.ts;
//   (3) ở tệp dựng DTO / xử lý route tiền xe, mọi trường `tong`, `tongCong`, `tongNhom`, `tongDieuChinh` (khai `x:` hoặc gán `.x =`) có vế phải BẮT ĐẦU bằng
//       `tongChiPhiChuyen(` / `tongBangKe(` / `tongDieuChinh(`;
//   (4) `web/**` không cộng tiền chi phí (`amount +`, `soTien +`, `.tong +`, `tongNhom +`).
// NGOẠI LỆ CÓ TÊN: kiểm định kỳ scripts/audit-checks.mjs (R-VC-COST-*) có `sum(` trên vc_trip_cost_line — lưới thứ hai đọc CSDL, ngoài src/** (không bị quét).
// GIỚI HẠN: canh QUÊN, không canh cố ý (vd cộng bằng vòng lặp `for` ở tệp khác không tên trường "tong…"); người kiểm đọc mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const NGUON = "src/modules/van-chuyen/tien-xe.ts";
const TEP_DTO = ["src/modules/van-chuyen/tien-xe-dto.ts", "src/modules/van-chuyen/tien-xe-lenh.ts", "src/modules/van-chuyen/tien-xe-chi-phi.ts"];
const HAM_TONG = ["tongChiPhiChuyen", "tongBangKe", "tongDieuChinh"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const TEP = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))].map((abs) => ({ rel: relative(ROOT, abs), src: readFileSync(abs, "utf8") }));

/** Vi phạm (1)–(4) trên danh sách tệp (thuần — bài chính chạy trên mã thật, bài bộ bắt chạy trên mẫu). */
export function viPham(tep: readonly { rel: string; src: string }[]): string[] {
  const loi: string[] = [];
  for (const { rel, src } of tep) {
    const giuChuoi = maskSource(src, { strings: false }) as string; // che chú thích, GIỮ chuỗi
    const maChay = maskSource(src) as string; // che cả chuỗi
    // (1)
    for (const m of giuChuoi.matchAll(/`[^`]*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g)) {
      if (/vc_trip_cost_line/.test(m[0]) && /\b(sum|total)\s*\(/i.test(m[0])) loi.push(`${rel}: chuỗi SQL cộng tiền chi phí (${m[0].slice(0, 60).replace(/\s+/g, " ")}…)`);
    }
    // (2)
    for (const h of HAM_TONG) {
      if (rel !== NGUON && new RegExp(`(function\\s+${h}\\b|(const|let|var)\\s+${h}\\s*=)`).test(maChay)) loi.push(`${rel}: định nghĩa lại ${h} (chỉ ở ${NGUON})`);
    }
    // (3)
    if (TEP_DTO.includes(rel)) {
      for (const m of maChay.matchAll(/(?:\b|\.)(tong|tongCong|tongNhom|tongDieuChinh)\s*(:|=(?!=))\s*([^,;\n}]*)/g)) {
        const veTrai = maChay.slice(Math.max(0, m.index! - 1), m.index!);
        if (m[2] === ":" && /[?(]/.test(veTrai)) continue; // `?:` / tham số kiểu — không phải khai trường
        const vePhai = m[3]!.trim();
        if (/^(number|readonly|\{|\[)/.test(vePhai)) continue; // khai KIỂU (interface / tham số), không phải giá trị
        if (!HAM_TONG.some((h) => vePhai.startsWith(`${h}(`))) loi.push(`${rel}: trường ${m[1]} lấy giá trị "${vePhai.slice(0, 40)}" không qua ${HAM_TONG.join(" / ")}`);
      }
    }
    // (4)
    if (rel.startsWith("web/") && /\b(amount|soTien|tongNhom)\s*\+(?!\+)|\.tong\s*\+(?!\+)/.test(maChay)) loi.push(`${rel}: web cộng tiền chi phí`);
  }
  return loi;
}

test("một nguồn tính chi phí xe thuê: không SQL cộng tiền chi phí; hàm tổng chỉ ở tien-xe.ts; trường tổng ở DTO qua hàm tổng; web không cộng", () => {
  assert.ok(TEP.some((t) => t.rel === NGUON) && TEP_DTO.every((r) => TEP.some((t) => t.rel === r)), "chống bài rỗng: có đủ tệp nguồn + tệp DTO");
  const dto = TEP.find((t) => t.rel === "src/modules/van-chuyen/tien-xe-dto.ts")!;
  assert.ok((maskSource(dto.src) as string).match(/\btong\s*:/g)!.length >= 2, "chống bài rỗng: tệp DTO có trường tong");
  assert.deepEqual(viPham(TEP), []);
});

test("bộ bắt: SQL `sum(amount) FROM vc_trip_cost_line`, định nghĩa lại tongChiPhiChuyen, `tong: a + b` ở DTO, web cộng soTien → đỏ; mẫu đúng → xanh", () => {
  const dung = { rel: "src/modules/van-chuyen/tien-xe-dto.ts", src: "export const f = (d: X) => ({ tong: tongChiPhiChuyen(d), tongCong: tongBangKe(d) });" };
  assert.deepEqual(viPham([dung]), []);
  assert.equal(viPham([{ rel: "src/modules/van-chuyen/tien-xe-repo.ts", src: "const Q = defineSql('van-chuyen', 'x', `SELECT sum(amount) FROM vc_trip_cost_line WHERE trip_id = ?1`);" }]).length, 1);
  assert.equal(viPham([{ rel: "src/shared/x.ts", src: "export function tongChiPhiChuyen(d: number[]) { return 0; }" }]).length, 1);
  assert.equal(viPham([{ ...dung, src: "export const f = (a: number, b: number) => ({ tong: a + b });" }]).length, 1);
  assert.equal(viPham([{ rel: "web/x.ts", src: "const t = a.soTien + b.soTien;" }]).length, 1);
  assert.deepEqual(viPham([{ rel: "web/x.ts", src: "// a.soTien + b.soTien\nconst s = `soTien + 1`;" }]), [], "chú thích / chuỗi không tính (4)");
});
