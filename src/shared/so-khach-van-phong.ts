// VĂN PHÒNG SỬA SỐ KHÁCH SAU XÁC NHẬN (ADR-0063 D1, chủ duyệt 2026-10-08) — luật thuần dùng chung máy chủ ↔ giao diện. Không I/O, không import src/modules/.
// Route: `POST /api/orders/:id/money-edit` (module orders, cổng office). Tiền KHÔNG tính ở đây: máy chủ tính bằng `planMoneyEdit` (một luật với đường HDV).
// Bài canh: so-khach-van-phong.test.ts (luật thuần) + src/modules/orders/so-khach-van-phong-route.test.ts (route thật).
import { can, type PermissionHolder } from "./permissions.ts";
import type { OrderStatus, PaxCode, PaxCounts, SuaSoKhachDichVuDto } from "./contracts.ts";
import { payingGuests } from "./order-lines.ts";
import { moneyEditServices, type MoneyEditSource } from "./viec-cua-toi.ts";

/**
 * Lý do sửa số khách — MÃ ĐÓNG theo ADR-0023 điều 4 (ADR-0030 S23-9): "Khác" KHÔNG kèm ô chữ. Nhật ký ghi NHÃN (chữ cố định do máy chủ chọn), nên không bao
 * giờ chứa SĐT. Chữ ba mã đầu trùng ba nút chọn nhanh của hướng dẫn viên (`EDIT_REASON_QUICK`, bài so-khach-van-phong.test.ts khoá) — đường HDV vẫn nhận chữ
 * tự gõ (đổi đường đó sang mã là việc riêng của ADR-0023, chưa làm).
 */
export const LY_DO_SUA_SO_KHACH = {
  THEM_NGUOI: "Khách thêm người",
  BOT_NGUOI: "Khách bớt người",
  DOI_DICH_VU: "Đổi dịch vụ",
  KHAC: "Khác",
} as const;
export type MaLyDoSuaSoKhach = keyof typeof LY_DO_SUA_SO_KHACH;
export const MA_LY_DO_SUA_SO_KHACH = Object.keys(LY_DO_SUA_SO_KHACH) as MaLyDoSuaSoKhach[];

const laMa = (v: unknown): v is MaLyDoSuaSoKhach => typeof v === "string" && Object.hasOwn(LY_DO_SUA_SO_KHACH, v);

export type ThanSuaSoKhach = { ok: true; ma: MaLyDoSuaSoKhach; nhan: string; services: unknown } | { ok: false; message: string };

/**
 * Đọc thân route văn phòng: ĐÚNG hai khoá `lyDo` (mã) và `services` (danh sách dịch vụ + số khách mới — `planMoneyEdit` kiểm tiếp). Khoá nào khác (chữ lý do
 * tự gõ `reason`, ghi chú, hay một con số tiền) → từ chối: máy chủ không nhận chữ tự do vào nhật ký và không bao giờ tin số tiền từ trình duyệt.
 */
export function docThanSuaSoKhach(body: Record<string, unknown> | null): ThanSuaSoKhach {
  if (!body) return { ok: false, message: "Thiếu dữ liệu sửa số khách." };
  if (Object.keys(body).some((k) => k !== "lyDo" && k !== "services")) {
    return { ok: false, message: "Lý do sửa số khách chỉ chọn từ danh sách; không gửi kèm chữ gõ tay hay số tiền." };
  }
  if (body.lyDo === undefined || body.lyDo === "") return { ok: false, message: "Cần chọn lý do sửa." };
  if (!laMa(body.lyDo)) return { ok: false, message: "Lý do không có trong danh sách." };
  return { ok: true, ma: body.lyDo, nhan: LY_DO_SUA_SO_KHACH[body.lyDo], services: body.services };
}

/**
 * Ai sửa được số khách ở trang đơn (nút "Sửa số khách dịch vụ") — ô `order.money.edit` KHÔNG truyền `assigned`: Bán hàng chỉ đơn MÌNH lập (`own`), Kế toán /
 * Quản trị / Toàn quyền mọi đơn (`any`); hướng dẫn viên (ô `assigned`) không có đường này — họ giữ nút riêng ở "Việc của tôi". Đơn phải đã xác nhận, chưa
 * "Đã giao"; KHÔNG chặn theo ngày đi (văn phòng sửa được cả sau ngày đi). Giao diện chỉ ẩn/hiện; máy chủ tự hỏi lại `can()` trong route.
 */
export function duocSuaSoKhachVanPhong(viewer: PermissionHolder, don: { staffId: string; status: OrderStatus; deliveredAt: string | null }): boolean {
  return don.status === "confirmed" && don.deliveredAt === null && can(viewer, "order.money.edit", { ownerId: don.staffId });
}

/**
 * Giảm giá lớn hơn tạm tính HIỆN HÀNH (ADR-0109 QĐ3; trước đây gọi "tổng âm"): sau khi bớt khách, tiền dịch vụ có thể nhỏ hơn giảm giá đã lưu (giảm giá không sửa
 * được sau xác nhận). KHÔNG chặn (chủ duyệt 2026-10-08 "cảnh báo, không chặn"; ADR-0063 D1.12), chỉ cảnh báo. Phải thu nay KẸP về 0 (`effectiveMoney`), nên điều
 * kiện không còn là "tổng < 0" mà là giảm giá > tạm tính (so nghiêm: bằng nhau thì phải thu 0 nhưng không có phần vượt). Tính từ trạng thái HIỆN HÀNH của đơn
 * (không lưu cờ), nên Kế toán mở đơn lúc nào cũng thấy. Câu đúng ở MỌI trạng thái (chưa hoàn, đã hoàn, Đã giao, Hoàn thành — phiếu phản biện ADR-0109) và không
 * có chữ số. Một hàm dùng chung máy chủ (phản hồi route) ↔ giao diện (khối Thanh toán); khoá JSON `canhBaoTongAm`, khoá sổ vàng `canh_bao_tong_am`, thuộc tính
 * `data-canh-bao="tong-am"` GIỮ tên cũ (không đổi hợp đồng).
 */
export const CAU_GIAM_GIA_VUOT =
  "Giảm giá lớn hơn tiền dịch vụ sau khi bớt khách, nên khách không còn phải trả gì và phần giảm giá vượt không dùng tới. Khách đã trả bao nhiêu thì số đó là tiền trả dư; nếu chưa hoàn thì Kế toán hoàn lại cho khách.";
export const canhBaoGiamGiaVuot = (don: { subtotal: number; discount: number }): string | null => (don.discount > don.subtotal ? CAU_GIAM_GIA_VUOT : null);

/**
 * ADR-0114 D1 (chủ duyệt 2026-10-13: "nếu giảm số lượng thì nhớ hiện nhắc nhở phần khuyến mại… phải báo đỏ"): đơn có giảm giá mà SỐ KHÁCH đã giảm so với lúc xác nhận thì
 * giảm giá vẫn giữ nguyên — Kế toán cần xem lại khuyến mại. CHỈ CẢNH BÁO (không đổi số tiền, không chặn), chạy ĐỘC LẬP với `canhBaoGiamGiaVuot` (hai câu có thể cùng hiện).
 * Tính từ trạng thái HIỆN HÀNH, không lưu cờ: 10 → 2 → 3 vẫn nhắc cho tới khi đủ lại số lúc xác nhận. "Số khách" = `soKhachTraTien` (người lớn + trẻ em + người cao tuổi,
 * cộng mọi dịch vụ; em bé không tính). Máy chủ tính `khachLucXacNhan` từ số khách ĐÃ LƯU (bị đóng băng sau xác nhận) và `khachHienHanh` từ đơn sau điều chỉnh; câu không có chữ số.
 * Khoá JSON `canhBaoKhuyenMai` ở phản hồi `POST /api/orders/:id/money-edit` và `GET /api/orders/:id`; phản hồi của đường hướng dẫn viên là kiểu khác (`{ ok }`) nên không có khoá này.
 */
export const CAU_KHUYEN_MAI_KHI_BOT_KHACH = "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại.";
// "Đơn có giảm giá" = GIẢM GIÁ HIỆU LỰC > 0 (`OrderDto.giamGiaHieuLuc`, số do `effectiveMoney` trả — ADR-0109): hàm này không tự so/trừ `discount` (hàng rào H1). Tạm tính hiện
// hành về 0 thì giảm giá hiệu lực về 0 ⇒ không nhắc (giảm giá đã không còn trừ được đồng nào; lúc đó đã có `canhBaoGiamGiaVuot`).
export const canhBaoKhuyenMai = (don: { giamGiaHieuLuc: number }, khachLucXacNhan: number, khachHienHanh: number): string | null =>
  don.giamGiaHieuLuc > 0 && khachHienHanh < khachLucXacNhan ? CAU_KHUYEN_MAI_KHI_BOT_KHACH : null;

/** Số khách trả tiền của cả đơn: `payingGuests` (người lớn + trẻ em + người cao tuổi) cộng mọi dịch vụ — kể cả nhập tay (số khách ở `adult`). Một nguồn cho máy chủ. */
export const soKhachTraTien = (dichVu: readonly { pax: Partial<Record<PaxCode, number>> }[]): number => dichVu.reduce((n, s) => n + payingGuests(s.pax), 0);

/**
 * Nguồn dòng của bảng "Sửa số khách dịch vụ" (web/sheet-so-khach.ts): mỗi dịch vụ của đơn (số khách HIỆN HÀNH — đã áp dòng điều chỉnh gần nhất) kèm loại
 * khách sửa được do MÁY CHỦ gửi (`suaSoKhach` của GET /api/orders/:id — tính từ bản chụp gốc, `editablePaxCodesOf`). Dịch vụ nhập tay luôn chỉ xem.
 * `null` = không có nút: máy chủ không gửi (người xem không có ô / đơn không đủ điều kiện) hoặc không dịch vụ nào có loại khách sửa được.
 */
export function nguonBangSuaSoKhach(
  services: readonly { id: string; catalogCode: string | null; pax: PaxCounts }[],
  suaSoKhach: readonly SuaSoKhachDichVuDto[] | null,
): MoneyEditSource[] | null {
  if (!suaSoKhach) return null;
  const loai = new Map(suaSoKhach.map((s) => [s.serviceId, s.loaiKhach] as const));
  const nguon = services.map((s) => ({ id: s.id, catalogCode: s.catalogCode, pax: s.pax, editablePaxCodes: s.catalogCode === null ? [] : (loai.get(s.id) ?? []) }));
  return nguon.some((s) => s.editablePaxCodes.length > 0) ? nguon : null;
}

/** Thân `POST /api/orders/:id/money-edit`: mã lý do + ĐỦ mọi dịch vụ danh mục (dùng lại `moneyEditServices` của đường HDV — một luật dựng danh sách). */
export const thanSuaSoKhach = (
  lyDo: MaLyDoSuaSoKhach,
  nguon: readonly MoneyEditSource[],
  nhap: ReadonlyMap<string, Partial<Record<PaxCode, number>>>,
): { lyDo: MaLyDoSuaSoKhach; services: { id: string; pax: PaxCounts }[] } => ({ lyDo, services: moneyEditServices(nguon, nhap) });
