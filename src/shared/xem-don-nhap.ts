// ADR-0135 (chủ duyệt 19/10/2026): đơn NHÁP là vùng riêng của người lập. MỘT nơi duy nhất quyết «ai đọc / ai ghi được đơn nháp»; route và hàm đọc
// khác gọi các hàm này, không rải điều kiện rời (kế hoạch Task 2.1/2.3). Người không đủ điều kiện nhận 404 (không 403: không dò được đơn có tồn tại).
// Hàm thuần — không I/O.

export type TrangThaiDonXem = "draft" | "confirmed" | "cancelled";

/** ADR-0213 Đ8.2: chế độ thành viên của một tổ chức (tập đóng). Không dòng cài đặt ⇒ «Soạn và gửi người quản lý xác nhận». */
export type CheDoThanhVien = "CHI_SOAN" | "SOAN_VA_GUI";

/**
 * NGOẠI LỆ CÓ TÊN của ADR-0135 (ADR-0213 «Sửa ADR cũ», Đ5, Đ8; mốc B2 Task 16): dữ kiện của MỘT nháp có bên đặt là tổ chức. `laQuanLyCoHieuLuc` = người gọi là người quản lý có
 * hiệu lực (Đ2.8) của tổ chức đó; `nguoiLapLaThanhVienLucLap` = `orders.acting_link_kind = 'MEMBER'` (Ruling R10 — ghi lúc lập, không đổi, người đã rời vẫn tính); `cheDo` = chế độ hiện
 * hành của tổ chức; `dangChoQuanLy` = nháp có dòng «chờ người quản lý» đang mở (`ord_member_submit`). KHÁC `dangCho` (yêu cầu xác nhận của văn phòng đang mở): không trộn hai cờ.
 */
export interface NgoaiLeToChuc { laQuanLyCoHieuLuc: boolean; nguoiLapLaThanhVienLucLap: boolean; cheDo: CheDoThanhVien; dangChoQuanLy: boolean }

/** Người quản lý đọc / ghi nháp của thành viên: chế độ «Chỉ soạn» (mọi nháp của thành viên), hoặc nháp thành viên đã gửi tới («Soạn và gửi»). Không ai khác được thêm. */
export const quanLyThayNhapThanhVien = (n: NgoaiLeToChuc | undefined): boolean =>
  n !== undefined && n.laQuanLyCoHieuLuc && n.nguoiLapLaThanhVienLucLap && (n.cheDo === "CHI_SOAN" || n.dangChoQuanLy);

/**
 * Ai ĐỌC được đơn. `coQuyenXem` = `can(staff, "order.view", { ownerId, assigned })` do route tính sẵn. Đơn đã xác nhận / đã huỷ: đi theo bảng quyền như cũ.
 * Đơn nháp: chỉ người lập (và bảng quyền cho xem), hoặc — Đợt 3 — người quyết định xác nhận khi đơn ĐANG CHỜ. Trước Đợt 3 route truyền
 * `dangCho = false`, `xetDuyetDuoc = false`. Hàm này THAY cho `if (!can(order.view)) 404`, không phải lớp thêm sau nó.
 */
export function xemDuocDon(i: { coQuyenXem: boolean; status: TrangThaiDonXem; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean; quanLyBenDat?: boolean; ngoaiLeToChuc?: NgoaiLeToChuc }): boolean {
  if (i.status !== "draft") return i.coQuyenXem;
  // ADR-0213 Đ5 (mốc B1 Task 12): người quản lý có hiệu lực của bên đặt đọc nháp ĐANG CHỜ văn phòng (đã gửi lên Tour Đảo) — `coQuyenXem` đã tính với cờ.
  // B2 (Task 16): ngoại lệ có tên Đ8 — nháp của thành viên, theo chế độ; route bật cờ `quanLyBenDat` khi ngoại lệ đúng nên `coQuyenXem` cũng đã gồm cờ.
  return (i.laNguoiLap && i.coQuyenXem) || (i.dangCho && i.xetDuyetDuoc) || (i.dangCho && i.quanLyBenDat === true && i.coQuyenXem)
    || (!i.laNguoiLap && i.coQuyenXem && quanLyThayNhapThanhVien(i.ngoaiLeToChuc));
}

/** ADR-0213 Đ5: đơn ĐÃ GỬI LÊN Tour Đảo — đã xác nhận, đã huỷ, hoặc nháp có yêu cầu xác nhận mở («đang chờ văn phòng»). Cờ `quanLyBenDat` của đường đọc chỉ bật khi đúng. */
export const donDaGuiLen = (v: { status: TrangThaiDonXem; coYeuCauMo: boolean }): boolean => v.status !== "draft" || v.coYeuCauMo;

/**
 * Kết quả chuẩn cho đường ĐỌC: "ok" | "404" | "403". Đơn nháp không xem được → LUÔN "404" (kể cả người có ô xem mọi đơn). Đơn đã xác nhận / huỷ không xem được:
 * giữ luật cũ — tài khoản CHỈ xem đơn mình phụ trách (`chiXemDonDuocGiao`) nhận 404 như đơn không tồn tại, còn lại 403. Các route dựng Response từ đây (không rải điều kiện).
 */
export function ketQuaXemDon(i: { coQuyenXem: boolean; status: TrangThaiDonXem; laNguoiLap: boolean; dangCho: boolean; xetDuyetDuoc: boolean; quanLyBenDat?: boolean; ngoaiLeToChuc?: NgoaiLeToChuc; chiXemDonDuocGiao: boolean }): "ok" | "404" | "403" {
  if (xemDuocDon(i)) return "ok";
  return (i.status === "draft" && !i.laNguoiLap) || i.chiXemDonDuocGiao ? "404" : "403";
}

/**
 * Ai GHI được lên đơn: đơn nháp chỉ người lập (Toàn quyền, người phụ trách chọn sẵn đều không). Đơn đã xác nhận / huỷ: luật này không chặn (các cổng cũ vẫn áp).
 * ADR-0213 Đ8 (B2): người lập là thành viên KHÔNG ghi khi nháp đang chờ người quản lý (phải «Rút lại» trước); người quản lý ghi theo ngoại lệ có tên. «Còn liên kết» của người lập do
 * cổng chung `chanGhiNhap` (orders) kiểm — hàm thuần không biết.
 */
export function chiNguoiLapGhiNhap(i: { status: TrangThaiDonXem; laNguoiLap: boolean; ngoaiLeToChuc?: NgoaiLeToChuc }): boolean {
  if (i.status !== "draft") return true;
  return i.laNguoiLap ? i.ngoaiLeToChuc?.dangChoQuanLy !== true : quanLyThayNhapThanhVien(i.ngoaiLeToChuc);
}

/**
 * ADR-0213 mục «Xem» + chủ duyệt 17/11/2026 («Áp cả ba», Q3): thành viên A không thấy đơn của thành viên B cùng tổ chức — trả 404 (như đơn không tồn tại), KHÔNG 403. Chỉ dùng để ĐỔI
 * mã từ chối của một lần đọc ĐÃ bị từ chối (không bao giờ cho xem thêm). Đúng khi: người xem không phải người lập, đơn lập với tư cách THÀNH VIÊN (`acting_link_kind = 'MEMBER'`,
 * R10) của tổ chức `toChucCuaDon` (tổ chức đơn thay mặt), và tổ chức đó có trong các tổ chức hiện thời của người xem (`toChucCuaToi` — tư cách của chính người gọi). Đối tác lạ: giữ 403.
 */
export const thanhVienCungToChucXemDonNguoiKhac = (i: { laNguoiLap: boolean; actingLinkKind: string | null; toChucCuaDon: string | null; toChucCuaToi: readonly string[] }): boolean =>
  !i.laNguoiLap && i.actingLinkKind === "MEMBER" && i.toChucCuaDon !== null && i.toChucCuaToi.includes(i.toChucCuaDon);
