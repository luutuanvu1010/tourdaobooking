// Thư báo người đăng ký sau lệnh của người trong công ty (ADR-0206 Đ13: «cần bổ sung», «đã duyệt», «bị từ chối»; Hiến chương 5.10, 5.16; rà soát cuối I-1).
// Khuôn: lô ghi của lệnh mang câu XẾP THƯ (`cauXepThu`, dòng lịch sử THU_<loại>_CHO — trạng thái chờ thấy được trong CSDL); SAU lô, `guiThuSauLo` gửi trong `exec.waitUntil` rồi ghi THU_<loại>_GUI
// hoặc THU_<loại>_LOI. waitUntil bị rơi thì dòng CHO ở lại ⇒ hàng chờ vẫn hiện «thư đang chờ gửi», người xử lý bấm «Gửi lại thư» (Đ13: «mỗi thư có trạng thái chờ để thấy được và gửi lại được»).
// Địa chỉ nhận = email liên lạc của CHÍNH danh tính của phiếu (dk_identity). Đã ẩn danh ⇒ không xếp, không gửi, không ghi. Log và lịch sử không chứa email hay câu lỗi của nhà cung cấp.
import { cauLyDoChoNguoiDangKy } from "../../shared/dang-ky-hien-thi.ts";
import { ngayVN } from "../../shared/giay-to-hien-thi.ts";
import { error, json } from "../../shared/http.ts";
import { can } from "../../shared/permissions.ts";
import type { Ctx } from "../../shared/router.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { auditStatement } from "../audit";
import { guiThuBao } from "./mail.ts";
import { cauXepThuLai, danhTinhConEmail, emailLienLacCuaPhieu, ghiKetQuaThu, lenhThuMoiNhat, phieuXet } from "./repository.ts";
import { TRANG_THAI_CUA_THU, docLenhThu, maLenhThu, type LoaiThu } from "./rules.ts";
import { laMaPhieu } from "./xac-minh.ts";

/**
 * Gửi thư đã xếp trong lô (`daXep` = câu xếp thư của lô đã chèn dòng CHO). Chạy hết trong `exec.waitUntil` (trả lời không chờ thư). KHÔNG BAO GIỜ ném.
 * `lyDo` = mã lý do của phiếu (thư từ chối dùng câu viết cho người đăng ký); `hanKichHoat` = hạn đặt PIN (thư đã duyệt).
 */
export function guiThuSauLo(
  env: Env, exec: ExecutionContext, v: { registrationId: string; staffId: string; loai: LoaiThu; daXep: boolean; lyDo?: string | null; hanKichHoat?: string | null },
): void {
  if (!v.daXep) return;
  exec.waitUntil((async () => {
    const den = await emailLienLacCuaPhieu(env.DB, v.registrationId);
    if (!den) return; // ẩn danh giữa chừng: không gửi; dòng CHO ở lại, gửi lại sẽ báo «đã xoá thông tin liên lạc»
    const ok = await guiThuBao(env, den, v.loai, v.registrationId, {
      lyDoNhan: v.loai === "TU_CHOI" || v.loai === "TU_CHOI_DUYET" ? cauLyDoChoNguoiDangKy(v.lyDo ?? null) : null,
      hanNgay: v.hanKichHoat ? ngayVN(vnToday(new Date(v.hanKichHoat))) : null,
    });
    await ghiKetQuaThu(env.DB, { registrationId: v.registrationId, staffId: v.staffId, lenh: maLenhThu(v.loai, ok ? "GUI" : "LOI"), at: new Date().toISOString() });
  })().catch((e) => console.error(JSON.stringify({ level: "error", event: "dk_thu_loi", loi: e instanceof Error ? e.name : "unknown" }))));
}

const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy phiếu.");
const CAM_THU = () => error(403, "forbidden", "Bạn không có quyền gửi lại thư của phiếu này.");

// ---- POST /api/dang-ky/phieu/:id/gui-lai-thu ----
// Gửi lại thư báo MỚI NHẤT của phiếu khi thư đó chưa gửi được (đang chờ hoặc lỗi). Ai được gửi lại theo BƯỚC đã sinh ra thư: «cần bổ sung» và «bị từ chối» ở bước xác minh ⇒ người xác minh
// (party.verify + party.view); «bị từ chối» ở bước duyệt ⇒ account.create. Thư «đã duyệt» gửi lại bằng «Gửi lại lời mời» (mở lại hạn đặt PIN cùng lúc). Cổng ở index.ts: registration.queue.view.
export async function guiLaiThu({ env, staff, params, exec }: Ctx<"accounts">): Promise<Response> {
  const p = laMaPhieu(params.id) ? await phieuXet(env.DB, params.id!) : null;
  if (!p) return KHONG_THAY();
  const t = docLenhThu(await lenhThuMoiNhat(env.DB, p.id));
  if (!t || t.trangThai === "GUI") return error(409, "notice_not_pending", "Phiếu này không có thư nào đang chờ gửi lại.");
  if (t.loai === "DA_DUYET") return error(409, "notice_use_invite", "Thư báo đã duyệt được gửi lại bằng nút «Gửi lại lời mời».");
  const duoc = t.loai === "TU_CHOI_DUYET" ? can(staff, "account.create") : can(staff, "party.verify") && can(staff, "party.view");
  if (!duoc) return CAM_THU();
  const trangThaiPhieu = TRANG_THAI_CUA_THU[t.loai];
  if (p.status !== trangThaiPhieu) return error(409, "registration_state_changed", "Phiếu đã chuyển sang bước khác nên thư này không còn đúng. Hãy mở lại phiếu.");
  const at = new Date().toISOString();
  const kq = await env.DB.batch([
    cauXepThuLai(env.DB, { registrationId: p.id, staffId: staff.id, lenh: maLenhThu(t.loai, "CHO"), at, trangThaiPhieu }),
    auditStatement(env.DB, { staffId: staff.id, action: "registration_notice_resent", at, targetType: "party", targetId: p.id, detail: `phiếu ${p.id} · gửi lại thư ${t.loai}` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    if (!(await danhTinhConEmail(env.DB, p.id))) return error(409, "registration_identity_erased", "Thông tin liên lạc của người đăng ký đã được xoá nên không gửi lại thư được nữa.");
    return error(409, "registration_state_changed", "Phiếu đã chuyển sang bước khác nên thư này không còn đúng. Hãy mở lại phiếu.");
  }
  guiThuSauLo(env, exec, { registrationId: p.id, staffId: staff.id, loai: t.loai, daXep: true, lyDo: p.reason_code });
  return json({ thu: { loai: t.loai, trangThai: "CHO" } });
}
