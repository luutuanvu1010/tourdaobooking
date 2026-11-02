// «Khách đặt cọc trước» (ADR-0159) — phần của billing: dựng câu khoản thu cho lô xác nhận của `orders` (ADR-0024 đ4: gốc lắp ráp tiêm, `orders` không đọc, không ghi `bil_*`).
// Người thu và người ghi là NGƯỜI LẬP dù ai bấm: ghi theo người bấm thì vai BOOKER thành lời khai chờ Kế toán, có dấu chờ và chặn «Đã giao» (`laLoiKhaiBenKia`).
// Vai BOOKER / STAFF theo bản chụp của CHÍNH lô: `benDatHuong` trên đơn chưa chụp trả null, nên không đọc phần thương mại đang lưu.
import type { CauCocXacNhan, ChanKhaiLai, VaoCauCoc } from "../../shared/dat-coc-truoc";
import { CAU_CHUA_GAN_HO_SO } from "../../shared/dat-coc-truoc";
import { benDatHuong } from "./rules";
import { cocLapLaiConGiu, hoSoNhanVien } from "./coc-repo";
import { ownerCompanyId, receiptOnConfirmStatement } from "./repository";
import { cauLanThu } from "./service";

const dong = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;

/**
 * Tự quyết (ADR-0159 Hệ quả «chưa kiểm»): huỷ để lập lại đơn mà cọc cũ còn giữ thì khai lại ở đơn mới bị TÍNH HAI LẦN thật — cọc cũ đã là dòng giữ hộ trên đơn huỷ, và lệnh chuyển cọc
 * (`ghiChuyen`) sinh khoản thu + dòng giữ hộ riêng trên đơn nhận. Nên chặn: người lập còn đơn huỷ nhóm «lập lại / trùng đơn» hoặc «chưa kết luận» còn giữ tiền thì không khai > 0, phải nhờ
 * Kế toán chuyển tiền đó. Không so khách vì khách có thể bị ẩn; đơn huỷ vì khách đổi ý không chặn (không phải cùng số tiền được khai lại).
 */
export async function chanKhaiCocLai(db: D1Database, nguoiLapId: string): Promise<ChanKhaiLai> {
  const cu = await cocLapLaiConGiu(db, nguoiLapId);
  if (!cu) return null;
  return {
    status: 409,
    code: "declared_deposit_reissue_held",
    message: `Đơn đã huỷ ${cu.order_code ?? ""} còn giữ ${dong(cu.con_giu)} tiền khách trả trước. Đừng khai lại ở đây: để trống ô này và nhờ Kế toán chuyển số tiền đó sang đơn mới sau khi đơn được xác nhận.`,
  };
}

/** Dựng câu khoản thu cho lô xác nhận; câu dựng ra CHƯA chạy, nằm sau câu xác nhận trong cùng một lô. Tháng đã khoá: trigger huỷ cả lô, `orders` dịch thành 409. */
export async function cauDatCocKhiXacNhan(db: D1Database, i: VaoCauCoc): Promise<CauCocXacNhan> {
  const [congTyId, partyId] = await Promise.all([ownerCompanyId(db), hoSoNhanVien(db, i.nguoiLapId)]);
  if (!congTyId) return { ok: false, status: 503, code: "owner_company_missing", message: "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống." };
  if (!partyId) return { ok: false, status: 409, code: "partner_no_party", message: CAU_CHUA_GAN_HO_SO };
  const chan = await chanKhaiCocLai(db, i.nguoiLapId);
  if (chan) return { ok: false, ...chan };
  // Bản chụp của chính lô: `duKien`/`chuaChup` = false và các trường còn lại không dùng tới ở hàm này.
  const benDat = benDatHuong({ duKien: false, chuaChup: false, chup: i.chup, dichVu: [], congTyChuId: null, giamGiaHieuLuc: 0 });
  return {
    ok: true,
    cau: ({ at, auditId }) =>
      cauLanThu(
        db,
        {
          orderId: i.orderId,
          stage: "PREPAID",
          congTyId,
          at,
          ai: { staffId: i.nguoiLapId, partyId, laKeToan: false, laDoiTac: true },
          lt: { soTien: i.soTien, hinhThuc: "CASH", collectorRole: partyId === benDat ? "BOOKER" : "STAFF", collectorPartyId: partyId, collectedForPartyId: null, ngayPhatSinh: i.homNay, ghiChu: "Khách đặt cọc trước" },
          nhatKy: { staffId: i.nguoiBamId, detail: `Khách đặt cọc trước ${dong(i.soTien)} · ${i.orderCode}` },
        },
        (r) => receiptOnConfirmStatement(db, r, auditId),
      ),
  };
}
