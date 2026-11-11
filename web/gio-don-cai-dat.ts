// Khối «Bắt buộc giờ đón cho đơn đối tác» ở trang Tôi — công tắc của Toàn quyền (ADR-0193 mục 1, tên nút theo mục 7 phương án (1); khuôn `web/an-khach-cai-dat.ts`, cùng trang).
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (POST /api/cai-dat/bat-buoc-gio-don — Quản trị nhận 403). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const URL = "/api/cai-dat/bat-buoc-gio-don";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatGioDon(el: HTMLElement): Promise<void> {
  let s: Api.BatBuocGioDonResponse;
  try {
    s = await api<Api.BatBuocGioDonResponse>(URL);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.BatBuocGioDonResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: s.bat ? "btn" : "btn btn-primary", type: "button", id: "gio-don-doi" }, s.bat ? "Tắt bắt buộc giờ đón" : "Bật bắt buộc giờ đón");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.BatBuocGioDonRequest = { bat: !s.bat };
        ve(await api<Api.BatBuocGioDonResponse>(URL, { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "gio-don-heading" }, "Bắt buộc giờ đón cho đơn đối tác"),
      h("p", { id: "gio-don-trang-thai" }, s.bat ? "Đang bật." : "Đang tắt."),
      h("p", { class: "muted" }, "Khi bật, đơn có đón của đối tác mà chưa có giờ đón thì văn phòng phải ghi giờ rồi mới bấm «Còn vé, xác nhận đơn» được. Khi tắt, văn phòng vẫn xét đơn nhưng xác nhận được khi chưa có giờ; đơn hiện nhắc «Chưa chốt giờ» và chưa xếp xe được cho tới khi có giờ."),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
