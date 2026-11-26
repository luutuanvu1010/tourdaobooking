// Khối «Ô khách đặt cọc cho đối tác» trong nhóm «Cài đặt lập đơn» ở trang Tôi — công tắc của Quản trị và Toàn quyền (ADR-0236 Đ2; khuôn `web/chan-chua-gio-cai-dat.ts`, cùng nhóm).
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.form_fields); máy chủ kiểm lại khi ghi (POST /api/cai-dat/o-dat-coc-doi-tac). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const URL = "/api/cai-dat/o-dat-coc-doi-tac";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatODatCoc(el: HTMLElement): Promise<void> {
  let s: Api.ODatCocDoiTacResponse;
  try {
    s = await api<Api.ODatCocDoiTacResponse>(URL);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.ODatCocDoiTacResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: "nut", "data-cap": s.hien ? undefined : "chinh", type: "button", id: "o-dat-coc-doi" }, s.hien ? "Tắt ô khách đặt cọc cho đối tác" : "Bật ô khách đặt cọc cho đối tác");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.ODatCocDoiTacRequest = { hien: !s.hien };
        ve(await api<Api.ODatCocDoiTacResponse>(URL, { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h3", { id: "o-dat-coc-heading" }, "Ô khách đặt cọc cho đối tác"),
      h("p", { id: "o-dat-coc-trang-thai" }, s.hien ? "Đang bật." : "Đang tắt."),
      h(
        "p",
        { class: "muted" },
        s.hien
          ? "Form Tạo đơn của tài khoản đối tác có ô «Khách đặt cọc cho đối tác». Khi đơn được xác nhận, số đó thành khoản thu tiền mặt do đối tác giữ."
          : "Form Tạo đơn của tài khoản đối tác không có ô đặt cọc. Đơn nháp đã ghi tiền đặt cọc trước đó vẫn giữ số và vẫn thành khoản thu khi xác nhận.",
      ),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
