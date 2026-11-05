// BÁN HÀNG PHỤ TRÁCH (ADR-0142) — phần của `orders` soạn các câu lệnh «ghi nhận» và «khép lời mời», nối vào CUỐI lô lệnh đơn. KHÔNG có SQL ở đây (SQL của orders ở `xac-nhan-repo.ts`;
// câu của `dispatch` đến qua `ctx.banHang`, orders không import dispatch). Mọi câu nối đứng SAU câu chính của lô nên chỉ số câu thắng/thua (`kq[1]`…) không đổi.
import { auditStatement } from "../audit";
import type { BanHangNoi } from "../../shared/router";
import { congPhutGioHanhChinh, type KetQuaLoiMoi, type KhungGioHanhChinh } from "../../shared/ban-hang-phu-trach";
import { error } from "../../shared/http";
import { nguoiDuocMoiCuaDon } from "./xac-nhan-repo";

/** 503 khi chưa có dòng chính sách giờ hành chính — không đoán con số (khuôn `MOC_CHUA_CO`). */
export const GIO_HANH_CHINH_CHUA_CO = () => error(503, "gio_hanh_chinh_chua_co", "Chưa có cài đặt giờ hành chính của người phụ trách — báo Toàn quyền.");

/** Đọc khung giờ MỘT lần mỗi request; thiếu ⇒ trả sẵn 503. */
export async function docKhungGio(banHang: BanHangNoi): Promise<{ khung: KhungGioHanhChinh } | { loi: Response }> {
  const khung = await banHang.gioHanhChinh();
  return khung ? { khung } : { loi: GIO_HANH_CHINH_CHUA_CO() };
}

export type KetQuaGhiNhan = "khong_moi" | "khong_con_hop_le" | "tu_nhan" | "da_moi";

/**
 * Các câu «ghi nhận» của MỘT điểm ghi nhận (Gửi xác nhận, nhánh A / B của Gửi đơn, `/status` xác nhận). `canKiem` = điểm này MỞ yêu cầu xác nhận (đơn cần kiểm vé) — khi đó người lập tự mời mình
 * vẫn chỉ được mời (tự quyết theo công tắc), không thành Bán hàng phụ trách ngay (thiết kế L3). Người được mời kiểm LẠI bây giờ (có thể đã mất quyền / ngưng từ lúc lập nháp): không hợp lệ ⇒ không mời.
 * `auditId` = id dòng nhật ký của lệnh đơn trong cùng lô (mọi câu của dispatch gác theo nó). Người gọi nối `cau` vào CUỐI lô.
 */
export async function soanGhiNhan(i: {
  db: D1Database; banHang: BanHangNoi; orderId: string; nguoiLap: { id: string; partyId: string | null }; at: string; auditId: string; canKiem: boolean; khung: KhungGioHanhChinh;
}): Promise<{ cau: D1PreparedStatement[]; ketQua: KetQuaGhiNhan }> {
  const xParty = await nguoiDuocMoiCuaDon(i.db, i.orderId);
  if (xParty === null) return { cau: [], ketQua: "khong_moi" };
  const x = await i.banHang.kiemBanHangMoiTheoHoSo(xParty);
  if (!x.ok) return { cau: [], ketQua: "khong_con_hop_le" };
  if (x.partyId === i.nguoiLap.partyId && !i.canKiem) {
    return { cau: [i.banHang.cauMoBanHangBatBuoc({ id: crypto.randomUUID(), orderId: i.orderId, partyId: x.partyId, actorId: i.nguoiLap.id, at: i.at, auditId: i.auditId })], ketQua: "tu_nhan" };
  }
  const hanIso = congPhutGioHanhChinh(i.at, i.khung.phutUuTien, i.khung);
  return {
    cau: [
      i.banHang.cauMoLoiMoi({ orderId: i.orderId, inviteePartyId: x.partyId, invitedBy: i.nguoiLap.id, at: i.at, hanIso, auditId: i.auditId }),
      // đứng NGAY SAU câu mở lời mời: `changes() > 0` trỏ đúng câu đó (lệnh đơn thua ⇒ lời mời không mở ⇒ không có dòng nhật ký)
      auditStatement(i.db, { orderId: i.orderId, staffId: i.nguoiLap.id, action: "sales_invited", at: i.at, detail: "Mời Bán hàng nhận phụ trách" }, "changes() > 0"),
    ],
    ketQua: "da_moi",
  };
}

/** Câu khép lời mời đang mở (nếu có) sau một lệnh đơn đã quyết (Hết vé / Huỷ, Rút lại, `/status` huỷ, `handler-cancel`). Gác theo dòng nhật ký của lệnh đơn. */
export const cauKhepLoiMoi = (banHang: BanHangNoi, x: { orderId: string; outcome: KetQuaLoiMoi; at: string; actorId: string; auditId: string }): D1PreparedStatement =>
  banHang.cauKhepLoiMoiSauLenhDon(x);
