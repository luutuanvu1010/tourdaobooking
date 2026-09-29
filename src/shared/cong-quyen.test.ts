// ADR-0019: cổng của router là DANH SÁCH mã quyền khai tường minh, không suy từ ô nào của MATRIX. Tệp này (1) khoá ba danh sách — đổi danh
// sách = sửa test trong cùng commit, người rà thấy ngay; (2) đối chiếu danh sách với bảng (lưới báo lệch, không phải định nghĩa); (3) chứng minh
// phần B KHÔNG đổi hành vi với bất kỳ tổ hợp quyền nào (so với công thức cũ, chép nguyên văn vào đây).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_GATE, MATRIX, OFFICE_GATE, ORDERS_GATE, PERMISSION_CODES, can, canAccessOrders, isOffice, passesAdminGate, seesAllOrders, type PermissionCode } from "./permissions.ts";

test("ADR-0019: ba danh sách cổng khai tường minh (khoá giá trị)", () => {
  assert.deepEqual([...ADMIN_GATE], ["ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual([...OFFICE_GATE], ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"]);
  // ADR-0030 S23-5 (sửa ADR-0019 điều 1): FIELD vào cổng orders cùng lần phát hành với phần xem của ADR-0023 — đúng thứ tự PERMISSION_CODES.
  assert.deepEqual([...ORDERS_GATE], ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN"]);
});

test("ADR-0019: đối chiếu danh sách với bảng — cổng orders chỉ gồm mã xem được ít nhất một đơn; cổng office chỉ gồm mã xem mọi hồ sơ", () => {
  for (const c of ORDERS_GATE) assert.notEqual(MATRIX["order.view"][c], "none", `${c} qua cổng orders nhưng order.view = none`);
  for (const c of OFFICE_GATE) assert.equal(MATRIX["party.view"][c], "any", `${c} qua cổng office nhưng party.view ≠ any`);
});

test("ADR-0019 điều 2: money.view = order.view ở mọi cột; contact.view ⊇ order.view — lệch thì phải làm phần bỏ trường", () => {
  for (const c of PERMISSION_CODES) {
    assert.equal(MATRIX["money.view"][c], MATRIX["order.view"][c], `money.view lệch order.view ở ${c}`);
    const v = MATRIX["order.view"][c], k = MATRIX["contact.view"][c];
    assert.ok(v === "none" || k === v || k === "any" || (k === "ownOrAssigned" && (v === "own" || v === "assigned")), `contact.view hẹp hơn order.view ở ${c}`);
  }
});

// NGOẠI LỆ CÓ TÊN (ADR-0030 S23-5): hướng dẫn viên qua cổng orders nhưng KHÔNG lập đơn (order.create = none) nên không có "đơn mình lập" để xem giá;
// money.view của FIELD = assigned (giá của đơn mình PHỤ TRÁCH). Route /api/catalog/for-order chặn FIELD ở chốt order.create TRƯỚC câu hỏi money.view.
const KHONG_LAP_DON: readonly PermissionCode[] = ["FIELD"];

test("ADR-0019 + ADR-0033: GET /api/catalog/for-order hỏi money.view phạm vi 'của mình' — mọi mã qua cổng orders đều qua (Đối tác/Thực tập đọc được danh mục), trừ ngoại lệ có tên FIELD (không lập đơn)", () => {
  // Route danh mục cho người lập đơn (src/modules/catalog/index.ts, ADR-0033; trước đó là GET /api/catalog ở cổng orders — ADR-0028 điều 1) gọi
  // can(staff, "money.view", { ownerId: staff.id }) sau chốt order.create. Hỏi KHÔNG ngữ cảnh sẽ trả sai cho mã `own` (PARTNER, INTERN) và làm họ
  // mất danh mục ở form lập đơn — bài này đỏ nếu ai đó thu hẹp ô money.view của một mã trong ORDERS_GATE về none/assigned.
  for (const c of ORDERS_GATE) {
    const who = { id: `u-${c}`, permissions: [c] as PermissionCode[] };
    if (KHONG_LAP_DON.includes(c)) {
      // Ngoại lệ chỉ hợp lệ khi mã đó THẬT SỰ không lập đơn — nới order.create của FIELD thì bài này đỏ, buộc xem lại money.view.
      assert.equal(MATRIX["order.create"][c], "none", `${c} là ngoại lệ "không lập đơn" nhưng order.create ≠ none`);
      assert.equal(can(who, "money.view", { ownerId: who.id }), false, `${c}: ngoại lệ đã hết cần (xem được giá đơn mình lập) — bỏ khỏi KHONG_LAP_DON`);
      continue;
    }
    assert.ok(can(who, "money.view", { ownerId: who.id }), `${c} qua cổng orders nhưng không xem được giá của đơn mình lập → mất danh mục ở form lập đơn`);
  }
});

// ĐỔI CÓ CHỦ ĐÍCH (ADR-0030 S23-5): tổ hợp có FIELD mà KHÔNG có mã nào khác của ORDERS_GATE cũ (SALES, ACCOUNTING, ADMIN, PARTNER, SUPER_ADMIN, INTERN)
// nay qua cổng orders. Với 9 mã hôm nay có ĐÚNG BỐN tổ hợp như vậy: chỉ-FIELD, FIELD+DRIVER, FIELD+DRIVER_PARTNER, FIELD+DRIVER+DRIVER_PARTNER.
// Liệt kê TƯỜNG MINH, không suy. FIELD+DRIVER (ADR-0040 D3): qua cổng orders NHỜ FIELD (ADR-0030 S23-5); DRIVER không thêm gì (không nằm trong cổng nào).
// Hai tổ hợp có DRIVER_PARTNER (ADR-0048 D2): cũng qua NHỜ FIELD — DRIVER_PARTNER không nằm trong cổng nào. Hai tổ hợp này BẤT HỢP LỆ về dữ liệu (LC-1b:
// tài khoản giữ DRIVER_PARTNER không giữ quyền nào khác — trigger + lời kiểm máy chủ) nhưng hàm cổng thuần không biết luật đó nên vẫn liệt kê.
const DOI_CO_CHU_Y_CANH_CUA_DON = new Set(["FIELD", "FIELD+DRIVER", "FIELD+DRIVER_PARTNER", "FIELD+DRIVER+DRIVER_PARTNER"]);

test("ADR-0019 phần B không đổi hành vi: với mọi tổ hợp 9 mã quyền, isOffice/canAccessOrders mới = công thức cũ — trừ đúng các tổ hợp liệt kê ở ADR-0030 S23-5 (bốn tổ hợp chỉ có FIELD trong cổng cũ)", () => {
  const oldIsOffice = (w: { id: string; permissions: readonly PermissionCode[] }) => can(w, "order.view");
  const oldCanAccessOrders = (w: { id: string; permissions: readonly PermissionCode[] }) => oldIsOffice(w) || can(w, "order.view", { ownerId: w.id });
  const seen = new Set<string>();
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const who = { id: "x", permissions: PERMISSION_CODES.filter((_, i) => mask & (1 << i)) };
    const key = who.permissions.join("+");
    assert.equal(isOffice(who), oldIsOffice(who), `isOffice lệch: ${key}`);
    if (DOI_CO_CHU_Y_CANH_CUA_DON.has(key)) {
      seen.add(key);
      assert.equal(oldCanAccessOrders(who), false, `${key}: công thức cũ vốn đã cho qua — không phải đổi có chủ đích`);
      assert.equal(canAccessOrders(who), true, `${key}: ADR-0030 S23-5 — nay qua cổng orders`);
      continue;
    }
    assert.equal(canAccessOrders(who), oldCanAccessOrders(who), `canAccessOrders lệch: ${key}`);
    // Kiểm ĐỊNH NGHĨA (seesAllOrders được định nghĩa đúng bằng biểu thức này) — không phải bằng chứng giữ hành vi; chỉ chặn ai đó lặng lẽ đổi định nghĩa.
    assert.equal(seesAllOrders(who), can(who, "order.view"), `seesAllOrders lệch: ${who.permissions.join("+")}`);
  }
  assert.deepEqual(seen, DOI_CO_CHU_Y_CANH_CUA_DON, "mọi tổ hợp đổi có chủ đích phải thật sự được gặp (danh sách không được cũ)");
});

test("ADR-0040 D3: Tài xế (DRIVER) không nằm trong cổng nào — tài khoản chỉ-DRIVER không qua admin/office/orders", () => {
  for (const gate of [ADMIN_GATE, OFFICE_GATE, ORDERS_GATE]) assert.ok(!(gate as readonly string[]).includes("DRIVER"));
  const driver = { id: "d", permissions: ["DRIVER"] as PermissionCode[] };
  assert.equal(passesAdminGate(driver), false);
  assert.equal(isOffice(driver), false);
  assert.equal(canAccessOrders(driver), false);
});

test("ADR-0048 D2: Tài xế đối tác (DRIVER_PARTNER) không nằm trong cổng nào — tài khoản chỉ-DRIVER_PARTNER không qua admin/office/orders", () => {
  for (const gate of [ADMIN_GATE, OFFICE_GATE, ORDERS_GATE]) assert.ok(!(gate as readonly string[]).includes("DRIVER_PARTNER"), `DRIVER_PARTNER lọt vào cổng ${JSON.stringify(gate)}`);
  const driverPartner = { id: "dp", permissions: ["DRIVER_PARTNER"] as PermissionCode[] };
  assert.equal(passesAdminGate(driverPartner), false);
  assert.equal(isOffice(driverPartner), false);
  assert.equal(canAccessOrders(driverPartner), false);
});
