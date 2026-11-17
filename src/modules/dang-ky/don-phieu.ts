// TÁC NHÂN DỌN PHIẾU ĐĂNG KÝ (ADR-0208 Đ8, khuôn ADR-0186; đợt 1 Task 9). Mỗi lượt Cron, bốn việc — MỖI việc qua `can()` của người phát lệnh (ô `registration.agent.purge`; tác nhân
// DON_PHIEU_DANG_KY giữ đúng một ô đó) và gọi đúng hàm lệnh của nó:
//   1. cho HẾT HẠN phiếu ĐANG ĐIỀN / CẦN BỔ SUNG đã qua `expires_at` (kèm quyết gỡ tệp — ADR-0208 Đ7; xoá kho sau lô);
//   2. ẨN DANH (ADR-0208 Đ6): phiếu TỪ CHỐI / ĐÃ RÚT / HẾT HẠN quá `anonymize_days` (bản khai + danh tính + mốc), và danh tính của phiếu ĐÃ DUYỆT chưa kích hoạt đã quá hạn đặt PIN + `activation_grace_days`;
//   3. chạy lại việc XOÁ KHO cho tệp chờ ở «chờ xoá» và «tải dở dang» quá hạn (do parties làm — dang-ky không chạm bảng tệp hay kho);
//   4. XOÁ dòng mã email cũ (giữ ít nhất max(hạn mã, 1 giờ) vì trần theo giờ của xin mã đếm các dòng đó) và dòng đếm lượt tải tệp ra khỏi cửa sổ một giờ.
// Việc 5 (ADR-0213 Đ7, mốc B2): lời mời vào tổ chức — bỏ giữ chỗ còn sót, hết hạn, ẩn danh số điện thoại (câu của parties).
// Lượt có việc ghi MỘT dòng nhật ký mang mã tác nhân, chỉ các số đếm (không mã phiếu, không khoá kho, không email). Lỗi KHÔNG ném ra ngoài (ADR-0186 Đ6): mỗi việc bắt lỗi riêng, log chỉ tên lỗi.
// Chế độ bảo trì không chặn tác nhân (ADR-0186 Đ7). Mọi câu ghi mang điều kiện trạng thái / tuổi TRONG câu: hai lượt chạy chồng nhau không làm hỏng gì.
import { can, type PermissionHolder } from "../../shared/permissions.ts";
import { auditStatement, nguoiLam } from "../audit";
import { cauAnDanhLoiMoi, cauBoGiuChoLoiMoi, cauGoTepChoNeuTruocDoi, cauHetHanLoiMoi, donKhoTepCho, xoaKhoTepChoDaGo } from "../parties";
import {
  cauAnDanhBanKhai, cauAnDanhBanKhaiToChuc, cauAnDanhDanhTinh, cauDanhDauAnDanh, cauHetHan, chinhSachHienHanh, phieuCanAnDanh, phieuCanHetHan, phieuKetThucCoLoiMoi, phieuQuaHanKichHoat, suKienTacNhanStatement, xoaLuotTaiCu, xoaMaEmailCu,
} from "./repository.ts";

const NGAY_MS = 86_400_000;
const GIO_MS = 3_600_000;
/** Trần mỗi việc mỗi lượt (Cron 15 phút): lượt sau làm tiếp phần còn lại. */
const TOI_DA_MOI_LUOT = 100;
/** Lời mời vào tổ chức đã kết thúc quá số ngày này thì thay số điện thoại bằng dấu ẩn danh (Ruling R6 của kế hoạch đợt 2). */
const LOI_MOI_AN_DANH_NGAY = 30;

export interface KetQuaDonPhieu { hetHan: number; anDanh: number; xoaKho: number; xoaMa: number }

function logLoi(viec: string, e: unknown): void {
  console.error(JSON.stringify({ level: "error", event: "dk_don_phieu_loi", viec, loi: e instanceof Error ? e.name : "unknown" }));
}
/** Mã người phát lệnh ghi vào `updated_by` / lịch sử phiếu: mã tác nhân (chữ hoa — CHECK của dk_event) hoặc mã tài khoản. */
const maNguoiLam = (who: PermissionHolder): string => nguoiLam(who).agentCode ?? who.id;

/**
 * Một lượt dọn. `homNay` = mốc «bây giờ» của lượt (Cron truyền `new Date()`; bài thử truyền mốc cố định). Mọi mốc so sánh là dấu thời gian ISO UTC (không có ngày dân sự nào ở đây).
 * Không có dòng chính sách ⇒ bỏ việc 1, 2, 4 (không đoán con số); việc 3 không cần con số chính sách.
 */
export async function donPhieuDangKy(env: Env, nguoiChay: PermissionHolder, homNay: Date): Promise<KetQuaDonPhieu> {
  const kq: KetQuaDonPhieu = { hetHan: 0, anDanh: 0, xoaKho: 0, xoaMa: 0 };
  let xoaLuotTai = 0;
  if (!can(nguoiChay, "registration.agent.purge")) return kq;
  const nowMs = homNay.getTime();
  const at = homNay.toISOString();
  const by = maNguoiLam(nguoiChay);
  let cs: Awaited<ReturnType<typeof chinhSachHienHanh>> = null;
  try {
    cs = await chinhSachHienHanh(env.DB, at);
  } catch (e) {
    logLoi("chinh_sach", e);
  }

  // Việc 1 — hết hạn. Lô mỗi phiếu: [đổi trạng thái (điều kiện hạn TRONG câu), lịch sử (changes() > 0), quyết gỡ tệp (changes() > 0)]; xoá kho sau lô.
  if (cs && can(nguoiChay, "registration.agent.purge")) {
    try {
      const moc = { at, mocNhap: new Date(nowMs - cs.draft_expire_days * NGAY_MS).toISOString(), mocBoSung: new Date(nowMs - cs.supplement_expire_days * NGAY_MS).toISOString() };
      for (const { id, inviteId } of await phieuCanHetHan(env.DB, { ...moc, toiDa: TOI_DA_MOI_LUOT })) {
        const r = await env.DB.batch([
          cauHetHan(env.DB, { registrationId: id, ...moc, by }),
          suKienTacNhanStatement(env.DB, { registrationId: id, agentCode: by, command: "HET_HAN", at }),
          cauGoTepChoNeuTruocDoi(env.DB, id, "HET_HAN", at),
          // ADR-0213 Đ7.5: phiếu kết thúc không duyệt ⇒ bỏ giữ chỗ lời mời (CUỐI lô, câu tự canh «đang giữ cho đúng phiếu này»).
          ...(inviteId ? [cauBoGiuChoLoiMoi(env.DB, { id: inviteId, registrationId: id, at, by })] : []),
        ]);
        if ((r[0]?.meta.changes ?? 0) === 0) continue;
        kq.hetHan++;
        kq.xoaKho += (await xoaKhoTepChoDaGo(env, id)).daXoa;
      }
    } catch (e) {
      logLoi("het_han", e);
    }
  }

  // Việc 2 — ẩn danh.
  if (cs && can(nguoiChay, "registration.agent.purge")) {
    try {
      // 2a: phiếu đã kết thúc không được duyệt, quá số ngày. Lô: [mốc đã ẩn danh (điều kiện trạng thái + tuổi TRONG câu), lịch sử (changes() > 0), bản khai, danh tính]. Hai câu xoá
      // CHUỖI TRONG CÂU vào câu mốc: chỉ đổi dòng khi mốc «đã ẩn danh» của phiếu = đúng mốc `at` của lượt này (câu mốc khớp 0 dòng ⇒ cả hai cũng 0 dòng). Câu bản khai là câu của lô duyệt dùng lại.
      const moc = new Date(nowMs - cs.anonymize_days * NGAY_MS).toISOString();
      const mocAnHan = new Date(nowMs - cs.activation_grace_days * NGAY_MS).toISOString();
      for (const id of await phieuCanAnDanh(env.DB, moc, TOI_DA_MOI_LUOT)) {
        const r = await env.DB.batch([
          cauDanhDauAnDanh(env.DB, { registrationId: id, at, moc, by }),
          suKienTacNhanStatement(env.DB, { registrationId: id, agentCode: by, command: "AN_DANH", at }),
          cauAnDanhBanKhai(env.DB, { registrationId: id, at, by }),
          cauAnDanhBanKhaiToChuc(env.DB, { registrationId: id, at, by }), // phần tổ chức cùng lúc, cùng hạn (ADR-0212 Đ7)
          cauAnDanhDanhTinh(env.DB, { registrationId: id, at, by, mocAnHan }),
        ]);
        if ((r[0]?.meta.changes ?? 0) > 0) kq.anDanh++;
      }
      // 2b: phiếu ĐÃ DUYỆT, chưa kích hoạt, quá hạn đặt PIN + ân hạn `activation_grace_days` ⇒ ẩn danh danh tính (tài khoản vẫn tắt; «gửi lại lời mời» từ đây trả 409).
      // Trong ân hạn danh tính còn: Nhân sự gửi lại lời mời được (phán quyết điều phối 15/11, chủ xác nhận sau).
      for (const id of await phieuQuaHanKichHoat(env.DB, mocAnHan, TOI_DA_MOI_LUOT)) {
        const r = await env.DB.batch([
          cauAnDanhDanhTinh(env.DB, { registrationId: id, at, by, mocAnHan }),
          suKienTacNhanStatement(env.DB, { registrationId: id, agentCode: by, command: "AN_DANH_DANH_TINH", at }),
        ]);
        if ((r[0]?.meta.changes ?? 0) > 0) kq.anDanh++;
      }
    } catch (e) {
      logLoi("an_danh", e);
    }
  }

  // Việc 3 — xoá kho tệp chờ «chờ xoá» / «tải dở dang» quá hạn (parties).
  if (can(nguoiChay, "registration.agent.purge")) {
    try {
      kq.xoaKho += await donKhoTepCho(env, TOI_DA_MOI_LUOT, homNay);
    } catch (e) {
      logLoi("xoa_kho", e);
    }
  }

  // Việc 4 — mã email cũ (giữ ≥ max(hạn mã, 1 giờ): trần theo giờ đếm các dòng tạo trong một giờ qua) và lượt tải tệp ra khỏi cửa sổ một giờ.
  if (cs && can(nguoiChay, "registration.agent.purge")) {
    try {
      kq.xoaMa = await xoaMaEmailCu(env.DB, new Date(nowMs - Math.max(cs.code_ttl_minutes * 60_000, GIO_MS)).toISOString(), at);
      xoaLuotTai = await xoaLuotTaiCu(env.DB, nowMs - GIO_MS);
    } catch (e) {
      logLoi("xoa_ma", e);
    }
  }

  // Việc 5 — lời mời vào tổ chức (ADR-0213 Đ7; Ruling R6, mốc B2 Task 15; không thêm mã tác nhân): (a) lưới bỏ giữ chỗ cho phiếu đã kết thúc không duyệt; (b) lời mời MỞ quá hạn ⇒ HẾT HẠN
  // (lời mời đang giữ cho phiếu không hết hạn); (c) lời mời kết thúc quá 30 ngày ⇒ thay số điện thoại bằng dấu ẩn danh. Câu của parties; số đếm chỉ vào chi tiết nhật ký khi khác 0.
  const lm = { boGiu: 0, hetHan: 0, anDanh: 0 };
  if (can(nguoiChay, "registration.agent.purge")) {
    try {
      const ds = await phieuKetThucCoLoiMoi(env.DB, new Date(nowMs - LOI_MOI_AN_DANH_NGAY * NGAY_MS).toISOString(), TOI_DA_MOI_LUOT);
      if (ds.length > 0) {
        const r = await env.DB.batch(ds.map((x) => cauBoGiuChoLoiMoi(env.DB, { id: x.inviteId, registrationId: x.id, at, by })));
        lm.boGiu = r.reduce((t, x) => t + (x.meta.changes ?? 0), 0);
      }
      const [h, a] = await env.DB.batch([cauHetHanLoiMoi(env.DB, at, by), cauAnDanhLoiMoi(env.DB, new Date(nowMs - LOI_MOI_AN_DANH_NGAY * NGAY_MS).toISOString(), at, by)]);
      lm.hetHan = h?.meta.changes ?? 0;
      lm.anDanh = a?.meta.changes ?? 0;
    } catch (e) {
      logLoi("loi_moi", e);
    }
  }

  if (kq.hetHan + kq.anDanh + kq.xoaKho + kq.xoaMa + xoaLuotTai + lm.boGiu + lm.hetHan + lm.anDanh > 0) {
    try {
      const phanLoiMoi = lm.boGiu + lm.hetHan + lm.anDanh > 0 ? ` · lời mời: bỏ giữ chỗ ${lm.boGiu}, hết hạn ${lm.hetHan}, ẩn danh ${lm.anDanh}` : "";
      await auditStatement(env.DB, {
        ...nguoiLam(nguoiChay), action: "registration_cleanup_run", at, targetType: "system", targetId: "dang-ky",
        detail: `hết hạn ${kq.hetHan} · ẩn danh ${kq.anDanh} · xoá kho ${kq.xoaKho} · xoá mã ${kq.xoaMa} · xoá lượt tải ${xoaLuotTai}${phanLoiMoi}`,
      }).run();
    } catch (e) {
      logLoi("nhat_ky", e);
    }
  }
  return kq;
}
