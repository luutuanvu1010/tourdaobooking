// Hai khối công tắc của Toàn quyền ở trang Tôi (ADR-0228 Đ1, Đ3 — việc 8; khuôn `web/noi-don-cai-dat.ts`): «Đối tác không nhập danh sách hành khách» và «Đơn đối tác không cần giờ đón».
// Chỉ hiện khi máy chủ trả `doiDuoc` (ô settings.ops); máy chủ kiểm lại khi ghi (Quản trị nhận 403). Tên công tắc: khuyến nghị của bản đề xuất ADR-0228, chờ chủ chọn. Không innerHTML.
import { ApiError, api } from "./api";
import { h, replaceChildren } from "./dom";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

interface CongTac { url: string; ten: string; khoa: string; giaiThich: string }
const DS: Record<"hanhKhach" | "gioDon", CongTac> = {
  hanhKhach: {
    url: "/api/cai-dat/hanh-khach-doi-tac",
    ten: "Đối tác không nhập danh sách hành khách",
    khoa: "hanh-khach-dt",
    giaiThich: "Khi bật, đối tác lập đơn không thấy khối Hành khách. Chuyến xe vẫn cần đủ tên khách trước khi xuất bến: văn phòng hoặc đối tác bổ sung tên sau khi đơn được xác nhận.",
  },
  gioDon: {
    url: "/api/cai-dat/khong-can-gio-don",
    ten: "Đơn đối tác không cần giờ đón",
    khoa: "khong-can-gio",
    giaiThich: "Khi bật, đơn có đón của đối tác mà chưa có giờ không phải chờ văn phòng xét chỉ vì thiếu giờ; văn phòng chốt giờ sau bằng «Sửa đưa đón». Lượt đón đã sát hạn chốt vẫn chờ văn phòng. Xe chưa xếp được tới khi có giờ.",
  },
};

export async function ganCongTacDoiTac(el: HTMLElement, loai: keyof typeof DS): Promise<void> {
  const c = DS[loai];
  let s: { bat: boolean; doiDuoc: boolean };
  try {
    s = await api<{ bat: boolean; doiDuoc: boolean }>(c.url);
  } catch {
    return; // lỗi mạng / không có quyền: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  if (!s.doiDuoc) return;
  const ve = (s: { bat: boolean }): void => {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const thuoc = { class: "nut", "data-cap": s.bat ? undefined : "chinh", type: "button", id: `${c.khoa}-doi` };
    // Chữ nút viết thẳng (bài bảng tham chiếu đọc chữ nút ngay trong lời gọi `h("button", …)`).
    const nut = loai === "hanhKhach"
      ? h("button", thuoc, s.bat ? "Tắt đối tác không nhập danh sách hành khách" : "Bật đối tác không nhập danh sách hành khách")
      : h("button", thuoc, s.bat ? "Tắt đơn đối tác không cần giờ đón" : "Bật đơn đối tác không cần giờ đón");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      nut.disabled = true;
      try {
        ve(await api<{ bat: boolean }>(c.url, { method: "POST", body: { bat: !s.bat } }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        nut.disabled = false;
      }
    });
    replaceChildren(el, h("h2", { id: `${c.khoa}-heading` }, c.ten), h("p", { id: `${c.khoa}-trang-thai` }, s.bat ? "Đang bật." : "Đang tắt."), h("p", { class: "muted" }, c.giaiThich), loi, nut);
  };
  ve(s);
  el.hidden = false;
}
