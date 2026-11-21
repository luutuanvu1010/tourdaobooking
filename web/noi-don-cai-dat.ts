// Khối «Đối tác không nhập nơi đón» ở trang Tôi — công tắc của Toàn quyền (ADR-0221 Đ1, tên do chủ chọn 21/11/2026; khuôn `web/gio-don-cai-dat.ts`, cùng trang).
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (POST /api/cai-dat/noi-don-doi-tac — Quản trị nhận 403). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const URL = "/api/cai-dat/noi-don-doi-tac";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatNoiDon(el: HTMLElement): Promise<void> {
  let s: Api.NoiDonDoiTacResponse;
  try {
    s = await api<Api.NoiDonDoiTacResponse>(URL);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.NoiDonDoiTacResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: s.bat ? "btn" : "btn btn-primary", type: "button", id: "noi-don-doi" }, s.bat ? "Tắt đối tác không nhập nơi đón" : "Bật đối tác không nhập nơi đón");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.NoiDonDoiTacRequest = { bat: !s.bat };
        ve(await api<Api.NoiDonDoiTacResponse>(URL, { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "noi-don-heading" }, "Đối tác không nhập nơi đón"),
      h("p", { id: "noi-don-trang-thai" }, s.bat ? "Đang bật." : "Đang tắt."),
      h("p", { class: "muted" }, "Khi bật, đối tác chọn «Đón» không phải điền nơi đón; văn phòng điền nơi đón lúc bấm «Còn vé, xác nhận đơn». Đơn chưa có nơi đón thì không xác nhận được."),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
