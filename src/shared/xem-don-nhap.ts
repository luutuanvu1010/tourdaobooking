// ADR-0135 (chủ duyệt 19/10/2026): đơn NHÁP là vùng riêng của người lập. MỘT nơi duy nhất quyết «ai đọc / ai ghi được đơn nháp»; route và hàm đọc
// khác gọi các hàm này, không rải điều kiện rời (kế hoạch Task 2.1/2.3). Người không đủ điều kiện nhận 404 (không 403: không dò được đơn có tồn tại).
// Hàm thuần — không I/O.

export type TrangThaiDonXem = "draft" | "confirmed" | "cancelled";

/**
 * Ai ĐỌC được đơn. `coQuyenXem` = `can(staff, "order.view", { ownerId, assigned })` do route tính sẵn. Đơn đã xác nhận / đã huỷ: đi theo bảng quyền như cũ.
 * Đơn nháp: chỉ người lập (và bảng quyền cho xem), hoặc — Đợt 3 — người quyết định xác nhận khi đơn ĐANG CHỜ. Trước Đợt 3 route truyền
 * `dangCho = false`, `xetDuyetDuoc = false`. Hàm này THAY cho `if (!can(order.view)) 404`, không phải lớp thêm sau nó.
 */
export function xemDuocDon(i: { coQuyenXem: boolean; status: TrangThaiDonXem; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean; quanLyBenDat?: boolean }): boolean {
  if (i.status !== "draft") return i.coQuyenXem;
  // ADR-0213 Đ5 (mốc B1 Task 12): người quản lý có hiệu lực của bên đặt đọc nháp ĐANG CHỜ văn phòng (đã gửi lên Tour Đảo) — `coQuyenXem` đã tính với cờ. Nháp khác: ADR-0135 (B2 thêm ngoại lệ Đ8).
  return (i.laNguoiLap && i.coQuyenXem) || (i.dangCho && i.xetDuyetDuoc) || (i.dangCho && i.quanLyBenDat === true && i.coQuyenXem);
}

/** ADR-0213 Đ5: đơn ĐÃ GỬI LÊN Tour Đảo — đã xác nhận, đã huỷ, hoặc nháp có yêu cầu xác nhận mở («đang chờ văn phòng»). Cờ `quanLyBenDat` của đường đọc chỉ bật khi đúng. */
export const donDaGuiLen = (v: { status: TrangThaiDonXem; coYeuCauMo: boolean }): boolean => v.status !== "draft" || v.coYeuCauMo;

/**
 * Kết quả chuẩn cho đường ĐỌC: "ok" | "404" | "403". Đơn nháp không xem được → LUÔN "404" (kể cả người có ô xem mọi đơn). Đơn đã xác nhận / huỷ không xem được:
 * giữ luật cũ — tài khoản CHỈ xem đơn mình phụ trách (`chiXemDonDuocGiao`) nhận 404 như đơn không tồn tại, còn lại 403. Các route dựng Response từ đây (không rải điều kiện).
 */
export function ketQuaXemDon(i: { coQuyenXem: boolean; status: TrangThaiDonXem; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean; quanLyBenDat?: boolean; chiXemDonDuocGiao: boolean }): "ok" | "404" | "403" {
  if (xemDuocDon(i)) return "ok";
  return (i.status === "draft" && !i.laNguoiLap) || i.chiXemDonDuocGiao ? "404" : "403";
}

/** Ai GHI được lên đơn: đơn nháp chỉ người lập (Toàn quyền, người phụ trách chọn sẵn đều không). Đơn đã xác nhận / huỷ: luật này không chặn (các cổng cũ vẫn áp). */
export function chiNguoiLapGhiNhap(i: { status: TrangThaiDonXem; laNguoiLap: boolean }): boolean {
  return i.status !== "draft" || i.laNguoiLap;
}
