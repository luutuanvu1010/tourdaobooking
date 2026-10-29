import assert from "node:assert/strict";
import { test } from "node:test";
import { dungDomGia, type NutGia } from "./dom-gia.ts";

dungDomGia();
const { trangThaiHeThong, trangThaiToanTrang } = await import("../web/trang-thai-he-thong.ts");
const nut = (e: unknown) => e as NutGia;

test("rong: một nút việc kế, bấm gọi khiBam một lần", () => {
  let n = 0;
  const s = nut(trangThaiHeThong("rong", { cau: "Chưa có xe nào.", nut: { nhan: "Thêm xe", khiBam: () => n++ } }));
  assert.equal(s.getAttribute("data-loai"), "rong");
  const nuts = s.querySelectorAll("button");
  assert.equal(nuts.length, 1);
  assert.equal(nuts[0]!.textContent, "Thêm xe");
  nuts[0]!.click();
  assert.equal(n, 1);
  assert.ok(s.textContent.includes("Chưa có xe nào."));
});

test("loi-may-chu: hết giờ nói 45 giây, có nút Thử lại gọi thuLai", () => {
  let n = 0;
  const s = nut(trangThaiHeThong("loi-may-chu", { loi: new TypeError("x"), hetGio: true, thuLai: () => n++ }));
  assert.ok(s.textContent.includes("45 giây"));
  const b = s.querySelectorAll("button");
  assert.equal(b.length, 1);
  assert.equal(b[0]!.textContent, "Thử lại");
  b[0]!.click();
  assert.equal(n, 1);
});

test("dang-tai: khung xương theo khuôn, aria-busy, không chữ", () => {
  const s = nut(trangThaiHeThong("dang-tai", { khuon: "danh-sach" }));
  assert.ok(s.querySelector('[data-khuon="danh-sach"]') || s.getAttribute("data-khuon") === "danh-sach");
  assert.equal(s.getAttribute("aria-busy"), "true");
  assert.equal(s.textContent, "");
});

test("403: có liên kết Về trang đầu của bạn tới trangDau", () => {
  const s = nut(trangThaiHeThong("403", { trangDau: "/cuoc" }));
  const a = s.querySelector("a")!;
  assert.equal(a.textContent, "Về trang đầu của bạn");
  assert.equal(a.getAttribute("href"), "/cuoc");
  assert.ok(s.textContent.includes("Bạn không có quyền xem trang này."));
});

test("thieu-ma: liên kết Về <trang cha>", () => {
  const s = nut(trangThaiHeThong("thieu-ma", { doiTuong: "đơn", trangCha: { nhan: "Đơn hàng", href: "/orders" } }));
  const a = s.querySelector("a")!;
  assert.equal(a.textContent, "Về Đơn hàng");
  assert.equal(a.getAttribute("href"), "/orders");
  assert.ok(s.textContent.includes("Thiếu mã đơn."));
});

test("toàn trang: đặt body[data-trang-thai], gỡ aria-current ở thanh, thay nội dung main", () => {
  const doc = (globalThis as unknown as { document: { body: NutGia; createElement: (t: string) => NutGia } }).document;
  const tab = doc.createElement("nav");
  tab.setAttribute("id", "tabbar");
  const a = doc.createElement("a");
  a.setAttribute("aria-current", "page");
  tab.append(a);
  doc.body.append(tab);
  const main = doc.body.querySelector("main")!;
  main.append(doc.createElement("p"));
  trangThaiToanTrang("403", { trangDau: "/" });
  assert.equal(doc.body.dataset.trangThai, "403");
  assert.equal(a.getAttribute("aria-current"), null);
  assert.equal(main.children.length, 1);
  assert.equal(main.children[0]!.getAttribute("data-loai"), "403");
});
