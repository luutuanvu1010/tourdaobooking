// Khối «Ẩn thông tin khách khi đối tác đặt vé» ở trang Tôi — công tắc của Toàn quyền (ADR-0154 Đ2.1; khuôn `web/nhap-tay-cai-dat.ts`, cùng trang). Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops);
// máy chủ kiểm lại khi ghi (POST /api/cai-dat/an-thong-tin-khach — Quản trị nhận 403). Công tắc đổi thì chỉ form Tạo đơn của đối tác lập SAU đó đổi; đơn đã lập không đổi. Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatAnKhach(el: HTMLElement): Promise<void> {
  let s: Api.AnThongTinKhachResponse;
  try {
    s = await api<Api.AnThongTinKhachResponse>("/api/cai-dat/an-thong-tin-khach");
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.AnThongTinKhachResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: s.bat ? "btn" : "btn btn-primary", type: "button", id: "an-khach-doi" }, s.bat ? "Tắt ẩn thông tin khách" : "Bật ẩn thông tin khách");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.AnThongTinKhachRequest = { bat: !s.bat };
        ve(await api<Api.AnThongTinKhachResponse>("/api/cai-dat/an-thong-tin-khach", { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "an-khach-heading" }, "Ẩn thông tin khách khi đối tác đặt vé"),
      h("p", { id: "an-khach-trang-thai" }, s.bat ? "Đang bật." : "Đang tắt."),
      h("p", { class: "muted" }, "Khi bật, đối tác không nhập tên, số điện thoại và danh sách khách khi lập đơn. Đơn lập lúc bật không cần danh sách khách để xe chạy; tắt công tắc không đổi các đơn đó."),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
