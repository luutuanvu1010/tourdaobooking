// ADR-0155 Đ2 — kế hoạch lượt 2 Task 4.2, bài (e3) «nối dây»: cột «Cấp độ đại lý» ở Quản lý tài khoản phải được NỐI đúng chỗ, vì giao diện thật cần trình duyệt (kịch bản Chrome, ngoài npm test).
//   (1) `public/staff.html` có `<th id="cot-cap" hidden>` cạnh «Vai trò / quyền» — mặc định ẨN, chỉ trang bật khi `thayCotCap`;
//   (2) `web/staff.ts` chỉ gọi route đọc sau khi hỏi `thayCotCap` (Hành chính nhân sự không có ô xem thì không gọi), và hỏi `suaDuocCot` cho quyền sửa;
//   (3) không tệp nào ngoài `web/staff.ts` nhập `web/cot-cap-dai-ly.ts`; tệp luật thuần chỉ do tệp đó nhập;
//   (4) gói của trang Đơn hàng KHÔNG kéo hai tệp này (ADR-0035 — mã cột không được làm nặng trang bán hàng); gói của trang Quản lý tài khoản CÓ kéo (chống bài rỗng);
//   (5) tệp cột không dùng `confirm(`, `alert(`, `innerHTML`; lỗi đọc không chặn bảng (nuốt lỗi, trả null).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildSync } from "esbuild";

const goc = new URL("../", import.meta.url);
const doc = (t: string): string => readFileSync(new URL(t, goc), "utf8");
const gocDuongDan = goc.pathname;

function moiTep(thuMuc: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(join(gocDuongDan, thuMuc))) {
    const p = `${thuMuc}/${ten}`;
    if (statSync(join(gocDuongDan, p)).isDirectory()) moiTep(p, ra);
    else if (p.endsWith(".ts")) ra.push(p);
  }
  return ra;
}
/** Bỏ chú thích để câu đếm / tìm chỉ đọc mã thật. */
const boChuThich = (m: string): string => m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");

test("(e3-1) public/staff.html: th#cot-cap hidden nằm ngay sau «Vai trò / quyền»; hàng tiêu đề còn đủ cột cũ", () => {
  const html = doc("public/staff.html");
  assert.match(html, /<th>Vai trò \/ quyền<\/th>\s*<th id="cot-cap" hidden>Cấp độ đại lý<\/th>\s*<th>Tạo lúc<\/th>/, "cột Cấp độ đại lý cạnh Vai trò / quyền, mặc định ẩn");
  assert.equal([...html.matchAll(/id="cot-cap"/g)].length, 1);
  for (const cot of ["Họ tên", "Số điện thoại", "Tạo lúc", "Đăng nhập gần nhất"]) assert.ok(html.includes(`<th>${cot}</th>`), `mất cột ${cot}`);
});

test("(e3-2) web/staff.ts: route đọc chỉ gọi sau thayCotCap; quyền sửa hỏi suaDuocCot; cột bật theo thayCotCap", () => {
  const ma = boChuThich(doc("web/staff.ts"));
  assert.match(ma, /import \{[^}]*\bthayCotCap\b[^}]*\} from "\.\.\/src\/shared\/cap-hien-hanh-hien-thi"/, "nhập thayCotCap từ tệp luật thuần, không đuôi");
  assert.match(ma, /import \{[^}]*\btaiCapHienHanh\b[^}]*\} from "\.\/cot-cap-dai-ly"/);
  // hienCotCap chỉ được gán từ thayCotCap
  const gan = [...ma.matchAll(/\bhienCotCap\s*=\s*([^;]+);/g)].map((m) => m[1]!.trim());
  assert.ok(gan.length >= 1, "hienCotCap phải được gán");
  for (const g of gan) assert.match(g, /^(false|thayCotCap\(\w+\))$/, `hienCotCap gán từ ${g}`);
  assert.ok(gan.some((g) => g.startsWith("thayCotCap(")), "có một chỗ gán từ thayCotCap");
  // mọi lời gọi taiCapHienHanh (ngoài dòng nhập) nằm sau điều kiện hienCotCap
  const dong = ma.split("\n").filter((l) => /\btaiCapHienHanh\(/.test(l));
  assert.ok(dong.length >= 2, `cả lần nạp danh sách lẫn lần làm mới sau khi lưu đều gọi (${dong.length})`);
  for (const l of dong) assert.match(l, /hienCotCap\s*\?/, `lời gọi không có hienCotCap đứng trước: ${l.trim()}`);
  assert.match(ma, /cotCapEl\.hidden\s*=\s*!hienCotCap/, "tiêu đề cột chỉ hiện khi thayCotCap");
  assert.match(ma, /\bsuaDuocCot\(me\)/, "quyền sửa lấy từ suaDuocCot");
  // ô nằm ở CẢ bảng lẫn thẻ điện thoại
  const hamRow = ma.slice(ma.indexOf("function row("), ma.indexOf("function card("));
  const hamCard = ma.slice(ma.indexOf("function card("), ma.indexOf("async function openEdit("));
  assert.match(hamRow, /oCapCuaS\(s\)/, "bảng có ô");
  assert.match(hamCard, /oCapCuaS\(s\)/, "thẻ điện thoại có ô");
});

test("(e3-3) chỉ web/staff.ts nhập web/cot-cap-dai-ly.ts; tệp luật thuần chỉ do tệp cột nhập (ngoài bài kiểm)", () => {
  const nguon = [...moiTep("web"), ...moiTep("src")].filter((p) => !p.endsWith(".test.ts"));
  const nhapCot = nguon.filter((p) => /from "(\.\/|\.\.\/web\/)cot-cap-dai-ly(\.ts)?"/.test(doc(p)));
  assert.deepEqual(nhapCot, ["web/staff.ts"], "tệp nhập web/cot-cap-dai-ly");
  const nhapLuat = nguon.filter((p) => /cap-hien-hanh-hien-thi(\.ts)?"/.test(doc(p))).sort();
  assert.deepEqual(nhapLuat, ["web/cot-cap-dai-ly.ts", "web/staff.ts"], "tệp nhập luật hiển thị của cột (staff.ts chỉ lấy thayCotCap / suaDuocCot)");
  assert.ok(nguon.includes("web/cot-cap-dai-ly.ts"), "tệp cột tồn tại");
});

function dauVaoGoi(trang: string): string[] {
  const r = buildSync({
    entryPoints: [join(gocDuongDan, trang)],
    bundle: true, format: "esm", target: "es2022", minify: true, write: false, metafile: true, logLevel: "silent",
    define: { __BUILD_ID__: '"thu"', __APP_VERSION__: '"1.0"', __APP_RELEASE_DATE__: '"2026-01-01"' },
  });
  const [ra] = Object.values(r.metafile.outputs);
  return Object.keys(ra!.inputs);
}

test("(e3-4) gói trang Đơn hàng KHÔNG kéo tệp cột / tệp luật hiển thị; gói trang Quản lý tài khoản CÓ kéo", () => {
  const don = dauVaoGoi("web/orders.ts");
  for (const t of don) assert.ok(!/cot-cap-dai-ly|cap-hien-hanh-hien-thi/.test(t), `gói Đơn hàng kéo ${t}`);
  const tk = dauVaoGoi("web/staff.ts");
  assert.ok(tk.some((t) => t.endsWith("web/cot-cap-dai-ly.ts")), "gói Quản lý tài khoản phải có tệp cột (chống bài rỗng)");
  assert.ok(tk.some((t) => t.endsWith("src/shared/cap-hien-hanh-hien-thi.ts")));
});

test("(e3-5) tệp cột: không confirm / alert / innerHTML; lỗi đọc không chặn bảng; ô gõ qua lớp vc-input (16px); nút ghi gọi đúng ba route qua yeuCauGhiCap", () => {
  const ma = boChuThich(doc("web/cot-cap-dai-ly.ts"));
  assert.ok(!/\bconfirm\(|\balert\(|innerHTML/.test(ma), "cấm confirm(, alert(, innerHTML");
  const tai = ma.slice(ma.indexOf("export async function taiCapHienHanh"), ma.indexOf("export async function taiCapHienHanh") + 700);
  assert.match(tai, /catch/, "taiCapHienHanh nuốt lỗi");
  assert.match(tai, /return null/, "và trả null để ô hiện —");
  assert.match(ma, /\/api\/pricing\/cap-hien-hanh/);
  assert.match(ma, /yeuCauGhiCap\(/, "lệnh ghi do hàm thuần dựng");
  assert.match(ma, /nutMoBang\(o, suaDuoc\)/, "chữ chính là nút hay chữ do hàm thuần nutMoBang quyết, không điều kiện chép tay");
  assert.match(ma, /oCapCuaDong\(dong, v\)/, "chữ trong ô lấy từ hàm thuần oCapCuaDong");
  assert.match(ma, /macDinhBangCap\(v, homNay, xem\)/, "ngày mặc định lấy từ hàm thuần macDinhBangCap");
  assert.ok(!/\/api\/pricing\/muc-rieng\/\$\{[^}]*\}\/(doi|ket-thuc)|ho-so\/\$\{[^}]*\}\/muc-rieng/.test(ma), "địa chỉ ba route chỉ ở hàm thuần yeuCauGhiCap, không chép tay");
  for (const o of ma.matchAll(/h\("(input|select)",\s*\{([^}]*)\}/g)) assert.match(o[2]!, /vc-input/, `ô gõ thiếu lớp vc-input: ${o[0].slice(0, 60)}`);
  assert.ok([...ma.matchAll(/h\("(input|select)"/g)].length >= 2, "chống bài rỗng: có ô chọn cấp và ô ngày");
});
