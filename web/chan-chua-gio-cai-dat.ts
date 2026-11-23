// Khối «Chặn đơn chưa có giờ đón khi sát ngày đón» trong nhóm «Cài đặt lập đơn» ở trang Tôi — công tắc của Toàn quyền (ADR-0227 Đ1; khuôn `web/noi-don-cai-dat.ts`, cùng nhóm).
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (POST /api/cai-dat/chan-chua-gio-sat-ngay — Quản trị nhận 403). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const URL = "/api/cai-dat/chan-chua-gio-sat-ngay";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatChanChuaGio(el: HTMLElement): Promise<void> {
  let s: Api.ChanChuaGioSatNgayResponse;
  try {
    s = await api<Api.ChanChuaGioSatNgayResponse>(URL);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.ChanChuaGioSatNgayResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: "nut", "data-cap": s.bat ? undefined : "chinh", type: "button", id: "chan-chua-gio-doi" }, s.bat ? "Tắt chặn chưa có giờ đón" : "Bật chặn chưa có giờ đón");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.ChanChuaGioSatNgayRequest = { bat: !s.bat };
        ve(await api<Api.ChanChuaGioSatNgayResponse>(URL, { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h3", { id: "chan-chua-gio-heading" }, "Chặn đơn chưa có giờ đón khi sát ngày đón"),
      h("p", { id: "chan-chua-gio-trang-thai" }, s.bat ? "Đang bật." : "Đang tắt."),
      h(
        "p",
        { class: "muted" },
        s.bat
          ? "Đơn có lượt đón chưa có giờ mà đã sát ngày đón (ví dụ đón hôm nay) thì phải điền giờ đón rồi mới xác nhận được."
          : "Đơn có lượt đón chưa có giờ được xác nhận dù đã sát ngày đón. Xe chưa xếp được cho tới khi văn phòng điền giờ đón.",
      ),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
