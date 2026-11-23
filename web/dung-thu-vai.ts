// BẢN DÙNG THỬ (ADR-0223 Đ3.1): sau PIN của tài khoản dùng thử, hỏi «Bạn muốn dùng thử với vai trò nào?» rồi ghi vai trò vào phiên.
// Danh sách vai lấy từ máy chủ (`GET /api/dung-thu` — chỉ bản dùng thử có); máy chủ kiểm lại vai ở `POST /api/account/dung-thu-vai`.
import { ApiError, api, type Api } from "./api";
import { h } from "./dom";
import { khoi, thanhNut } from "./khung";

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
  // Bộ khung chung (ADR-0222): một khối, các nút xếp trong thanh nút — không thêm luật bố cục riêng.
  return khoi({ tieuDe: "Bạn muốn dùng thử với vai trò nào?", idTieuDe: "dung-thu-vai-tieu-de", moTa: "Muốn đổi vai trò thì đăng xuất rồi chọn lại." }, thanhNut(null, ...nut));
}

/**
 * Khối «Bản dùng thử» ở trang Tôi (ADR-0223 Đ5): chỉ hiện khi đang ở bản dùng thử và người xem giữ ô settings.ops; máy chủ đòi quyền THẬT Toàn quyền.
 * Bản chính thức: `GET /api/dung-thu` không có ⇒ không vẽ gì.
 */
export async function ganKhoaDungThu(sau: HTMLElement): Promise<void> {
  const tt = await docDungThu();
  if (!tt) return;
  let khoa = tt.khoa;
  const trangThai = h("p", {});
  const loi = h("p", { className: "error", role: "alert", hidden: true });
  const nut = h("button", { type: "button", className: "nut", "data-cap": "phu" });
  const ve = (): void => {
    const gio = new Date(tt.lamMoiLuc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
    trangThai.textContent = khoa
      ? `Đăng nhập dùng thử đang tạm khoá: người thử không vào được, máy đang dùng thử bị chặn ở lần bấm kế tiếp. Dữ liệu tự xoá lúc ${gio}.`
      : `Đăng nhập dùng thử đang mở. Bấm Khoá thì người thử không vào được nữa (bạn vẫn vào được); trạng thái giữ nguyên khi dữ liệu tự xoá lúc ${gio}.`;
    nut.textContent = khoa ? "Mở bản dùng thử" : "Khoá bản dùng thử";
  };
  nut.addEventListener("click", async () => {
    nut.disabled = true;
    loi.hidden = true;
    try {
      khoa = (await api<{ khoa: boolean }>("/api/dung-thu/khoa", { method: "POST", body: { khoa: !khoa } })).khoa;
      ve();
    } catch (e) {
      loi.textContent = e instanceof ApiError ? e.message : "Không kết nối được máy chủ.";
      loi.hidden = false;
    } finally {
      nut.disabled = false;
    }
  });
  ve();
  sau.after(khoi({ tieuDe: "Bản dùng thử", idTieuDe: "dung-thu-khoa-tieu-de", viec: [nut] }, trangThai, loi));
}
