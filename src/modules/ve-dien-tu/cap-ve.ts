// Giữ chỗ và trả vé NGUYÊN TỬ (ADR-0153 Đ1; kế hoạch Task 3). Trả CÂU (chưa chạy) để người gọi gộp vào `db.batch` của mình:
//   • cấp vé: lô RIÊNG sau lô xác nhận (hàm gọi nằm ở Task 5), từng nhóm khách: UPDATE vé → INSERT phân bổ → nhật ký (gác `changes() > 0`);
//   • trả vé: NẰM TRONG lô huỷ / sửa số khách của orders — cùng nguyên tử với việc huỷ.
// Thứ tự cổng-trước-nhật-ký của van-chuyen không áp nguyên văn ở đây: lô D1 là một giao dịch nên toàn bộ thắng hoặc thua cùng nhau, và cổng là chính trạng thái vé
// (module nghiêm không đọc `audit_log`). Nhật ký CHỈ ghi nhãn nhóm khách và số cần — KHÔNG BAO GIỜ mã vé, nội dung QR, khoá kho.
import { NHOM_VE, canVe, type Nhom } from "./rules.ts";
import { cauGhiPhanBo, cauGiuVe, cauTraPhanBo, cauVeVeKho, demDangGiu, demTraTheoNhom } from "./repository.ts";

/** Dòng nhật ký của kho vé. Gốc của module (index.ts) nối vào `auditStatement`; bài thử nối vào bảng giả. Không có chỗ cho mã vé. */
export interface NhatKyVe { staffId: string | null; action: "ve_giu_cho" | "ve_tra_ve"; at: string; orderId: string; targetType: "ve"; targetId: string; detail: string }
export type GhiNhatKy = (entry: NhatKyVe, onlyIf: string) => D1PreparedStatement;
export type LyDoTraVe = "DON_HUY" | "GIAM_SO_KHACH" | "RUT_XAC_NHAN";
export const NHAN_NHOM: Record<Nhom, string> = { ADULT: "Người lớn", CHILD: "Trẻ em", SENIOR: "Cao tuổi" };

export interface DichCapVe { orderId: string; serviceId: string; catalogCode: string; ngayDi: string; pax: { adult: number; child: number; senior: number; infant: number } }

/** Câu giữ chỗ vé cho MỘT dòng dịch vụ theo số khách hiệu lực (em bé = 0 vé). Chạy lại bao nhiêu lần cũng không giữ thừa: số lấy tính trong SQL lúc chạy. */
export function soanCapVe(db: D1Database, dich: DichCapVe, nguoi: string | null, at: string, nhatKy: GhiNhatKy): { cau: D1PreparedStatement[]; can: Record<Nhom, number> } {
  const can = canVe(dich.pax);
  const cau: D1PreparedStatement[] = [];
  for (const nhom of NHOM_VE) {
    if (can[nhom] === 0) continue;
    const p = { catalogCode: dich.catalogCode, nhom, ngayDi: dich.ngayDi, can: can[nhom], orderId: dich.orderId, serviceId: dich.serviceId, at, by: nguoi };
    cau.push(cauGiuVe(db, p), cauGhiPhanBo(db, p));
    cau.push(nhatKy({ staffId: nguoi, action: "ve_giu_cho", at, orderId: dich.orderId, targetType: "ve", targetId: dich.serviceId, detail: `Giữ chỗ vé · ${NHAN_NHOM[nhom]}: cần ${can[nhom]}` }, "changes() > 0"));
  }
  return { cau, can };
}

/** Vé đang giữ của một dòng dịch vụ theo nhóm (để suy ra «thiếu vé» = cần − đang giữ). */
export async function veDangGiu(db: D1Database, serviceId: string): Promise<Record<Nhom, number>> {
  const dem = await demDangGiu(db, serviceId);
  return { ADULT: dem.ADULT ?? 0, CHILD: dem.CHILD ?? 0, SENIOR: dem.SENIOR ?? 0 };
}

export interface TraVe {
  orderId: string;
  /** Giới hạn theo một dòng dịch vụ (bắt buộc với GIAM_SO_KHACH). */
  serviceId?: string;
  lyDo: LyDoTraVe;
  at: string;
  by: string | null;
  /** Ngày dân sự hôm nay (giờ Việt Nam): vé hết hạn không về kho. */
  homNay: string;
  /** Chỉ với GIAM_SO_KHACH: số vé cần giữ lại theo nhóm (số khách hiệu lực mới). */
  conLai?: Record<Nhom, number>;
  /** Cổng trạng thái đơn cho lô huỷ / rút xác nhận (xem `TraVeNhom.chiKhiDon`). Bỏ trống = không cổng (sửa số khách chạy SAU lô). */
  chiKhiDon?: "cancelled" | "draft";
}

/**
 * Câu trả vé. Trả theo thứ tự «chưa lộ trước». Vé về `AVAILABLE` nếu còn hạn và chưa từng lộ, ngược lại `VOID`.
 * GIAM_SO_KHACH chỉ trả vé CHƯA lộ — không tự thu hồi vé khách đang giữ; còn thừa thì `canhBaoVeDaGiaoConThua`.
 * DON_HUY / RUT_XAC_NHAN trả hết; có vé đã lộ trong đó thì cũng báo cảnh báo (vé bị vô hiệu, khách có thể còn giữ ảnh).
 * Cờ cảnh báo tính từ một lần đọc TRƯỚC lô (chỉ để hiện nhãn); việc trả chạy đúng bất kể cờ.
 */
export async function soanTraVe(db: D1Database, p: TraVe, nhatKy: GhiNhatKy): Promise<{ cau: D1PreparedStatement[]; canhBaoVeDaGiaoConThua: boolean }> {
  const giamSo = p.lyDo === "GIAM_SO_KHACH";
  if (giamSo && (!p.conLai || !p.serviceId)) throw new Error("GIAM_SO_KHACH cần serviceId và conLai");
  const dem = await demTraTheoNhom(db, p.orderId, p.serviceId ?? null);
  let canhBao = false;
  const cau: D1PreparedStatement[] = [];
  // LUÔN dựng đủ ba nhóm: lần đọc `dem` ở trên diễn ra TRƯỚC lô, một lô cấp vé chen giữa có thể thêm vé vào nhóm mà `dem` không thấy; các câu đều gác bằng
  // điều kiện dòng nên vô hại khi không có gì để trả. Chỉ cờ cảnh báo dựa vào lần đọc.
  for (const nhom of NHOM_VE) {
    const d = dem[nhom] ?? { dangGiu: 0, chuaLo: 0 };
    const conLai = giamSo ? p.conLai![nhom] : 0;
    const traDuoc = giamSo ? d.chuaLo : d.dangGiu; // giảm số khách: chỉ vé chưa lộ
    if (d.dangGiu - Math.min(traDuoc, Math.max(0, d.dangGiu - conLai)) > conLai) canhBao = true; // còn thừa mà không trả được
    if (!giamSo && d.dangGiu > d.chuaLo) canhBao = true; // huỷ / rút khi có vé đã lộ: vô hiệu + cảnh báo
    // Nhật ký gác ngay sau câu trả phân bổ (không sau câu vé): phân bổ đã đóng thì luôn có dấu vết, kể cả khi vé không còn ở ALLOCATED.
    cau.push(cauTraPhanBo(db, { orderId: p.orderId, serviceId: p.serviceId ?? null, nhom, lyDo: p.lyDo, at: p.at, by: p.by, conLai, chiVeChuaLo: giamSo, chiKhiDon: p.chiKhiDon ?? null }));
    cau.push(nhatKy({ staffId: p.by, action: "ve_tra_ve", at: p.at, orderId: p.orderId, targetType: "ve", targetId: p.serviceId ?? p.orderId, detail: `Trả vé · ${NHAN_NHOM[nhom]} · lý do ${p.lyDo}` }, "changes() > 0"));
  }
  cau.push(cauVeVeKho(db, { orderId: p.orderId, lyDo: p.lyDo, at: p.at, by: p.by, homNay: p.homNay }));
  return { cau, canhBaoVeDaGiaoConThua: canhBao };
}
