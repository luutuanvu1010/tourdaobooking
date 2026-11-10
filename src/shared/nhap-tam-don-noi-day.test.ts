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

test("không tệp web/ nào ghi bản chụp vào localStorage (chỉ sessionStorage — ADR-0192 mục 2)", () => {
  const vi: string[] = [];
  for (const ten of readdirSync(new URL("../../web/", import.meta.url)).filter((t) => t.endsWith(".ts"))) {
    const nguon = ma(`web/${ten}`);
    if (DAU_KHOA.test(nguon) && /localStorage/.test(nguon)) vi.push(ten);
  }
  assert.deepEqual(vi, [], "tệp vừa nhắc khoá bản chụp vừa đụng localStorage");
});
