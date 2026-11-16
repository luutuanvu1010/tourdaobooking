// Ba route công khai ĐẦU TIÊN của người đăng ký (ADR-0206 Đ6, Đ7, Đ8; đợt 1 Task 3): cấu hình, xin mã gửi email, nhập mã. Cổng là cookie đăng ký do CHÍNH route nhập mã cấp.
// Xin mã trả cùng MỘT câu (200 `{ ok: true }`) cho mọi hoàn cảnh phụ thuộc trạng thái đã lưu: email mới, email đã có phiếu, email đã có tài khoản (route KHÔNG tra tài khoản nào),
// công tắc đóng, vượt trần. Thư gửi trong `exec.waitUntil` để thời gian gửi thư không lộ ra qua thời gian trả lời. Chỉ lỗi KHÔNG phụ thuộc trạng thái lưu mới khác câu đó:
// bảo trì (503), thiếu / sai Turnstile (503 / 403), email sai dạng (400) — rẽ trước khi đọc bất kỳ trạng thái nào của phiếu hay tài khoản.
// Log và lịch sử KHÔNG chứa email, mã, địa chỉ mạng: bộ đếm và dòng mã chỉ giữ khoá băm có khoá (`khoaBam`).
import { timingSafeEqual } from "../../shared/encoding.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { chanNguoiKhongTaiKhoan } from "../../shared/maintenance.ts";
import { nhanMucChoNguoiDangKy } from "../../shared/dang-ky-hien-thi.ts";
import type { Ctx } from "../../shared/router.ts";
import { clearAttempts, reserveAttempts, turnstileGate, turnstileLog } from "../auth";
import { getMaintenanceState, maintenanceResponse } from "../maintenance";
import { chinhSachRiengTuCongKhai, mucXacMinhBatBuocCaNhan } from "../parties";
import { guiThuMa } from "./mail.ts";
import { cookiePhienDangKy, dkEmailKey, dkIpKey, dkXacNhanIpKey, khoaBam, taoPhienDangKy } from "./phien.ts";
import { chenMaEmail, chinhSachHienHanh, danhTinhTheoEmail, demLanNhapSai, maGanNhat, moPhieuNhap, mucRiengCuaPhieu, tieuMa, type ChinhSachDangKyRow, type MaGanNhat } from "./repository.ts";
import { chuanHoaEmail, sinhMaEmail } from "./rules.ts";
import { sinhMa } from "../../shared/ma-dinh-danh.ts";
import { mucBatBuoc } from "./xac-minh.ts";

const GIO_MS = 3_600_000;
const CAU_TAM_NGUNG = "Tạm ngừng nhận đăng ký. Hãy thử lại sau ít phút.";
const CAU_DONG = "Tour Đảo tạm ngừng nhận đăng ký mới.";
export const CAU_SAI_MA = "Mã không đúng hoặc đã hết hạn. Hãy xin mã mới.";
const enc = new TextEncoder();
const OK = (): Response => json({ ok: true }, 200, { "cache-control": "no-store" });
const TAM_NGUNG = (): Response => error(503, "registration_unavailable", CAU_TAM_NGUNG);

/** GET /api/dang-ky/cau-hinh — công tắc, loại đối tác mở, mục bắt buộc, phiên bản chính sách riêng tư đang hiệu lực. Không con số chống lạm dụng. */
export async function cauHinhDangKy({ env }: Ctx<"public">): Promise<Response> {
  const at = new Date().toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  const [rieng, hoSo, riengTu] = await Promise.all([mucRiengCuaPhieu(env.DB, at), mucXacMinhBatBuocCaNhan(env.DB), chinhSachRiengTuCongKhai(env.DB, at)]);
  return json(
    {
      nhanDangKy: chinhSach?.registration_open === 1,
      loaiMo: (chinhSach?.open_role_codes ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      mucBatBuoc: mucBatBuoc(rieng, hoSo.map((m) => m.ma)).map((ma) => ({ ma, nhan: nhanMucChoNguoiDangKy(ma) })),
      chinhSachRiengTu: riengTu?.phienBan ?? null,
    },
    200,
    { "cache-control": "no-store" },
  );
}

/** POST /api/dang-ky/ma — thân `{ email, turnstileToken }`. */
export async function xinMa({ request, env, exec }: Ctx<"public">): Promise<Response> {
  const baoTri = await getMaintenanceState(env.DB);
  if (chanNguoiKhongTaiKhoan(baoTri)) return maintenanceResponse(baoTri);
  const nowMs = Date.now();
  const at = new Date(nowMs).toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  if (!chinhSach) return TAM_NGUNG();
  const body = await readJson(request);
  const ip = request.headers.get("cf-connecting-ip") ?? "khong-ro";
  // Khác đăng nhập (thiếu khoá thì bỏ qua kiểm): thiếu khoá Turnstile ở đây là 503 — không ai xin mã được khi cổng chống máy chưa dựng (ADR-0206 Đ8).
  const gate = await turnstileGate(env, body?.turnstileToken, ip);
  for (const dong of turnstileLog(gate)) (dong.level === "error" ? console.error : console.warn)(JSON.stringify(dong));
  if (gate.warn === "disabled") return TAM_NGUNG();
  if (!gate.pass) return error(gate.status, gate.code, gate.message);
  const email = chuanHoaEmail(body?.email);
  if (!email) return error(400, "invalid_input", "Email chưa đúng dạng. Hãy kiểm tra lại.");

  const [emailKey, ipKey] = await Promise.all([khoaBam(env.SESSION_SECRET, "email", email), khoaBam(env.SESSION_SECRET, "ip", ip)]);
  // Bộ đếm của đăng nhập dùng lại với khoá riêng `dk:` (không chung `ip:`/`phone:`/`mfa:`); cửa sổ theo dòng chính sách `ask_window_minutes`.
  const dat = await reserveAttempts(env.DB, [{ key: dkEmailKey(emailKey), max: chinhSach.ask_per_mailbox }, { key: dkIpKey(ipKey), max: chinhSach.ask_per_network }], nowMs, chinhSach.ask_window_minutes * 60_000);
  if (!dat.allowed) return OK();
  // Công tắc đóng chỉ ngăn mở phiếu MỚI: email đã có phiếu (đang mở, hoặc đã duyệt chưa kích hoạt) vẫn nhận mã để vào lại (ADR-0206 Đ9).
  const ident = await danhTinhTheoEmail(env.DB, email);
  if (chinhSach.registration_open !== 1 && !ident) return OK();
  const id = crypto.randomUUID();
  const ma = sinhMaEmail(chinhSach.code_digits);
  const codeHash = await khoaBam(env.SESSION_SECRET, "ma", `${id}:${emailKey}:${ma}`);
  const chen = await chenMaEmail(env.DB, {
    id, emailKey, codeHash, at, expiresAt: new Date(nowMs + chinhSach.code_ttl_minutes * 60_000).toISOString(),
    since: new Date(nowMs - GIO_MS).toISOString(), tran: chinhSach.ask_global_per_hour,
  });
  if (!chen) return OK();
  exec.waitUntil(guiThuMa(env, email, ma, chinhSach.code_ttl_minutes, ident?.registration_id ?? null).catch(() => false));
  return OK();
}

/**
 * Kiểm MỘT mã gửi email — CÙNG một đường cho nhập mã (Task 3) và đặt PIN (ADR-0207 Đ7, Task 9), để hai nơi không lệch nhau:
 * lượt nhập sai tính theo địa chỉ mạng (khoá `dk:xn:ip:` băm, riêng `dk:`) → mã MỚI NHẤT của email → còn hạn, chưa đủ số lần → so băm (thời gian hằng) → sai thì đếm một lần sai.
 * Đúng ⇒ trả dòng mã và lượt đã đặt chỗ; NGƯỜI GỌI tiêu mã (`tieuMa`) rồi xoá lượt (`clearAttempts`). Mọi câu sai cùng một câu (không cho dò email nào đang có mã).
 * Dòng chính sách chưa có số riêng cho lượt sai nên DÙNG LẠI `ask_per_network` và `ask_window_minutes` (báo cáo Task 3, vòng sửa 1).
 */
export async function kiemMaEmail(
  env: Env, request: Request, email: string, maNhap: unknown, chinhSach: ChinhSachDangKyRow, nowMs: number,
): Promise<{ ok: true; dong: MaGanNhat; dat: { ids: Record<string, string> } } | { ok: false; res: Response }> {
  const at = new Date(nowMs).toISOString();
  const emailKey = await khoaBam(env.SESSION_SECRET, "email", email);
  const ipKey = await khoaBam(env.SESSION_SECRET, "ip", request.headers.get("cf-connecting-ip") ?? "khong-ro");
  const dat = await reserveAttempts(env.DB, [{ key: dkXacNhanIpKey(ipKey), max: chinhSach.ask_per_network }], nowMs, chinhSach.ask_window_minutes * 60_000);
  if (!dat.allowed) return { ok: false, res: error(429, "too_many_attempts", "Bạn đã nhập sai quá nhiều lần. Hãy đợi ít phút rồi thử lại.") };
  const dong = await maGanNhat(env.DB, emailKey);
  // Không có mã, mã hết hạn, đã đủ số lần nhập: CÙNG một câu.
  if (!dong || dong.expires_at <= at || dong.attempts >= chinhSach.code_max_attempts) return { ok: false, res: error(401, "invalid_code", CAU_SAI_MA) };
  const ma = typeof maNhap === "string" ? maNhap.trim() : "";
  const dung = ma.length > 0 && ma.length <= 20 && timingSafeEqual(enc.encode(await khoaBam(env.SESSION_SECRET, "ma", `${dong.id}:${emailKey}:${ma}`)), enc.encode(dong.code_hash));
  if (!dung) {
    await demLanNhapSai(env.DB, dong.id, at, chinhSach.code_max_attempts);
    return { ok: false, res: error(401, "invalid_code", CAU_SAI_MA) };
  }
  return { ok: true, dong, dat };
}

/** POST /api/dang-ky/xac-nhan — thân `{ email, ma }`; đúng ⇒ đặt cookie đăng ký và trả `{ trangThai }`. */
export async function xacNhanMa({ request, env }: Ctx<"public">): Promise<Response> {
  const baoTri = await getMaintenanceState(env.DB);
  if (chanNguoiKhongTaiKhoan(baoTri)) return maintenanceResponse(baoTri);
  const nowMs = Date.now();
  const at = new Date(nowMs).toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  if (!chinhSach) return TAM_NGUNG();
  const body = await readJson(request);
  const email = chuanHoaEmail(body?.email);
  if (!email) return error(400, "invalid_input", "Email chưa đúng dạng. Hãy kiểm tra lại.");
  const kiem = await kiemMaEmail(env, request, email, body?.ma, chinhSach, nowMs);
  if (!kiem.ok) return kiem.res;
  const { dong, dat } = kiem;
  let ident = await danhTinhTheoEmail(env.DB, email);
  // Công tắc đóng và chưa có phiếu: không mở phiếu mới; mã CHƯA bị tiêu (người đăng ký thử lại khi công tắc mở).
  if (!ident && chinhSach.registration_open !== 1) return error(409, "registration_closed", CAU_DONG);
  if (!(await tieuMa(env.DB, dong.id, at, chinhSach.code_max_attempts))) return error(401, "invalid_code", CAU_SAI_MA);
  let registrationId: string;
  let identityId: string;
  let trangThai: string;
  if (ident) {
    // Có phiếu đang mở, hoặc phiếu ĐÃ DUYỆT chưa kích hoạt (danh tính đã hạ is_open): trả trạng thái của phiếu đó, KHÔNG mở phiếu mới.
    ({ registration_id: registrationId, identity_id: identityId, status: trangThai } = ident);
  } else {
    registrationId = sinhMa("DK", crypto.getRandomValues(new Uint8Array(8)));
    identityId = crypto.randomUUID();
    try {
      await env.DB.batch(moPhieuNhap(env.DB, { registrationId, identityId, email, at, expiresAt: new Date(nowMs + chinhSach.draft_expire_days * 86_400_000).toISOString() }));
      trangThai = "DANG_DIEN";
    } catch (e) {
      // Hai lần nhập song song cho cùng email: chỉ mục «một phiếu đang mở mỗi email» chặn lô thứ hai; đọc lại phiếu của lô thắng.
      ident = await danhTinhTheoEmail(env.DB, email);
      if (!ident) throw e;
      ({ registration_id: registrationId, identity_id: identityId, status: trangThai } = ident);
    }
  }
  // Mã mới là PHIÊN mới: mốc bắt đầu = bây giờ (các route sau cấp lại cookie giữ mốc này để hạn không thao tác trượt, tối đa `session_max_hours`).
  await clearAttempts(env.DB, null, dat.ids);
  const token = await taoPhienDangKy(env.SESSION_SECRET, registrationId, identityId, nowMs);
  return json({ trangThai }, 200, { "set-cookie": cookiePhienDangKy(token, chinhSach.session_max_hours, new URL(request.url).protocol === "https:"), "cache-control": "no-store" });
}
