// Khối «Người phụ trách» (Bán hàng phụ trách, ADR-0142) ở trang đơn: hiện dòng nào và nút nào. Thuần, không DOM. Quyền đi qua `can()` / các hàm của permissions.ts; máy chủ
// kiểm lại mọi nút (route `…/ban-hang/*`). Khác khối «Hướng dẫn viên» (ô `HANDLE`, handler-view.ts): hai vai khác nhau trên cùng một đơn (chủ dự án 5/11).
import type { BanHangDonDto, OrderStatus } from "./contracts.ts";
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
