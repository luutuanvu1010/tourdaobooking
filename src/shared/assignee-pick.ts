// Luật THUẦN của ô chọn người phụ trách NGAY TRONG FORM LẬP ĐƠN (Task 1.8 phần b ADR-0030; bản thiết kế "Nguoi phu trach - Form lap don.dc.html", phương án
// 1b): nhãn nhóm của người có thể được giao (`AssigneeDto.roleLabel`, máy chủ tính ở `GET /api/dispatch/assignees`), bỏ dấu để tìm theo tên, gom danh sách
// theo nhóm, và ai thấy khối "Người phụ trách" trong form. Dùng ở cả máy chủ (module dispatch) và giao diện (web/assignee-picker.ts, web/order-form.ts).
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`).
import { PERMISSION_LABEL, can, type PermissionCode, type PermissionHolder } from "./permissions.ts";

/** Thứ tự nhóm trong bảng chọn — đúng bản thiết kế (`GROUPS`): Hướng dẫn viên → Bán hàng → Quản trị. Chữ lấy từ `PERMISSION_LABEL` (một nguồn). */
export const ASSIGNEE_GROUP_ORDER: readonly string[] = [PERMISSION_LABEL.FIELD, PERMISSION_LABEL.SALES, PERMISSION_LABEL.ADMIN];

/**
 * Nhãn nhóm HIỂN THỊ của một người có thể được giao — KHÔNG phải luật quyền (ai được giao do `checkAssignee` của dispatch quyết, hàm này không đổi điều đó).
 * Một tài khoản có thể giữ nhiều quyền → chọn MỘT nhãn theo thứ tự ưu tiên cố định: có `FIELD` → "Hướng dẫn viên"; không thì có `ADMIN`/`SUPER_ADMIN` →
 * "Quản trị"; còn lại → "Bán hàng". Lý do thứ tự (Ruling Task 1.8 phần b): bảng chọn này sinh ra để giao đơn cho hướng dẫn viên, nên ai đi tour được thì
 * nằm ở nhóm đầu; "Toàn quyền" gộp vào "Quản trị" vì thiết kế chỉ có ba nhóm. Nhánh cuối an toàn vì mọi tài khoản `checkAssignee` nhận hôm nay đều có
 * SALES khi không có FIELD/ADMIN/SUPER_ADMIN — `src/modules/dispatch/rules.test.ts` duyệt mọi tổ hợp quyền để canh điều này.
 */
export function assigneeRoleLabel(permissions: readonly PermissionCode[]): string {
  if (permissions.includes("FIELD")) return PERMISSION_LABEL.FIELD;
  if (permissions.includes("ADMIN") || permissions.includes("SUPER_ADMIN")) return PERMISSION_LABEL.ADMIN;
  return PERMISSION_LABEL.SALES;
}

/** Chuỗi để so khi tìm theo tên: bỏ dấu tiếng Việt (NFD rồi bỏ dấu kết hợp; `đ`/`Đ` không tách được bằng NFD nên thay riêng), về chữ thường. */
export const normName = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export interface AssigneeGroup<T> {
  label: string;
  people: T[];
}

/**
 * Danh sách người (đã lọc theo `query` — tên chứa chuỗi gõ, đã bỏ dấu, bỏ dấu cách hai đầu; rỗng = không lọc) gom theo `roleLabel`: nhóm theo
 * `ASSIGNEE_GROUP_ORDER`, nhãn lạ (máy chủ đời sau thêm nhóm) đứng sau theo thứ tự gặp đầu tiên — không làm rơi mất người nào; trong nhóm GIỮ thứ tự máy
 * chủ trả (tên kiểu Việt Nam, module staff). Nhóm không còn ai bị bỏ. Không kết quả → mảng rỗng (giao diện hiện "Không tìm thấy ai tên …").
 */
export function groupAssignees<T extends { name: string; roleLabel: string }>(list: readonly T[], query: string): AssigneeGroup<T>[] {
  const q = normName(query.trim());
  const matches = q === "" ? list : list.filter((p) => normName(p.name).includes(q));
  const labels = [...ASSIGNEE_GROUP_ORDER];
  for (const p of matches) if (!labels.includes(p.roleLabel)) labels.push(p.roleLabel);
  return labels.map((label) => ({ label, people: matches.filter((p) => p.roleLabel === label) })).filter((g) => g.people.length > 0);
}

/**
 * Người đang đăng nhập có được chọn người phụ trách ngay lúc lập đơn không — ĐÚNG câu máy chủ hỏi ở `POST /api/orders` khi thân có `handlerStaffId`
 * (`dispatch.assign` trên đơn của chính mình, ADR-0030 S20-4, G4). Sai → form KHÔNG dựng khối "Người phụ trách" (Thực tập, Đối tác thuần — bản thiết kế:
 * "không có quyền chọn, nên khối không hiện"); máy chủ vẫn chặn 403 nếu thân gửi kèm.
 */
export const mayPickHandlerOnCreate = (who: PermissionHolder): boolean => can(who, "dispatch.assign", { ownerId: who.id });
