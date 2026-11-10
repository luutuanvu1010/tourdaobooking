// ADR-0192: hàng rào NỐI DÂY của bản chụp form đơn lúc hết phiên. Luật thuần ở ./nhap-tam-don.test.ts; bài này đọc mã nguồn giao diện để khẳng định các chỗ nối còn đó
// (bỏ một lời gọi ⇒ đỏ). Nó KHÔNG chứng minh hành vi trên trình duyệt — việc đó do kịch bản Chrome (Task 5A.4). Ca «initShell gọi nenXoaKhiMoTrang» và «logout xoá»
// chờ chủ chọn chỗ dọn (trần gói trang Đơn hàng), sẽ thêm ở bước sau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

/** Đọc tệp, bỏ chú thích `//` và `/* … *\/` để chữ nằm trong chú thích không được tính. */
const ma = (duongDan: string): string =>
  readFileSync(new URL(`../../${duongDan}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

/** Thân một hàm (từ `function <tên>(` tới dấu `}` khớp). */
function thanHam(nguon: string, ten: string): string {
  const dau = nguon.search(new RegExp(`function ${ten}\\(`));
  assert.ok(dau >= 0, `không thấy hàm ${ten}`);
  const mo = nguon.indexOf("{", nguon.indexOf(")", dau));
  let sau = 0;
  for (let i = mo; i < nguon.length; i++) {
    if (nguon[i] === "{") sau++;
    else if (nguon[i] === "}" && --sau === 0) return nguon.slice(mo, i + 1);
  }
  throw new Error(`hàm ${ten} không đóng`);
}

const DAU_KHOA = /TIEN_TO_NHAP_TAM|khoaNhapTam|td-nhap-don/;
const orderForm = ma("web/order-form.ts");

test("xoaKhungNho KHÔNG xoá bản chụp (hàm đó chạy ngay trong goLogin, sẽ xoá bản vừa chụp — ADR-0192 mục 5)", () => {
  assert.doesNotMatch(thanHam(ma("web/khung-nho.ts"), "xoaKhungNho"), DAU_KHOA);
});

test("goLogin vẫn gọi xoaKhungNho (ADR-0035) và vẫn để dấu hết phiên trước khi chuyển trang", () => {
  const api = ma("web/api.ts");
  const go = thanHam(api, "goLogin");
  assert.match(go, /xoaKhungNho\(\)/);
  assert.match(go, /ghiNhoLyDoDangXuat\(\)[\s\S]*location\.replace/);
  assert.match(thanHam(api, "ghiNhoLyDoDangXuat"), /sessionStorage\.setItem\(SESSION_ENDED_KEY/);
});

test("form đơn chỉ chụp ở pagehide khi goLogin vừa để dấu hết phiên (ADR-0192 mục 2)", () => {
  assert.match(orderForm, /addEventListener\("pagehide"/);
  assert.match(orderForm, /sessionStorage\.getItem\(SESSION_ENDED_KEY\) !== null/);
});

test("form đơn khôi phục qua quyetKhoiPhuc và xoá bản chụp ngay khi đọc (khôi phục một lần)", () => {
  assert.match(orderForm, /quyetKhoiPhuc\(/);
  assert.match(orderForm, /sessionStorage\.removeItem\(khoaNhapTam\(staff\.id\)\)/);
});

test("lưu thành công thì xoá bản chụp trước mọi lần chuyển trang; Đối tác đặt donVuaTao sau lưu, trước gửi", () => {
  const luu = thanHam(orderForm, "luu");
  const sauLuu = luu.slice(luu.search(/await api<Api\.OrderResponse>\("\/api\/orders"/));
  const xoa = sauLuu.search(/xoaNhapTam\(\)/);
  assert.ok(xoa > 0, "không xoá bản chụp sau khi lưu thành công");
  assert.ok(xoa < sauLuu.indexOf("location.replace"), "xoá bản chụp phải chạy trước location.replace");
  const dat = sauLuu.search(/donVuaTao = order\.id/);
  assert.ok(dat > 0 && dat < sauLuu.indexOf("/gui-don`"), "donVuaTao phải được gán sau khi lưu, trước lời gọi gửi");
  assert.ok((sauLuu.match(/donVuaTao = null/g) ?? []).length >= 2, "gửi xong và nhánh gửi hỏng đều phải trả donVuaTao về null");
});

test("chụp giá trị ô bằng chính hàm dựng thân lưu nháp (collect), bản nháp thẻ và dòng hành khách — không liệt kê lại ô; «đơn đã tạo» không mang giá trị ô", () => {
  const chup = thanHam(orderForm, "chupForm");
  assert.match(chup, /than: collect\(\)/);
  assert.match(chup, /dv: drafts\(\)/);
  assert.match(chup, /hk: hk\?\.rows\(\)/);
  assert.doesNotMatch(chup, /field\(/, "chupForm không tự đọc ô — ô thường đi qua collect()");
  assert.match(orderForm, /loai: "form", staffId: staff\.id, at: Date\.now\(\), orderId: editId, updatedAt: orderUpdatedAt, o: chupForm\(\)/);
  assert.doesNotMatch(orderForm.match(/\{ loai: "da-tao"[^}]*\}/)?.[0] ?? "", /\bo:/, "bản «đơn đã tạo» không được mang giá trị ô (ADR-0192 mục 6)");
});

test("khôi phục đi qua chính đường nạp đơn: fill và apBanChup cùng dùng napO + napThe; hành khách qua dungKhoiKhach", () => {
  const fill = thanHam(orderForm, "fill");
  assert.match(fill, /napO\(o, \(\) => napBenDat\(o\)\)/);
  assert.match(fill, /napThe\(/);
  const ap = thanHam(orderForm, "apBanChup");
  assert.match(ap, /napO\(o, /);
  assert.match(ap, /napThe\(g\.dv\.map/);
  assert.match(ap, /dungKhoiKhach\(/);
});

test("đơn đã tạo chuyển trang NGAY khi mở form; quyetKhoiPhuc cho bản chụp giá trị ô (cả đơn đang sửa) gọi SAU khi nạp đơn, rồi xoá khoá", () => {
  const som = orderForm.search(/if \(banChup\?\.loai !== "form"\) \{\s*xoaNhapTam\(\);\s*const kq = quyetKhoiPhuc\(banChup, staff\.id, Date\.now\(\), editId, null\);/);
  assert.ok(som > 0, "thiếu bước đọc sớm cho «đơn đã tạo»");
  assert.ok(som < orderForm.indexOf("await Promise.all("), "bước đọc sớm phải chạy trước khi nạp danh mục / đơn");
  const muon = orderForm.search(/const kq = quyetKhoiPhuc\(banChup, staff\.id, Date\.now\(\), editId, orderUpdatedAt\);[^\n]*\n\s*xoaNhapTam\(\);/);
  assert.ok(muon > 0, "thiếu bước quyết bản chụp giá trị ô bằng updatedAt máy chủ, xoá khoá ngay sau");
  assert.ok(muon > orderForm.indexOf("await loadOrder()"), "bản chụp của đơn đang sửa phải quyết SAU khi nạp đơn (có updatedAt máy chủ)");
  assert.ok(muon < orderForm.indexOf("donDaNap = true;"), "phải quyết trước khi đánh dấu form đã nạp xong");
  assert.match(orderForm, /fill\(o: Api\.OrderDetailDto\): string\[\] \{[\s\S]*?orderUpdatedAt = o\.updatedAt/, "fill phải đặt orderUpdatedAt từ máy chủ");
});

test("không tệp web/ nào ghi bản chụp vào localStorage (chỉ sessionStorage — ADR-0192 mục 2)", () => {
  const vi: string[] = [];
  for (const ten of readdirSync(new URL("../../web/", import.meta.url)).filter((t) => t.endsWith(".ts"))) {
    const nguon = ma(`web/${ten}`);
    if (DAU_KHOA.test(nguon) && /localStorage/.test(nguon)) vi.push(ten);
  }
  assert.deepEqual(vi, [], "tệp vừa nhắc khoá bản chụp vừa đụng localStorage");
});
