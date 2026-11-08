// Mục «Nút thanh dưới» ở trang Tôi (ADR-0187 Đ2.3; đặc tả docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md). Chỉ ở điện thoại (CSS ẩn ở ≥ 900, nơi
// không có thanh dưới). Ai thấy: ô me.favorites.write của bảng quyền và không đang «xem như vai trò khác»; danh sách chọn = `luaChonGhim` (CÙNG `ghimDuoc` với máy chủ).
// Máy chủ kiểm lại khi ghi (PUT /api/account/thanh-duoi). Lưu xong tải lại trang để khung vẽ thanh dưới mới. Tách khỏi web/shell.ts để gói mọi trang không nặng thêm.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";
import { can, type PermissionHolder } from "../src/shared/permissions";
import { GHIM_TOI_DA, ghimHieuLuc, luaChonGhim, thanhTab } from "../src/shared/muc-giao-dien";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export function ganNutThanhDuoi(el: HTMLElement, staff: PermissionHolder & { readonly actingRole?: string; readonly thanhDuoi?: readonly string[] }): void {
  if (staff.actingRole || !can(staff, "me.favorites.write", { ownerId: staff.id })) return;
  const daChon = ghimHieuLuc(staff);
  // Chưa chọn gì: đánh dấu sẵn các nút máy đang xếp (trừ «Tôi») để người dùng chỉ việc đổi.
  const dangCo = new Set<string>(daChon ?? thanhTab({ staff }).map((t) => t.trang).filter((k) => k !== "toi"));
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const o = luaChonGhim(staff).map((m) => {
    const hop = h("input", { type: "checkbox", value: m.trang, checked: dangCo.has(m.trang) });
    return { hop, dong: h("label", { class: "td-o" }, hop, m.nhan) };
  });
  const capNhat = (): void => {
    const du = o.filter((x) => x.hop.checked).length >= GHIM_TOI_DA;
    for (const x of o) x.hop.disabled = du && !x.hop.checked;
  };
  for (const x of o) x.hop.addEventListener("change", capNhat);
  capNhat();
  const gui = async (nut: HTMLButtonElement, trang: string[]): Promise<void> => {
    loi.hidden = true;
    nut.disabled = true;
    try {
      const body: Api.ThanhDuoiRequest = { trang };
      await api<Api.ThanhDuoiResponse>("/api/account/thanh-duoi", { method: "PUT", body });
      location.reload();
    } catch (err) {
      loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
      loi.hidden = false;
      nut.disabled = false;
    }
  };
  const luu = h("button", { class: "nut", "data-cap": "chinh", type: "button", id: "thanh-duoi-luu" }, "Lưu");
  luu.addEventListener("click", () => void gui(luu, o.filter((x) => x.hop.checked).map((x) => x.hop.value)));
  const veMacDinh = daChon ? h("button", { class: "nut", "data-cap": "phu", type: "button", id: "thanh-duoi-mac-dinh" }, "Về mặc định") : null;
  veMacDinh?.addEventListener("click", () => void gui(veMacDinh, []));
  replaceChildren(
    el,
    h("h2", { id: "thanh-duoi-heading" }, "Nút thanh dưới"),
    h("p", { class: "muted" }, `Chọn tối đa ${GHIM_TOI_DA} trang. Nút Tôi luôn có.`),
    ...o.map((x) => x.dong),
    loi,
    h("div", { class: "td-nut" }, luu, veMacDinh),
  );
  el.hidden = false;
}
