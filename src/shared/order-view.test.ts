import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrderItemDto, OrderServiceDto } from "./contracts.ts";
import { catalogTag, cauKhoaXacNhan, khongQuyenSuaText, orderActions, paxFullText, serviceView, suaChuyenDuoc, suaKhachDuoc, type OrderActions, cauChuaCoNgay } from "./order-view.ts";
import { can, PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

const NO_TRIP = { departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
const item = (o: Partial<OrderItemDto> = {}): OrderItemDto => ({
  id: "i1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo Nha Trang — Người lớn", detail: null,
  quantity: 2, unitPrice: 1350000, catalogPrice: 1350000, lineTotal: 2700000, ...o,
});
const svc = (o: Partial<OrderServiceDto> = {}): OrderServiceDto => ({
  id: "s1", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo Nha Trang", unit: "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 0 },
  items: [item(), item({ id: "i2", paxCode: "child", description: "Tour 4 đảo Nha Trang — Trẻ em", quantity: 1, unitPrice: 900000, catalogPrice: 950000, lineTotal: 900000 })],
  catalogStatus: null, ...NO_TRIP, ...o,
});

test("serviceView (theo người): chip đơn vị, mã, số khách từng loại, dòng tiền kèm độ lệch so với giá danh mục, tổng dịch vụ", () => {
  const v = serviceView(svc());
  assert.deepEqual([v.id, v.name, v.code, v.unit, v.pax, v.subtotal, v.tag], ["s1", "Tour 4 đảo Nha Trang", "TD101", "theo người", "2 người lớn · 1 trẻ em", 3600000, null]);
  assert.deepEqual(v.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.lineTotal, l.catalogPrice, l.deviation]), [
    ["Tour 4 đảo Nha Trang — Người lớn", 2, 1350000, 2700000, 1350000, null],
    ["Tour 4 đảo Nha Trang — Trẻ em", 1, 900000, 900000, 950000, -50000],
  ]);
});

test("serviceView (nhập tay): không mã, chip 'nhập tay', số khách vận hành, KHÔNG BAO GIỜ có độ lệch giá", () => {
  const v = serviceView(svc({
    kind: "manual", catalogCode: null, name: "Xe đưa đón riêng", unit: "manual", pax: { adult: 3, child: 0, senior: 0, infant: 0 },
    items: [item({ catalogCode: null, paxCode: null, description: "Xe 7 chỗ 2 chiều", detail: "Cả đoàn", quantity: 1, unitPrice: 800000, catalogPrice: null, lineTotal: 800000 })],
  }));
  assert.deepEqual([v.code, v.unit, v.pax, v.subtotal], [null, "nhập tay", "3 khách", 800000]);
  assert.deepEqual(v.lines.map((l) => [l.detail, l.deviation]), [["Cả đoàn", null]]);
});

test("serviceView (theo nhóm): '7 khách', chip nhóm; số lượt nằm ở dòng tiền", () => {
  const v = serviceView(svc({
    name: "Phao chuối", catalogCode: "TTB03", unit: "per5Pax", pax: { adult: 7, child: 0, senior: 0, infant: 0 },
    items: [item({ catalogCode: "TTB03", description: "Phao chuối — Người lớn", quantity: 2, unitPrice: 1500000, catalogPrice: 1500000, lineTotal: 3000000 })],
  }));
  assert.deepEqual([v.unit, v.pax, v.subtotal, v.lines[0]!.quantity], ["theo nhóm 5 khách/lượt", "7 khách", 3000000, 2]);
});

test("serviceView: thông tin chuyến — chưa có ngày → dòng cảnh báo; khách có mặt không ngày = 'Cùng ngày khởi hành'", () => {
  assert.deepEqual(serviceView(svc()).trip, [{ label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }]);
  const v = serviceView(svc({ departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00", note: "Đón trước cổng" }));
  assert.deepEqual(v.trip, [
    { label: "Khởi hành", value: "20/09/2026 · 07:30", warn: false },
    { label: "Khách có mặt", value: "Cùng ngày khởi hành · 09:00", warn: false },
    { label: "Ghi chú", value: "Đón trước cổng", warn: false },
  ]);
});

test("serviceView(s, ngày của đơn) (bản 1.39): dịch vụ cùng ngày với đơn không lặp dòng \"Khởi hành\" (chỉ còn giờ nếu có)", () => {
  const v = serviceView(svc({ departDate: "2026-09-20", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" }), "2026-09-20");
  assert.deepEqual(v.trip, [
    { label: "Giờ khởi hành", value: "07:30", warn: false },
  ]);
  assert.deepEqual(serviceView(svc(), null).trip, [{ label: "Khởi hành", value: "Chưa có ngày khởi hành", warn: true }]);
});

test("paxFullText (bản 1.39): số khách viết đủ chữ cho dải đầu trang đơn, bỏ loại 0 khách, đúng thứ tự; không khách → \"\"", () => {
  assert.equal(paxFullText({ adult: 8, child: 1, senior: 0, infant: 0 }), "8 người lớn, 1 trẻ em");
  assert.equal(paxFullText({ adult: 2, child: 0, senior: 1, infant: 1 }), "2 người lớn, 1 người cao tuổi, 1 em bé");
  assert.equal(paxFullText({ adult: 0, child: 0, senior: 0, infant: 0 }), "");
});

test("catalogTag: chỉ hai trạng thái có nhãn; ok/null không nhãn; serviceView mang nhãn theo catalogStatus", () => {
  assert.deepEqual(catalogTag("price_changed"), { tone: "warning", text: "Giá danh mục đã đổi" });
  assert.deepEqual(catalogTag("unavailable"), { tone: "muted", text: "Dịch vụ đã ẩn khỏi danh mục" });
  assert.equal(catalogTag("ok"), null);
  assert.equal(catalogTag(null), null);
  assert.equal(serviceView(svc({ catalogStatus: "unavailable" })).tag?.text, "Dịch vụ đã ẩn khỏi danh mục");
});

test("serviceView: đơn giá cao hơn giá danh mục → độ lệch dương; giá 0 (em bé miễn phí) khớp giá danh mục 0 → không lệch", () => {
  const v = serviceView(svc({ items: [item({ unitPrice: 1400000, catalogPrice: 1350000, lineTotal: 2800000 }), item({ id: "i3", paxCode: "infant", quantity: 1, unitPrice: 0, catalogPrice: 0, lineTotal: 0 })] }));
  assert.deepEqual(v.lines.map((l) => l.deviation), [50000, null]);
});

test("orderActions: nút theo trạng thái và quyền; đơn đã xác nhận khoá dịch vụ/tiền và chỉ còn sửa chuyến", () => {
  const A = (o: Partial<OrderActions>): OrderActions => ({ edit: false, confirm: false, editTrip: false, cancel: false, noPermission: false, locked: false, ...o });
  assert.deepEqual(orderActions("draft", true, true), A({ edit: true, confirm: true, cancel: true }));
  assert.deepEqual(orderActions("draft", false, false), A({ noPermission: true }));
  assert.deepEqual(orderActions("confirmed", true, true), A({ editTrip: true, cancel: true, locked: true }));
  assert.deepEqual(orderActions("confirmed", false, false), A({ noPermission: true, locked: true }));
  assert.deepEqual(orderActions("cancelled", true, true), A({}));
  assert.deepEqual(orderActions("cancelled", false, false), A({ noPermission: true }));
});

// Vòng sửa 1 (I-2): câu "Chỉ <người lập>, người phụ trách đơn hoặc quản trị viên mới được sửa…" mâu thuẫn khi CHÍNH người đang xem là người phụ trách mà
// là hướng dẫn viên (order.modify ô FIELD = none). Câu cho HDV nói điều trang này không làm được và nhờ ai — không hứa nút cụ thể.
test("khongQuyenSuaText: HDV (chỉ xem đơn mình phụ trách) — câu riêng, KHÔNG nói 'người phụ trách đơn … mới được sửa'; đơn đã xác nhận chỉ tới mục “Việc của tôi”", () => {
  const hdv = { permissions: ["FIELD"] as const };
  const daXacNhan = khongQuyenSuaText({ ownerName: "Sales Một", status: "confirmed", viewer: hdv });
  assert.equal(daXacNhan, "Hướng dẫn viên không sửa, xác nhận hoặc huỷ đơn ở trang này. Việc hướng dẫn viên làm được với đơn đã xác nhận nằm ở mục “Việc của tôi” (trang Tôi); việc khác, nhờ Sales Một (người lập đơn) hoặc văn phòng.");
  for (const status of ["draft", "cancelled"] as const) {
    assert.equal(khongQuyenSuaText({ ownerName: "Sales Một", status, viewer: hdv }), "Hướng dẫn viên không sửa, xác nhận hoặc huỷ đơn ở trang này — cần đổi gì, nhờ Sales Một (người lập đơn) hoặc văn phòng.", status);
  }
  for (const c of [daXacNhan]) assert.ok(!c.includes("người phụ trách đơn"), c);
});

test("khongQuyenSuaText: người khác (kế toán, bán hàng không liên quan, tài khoản ghép) giữ nguyên câu cũ", () => {
  for (const perms of [["ACCOUNTING"], ["SALES"], ["FIELD", "INTERN"]] as const) {
    assert.equal(
      khongQuyenSuaText({ ownerName: "Sales Một", status: "draft", viewer: { permissions: perms } }),
      "Chỉ Sales Một (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.",
      JSON.stringify(perms),
    );
  }
});

// L1 (lỗi báo 30/9): Đối tác / Thực tập sửa, xác nhận, huỷ đơn MÌNH lập (order.modify = own) nhưng KHÔNG sửa thông tin chuyến / đổi khách sau xác nhận
// (order.trip.edit = none) — trước đây nút "Sửa thông tin chuyến" và "Đổi khách" vẫn hiện (chỉ dựa canModify) rồi máy chủ trả 403.
test("orderActions: đơn đã xác nhận, sửa được đơn nhưng KHÔNG có quyền sửa chuyến → không nút sửa chuyến/đổi khách, vẫn huỷ được", () => {
  const A = (o: Partial<OrderActions>): OrderActions => ({ edit: false, confirm: false, editTrip: false, cancel: false, noPermission: false, locked: false, ...o });
  assert.deepEqual(orderActions("confirmed", true, false), A({ cancel: true, locked: true }));
  assert.deepEqual(orderActions("draft", true, false), A({ edit: true, confirm: true, cancel: true }), "đơn nháp không đổi (sửa chuyến của nháp đi qua nút Sửa)");
});

test("suaChuyenDuoc: Đối tác, Thực tập với đơn mình lập → false; Bán hàng người lập / người phụ trách, Quản trị → true; không sửa được đơn → false", () => {
  const w = (id: string, ...permissions: PermissionCode[]) => ({ id, permissions });
  assert.equal(suaChuyenDuoc(w("p", "PARTNER"), "p", true), false, "Đối tác, đơn mình lập");
  assert.equal(suaChuyenDuoc(w("i", "INTERN"), "i", true), false, "Thực tập, đơn mình lập");
  assert.equal(suaChuyenDuoc(w("s", "SALES"), "s", true), true, "Bán hàng lập đơn");
  assert.equal(suaChuyenDuoc(w("s", "SALES"), "khac", true), true, "Bán hàng đang phụ trách (máy chủ đã cho sửa)");
  assert.equal(suaChuyenDuoc(w("a", "ADMIN"), "khac", true), true, "Quản trị");
  assert.equal(suaChuyenDuoc(w("s", "SALES"), "khac", false), false, "máy chủ không cho sửa");
  assert.equal(suaChuyenDuoc(w("x", "SALES", "PARTNER"), "x", true), true, "tài khoản lai Bán hàng + Đối tác, đơn mình lập");
  assert.equal(suaChuyenDuoc(w("x", "FIELD", "INTERN"), "x", true), false, "tài khoản lai HDV + Thực tập, đơn mình lập");
});

// Bài ghim: giao diện KHÔNG biết chắc "đang phụ trách" (lời gọi người phụ trách có thể lỗi) nên suaChuyenDuoc suy phạm vi từ cờ canModify của máy chủ.
// Bài này thử MỌI tổ hợp quyền (2^9) × {người lập, không} × {đang phụ trách, không}: kết quả phải BẰNG ĐÚNG điều máy chủ quyết
// (`can(order.modify)` rồi `can(order.trip.edit)` với phạm vi thật — orders/index.ts, route PUT …/trip và PUT …/booker). Bản đồ quyền đổi làm lệch → đỏ.
test("suaChuyenDuoc khớp máy chủ ở mọi tổ hợp quyền × người lập × đang phụ trách", () => {
  let lech = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const viewer = { id: "toi", permissions };
    for (const ownerId of ["toi", "khac"]) {
      for (const assigned of [true, false]) {
        const scope = { ownerId, assigned };
        const canModify = can(viewer, "order.modify", scope);
        const mayChu = canModify && can(viewer, "order.trip.edit", scope);
        if (suaChuyenDuoc(viewer, ownerId, canModify) !== mayChu) lech++;
      }
    }
  }
  assert.equal(lech, 0);
});

// ADR-0047 Phần B (bản vẽ M3, M5): nút "Sửa danh sách" theo ô order.passenger.write — cùng cách suy phạm vi với suaChuyenDuoc; khớp máy chủ (route
// GET/POST …/passengers, PUT /api/orders có khoá passengers) ở mọi tổ hợp.
test("suaKhachDuoc khớp máy chủ (order.passenger.write) ở mọi tổ hợp quyền × người lập × đang phụ trách", () => {
  let lech = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const viewer = { id: "toi", permissions };
    for (const ownerId of ["toi", "khac"]) {
      for (const assigned of [true, false]) {
        const scope = { ownerId, assigned };
        if (suaKhachDuoc(viewer, ownerId, can(viewer, "order.modify", scope)) !== can(viewer, "order.passenger.write", scope)) lech++;
      }
    }
  }
  assert.equal(lech, 0);
  assert.equal(suaKhachDuoc({ id: "p", permissions: ["PARTNER"] }, "p", true), true, "Đối tác, đơn mình lập");
  assert.equal(suaKhachDuoc({ id: "k", permissions: ["ACCOUNTING"] }, "x", false), false, "Kế toán");
});

test("cauKhoaXacNhan (D5, bản vẽ M3): câu khoá đơn đã xác nhận theo những gì người xem còn sửa được", () => {
  assert.equal(cauKhoaXacNhan(true, true), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được thông tin chuyến, đưa đón và danh sách hành khách.");
  assert.equal(cauKhoaXacNhan(false, true), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được danh sách hành khách.");
  assert.equal(cauKhoaXacNhan(false, false), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá.");
});

test("cauKhoaXacNhan (ADR-0063 D1, phiếu kiểm A2 V-1): không còn nói 'số khách đã khoá'; người có nút sửa số khách được kể nút đó", () => {
  assert.equal(cauKhoaXacNhan(true, true, true), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được số khách (nút “Sửa số khách dịch vụ”), thông tin chuyến, đưa đón và danh sách hành khách.");
  assert.equal(cauKhoaXacNhan(false, false, true), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được số khách (nút “Sửa số khách dịch vụ”).");
  for (const a of [true, false]) for (const b of [true, false]) for (const c of [true, false]) assert.doesNotMatch(cauKhoaXacNhan(a, b, c), /số khách và tiền|số khách.*đã khoá/);
});

test("khongQuyenSuaText + nút sửa số khách (ADR-0063 D1, phiếu kiểm A2 V-1): Kế toán thấy nút thì câu nói rõ số khách sửa được", () => {
  assert.equal(
    khongQuyenSuaText({ ownerName: "Sales Một", status: "confirmed", viewer: { permissions: ["ACCOUNTING"] }, suaSoKhach: true }),
    "Chỉ Sales Một (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này. Số khách thì bạn sửa được bằng nút “Sửa số khách dịch vụ”.",
  );
});

// YC-0016 (24/10): đơn nháp lưu được khi chưa chọn ngày, nhưng máy chủ chặn xác nhận — trang đơn phải nói thẳng vì sao, không để người dùng bấm rồi mới thấy lỗi.
test("cauChuaCoNgay: có dịch vụ chưa có ngày khởi hành ⇒ câu nhắc; đủ ngày hoặc chưa có dịch vụ ⇒ null", () => {
  assert.equal(cauChuaCoNgay([{ departDate: "2026-11-01" }, { departDate: null }]), "Chưa chọn ngày khởi hành — chưa xác nhận được. Bấm «Sửa» để chọn ngày.");
  assert.equal(cauChuaCoNgay([{ departDate: "" }]), "Chưa chọn ngày khởi hành — chưa xác nhận được. Bấm «Sửa» để chọn ngày.");
  assert.equal(cauChuaCoNgay([{ departDate: "2026-11-01" }]), null);
  assert.equal(cauChuaCoNgay([]), null);
});
