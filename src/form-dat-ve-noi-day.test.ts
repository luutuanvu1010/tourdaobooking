// HÀNG RÀO "NỐI DÂY" của form Tạo đơn gọn cho Đối tác (đặt vé của đối tác, lượt 1, Task 1). Luật thuần (src/shared/form-dat-ve.ts) chỉ chứng minh RẰNG luật đúng;
// không ai kiểm được nó có được GỌI. Bài này quét mã nguồn giao diện (đã che chú thích, giữ chuỗi) và đỏ khi một dây bị đứt: form lập đơn không còn hỏi luật thuần xem
// có dùng form gọn không, thẻ dịch vụ không còn ẩn "Thông tin chuyến" / không còn dựng dòng Ghi chú, ô giảm giá không còn đổi chữ gợi ý.
// Giới hạn: canh QUÊN, không canh CỐ Ý; QUÉT MÃ NGUỒN, không kiểm hành vi chạy (cần Chrome thật — kịch bản doi-tac-lap-don-smoke.mjs; việc giữ nguyên giá trị nháp cũ khi không gõ do bước 3g của kịch bản đó canh, ngoài `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("form lập đơn hỏi luật thuần formGonDoiTac(staff) và truyền cờ vào thẻ dịch vụ", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /\bformGon\s*=\s*formGonDoiTac\(staff\)/, "order-form.ts gán formGon = formGonDoiTac(staff)");
  assert.match(form, /createServiceCard\(\{[\s\S]*?\bformGonDoiTac:\s*formGon\s*,/, "order-form.ts truyền CHÍNH cờ formGon (không phải hằng) vào createServiceCard");
});

test("thẻ dịch vụ: ẩn khối Thông tin chuyến theo cờ và dựng dòng Ghi chú với chữ gợi ý của luật thuần", () => {
  const the = doc("web/service-card.ts");
  assert.match(the, /tripDetails\.hidden\s*=\s*o\.formGonDoiTac/, "tripDetails.hidden đặt theo o.formGonDoiTac");
  assert.match(the, /placeholder:\s*GOI_Y_GHI_CHU_DOI_TAC/, "ô ghi chú gọn đặt placeholder bằng GOI_Y_GHI_CHU_DOI_TAC (không chỉ import)");
  assert.match(the, /"data-trip-gon":\s*"note"/, "ô ghi chú gọn có data-trip-gon=note (kịch bản Chrome dựa vào)");
});

// N7a (9/11/2026): dịch vụ không có đưa đón thì dòng «Ghi chú — Thời gian đón» của Đối tác không còn nghĩa → ẩn theo ĐÚNG điều kiện của khối Đưa đón, ở cả lúc dựng lẫn lúc đổi dịch vụ.
test("N7a: dòng ghi chú gọn ẩn theo cùng điều kiện coDuaDon() === false với khối Đưa đón, ở cả hai chỗ cập nhật", () => {
  const the = doc("web/service-card.ts");
  const chiTim = the.match(/dongGhiChuGon\.hidden\s*=\s*o\.duaDon\.coDuaDon\?\.\(\)\s*===\s*false/g) ?? [];
  assert.ok(chiTim.length >= 2, `dongGhiChuGon.hidden phải đặt theo coDuaDon() ở lúc dựng VÀ lúc đổi dịch vụ — thấy ${chiTim.length} chỗ`);
  const khoiDuaDon = the.match(/duaDon\.root\.hidden\s*=\s*o\.duaDon\.coDuaDon\?\.\(\)\s*===\s*false/g) ?? [];
  assert.equal(chiTim.length, khoiDuaDon.length, "mỗi chỗ ẩn khối Đưa đón có chỗ ẩn dòng ghi chú đi kèm");
});

test("ô giảm giá của form lập đơn dùng chữ gợi ý của luật thuần", () => {
  assert.match(doc("web/order-form.ts"), /placeholder\s*=\s*GOI_Y_GIAM_GIA_DOI_TAC/, "ô giảm giá đặt placeholder bằng GOI_Y_GIAM_GIA_DOI_TAC (không chỉ import)");
});

// Năm chỗ bài trên từng để lọt (người kiểm độc lập, 2/11): truyền cờ là hằng, điều kiện bị thay bằng `false`, mất tên cho trình đọc màn hình của ô giảm giá, hạ trần ô Ghi chú,
// ô Ghi chú ghi đè trường khác của chuyến. Mỗi mẫu dưới đây đã được thử bằng sửa cố ý (đỏ) rồi hoàn nguyên (xanh) — xem sổ hàng rào (docs/SO-HANG-RAO.md).
test("ô giảm giá: khối chỉnh ô chạy CHỈ khi formGon, đặt cả chữ gợi ý lẫn tên cho trình đọc màn hình (aria-label) bằng chữ của luật thuần", () => {
  assert.match(
    doc("web/order-form.ts"),
    /\bif\s*\(\s*formGon\s*\)\s*\{[^}]*?\.placeholder\s*=\s*GOI_Y_GIAM_GIA_DOI_TAC\s*;[^}]*?\.setAttribute\(\s*"aria-label"\s*,\s*GOI_Y_GIAM_GIA_DOI_TAC\s*\)/,
    "khối `if (formGon) { … }` phải đặt placeholder VÀ aria-label của ô giảm giá",
  );
});

/** Phần thuộc tính của ô Ghi chú gọn trong service-card.ts: object của lời gọi `h("input", {…})` có `"data-trip-gon": "note"`. */
const thuocTinhOGhiChu = (): string => {
  const m = doc("web/service-card.ts").match(/h\("input",\s*\{([^}]*"data-trip-gon":\s*"note"[^}]*)\}/);
  assert.ok(m, "service-card.ts dựng ô Ghi chú gọn bằng h(\"input\", {…, \"data-trip-gon\": \"note\"})");
  return m[1]!;
};

test("ô Ghi chú gọn: trần độ dài là MAX_GHI_CHU_DICH_VU (một trần, bằng trần máy chủ), hiện ghiChuMotDong(note) chứ không phải chuỗi thô", () => {
  const tt = thuocTinhOGhiChu();
  assert.deepEqual(tt.match(/maxLength\s*:\s*[^,]+/g)?.map((x) => x.replace(/\s+/g, " ")), ["maxLength: MAX_GHI_CHU_DICH_VU"], "đúng MỘT maxLength và là hằng của luật thuần");
  assert.match(tt, /\bvalue\s*:\s*ghiChuMotDong\(\s*draft\.trip\.note\s*\)/, "giá trị lúc dựng đi qua ghiChuMotDong (ghi chú cũ nhiều dòng không bị gộp mất xuống dòng)");
  assert.match(doc("web/service-card.ts"), /\bsync\(\s*oGhiChuGon\s*,\s*ghiChuMotDong\(\s*d\.trip\.note\s*\)\s*\)/, "chỗ gán lại ô khi vẽ lại cũng đi qua ghiChuMotDong");
});

test("ô Ghi chú gọn: chỉ MỘT chỗ gọi commit, ở sự kiện input, và chỉ đổi trip.note (mọi trường chuyến khác giữ nguyên) — không gõ thì dữ liệu cũ không bị đụng", () => {
  const the = doc("web/service-card.ts");
  assert.match(
    the,
    /oGhiChuGon\.addEventListener\(\s*"input"\s*,\s*\(\)\s*=>\s*commit\(\s*\{\s*\.\.\.draft\s*,\s*trip\s*:\s*\{\s*\.\.\.draft\.trip\s*,\s*note\s*:\s*oGhiChuGon\.value\s*\}\s*\}\s*\)\s*\)/,
    "commit({ ...draft, trip: { ...draft.trip, note: oGhiChuGon.value } }) — không thêm, không bớt trường nào",
  );
  assert.equal(the.match(/oGhiChuGon\.addEventListener\(/g)?.length, 1, "ô Ghi chú gọn chỉ có một bộ lắng nghe sự kiện");
  assert.equal(the.match(/commit\([^)]*oGhiChuGon/g)?.length, 1, "chỉ một lời gọi commit nhắc tới ô Ghi chú gọn");
});

// ---- Đợt 3 (ADR-0154 Đ1.1, Đ2.2, Đ2.3; kế hoạch lượt 2 Task 3.1) ----
// Cùng giới hạn như trên: canh QUÊN dây, không canh CỐ Ý; hành vi chạy thật do kịch bản Chrome `luot-2-smoke.mjs` (chạy ở Đợt 5). Luật thuần có bài riêng (chang-form, an-thong-tin-khach, buoc-tao-don,
// dong-gap-the); các bài dưới đây chỉ chứng minh các luật ĐƯỢC GỌI ở đúng chỗ.
const docTho = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");

test("(a) form gọn không dựng ô giờ: thẻ dịch vụ truyền anGio theo cờ formGonDoiTac cho khối Đưa đón và cho dòng gập; khối Đưa đón chỉ dựng hàng khung khi !anGio và không đưa ô giờ vào cây", () => {
  const the = doc("web/service-card.ts");
  assert.match(the, /taoKhoiDuaDon\(\{[\s\S]*?\banGio:\s*o\.formGonDoiTac\s*===\s*true\b/, "service-card.ts truyền anGio: o.formGonDoiTac === true vào taoKhoiDuaDon");
  assert.match(the, /dongGapThe\(d,\s*\{[^}]*\banGio:\s*o\.formGonDoiTac\s*===\s*true\b/, "dòng gập cũng không nêu chip «Chưa chốt giờ đón» cho đối tác");
  const khoi = doc("web/khoi-dua-don.ts");
  assert.match(khoi, /const kg\s*=\s*o\.che\s*===\s*"form"\s*&&\s*!o\.anGio\s*\?/, "hàng khung giờ (`hangKhung`) chỉ dựng khi có `kg`, và `kg` chỉ có khi !o.anGio");
  assert.match(khoi, /h\("div",\s*\{\s*class:\s*"dd-luoi2"\s*\},\s*ngayEl,\s*o\.anGio\s*\?\s*null\s*:\s*gioEl,/, "ô giờ không nằm trong cây DOM khi anGio");
  assert.equal(khoi.match(/tomTatChang\(l,\s*nhanNgan,\s*o\.anGio\s*===\s*true\)/g)?.length, 2, "cả hai chỗ tóm tắt chặng (lúc dựng và lúc vẽ lại) truyền anGio");
});

test("form đối tác gửi lượt đầu trống giờ: collect đi qua legsGuiFormGon(legs, orderDate) khi formGon; hạn chốt xét theo giờ SẼ GỬI; form gọn không gọi bộ khung giờ", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /legs:\s*formGon\s*\?\s*legsGuiFormGon\(\s*e\.draft\.legs\s*,\s*orderDate\s*\)\s*:\s*e\.draft\.legs/, "collect: services dựng từ legs đã qua legsGuiFormGon khi formGon, nguyên bản khi không");
  assert.match(form, /const legsGui\s*=\s*formGon\s*\?\s*legsGuiFormGon\(\s*d\.legs\s*,\s*orderDate\s*\)\s*:\s*d\.legs/, "dải hạn chốt xét giờ sẽ gửi (không phải giờ cũ trong nháp mà ô không còn hiện)");
  assert.match(form, /gioDon:\s*legsGui\[i\]!\.pickupTime/, "canhBaoChangForm đọc giờ của legsGui");
  assert.match(form, /const layKhung\s*=\s*can\(staff,\s*"order\.create"\)\s*&&\s*!formGon\b/, "formGon thì không gọi GET /api/cai-dat/khung-gio-don");
});

test("công tắc ẩn khách: form chỉ hỏi công tắc khi formGon, đặt anKhach = apChoToi (lỗi mạng → không ẩn), ẩn bằng thuộc tính data-an-khach mà CSS giữ lại đúng dòng Ngày khởi hành", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /const layAnKhach\s*=\s*formGon\s*\?\s*docCongTacAnKhach\(\)\s*:\s*Promise\.resolve\(null\)/, "chỉ tài khoản giữ quyền Đối tác hỏi công tắc");
  assert.match(form, /Promise\.all\(\[layDiem,\s*layMau,\s*layKhung,\s*layAnKhach\]\)/, "đọc công tắc song song với các lần nạp khác, một lần lúc mở");
  assert.match(form, /datAnKhach\(anKhachMay\s*===\s*true\)/, "chỉ ẩn khi máy chủ nói áp (null do lỗi mạng ⇒ không ẩn)");
  assert.match(form, /docCongTacAnKhach\s*=\s*\(\):\s*Promise<boolean \| null>\s*=>\s*api<Api\.AnThongTinKhachResponse>\("\/api\/cai-dat\/an-thong-tin-khach"\)\.then\(\(r\)\s*=>\s*r\.apChoToi,\s*\(\)\s*=>\s*null\)/, "đọc đúng trường apChoToi");
  assert.match(form, /khoiKhach\.toggleAttribute\("data-an-khach",\s*an\)/);
  const css = docTho("public/app.css");
  assert.match(css, /\.buoc\[data-an-khach\]\s*>\s*:not\(\.khach-ngay\)\s*\{\s*display:\s*none;?\s*\}/, "CSS ẩn mọi phần tử con của khối Khách trừ .khach-ngay");
  const html = docTho("public/order-form.html");
  const ngay = html.slice(html.indexOf('<div class="khach-ngay">'), html.indexOf('<div class="khach-dau">'));
  assert.match(ngay, /id="orderDate"/, "Ngày khởi hành nằm trong .khach-ngay (không bị ẩn)");
  assert.doesNotMatch(ngay, /customerName|customerPhone|booker-slot/, "tên, SĐT, bên đặt nằm NGOÀI .khach-ngay (bị ẩn)");
  assert.match(html, /<section class="card buoc" data-buoc-khoi="khach"[^>]*>\s*<div class="khach-ngay">/, "khối khách mở đầu bằng .khach-ngay: CSS :not(.khach-ngay) áp đúng khối đó");
});

test("công tắc ẩn khách: validate bỏ need(tên, SĐT) khi anKhach; collect không gửi các khoá khách khi anKhach; không dựng khối Hành khách khi ẩn", () => {
  const form = doc("web/order-form.ts");
  assert.equal(form.match(/need\("customerName"/g)?.length, 1, "need(tên) chỉ còn MỘT chỗ gọi");
  assert.match(form, /if\s*\(!anKhach\)\s*\{\s*need\("customerName",[^\n]*\n\s*need\("customerPhone",/, "need(tên, SĐT) nằm trong if (!anKhach)");
  const collect = form.slice(form.indexOf("function collect()"), form.indexOf("// ---- khoá form, banner lỗi ----"));
  const ra = collect.indexOf("if (anKhach) return chung;");
  assert.ok(ra > 0, "collect trả thân không khoá khách khi anKhach");
  for (const khoa of ["customerName:", "customerPhone:", "customerEmail:", "customerNote:", "passengers:", "gopBenDat("]) {
    const vt = collect.indexOf(khoa);
    assert.ok(vt > ra, `${khoa} chỉ nằm SAU lệnh trả sớm (không bao giờ gửi khi anKhach)`);
  }
  assert.match(form, /if\s*\(!anKhach\s*&&\s*can\(staff,\s*"order\.passenger\.write"/, "lập đơn mới: không dựng khối Hành khách khi ẩn");
  assert.match(form, /if\s*\(suaKhachCuaNhap\s*&&\s*!anKhach\)/, "sửa nháp: không tải danh sách hành khách khi ẩn (thân không có khoá passengers ⇒ máy chủ giữ danh sách đang lưu)");
  assert.match(form, /daChonNguoi:\s*handlerPick\s*!==\s*null,\s*anKhach\b/, "thanh tiến độ: bước Khách ✓ chỉ cần ngày khởi hành khi ẩn");
});

test("công tắc vừa tắt khi form đang ẩn: lỗi lưu → hienLaiKhoiKhachNeuCan đọc lại công tắc, hỏi luật thuần canHienLaiKhoiKhach, rồi hiện khối + tiêu điểm vào Tên khách", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /await hienLaiKhoiKhachNeuCan\(err\)/, "onSaveError gọi hàm hiện lại");
  const ham = form.slice(form.indexOf("async function hienLaiKhoiKhachNeuCan"), form.indexOf("// ---- khởi động ----"));
  assert.match(ham, /err\.status\s*!==\s*400\)\s*return/, "chỉ lỗi 400 mới đọc lại công tắc");
  assert.match(ham, /canHienLaiKhoiKhach\(\{\s*dangAn:\s*anKhach,\s*loi:\s*err,\s*apChoToi\s*\}\)/, "quyết bằng luật thuần, không tự suy");
  assert.match(ham, /datAnKhach\(false\);[\s\S]*dungLaiKhoiKhach\(\);[\s\S]*field\("customerName"\)\.focus\(\)/, "hiện lại khối khách, dựng lại khối Hành khách, tiêu điểm vào Tên khách");
});
