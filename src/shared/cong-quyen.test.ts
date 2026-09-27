// ADR-0019: cổng của router là DANH SÁCH mã quyền khai tường minh, không suy từ ô nào của MATRIX. Tệp này (1) khoá ba danh sách — đổi danh
// sách = sửa test trong cùng commit, người rà thấy ngay; (2) đối chiếu danh sách với bảng (lưới báo lệch, không phải định nghĩa); (3) chứng minh
// phần B KHÔNG đổi hành vi với bất kỳ tổ hợp quyền nào (so với công thức cũ, chép nguyên văn vào đây).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_GATE, MATRIX, OFFICE_GATE, ORDERS_GATE, PERMISSION_CODES, can, canAccessOrders, isOffice, seesAllOrders, type PermissionCode } from "./permissions.ts";

test("ADR-0019: ba danh sách cổng khai tường minh (khoá giá trị)", () => {
  assert.deepEqual([...ADMIN_GATE], ["ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual([...OFFICE_GATE], ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual([...ORDERS_GATE], ["SALES", "ACCOUNTING", "ADMIN", "PARTNER", "SUPER_ADMIN", "INTERN"]); // phần C thêm FIELD
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

test("ADR-0019 + ADR-0028: GET /api/catalog hỏi money.view phạm vi 'của mình' — mọi mã qua cổng orders đều qua (Đối tác/Thực tập đọc được danh mục)", () => {
  // Route danh mục (src/modules/catalog/index.ts) gọi can(staff, "money.view", { ownerId: staff.id }). Hỏi KHÔNG ngữ cảnh sẽ trả sai cho mã `own`
  // (PARTNER, INTERN) và phá ADR-0028 — bài này đỏ nếu ai đó thu hẹp ô money.view của một mã trong ORDERS_GATE về none/assigned.
  for (const c of ORDERS_GATE) {
    const who = { id: `u-${c}`, permissions: [c] as PermissionCode[] };
    assert.ok(can(who, "money.view", { ownerId: who.id }), `${c} qua cổng orders nhưng không xem được giá của đơn mình lập → mất danh mục ở form lập đơn`);
  }
});

test("ADR-0019 phần B không đổi hành vi: với mọi tổ hợp 7 mã quyền, isOffice/canAccessOrders mới = công thức cũ", () => {
  const oldIsOffice = (w: { id: string; permissions: readonly PermissionCode[] }) => can(w, "order.view");
  const oldCanAccessOrders = (w: { id: string; permissions: readonly PermissionCode[] }) => oldIsOffice(w) || can(w, "order.view", { ownerId: w.id });
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const who = { id: "x", permissions: PERMISSION_CODES.filter((_, i) => mask & (1 << i)) };
    assert.equal(isOffice(who), oldIsOffice(who), `isOffice lệch: ${who.permissions.join("+")}`);
    assert.equal(canAccessOrders(who), oldCanAccessOrders(who), `canAccessOrders lệch: ${who.permissions.join("+")}`);
    // Kiểm ĐỊNH NGHĨA (seesAllOrders được định nghĩa đúng bằng biểu thức này) — không phải bằng chứng giữ hành vi; chỉ chặn ai đó lặng lẽ đổi định nghĩa.
    assert.equal(seesAllOrders(who), can(who, "order.view"), `seesAllOrders lệch: ${who.permissions.join("+")}`);
  }
});
