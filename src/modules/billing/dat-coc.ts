// «Khách đặt cọc trước» (ADR-0159) — phần của billing: dựng câu khoản thu cho lô xác nhận của `orders` (ADR-0024 đ4: gốc lắp ráp tiêm, `orders` không đọc, không ghi `bil_*`).
// Người thu và người ghi là NGƯỜI LẬP dù ai bấm: ghi theo người bấm thì vai BOOKER thành lời khai chờ Kế toán, có dấu chờ và chặn «Đã giao» (`laLoiKhaiBenKia`).
// Vai BOOKER / STAFF theo bản chụp của CHÍNH lô: `benDatHuong` trên đơn chưa chụp trả null, nên không đọc phần thương mại đang lưu.
import type { CauCocXacNhan, ChanKhaiLai, VaoCauCoc } from "../../shared/dat-coc-kieu";
import { CAU_CHUA_GAN_HO_SO } from "../../shared/dat-coc-truoc";
import { benDatHuong, soChuaVeCongTy, soKhaiChuaNop } from "./rules";
import { GHI_CHU_KHOAN_LOI_KHAI, cocLapLaiConGiu, hoSoNhanVien } from "./coc-repo";
import { linesOfOrder, nguoiLapGiuDoiTac, orderOwners, ownerCompanyId, receiptOnConfirmStatement, receiptsOfOrder, reconOfOrder } from "./repository";
import { cauLanThu, tienNhieuDon, toDoiChieuRow, toLineRow, toReceiptRow } from "./service";
import { traSauCuaDon } from "./tra-sau";
import { phanKhaiCuaDon } from "./khoan-khai";

const dong = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;

/** ADR-0159 Đ2 mục 1: người xét không sửa được ô khai và cột đang khoá, nên câu nói việc họ làm được. Không kèm mã, số tiền của đơn huỷ: đó là đơn khác của đối tác (ADR-0136 Đ6). */
const CAU_KHAI_LAI_NGUOI_XET = "Người lập đơn còn tiền đặt cọc của một đơn đã huỷ chưa xử lý nên chưa ghi được số đặt cọc của đơn này. Bạn có thể bấm Hết vé, hoặc nhờ người lập Rút lại đơn để bỏ số đặt cọc; Kế toán xử lý tiền của đơn đã huỷ thì người lập khai lại được.";

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

/**
 * ADR-0153 Đ3 sửa bởi ADR-0159 Đ2 mục 2 và ADR-0170 Đ2 — {số tính «thu đủ», phải thu} của MỘT đơn do GỐC LẮP RÁP tiêm vào `ctx.tienDonVe` (kho vé so ở MỘT hàm thuần `thuDu`; ve-dien-tu không đọc bảng bil_).
 * `daThu` Ở ĐÂY đã trừ số khai chưa nộp, chỉ dùng cho vé; «đã thu» hiển thị ở nơi khác vẫn đọc `tienNhieuDon`. KHÔNG tự kiểm quyền — route của ve-dien-tu hỏi `can(` trước.
 * Đơn do người HIỆN giữ quyền Đối tác lập (ADR-0170): chỉ tính tiền ĐÃ VỀ công ty — trừ thêm khoản người lập còn giữ và khoản đang chờ Kế toán xác nhận (`soChuaVeCongTy`), áp cho mọi người xem.
 * Đơn của nhân viên văn phòng đi nhánh cũ nguyên vẹn. `null` khi không đọc được (kể cả quyền / hồ sơ người lập): không mở vé. `choNop` / `choXacNhan` để giao diện nói đúng câu.
 */
export async function tienDonVe(db: D1Database, orderId: string): Promise<{ daThu: number; phaiThu: number; choNop: number; choXacNhan: number; traSau: { hanTra: string | null; no: number } | null } | null> {
  const t = (await tienNhieuDon(db, [orderId])).get(orderId);
  if (!t) return null;
  // ADR-0168 Đ3 mục 1: đơn Trả sau mở vé không cần thu đủ — hạn trả và nợ đi kèm để route vé hỏi MỘT hàm `moVeDuoc`. `null` = đơn Trả trước.
  const traSau = await traSauCuaDon(db, orderId);
  const chu = (await orderOwners(db, [orderId])).get(orderId);
  if (chu === undefined) return null; // không đọc được chủ đơn ⇒ không biết ai lập ⇒ chưa mở
  const laDoiTac = await nguoiLapGiuDoiTac(db, chu);
  const receipts = await receiptsOfOrder(db, orderId);
  const khoan = await phanKhaiCuaDon(db, receipts, new Set([orderId]));
  if (!laDoiTac && khoan.length === 0) return { daThu: t.daThu, phaiThu: t.phaiThu, choNop: 0, choXacNhan: 0, traSau };
  const [congTyId, lines] = await Promise.all([ownerCompanyId(db), linesOfOrder(db, orderId)]);
  if (!congTyId) return null;
  const choNopKhai = khoan.length === 0 ? 0 : soKhaiChuaNop(khoan, lines.map(toLineRow), congTyId);
  if (!laDoiTac) return { daThu: t.daThu - choNopKhai, phaiThu: t.phaiThu, choNop: choNopKhai, choXacNhan: 0, traSau };
  // Người lập giữ quyền Đối tác. Không đọc được hồ sơ của họ ⇒ không biết khoản nào là của họ ⇒ chưa mở (null).
  const partyId = await hoSoNhanVien(db, chu);
  if (!partyId) return null;
  const recon = await reconOfOrder(db, orderId);
  const v = soChuaVeCongTy({ receipts: receipts.map(toReceiptRow), lines: lines.map(toLineRow), doiChieu: recon.map(toDoiChieuRow), nguoiLapPartyId: partyId, congTyId, khaiThem: khoan });
  // Khoản khai đặt cọc đã gộp vào cùng lượt tính (không trừ hai lần, không bỏ sót khoản do người khác cầm): `nguoiLapGiu` là tổng chưa nộp của mọi khoản đang giữ.
  const choNop = v.nguoiLapGiu;
  return { daThu: t.daThu - choNop - v.choXacNhan, phaiThu: t.phaiThu, choNop, choXacNhan: v.choXacNhan, traSau };
}

/** Dựng câu khoản thu cho lô xác nhận; câu dựng ra CHƯA chạy, nằm sau câu xác nhận trong cùng một lô. Tháng đã khoá: trigger huỷ cả lô, `orders` dịch thành 409. */
export async function cauDatCocKhiXacNhan(db: D1Database, i: VaoCauCoc): Promise<CauCocXacNhan> {
  const [congTyId, partyId] = await Promise.all([ownerCompanyId(db), hoSoNhanVien(db, i.nguoiLapId)]);
  if (!congTyId) return { ok: false, status: 503, code: "owner_company_missing", message: "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống." };
  if (!partyId) return { ok: false, status: 409, code: "partner_no_party", message: CAU_CHUA_GAN_HO_SO };
  const chan = await chanKhaiCocLai(db, i.nguoiLapId);
  if (chan) return { ok: false, ...chan, ...(i.nguoiBamId === i.nguoiLapId ? {} : { message: CAU_KHAI_LAI_NGUOI_XET }) };
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
          lt: { soTien: i.soTien, hinhThuc: "CASH", collectorRole: partyId === benDat ? "BOOKER" : "STAFF", collectorPartyId: partyId, collectedForPartyId: null, ngayPhatSinh: i.homNay, ghiChu: GHI_CHU_KHOAN_LOI_KHAI },
          nhatKy: { staffId: i.nguoiBamId, detail: `Khách đặt cọc trước ${dong(i.soTien)} · ${i.orderCode}` },
        },
        (r) => receiptOnConfirmStatement(db, r, auditId),
      ),
  };
}
