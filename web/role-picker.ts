// Khối "Vai và quyền" của trang Nhân viên (ADR-0018): chọn vai theo hai nhóm, xem trước quyền sẽ có (và sẽ thêm/mất so với hiện tại), chỉnh riêng có lý do.
// Mọi luật (nhóm vai, bộ quyền mặc định, LC-1/LC-1b/LC-3/LC-4) đến từ src/shared/roles.ts — giao diện chỉ tắt ô và xem trước; máy chủ luôn kiểm lại.
// Ô vai mang data-kind="role", ô chỉnh tay data-kind="add"/"remove": mã INTERN vừa là mã vai vừa là mã quyền, chọn phần tử phải kèm data-kind.
import { MA_QUYEN_TIEN, PERMISSION_CODES, PERMISSION_LABEL, isExternalPermission, type PermissionCode } from "../src/shared/permissions";
import {
  ROLES, ROLE_CODES, ROLE_GROUP_LABEL, SUPER_ADMIN_GRANTED, effectivePermissions, groupOf, laiNoiBoBenNgoaiProblem, permissionsLabel, taiKhoanLaiProblem, vaiTaiXeDoiTacXungDot,
  type RoleCode, type RoleGroup,
} from "../src/shared/roles";
import { h } from "./dom";

export interface RolePickerValue { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string }
export interface RolePicker { readonly el: HTMLElement; value(): RolePickerValue; reset(v: RolePickerValue): void }

const CHECK_STYLE = "width:auto;display:inline;margin:0 6px 0 0"; // như ô tick sẵn có của web/staff.ts

export function rolePicker(opts: { initial: RolePickerValue; actorIsSuperAdmin: boolean; current: readonly PermissionCode[] | null }): RolePicker {
  const roleBoxes = new Map<RoleCode, HTMLInputElement>();
  const addBoxes = new Map<PermissionCode, HTMLInputElement>();
  const removeBoxes = new Map<PermissionCode, HTMLInputElement>();
  const reason = h("input", { type: "text", maxLength: 200, placeholder: "Vì sao chỉnh riêng cho người này" });
  const preview = h("p", { class: "muted", "aria-live": "polite", "data-role-preview": "" });
  const roleLocked = (c: RoleCode) => ROLES[c].superAdminOnly && !opts.actorIsSuperAdmin; // LC-4
  // LC-4 + ADR-0090 đ1(ii): quyền tiền (MA_QUYEN_TIEN — suy từ bảng quyền) cũng chỉ Toàn quyền cộng/bớt tay. Máy chủ vẫn kiểm lại.
  const permLocked = (p: PermissionCode) => (SUPER_ADMIN_GRANTED.includes(p) || MA_QUYEN_TIEN.includes(p)) && !opts.actorIsSuperAdmin;

  const value = (): RolePickerValue => ({
    roles: ROLE_CODES.filter((c) => roleBoxes.get(c)!.checked),
    adds: PERMISSION_CODES.filter((p) => addBoxes.get(p)!.checked),
    removes: PERMISSION_CODES.filter((p) => removeBoxes.get(p)!.checked),
    reason: reason.value.trim(),
  });

  const refresh = (): void => {
    const v = value();
    const group = groupOf(v.roles);
    // ADR-0048 B2.2 (LC-1b, Task B1): một ô CHƯA chọn bị tắt nếu chọn nó sẽ tạo xung đột — vai "Tài xế đối tác" cùng vai bên ngoài khác, hoặc tài khoản lai
    // (Tài xế đối tác kèm quyền khác). Ô ĐANG chọn không bao giờ bị tắt vì luật này, để người dùng bỏ chọn được.
    const vaiXungDot = (c: RoleCode): boolean => !v.roles.includes(c) && vaiTaiXeDoiTacXungDot([...v.roles, c]);
    const congTayLai = (p: PermissionCode): boolean =>
      !v.adds.includes(p) && (() => {
        const sau = effectivePermissions(v.roles, { adds: [...v.adds, p], removes: v.removes }).permissions;
        return (taiKhoanLaiProblem(sau) ?? laiNoiBoBenNgoaiProblem(sau)) !== null; // LC-1b + ADR-0083 điều 1e (nội bộ + bên ngoài)
      })();
    for (const c of ROLE_CODES) {
      roleBoxes.get(c)!.disabled = roleLocked(c) || ((group === "INTERNAL" || group === "EXTERNAL") && ROLES[c].group !== group) || vaiXungDot(c); // LC-3, LC-1b
    }
    for (const p of PERMISSION_CODES) {
      // LC-1 (ADR-0048: quyền bên ngoài = EXTERNAL_PERMISSIONS), LC-1b (cộng tay tạo tài khoản lai)
      addBoxes.get(p)!.disabled = permLocked(p) || (group === "EXTERNAL" && !isExternalPermission(p)) || congTayLai(p);
      removeBoxes.get(p)!.disabled = permLocked(p);
    }
    const eff = effectivePermissions(v.roles, v).permissions;
    const parts = [`Quyền sẽ có: ${permissionsLabel(eff)}.`];
    // Trạng thái xung đột chỉ tới được khi dữ liệu nạp vào đã sai (reset) — báo đúng câu của máy chủ.
    if (vaiTaiXeDoiTacXungDot(v.roles)) parts.push("Vai trò Tài xế đối tác không đi cùng vai trò bên ngoài khác — một người chọn một.");
    const lai = taiKhoanLaiProblem(eff);
    if (lai) parts.push(lai.message);
    if (opts.current) {
      const gain = eff.filter((p) => !opts.current!.includes(p));
      const lose = opts.current.filter((p) => !eff.includes(p));
      if (gain.length) parts.push(`Sẽ thêm: ${permissionsLabel(gain)}.`);
      if (lose.length) parts.push(`Sẽ mất: ${permissionsLabel(lose)}.`);
    }
    preview.textContent = parts.join(" ");
  };

  const roleGroup = (group: RoleGroup): HTMLElement =>
    h("div", null, h("strong", null, ROLE_GROUP_LABEL[group]),
      ...ROLE_CODES.filter((c) => ROLES[c].group === group).map((c) => {
        const b = h("input", { type: "checkbox", style: CHECK_STYLE, value: c, "data-kind": "role" });
        b.addEventListener("change", refresh);
        roleBoxes.set(c, b);
        // ADR-0042: Toàn quyền là vai ẩn — người không giữ Toàn quyền không thấy vai chỉ Toàn quyền gán (Giám đốc, Điều hành chung).
        // Ô vẫn được tạo (value()/set() đọc đủ mọi mã), chỉ không đưa lên màn hình.
        return opts.actorIsSuperAdmin || !ROLES[c].superAdminOnly ? h("label", { class: "check" }, b, ROLES[c].name) : null;
      }));
  const permBox = (map: Map<PermissionCode, HTMLInputElement>, p: PermissionCode, kind: "add" | "remove"): HTMLElement => {
    const b = h("input", { type: "checkbox", style: CHECK_STYLE, value: p, "data-kind": kind });
    b.addEventListener("change", refresh);
    map.set(p, b);
    return h("label", { class: "check" }, b, PERMISSION_LABEL[p]);
  };

  const shown = (p: PermissionCode): boolean => opts.actorIsSuperAdmin || p !== "SUPER_ADMIN"; // ADR-0042: vai ẩn — ô vẫn tạo, chỉ không hiện
  const el = h("div", null,
    h("div", { class: "grid two" }, roleGroup("INTERNAL"), roleGroup("EXTERNAL")),
    preview,
    h("details", null, h("summary", null, "Chỉnh riêng cho người này (cộng hoặc bớt quyền)"),
      h("div", { class: "grid two" },
        h("div", null, h("strong", null, "Cộng thêm"), ...PERMISSION_CODES.map((p) => permBox(addBoxes, p, "add")).filter((_, i) => shown(PERMISSION_CODES[i]!))),
        h("div", null, h("strong", null, "Bớt đi"), ...PERMISSION_CODES.map((p) => permBox(removeBoxes, p, "remove")).filter((_, i) => shown(PERMISSION_CODES[i]!)))),
      h("label", null, "Lý do chỉnh riêng (bắt buộc khi có cộng/bớt)", reason)));

  const reset = (v: RolePickerValue): void => {
    for (const c of ROLE_CODES) roleBoxes.get(c)!.checked = v.roles.includes(c);
    for (const p of PERMISSION_CODES) {
      addBoxes.get(p)!.checked = v.adds.includes(p);
      removeBoxes.get(p)!.checked = v.removes.includes(p);
    }
    reason.value = v.reason;
    refresh();
  };
  reset(opts.initial);
  return { el, value, reset };
}
