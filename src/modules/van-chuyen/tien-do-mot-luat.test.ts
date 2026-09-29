// MỘT LUẬT CHO HAI BỘ ROUTE TIẾN ĐỘ (ADR-0049 D3; ruling R-P1; kế hoạch mục 1.7 "Cặp route tiến độ"; TC-41 — Task A15). Phân tích TĨNH src/modules/van-chuyen/
// index.ts trên bản che chuỗi + chú thích (khuôn src/orders-cong-bo.test.ts): với MỖI cặp route tài xế ↔ văn phòng bấm thay (21 ↔ 31 … 29 ↔ 39), thân CẢ HAI
// route gọi ĐÚNG CÙNG MỘT hàm xử lý xuất từ dieu-phoi-tien-do.ts (mọi kiểm — trạng thái, điểm đã tới, giờ xảy ra, cổng xuất bến, LC-16 — nằm trong hàm đó),
// và thân route không tự gọi `.batch(` hay `.prepare(` (không dựng lô riêng). Bài học Đợt E: chép logic sang route thứ hai là "hai luật".
// GIỚI HẠN (sổ hàng rào): canh QUÊN, không canh CỐ Ý — gọi qua bí danh, logic chèn TRƯỚC lời gọi hàm chung (không phải lô) không thấy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../../../scripts/source-mask-lib.mjs";

const INDEX = fileURLToPath(new URL("./index.ts", import.meta.url));
const TIEN_DO = fileURLToPath(new URL("./dieu-phoi-tien-do.ts", import.meta.url));
const DUOI = ["xuat-ben", "diem/:sid/da-toi", "phan-bo/:aid/don", "phan-bo/:aid/vang", "phan-bo/:aid/khach-huy", "phan-bo/:aid/tra", "ket-thuc", "ket-thuc-gian-doan", "thu-tu"];

/** Thân (đã che chuỗi + chú thích) của `route("<method>", "<path>", …)` — từ `=> {` tới dấu ngoặc đóng khớp; null = không có route. */
export function thanRoute(src: string, method: string, path: string): string | null {
  const masked = maskSource(src, { strings: true, comments: true });
  const i = src.indexOf(`route("${method}", "${path}",`);
  if (i < 0) return null;
  const j = masked.indexOf("=> {", i);
  let sau = 0;
  for (let k = j + 3; k < masked.length; k++) {
    if (masked[k] === "{") sau++;
    else if (masked[k] === "}" && --sau === 0) return masked.slice(j, k + 1);
  }
  return null;
}
/** Tên hàm xử lý tiến độ xuất từ dieu-phoi-tien-do.ts (`export async function lenhX` / `export const lenhX`). */
export function hamTienDo(src: string): string[] {
  return [...maskSource(src, { strings: true, comments: true }).matchAll(/export\s+(?:async\s+function|const)\s+(lenh\w+)/g)].map((m) => m[1]!).sort();
}
/** Hàm xử lý mà thân route gọi (mọi lời gọi `lenhX(` thuộc danh sách). */
const goiTrongThan = (than: string, ham: readonly string[]): string[] => ham.filter((h) => new RegExp(`\\b${h}\\s*\\(`).test(than));

export function viPham(src: string, ham: readonly string[]): string[] {
  const loi: string[] = [];
  for (const d of DUOI) {
    const tx = thanRoute(src, "POST", `/api/van-chuyen/cuoc-cua-toi/:id/${d}`);
    const vp = thanRoute(src, "POST", `/api/van-chuyen/chuyen/:id/${d}`);
    if (!tx || !vp) {
      loi.push(`${d}: thiếu một vế của cặp (tài xế ${tx ? "có" : "KHÔNG"}, văn phòng ${vp ? "có" : "KHÔNG"})`);
      continue;
    }
    const a = goiTrongThan(tx, ham);
    const b = goiTrongThan(vp, ham);
    if (a.length !== 1 || b.length !== 1 || a[0] !== b[0]) loi.push(`${d}: tài xế gọi [${a.join(", ")}], văn phòng gọi [${b.join(", ")}] — phải cùng MỘT hàm`);
    for (const [ten, than] of [["tài xế", tx], ["văn phòng", vp]] as const) {
      if (/\.(batch|prepare)\s*\(/.test(than)) loi.push(`${d} (${ten}): thân route tự dựng lô (.batch / .prepare)`);
      const iCan = than.search(/\bcan\s*\(/);
      const iGoi = a[0] ? than.search(new RegExp(`\\b${a[0]}\\s*\\(`)) : -1;
      if (iCan < 0 || (iGoi >= 0 && iCan > iGoi)) loi.push(`${d} (${ten}): can( phải đứng trước lời gọi hàm xử lý`);
    }
  }
  return loi;
}

test("bộ bắt TC-41: thiếu một vế, hai hàm khác nhau, tự dựng lô → đỏ; cặp gọi cùng hàm → xanh", () => {
  const route = (p: string, than: string) => `route("POST", "${p}", "x", async ({ env }) => {\n  if (!can(staff, "trip.progress")) return x;\n  ${than}\n}),\n`;
  const du = (tx: (d: string) => string, vp: (d: string) => string) => DUOI.map((d) => route(`/api/van-chuyen/cuoc-cua-toi/:id/${d}`, tx(d)) + route(`/api/van-chuyen/chuyen/:id/${d}`, vp(d))).join("");
  const ham = ["lenhA", "lenhB"];
  assert.deepEqual(viPham(du(() => "await lenhA(env.DB);", () => "await lenhA(env.DB);"), ham), []);
  assert.equal(viPham(du(() => "await lenhA(env.DB);", () => "await lenhB(env.DB);"), ham).length, DUOI.length, "hai hàm khác nhau");
  assert.ok(viPham(du(() => "await lenhA(env.DB);", () => "await env.DB.batch([]);"), ham).some((l) => /tự dựng lô/.test(l)));
  assert.ok(viPham(DUOI.map((d) => route(`/api/van-chuyen/chuyen/:id/${d}`, "await lenhA(env.DB);")).join(""), ham).every((l) => /thiếu một vế/.test(l)));
  assert.ok(viPham(du(() => "await lenhA(env.DB);", () => "await lenhA(env.DB); // lenhB( trong chú thích không tính"), ham).length === 0, "chú thích không tính");
});

test("TC-41 (R-P1): đủ 9 cặp route tiến độ; mỗi cặp gọi ĐÚNG CÙNG MỘT hàm xử lý của dieu-phoi-tien-do.ts; thân route không tự dựng lô; can( đứng trước", () => {
  const ham = hamTienDo(readFileSync(TIEN_DO, "utf8"));
  assert.deepEqual(ham, ["lenhDaDon", "lenhDaToi", "lenhDaTra", "lenhDoiThuTu", "lenhKetThuc", "lenhKetThucGianDoan", "lenhKhachHuy", "lenhVang", "lenhXuatBen"], "chống bài rỗng: đủ 9 hàm");
  const src = readFileSync(INDEX, "utf8");
  assert.deepEqual(viPham(src, ham), []);
  // Mỗi hàm xử lý dùng cho ĐÚNG một cặp (không hai lệnh chung một hàm mà khác tên route).
  const dung = DUOI.map((d) => goiTrongThan(thanRoute(src, "POST", `/api/van-chuyen/chuyen/:id/${d}`)!, ham)[0]);
  assert.equal(new Set(dung).size, DUOI.length);
});
