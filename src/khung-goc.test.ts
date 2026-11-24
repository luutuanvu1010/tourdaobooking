// Khung gốc giao diện — máy canh trong `npm test` (ADR-0222 Đ7a). Khoá bốn nhóm:
//  (1) tệp kiểu có ĐÚNG MỘT phần khung; luật trong đó chỉ áp cho trang đã khai khuôn, chỉ dùng hai mốc cửa sổ (641, 900) và ba mốc bên trong (560, 800, 1040);
//  (2) mỗi trang khai đúng một trong bảy khuôn, hoặc còn tên trong danh sách chưa chuyển (danh sách đó chỉ được bớt); mức bề rộng khớp khuôn theo bảng lưới 15/11;
//  (3) sổ ngoại lệ: mục nào cũng đủ lý do và ngày chủ duyệt; «vùng tự do» chỉ có ở màn có tên trong sổ;
//  (4) năm con số «chưa theo khung» có trần, TRẦN CHỈ ĐƯỢC HẠ (khuôn bài `src/ratchet-confirm-alert.test.ts`).
// Phép đếm: `scripts/giao-dien/dem-khung-goc.mjs` (một nguồn, lệnh `npm run do-khung` in cùng con số). Khai báo: `src/shared/khung-goc.ts`.
// Bài này chỉ đọc chữ trong tệp; hành vi thật trên trình duyệt (khối thẳng mép, không chữ bị bóp…) do lệnh đo `npm run do-khung` kiểm (Đ7b).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { MOC_CHINH, MOC_DAU, MOC_HET, MOC_TRONG, catKhung, demTepKieu, lopCuTrongHtml, lopCuTrongTs, mocCuaSo, tachLuat } from "../scripts/giao-dien/dem-khung-goc.mjs";
import { KHUON, SO_NGOAI_LE, THUOC_TINH_KHUON, TRANG_CHUA_CHUYEN, docThanTrang, duongCuaTrang, soatNgoaiLe, soatTrang, type NgoaiLe } from "./shared/khung-goc.ts";
import { PAGES } from "./shared/sw-policy.ts";

const GOC = new URL("../", import.meta.url);
const doc = (duong: string): string => readFileSync(new URL(duong, GOC), "utf8");
const css = doc("public/app.css");
const { co: coKhung, khung } = catKhung(css);
const trang = readdirSync(new URL("public/", GOC)).filter((t) => t.endsWith(".html")).sort().map((ten) => ({ ten, html: doc(`public/${ten}`) }));
const tepWeb = readdirSync(new URL("web/", GOC)).filter((t) => t.endsWith(".ts") && !t.endsWith(".d.ts")).sort();
const homNay = new Date().toISOString().slice(0, 10);

/** Năm con số «chưa theo khung» (ADR-0222 Đ7a). TRẦN CHỈ ĐƯỢC HẠ: chuyển xong một họ màn thì đo lại (`npm run do-khung -- --dem`) và hạ trần về đúng số đo.
 *  Không bao giờ nâng. Việc mới cần bố cục thì dùng lớp của khung (web/khung.ts), không viết thêm luật bề rộng, chia cột, khoảng cách ngoài phần khung.
 *  Lúc lập luật 21/11/2026 (trước khi chuyển bốn màn mẫu): 2597 · 128 · 16 · 154 · 65.
 *  Sau đợt bốn màn mẫu (Đơn hàng, Chi tiết đơn, Sửa xe, Địa điểm), 21/11/2026: 2558 · 122 · 15 · 148 · 61.
 *  Sau đợt A (Tạo / Sửa đơn, Đơn chờ xác nhận), 24/11/2026: 2521 · 120 · 14 · 144 · 59 (gỡ bố cục cột cũ của Tạo đơn, ba token --w-form, --w-side, --bw-owner, thẻ đơn chờ cũ). */
const TRAN = { luatBoCucRieng: 2521, tokenBeRongRieng: 120, mocLe: 14, tepLopCu: 144, trangChuaChuyen: 59 };

/** Trang có lúc lập luật 21/11/2026 — ĐÓNG BĂNG, không sửa. Danh sách chưa chuyển chỉ được là tập con của nó, nên trang mới không thể «xin» chưa chuyển. */
const TRANG_LUC_LAP_LUAT = new Set([
  "404.html", "account.html", "audit.html", "ban.html", "bang-gia-xe.html", "bang-ke-xe.html", "cap-dai-ly.html", "catalog.html", "chinh-sach-dieu-phoi.html",
  "cho-xac-nhan.html", "chup-bu.html", "chuyen-sua.html", "chuyen.html", "cuoc-chuyen.html", "cuoc.html", "dac-diem-dich-vu.html", "dang-ky.html",
  "danh-muc-giay-to.html", "de-nghi.html", "dieu-chinh-cong-no.html", "dieu-kien-xuat-ben.html", "dieu-phoi.html", "feedback.html", "giao-dien.html",
  "giay-to-sap-het-han.html", "gui-thong-bao.html", "han-muc-tra-sau.html", "help.html", "hoa-hong-gioi-han.html", "hoa-hong.html", "home.html",
  "huong-dan.html", "index.html", "khoa-thang.html", "lich-xe-ban.html", "loai-giay-to-nguoi.html", "loai-giay-to-xe.html", "locations.html", "login.html",
  "luat-ban.html", "ly-do-dieu-phoi.html", "ngoai-mang.html", "nguoi-ban.html", "order-form.html", "order.html", "orders.html", "parties.html",
  "phan-dinh.html", "phi-don.html", "phieu-dang-ky.html", "quet-ve.html", "sessions.html", "so-cong-no.html", "staff.html", "tai-xe.html", "thiet-lap.html",
  "to-chuc.html", "tro-ly-cai-dat.html", "ve-cai-dat.html", "ve-doi-chieu.html", "ve-kho.html", "xe-chi-tiet.html", "xe-dang-chay.html", "xe-sua.html", "xe.html",
]);

// ---------- (1) Phần khung của tệp kiểu ----------

test("tệp kiểu có đúng một phần khung, đứng sau khối thành phần chung v2", () => {
  assert.ok(coKhung, `public/app.css thiếu cặp dấu mốc «${MOC_DAU} …» / «${MOC_HET}»`);
  assert.equal(css.split(MOC_DAU).length - 1, 1, "dấu mốc mở phần khung phải xuất hiện đúng một lần");
  assert.equal(css.split(MOC_HET).length - 1, 1, "dấu mốc hết phần khung phải xuất hiện đúng một lần");
  assert.ok(css.indexOf(MOC_DAU) > css.indexOf("/* ---------- Thành phần chung v2"), "phần khung phải đứng sau khối «Thành phần chung v2» (để thắng luật của bộ thành phần khi cùng độ ưu tiên)");
});

test("phần khung: mọi luật chỉ áp cho trang đã khai khuôn (bộ chọn mở đầu bằng body[data-khung-goc…])", () => {
  const luat = tachLuat(khung);
  assert.ok(luat.length >= 40, `phần khung chỉ có ${luat.length} luật: phép tách hỏng hoặc khung chưa viết`);
  const sai = luat.flatMap((l) => l.bo).filter((b) => !/^body\[data-khung-goc[\]=]/.test(b));
  assert.deepEqual(sai, [], "luật của khung lọt ra trang chưa chuyển: mỗi bộ chọn phải mở đầu bằng body[data-khung-goc] hoặc body[data-khung-goc=\"…\"]");
  // Khung là của mọi màn: không nhắc id của một màn (màn chọn tham số bằng data-*, không bằng luật riêng trong phần khung).
  assert.deepEqual(luat.flatMap((l) => l.bo).filter((b) => /#[A-Za-z]/.test(b)), [], "phần khung nhắc id của một màn");
});

test("phần khung: tên khuôn trong bộ chọn thuộc bảy khuôn", () => {
  const ten = [...khung.matchAll(/\[data-khung-goc="([^"]*)"\]/g)].map((m) => m[1]!);
  assert.deepEqual([...new Set(ten)].filter((t) => !Object.hasOwn(KHUON, t)), []);
  assert.equal(THUOC_TINH_KHUON, "data-khung-goc");
});

test("phần khung: cửa sổ chỉ hai mốc 641 và 900; bên trong trang chỉ ba mốc 560, 800, 1040 theo vùng chứa, viết từ hẹp lên rộng", () => {
  assert.deepEqual(mocCuaSo(khung).filter((n) => !MOC_CHINH.includes(n)), [], "phần khung dùng mốc cửa sổ ngoài 641 và 900");
  const sach = khung.replace(/\/\*[\s\S]*?\*\//g, "");
  const dk = [...sach.matchAll(/@container\b([^{]*)\{/g)].map((m) => m[1]!.trim());
  assert.ok(dk.length >= 5, `phần khung chỉ có ${dk.length} truy vấn vùng chứa: khung chưa đáp theo chỗ trống thật (Đ6)`);
  const la = dk.filter((d) => !new RegExp(`^(?:trang |khoi )?\\(min-width: (?:${MOC_TRONG.join("|")})px\\)$`).test(d));
  assert.deepEqual(la, [], "truy vấn vùng chứa của khung chỉ được là «(min-width: 560|800|1040px)», tuỳ chọn tên vùng trang hoặc khoi");
});

test("phần khung: chỉ dùng số của thang (không token bề rộng riêng --w-*, mọi token --kg-* đều khai ở :root)", () => {
  assert.deepEqual(khung.match(/var\(--w-[\w-]+/g) ?? [], [], "phần khung dùng token bề rộng riêng của một trang");
  const dung = [...new Set([...khung.matchAll(/var\((--kg-[\w-]+)/g)].map((m) => m[1]!))];
  assert.ok(dung.length >= 8, "phần khung chưa dùng thang đo --kg-*");
  const goc = tachLuat(catKhung(css).ngoai).filter((l) => l.bo.includes(":root")).flatMap((l) => l.kd.map(([p]: [string, string]) => p));
  // Token đặt lại tại chỗ trong phần khung (ví dụ đệm khối theo bề rộng) cũng tính là đã khai.
  const taiCho = tachLuat(khung).flatMap((l) => l.kd.map(([p]: [string, string]) => p)).filter((p: string) => p.startsWith("--kg-"));
  assert.deepEqual(dung.filter((t) => !goc.includes(t) && !taiCho.includes(t)), [], "token --kg-* dùng trong phần khung mà chưa khai");
});

// ---------- (2) Mỗi trang một khuôn ----------

test("mỗi trang khai đúng một trong bảy khuôn, hoặc còn tên trong danh sách chưa chuyển; mức bề rộng khớp khuôn", () => {
  assert.ok(trang.length >= 60, `chỉ thấy ${trang.length} trang trong public/: bộ lọc hỏng`);
  assert.deepEqual(trang.flatMap((t) => soatTrang(t.ten, t.html, TRANG_CHUA_CHUYEN, SO_NGOAI_LE)), []);
});

test("danh sách trang chưa chuyển: không trùng, trang nào cũng có thật, chưa khai khuôn, và có từ lúc lập luật (trang mới không được thêm vào)", () => {
  assert.equal(new Set(TRANG_CHUA_CHUYEN).size, TRANG_CHUA_CHUYEN.length, "danh sách có tên trùng");
  const coThat = new Set(trang.map((t) => t.ten));
  assert.deepEqual(TRANG_CHUA_CHUYEN.filter((t) => !coThat.has(t)), [], "tên không còn tệp trong public/: gỡ khỏi danh sách");
  assert.deepEqual(TRANG_CHUA_CHUYEN.filter((t) => !TRANG_LUC_LAP_LUAT.has(t)), [], "trang mới phải khai khuôn ngay, không được thêm vào danh sách chưa chuyển");
});

test("máy soát trang bắt được: thiếu khuôn, khuôn lạ, mức bề rộng lệch khuôn; ngoại lệ mức bề rộng có trong sổ thì qua", () => {
  const than = (thuocTinh: string): string => `<!doctype html><html><body ${thuocTinh}><main></main></body></html>`;
  assert.match(soatTrang("moi.html", than('data-rong="vua"'), [], [])[0] ?? "", /chưa khai khuôn/);
  assert.deepEqual(soatTrang("cu.html", than('data-rong="vua"'), ["cu.html"], []), []);
  assert.match(soatTrang("moi.html", than('data-khung-goc="bang-dieu-khien" data-rong="rong"'), [], [])[0] ?? "", /không thuộc bảy khuôn/);
  assert.match(soatTrang("moi.html", than('data-khung-goc="danh-sach" data-rong="vua"'), [], [])[0] ?? "", /không khớp khuôn Danh sách/);
  assert.match(soatTrang("moi.html", than('data-khung-goc="chi-tiet"'), [], [])[0] ?? "", /\(thiếu\)/);
  assert.deepEqual(soatTrang("moi.html", than('data-khung-goc="danh-sach" data-rong="rong"'), [], []), []);
  assert.deepEqual(soatTrang("moi.html", than('data-khung-goc="bieu-mau" data-rong="hep" data-khuon="bieu-mau"'), [], []), []);
  assert.deepEqual(soatTrang("moi.html", than('data-khung-goc="trang-thai"'), [], []), []);
  const mucRong: NgoaiLe = { man: "Thử", trang: "/moi", phan: "mức bề rộng", loai: "muc-rong", lyDo: "thử", ngayDuyet: "2026-11-21", nguon: "thử", tep: [] };
  assert.deepEqual(soatTrang("moi.html", than('data-khung-goc="danh-sach" data-rong="vua"'), [], [mucRong]), []);
  assert.match(soatTrang("cu.html", than('data-khung-goc="danh-sach" data-rong="rong"'), ["cu.html"], [])[0] ?? "", /còn tên trong TRANG_CHUA_CHUYEN/);
  // Thuộc tính cũ `data-khuon` (dải nhắc bảo mật) KHÔNG được đọc nhầm thành khuôn trang.
  assert.equal(docThanTrang(than('data-khuon="bieu-mau" data-rong="hep"')).khuon, null);
  assert.equal(duongCuaTrang("index.html"), "/");
  assert.equal(duongCuaTrang("xe-sua.html"), "/xe-sua");
});

test("trang đã chuyển: tệp HTML không còn lớp thế hệ cũ (.btn, .card, .badge)", () => {
  const sai = trang.filter((t) => docThanTrang(t.html).khuon !== null).map((t) => [t.ten, lopCuTrongHtml(t.html)] as const).filter(([, l]) => l.length);
  assert.deepEqual(sai, []);
});

// ---------- (3) Sổ ngoại lệ ----------

test("sổ ngoại lệ: mục nào cũng đủ màn, phần, lý do, ngày chủ duyệt, nơi ghi lời duyệt", () => {
  assert.ok(SO_NGOAI_LE.length >= 6, "sổ khởi đầu bằng sáu mục ADR-0222 Đ5 nêu tên");
  assert.deepEqual(soatNgoaiLe(SO_NGOAI_LE, PAGES, homNay), []);
  for (const m of SO_NGOAI_LE) for (const t of m.tep) assert.ok(tepWeb.includes(t.replace(/^web\//, "")), `sổ ngoại lệ (${m.man}): không thấy tệp ${t}`);
});

test("máy soát sổ ngoại lệ bắt được: thiếu lý do, thiếu hoặc sai ngày duyệt, ngày ở tương lai, trang không có thật, mục trùng", () => {
  const mau: NgoaiLe = { man: "Màn thử", trang: "/orders", phan: "khối thử", loai: "vung-tu-do", lyDo: "vì thử", ngayDuyet: "2026-11-21", nguon: "ADR thử", tep: ["web/orders.ts"] };
  const soat = (sua: Partial<NgoaiLe>): string => soatNgoaiLe([{ ...mau, ...sua }], PAGES, "2026-11-21").join(" | ");
  assert.equal(soat({}), "");
  assert.match(soat({ lyDo: "  " }), /thiếu lý do/);
  assert.match(soat({ ngayDuyet: "" }), /thiếu ngày chủ dự án duyệt/);
  assert.match(soat({ ngayDuyet: "21/11/2026" }), /thiếu ngày chủ dự án duyệt/);
  assert.match(soat({ ngayDuyet: "2026-02-30" }), /thiếu ngày chủ dự án duyệt/);
  assert.match(soat({ ngayDuyet: "2026-11-22" }), /ở tương lai/);
  assert.match(soat({ trang: "/khong-co" }), /không có trong danh sách trang/);
  assert.match(soat({ man: "" }), /thiếu tên màn/);
  assert.match(soat({ tep: [] }), /thiếu tệp mã/);
  assert.match(soatNgoaiLe([mau, mau], PAGES, "2026-11-21").join(" | "), /trùng một mục khác/);
});

test("«vùng tự do» chỉ được dựng ở tệp có tên trong sổ ngoại lệ", () => {
  const duocPhep = new Set(SO_NGOAI_LE.filter((m) => m.loai === "vung-tu-do").flatMap((m) => m.tep));
  const dung = tepWeb.filter((t) => t !== "khung.ts" && /\bvung-tu-do\b/.test(doc(`web/${t}`).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1"))).map((t) => `web/${t}`);
  assert.deepEqual(dung.filter((t) => !duocPhep.has(t)), [], "tệp dựng «vùng tự do» mà không có mục trong SO_NGOAI_LE (src/shared/khung-goc.ts): ngoại lệ phải có tên, lý do và ngày chủ duyệt");
  const trangDuocPhep = new Set(SO_NGOAI_LE.filter((m) => m.loai === "vung-tu-do" && m.trang !== null).map((m) => m.trang));
  assert.deepEqual(trang.filter((t) => /\bclass="[^"]*\bvung-tu-do\b/.test(t.html) && !trangDuocPhep.has(duongCuaTrang(t.ten))).map((t) => t.ten), []);
});

// ---------- (4) Năm con số «chưa theo khung»: trần chỉ được hạ ----------

const so = demTepKieu(css);
const NHAC = "Trần chỉ được hạ, không nâng (ADR-0222 Đ7a). Bố cục mới dùng lớp của khung (web/khung.ts: khối, lưới 12 cột, cặp nhãn và giá trị, thanh nút) thay vì viết luật riêng.";

test("số luật đặt bề rộng, chia cột, khoảng cách NGOÀI phần khung không vượt trần", () => {
  assert.ok(so.luatBoCucRieng > 0, "phép đếm hỏng: không thấy luật nào");
  assert.ok(so.luatBoCucRieng <= TRAN.luatBoCucRieng, `${so.luatBoCucRieng} luật bố cục riêng (bề rộng ${so.chiTiet.beRong} + chia cột ${so.chiTiet.chiaCot} + khoảng cách ${so.chiTiet.khoangCach}) > trần ${TRAN.luatBoCucRieng}. ${NHAC}`);
});

test("số token bề rộng riêng (--w-*) không vượt trần", () => {
  assert.ok(so.tokenBeRongRieng <= TRAN.tokenBeRongRieng, `${so.tokenBeRongRieng} token bề rộng riêng > trần ${TRAN.tokenBeRongRieng}. Cột, ô, nhãn lấy bề rộng từ thang --kg-*; cần số mới thì sửa thang, không thêm token cho một màn. ${NHAC}`);
});

test("số chỗ dùng mốc cửa sổ lẻ (ngoài 641 và 900) không vượt trần", () => {
  assert.ok(so.mocLe <= TRAN.mocLe, `${so.mocLe} chỗ dùng mốc lẻ (${so.mocLeGiaTri.join(", ")}) > trần ${TRAN.mocLe}. Bố cục trong trang đổi theo bề rộng vùng nội dung (@container), không theo cửa sổ. ${NHAC}`);
});

test("số tệp còn dùng lớp thế hệ cũ (.btn, .card, .badge) không vượt trần", () => {
  const conDung = [...tepWeb.filter((t) => lopCuTrongTs(doc(`web/${t}`)).length).map((t) => `web/${t}`), ...trang.filter((t) => lopCuTrongHtml(t.html).length).map((t) => `public/${t.ten}`)];
  assert.ok(conDung.length <= TRAN.tepLopCu, `${conDung.length} tệp còn dùng lớp cũ > trần ${TRAN.tepLopCu}. Nút dùng .nut[data-cap], khối dùng .khoi, huy hiệu dùng .huy-hieu. ${NHAC}\n${conDung.join("\n")}`);
});

test("số trang chưa chuyển khuôn không vượt trần", () => {
  assert.ok(TRANG_CHUA_CHUYEN.length <= TRAN.trangChuaChuyen, `${TRANG_CHUA_CHUYEN.length} trang chưa chuyển > trần ${TRAN.trangChuaChuyen}. ${NHAC}`);
});

test("máy đếm tệp kiểu: luật riêng thêm ngoài phần khung làm con số tăng, luật trong phần khung thì không", () => {
  const goc = demTepKieu(css);
  const ngoai = demTepKieu(`${css}\n.thu-nghiem { max-width: 512px; gap: 8px; grid-template-columns: 1fr 2fr; }\n@media (min-width: 1234px) { .thu-nghiem { margin: 0; } }\n:root { --w-thu-nghiem: 512px; }\n`);
  assert.equal(ngoai.luatBoCucRieng, goc.luatBoCucRieng + 4);
  assert.equal(ngoai.tokenBeRongRieng, goc.tokenBeRongRieng + 1);
  assert.equal(ngoai.mocLe, goc.mocLe + 1);
  const trong = demTepKieu(css.replace(MOC_HET, `body[data-khung-goc] .thu-nghiem { max-width: 512px; gap: 8px; }\n${MOC_HET}`));
  assert.equal(trong.luatBoCucRieng, goc.luatBoCucRieng);
});

test("máy tìm lớp cũ: bắt lớp trong chuỗi lớp, trong bộ chọn và trong HTML; bỏ qua chú thích, câu tiếng Việt và tên lớp chỉ chứa chữ đó", () => {
  assert.deepEqual(lopCuTrongTs('h("button", { class: dung ? "btn btn-primary" : "nut" })'), ["btn", "btn-primary"]);
  assert.deepEqual(lopCuTrongTs("el.querySelector('.card > .badge-draft')"), ["badge-draft", "card"]);
  assert.deepEqual(lopCuTrongTs("const c = `the ${x} btn-link`;"), ["btn-link"]);
  assert.deepEqual(lopCuTrongTs('// class: "btn"\n/* "card" */ h("div", { class: "order-card nut" }, "Thêm card visa cho khách")'), []);
  assert.deepEqual(lopCuTrongHtml('<!-- <p class="btn"> --><div class="card table-wrap"><a class="vc-btn">x</a></div>'), ["card"]);
});

// Người kiểm độc lập 21/11 (N1): chân bảng `loc-foot` dùng chung với hộp Hoa hồng (web/hoa-hong-hop.ts, chưa chuyển khuôn, nút lớp cũ). Đổi luật chân bảng theo nút
// mới mà gỡ luật lớp cũ thì nút của hộp Hoa hồng mất vùng bấm 44. Khi một lớp chung còn được màn chưa chuyển dùng, luật cho lớp cũ phải ở lại cùng luật mới.
test("chân bảng loc-foot: còn tệp dựng nút lớp cũ trong đó thì luật lớp cũ (vùng bấm 44, nút chính giãn) vẫn còn", () => {
  const dungCu = tepWeb.filter((t) => { const m = doc(`web/${t}`); return /footClass:\s*"loc-foot"/.test(m) && /class:\s*"btn\b/.test(m); });
  if (dungCu.length === 0) return;
  assert.match(css, /\.sheet-foot\.loc-foot \.btn \{ min-height: var\(--tap-min\); \}/, `${dungCu.join(", ")} còn nút .btn trong chân bảng loc-foot`);
  assert.match(css, /\.sheet-foot\.loc-foot \.btn-primary \{ flex: 1; \}/);
});
