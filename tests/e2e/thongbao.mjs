// Hộp thông báo (ADR-0034): tin về đơn là hình chiếu của nhật ký; K1 ẩn tên; E3; hai ngăn; số chưa đọc = danh sách.
//
// Ca "lập đơn kèm HDV → đúng một tin lap, không giao, không cho_nhan" (mục "Phụ thuộc ADR-0030" điểm 4 của kế hoạch) CHƯA thêm ở đây:
// ADR-0030 Task 1.3 (chọn HDV lúc lập ghi created + order_handler_changed CÙNG mốc) chưa lên main. Thêm khi nhánh đó gộp.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, session, sql } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA), B = await session(ACCOUNTS.salesB), KT = await session(ACCOUNTS.accountant), TQ = await session(ACCOUNTS.superAdmin);
assert.equal((await call(null, "GET", "/api/thong-bao")).status, 401);

// A lập đơn (không chọn người phụ trách) trên danh mục giả.
await ensureFakeCatalog();
const taoDon = async (cookie) => {
  const x = await call(cookie, "POST", "/api/orders", orderInput());
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order; // có .id và .orderCode
};
const don = await taoDon(A);
const tatKT = (await call(KT, "GET", "/api/thong-bao?ngan=tat-ca")).body;
const tin = tatKT.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tin && tin.cau.startsWith(ACCOUNTS.salesA.name + " vừa lập đơn"), "Kế toán thấy tên người lập");
assert.equal(tin.cuaToi, false);
const tatB = await call(B, "GET", "/api/thong-bao?ngan=tat-ca");
const tinB = tatB.body.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tinB, "B thấy tin lập đơn ở ngăn Tất cả");
// Chỉ kiểm tin của ĐÚNG đơn này: dữ liệu e2e cũ (dispatch.mjs, orders.mjs) có đơn A lập mà B phụ trách → B được thấy tên A hợp lệ ở đó.
assert.ok(!JSON.stringify(tinB).includes(ACCOUNTS.salesA.name), "K1: Bán hàng B không thấy tên A ở đơn không phải của mình");
const tuA = (await call(A, "GET", "/api/thong-bao?ngan=tat-ca")).body;
assert.ok(!tuA.tin.some((t) => t.maDon === don.orderCode), "E3: A không thấy tin của chính mình");
console.log("✓ tin về đơn: K1, E3");

// Số chưa đọc = số tin cuaToi&&chuaDoc; mở hộp = đọc hết
for (const c of [A, B, KT]) {
  const tt = (await call(c, "GET", "/api/thong-bao/tom-tat")).body;
  const cua = (await call(c, "GET", "/api/thong-bao?ngan=cua-toi")).body;
  assert.equal(tt.soChuaDoc, cua.tin.filter((t) => t.chuaDoc).length);
}
assert.equal((await call(KT, "POST", "/api/account/thong-bao/da-doc")).status, 200);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0);
console.log("✓ số chưa đọc khớp danh sách; mở hộp = đọc hết");

// Tài khoản mới tạo sau khi có tin: không đổ dồn tin cũ (mốc = ngày tạo tài khoản) — Review Focus 4
await sql(`UPDATE staff SET created_at = '${new Date().toISOString()}' WHERE phone = '${ACCOUNTS.accountant.phone}'`);
await sql(`DELETE FROM ntf_read_mark WHERE staff_id = (SELECT id FROM staff WHERE phone = '${ACCOUNTS.accountant.phone}')`);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0);
console.log("✓ tài khoản mới không bị đổ dồn tin cũ");

// Đã hiểu: tin không tồn tại / không thuộc nhóm nhận → 404
assert.equal((await call(A, "POST", `/api/account/thong-bao/${randomUUID()}/da-hieu`)).status, 404);
console.log("THONGBAO (đọc) OK");
