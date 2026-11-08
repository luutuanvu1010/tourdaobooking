// Ba hàm để gốc lắp ráp nối kho vé vào đơn (ADR-0153 Đ1 mục 4; kế hoạch Task 5). `orders` KHÔNG import module này và module này KHÔNG import `orders`:
// gốc lắp ráp (src/index.ts) đọc dịch vụ của đơn qua hàm công bố `orders.dichVuChoVe` (số khách HIỆU LỰC) rồi đưa vào đây. Không SQL thô ở tệp này — mọi câu đi qua cap-ve.ts.
import { soanCapVe, soanTraVe, veDangGiu, type DichCapVe, type GhiNhatKy } from "./cap-ve.ts";
import { NHOM_VE, canVe } from "./rules.ts";
import { cauChanVeDaMo } from "./repository.ts";
import { vnToday } from "../../shared/vn-date.ts";
import type { NguonVe } from "../../shared/nguon-ve.ts";

/** Dịch vụ kèm ô «Có vé» (ADR-0174). */
export type DichCapVeCoO = DichCapVe & { coVe: boolean };

/**
 * Cấp vé cho mọi dịch vụ Có vé của đơn theo số khách hiệu lực — MỘT `db.batch` RIÊNG, chạy SAU lô xác nhận (xác nhận đã thắng; thất bại ở đây không làm xác nhận thất bại,
 * nơi gọi bắt lỗi). Chạy lại bao nhiêu lần cũng không giữ thừa (số lấy tính trong SQL lúc chạy). Trả số dịch vụ có chạy câu giữ chỗ.
 */
export async function capVeChoDon(db: D1Database, dichVu: readonly DichCapVeCoO[], nguoi: string | null, nhatKy: GhiNhatKy, at: string): Promise<number> {
  const cau: D1PreparedStatement[] = [];
  let soDichVu = 0;
  for (const dv of dichVu) {
    if (!dv.coVe) continue; // ADR-0174 Đ3
    const c = soanCapVe(db, dv, nguoi, at, nhatKy);
    if (c.cau.length === 0) continue;
    cau.push(...c.cau);
    soDichVu++;
  }
  if (cau.length > 0) await db.batch(cau);
  await baoThieuVe(db, dichVu, nguoi, nhatKy, at);
  return soDichVu;
}

const NHAN_NGUON: Record<NguonVe, string> = { HANG_NGOAI: "Vé hãng ngoài", TOUR_DAO: "Vé Tour Đảo" };

/** Số vé còn thiếu của MỘT dịch vụ (cần theo số khách hiệu lực − đang giữ, cộng các nhóm). Dịch vụ «Không vé» ⇒ 0 (ADR-0174 Đ3). */
export async function soVeThieu(db: D1Database, dv: DichCapVeCoO): Promise<number> {
  if (!dv.coVe) return 0;
  const can = canVe(dv.pax);
  const giu = await veDangGiu(db, dv.serviceId);
  return NHOM_VE.reduce((t, n) => t + Math.max(0, can[n] - giu[n]), 0);
}

/** Đơn còn thiếu vé ở ít nhất một dịch vụ «Có vé» (để gốc lắp ráp lọc ứng viên cấp bù — ADR-0175 Đ1.5a). */
export async function conThieuVe(db: D1Database, dichVu: readonly DichCapVeCoO[]): Promise<boolean> {
  for (const dv of dichVu) if ((await soVeThieu(db, dv)) > 0) return true;
  return false;
}

/**
 * ADR-0175 Đ1.5a: giữ vé xong mà dịch vụ «Có vé», ngày đi chưa qua, còn thiếu ⇒ MỘT dòng nhật ký `ve_thieu` mỗi dịch vụ (hộp thư báo theo nguồn vé: khoá ('ve', nguồn)).
 * Chỉ mã dịch vụ, nguồn, số thiếu — KHÔNG mã vé, KHÔNG tên khách. Lỗi đọc / ghi bị nuốt: báo thiếu không được làm hỏng việc cấp vé (thiếu vé vẫn suy ra lúc đọc).
 */
async function baoThieuVe(db: D1Database, dichVu: readonly DichCapVeCoO[], nguoi: string | null, nhatKy: GhiNhatKy, at: string): Promise<void> {
  try {
    const homNay = vnToday(new Date(at));
    const cau: D1PreparedStatement[] = [];
    for (const dv of dichVu) {
      if (dv.ngayDi < homNay) continue;
      const thieu = await soVeThieu(db, dv);
      if (thieu <= 0) continue;
      cau.push(nhatKy({ staffId: nguoi, action: "ve_thieu", at, orderId: dv.orderId, targetType: "ve", targetId: dv.nguonVe, detail: `Thiếu vé · ${dv.catalogCode} · ${NHAN_NGUON[dv.nguonVe]} · thiếu ${thieu}` }, "1"));
    }
    if (cau.length > 0) await db.batch(cau);
  } catch (e) {
    console.error("ve_bao_thieu_loi", e instanceof Error ? e.name : "loi");
  }
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
export async function canBangVeTheoSoKhach(db: D1Database, dichVu: readonly DichCapVeCoO[], nguoi: string | null, nhatKy: GhiNhatKy, at: string, homNay: string): Promise<void> {
  const cau: D1PreparedStatement[] = [];
  for (const dv of dichVu) {
    const tra = await soanTraVe(db, { orderId: dv.orderId, serviceId: dv.serviceId, lyDo: "GIAM_SO_KHACH", at, by: nguoi, homNay, conLai: canVe(dv.pax) }, nhatKy);
    cau.push(...tra.cau, ...(dv.coVe ? soanCapVe(db, dv, nguoi, at, nhatKy).cau : [])); // ADR-0174 Đ3: Không vé thì vẫn trả vé thừa, không cấp thêm
  }
  if (cau.length > 0) await db.batch(cau);
}
