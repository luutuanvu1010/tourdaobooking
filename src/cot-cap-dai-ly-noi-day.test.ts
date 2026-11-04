// ADR-0155 Đ2 — kế hoạch lượt 2 Task 4.2, bài (e3) «nối dây»: cột «Cấp độ đại lý» ở Quản lý tài khoản phải được NỐI đúng chỗ, vì giao diện thật cần trình duyệt (kịch bản Chrome, ngoài npm test).
//   (1) `public/staff.html` có `<th id="cot-cap" hidden>` cạnh «Vai trò / quyền» — mặc định ẨN, chỉ trang bật khi `thayCotCap`;
//   (2) `web/staff.ts` chỉ gọi route đọc sau khi hỏi `thayCotCap` (Hành chính nhân sự không có ô xem thì không gọi), và hỏi `suaDuocCot` cho quyền sửa;
//   (3) chỉ `web/staff.ts` và `web/cap-dai-ly.ts` (màn gom, đặc tả 2026-11-04-man-cap-dai-ly) nhập `web/cot-cap-dai-ly.ts`; tệp luật thuần chỉ do `web/cot-cap-dai-ly.ts`, `web/staff.ts` nhập;
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
  // MỘT chỗ duy nhất gọi route cấp (hàm napCap), và hàm đó mở đầu bằng điều kiện hienCotCap: Hành chính nhân sự không có ô xem nên không gọi
  const dong = ma.split("\n").filter((l) => /\btaiCapHienHanh\(/.test(l));
  assert.equal(dong.length, 1, `đúng một lời gọi taiCapHienHanh (ngoài dòng nhập): ${dong.map((l) => l.trim()).join(" | ")}`);
  const nap = ma.slice(ma.indexOf("function napCap("), ma.indexOf("async function lamMoiCap("));
  assert.ok(nap.length > 20 && nap.includes("taiCapHienHanh("), "napCap gọi taiCapHienHanh");
  assert.match(nap, /^function napCap\(\)[^{]*\{\s*if \(!hienCotCap\) return/, "napCap mở đầu bằng điều kiện hienCotCap");
  assert.match(ma, /cotCapEl\.hidden\s*=\s*!hienCotCap/, "tiêu đề cột chỉ hiện khi thayCotCap");
  assert.match(ma, /\bsuaDuocCot\(me\)/, "quyền sửa lấy từ suaDuocCot");
  // ô nằm ở CẢ bảng lẫn thẻ điện thoại; hàng bảng chỉ vẽ ô khi cột hiện (W6 của người kiểm: Hành chính nhân sự không được thấy bảng lệch cột)
  const hamRow = ma.slice(ma.indexOf("function row("), ma.indexOf("function card("));
  const hamCard = ma.slice(ma.indexOf("function card("), ma.indexOf("async function openEdit("));
  assert.match(hamRow, /oCapCuaS\(s\)/, "bảng có ô");
  assert.match(hamRow, /hienCotCap\s*&&\s*h\("td"/, "ô của hàng bảng chỉ dựng khi cột hiện");
  assert.match(hamCard, /oCapCuaS\(s\)/, "thẻ điện thoại có ô");
  assert.match(hamCard, /oCapThe\s*&&/, "thẻ chỉ dựng dòng khi có ô");
  // ô: không hiện cột ⇒ null; đang nạp lần đầu ⇒ «Đang tải»; nạp lỗi ⇒ «—» (W5 của người kiểm: vế này không được gỡ lặng lẽ)
  const oCapCuaS = ma.slice(ma.indexOf("const oCapCuaS"), ma.indexOf("function row("));
  assert.match(oCapCuaS, /!hienCotCap\s*\?\s*null/, "không hiện cột ⇒ không ô");
  assert.match(oCapCuaS, /capHienHanh === undefined\s*\?\s*oCapDangNap\(s\)/, "đang nạp ⇒ ô «Đang tải»");
  assert.match(oCapCuaS, /capHienHanh === null\s*\?\s*oCapKhongTai\(s\)/, "nạp lỗi ⇒ ô «—»");
});

test("(e3-6) nạp cấp SONG SONG với danh sách tài khoản, bảng không chờ route cấp; lưu xong đặt lại tiêu điểm về ô của đúng hồ sơ (kiểm độc lập m-2, m-4)", () => {
  const ma = boChuThich(doc("web/staff.ts"));
  const load = ma.slice(ma.indexOf("async function load("), ma.indexOf("function ve("));
  assert.ok(load.length > 50, "tìm thấy hàm load");
  const iNap = load.indexOf("napCap()");
  const iDs = load.indexOf("await act(");
  assert.ok(iNap >= 0 && iDs >= 0 && iNap < iDs, "load bắt đầu nạp cấp TRƯỚC khi chờ danh sách (chạy song song)");
  assert.ok(!/await\s+(napCap|taiCapHienHanh)/.test(load), "load không chờ route cấp: bảng vẽ ngay khi danh sách về");
  assert.ok(load.indexOf("ve()") > load.indexOf("accounts = r.staff"), "load vẽ ngay sau khi gán danh sách");
  assert.match(load, /daVeLanDau\s*=\s*true/, "đánh dấu đã vẽ lần đầu (để nạp cấp về sau mới vẽ lại)");
  const nap = ma.slice(ma.indexOf("function napCap("), ma.indexOf("async function lamMoiCap("));
  assert.match(nap, /const lan = \+\+lanNapCap/, "mỗi lần nạp có số thứ tự");
  assert.match(nap, /if \(lan !== lanNapCap\) return/, "kết quả của lần nạp cũ không ghi đè lần mới hơn");
  assert.match(nap, /if \(daVeLanDau\) ve\(\)/, "cấp về sau danh sách thì vẽ lại; về trước thì để load vẽ (không vẽ danh sách rỗng, vì sẽ xoá lựa chọn lọc đã nhớ)");
  // lưu xong: nạp lại, vẽ lại, rồi đặt tiêu điểm
  const lamMoi = ma.slice(ma.indexOf("async function lamMoiCap("), ma.indexOf("const oCapCuaS"));
  assert.match(lamMoi, /async function lamMoiCap\(partyId: string\)/, "lamMoiCap biết hồ sơ vừa lưu");
  assert.ok(lamMoi.indexOf("await napCap()") >= 0 && lamMoi.indexOf("datTieuDiemODongCap(partyId)") > lamMoi.indexOf("await napCap()"), "đặt tiêu điểm SAU khi vẽ lại");
  const cot = boChuThich(doc("web/cot-cap-dai-ly.ts"));
  assert.match(cot, /await lamMoi\(v\.partyId\)/, "bảng bấm báo cho trang hồ sơ nào vừa lưu");
  assert.match(cot, /"data-party":/, "ô mang mã hồ sơ để tìm lại sau khi vẽ lại");
  const hamTieuDiem = cot.slice(cot.indexOf("export function datTieuDiemODongCap"));
  assert.match(hamTieuDiem, /getClientRects\(\)\.length > 0/, "chỉ ô đang hiện (bảng hoặc thẻ)");
  assert.match(hamTieuDiem, /\.focus\(\)/);
  assert.match(cot, /tabindex: -1/, "ô không có nút vẫn nhận được tiêu điểm");
});

test("(e3-3) chỉ web/staff.ts và web/cap-dai-ly.ts nhập web/cot-cap-dai-ly.ts; tệp luật thuần chỉ do tệp cột nhập (ngoài bài kiểm)", () => {
  const nguon = [...moiTep("web"), ...moiTep("src")].filter((p) => !p.endsWith(".test.ts"));
  const nhapCot = nguon.filter((p) => /from "(\.\/|\.\.\/web\/)cot-cap-dai-ly(\.ts)?"/.test(doc(p)));
  assert.deepEqual(nhapCot.sort(), ["web/cap-dai-ly.ts", "web/staff.ts"], "tệp nhập web/cot-cap-dai-ly");
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
  assert.match(ma, /thucHienLenhGhiCap\(/, "lệnh ghi do hàm thuần dựng và chạy");
  assert.ok(!/\byeuCauGhiCap\(/.test(ma), "web không tự dựng lệnh: đi qua thucHienLenhGhiCap (đọc lại ngày máy chủ lúc bấm)");
  assert.match(ma, /nutMoBang\(o, suaDuoc\)/, "chữ chính là nút hay chữ do hàm thuần nutMoBang quyết, không điều kiện chép tay");
  assert.match(ma, /oCapCuaDong\(dong, v\)/, "chữ trong ô lấy từ hàm thuần oCapCuaDong");
  assert.match(ma, /macDinhBangCap\(v, homNay, xem\)/, "ngày mặc định lấy từ hàm thuần macDinhBangCap");
  // N-1 (ruling R12): KHÔNG giữ «hôm nay» từ lúc tải trang. Ngày của bảng = ngày máy chủ lúc MỞ (xem.homNay trước, rồi ngày của danh sách cấp); «Dùng cấp theo vai trò» đọc lại ngày lúc BẤM (`…/sua`).
  assert.ok(!/homNayMay/.test(ma), "không còn biến giữ ngày từ lúc tải trang");
  assert.match(ma, /const homNay = ngayMayLucMo\(xem, mt\.homNay\)/, "ngày lúc mở bảng = ngày máy chủ vừa trả");
  const doc1 = ma.slice(ma.indexOf("docNgayMay"), ma.indexOf("docNgayMay") + 500);
  assert.match(doc1, /\/sua`/, "đọc ngày lúc bấm bằng route có sẵn …/sua");
  assert.match(doc1, /\.homNay/, "lấy homNay của máy chủ");
  assert.match(doc1, /catch\s*\{\s*return null/, "không đọc được ⇒ null (hàm thuần sẽ không gửi)");
  // R13: câu cố định cạnh nút
  assert.match(ma, /dung,\s*h\("div",\s*\{\s*class:\s*"vc-hint"\s*\},\s*CHU_CAP\.dungTheoVaiTroLuuY\)/, "câu «Có hiệu lực từ ngày mai. Nếu vai trò chưa có cấp…» nằm ngay cạnh nút");
  assert.ok(!/\/api\/pricing\/muc-rieng\/\$\{[^}]*\}\/(doi|ket-thuc)|ho-so\/\$\{[^}]*\}\/muc-rieng/.test(ma), "địa chỉ ba route chỉ ở hàm thuần yeuCauGhiCap, không chép tay");
  for (const o of ma.matchAll(/h\("(input|select)",\s*\{([^}]*)\}/g)) assert.match(o[2]!, /vc-input/, `ô gõ thiếu lớp vc-input: ${o[0].slice(0, 60)}`);
  assert.ok([...ma.matchAll(/h\("(input|select)"/g)].length >= 2, "chống bài rỗng: có ô chọn cấp và ô ngày");
});

// Đặc tả 2026-11-04-man-cap-dai-ly: màn gom hồ sơ. Giao diện thật cần trình duyệt; đây chỉ canh chỗ nối dây.
const moMan = (): string => boChuThich(doc("web/cap-dai-ly.ts"));

test("(man-1) hồ sơ chưa có tài khoản đi đường riêng oCapHoSo, không giả quyền: tệp cột có oCapHoSo gọi oCapCuaHoSo; màn không nhắc permissions, không gọi oCap(", () => {
  const cot = boChuThich(doc("web/cot-cap-dai-ly.ts"));
  const ham = cot.slice(cot.indexOf("export function oCapHoSo"), cot.indexOf("async function moBangDatCap"));
  assert.match(ham, /oCapCuaHoSo\(v\)/, "chữ trong ô của hồ sơ lấy từ hàm thuần không hỏi quyền");
  assert.ok(!/permissions/.test(ham), "oCapHoSo không giả quyền");
  const man = moMan();
  assert.match(man, /\boCapHoSo\(/, "màn dùng ô của hồ sơ");
  assert.ok(!/\boCap\(/.test(man) && !/permissions/.test(man), "màn không dùng ô của dòng tài khoản, không dựng quyền giả");
});

test("(man-2) màn gọi đúng route đọc mới và chỉ sau khi hỏi coQuyenSua; không tự có lệnh ghi; không confirm, alert, innerHTML", () => {
  const man = moMan();
  assert.match(man, /import \{[^}]*\bcoQuyenSua\b[^}]*\} from "\.\.\/src\/shared\/hoa-hong-hien-thi"/);
  assert.equal([...man.matchAll(/\/api\/pricing\/cap-dai-ly/g)].length, 1, "một chỗ gọi route đọc");
  const chay = man.slice(man.indexOf("const staff = await initShell()"));
  assert.ok(chay.indexOf("coQuyenSua(staff)") >= 0 && chay.indexOf("coQuyenSua(staff)") < chay.indexOf("await nap("), "hỏi cổng trước lần nạp đầu");
  assert.ok(!/method:/.test(man), "màn không tự gửi lệnh ghi: ba lệnh có sẵn đi qua bảng đặt cấp");
  assert.ok(!/\bconfirm\(|\balert\(|innerHTML/.test(man));
  for (const o of man.matchAll(/h\("(input|select)",\s*\{([^}]*)\}/g)) assert.match(o[2]!, /class: "o"/, `ô gõ phải dùng lớp .o (16px): ${o[0].slice(0, 60)}`);
});

test("(man-3) không có cấp đang bật: màn nói rõ, trỏ sang /hoa-hong và ô không còn là nút mở bảng", () => {
  const man = moMan();
  assert.match(man, /soCapDangBat === 0/);
  assert.match(man, /CHU_MAN\.khongCoCap/);
  assert.match(man, /href: "\/hoa-hong"/);
  assert.match(man, /oCapHoSo\([^)]*coCapBat/, "chỉ cho mở bảng khi còn cấp đang bật");
});

test("(man-4) vẽ theo từng phím không dựng lại cả bảng: ô tìm có độ trễ, mỗi lần chỉ vẽ một phần danh sách", () => {
  const man = moMan();
  assert.match(man, /setTimeout\(/);
  assert.match(man, /clearTimeout\(/);
  assert.match(man, /\.slice\(0, soHien\)/);
  assert.match(man, /SO_DONG_MOI_LAN/);
});

test("(man-5) Quản lý tài khoản có đường dẫn sang màn, chỉ hiện cho người sửa được (cùng hàm suaDuocCot)", () => {
  assert.match(doc("public/staff.html"), /<p id="lien-ket-cap-dai-ly" hidden><a href="\/cap-dai-ly">/);
  assert.match(boChuThich(doc("web/staff.ts")), /byId\("lien-ket-cap-dai-ly"\)\.hidden = !suaDuocCot\(me\)/);
});

test("(man-6) gói Đơn hàng không kéo màn; gói màn có tệp cột, không kéo bảng tài khoản", () => {
  const don = dauVaoGoi("web/orders.ts");
  assert.ok(!don.some((t) => /cap-dai-ly/.test(t)), "gói Đơn hàng không chứa mã màn");
  const man = dauVaoGoi("web/cap-dai-ly.ts");
  assert.ok(man.some((t) => t.endsWith("web/cot-cap-dai-ly.ts")));
  assert.ok(!man.some((t) => t.endsWith("web/staff.ts")));
});
