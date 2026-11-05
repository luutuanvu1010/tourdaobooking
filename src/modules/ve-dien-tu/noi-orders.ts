// Ba hàm để gốc lắp ráp nối kho vé vào đơn (ADR-0153 Đ1 mục 4; kế hoạch Task 5). `orders` KHÔNG import module này và module này KHÔNG import `orders`:
// gốc lắp ráp (src/index.ts) đọc dịch vụ của đơn qua hàm công bố `orders.dichVuChoVe` (số khách HIỆU LỰC) rồi đưa vào đây. Không SQL thô ở tệp này — mọi câu đi qua cap-ve.ts.
import { soanCapVe, soanTraVe, type DichCapVe, type GhiNhatKy } from "./cap-ve.ts";
import { canVe } from "./rules.ts";
import { cauChanVeDaMo } from "./repository.ts";

/**
 * Cấp vé cho mọi dịch vụ của đơn theo số khách hiệu lực — MỘT `db.batch` RIÊNG, chạy SAU lô xác nhận (xác nhận đã thắng; thất bại ở đây không làm xác nhận thất bại,
 * nơi gọi bắt lỗi). Chạy lại bao nhiêu lần cũng không giữ thừa (số lấy tính trong SQL lúc chạy). Trả số dịch vụ có chạy câu giữ chỗ.
 */
export async function capVeChoDon(db: D1Database, dichVu: readonly DichCapVe[], nguoi: string | null, nhatKy: GhiNhatKy, at: string): Promise<number> {
  const cau: D1PreparedStatement[] = [];
  let soDichVu = 0;
  for (const dv of dichVu) {
    const c = soanCapVe(db, dv, nguoi, at, nhatKy);
    if (c.cau.length === 0) continue;
    cau.push(...c.cau);
    soDichVu++;
  }
  if (cau.length > 0) await db.batch(cau);
  return soDichVu;
}

/** Câu trả hết vé của đơn, để NỐI VÀO lô huỷ / rút xác nhận của `orders` (cùng nguyên tử với việc huỷ). Đơn không giữ vé nào: câu vẫn vô hại (mọi câu gác điều kiện dòng). */
export async function soanTraVeKhiHuy(db: D1Database, p: { orderId: string; lyDo: "DON_HUY" | "RUT_XAC_NHAN"; by: string | null; at: string; homNay: string; chanVeDaMo?: boolean }, nhatKy: GhiNhatKy): Promise<D1PreparedStatement[]> {
  // ADR-0170 Đ3: người giữ quyền Đối tác huỷ ⇒ câu bảo vệ ĐỨNG ĐẦU phần của kho vé (vé vừa được mở xen giữa lúc kiểm và lúc ghi làm hỏng cả lô; lô là một giao dịch nên câu đơn lui theo).
  const chan = p.chanVeDaMo === true && p.lyDo === "DON_HUY" ? [cauChanVeDaMo(db, p.orderId)] : [];
  return [...chan, ...(await soanTraVe(db, { orderId: p.orderId, lyDo: p.lyDo, at: p.at, by: p.by, homNay: p.homNay, chiKhiDon: p.lyDo === "DON_HUY" ? "cancelled" : "draft" }, nhatKy)).cau];
}

/**
 * Cân lại vé theo số khách hiệu lực SAU khi sửa số khách: bớt khách thì trả vé CHƯA LỘ (vé đã lộ không tự thu hồi), thêm khách thì cấp thêm. Một `db.batch`; nơi gọi bắt lỗi
 * (đơn đã sửa xong, vé lệch được cấp bù ở lần sau). Mỗi dịch vụ: trả trước, cấp sau.
 */
export async function canBangVeTheoSoKhach(db: D1Database, dichVu: readonly DichCapVe[], nguoi: string | null, nhatKy: GhiNhatKy, at: string, homNay: string): Promise<void> {
  const cau: D1PreparedStatement[] = [];
  for (const dv of dichVu) {
    const tra = await soanTraVe(db, { orderId: dv.orderId, serviceId: dv.serviceId, lyDo: "GIAM_SO_KHACH", at, by: nguoi, homNay, conLai: canVe(dv.pax) }, nhatKy);
    cau.push(...tra.cau, ...soanCapVe(db, dv, nguoi, at, nhatKy).cau);
  }
  if (cau.length > 0) await db.batch(cau);
}
