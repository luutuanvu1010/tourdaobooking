// Danh mục trường chỉnh được của bảng điều khiển giao diện (ADR-0194 đợt 1, nhiệm vụ 1) + luật thuần cộng gộp nhiều quyền.
// Hàng rào: (a) mọi trường danh mục có thật trong `contracts.ts` (đọc tên từ interface); (b) mọi trường mà máy chủ BẮT BUỘC phải có mặt trong danh mục với
// cờ «không được ẩn / không được bỏ bắt buộc»; (c) luật cộng gộp: ẩn chỉ khi MỌI quyền ẩn; bỏ bắt buộc chỉ khi mọi quyền bỏ; dòng ngoài danh mục / cờ không cho thì bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHE_DO, DANH_MUC_UI, MAN_UI, giaiChinhSach, laCheDoHopLe, timMuc, type DongChinhSach } from "./ui-truong.ts";
import { PERMISSION_CODES } from "./permissions.ts";

const CONTRACTS = readFileSync(new URL("./contracts.ts", import.meta.url), "utf8");

/** Tên các trường khai trong thân `export interface <ten> … { … }` của contracts.ts (đếm ngoặc nhọn; bỏ trường lồng sâu hơn mức 1). */
function truongCua(ten: string): Set<string> {
  const m = new RegExp(`export interface ${ten}\\b[^{]*\\{`).exec(CONTRACTS);
  assert.ok(m, `contracts.ts không có interface ${ten}`);
  let sau = m.index + m[0].length;
  let muc = 1;
  const kq = new Set<string>();
  let dong = "";
  for (; sau < CONTRACTS.length && muc > 0; sau++) {
    const c = CONTRACTS[sau]!;
    if (c === "{") muc++;
    else if (c === "}") muc--;
    if (muc === 1 && c !== "\n") dong += c;
    if (c === "\n" || muc === 0) {
      const t = /^\s*(?:readonly\s+)?([A-Za-z_]\w*)\??\s*:/.exec(dong);
      if (t) kq.add(t[1]!);
      dong = "";
    }
  }
  return kq;
}

test("(a) mọi mục danh mục có thật trong interface khai ở contracts.ts", () => {
  assert.ok(DANH_MUC_UI.length > 0);
  for (const m of DANH_MUC_UI) {
    const cac = truongCua(m.giaoDien);
    assert.ok(cac.has(m.truong), `danh mục ${m.man}/${m.truong}: interface ${m.giaoDien} không có trường này`);
  }
});

test("(a2) khoá (màn, trường) không trùng; màn nằm trong MAN_UI; bốn màn của đợt 1 đủ mặt", () => {
  const thay = new Set<string>();
  for (const m of DANH_MUC_UI) {
    assert.ok((MAN_UI as readonly string[]).includes(m.man), `màn lạ ${m.man}`);
    const k = `${m.man}/${m.truong}`;
    assert.ok(!thay.has(k), `trùng ${k}`);
    thay.add(k);
    assert.ok(m.loai === "nhap" || m.loai === "xem");
  }
  assert.deepEqual([...MAN_UI].sort(), ["danh-sach-dich-vu", "danh-sach-tai-khoan", "quan-ly-doi-tac", "tao-don"]);
});

test("(b) trường máy chủ BẮT BUỘC / tiền / ngày đi / người phụ trách có mặt trong danh mục với cờ «không được ẩn, không được bỏ bắt buộc»", () => {
  // Khai ở ĐÂY (bài), không đọc từ danh mục: bớt một dòng khỏi danh mục hoặc bật cờ là bài đỏ.
  const MAY_CHU_BAT_BUOC: readonly (readonly [string, string])[] = [
    ["tao-don", "customerName"], ["tao-don", "customerPhone"], ["tao-don", "services"], ["tao-don", "discount"], ["tao-don", "declaredDeposit"],
    ["tao-don", "paymentTerm"], ["tao-don", "handlerStaffId"], ["tao-don", "bookerPartyId"], ["tao-don", "newBooker"],
  ];
  for (const [man, truong] of MAY_CHU_BAT_BUOC) {
    const m = timMuc(man, truong);
    assert.ok(m, `danh mục thiếu ${man}/${truong}`);
    assert.equal(m.anDuoc, false, `${man}/${truong} không được ẩn`);
    assert.equal(m.boBatBuocDuoc, false, `${man}/${truong} không được bỏ bắt buộc`);
  }
});

test("(b2) phần ADR nêu cho Tạo đơn: email, ghi chú khách, hành khách, ghi chú thanh toán ẩn được", () => {
  for (const t of ["customerEmail", "customerNote", "passengers", "paymentNote"]) assert.equal(timMuc("tao-don", t)?.anDuoc, true, t);
});

test("(b3) ba màn còn lại: chỉ cột xem (loai = xem), không trường nhập; nghi ngờ thì để không ẩn được", () => {
  for (const m of DANH_MUC_UI.filter((x) => x.man !== "tao-don")) assert.equal(m.loai, "xem", `${m.man}/${m.truong}`);
});

const dong = (truong: string, quyen: string, cheDo: string, man = "tao-don"): DongChinhSach => ({ man, truong, quyen, cheDo }) as DongChinhSach;
const kq = (ds: DongChinhSach[], quyen: string[]) => giaiChinhSach(ds, quyen as never);

test("(c1) bảng rỗng = không đổi gì", () => assert.deepEqual(kq([], ["SALES"]), []));

test("(c2) ẩn chỉ khi MỌI quyền của người đó ẩn trường", () => {
  const ds = [dong("passengers", "SALES", "AN")];
  assert.deepEqual(kq(ds, ["SALES"]), [{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]);
  assert.deepEqual(kq(ds, ["SALES", "ACCOUNTING"]), [], "quyền Kế toán không ẩn ⇒ vẫn thấy");
  assert.deepEqual(kq([...ds, dong("passengers", "ACCOUNTING", "AN")], ["SALES", "ACCOUNTING"]), [{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]);
  assert.deepEqual(kq(ds, ["ACCOUNTING"]), []);
});

test("(c3) bắt buộc (trường tuỳ chọn mặc định) chỉ khi MỌI quyền đòi", () => {
  const ds = [dong("customerEmail", "SALES", "BAT_BUOC")];
  assert.deepEqual(kq(ds, ["SALES"]), [{ man: "tao-don", truong: "customerEmail", an: false, batBuoc: true }]);
  assert.deepEqual(kq(ds, ["SALES", "ACCOUNTING"]), []);
});

test("(c4) trường ngoài danh mục, màn lạ, quyền lạ, chế độ lạ ⇒ bỏ qua dòng", () => {
  assert.deepEqual(kq([dong("khongCoTruongNay", "SALES", "AN")], ["SALES"]), []);
  assert.deepEqual(kq([dong("passengers", "SALES", "AN", "man-la")], ["SALES"]), []);
  assert.deepEqual(kq([dong("passengers", "KHONG_PHAI_QUYEN", "AN")], ["KHONG_PHAI_QUYEN"]), []);
  assert.deepEqual(kq([dong("passengers", "SALES", "ANH")], ["SALES"]), []);
});

test("(c5) cờ không cho ⇒ bỏ qua: không ẩn customerName/customerPhone/tiền/dịch vụ; không đòi bắt buộc trường đã bắt buộc", () => {
  for (const t of ["customerName", "customerPhone", "services", "discount", "declaredDeposit", "paymentTerm"]) {
    for (const cd of CHE_DO) assert.deepEqual(kq([dong(t, "SALES", cd)], ["SALES"]), [], `${t}/${cd}`);
  }
});

test("(c6) HIEN và TUY_CHON trên trường tuỳ chọn mặc định không đổi gì; chế độ chỉ áp được cho mục cho phép (laCheDoHopLe)", () => {
  assert.deepEqual(kq([dong("customerNote", "SALES", "HIEN"), dong("paymentNote", "SALES", "TUY_CHON")], ["SALES"]), []);
  assert.equal(laCheDoHopLe("tao-don", "passengers", "AN"), true);
  assert.equal(laCheDoHopLe("tao-don", "passengers", "BAT_BUOC"), true);
  assert.equal(laCheDoHopLe("tao-don", "customerName", "AN"), false);
  assert.equal(laCheDoHopLe("tao-don", "customerName", "HIEN"), true, "HIEN luôn hợp lệ cho mục có trong danh mục (đặt lại mặc định)");
  assert.equal(laCheDoHopLe("tao-don", "khongCo", "HIEN"), false);
  assert.equal(laCheDoHopLe("danh-sach-tai-khoan", "createdAt", "BAT_BUOC"), false, "cột xem không bắt buộc");
});

test("(c7) hợp của mọi quyền: kết quả không phụ thuộc thứ tự quyền / thứ tự dòng", () => {
  const ds = [dong("passengers", "SALES", "AN"), dong("passengers", "INTERN", "AN"), dong("customerNote", "SALES", "AN")];
  const a = kq(ds, ["SALES", "INTERN"]);
  const b = kq([...ds].reverse(), ["INTERN", "SALES"]);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((x) => x.truong), ["passengers"]);
  assert.ok(PERMISSION_CODES.length > 0);
});
