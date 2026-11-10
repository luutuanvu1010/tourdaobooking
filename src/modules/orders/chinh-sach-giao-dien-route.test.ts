// ADR-0194 đợt 1, nhiệm vụ 4: MÁY CHỦ áp chính sách giao diện ở lập / sửa nháp đơn. Ẩn passengers ⇒ khoá bị bỏ, PUT giữ danh sách cũ; ẩn email / ghi chú ⇒ giữ giá trị đang lưu;
// bắt buộc ⇒ 400 câu tiếng Việt; người nhiều quyền chỉ bị ẩn khi mọi quyền ẩn; trường luật nền cần không ẩn được. Chạy CẢ ứng dụng trên SQLite thật; tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, INTERN, SUP, inDays, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

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


// ================= ADR-0195 Đ4–Đ6: trường cấp DỊCH VỤ + điều kiện ==========================================================================================================
const DV = "dich-vu-trong-don";
const KD = "DICH_VU_KHONG_DON";
const CD = "DICH_VU_CO_DON";
const chinhSachDv = async (w: W, ...thayDoi: { truong: string; quyen: string; cheDo: string; dieuKien?: string | null }[]) => {
  const r = await w.call("POST", U, { as: SUP, body: { man: DV, thayDoi } });
  assert.equal(r.status, 200, r.text);
};
const D3 = inDays(3);
/** Dịch vụ KHÔNG ĐÓN (không chặng) / CÓ ĐÓN (một chặng chiều đi) / không đón NHƯNG có chặng (để thử ô chặng). */
const dvKhongDon = (extra: Record<string, unknown> = {}) => svc("ZB1", D3, [], extra);
const dvCoDon = (extra: Record<string, unknown> = {}, legExtra: Record<string, unknown> = {}) => svc("ZB1", D3, [{ ...leg(D3, "09:00"), ...legExtra }], extra);
const dvKdCoChang = (extra: Record<string, unknown> = {}, legExtra: Record<string, unknown> = {}) => svc("ZB1", D3, [{ ...leg(D3, "09:00"), ...legExtra }], { pickupChoice: "KHONG_DON", ...extra });
const lapDv = async (w: W, as: string, services: unknown[]): Promise<{ id: string; dv: string[] }> => {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Tên Giả", customerPhone: "0966666666", services } });
  assert.equal(r.status, 201, r.text);
  return { id: r.json.order.id as string, dv: r.json.order.services.map((x: { id: string }) => x.id) };
};
const suaDv = async (w: W, id: string, as: string, dich: (doc: any) => unknown[], boKhoa: string[] = []) => {
  const doc = (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
  const services = dich(doc).map((x: any) => { for (const k of boKhoa) delete x[k]; return x; });
  return w.call("PUT", `/api/orders/${id}`, { as, body: { customerName: "Tên Giả", customerPhone: "0966666666", services, expectedUpdatedAt: doc.updatedAt } });
};
const notes = (w: W, id: string): (string | null)[] => w.q("SELECT note FROM order_service WHERE order_id = ? ORDER BY sort_order", id).map((r: any) => r.note);
const bay = (w: W, id: string): (string | null)[] => w.q("SELECT flight_code AS f FROM ord_transfer_leg WHERE order_id = ? AND closed_at IS NULL ORDER BY created_at, rowid", id).map((r: any) => r.f);

test("ẩn note cho KHÔNG ĐÓN: LẬP bỏ ghi chú dịch vụ không đón, dịch vụ CÓ ĐÓN vẫn lưu ghi chú (điều kiện tính từng dịch vụ)", async () => {
  const w = dung();
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN", dieuKien: KD });
  const { id } = await lapDv(w, A, [dvKhongDon({ note: "ghi giả" }), dvCoDon({ note: "giờ đón 9h" })]);
  assert.deepEqual(notes(w, id), [null, "giờ đón 9h"]);
});

test("ẩn note rồi SỬA nháp: giá trị đang lưu CÒN dù trình duyệt gửi giá trị khác; dịch vụ có đón sửa bình thường; dịch vụ MỚI (không id) ghi rỗng", async () => {
  const w = dung();
  const { id } = await lapDv(w, A, [dvKhongDon({ note: "ghi cũ" }), dvCoDon({ note: "đón cũ" })]); // trước khi ẩn
  assert.deepEqual(notes(w, id), ["ghi cũ", "đón cũ"]);
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN", dieuKien: KD });
  const r = await suaDv(w, id, A, (doc) => [
    { ...dvKhongDon({ note: "đổi ngầm" }), id: doc.services[0].id }, { ...dvCoDon({ note: "đón mới" }), id: doc.services[1].id }, dvKhongDon({ note: "dịch vụ mới giả" }),
  ]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(notes(w, id), ["ghi cũ", "đón mới", null]);
});

test("khoá pickupChoice VẮNG khi sửa: điều kiện lấy từ giá trị ĐANG LƯU (dịch vụ lưu KHÔNG ĐÓN vẫn ẩn note)", async () => {
  const w = dung();
  const { id } = await lapDv(w, A, [dvKhongDon({ note: "ghi cũ" })]);
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN", dieuKien: KD });
  const r = await suaDv(w, id, A, (doc) => [{ ...dvKhongDon({ note: "đổi ngầm" }), id: doc.services[0].id }], ["pickupChoice"]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(notes(w, id), ["ghi cũ"]);
});

test("người lập ĐỔI lựa chọn đón trong cùng lần lưu: điều kiện tính từ giá trị MỚI (không đón → có đón: ô hiện lại, giá trị gửi lên được dùng)", async () => {
  const w = dung();
  const { id } = await lapDv(w, A, [dvKhongDon({ note: "ghi cũ" })]);
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN", dieuKien: KD });
  const r = await suaDv(w, id, A, (doc) => [{ ...dvCoDon({ note: "đón mới 9h" }), id: doc.services[0].id }]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(notes(w, id), ["đón mới 9h"]);
});

test("ẩn không điều kiện: áp cho mọi dịch vụ; người nhiều quyền (Bán hàng + Kế toán) chỉ bị ẩn khi mọi quyền ẩn", async () => {
  const w = dung();
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN" });
  const a = await lapDv(w, MIX, [dvCoDon({ note: "giữ vì Kế toán không ẩn" })]);
  assert.deepEqual(notes(w, a.id), ["giữ vì Kế toán không ẩn"]);
  const b = await lapDv(w, A, [dvCoDon({ note: "bị bỏ" }), dvKhongDon({ note: "bị bỏ" })]);
  assert.deepEqual(notes(w, b.id), [null, null]);
  await chinhSachDv(w, { truong: "note", quyen: "ACCOUNTING", cheDo: "AN" });
  const c = await lapDv(w, MIX, [dvCoDon({ note: "giờ bị bỏ" })]);
  assert.deepEqual(notes(w, c.id), [null]);
});

test("dòng điều kiện HIEN đè dòng trống AN: dịch vụ có đón vẫn ghi chú, dịch vụ không đón bị ẩn", async () => {
  const w = dung();
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "AN" }, { truong: "note", quyen: "SALES", cheDo: "HIEN", dieuKien: CD });
  const { id } = await lapDv(w, A, [dvKhongDon({ note: "bỏ" }), dvCoDon({ note: "giữ" })]);
  assert.deepEqual(notes(w, id), [null, "giữ"]);
});

test("ẩn flightCode cho KHÔNG ĐÓN: LẬP bỏ số gửi lên; SỬA giữ số đang lưu của chặng cùng id; chặng của dịch vụ CÓ ĐÓN đổi bình thường", async () => {
  const w = dung();
  const { id } = await lapDv(w, A, [dvKdCoChang({}, { flightCode: "VN100" }), dvCoDon({}, { flightCode: "VN200" })]);
  assert.deepEqual(bay(w, id).sort(), ["VN100", "VN200"]);
  await chinhSachDv(w, { truong: "flightCode", quyen: "SALES", cheDo: "AN", dieuKien: KD });
  const moi = await lapDv(w, A, [dvKdCoChang({}, { flightCode: "VN999" })]);
  assert.deepEqual(bay(w, moi.id), [null], "lập: ô ẩn ⇒ rỗng");
  const r = await suaDv(w, id, A, (doc) => doc.services.map((s: any, i: number) => ({
    ...(i === 0 ? dvKdCoChang({}, { id: s.legs[0].id, flightCode: "VN555" }) : dvCoDon({}, { id: s.legs[0].id, flightCode: "VN666" })), id: s.id,
  })));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(bay(w, id).sort(), ["VN100", "VN666"], "dịch vụ không đón giữ VN100; dịch vụ có đón nhận VN666");
});

test("ẩn paxOverride rồi sửa: không bị 403 «chỉ văn phòng đổi số người chiều về», số đang lưu GIỮ; hiện lại thì Thực tập gửi số khác vẫn bị 403 như luật nền", async () => {
  const w = dung();
  const ret = { direction: "RETURN", pickupDate: D3, pickupTime: "16:00", pickupLocationId: null, pickupPlace: "Cảng", dropoffLocationId: null, dropoffPlace: "Khách sạn" };
  const { id } = await lapDv(w, INTERN, [dvKdCoChang()].map((x: any) => ({ ...x, legs: [{ ...leg(D3, "09:00") }, ret] })));
  const t = new Date(Date.now() + 60_000).toISOString();
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pax_override = 2, updated_at = ? WHERE order_id = ? AND direction = 'RETURN' AND closed_at IS NULL").run(t, id);
  w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(t, id);
  const gui = (so: number) => (doc: any) => [{ ...dvKdCoChang(), id: doc.services[0].id, legs: doc.services[0].legs.map((l: any) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...(l.direction === "RETURN" ? { paxOverride: so } : {}) })) }];
  const truocAn = await suaDv(w, id, INTERN, gui(1));
  assert.equal(truocAn.status, 403, "chưa ẩn: luật nền chặn Thực tập đổi số người chiều về");
  await chinhSachDv(w, { truong: "paxOverride", quyen: "INTERN", cheDo: "AN", dieuKien: KD });
  const r = await suaDv(w, id, INTERN, gui(1));
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT pax_override AS n FROM ord_transfer_leg WHERE order_id = ? AND direction = 'RETURN' AND closed_at IS NULL", id)[0].n, 2);
});

test("bắt buộc ghi chú cho dịch vụ CÓ ĐÓN: thiếu ⇒ 400 nêu số dịch vụ, không tạo đơn; dịch vụ không đón không bị đòi; SỬA thiếu ⇒ 400", async () => {
  const w = dung();
  await chinhSachDv(w, { truong: "note", quyen: "SALES", cheDo: "BAT_BUOC", dieuKien: CD });
  const soDon = () => Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
  const truoc = soDon();
  const thieu = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Tên Giả", customerPhone: "0966666666", services: [dvKhongDon(), dvCoDon()] } });
  assert.equal(thieu.status, 400, thieu.text);
  assert.match(thieu.json.error.message, /Dịch vụ 2/);
  assert.match(thieu.json.error.message, /Ghi chú/);
  assert.equal(soDon(), truoc);
  const { id } = await lapDv(w, A, [dvKhongDon(), dvCoDon({ note: "đủ" })]);
  assert.equal((await suaDv(w, id, A, (doc) => [{ ...dvKhongDon(), id: doc.services[0].id }, { ...dvCoDon({ note: "" }), id: doc.services[1].id }])).status, 400);
  assert.equal((await suaDv(w, id, A, (doc) => [{ ...dvKhongDon(), id: doc.services[0].id }, { ...dvCoDon({ note: "vẫn đủ" }), id: doc.services[1].id }])).status, 200);
});

test("công tắc ADR-0154 đang áp cho Đối tác ⇒ chính sách cấp dịch vụ cũng KHÔNG chen vào", async () => {
  const w = dung();
  const PARTNER = "88888888-8888-4888-8888-888888888802";
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000042", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  assert.equal((await w.call("POST", "/api/cai-dat/an-thong-tin-khach", { as: SUP, body: { bat: true } })).status, 200);
  await chinhSachDv(w, { truong: "note", quyen: "PARTNER", cheDo: "AN" });
  const { id } = await lapDv(w, PARTNER, [dvKhongDon({ note: "đối tác ghi" })]);
  assert.deepEqual(notes(w, id), ["đối tác ghi"]);
});
