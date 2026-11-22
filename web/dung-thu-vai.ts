// BẢN DÙNG THỬ (ADR-0223 Đ3.1): sau PIN của tài khoản dùng thử, hỏi «Bạn muốn dùng thử với vai nào?» rồi ghi vai vào phiên.
// Danh sách vai lấy từ máy chủ (`GET /api/dung-thu` — chỉ bản dùng thử có); máy chủ kiểm lại vai ở `POST /api/account/dung-thu-vai`.
import { ApiError, api, type Api } from "./api";
import { h } from "./dom";

interface TrangThai { khoa: boolean; lamMoiLuc: string; sdtDungThu: string; vai: { code: string; nhan: string }[] }

/** Trạng thái bản dùng thử, hoặc null ở bản chính thức (đường không có) / khi lỗi mạng. Không ném. */
export async function docDungThu(): Promise<TrangThai | null> {
  try {
    const r = await fetch("/api/dung-thu", { headers: { accept: "application/json" } });
    return r.ok ? ((await r.json()) as TrangThai) : null;
  } catch {
    return null;
  }
}

/** Khung chọn vai. `xong` chạy sau khi máy chủ nhận vai; `baoLoi` hiện câu lỗi ở chỗ lỗi chung của trang. */
export function khungChonVai(tt: TrangThai, xong: () => void, baoLoi: (cau: string | null) => void): HTMLElement {
  let dangGui = false;
  const nut = tt.vai.map((v) =>
    h("button", {
      type: "button", className: "nut", "data-cap": "phu",
      onclick: async () => {
        if (dangGui) return;
        dangGui = true;
        baoLoi(null);
        try {
          await api<Api.MeResponse>("/api/account/dung-thu-vai", { method: "POST", body: { role: v.code } });
          xong();
        } catch (e) {
          dangGui = false;
          baoLoi(e instanceof ApiError ? e.message : "Không kết nối được máy chủ.");
        }
      },
    }, v.nhan),
  );
  return h("section", { className: "dung-thu-vai", ariaLabel: "Chọn vai dùng thử" },
    h("h2", {}, "Bạn muốn dùng thử với vai nào?"),
    h("p", {}, "Muốn đổi vai thì đăng xuất rồi chọn lại."),
    h("div", { className: "dung-thu-vai-ds" }, ...nut),
  );
}
