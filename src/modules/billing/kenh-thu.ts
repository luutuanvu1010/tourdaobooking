// Công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 1): đọc trạng thái hiện hành. Mặc định BẬT (1) khi chưa có dòng nào — đúng như trước khi có công tắc.
// Hàm này do gốc lắp ráp tiêm vào `ctx.kenhThuHienTai` (`orders` không import billing); lỗi đọc ném ra để router đổi thành `null` (route lập đơn của Đối tác trả 503, không đoán).
import type { KenhThuDoiTacDto } from "../../shared/contracts.ts";
import { nguoiThuHopLeKenhTat, thuHoChiTienMat } from "../../shared/kenh-thu-doi-tac.ts";
import { error } from "../../shared/http.ts";
import { kenhThuCuaDon, kenhThuLichSu, kenhThuTai } from "./kenh-thu-repo.ts";

export async function kenhThuHienTai(db: D1Database, at: string = new Date().toISOString()): Promise<0 | 1> {
  const v = await kenhThuTai(db, at);
  return v === 0 ? 0 : 1;
}

/** Trạng thái công tắc và lịch sử đổi (mới nhất trước) cho `GET`/`POST /api/kenh-thu-doi-tac`. */
export async function kenhThuDto(db: D1Database): Promise<KenhThuDoiTacDto> {
  const rows = await kenhThuLichSu(db);
  const lichSu = rows.map((r) => ({ congTyThu: r.company_collects === 1, tuLuc: r.valid_from, nguoiDoi: r.nguoi_doi ?? "(không rõ)" }));
  return { congTyThu: await kenhThuHienTai(db) === 1, tuLuc: lichSu[0]?.tuLuc ?? null, lichSu };
}

/**
 * Cổng người thu (ADR-0178 Đ1 mục 2): đơn mang dấu Tắt (0) chỉ nhận khoản khách trả có người thu = hồ sơ của tài khoản đã lập đơn. `null` = qua; 409 `kenh_thu_chi_nguoi_lap` /
 * `kenh_thu_chua_gan_ho_so`. CÙNG cổng (ADR-0225 Đ2, đề xuất): đơn mang dấu «chỉ thu hộ tiền mặt» — người thu phía Tour Đảo (Công ty, nhân viên) chỉ nhận tiền mặt, 409
 * `don_doi_tac_chi_tien_mat`. Mọi đường ghi khoản thu của khách (trừ đảo khoản và tiền ra) gọi hàm này TRƯỚC khi dựng lô — bài quét `src/kenh-thu-noi-goi.test.ts`.
 * `lt.boQuaChiTienMat`: CHỈ nửa thu của lệnh chuyển cọc (tiền cũ đổi chỗ, không phải thu mới — trigger 0184 miễn theo `transfer_of_id`).
 * Lớp CSDL cùng luật: trigger `bil_receipt_partner_channel` (0144), `bil_receipt_partner_cash_only` (0184). Đơn không đọc được ⇒ qua ở đây (nơi gọi tự trả 404 / lính gác; trigger vẫn canh).
 */
export async function kiemNguoiThuKenh(
  db: D1Database,
  orderId: string,
  lt: { collectorPartyId: string; collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; hinhThuc: string; boQuaChiTienMat?: true },
): Promise<Response | null> {
  const k = await kenhThuCuaDon(db, orderId);
  if (!k) return null;
  const v = nguoiThuHopLeKenhTat({ dauDon: k.dau, nguoiLapPartyId: k.nguoiLap, collectorPartyId: lt.collectorPartyId });
  if (!v.ok) return error(409, v.ma, v.cau);
  if (lt.boQuaChiTienMat) return null;
  const m = thuHoChiTienMat({ chiTienMat: k.chiTienMat, collectorRole: lt.collectorRole, method: lt.hinhThuc, nguoiThuLaDoiTacLapDon: k.dau !== null && k.nguoiLap !== null && lt.collectorPartyId === k.nguoiLap });
  return m.ok ? null : error(409, m.ma, m.cau);
}

/**
 * QR vào tài khoản công ty (ADR-0178 Đ1 mục 2): đơn mang dấu Tắt ⇒ false (Công ty không nhận tiền khách của đơn đó). ADR-0225 Đ2: đơn mang dấu «chỉ thu hộ tiền mặt» ⇒ false.
 * Đơn dấu Bật / không dấu / không đọc được ⇒ true (nơi gọi đã đọc đơn).
 */
export async function congTyNhanTienKhach(db: D1Database, orderId: string): Promise<boolean> {
  const k = await kenhThuCuaDon(db, orderId);
  return k?.dau !== 0 && k?.chiTienMat !== true;
}
