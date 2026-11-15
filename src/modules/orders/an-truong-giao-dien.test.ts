// Luật thuần «trường ẩn / bắt buộc theo chính sách giao diện» của Tạo đơn (ADR-0194 đợt 1, nhiệm vụ 4). Máy chủ quyết, không tin trình duyệt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { thanKhiAnTruong, thieuBatBuoc, truongTaoDon } from "./an-truong-giao-dien.ts";

const tg = (truong: string, an: boolean, batBuoc: boolean, man = "tao-don") => ({ man, truong, an, batBuoc }) as never;
const luu = { customerEmail: "luu@example.com", customerNote: "ghi chú lưu", paymentNote: "tt lưu" };

test("truongTaoDon: chỉ màn tao-don; tách tập ẩn và tập bắt buộc", () => {
  const r = truongTaoDon([tg("passengers", true, false), tg("customerEmail", false, true), tg("unit", true, false, "danh-sach-dich-vu")]);
  assert.deepEqual([...r.an], ["passengers"]);
  assert.deepEqual([...r.batBuoc], ["customerEmail"]);
});

test("thanKhiAnTruong: không ẩn gì ⇒ trả đúng thân gốc (cùng tham chiếu)", () => {
  const b = { customerName: "A", passengers: [] };
  assert.equal(thanKhiAnTruong(b, new Set(), null), b);
});

test("thanKhiAnTruong LẬP: bỏ khoá passengers; email / ghi chú / ghi chú thanh toán ẩn ⇒ rỗng; GIỮ mọi khoá khác; không sửa thân gốc", () => {
  const goc = { customerName: "A", customerPhone: "0900000001", customerEmail: "a@b.c", customerNote: "n", paymentNote: "p", passengers: [{ fullName: "X" }], services: [1] };
  const copy = JSON.parse(JSON.stringify(goc));
  const r = thanKhiAnTruong(goc, new Set(["passengers", "customerEmail", "customerNote", "paymentNote"]), null) as Record<string, unknown>;
  assert.equal("passengers" in r, false);
  assert.equal(r.customerEmail, ""); assert.equal(r.customerNote, ""); assert.equal(r.paymentNote, "");
  assert.equal(r.customerName, "A"); assert.deepEqual(r.services, [1]);
  assert.deepEqual(goc, copy);
});

test("thanKhiAnTruong SỬA nháp: trường ẩn GIỮ giá trị đang lưu (không bị ghi đè bằng rỗng hay giá trị trình duyệt gửi)", () => {
  const r = thanKhiAnTruong({ customerEmail: "gia@x.y", customerNote: "giả", paymentNote: "giả", passengers: [] }, new Set(["customerEmail", "paymentNote", "passengers"]), luu) as Record<string, unknown>;
  assert.equal(r.customerEmail, "luu@example.com");
  assert.equal(r.paymentNote, "tt lưu");
  assert.equal(r.customerNote, "giả", "không ẩn ⇒ giữ nguyên giá trị gửi");
  assert.equal("passengers" in r, false);
});

test("thanKhiAnTruong: thân không phải đối tượng ⇒ trả nguyên để validateOrder báo lỗi như hôm nay", () => {
  for (const x of [null, "x", 5, [1]]) assert.equal(thanKhiAnTruong(x, new Set(["passengers"]), null), x);
});

const v = (o: Record<string, unknown> = {}) => ({ customerEmail: null, customerNote: null, paymentNote: null, passengers: null, ...o }) as never;
test("thieuBatBuoc: không bắt buộc gì ⇒ null", () => assert.equal(thieuBatBuoc(v(), new Set(), null), null));
test("thieuBatBuoc: email / ghi chú / ghi chú thanh toán rỗng hoặc toàn khoảng trắng ⇒ câu tiếng Việt nêu đúng tên ô", () => {
  assert.match(thieuBatBuoc(v(), new Set(["customerEmail"]), null) ?? "", /Email khách/);
  assert.match(thieuBatBuoc(v({ customerEmail: "   " }), new Set(["customerEmail"]), null) ?? "", /Email khách/);
  assert.match(thieuBatBuoc(v(), new Set(["customerNote"]), null) ?? "", /Ghi chú khách/);
  assert.match(thieuBatBuoc(v(), new Set(["paymentNote"]), null) ?? "", /Ghi chú thanh toán/);
  assert.equal(thieuBatBuoc(v({ customerEmail: "a@b.c" }), new Set(["customerEmail"]), null), null);
});
test("thieuBatBuoc passengers: có danh sách ⇒ đạt; danh sách rỗng ⇒ thiếu; khoá vắng (null) ⇒ theo số khách đang lưu (sửa nháp) hoặc thiếu (lập)", () => {
  const b = new Set(["passengers"]);
  assert.equal(thieuBatBuoc(v({ passengers: [{}] }), b, null), null);
  assert.match(thieuBatBuoc(v({ passengers: [] }), b, null) ?? "", /Danh sách khách/);
  assert.match(thieuBatBuoc(v({ passengers: null }), b, null) ?? "", /Danh sách khách/, "lập: không có khoá = thiếu");
  assert.equal(thieuBatBuoc(v({ passengers: null }), b, 2), null, "sửa nháp: đang lưu 2 khách");
  assert.match(thieuBatBuoc(v({ passengers: null }), b, 0) ?? "", /Danh sách khách/);
});

// ================= ADR-0195 Đ4–Đ6: trường cấp DỊCH VỤ (flightCode, paxOverride, note) ====================================================================================
import { apTruongDichVu, traDichVu } from "./an-truong-giao-dien.ts";

const dvTg = (truong: string, an: boolean, batBuoc: boolean, dieuKien?: string) => ({ man: "dich-vu-trong-don", truong, an, batBuoc, ...(dieuKien ? { dieuKien } : {}) }) as never;
const KD = "DICH_VU_KHONG_DON";
const CD = "DICH_VU_CO_DON";
const leg = (id: string | null, direction: "OUT" | "RETURN", flightCode: string | null | undefined, paxOverride: number | null | undefined) => ({ id, direction, flightCode, paxOverride });
const dichVu = (id: string | null, pickupChoice: "DON" | "KHONG_DON" | null, note: string | null, legs: ReturnType<typeof leg>[]) => ({ id, pickupChoice, trip: { note, departDate: "2026-12-01" }, legs });
const don = (...services: ReturnType<typeof dichVu>[]) => ({ customerName: "A", services }) as never;
const daLuu = [{ id: "S1", trip: { note: "ghi chú lưu" }, legs: [{ id: "L1", flightCode: "VN100" }, { id: "L2", flightCode: null }] }];
const ap = (o: unknown, ds: unknown[], luu = daLuu) => apTruongDichVu(o as never, luu, traDichVu(ds as never)) as { order: any; thieu: string | null };

test("apTruongDichVu: không chính sách nào ⇒ trả đúng đối tượng gốc (cùng tham chiếu), không câu thiếu", () => {
  const o = don(dichVu("S1", "KHONG_DON", "x", [leg("L1", "OUT", "VN9", null)]));
  const r = ap(o, []);
  assert.equal(r.order, o);
  assert.equal(r.thieu, null);
});

test("ẩn note cho dịch vụ KHÔNG ĐÓN: giá trị gửi lên bỏ, giá trị đang lưu giữ; dịch vụ CÓ ĐÓN giữ nguyên giá trị gửi lên (điều kiện tính từng dịch vụ)", () => {
  const ds = [dvTg("note", true, false, KD)];
  const o = don(dichVu("S1", "KHONG_DON", "gửi lên", []), dichVu("S1", "DON", "gửi lên ở dịch vụ có đón", []));
  const r = ap(o, ds);
  assert.equal(r.order.services[0].trip.note, "ghi chú lưu");
  assert.equal(r.order.services[1].trip.note, "gửi lên ở dịch vụ có đón");
  assert.equal(o.services[0].trip.note, "gửi lên", "không sửa đối tượng gốc");
});

test("ẩn note: dịch vụ MỚI (id null) hoặc đơn mới (không có gì đang lưu) ⇒ null; chưa chọn đón (null) không thoả điều kiện nào ⇒ không ẩn theo dòng điều kiện", () => {
  const ds = [dvTg("note", true, false, KD)];
  assert.equal(ap(don(dichVu(null, "KHONG_DON", "giả", [])), ds).order.services[0].trip.note, null);
  assert.equal(ap(don(dichVu("S1", "KHONG_DON", "giả", [])), ds, []).order.services[0].trip.note, null, "lập đơn: nhóm lưu rỗng");
  assert.equal(ap(don(dichVu("S1", null, "giữ nguyên", [])), ds).order.services[0].trip.note, "giữ nguyên");
});

test("ẩn không điều kiện (dòng trống) áp cho mọi dịch vụ, kể cả chưa chọn đón; dòng có điều kiện HIEN đè dòng trống", () => {
  const ds = [dvTg("note", true, false), dvTg("note", false, false, CD)];
  const o = don(dichVu("S1", "KHONG_DON", "a", []), dichVu("S1", "DON", "b", []), dichVu("S1", null, "c", []));
  const r = ap(o, ds);
  assert.deepEqual(r.order.services.map((s: any) => s.trip.note), ["ghi chú lưu", "b", "ghi chú lưu"]);
});

test("ẩn flightCode / paxOverride: ô gửi lên thành VẮNG (undefined) để giaiOPhuNhap chép giá trị đang lưu; ô khác của chặng giữ nguyên", () => {
  const ds = [dvTg("flightCode", true, false), dvTg("paxOverride", true, false)];
  const r = ap(don(dichVu("S1", "DON", null, [leg("L1", "OUT", "VN9", 3), leg(null, "RETURN", "VN7", 2)])), ds);
  for (const l of r.order.services[0].legs) {
    assert.equal(l.flightCode, undefined);
    assert.equal(l.paxOverride, undefined);
  }
  assert.deepEqual(r.order.services[0].legs.map((l: any) => [l.id, l.direction]), [["L1", "OUT"], [null, "RETURN"]]);
  // chỉ ẩn flightCode: paxOverride gửi lên giữ
  const r2 = ap(don(dichVu("S1", "DON", null, [leg("L1", "RETURN", "VN9", 3)])), [dvTg("flightCode", true, false)]);
  assert.equal(r2.order.services[0].legs[0].flightCode, undefined);
  assert.equal(r2.order.services[0].legs[0].paxOverride, 3);
});

test("điều kiện tính từ giá trị HIỆU LỰC: dịch vụ nhận pickupChoice đã hợp (đang lưu khi khoá vắng) — hàm dùng đúng giá trị trên dịch vụ đã qua validateOrder", () => {
  const ds = [dvTg("note", true, false, KD)];
  // sv.pickupChoice là giá trị hiệu lực (validateOrder đã chép từ đang lưu khi khoá vắng): ở đây mô phỏng KHONG_DON do chép từ lưu
  assert.equal(ap(don(dichVu("S1", "KHONG_DON", "giả", [])), ds).order.services[0].trip.note, "ghi chú lưu");
  // đổi sang DON trong cùng lần lưu ⇒ không còn ẩn: giá trị gửi lên được dùng
  assert.equal(ap(don(dichVu("S1", "DON", "mới", [])), ds).order.services[0].trip.note, "mới");
});

test("bắt buộc cấp dịch vụ: note đòi thì dịch vụ trống ⇒ câu tiếng Việt nêu số dịch vụ; flightCode đòi: chặng không có số (cả đang lưu) ⇒ thiếu; có đủ ⇒ null; ẩn thì không đòi", () => {
  const dsNote = [dvTg("note", false, true, CD)];
  const r = ap(don(dichVu("S1", "DON", "có", []), dichVu("S2", "DON", "  ", [])), dsNote);
  assert.match(r.thieu ?? "", /Dịch vụ 2/);
  assert.match(r.thieu ?? "", /Ghi chú của dịch vụ/);
  assert.equal(ap(don(dichVu("S1", "KHONG_DON", "", [])), dsNote).thieu, null, "dịch vụ không đón: điều kiện CÓ ĐÓN không áp");
  const dsBay = [dvTg("flightCode", false, true)];
  assert.match(ap(don(dichVu("S1", "DON", null, [leg("L2", "OUT", undefined, null)])), dsBay).thieu ?? "", /Số hiệu chuyến bay/);
  assert.equal(ap(don(dichVu("S1", "DON", null, [leg("L1", "OUT", undefined, null)])), dsBay).thieu, null, "vắng khoá nhưng đã lưu số ⇒ đủ");
  assert.equal(ap(don(dichVu("S1", "DON", null, [leg(null, "OUT", "VN1", null)])), dsBay).thieu, null);
  assert.match(ap(don(dichVu("S1", "DON", null, [leg(null, "OUT", "", null)])), dsBay).thieu ?? "", /Số hiệu chuyến bay/);
  assert.equal(ap(don(dichVu("S1", "DON", null, [])), dsBay).thieu, null, "dịch vụ không có chặng thì không đòi số hiệu");
  assert.equal(ap(don(dichVu("S1", "DON", null, [leg("L2", "OUT", undefined, null)])), [dvTg("flightCode", true, false)]).thieu, null);
});

test("truongTaoDon bỏ qua mục có điều kiện (chỉ màn tao-don, mục không điều kiện)", () => {
  const r = truongTaoDon([tg("passengers", true, false), { man: "tao-don", truong: "customerNote", an: true, batBuoc: false, dieuKien: "DICH_VU_KHONG_DON" } as never]);
  assert.deepEqual([...r.an], ["passengers"]);
});
