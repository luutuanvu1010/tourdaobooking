// Bảng từ giao diện (ADR-0130): chữ đã loại ở `src/shared/bang-tu-giao-dien.ts` không được quay lại chữ người dùng nhìn thấy.
// Quét CHUỖI (không quét chú thích, tên biến) trong: `web/**/*.ts`, `src/shared/*.ts`, `src/modules/**/*.ts` (trừ tệp test), và chữ của `public/*.html`.
// Ngoại lệ có tên: `src/shared/changelog.ts` (mục cũ là hồ sơ có ngày, giữ nguyên chữ lúc phát hành), chính tệp bảng từ.
// Không phủ: migration SQL (câu báo của trigger — tệp đã áp remote không sửa được), kịch bản Chrome/e2e (chỉ là bài kiểm).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { NGHIA_HON_DAO, TU_DA_LOAI } from "./shared/bang-tu-giao-dien.ts";

const ROOT = new URL("..", import.meta.url).pathname;

/** Mọi chuỗi trong mã TS (nháy đơn, nháy kép, chuỗi mẫu — phần chữ, không gồm `${…}`), bỏ chú thích. Không cần trọn vẹn: chỉ để quét chữ. */
export function chuoiTrongMa(src: string): { dong: number; chu: string }[] {
  const ra: { dong: number; chu: string }[] = [];
  let i = 0;
  let dong = 1;
  const mau: number[] = []; // độ sâu ngoặc nhọn của từng `${` đang mở trong chuỗi mẫu
  let prevSig = ""; // ký tự có nghĩa gần nhất (đoán `/` là chia hay mở biểu thức chính quy)
  const docChuoi = (dong0: number, ket: string) => {
    let chu = "";
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") { chu += src[i + 1] ?? ""; i += 2; continue; }
      if (c === "\n") dong++;
      if (ket === "`" && c === "$" && src[i + 1] === "{") { i += 2; mau.push(0); ra.push({ dong: dong0, chu }); return; }
      i++;
      if (c === ket) { ra.push({ dong: dong0, chu }); return; }
      chu += c;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") { dong++; i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const j = src.indexOf("*/", i + 2); const k = j < 0 ? src.length : j + 2; dong += (src.slice(i, k).match(/\n/g) ?? []).length; i = k; continue; }
    if (c === "/" && (prevSig === "" || "(,=:[!&|?{};+-*%<>~^".includes(prevSig))) {
      // biểu thức chính quy: bỏ qua tới dấu `/` đóng (tính lớp ký tự)
      i++;
      let lop = false;
      while (i < src.length && src[i] !== "\n") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "[") lop = true; else if (src[i] === "]") lop = false; else if (src[i] === "/" && !lop) break;
        i++;
      }
      i++;
      prevSig = "a";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { i++; docChuoi(dong, c); prevSig = "a"; continue; }
    if (mau.length && c === "{") mau[mau.length - 1]++;
    if (mau.length && c === "}") {
      if (mau[mau.length - 1] === 0) { mau.pop(); i++; docChuoi(dong, "`"); prevSig = "a"; continue; }
      mau[mau.length - 1]--;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return ra;
}

/** Chữ của trang HTML: bỏ `<script>`, `<style>`, chú thích; giữ chữ và giá trị thuộc tính. */
function chuTrongHtml(src: string): { dong: number; chu: string }[] {
  const sach = src.replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, " "));
  return sach.split("\n").flatMap((d, k) => d.split(/<[^>]*?(?:"([^"]*)")?[^>]*>/).filter((x) => x && x.trim()).map((chu) => ({ dong: k + 1, chu })));
}

function tepTs(thuMuc: string): string[] {
  return readdirSync(join(ROOT, thuMuc), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".d.ts"))
    .map((e) => join(e.parentPath, e.name).slice(ROOT.length));
}

// Bảng nội bộ cho người làm mã, không trang nào hiện (lượt 2 rà soát ngôn ngữ, 18/10): `bang-su-kien-van-chuyen.ts` (chỉ bài kiểm của nó đọc), `lan-gui-no.ts`.
const NGOAI_LE = new Set(["src/shared/changelog.ts", "src/shared/bang-tu-giao-dien.ts", "src/shared/bang-su-kien-van-chuyen.ts", "src/shared/lan-gui-no.ts"]);
// Chuỗi có tên được giữ nguyên văn: câu chào mặc định của Trợ lý Mai PHẢI trùng bản gieo trong migration (đã áp, không sửa được — bài
// `migrations-pty-person-gender.test.ts`). Đổi câu chào đang dùng = Toàn quyền lưu lời dặn mới ở trang Trợ lý (dữ liệu, không phải mã).
// Lượt 2 (18/10): «cập nhật chặng đưa đón» là chữ nhật ký mà hàm đọc tin (`CAP_NHAT_CHANG`, tin-doi-don.ts) so nguyên văn — nhật ký chỉ-thêm, dòng cũ mang chữ này.
// (Hai nhãn luật chuyển khách từng ở đây đã đổi bằng migration 0111, chủ chọn 18/10.)
const CHUOI_GIU_NGUYEN = new Set([
  "Chào {ten}, {xung} là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi {xung} nhé!",
  "cập nhật chặng đưa đón",
]);
const TEP = [
  ...tepTs("web"),
  ...readdirSync(join(ROOT, "src/shared")).filter((t) => t.endsWith(".ts") && !t.endsWith(".test.ts")).map((t) => `src/shared/${t}`),
  ...tepTs("src/modules"),
  ...readdirSync(join(ROOT, "public")).filter((t) => t.endsWith(".html")).map((t) => `public/${t}`),
].filter((t) => !NGOAI_LE.has(t));

export function viPham(chu: string): { cam: RegExp; thay: string } | null {
  const bo = chu.replace(NGHIA_HON_DAO, "");
  return TU_DA_LOAI.find((t) => t.cam.test(t.cam.source.includes("Đđ]ảo") ? bo : chu)) ?? null;
}

test("bảng từ: bộ quét bỏ chú thích, bắt chuỗi thường, chuỗi mẫu, và chữ sau biểu thức chính quy", () => {
  const ma = [
    "// Ghi lần thu (chú thích dòng)",
    "/* Đảo (chú thích khối) */",
    "const re = /'/; const a = \"Ghi lần thu\";",
    "const b = `Đã ${x ? 'đảo' : `y ${z}`} xong`;",
    "const c = 'Tour 4 đảo';",
  ].join("\n");
  const chu = chuoiTrongMa(ma).map((s) => s.chu);
  assert.ok(chu.includes("Ghi lần thu"));
  assert.ok(chu.includes("đảo"));
  assert.ok(!chu.some((s) => s.includes("chú thích")));
  assert.ok(viPham("Ghi lần thu"));
  assert.ok(viPham("Đảo"));
  assert.equal(viPham("Tour 4 đảo ngày 05/10 của Công ty Tour Đảo"), null);
  assert.ok(viPham("Mở app từ biểu tượng"));
  assert.equal(viPham("Tải Google Authenticator từ App Store"), null);
  assert.equal(viPham("/api/app-config"), null);
});

test("bảng từ: chữ đã loại không xuất hiện ở giao diện, trợ giúp, câu báo máy chủ (ADR-0130)", () => {
  const loi: string[] = [];
  for (const tep of TEP) {
    const src = readFileSync(join(ROOT, tep), "utf8");
    const chuoi = tep.endsWith(".html") ? chuTrongHtml(src) : chuoiTrongMa(src);
    for (const { dong, chu } of chuoi) {
      if (CHUOI_GIU_NGUYEN.has(chu)) continue;
      const v = viPham(chu);
      if (v) loi.push(`${tep}:${dong} «${chu.trim().slice(0, 90)}» — chữ đã loại ${v.cam} → dùng «${v.thay}»`);
    }
  }
  assert.deepEqual(loi, [], `${loi.length} chỗ còn chữ đã loại (bảng: src/shared/bang-tu-giao-dien.ts):\n${loi.join("\n")}`);
});
