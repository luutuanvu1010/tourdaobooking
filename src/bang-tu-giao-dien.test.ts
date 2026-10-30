// Bảng từ giao diện (ADR-0130): chữ đã loại ở `src/shared/bang-tu-giao-dien.ts` không được quay lại chữ người dùng nhìn thấy.
// Quét CHUỖI (không quét chú thích, tên biến) trong: `web/**/*.ts`, `src/shared/*.ts`, `src/modules/**/*.ts` (trừ tệp test), và chữ của `public/*.html`.
// Ngoại lệ có tên: `src/shared/changelog.ts` (mục cũ là hồ sơ có ngày, giữ nguyên chữ lúc phát hành), chính tệp bảng từ.
// Không phủ: migration SQL (câu báo của trigger — tệp đã áp remote không sửa được), kịch bản Chrome/e2e (chỉ là bài kiểm).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CAM_THEO_TEP, CHO_PHEP_THEO_TEP, NGHIA_HON_DAO, TU_DA_LOAI } from "./shared/bang-tu-giao-dien.ts";
import { CAU_O_TRONG, CAU_THU_TU_AP_MUC } from "./shared/hoa-hong-hien-thi.ts";

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
  // Đặc tả hoa-hong-cap-dai-ly §5.3 ghim nguyên văn câu thứ tự áp mức; «mức riêng của loại đối tác» là tên bước thứ ba của thứ tự, không phải chữ «dòng riêng» cũ.
  CAU_THU_TU_AP_MUC,
  // Đặc tả hoa-hong-cap-dai-ly §5.4 ghim nguyên văn câu dưới ma trận; «dòng riêng» ở đây là «dòng của cấp riêng cho ô này», không phải nghĩa «mức riêng của loại» mà luật cấm.
  CAU_O_TRONG,
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

/** Luật cấm theo tệp (lượt 6, đặc tả §6.2): mảnh chuỗi khớp `cam` của bộ tệp mà không nằm trong danh sách cho phép. Hàm thuần: nhận đường dẫn và nội dung. */
export function viPhamTheoTep(duongDan: string, noiDung: string): { dong: number; chu: string }[] {
  const ra: { dong: number; chu: string }[] = [];
  for (const luat of CAM_THEO_TEP) {
    if (!luat.tep.some((m) => m.test(duongDan))) continue;
    for (const { dong, chu } of chuoiTrongMa(noiDung)) {
      if (!luat.cam.test(chu)) continue;
      if (CHO_PHEP_THEO_TEP.some((c) => c.tep === duongDan && c.manh === chu)) continue;
      ra.push({ dong, chu });
    }
  }
  return ra;
}

const TEP_HOA_HONG = [...TEP, ...["src/modules/pricing/rules.ts"]].filter((t, i, a) => a.indexOf(t) === i)
  .filter((t) => CAM_THEO_TEP.some((l) => l.tep.some((m) => m.test(t))));

test("lượt 6 ca âm", () => {
  for (const c of ["chính sách riêng tư", "Chính sách điều phối", "đặt chính sách đăng nhập"]) {
    assert.deepEqual(viPhamTheoTep("web/hoa-hong-gia.ts", `const x = "${c}";`), [], c);
  }
  // chọn 6a/6b theo nguồn, không theo vị trí cuối mảng: thêm luật về sau không làm lệch ca âm
  const mucChinhSach = TU_DA_LOAI.filter((m) => /hính sách (?:hoa hồng|riêng)/u.test(m.cam.source) && m.nguon.includes("quyết định 3, 7"));
  assert.equal(mucChinhSach.length, 2);
  for (const c of [
    "Theo chính sách của Tour Đảo, tiền cọc không được hoàn lại khi khách huỷ.", "Chính sách vừa được người khác đổi — tải lại.",
    "Vừa có người đổi chính sách, tải lại rồi thử lại.", "Vừa có phiên bản chính sách khác được đăng. Tải lại rồi thử lại.", "Lưu chính sách",
  ]) {
    for (const t of mucChinhSach) assert.ok(!t.cam.test(c), `${t.cam} khớp «${c}»`);
  }
  // hai mảnh «chính sách » đọc thật từ nhật ký của pricing/index.ts đi qua đúng danh sách cho phép
  const tep = "src/modules/pricing/index.ts";
  const manh = chuoiTrongMa(readFileSync(join(ROOT, tep), "utf8")).filter((s) => s.chu === "chính sách ");
  assert.equal(manh.length, 2);
  assert.deepEqual(viPhamTheoTep(tep, readFileSync(join(ROOT, tep), "utf8")), []);
});

test("lượt 6 ca dương", () => {
  const cau = [
    "Đã có chính sách với tên này.", "Loại này đã theo một chính sách trong khoảng ngày này — ngừng áp dụng chính sách cũ trước.",
    "Chính sách này đã tắt — bật lại trước khi áp dụng cho loại hay thêm mức.", "Lần áp dụng chính sách này vừa được người khác ngừng hoặc đổi. Tải lại trang.",
    "Không tìm thấy chính sách này.", "Không tìm thấy lần áp dụng chính sách này cho loại.", "Lần áp dụng chính sách này vừa được ngừng — tải lại.",
    "Lần áp dụng chính sách này vừa được người khác sửa hoặc ngừng. Tải lại trang.", "Không tìm thấy chính sách riêng này.",
    "Chính sách riêng này vừa được ngừng — tải lại.", "Chính sách riêng này vừa được người khác sửa hoặc ngừng. Tải lại trang.",
    "Tên chính sách dài từ 2 đến 60 ký tự.", "Tên chính sách không được chứa số điện thoại, số tài khoản hay địa chỉ email.",
    "Chọn loại đối tác và chính sách.", "Chọn chính sách.", "CHÍNH SÁCH HOA HỒNG",
  ];
  for (const c of cau) assert.notDeepEqual(viPhamTheoTep("web/hoa-hong-gia.ts", `const x = "${c}";`), [], c);
});

test("lượt 6: bộ tệp hoa hồng không còn «chính sách» theo nghĩa cấp", () => {
  for (const t of ["web/hoa-hong-cap.ts", "web/hoa-hong-loai.ts", "web/hoa-hong-doi-tac.ts", "web/hoa-hong-menu.ts", "web/hoa-hong-dai.ts", "web/parties.ts", "src/modules/pricing/index.ts"]) {
    assert.ok(TEP_HOA_HONG.includes(t), `${t} phải nằm trong bộ tệp bị quét`);
  }
  const loi: string[] = [];
  const dem = new Map<string, number>();
  for (const tep of TEP_HOA_HONG) {
    const src = readFileSync(join(ROOT, tep), "utf8");
    for (const v of viPhamTheoTep(tep, src)) loi.push(`${tep}:${v.dong} «${v.chu.trim().slice(0, 90)}»`);
    for (const c of CHO_PHEP_THEO_TEP.filter((x) => x.tep === tep)) {
      dem.set(c.tep + "|" + c.manh, chuoiTrongMa(src).filter((s) => s.chu === c.manh).length);
    }
  }
  assert.deepEqual(loi, [], `${loi.length} chỗ còn «chính sách» trong bộ tệp hoa hồng (CAM_THEO_TEP):\n${loi.join("\n")}`);
  for (const c of CHO_PHEP_THEO_TEP) assert.equal(dem.get(c.tep + "|" + c.manh), c.soLan, `mảnh «${c.manh}» ở ${c.tep} phải đúng ${c.soLan} lần (${c.ly_do})`);
});
