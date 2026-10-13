// CHỮ TÌM DÀI Ở DANH SÁCH ĐƠN (lỗi có sẵn, phát hiện 12/10): `GET /api/orders?q=<chữ>` trả 500 `internal` khi mẫu LIKE `%chữ%` dài quá 50 BYTE — D1 từ chối
// ("LIKE or GLOB pattern too complex"). Tiếng Việt có dấu mỗi chữ 2–3 byte nên 17 chữ là đủ. Khung thử (tests/audit/harness.mjs) nay bắt chước giới hạn đó
// (`kiemMauLike`), nên bài này chạy CẢ ứng dụng như production: trước khi sửa, các bài dưới đây ĐỎ bằng 500.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, GIOI_HAN_MAU_LIKE_BYTE } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const byte = (s: string) => new TextEncoder().encode(s).length;
const ngay = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
async function donMoi(w: any, tenKhach: string): Promise<string> {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: tenKhach, customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: ngay }], depositAmount: 0, depositMethod: "cash" },
  });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const tim = (w: any, q: string, as = ADM) => w.call("GET", `/api/orders?limit=100&q=${encodeURIComponent(q)}`, { as });
const idCua = (r: any): string[] => r.json.orders.map((o: any) => o.id);

// Tên có dấu 41 ký tự = 52 byte ⇒ mẫu `%…%` = 54 byte, vượt 50. (Tên thường như "Nguyễn Thị Phượng Hoàng Yến" chỉ 39 byte nên chưa vượt; chữ nhiều dấu nặng
// như ệ, ợ, ặ — 3 byte — thì 17 chữ đã đủ.) Phần giữ lại khi cắt = 48 byte = 38 ký tự đầu.
const TEN_DAI = "Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm";
const PHAN_DAU = TEN_DAI.slice(0, 38);

test("điều kiện thử: tên dùng ở đây thật sự làm mẫu LIKE vượt giới hạn D1, và PHAN_DAU là phần giữ lại tối đa 48 byte", () => {
  assert.ok(byte(`%${TEN_DAI}%`) > GIOI_HAN_MAU_LIKE_BYTE, `${byte(`%${TEN_DAI}%`)} byte`);
  assert.ok(byte(PHAN_DAU) <= GIOI_HAN_MAU_LIKE_BYTE - 2 && byte(TEN_DAI.slice(0, 39)) > GIOI_HAN_MAU_LIKE_BYTE - 2, `${byte(PHAN_DAU)} byte`);
});

test("tìm bằng cả tên khách dài có dấu → 200 và thấy đúng đơn (trước đây 500 internal)", async () => {
  const w = setup();
  const a = await donMoi(w, TEN_DAI);
  await donMoi(w, "Trần Văn Bình");
  const r = await tim(w, TEN_DAI);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(idCua(r), [a]);
});

test("tìm bằng chuỗi 100 ký tự (mức trần của route) → 200, không 500, dù không khớp đơn nào", async () => {
  const w = setup();
  await donMoi(w, "Trần Văn Bình");
  for (const q of ["ệ".repeat(100), "x".repeat(100), "😀".repeat(50), "%".repeat(100), "_".repeat(100), "\\".repeat(100)]) {
    const r = await tim(w, q);
    assert.equal(r.status, 200, `q = ${q.slice(0, 10)}… (${byte(q)} byte): ${r.text}`);
    assert.deepEqual(idCua(r), [], "không khớp đơn nào");
  }
});

test("chữ tìm dài hơn giới hạn thì tìm theo PHẦN ĐẦU: vẫn thấy đơn cần tìm (kết quả chỉ rộng hơn, không bao giờ mất đơn)", async () => {
  const w = setup();
  const a = await donMoi(w, TEN_DAI);
  const b = await donMoi(w, `${PHAN_DAU}Lan`); // cùng phần đầu được giữ lại, khác phần sau
  const c = await donMoi(w, "Trần Văn Bình");
  const r = await tim(w, `${TEN_DAI} (đã cọc)`); // người gõ thêm chữ thừa ở cuối: vượt cả phần giữ lại
  assert.equal(r.status, 200, r.text);
  const thay = idCua(r);
  assert.ok(thay.includes(a), "phải thấy đơn có tên khớp phần đầu");
  assert.ok(!thay.includes(c), "đơn không liên quan không được lọt vào");
  // Ghi nhận đúng thoả hiệp: đơn b cùng phần đầu nên cũng hiện (rộng hơn), người dùng tự nhìn tên mà chọn.
  assert.ok(thay.includes(b), "đơn cùng phần đầu hiện kèm (tìm theo phần đầu)");
});

test("tìm ngắn vẫn đúng như cũ: ký tự `%` `_` hiểu theo nghĩa đen, tìm theo mã đơn / SĐT / người lập", async () => {
  const w = setup();
  const a = await donMoi(w, "Khách A_B");
  const b = await donMoi(w, "Khách AxB");
  const c = await donMoi(w, "Khách 100% vui");
  assert.deepEqual(idCua(await tim(w, "A_B")), [a], "dấu _ không phải ký tự đại diện");
  assert.deepEqual(idCua(await tim(w, "100%")), [c], "dấu % không phải ký tự đại diện");
  const ma = (w.q("SELECT order_code AS m FROM orders WHERE id = ?", b)[0] as { m: string }).m;
  assert.deepEqual(idCua(await tim(w, ma)), [b], "theo mã đơn");
  assert.equal(idCua(await tim(w, "0912345678")).length, 3, "theo SĐT khách");
  assert.equal(idCua(await tim(w, "Quản trị")).length, 0, "tên người lập thuộc đơn nào không lập thì không khớp");
  assert.equal(idCua(await tim(w, "An")).length, 3, "theo tên người lập (An lập cả ba)");
});
