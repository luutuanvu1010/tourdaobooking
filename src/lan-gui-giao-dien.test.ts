// HÀNG RÀO H3 (ADR-0094 đ5) — mọi lệnh GHI của giao diện đi qua `api()` (web/api.ts), nơi gắn vé chống ghi trùng. Một `fetch(` có phương thức ghi viết
// thẳng ở màn nào đó sẽ đi vòng qua lớp vé (giai đoạn 1: lặng lẽ không được bảo vệ; bản siết: 400). Bài tĩnh: mọi lời gọi `fetch(` trong web/ (kể cả web/sw/)
// mà đối số có phương thức ghi (chữ "POST"/"PUT"/"PATCH"/"DELETE" hoặc biến `method`) phải nằm trong danh sách đã biết.
// Khuôn: src/giao-dien-hoi-bang-quyen.test.ts. Giới hạn: canh QUÊN — `fetch` qua biến bí danh, `XMLHttpRequest`, `navigator.sendBeacon` không bị bắt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
/** `tệp | đối số đầu của fetch` — hai route CÔNG KHAI (không vé, máy chủ không áp lớp) + chính `api()`. */
const DA_BIET = new Set([
  'web/api.ts | "/api/auth/session-ended"', // công khai: hỏi lý do phiên kết thúc
  "web/api.ts | path", // chính api() — gắn vé
  'web/maintenance-screen.ts | "/api/auth/logout"', // công khai: đăng xuất từ màn bảo trì
]);

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });

function fetchGhi(): string[] {
  const out: string[] = [];
  for (const f of walk(join(ROOT, "web"))) {
    const rel = relative(ROOT, f).split("\\").join("/");
    const goc = readFileSync(f, "utf8");
    const che = maskSource(goc, { strings: false }); // che chú thích, GIỮ chuỗi để đọc phương thức
    for (const m of che.matchAll(/\bfetch\(/g)) {
      const dauDoiSo = m.index! + m[0].length;
      let i = dauDoiSo;
      for (let sau = 1; i < che.length && sau > 0; i++) {
        if (che[i] === "(") sau++;
        else if (che[i] === ")") sau--;
      }
      const doiSo = che.slice(dauDoiSo, i - 1);
      const ghi = /method\s*:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/.test(doiSo) || /\bmethod\s*[,}]/.test(doiSo) || /\bmethod\s*:\s*[a-zA-Z_]/.test(doiSo);
      if (!ghi) continue;
      const dau = doiSo.split(",")[0]!.trim();
      out.push(`${rel} | ${dau}`);
    }
  }
  return out;
}

test("ADR-0094 đ10: Vận chuyển giữ requestId theo CÙNG luật đóng/giữ vé (nenDongVe) — không bỏ requestId sau 5xx", () => {
  const t = maskSource(readFileSync(join(ROOT, "web/dieu-phoi-ui.ts"), "utf8"), { strings: false });
  assert.match(t, /dangCho = e instanceof ApiError && nenDongVe\(\{ status: e\.status, code: e\.code \}\) \? null : lenh;/);
  assert.doesNotMatch(t, /dangCho = e instanceof ApiError \? null : lenh;/);
});

test("web/api.ts gửi vé (Idempotency-Key) và đóng/giữ vé qua mô-đun thuần — không tự viết luật riêng", () => {
  const t = maskSource(readFileSync(join(ROOT, "web/api.ts"), "utf8"), { strings: false });
  assert.match(t, /from "\.\.\/src\/shared\/lan-gui-ve"/);
  assert.match(t, /headers\[HEADER_VE\] = ve\.ve;/);
  assert.match(t, /vongDoiVe\.ketThuc\(ve, \{ status: res\.status, code: data\?\.error\?\.code \}\);/);
  assert.match(t, /vongDoiVe\.ketThuc\(ve, \{ matMang: true \}\);/);
  assert.match(t, /safeNext\(ketQua\)/, "T19: địa chỉ kết quả qua safeNext trước location.replace");
});

test("H3: mọi fetch có phương thức ghi trong web/ nằm trong danh sách đã biết (lệnh ghi đi qua api() để mang vé)", () => {
  const thay = fetchGhi();
  assert.deepEqual(thay.filter((x) => !DA_BIET.has(x)), [], "fetch ghi viết thẳng — dùng api() (web/api.ts) để có vé chống ghi trùng");
  assert.deepEqual([...DA_BIET].filter((x) => !thay.includes(x)), [], "mục đã biết không còn — xoá khỏi danh sách");
});
