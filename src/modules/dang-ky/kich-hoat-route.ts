// KÍCH HOẠT (ADR-0207 Đ7; đợt 1 Task 9): người được duyệt tự đặt PIN — route công khai `POST /api/dang-ky/phieu/dat-pin`, cổng là cookie đăng ký kiểm ở ĐÂY (như phieu-route.ts).
// Thứ tự: bảo trì (503) → chính sách → cookie (401) → phiếu của cookie → TRẠNG THÁI (409: chưa duyệt / đã kích hoạt / quá hạn) → PIN (400) → MÃ EMAIL MỚI (401) → tiêu mã → MỘT lô.
// Cookie của phiếu ĐÃ DUYỆT trỏ danh tính đã hạ is_open (bước duyệt) — vẫn nhận, NHƯNG chỉ cho trạng thái ĐÃ DUYỆT chưa kích hoạt. Một cookie đang mở là CHƯA ĐỦ: phải có mã email MỚI
// (xin bằng POST /api/dang-ky/ma ngay trước khi đặt PIN; mã đã dùng để vào phiên đã bị tiêu) — kẻ cầm được máy đang mở phiên không chiếm được tài khoản.
// Lô: [câu chốt KICH_HOAT (trigger RAISE nếu chưa duyệt / đã kích hoạt / quá hạn) → câu đặt PIN + bật của staff (`WHERE active = 0`) → câu canh 0 dòng (RAISE nếu câu trước khớp 0 dòng)
//      → mốc kích hoạt → dòng lịch sử → ẩn danh danh tính → nhật ký do CHÍNH tài khoản mới đứng tên (`registration_activated`, KHÔNG `staff_reactivated`)].
// KHÔNG cấp phiên `td_session` (người dùng sang màn Đăng nhập như mọi người); phiên đăng ký kết thúc (cookie Max-Age=0). Nhật ký, lịch sử, log không chứa email, PIN, số điện thoại.
import { CAU_PHIEU } from "../../shared/dang-ky-hien-thi.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { chanNguoiKhongTaiKhoan } from "../../shared/maintenance.ts";
import type { Ctx } from "../../shared/router.ts";
import { auditStatement } from "../audit";
import { clearAttempts } from "../auth";
import { getMaintenanceState, maintenanceResponse } from "../maintenance";
import { datPinKichHoatStatements, hashPin, validateFreshPin } from "../staff";
import { cookieKetThucPhienDangKy, docPhienDangKy } from "./phien.ts";
import {
  cauAnDanhDanhTinh, cauCanhKichHoat, cauChotKichHoat, cauKichHoatPhieu, chinhSachHienHanh, emailCuaDanhTinh, phieuDeXem, phieuKichHoat, suKienNguoiDangKyStatement, tieuMa,
} from "./repository.ts";
import { CAU_SAI_MA, kiemMaEmail } from "./xin-ma-route.ts";

const KHONG_CHO_KICH_HOAT = (): Response =>
  error(409, "activation_not_pending", "Phiếu này không còn chờ đặt mã PIN. Nếu bạn đã đặt mã PIN, hãy vào màn Đăng nhập.");
const QUA_HAN = (): Response => error(409, "activation_expired", "Đã quá hạn đặt mã PIN. Hãy liên hệ Tour Đảo để được gửi lại lời mời.");

/** Lỗi của lô kích hoạt do câu chốt / câu canh / chỉ mục một-lần — map sang 409; lỗi lạ ⇒ null (ném lên, 500 có mã yêu cầu). */
function loiLoKichHoat(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/dk_activation_late/.test(m)) return QUA_HAN();
  if (/dk_activation_state|dk_activation_done|dk_activation_account|UNIQUE constraint failed: dk_decision/.test(m)) return KHONG_CHO_KICH_HOAT();
  return null;
}

// ---- POST /api/dang-ky/phieu/dat-pin ---- thân `{ ma, pin }`
export async function datPinKichHoat({ request, env }: Ctx<"public">): Promise<Response> {
  const baoTri = await getMaintenanceState(env.DB);
  if (chanNguoiKhongTaiKhoan(baoTri)) return maintenanceResponse(baoTri);
  const nowMs = Date.now();
  const at = new Date(nowMs).toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  if (!chinhSach) return error(404, "not_found", "Không tìm thấy.");
  const phien = await docPhienDangKy(request, env, nowMs, { idleMin: chinhSach.session_idle_minutes, maxHours: chinhSach.session_max_hours });
  if (!phien) return error(401, "registration_session_required", CAU_PHIEU.hetPhien);
  const { registrationId, identityId } = phien;
  if (!(await phieuDeXem(env.DB, registrationId, identityId))) return error(401, "registration_session_required", CAU_PHIEU.hetPhien);
  // Trạng thái TRƯỚC mã: đặt PIN lần hai / quá hạn trả 409 rõ ràng, không đốt mã của người dùng.
  const p = await phieuKichHoat(env.DB, registrationId);
  if (!p || p.status !== "DA_DUYET" || p.activated_at !== null || !p.staff_id) return KHONG_CHO_KICH_HOAT();
  if (!p.activation_deadline_at || at > p.activation_deadline_at) return QUA_HAN();
  const body = await readJson(request);
  const loiPin = validateFreshPin(body?.pin);
  if (loiPin) return error(400, "invalid_input", loiPin);
  const pin = body!.pin as string;
  // Danh tính đã ẩn danh (không còn email) thì không còn mã nào kiểm được.
  const email = await emailCuaDanhTinh(env.DB, identityId, registrationId);
  if (!email) return KHONG_CHO_KICH_HOAT();
  const kiem = await kiemMaEmail(env, request, email, body?.ma, chinhSach, nowMs);
  if (!kiem.ok) return kiem.res;
  if (!(await tieuMa(env.DB, kiem.dong.id, at, chinhSach.code_max_attempts))) return error(401, "invalid_code", CAU_SAI_MA);
  await clearAttempts(env.DB, null, kiem.dat.ids);

  const staffId = p.staff_id;
  const pinHash = await hashPin(pin);
  try {
    await env.DB.batch([
      cauChotKichHoat(env.DB, { registrationId, version: p.current_version, staffId, at }),
      ...datPinKichHoatStatements(env.DB, staffId, pinHash, nowMs),
      cauCanhKichHoat(env.DB, { registrationId, identityId, at }), // PHẢI liền sau câu của staff: `changes()` đọc câu đó
      cauKichHoatPhieu(env.DB, { registrationId, at, by: staffId }),
      suKienNguoiDangKyStatement(env.DB, { registrationId, identityId, command: "KICH_HOAT", at }),
      cauAnDanhDanhTinh(env.DB, { registrationId, at, by: staffId }),
      auditStatement(env.DB, { staffId, action: "registration_activated", at, targetType: "party", targetId: registrationId, detail: `phiếu ${registrationId} · tự đặt mã PIN, kích hoạt tài khoản` }),
    ]);
  } catch (e) {
    const l = loiLoKichHoat(e);
    if (l) return l;
    throw e;
  }
  return json({ daKichHoat: true }, 200, { "set-cookie": cookieKetThucPhienDangKy(new URL(request.url).protocol === "https:"), "cache-control": "no-store" });
}
