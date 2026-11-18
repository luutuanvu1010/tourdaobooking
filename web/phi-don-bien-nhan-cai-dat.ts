// Khối «Hiện riêng phí đưa đón trên biên nhận khách lẻ» ở trang Tôi — công tắc của Toàn quyền (ADR-0218 Đ3.4; khuôn `web/gio-don-cai-dat.ts`, cùng trang).
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (POST /api/cai-dat/phi-don-bien-nhan — Quản trị nhận 403). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const URL = "/api/cai-dat/phi-don-bien-nhan";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatPhiDonBienNhan(el: HTMLElement): Promise<void> {
  let s: Api.PhiDonBienNhanResponse;
  try {
    s = await api<Api.PhiDonBienNhanResponse>(URL);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.PhiDonBienNhanResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: s.hienRieng ? "btn" : "btn btn-primary", type: "button", id: "phi-don-bien-nhan-doi" }, s.hienRieng ? "Gộp phí đưa đón vào giá" : "Hiện riêng phí đưa đón");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.PhiDonBienNhanRequest = { hienRieng: !s.hienRieng };
        ve(await api<Api.PhiDonBienNhanResponse>(URL, { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "phi-don-bien-nhan-heading" }, "Hiện riêng phí đưa đón trên biên nhận khách lẻ"),
      h("p", { id: "phi-don-bien-nhan-trang-thai" }, s.hienRieng ? "Đang hiện riêng: biên nhận khách lẻ có dòng «Phí đưa đón»." : "Đang gộp: phí đưa đón được cộng vào giá dịch vụ, biên nhận khách lẻ không có dòng riêng."),
      h("p", { class: "muted" }, "Chỉ đổi cách in. Khách lẻ vẫn trả đủ phí, tổng tiền, tiền đã thu và còn lại không đổi. Áp cho mọi bản in sau khi đổi, kể cả đơn đã xác nhận."),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
