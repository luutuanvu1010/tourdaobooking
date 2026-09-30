// Khối "Dịch vụ nhập tay" ở trang Tôi — công tắc của Toàn quyền (ADR-0061 điều 6; khuôn khối "Trợ lý Hỗ trợ" / "Chế độ bảo trì" cùng trang). Chỉ hiện khi
// máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (POST /api/cai-dat/nhap-tay — Quản trị nhận 403). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

export async function ganCaiDatNhapTay(el: HTMLElement): Promise<void> {
  let s: Api.NhapTayResponse;
  try {
    s = await api<Api.NhapTayResponse>("/api/cai-dat/nhap-tay");
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: Api.NhapTayResponse): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { class: s.batNhapTay ? "btn" : "btn btn-primary", type: "button", id: "nhap-tay-doi" }, s.batNhapTay ? "Tắt dịch vụ nhập tay" : "Bật dịch vụ nhập tay");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        const body: Api.NhapTayRequest = { batNhapTay: !s.batNhapTay };
        ve(await api<Api.NhapTayResponse>("/api/cai-dat/nhap-tay", { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "nhap-tay-heading" }, "Dịch vụ nhập tay"),
      h("p", { id: "nhap-tay-trang-thai" }, s.batNhapTay ? "Đang bật." : "Đang tắt."),
      h(
        "p",
        { class: "muted" },
        "Khi bật: Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên và giá tay khi lập, sửa đơn nháp. Tài khoản có quyền Đối tác luôn không dùng được. ",
        "Khi tắt: dịch vụ nhập tay đã có trên đơn vẫn giữ, chỉ xem.",
      ),
      loi,
      nut,
    );
  };
  ve(s);
  el.hidden = false;
}
