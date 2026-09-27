import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSIGNEE_GROUP_ORDER, assigneeRoleLabel, groupAssignees, mayPickHandlerOnCreate, normName } from "./assignee-pick.ts";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

const who = (id: string, ...permissions: PermissionCode[]) => ({ id, permissions });

// --- Nhãn nhóm của người có thể được giao (AssigneeDto.roleLabel) ----------------------------------------------------------------
test("roleLabel: chỉ Hướng dẫn viên → “Hướng dẫn viên”; chỉ Bán hàng → “Bán hàng”; Quản trị hoặc Toàn quyền → “Quản trị”", () => {
  assert.equal(assigneeRoleLabel(["FIELD"]), "Hướng dẫn viên");
  assert.equal(assigneeRoleLabel(["SALES"]), "Bán hàng");
  assert.equal(assigneeRoleLabel(["ADMIN"]), "Quản trị");
  assert.equal(assigneeRoleLabel(["SUPER_ADMIN"]), "Quản trị");
});

test("roleLabel: tài khoản ghép chọn MỘT nhãn theo thứ tự ưu tiên Hướng dẫn viên > Quản trị > Bán hàng (nhãn gom nhóm, không phải luật quyền)", () => {
  assert.equal(assigneeRoleLabel(["SALES", "FIELD"]), "Hướng dẫn viên", "SALES+FIELD: có FIELD là nhóm Hướng dẫn viên");
  assert.equal(assigneeRoleLabel(["FIELD", "SALES"]), "Hướng dẫn viên", "thứ tự quyền trong mảng không đổi kết quả");
  assert.equal(assigneeRoleLabel(["ADMIN", "FIELD"]), "Hướng dẫn viên");
  assert.equal(assigneeRoleLabel(["SALES", "ADMIN"]), "Quản trị");
  assert.equal(assigneeRoleLabel(["SALES", "SUPER_ADMIN"]), "Quản trị");
  assert.equal(assigneeRoleLabel(["SALES", "ACCOUNTING"]), "Bán hàng");
});

test("thứ tự nhóm trong bảng chọn = bản thiết kế: Hướng dẫn viên, Bán hàng, Quản trị", () => {
  assert.deepEqual([...ASSIGNEE_GROUP_ORDER], ["Hướng dẫn viên", "Bán hàng", "Quản trị"]);
});

// --- Tìm theo tên đã bỏ dấu ------------------------------------------------------------------------------------------------------
test("normName: bỏ dấu tiếng Việt (kể cả đ/Đ — NFD không tách), về chữ thường", () => {
  assert.equal(normName("Nguyễn Minh Tâm"), "nguyen minh tam");
  assert.equal(normName("Đặng Quốc Việt"), "dang quoc viet");
  assert.equal(normName("đinh"), "dinh");
  assert.equal(normName("VÕ NGỌC ÁNH"), "vo ngoc anh");
  assert.equal(normName("Tâm".normalize("NFD")), "tam", "chữ đã tách dấu sẵn (NFD) vẫn ra cùng kết quả");
  assert.equal(normName(""), "");
});

const P = (staffId: string, name: string, roleLabel: string) => ({ staffId, partyId: `p-${staffId}`, name, roleLabel });
const LIST = [
  P("u6", "Trần Bảo Ngọc", "Bán hàng"),
  P("u1", "Nguyễn Minh Tâm", "Hướng dẫn viên"),
  P("u8", "Bùi Thanh Sơn", "Quản trị"),
  P("u2", "Lê Hoàng Phúc", "Hướng dẫn viên"),
  P("u7", "Huỳnh Gia Huy", "Bán hàng"),
];
const shape = (groups: ReturnType<typeof groupAssignees<(typeof LIST)[number]>>) => groups.map((g) => [g.label, g.people.map((p) => p.staffId)]);

test("groupAssignees: không gõ gì → mọi người, gom theo nhóm đúng thứ tự thiết kế, trong nhóm GIỮ thứ tự máy chủ trả", () => {
  assert.deepEqual(shape(groupAssignees(LIST, "")), [["Hướng dẫn viên", ["u1", "u2"]], ["Bán hàng", ["u6", "u7"]], ["Quản trị", ["u8"]]]);
  assert.deepEqual(shape(groupAssignees(LIST, "   ")), shape(groupAssignees(LIST, "")), "chỉ dấu cách = không lọc");
});

test("groupAssignees: lọc theo tên đã bỏ dấu, không phân biệt hoa thường; nhóm rỗng bị bỏ", () => {
  assert.deepEqual(shape(groupAssignees(LIST, "tam")), [["Hướng dẫn viên", ["u1"]]]);
  assert.deepEqual(shape(groupAssignees(LIST, "  NGỌC ")), [["Bán hàng", ["u6"]]]);
  assert.deepEqual(shape(groupAssignees(LIST, "h")), [["Hướng dẫn viên", ["u1", "u2"]], ["Bán hàng", ["u7"]], ["Quản trị", ["u8"]]], "“Trần Bảo Ngọc” không có chữ h");
  assert.deepEqual(shape(groupAssignees(LIST, "bui thanh")), [["Quản trị", ["u8"]]]);
  assert.deepEqual(groupAssignees(LIST, "không ai tên này"), []);
});

test("groupAssignees: nhãn lạ (máy chủ đời sau thêm nhóm) không bị rơi mất — đứng sau ba nhóm của thiết kế, theo thứ tự gặp đầu tiên", () => {
  const list = [P("x1", "An", "Đối tác"), ...LIST, P("x2", "Bình", "Đối tác")];
  const labels = groupAssignees(list, "").map((g) => g.label);
  assert.deepEqual(labels, ["Hướng dẫn viên", "Bán hàng", "Quản trị", "Đối tác"]);
  assert.deepEqual(groupAssignees(list, "").at(-1)!.people.map((p) => p.staffId), ["x1", "x2"]);
});

// --- Ai thấy khối "Người phụ trách" trong form lập đơn ---------------------------------------------------------------------------
test("mayPickHandlerOnCreate = đúng câu máy chủ hỏi ở POST /api/orders (dispatch.assign trên đơn của chính mình): Bán hàng, Quản trị, Toàn quyền CÓ; Thực tập, Đối tác, Hướng dẫn viên, Kế toán KHÔNG", () => {
  for (const code of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(mayPickHandlerOnCreate(who("me", code)), true, code);
  for (const code of ["INTERN", "PARTNER", "FIELD", "ACCOUNTING"] as const) assert.equal(mayPickHandlerOnCreate(who("me", code)), false, code);
  assert.equal(mayPickHandlerOnCreate(who("me", "SALES", "PARTNER")), true, "tài khoản lai Bán hàng+Đối tác: máy chủ cho chọn (chỉ chặn khi làm NGƯỜI ĐƯỢC giao)");
  assert.equal(mayPickHandlerOnCreate(who("me")), false, "không quyền nào");
  // Mọi mã quyền đơn lẻ đều được xét (thêm mã mới mà quên bảng này thì vòng trên không phủ — vòng này bắt).
  const yes = PERMISSION_CODES.filter((c) => mayPickHandlerOnCreate(who("me", c)));
  assert.deepEqual(yes, ["SALES", "ADMIN", "SUPER_ADMIN"]);
});
