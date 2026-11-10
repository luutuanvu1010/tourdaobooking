// ADR-0194 đợt 1, nhiệm vụ 4: MÁY CHỦ áp chính sách giao diện ở lập / sửa nháp đơn. Ẩn passengers ⇒ khoá bị bỏ, PUT giữ danh sách cũ; ẩn email / ghi chú ⇒ giữ giá trị đang lưu;
// bắt buộc ⇒ 400 câu tiếng Việt; người nhiều quyền chỉ bị ẩn khi mọi quyền ẩn; trường luật nền cần không ẩn được. Chạy CẢ ứng dụng trên SQLite thật; tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const U = "/api/cai-dat/giao-dien";
const MIX = "88888888-8888-4888-8888-888888888811"; // Bán hàng + Kế toán
const PAX = (ten: string) => ({ fullName: ten, birthYear: 1990, paxCode: "adult" });
type W = ReturnType<typeof setup>;
function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: MIX, phone: "0900000031", name: "Hai Quyền", perms: ["SALES", "ACCOUNTING"] });
  return w;
}
const chinhSach = async (w: W, ...thayDoi: { truong: string; quyen: string; cheDo: string }[]) => {
  const r = await w.call("POST", U, { as: SUP, body: { man: "tao-don", thayDoi } });
  assert.equal(r.status, 200, r.text);
};
const than = (extra: Record<string, unknown> = {}) => ({ customerName: "Tên Giả", customerPhone: "0966666666", services: [svc("ZB1", inDays(3))], ...extra });
const lap = (w: W, as: string, extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: than(extra) });
async function lap201(w: W, as: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await lap(w, as, extra);
  assert.equal(r.status, 201, r.text);
  return r.json.order.id as string;
}
const dong = (w: W, id: string) => ({ ...w.q("SELECT customer_email AS email, customer_note AS ghiChu, payment_note AS tt FROM orders WHERE id = ?", id)[0] });
const tenKhach = (w: W, id: string): string[] => w.q("SELECT full_name AS ten FROM ord_passenger WHERE order_id = ? AND voided_at IS NULL ORDER BY created_at, rowid", id).map((r: any) => r.ten);
async function sua(w: W, id: string, as: string, extra: Record<string, unknown> = {}) {
  const doc = (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
  return w.call("PUT", `/api/orders/${id}`, { as, body: { ...than({ services: [{ ...svc("ZB1", inDays(3)), id: doc.services[0].id }] }), expectedUpdatedAt: doc.updatedAt, ...extra } });
}

test("bảng rỗng: lập và sửa như hôm nay (khách, email, ghi chú đều lưu)", async () => {
  const w = dung();
  const id = await lap201(w, A, { customerEmail: "a@b.co", customerNote: "ghi", paymentNote: "tt", passengers: [PAX("Khách Một")] });
  assert.deepEqual(dong(w, id), { email: "a@b.co", ghiChu: "ghi", tt: "tt" });
  assert.deepEqual(tenKhach(w, id), ["Khách Một"]);
});

test("ẩn passengers cho Bán hàng: LẬP bỏ khoá; SỬA giữ danh sách cũ (không xoá–chèn lại)", async () => {
  const w = dung();
  const cu = await lap201(w, A, { passengers: [PAX("Khách Cũ")] }); // trước khi ẩn
  await chinhSach(w, { truong: "passengers", quyen: "SALES", cheDo: "AN" });
  const moi = await lap201(w, A, { passengers: [PAX("Khách Giả Gửi Lên")] });
  assert.deepEqual(tenKhach(w, moi), [], "khoá bị máy chủ bỏ");
  const r = await sua(w, cu, A, { passengers: [PAX("Khách Đổi Ngầm"), PAX("Thêm")] });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(tenKhach(w, cu), ["Khách Cũ"], "danh sách đang lưu giữ nguyên");
});

test("người có Bán hàng + quyền khác chưa ẩn vẫn nhập được khách; quyền khác (Kế toán) cũng ẩn thì mới ẩn", async () => {
  const w = dung();
  await chinhSach(w, { truong: "passengers", quyen: "SALES", cheDo: "AN" });
  const a = await lap201(w, MIX, { passengers: [PAX("Hai Quyền Nhập")] });
  assert.deepEqual(tenKhach(w, a), ["Hai Quyền Nhập"]);
  await chinhSach(w, { truong: "passengers", quyen: "ACCOUNTING", cheDo: "AN" });
  const b = await lap201(w, MIX, { passengers: [PAX("Bị Bỏ")] });
  assert.deepEqual(tenKhach(w, b), []);
});

test("ẩn email / ghi chú khách / ghi chú thanh toán: LẬP ⇒ rỗng; SỬA ⇒ giữ giá trị đang lưu, dù trình duyệt gửi giá trị khác", async () => {
  const w = dung();
  const cu = await lap201(w, A, { customerEmail: "cu@b.co", customerNote: "ghi cũ", paymentNote: "tt cũ" });
  await chinhSach(w, { truong: "customerEmail", quyen: "SALES", cheDo: "AN" }, { truong: "customerNote", quyen: "SALES", cheDo: "AN" }, { truong: "paymentNote", quyen: "SALES", cheDo: "AN" });
  const moi = await lap201(w, A, { customerEmail: "gia@b.co", customerNote: "giả", paymentNote: "giả" });
  assert.deepEqual(dong(w, moi), { email: null, ghiChu: null, tt: null }, "rỗng (null hoặc '' tuỳ cột) — không mang giá trị giả");
  const r = await sua(w, cu, A, { customerEmail: "khac@b.co", customerNote: "khác", paymentNote: "khác" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(dong(w, cu), { email: "cu@b.co", ghiChu: "ghi cũ", tt: "tt cũ" });
});

test("bắt buộc email: thiếu ⇒ 400 câu tiếng Việt, không tạo đơn; đủ ⇒ 201; SỬA nháp thiếu ⇒ 400; sau khi đặt lại mặc định lập như cũ", async () => {
  const w = dung();
  const cu = await lap201(w, A, { customerEmail: "cu@b.co" });
  await chinhSach(w, { truong: "customerEmail", quyen: "SALES", cheDo: "BAT_BUOC" });
  const soDon = () => Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
  const truoc = soDon();
  const thieu = await lap(w, A);
  assert.equal(thieu.status, 400, thieu.text);
  assert.match(thieu.json.error.message, /Email khách/);
  assert.equal(soDon(), truoc);
  assert.equal((await lap(w, A, { customerEmail: "co@b.co" })).status, 201);
  assert.equal((await sua(w, cu, A, { customerEmail: "" })).status, 400);
  assert.equal((await sua(w, cu, A, { customerEmail: "moi@b.co" })).status, 200);
  await chinhSach(w, { truong: "customerEmail", quyen: "SALES", cheDo: "HIEN" });
  assert.equal((await lap(w, A)).status, 201);
});

test("bắt buộc passengers: lập không có khách ⇒ 400; có khách ⇒ 201; sửa nháp không gửi khoá nhưng đã lưu khách ⇒ 200", async () => {
  const w = dung();
  const cu = await lap201(w, A, { passengers: [PAX("Khách Lưu")] });
  await chinhSach(w, { truong: "passengers", quyen: "SALES", cheDo: "BAT_BUOC" });
  const khong = await lap(w, A);
  assert.equal(khong.status, 400, khong.text);
  assert.match(khong.json.error.message, /Danh sách khách/);
  assert.equal((await lap(w, A, { passengers: [PAX("Có Khách")] })).status, 201);
  assert.equal((await sua(w, cu, A)).status, 200, "không gửi khoá ⇒ giữ danh sách đang lưu, đã có khách");
  const trong = await lap201(w, MIX); // MIX chưa bị chính sách (Kế toán không đòi) ⇒ lập được không khách
  assert.deepEqual(tenKhach(w, trong), []);
  assert.equal((await sua(w, trong, MIX)).status, 200, "người nhiều quyền không bị đòi khi sửa nháp");
});

test("luật nền không đổi: bắt buộc tên / SĐT vẫn do máy chủ (THIEU_TEN…), chính sách ngoài danh mục bị bỏ qua dù nằm sẵn trong bảng", async () => {
  const w = dung();
  const at = new Date(Date.now() - 5000).toISOString();
  w.sqlite.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, updated_at) VALUES ('x1','tao-don','customerName','SALES','AN',?,?,?)").run(at, at, at);
  const r = await lap(w, A, { customerName: "" });
  assert.equal(r.status, 400, "tên rỗng vẫn bị luật nền chặn");
  assert.equal((await lap(w, A)).status, 201, "dòng ẩn customerName bị bỏ qua: tên gửi lên vẫn được dùng");
  assert.equal(w.q("SELECT customer_name AS t FROM orders ORDER BY created_at DESC LIMIT 1")[0].t, "Tên Giả");
});

test("công tắc ADR-0154 đang áp cho Đối tác ⇒ chính sách giao diện KHÔNG chen vào (một nơi quyết mỗi trường)", async () => {
  const w = dung();
  const PARTNER = "88888888-8888-4888-8888-888888888801";
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000041", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  assert.equal((await w.call("POST", "/api/cai-dat/an-thong-tin-khach", { as: SUP, body: { bat: true } })).status, 200);
  await chinhSach(w, { truong: "customerEmail", quyen: "PARTNER", cheDo: "BAT_BUOC" });
  const r = await lap(w, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.ok(ACC);
});
