// Khối «Cấp cho đối tác tự đăng ký» ở thẻ Cấp độ đại lý của trang Hoa hồng đối tác (ADR-0209 Đ1, Đ2, Đ5; đợt 1 Task 12; chữ trang trình lượt B, chủ duyệt «theo khuyến nghị»).
// Mỗi loại đối tác được hưởng một dòng: chọn một cấp đang bật hoặc «Theo cấp của vai trò», bấm «Lưu». Xem: `partner.commission.view`; nút lưu chỉ cho `partner.signup_tier.write`
// (Quản lý bán hàng, Quản trị, Toàn quyền — Kế toán không). Máy chủ kiểm lại; lệnh mang khoá lạc quan `dangHieuLuc` (dòng đang thấy), người khác vừa đặt ⇒ 409, nạp lại.
// Khối dựng MỘT lần và giữ nguyên qua các lần vẽ lại thẻ (thẻ vẽ lại sau mỗi lần ghi). Chỉ dựng DOM bằng h().
import { ApiError, api, type Api } from "./api";
import { can, type PermissionHolder } from "../src/shared/permissions";
import { h, replaceChildren } from "./dom";
import { khoi as dungKhoi, luoi } from "./khung";

let khoi: HTMLElement | null = null;

export function khoiCapDangKy(nguoiDung: PermissionHolder): HTMLElement | null {
  if (!can(nguoiDung, "partner.commission.view")) return null;
  if (khoi) return khoi;
  const ghi = can(nguoiDung, "partner.signup_tier.write");
  // Khuôn Thiết lập (ADR-0222): một khối, mỗi vai một trường trên lưới 12 cột (ô chọn cùng nút «Lưu» của vai đó trên một hàng), các trường thẳng cột.
  const than = luoi({ id: "cap-dang-ky-than" }, h("p", { class: "khoi-mo-ta", role: "status" }, "Đang tải…"));
  const bao = h("p", { class: "khoi-mo-ta", role: "status", hidden: true });
  khoi = dungKhoi(
    { tieuDe: "Cấp cho đối tác tự đăng ký", idTieuDe: "cap-dang-ky-tieu-de", moTa: "Người được duyệt từ phiếu đăng ký nhận sẵn cấp này làm cấp riêng, theo vai trò người duyệt chọn. Đổi cấp chỉ áp cho phiếu duyệt về sau.", thuoc: { id: "cap-dang-ky", class: "dk-cap-dang-ky" } },
    bao, than);
  const veCapDk = (d: Api.CapMacDinhResponse) => {
    replaceChildren(than, ...d.loai.map((l) => {
      const chon = h("select", { class: "o", id: `cap-dang-ky-${l.code}`, disabled: !ghi || !l.dangBat, "data-loai": l.code },
        h("option", { value: "" }, "Theo cấp của vai trò"),
        ...d.cap.map((c) => h("option", { value: c.code, selected: l.hienHanh?.muc?.code === c.code }, c.ten)),
        l.hienHanh?.muc && !d.cap.some((c) => c.code === l.hienHanh!.muc!.code) ? h("option", { value: l.hienHanh.muc.code, selected: true, disabled: true }, `${l.hienHanh.muc.ten} (đang khoá)`) : null) as HTMLSelectElement;
      const luu = ghi && l.dangBat ? h("button", { type: "button", class: "nut", "data-cap": "phu", "data-luu-loai": l.code }, "Lưu") as HTMLButtonElement : null;
      luu?.addEventListener("click", async () => {
        luu.disabled = true;
        bao.hidden = true;
        try {
          veCapDk(await api<Api.CapMacDinhResponse>("/api/pricing/cap-mac-dinh", { method: "POST", body: { loai: l.code, muc: chon.value || null, dangHieuLuc: l.hienHanh?.id ?? null } }));
          bao.textContent = `Đã lưu cấp cho ${l.ten}.`;
        } catch (e) {
          bao.textContent = e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
          if (e instanceof ApiError && e.status === 409) void taiCapDk();
        } finally {
          bao.hidden = false;
          luu.disabled = false;
        }
      });
      return h("div", { class: "truong", "data-cot": 6, "data-cap-loai": l.code }, h("label", { for: chon.id }, l.ten, l.dangBat ? null : " (đang tắt)"), h("div", { class: "hang" }, chon, luu));
    }));
  };
  const taiCapDk = async () => {
    try { veCapDk(await api<Api.CapMacDinhResponse>("/api/pricing/cap-mac-dinh")); } catch (e) { replaceChildren(than, h("p", { class: "truong-loi" }, e instanceof ApiError ? e.message : "Không tải được.")); }
  };
  void taiCapDk();
  return khoi;
}
