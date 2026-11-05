// Khối «Người phụ trách» (Bán hàng phụ trách, ADR-0142) ở trang đơn: hiện dòng nào và nút nào. Thuần, không DOM. Quyền đi qua `can()` / các hàm của permissions.ts; máy chủ
// kiểm lại mọi nút (route `…/ban-hang/*`). Khác khối «Hướng dẫn viên» (ô `HANDLE`, handler-view.ts): hai vai khác nhau trên cùng một đơn (chủ dự án 5/11).
import type { BanHangDonDto, OrderStatus } from "./contracts.ts";
import { banner, type Banner, type ErrorInput } from "./order-errors.ts";
import { dongBanHangDanhSach } from "./ban-hang-dong.ts";
import { can, hasPermission, holdsPartner, passesAdminGate, type PermissionHolder } from "./permissions.ts";

/** Điều kiện của đơn mà khối cần (trang đơn gom từ DTO đơn). */
export interface DonChoBanHang {
  status: OrderStatus;
  daGiao: boolean;
  /** Đơn nháp đang có yêu cầu xác nhận mở. */
  dangChoQuyet: boolean;
  /** Người xem quyết được Còn vé / Hết vé (cờ `xacNhan.quyetDinhDuoc` của máy chủ). */
  quyetDinhDuoc: boolean;
  /** Đơn nháp: Bán hàng người lập đã mời (`OrderDetailResponse.banHangMoi`). */
  banHangMoi: { staffId: string; name: string } | null;
}

export interface BanHangTrang {
  dong: { kieu: "ten" | "cho" | "moi"; text: string };
  /** «Nhận phụ trách» (đơn chờ xác nhận: mở bảng Còn vé / Hết vé có sẵn). */
  nhan: boolean;
  /** «Từ chối» — chỉ người được mời. */
  tuChoi: boolean;
  /** «Đổi người phụ trách» / «Chọn người phụ trách» — Quản trị, Toàn quyền, đơn đã xác nhận. */
  doi: boolean;
  doiNhan: string;
}

/**
 * `dto` undefined = chưa tải được (không khối, không đoán). Đơn nháp chưa gửi: không khối, trừ khi người lập đã mời ai (chỉ dòng chữ, không nút).
 * Lời mời còn ưu tiên của người khác: chỉ X và Quản trị / Toàn quyền nhận được (như máy chủ, `duocNhanBanHang`).
 */
export function banHangTrang(viewer: PermissionHolder, dto: BanHangDonDto | undefined | null, don: DonChoBanHang): BanHangTrang | null {
  if (!dto) return null;
  const nhapChuaGui = don.status === "draft" && !don.dangChoQuyet;
  if (nhapChuaGui) return don.banHangMoi ? { dong: { kieu: "moi", text: `Đang mời ${don.banHangMoi.name}` }, nhan: false, tuChoi: false, doi: false, doiNhan: "" } : null;
  const dong: BanHangTrang["dong"] = dto.banHang ? { kieu: "ten", text: dto.banHang.name } : { kieu: dto.loiMoi ? "moi" : "cho", text: dongBanHangDanhSach(dto) };
  const dangMo = !don.daGiao && (don.status === "confirmed" || don.dangChoQuyet);
  const laX = dto.loiMoi !== null && dto.loiMoi.staffId !== null && dto.loiMoi.staffId === viewer.id;
  const duocNhan = can(viewer, "dispatch.sales.claim") && !holdsPartner(viewer);
  const uuTienNguoiKhac = dto.loiMoi !== null && !laX && !passesAdminGate(viewer);
  const nhan = dangMo && dto.banHang === null && duocNhan && !uuTienNguoiKhac && (don.status === "confirmed" || don.quyetDinhDuoc);
  const tuChoi = dangMo && dto.banHang === null && laX && duocNhan;
  const doi = don.status === "confirmed" && !don.daGiao && can(viewer, "dispatch.sales.assign") && !holdsPartner(viewer) && !hasPermission(viewer, "INTERN");
  return { dong, nhan, tuChoi, doi, doiNhan: dto.banHang ? "Đổi người phụ trách" : "Chọn người phụ trách" };
}

export interface BanHangFailure {
  banner: Banner;
  /** true → tải lại đơn (màn hình đã cũ hoặc quyền đã đổi); false → giữ nguyên để người dùng chọn lại / thử lại. */
  reload: boolean;
}

/**
 * Máy chủ từ chối Nhận / Từ chối / Đổi người phụ trách → một banner tiếng Việt, không lộ mã lỗi. `e` null = không tới được máy chủ. Câu của máy chủ chỉ dùng ở các nhánh
 * nó nói rõ việc phải làm (đang chờ người khác trả lời, đơn cũ, quá ngày đi…); câu về «ai vừa đổi» (409 stale / no_change, 403) có chữ riêng để gọi đúng «người phụ trách».
 */
export function banHangFailure(e: ErrorInput | null, kind: "nhan" | "tu-choi" | "doi"): BanHangFailure {
  if (e === null) return { banner: banner("danger", "Không kết nối được máy chủ.", { lines: [{ text: "Kiểm tra kết nối mạng rồi thử lại." }] }), reload: false };
  if (e.status === 403) return { banner: banner("danger", kind === "doi" ? "Bạn không còn quyền đổi người phụ trách của đơn này. Đã tải lại đơn." : "Bạn không nhận phụ trách đơn này được nữa. Đã tải lại đơn."), reload: true };
  if (e.status === 404) return { banner: banner("warning", "Không tìm thấy đơn. Đã tải lại."), reload: true };
  if (e.status === 409 && e.code === "stale") return { banner: banner("warning", kind === "doi" ? "Người phụ trách của đơn vừa được đổi ở nơi khác. Đã tải lại — hãy xem người phụ trách hiện tại rồi thử lại nếu cần." : "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn."), reload: true };
  if (e.status === 409 && e.code === "no_change") return { banner: banner("info", "Người này đang phụ trách đơn rồi. Đã tải lại đơn."), reload: true };
  if (e.status === 409 && e.code === "khong_co_loi_moi") return { banner: banner("warning", "Lời mời không còn nữa. Đã tải lại đơn."), reload: true };
  if (e.status === 409) return { banner: banner("warning", e.message || "Chưa thực hiện được. Đã tải lại đơn."), reload: true };
  return { banner: banner("danger", e.message || "Có lỗi xảy ra, thử lại sau."), reload: false };
}

/** Câu báo (banner thông tin) sau khi nhận / đổi thành công. */
export const banHangDaLuu = (kind: "nhan" | "tu-choi" | "doi", name: string): string =>
  kind === "nhan" ? "Bạn đã nhận phụ trách đơn này." : kind === "tu-choi" ? "Đã từ chối. Đơn chuyển sang Chờ Bán hàng nhận." : `Đã đổi người phụ trách sang ${name}.`;
