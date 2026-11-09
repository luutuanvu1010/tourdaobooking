// Máy canh quyền camera (ADR-0175 Đ3, đặc tả §2.12): chỉ trang /quet-ve được mở camera; mọi nơi khác vẫn `camera=()`, micro và định vị luôn tắt.
// Cloudflare cộng dồn đầu cùng tên của mọi khối khớp đường dẫn, nên một khối khác (vd `/orders`) chỉ cần đặt `Permissions-Policy` lạ, hoặc `! Permissions-Policy` rồi đặt lại, là mở được camera ở trang đó.
// Vì vậy luật là: ngoài `/quet-ve`, KHÔNG khối nào được gỡ chính sách (`!`) và mọi khối có `Permissions-Policy` phải chứa đủ `camera=()`, `microphone=()`, `geolocation=()`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

interface Khoi { duong: string; dong: string[] }
const phanTich = (goc: string): Khoi[] => {
  const khoi: Khoi[] = [];
  for (const dong of goc.split("\n")) {
    if (dong.trim() === "" || dong.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(dong)) khoi.push({ duong: dong.trim(), dong: [] });
    else khoi[khoi.length - 1]?.dong.push(dong.trim());
  }
  return khoi;
};
const chinhSach = (k: Khoi): string[] => k.dong.filter((d) => /^Permissions-Policy:/i.test(d)).map((d) => d.slice(d.indexOf(":") + 1).trim());
const goDong = (k: Khoi): string[] => k.dong.filter((d) => /^!\s*Permissions-Policy\b/i.test(d));
const CAM = "camera=(self), microphone=(), geolocation=()";

/** Danh sách vi phạm của một tệp `_headers`; rỗng = đạt. */
export function kiemHeaders(goc: string): string[] {
  const loi: string[] = [];
  const khoi = phanTich(goc);
  const goc_ = khoi.find((k) => k.duong === "/*");
  if (!goc_ || chinhSach(goc_).join("|") !== "camera=(), microphone=(), geolocation=()") loi.push("/* phải đặt đúng `camera=(), microphone=(), geolocation=()`");
  const mo = khoi.filter((k) => k.duong === "/quet-ve");
  if (mo.length !== 1) loi.push(`phải có đúng một khối /quet-ve, thấy ${mo.length}`);
  for (const k of khoi) {
    if (k.duong === "/quet-ve") {
      if (chinhSach(k).join("|") !== CAM) loi.push(`/quet-ve phải đặt đúng \`${CAM}\``);
      const g = k.dong.findIndex((d) => /^!\s*Permissions-Policy\b/i.test(d));
      const d = k.dong.findIndex((x) => /^Permissions-Policy:/i.test(x));
      if (!(g >= 0 && d > g)) loi.push("/quet-ve phải có `! Permissions-Policy` rồi mới đặt giá trị");
      continue;
    }
    if (goDong(k).length) loi.push(`${k.duong}: cấm \`! Permissions-Policy\` ngoài /quet-ve`);
    for (const c of chinhSach(k)) for (const can of ["camera=()", "microphone=()", "geolocation=()"]) if (!c.includes(can)) loi.push(`${k.duong}: Permissions-Policy thiếu \`${can}\` (${c})`);
    if (k.duong !== "/*" && chinhSach(k).length > 1) loi.push(`${k.duong}: nhiều hơn một Permissions-Policy`);
  }
  return loi;
}

const goc = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");

test("tệp _headers thật đạt: /* tắt camera, đúng một khối /quet-ve mở camera, không khối nào khác đụng Permissions-Policy", () => {
  assert.deepEqual(kiemHeaders(goc), []);
  const mo = phanTich(goc).filter((k) => chinhSach(k).some((c) => /camera=\((?!\))/.test(c)));
  assert.deepEqual(mo.map((k) => k.duong), ["/quet-ve"]);
});

test("thử-phá: thêm khối /orders mở camera (camera=*) ⇒ đỏ", () => {
  assert.notDeepEqual(kiemHeaders(`${goc}\n/orders\n  Permissions-Policy: camera=*, microphone=(), geolocation=()\n`), []);
  assert.notDeepEqual(kiemHeaders(`${goc}\n/orders\n  Permissions-Policy: camera=(self), microphone=(), geolocation=()\n`), []);
});

test("thử-phá: khối /orders chỉ có `! Permissions-Policy` (gỡ chính sách của /*) ⇒ đỏ", () => {
  assert.notDeepEqual(kiemHeaders(`${goc}\n/orders\n  ! Permissions-Policy\n`), []);
});

test("thử-phá: khối khác bỏ định vị hoặc micro ⇒ đỏ; /quet-ve đổi giá trị hoặc bỏ dấu `!` ⇒ đỏ", () => {
  assert.notDeepEqual(kiemHeaders(`${goc}\n/orders\n  Permissions-Policy: camera=(), microphone=()\n`), []);
  assert.notDeepEqual(kiemHeaders(goc.replace("geolocation=()\n", "geolocation=(self)\n")), []);
  assert.notDeepEqual(kiemHeaders(goc.replace("  ! Permissions-Policy\n", "")), []);
  assert.notDeepEqual(kiemHeaders(goc.replace("camera=(self), microphone=()", "camera=(self), microphone=(self)")), []);
});
