// Tin nhắc hạn trả sau (ADR-0173 Đ3 mục 2): Cron (15 phút, gốc lắp ráp) gửi tin trong Nền tảng cho đại lý TRƯỚC HẠN 6 GIỜ và LÚC QUÁ HẠN (sau hạn trả); Kế toán nhận tin lúc quá hạn.
// Mỗi đơn, mỗi loại, mỗi MỐC hạn trả gửi đúng một lần: khoá chính `bil_credit_reminder` (INSERT OR IGNORE) đứng trước các dòng nhật ký trong CÙNG lô, dòng nhật ký chỉ ghi khi
// câu trước có ghi (`changes() > 0` nối chuỗi) — hai lượt Cron chồng nhau không gửi lặp. Nợ kiểm lại LÚC GỬI bằng đúng hàm tính nợ (đơn đã trả đủ không nhắc). Đại lý chưa có
// tài khoản thì không có người nhận phía đại lý (giả định ghi ở kế hoạch). KHÔNG BAO GIỜ NÉM: lỗi ở đây không kéo việc định kỳ khác.
import { auditStatement, nguoiLam } from "../audit";
import { can, tacNhan, type PermissionHolder } from "../../shared/permissions";
import { tinNhacDenLuc, type LoaiTinNhac } from "../../shared/tra-sau";
import { noTheoDon } from "./tra-sau";
import { donCoHanTra, ghiNhacStatement, nhacDaGui, taiKhoanCuaBen } from "./tra-sau-repo";

const HANH_DONG: Record<LoaiTinNhac, "credit_due_soon_reminded" | "credit_overdue_reminded"> = { TRUOC_HAN: "credit_due_soon_reminded", QUA_HAN: "credit_overdue_reminded" };

/** Tác nhân tự động của việc nhắc hạn (ADR-0186 Đ1): chỉ Cron dùng; giữ đúng ô `credit.due.remind`, không có nút hay route nào cho người. */
const NHAC_HAN_TRA_SAU = tacNhan("NHAC_HAN_TRA_SAU");

/**
 * Một lượt nhắc. Trả số tin (theo đơn × loại) vừa ghi mới — để bài kiểm và nhật ký Cron đọc. `bayGio` truyền được cho bài kiểm.
 * `nguoiPhat` qua cổng `can(…, "credit.due.remind")` TRƯỚC khi đọc hay ghi (ADR-0186 Đ3); bị từ chối thì ném lỗi tên `TuChoiQuyen` — bọc Cron chỉ ghi một dòng log.
 */
export async function nhacHanTraSau(db: D1Database, nguoiPhat: PermissionHolder, bayGio: string = new Date().toISOString()): Promise<number> {
  if (!can(nguoiPhat, "credit.due.remind")) {
    const loi = new Error("Bên phát lệnh không có quyền nhắc hạn trả sau.");
    loi.name = "TuChoiQuyen";
    throw loi;
  }
  const dons = (await donCoHanTra(db)).filter((d) => tinNhacDenLuc({ hanTra: d.credit_due_at, bayGio, no: 1 }).length > 0);
  if (dons.length === 0) return 0;
  const [no, daGui, taiKhoan] = await Promise.all([noTheoDon(db, dons), nhacDaGui(db, dons.map((d) => d.id)), taiKhoanCuaBen(db, dons.map((d) => d.booker_party_id!))]);
  const gui = new Set(daGui.map((r) => `${r.order_id}|${r.kind}|${r.due_at}`));
  let so = 0;
  for (const d of dons) {
    const ben = d.booker_party_id!;
    for (const loai of tinNhacDenLuc({ hanTra: d.credit_due_at, bayGio, no: no.get(d.id) ?? 0 })) {
      if (gui.has(`${d.id}|${loai}|${d.credit_due_at}`)) continue;
      const action = HANH_DONG[loai];
      const nhan = taiKhoan.filter((t) => t.party_id === ben);
      const lo: D1PreparedStatement[] = [
        ghiNhacStatement(db, { orderId: d.id, loai, moc: d.credit_due_at!, partyId: ben, at: bayGio }),
        ...nhan.map((t) => auditStatement(db, { ...nguoiLam(nguoiPhat), action, at: bayGio, targetType: "staff", targetId: t.id, orderId: d.id, detail: "Nhắc hạn trả sau" }, "changes() > 0")),
        ...(loai === "QUA_HAN" ? [auditStatement(db, { ...nguoiLam(nguoiPhat), action, at: bayGio, targetType: "ledger", targetId: d.id, orderId: d.id, detail: "Nhắc hạn trả sau" }, "changes() > 0")] : []),
      ];
      const kq = await db.batch(lo);
      if ((kq[0]!.meta.changes ?? 0) > 0) so++;
    }
  }
  return so;
}

/** Bọc cho Cron: chạy dưới tác nhân NHAC_HAN_TRA_SAU; không ném, một dòng log chỉ số đếm (bị từ chối: dòng cảnh báo tên `TuChoiQuyen`). */
export async function nhacHanTraSauAnToan(env: Pick<Env, "DB">): Promise<void> {
  try {
    const so = await nhacHanTraSau(env.DB, NHAC_HAN_TRA_SAU);
    if (so > 0) console.log(JSON.stringify({ level: "info", event: "tra_sau_nhac", so }));
  } catch (e) {
    console.warn(JSON.stringify({ level: "warn", event: "tra_sau_nhac_loi", name: e instanceof Error ? e.name : "unknown" }));
  }
}
