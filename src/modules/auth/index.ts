// Module auth — phiên đăng nhập (cookie ký HMAC) + chống dò PIN + Cloudflare Turnstile ở đăng nhập (./turnstile.ts). Route: /api/auth/*.
// Kiểm quyền từng route KHÔNG nằm ở đây: router (src/shared/router.ts) dùng `currentStaff` do gốc lắp ráp truyền vào.
import { getMaintenanceState, maintenanceBlock, toStatus, type MaintenanceState } from "../maintenance";
import { ownerCompany } from "../parties";
import {
  accountRoleCodesOf, authenticate, findStaffByPhone, getActiveStaff, isValidPin, mfaDeadlinesOf, mfaEnrollWindowStatement, normalizePhone, recordLogin, type StaffProfile,
} from "../staff";
import { APP_VERSION } from "../../shared/app-info";
import type {
  AuthConfigResponse, LoginMfaStepResponse, MeResponse, MfaEmailSendResponse, MfaEnrollConfirmResponse, MfaTotpStartResponse, MfaVerifyResponse, PasskeyRequestOptionsResponse,
  SessionPolicyChange,
} from "../../shared/contracts";
import { error, getCookie, json, readJson } from "../../shared/http";
import { dbNgoaiVe } from "../../shared/lan-gui-boc";
import { route, type AppModule } from "../../shared/router";
import { newTrustedToken, sha256Hex } from "./mfa-crypto";
import {
  MFA_LIMIT, TRUSTED_COOKIE, TRUSTED_TTL_SECONDS, clearMfaAttemptsStatement, lockedMfaStaffIds, mfaKey, mfaKeyReady, trustedCookie, unlockLogin, useRecoveryCode, useTotp,
} from "./mfa-dang-nhap";
import { MAIL_LIMIT, mailKey, maskEmail, normalizeEmail, phatMaEmail, useEmailCode } from "./mfa-email";
import {
  factorEndAllStatement, factorEndKindStatement, factorListLive, recoveryCountLeft, recoveryRevokeAllStatement, staffIdsWithFactor, trustedFind, trustedInsertStatement, trustedRevokeAllStatement,
  trustedRevokeAllIfSuspendedStatement, trustedRevokeOfSessionStatement, trustedTouchStatement,
} from "./mfa-repo";
import { batTotpStatements, boMaDuPhongMoi, khopKhoaMoi, moiKhoaTotp } from "./mfa-tu-phuc-vu";
import { PENDING_COOKIE, allowedFactors, clearedPendingCookie, createPendingToken, loginStep, pendingCookie, verifyPendingToken } from "./mfa-rules";
import { PASSKEY_ERRORS, checkPasskeyAssertion, clearChallengeCookie, issuePasskeyChallenge, limitChallenge, passkeyRp, readPasskeyChallenge } from "./passkey";
import {
  endAllButNewestStatement, endAllSessionsIfSuspendedStatement as endAllIfSuspendedRow, endExpiredSessionsStatement, endOtherSessionsStatement, endSessionStatement, findLiveSession,
  getSession, insertSessionStatement, listPolicyRows, markSessionReissuedStatement, markSingleStatement, touchSessionStatement,
  closePolicyStatement, danhDauMotMayTheoTapStatement, endExpiredAllStatement, insertPolicyAfterCloseStatement, insertPolicyNewStatement, sietTheoTapStatement,
} from "./repository";
import { isQuyenDatDuoc, type QuyenDatDuoc } from "../../shared/chinh-sach-dang-nhap";
import type { PermissionCode } from "../../shared/permissions";
import type { RoleCode } from "../../shared/roles";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, clearedSessionCookie, createSessionToken, isSecure, sessionCookie, verifySessionToken } from "./session";
import { SESSION_TOUCH_MS, isSingleDevice, sessionDeviceLabel, trimIp, trimUserAgent, END_REASON_LABEL, type EndReason, type TapNhieuMay } from "./session-ledger";
import { IP_LIMIT, PHONE_LIMIT, clearAttempts, ipKey, lockedPhones, phoneKey, reserveAttempts, unlockPhone } from "./throttle";
import { turnstileGate, turnstileLog, turnstileSiteKey } from "./turnstile";
import { passkeyRelyingParty } from "./webauthn";

export { lockedPhones, unlockPhone };
// Xuất cho module `accounts` (bật/gỡ/đặt PIN bằng Face ID, danh sách passkey của tài khoản — ADR-0016).
export {
  countActivePasskeys, firstUserHandle, insertPasskeyStatement, listActivePasskeys, revokeAllPasskeysIfSuspendedStatement, revokeAllPasskeysStatement, revokePasskeyStatement,
  type PasskeyRow,
} from "./repository";
export { logPasskeyRejected, toPasskeyDto } from "./passkey";
// Xuất cho module `accounts` — tự bật / đổi / gỡ bảo mật hai lớp, mã dự phòng, quên máy được tin (ADR-0074 điều 5; route /api/account/mfa*). Không hàm nào trả
// khoá đã mã hoá hay băm; câu lệnh chưa chạy để route gộp với dòng nhật ký trong một lô.
export {
  batEmailStatements, batTotpStatements, boMaDuPhongMoi, goYeuToStatements, khopKhoaMoi, mayTinSong, moiKhoaTotp, quenMayStatement, quenMoiMayStatement, yeuToSong,
  type MayTin, type YeuToSong,
} from "./mfa-tu-phuc-vu";
export { allowedFactors, isInternal, mfaBanner } from "./mfa-rules";
export { recoveryCountLeft };
// Phần C Task 3: tự bật yếu tố email (chuẩn hoá / che địa chỉ) và lô đổi quyền / vai kết thúc yếu tố email của vai lớn (ADR-0074 điều 7).
export { maskEmail, normalizeEmail };
export { factorEndKindStatement };
// Kế hoạch Task 6: danh sách Quản lý tài khoản (ai đã bật, ai đang bị khoá bước hai) và nút "Mở khoá" gỡ cả khoá bước hai.
export { lockedMfaStaffIds, staffIdsWithFactor, unlockLogin };
export { PASSKEY_ERRORS, checkPasskeyAssertion, clearChallengeCookie, issuePasskeyChallenge, limitChallenge, passkeyRp, readPasskeyChallenge };
export { verifyRegistration } from "./webauthn";
export { deviceLabel } from "./device-label";

/** Độ dài tối thiểu của SESSION_SECRET (khoá ký phiên). */
export const MIN_SECRET_LENGTH = 32;

/** Kiểm cấu hình bắt buộc của auth; trả thông báo lỗi cho log, hoặc null nếu ổn. Không bao giờ in giá trị bí mật. */
export function checkAuthConfig(env: Env): string | null {
  const secret = env.SESSION_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return "Thiếu SESSION_SECRET (wrangler secret put SESSION_SECRET).";
  if (secret.length < MIN_SECRET_LENGTH) return `SESSION_SECRET quá ngắn (${secret.length} < ${MIN_SECRET_LENGTH} ký tự).`;
  return null;
}

/**
 * Nhân viên + mã phiên của request, hoặc null (ADR-0075 điều 1). Kiểm: chữ ký → dòng aut_session còn sống (chưa kết thúc, chưa hết hạn) → tài khoản hoạt động
 * (lưới `credentials_changed_at`: phiên phát hành trước lần đổi PIN/gỡ Face ID gần nhất bị từ chối). `last_seen_at` ghi thưa (tối đa 5 phút một lần).
 */
export async function currentStaff(request: Request, env: Env, exec?: ExecutionContext): Promise<{ staff: StaffProfile; sessionId: string; baoTri: MaintenanceState } | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const t = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  if (!t) return null; // chữ ký sai/hết hạn bị loại ở đây, TRƯỚC mọi truy vấn D1
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  // BA câu độc lập chạy CÙNG LÚC (một chuyến D1 thay vì hai nối đuôi): phiên, nhân viên, và trạng thái chế độ bảo trì (router cần ngay sau đó — chuyển qua `baoTri`).
  // Quyết định chặn vẫn theo QUYỀN của phiên (xét ở cổng bảo trì sau khi phiên + nhân viên hợp lệ); đọc song song không đổi nghĩa.
  const [row, staff, baoTri] = await Promise.all([
    findLiveSession(env.DB, t.sessionId, t.staffId, nowIso), getActiveStaff(env.DB, t.staffId, t.issuedAt), getMaintenanceState(env.DB),
  ]);
  if (!row || !staff) return null;
  if (Date.parse(row.last_seen_at) < now - SESSION_TOUCH_MS) {
    // Ghi mốc hoạt động Ở NỀN (không chặn phản hồi): câu có điều kiện `last_seen_at < ?` nên lặp hay chậm đều vô hại; phiên đã bị lưới `credentials_changed_at` giết
    // không bao giờ tới đây (đã bị từ chối ở getActiveStaff). Không có `exec` (bài kiểm gọi thẳng) thì chờ như cũ.
    const ghi = touchSessionStatement(env.DB, row.id, nowIso, new Date(now - SESSION_TOUCH_MS).toISOString()).run().catch((e: unknown) =>
      console.error(JSON.stringify({ level: "error", event: "session_touch_failed", message: e instanceof Error ? e.message : String(e) })));
    if (exec) exec.waitUntil(ghi);
    else await ghi;
  }
  return { staff, sessionId: t.sessionId, baoTri };
}

/**
 * NƠI DUY NHẤT cấp phiên MỚI (ADR-0075 điều 2; đặc tả §6 quy tắc 4). Một lô: dọn phiên hết hạn → (tài khoản một máy) kết thúc phiên còn sống,
 * lý do "bi_thay" → chèn phiên mới. Chỉ mục aut_session_one_live là lưới khi hai lần đăng nhập chạy đua: lần thua nhận 409 sạch.
 * `endedSessionIds` = các phiên câu "bị thay" của CHÍNH lô này vừa kết thúc (RETURNING id; không gồm phiên hết hạn do câu dọn) — để đóng Bảng tin của đúng
 * máy cũ (ADR-0075 điều 6a). `single` = tài khoản chịu luật một máy (route đăng nhập dùng để tắt thông báo của máy cũ — điều 6b).
 */
export async function issueLoginSession(
  request: Request, env: Env, profile: StaffProfile, method: "PIN" | "PIN_MFA" | "PIN_TRUSTED" | "PASSKEY",
  opts: { trustedDeviceId?: string | null; now?: number } = {},
): Promise<{ cookie: string; sessionId: string; endedSessionIds: string[]; single: boolean } | { conflict: Response }> {
  const now = opts.now ?? Date.now();
  const at = new Date(now).toISOString();
  // ADR-0085: chính sách đọc MỖI lần cấp phiên (một câu ≤ 9 dòng), cùng lúc với vai.
  const [roles, nhieuMay] = await Promise.all([accountRoleCodesOf(env.DB, profile.id), docTapNhieuMay(env.DB)]);
  const single = isSingleDevice(profile.permissions, roles, nhieuMay);
  const id = crypto.randomUUID();
  const ua = request.headers.get("user-agent");
  let ended: string[] = [];
  try {
    const kq = await env.DB.batch([
      endExpiredSessionsStatement(env.DB, profile.id, at),
      ...(single ? [endOtherSessionsStatement(env.DB, profile.id, null, "bi_thay", at, null)] : []),
      insertSessionStatement(env.DB, {
        id, staffId: profile.id, method, single: single ? 1 : 0, trustedDeviceId: opts.trustedDeviceId ?? null,
        deviceLabel: sessionDeviceLabel(ua), userAgent: trimUserAgent(ua), ip: trimIp(request.headers.get("cf-connecting-ip")),
        at, expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
      }),
    ]);
    // Thứ tự lô cố định: [0] dọn hạn, [1] bị thay (chỉ khi single), cuối là chèn — kết quả RETURNING của câu [1] là danh sách phiên vừa bị thay.
    if (single) ended = ((kq[1]?.results ?? []) as { id: string }[]).map((r) => r.id);
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) return { conflict: error(409, "session_race", "Tài khoản đang đăng nhập ở máy khác cùng lúc. Thử lại sau vài giây.") };
    throw e;
  }
  return { cookie: sessionCookie(await createSessionToken(env.SESSION_SECRET, profile.id, id, now), isSecure(request)), sessionId: id, endedSessionIds: ended, single };
}

/**
 * Cấp lại cookie cho phiên ĐANG CÓ (đổi PIN, gỡ Face ID, đặt PIN bằng Face ID — ADR-0075 điều 5): giữ mã phiên; `issuedAt` (mili-giây) = đúng mốc vừa ghi
 * vào `credentials_changed_at` để lưới `getActiveStaff` không tự thu hồi phiên này.
 */
export async function reissueSessionCookie(request: Request, env: Env, staffId: string, sessionId: string, issuedAt: number): Promise<string> {
  return sessionCookie(await createSessionToken(env.SESSION_SECRET, staffId, sessionId, issuedAt), isSecure(request));
}

export { endOtherSessionsStatement };
export type { EndReason };
/**
 * Sổ phiên cho route xem / gỡ phiên (ADR-0075 điều 7–8). Route nằm ở module `accounts` (cạnh accounts → auth, audit, staff đã có): gỡ phiên phải ghi nhật ký
 * `session_revoked` trong CÙNG lô, mà `auth` không import `audit` (ALLOWED_EDGES của src/architecture.test.ts — không nới hàng rào).
 */
export { getSession, listMySessions, listSessions, type SessionRow } from "./repository";
export { toSessionDto } from "./session-ledger";
/** Kết thúc MỘT phiên (đăng xuất, bị gỡ). Chưa chạy; `changes` = 0 khi phiên đã kết thúc từ trước. */
export const endOneSessionStatement = (db: D1Database, id: string, reason: EndReason, at: string, by: string | null): D1PreparedStatement =>
  endSessionStatement(db, id, reason, at, by);
/** Kết thúc MỌI phiên còn sống của tài khoản (đặt lại PIN, ngưng, tắt lớp hai…). Chưa chạy — gộp vào lô của module gọi. */
export const endAllSessionsStatement = (db: D1Database, staffId: string, reason: EndReason, at: string, by: string | null): D1PreparedStatement =>
  endOtherSessionsStatement(db, staffId, null, reason, at, by);
/**
 * Lô Quản trị/Toàn quyền TẮT bảo mật hai lớp của người khác (ADR-0074 điều 5; đặc tả §4.5) — phần yếu tố của auth, CHƯA chạy, theo thứ tự: kết thúc mọi yếu
 * tố → thu hồi mã dự phòng còn sống → thu hồi máy được tin ('tat_hai_lop') → xoá bộ đếm bước hai `mfa:<id>` (bật lại ngay không bị 429). Không câu nào đòi
 * câu trước đổi dòng: tài khoản CHƯA có yếu tố (hết ân hạn, bị chặn) vẫn tắt được — đó là đường Quản trị bật giúp (§4.4). Route (accounts) nối tiếp NGAY
 * trong lô: endAllSessionsStatement('tat_hai_lop') → touch credentials_changed_at → cửa sổ bật lại 24 giờ (staff) → nhật ký mfa_reset (câu kết thúc phiên
 * đứng thẳng trong lô để hàng rào accounts/phien-cung-lo.test.ts thấy).
 */
export function tatHaiLopStatements(db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement[] {
  return [
    factorEndAllStatement(db, staffId, at, by),
    recoveryRevokeAllStatement(db, staffId, at, by),
    trustedRevokeAllStatement(db, staffId, "tat_hai_lop", at, by),
    clearMfaAttemptsStatement(db, staffId),
  ];
}
/** Kết thúc mọi phiên của tài khoản CHỈ KHI nó đã ngưng lúc câu chạy (đặt CUỐI lô ngưng tài khoản, sau câu chốt). Chưa chạy. */
export const endAllSessionsIfSuspendedStatement = (db: D1Database, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  endAllIfSuspendedRow(db, staffId, "ngung" satisfies EndReason, at, by);
/**
 * Thu hồi mọi máy được tin của tài khoản ('ngung') CHỈ KHI nó đã ngưng lúc câu chạy (Task 8 Phần B, bất biến R-AUT-MFA-3). Chưa chạy — đặt CUỐI lô ngưng
 * tài khoản, ngoài chuỗi changes(). Cần vì lưới credentials_changed_at chỉ được touch khi lô ngưng gỡ được Face ID: không có câu này, tài khoản không Face ID
 * được kích hoạt lại vẫn dùng máy tin cũ để bỏ qua bước hai.
 */
export { trustedRevokeAllIfSuspendedStatement };
/**
 * Thu hồi MỌI máy được tin còn sống của tài khoản khi tự đổi PIN ('doi_pin') hoặc Quản trị đặt lại PIN ('dat_lai_pin') — đặc tả hai lớp §6 quy tắc 3
 * (dòng thật, không chỉ lưới credentials_changed_at: danh sách "Máy được tin" ở trang Tôi phải hết máy). Chưa chạy — đặt CUỐI lô, ngoài chuỗi changes().
 */
export const trustedRevokeOnPinStatement = (db: D1Database, staffId: string, reason: "doi_pin" | "dat_lai_pin", at: string, by: string): D1PreparedStatement =>
  trustedRevokeAllStatement(db, staffId, reason, at, by);
/**
 * Thu hồi MỌI máy được tin còn sống ('tat_hai_lop') khi đổi quyền/vai làm yếu tố email hết hiệu lực (ADR-0074 điều 7, vòng sửa 1 Task 3 Phần C): không
 * tách được máy nào được tin nhờ mã email ⇒ thu hồi toàn bộ, kể cả máy tin nhờ ứng dụng xác thực. Chưa chạy — người gọi đặt trong CÙNG lô với câu kết thúc EMAIL.
 */
export const trustedRevokeOnEmailLossStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement =>
  trustedRevokeAllStatement(db, staffId, "tat_hai_lop", at, by);
/**
 * IT/Toàn quyền gỡ MỘT phiên (ADR-0075 điều 6c): thu hồi máy được tin gắn với phiên đó ('bi_go') chỉ khi chính lô vừa kết thúc phiên (khớp lý do 'bi_go',
 * mốc `at`, người gỡ `by` của endOneSessionStatement). Chưa chạy — đặt SAU câu kết thúc phiên và câu nhật ký trong cùng lô.
 */
export { trustedRevokeOfSessionStatement };
/**
 * Đánh dấu phiên được GIỮ và cấp lại cookie khi tự đổi PIN / gỡ Face ID: `at` PHẢI là ISO của đúng mốc ms ghi vào credentials_changed_at. Chưa chạy —
 * gộp vào cùng lô với endOtherSessionsStatement.
 */
export { markSessionReissuedStatement };

/** Chính sách đăng nhập hiện hành (ADR-0085): đọc D1 MỖI lần gọi — không lưu đệm trong Worker (mỗi bản Worker sẽ giữ một bản khác nhau). Bỏ qua mã lạ. */
export async function docChinhSachPhien(db: D1Database): Promise<{ id: string; permissionCode: QuyenDatDuoc; multi: boolean }[]> {
  return (await listPolicyRows(db)).flatMap((r) => (isQuyenDatDuoc(r.permission_code) ? [{ id: r.id, permissionCode: r.permission_code, multi: r.multi === 1 }] : []));
}
export const docTapNhieuMay = async (db: D1Database): Promise<TapNhieuMay> =>
  new Set((await docChinhSachPhien(db)).filter((r) => r.multi).map((r) => r.permissionCode));
export type { TapNhieuMay };
/**
 * Lô ghi chính sách (ADR-0085 đặc tả §4.2 bước 3.1): mỗi quyền đổi — có bản đang xem: [đóng đúng id → chèn sau đóng]; chưa có dòng: [chèn mới]. Lần lưu dựa
 * trên bản cũ làm CẢ lô lùi (laLoiChinhSachCu) — người gọi trả 409. Chưa chạy.
 */
export function luuChinhSachStatements(db: D1Database, v: { thayDoi: readonly SessionPolicyChange[]; at: string; by: string }): D1PreparedStatement[] {
  return v.thayDoi.flatMap((t) => {
    const moi = { id: crypto.randomUUID(), code: t.permissionCode, multi: t.multi, at: v.at, by: v.by };
    return t.banDangXem === null
      ? [insertPolicyNewStatement(db, moi)]
      : [closePolicyStatement(db, { id: t.banDangXem, code: t.permissionCode, at: v.at, by: v.by }), insertPolicyAfterCloseStatement(db, moi)];
  });
}
/** Siết theo tập (đặc tả §4.2 bước 3.3): [dọn hạn → siết (RETURNING id, staff_id) → đánh dấu một máy]. Nối SAU các câu ghi chính sách cùng lô.
 * Các câu này PHẢI đứng CUỐI lô: `ketQua` đọc theo vị trí (`r.at(-2)` = câu siết). */
export function sietTheoTapStatements(db: D1Database, at: string, by: string): { statements: D1PreparedStatement[]; ketQua: (r: readonly D1Result[]) => { sessionIds: string[]; staffIds: string[] } } {
  return {
    statements: [endExpiredAllStatement(db, at), sietTheoTapStatement(db, at, by), danhDauMotMayTheoTapStatement(db, at, by)],
    ketQua: (r) => {
      const rows = (r.at(-2)?.results ?? []) as { id: string; staff_id: string }[];
      return { sessionIds: rows.map((x) => x.id), staffIds: [...new Set(rows.map((x) => x.staff_id))] };
    },
  };
}
export { demSietTheoTap, laLoiChinhSachCu } from "./repository";

/**
 * ADR-0085 Q2 điều 7 (thay ADR-0075 điều 3): đổi quyền / vai làm đổi "được nhiều máy" (`isSingleDevice` với chính sách `nhieuMay` — Toàn quyền, vai IT, hoặc
 * quyền mà chính sách đặt Nhiều máy — tính trên quyền + vai TRƯỚC và SAU lần đổi, cùng MỘT bản chính sách đọc đầu request).
 * - Mất nhiều máy: [dọn hạn → kết thúc mọi phiên trừ phiên còn sống mới nhất ('mat_mien') → đánh dấu phiên còn lại single = 1] — thứ tự này để chỉ mục duy
 *   nhất không vỡ. Các câu KHÔNG tự kiểm quyền trong SQL.
 * - Được nhiều máy hoặc không đổi: không câu nào (đặc tả §4.4 — nới không ghi phiên).
 * Các câu chưa chạy; người gọi đặt các câu ở lô THỨ HAI nếu lô đổi quyền/vai có câu chốt (chỉ chạy khi câu chốt đã thắng); không có câu chốt thì nối cuối lô
 * duy nhất. Rồi đọc `ketQua(kết quả của lô chứa các câu)` để đóng Bảng tin của đúng các phiên vừa bị kết thúc, giữ thông báo của phiên được giữ (ADR-0075 điều 6).
 */
export function exemptionChangeStatements(
  db: D1Database,
  v: {
    staffId: string; at: string; by: string; nhieuMay: TapNhieuMay;
    before: { permissions: readonly PermissionCode[]; roles: readonly RoleCode[] }; after: { permissions: readonly PermissionCode[]; roles: readonly RoleCode[] };
  },
): { statements: D1PreparedStatement[]; ketQua: (results: readonly D1Result[]) => { endedSessionIds: string[]; keptSessionId: string | null } } {
  const truoc = isSingleDevice(v.before.permissions, v.before.roles, v.nhieuMay);
  const sau = isSingleDevice(v.after.permissions, v.after.roles, v.nhieuMay);
  const none = () => ({ endedSessionIds: [], keptSessionId: null });
  // Nới (một máy → nhiều máy) hoặc không đổi: KHÔNG ghi gì lên aut_session (ADR-0085 đặc tả §4.4).
  if (!(!truoc && sau)) return { statements: [], ketQua: none };
  return {
    statements: [endExpiredSessionsStatement(db, v.staffId, v.at), endAllButNewestStatement(db, v.staffId, v.at, v.by), markSingleStatement(db, v.staffId, v.at, v.by)],
    ketQua: (results) => {
      const ids = (r: D1Result | undefined) => ((r?.results ?? []) as { id: string }[]).map((x) => x.id);
      return { endedSessionIds: ids(results.at(-2)), keptSessionId: ids(results.at(-1))[0] ?? null };
    },
  };
}

/** Thân 429 chung của bộ chống dò (PIN và bước hai — ADR-0074: "429 như PIN"). `vi = "gui_thu"`: hạn mức gửi mã email (cùng mã lỗi, câu nói đúng việc). */
function tooMany(seconds: number, vi: "nhap_sai" | "gui_thu" = "nhap_sai"): Response {
  const phut = Math.ceil(seconds / 60);
  const message = vi === "gui_thu"
    ? `Đã gửi quá nhiều mã qua email. Thử lại sau ${phut} phút, hoặc dùng ứng dụng xác thực / mã dự phòng.`
    : `Nhập sai quá nhiều lần. Thử lại sau ${phut} phút hoặc nhờ người phụ trách hệ thống mở khoá.`;
  return json({ error: { code: "too_many_attempts", message, retryAfterSeconds: seconds } }, 429, { "retry-after": String(seconds) });
}

/**
 * Địa chỉ của yếu tố EMAIL đang sống, CHỈ khi quyền hiện tại cho phép email (ADR-0074 điều 7: Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực — dữ
 * liệu lệch thì coi như không có yếu tố email; chỉ siết). Địa chỉ đầy đủ không bao giờ ra khỏi máy chủ, trừ chính lá thư gửi tới nó.
 */
async function emailCuaYeuTo(db: D1Database, profile: StaffProfile): Promise<string | null> {
  if (!allowedFactors(profile.permissions).includes("EMAIL")) return null;
  return (await factorListLive(db, profile.id)).find((f) => f.kind === "EMAIL")?.email ?? null;
}
/** Bước hai bằng mã email: phải có yếu tố EMAIL sống (quyền cho phép) và mã mở gửi tới ĐÚNG địa chỉ đó (useEmailCode). */
async function useEmailLogin(db: D1Database, profile: StaffProfile, code: string, nowIso: string): Promise<"ok" | "invalid"> {
  const email = await emailCuaYeuTo(db, profile);
  if (!email) return "invalid";
  return (await useEmailCode(db, { staffId: profile.id, email, purpose: "login", code, nowIso })) ? "ok" : "invalid";
}
const NO_EMAIL_FACTOR = (): Response => error(409, "no_email_factor", "Tài khoản này chưa bật nhận mã qua email. Dùng ứng dụng xác thực hoặc mã dự phòng.");
const MAIL_FAILED = (): Response => error(502, "mail_failed", "Chưa gửi được email, thử lại hoặc dùng cách khác.");

/** Ghi "Đăng nhập gần nhất" SAU khi phiên đã cấp (qua bước hai mới tính). Lỗi ghi không được làm hỏng đăng nhập (chỉ là thống kê): ghi log rồi cho qua. */
async function ghiDangNhap(env: Env, staffId: string): Promise<void> {
  await recordLogin(env.DB, staffId, new Date().toISOString()).catch((e: unknown) =>
    console.error(JSON.stringify({ level: "error", event: "record_login_failed", message: e instanceof Error ? e.message : String(e) })),
  );
}

const MFA_EXPIRED = (): Response => error(401, "mfa_expired", "Đã quá 5 phút, đăng nhập lại.");
/** Nội bộ chưa bật lớp hai, hết ân hạn (kể cả hạn NULL) và không trong cửa sổ bật lại — đóng cửa an toàn (ADR-0074 điều 1; đặc tả §4.4). */
const MFA_SETUP_REQUIRED = (): Response => error(403, "mfa_setup_required", "Tài khoản cần bật bảo mật hai lớp. Liên hệ Quản trị để được hỗ trợ.");
const ENROLL_DONE = (): Response => error(409, "mfa_changed", "Bảo mật hai lớp của tài khoản này đã được bật — đăng nhập lại để nhập mã.");
export const MFA_UNAVAILABLE = (): Response => error(503, "mfa_unavailable", "Máy chủ chưa cấu hình khoá bảo mật hai lớp. Báo IT.");

/**
 * Kiểm mã của yếu tố HIỆN CÓ khi tự đổi khoá / gỡ yếu tố / tạo lại mã dự phòng (ADR-0074 điều 5; đặc tả §4.3: "đổi hoặc gỡ … phải nhập mã của một yếu tố
 * hiện có"). `null` = đúng (mã đã bị tiêu); ngược lại là Response trả thẳng: 400 thiếu mã, 401 `invalid_code`, 429 như PIN, 503 thiếu khoá máy chủ.
 * - CÙNG hạn mức theo tài khoản với bước hai của đăng nhập (`mfa:<staffId>`, 5 lần / 15 phút): phiên bị chiếm không thành chỗ dò mã TOTP không giới hạn.
 * - Mã 6 số = TOTP (tiêu bước — mã đã dùng ở đăng nhập không dùng lại được); `cach = "TOTP_HOAC_DU_PHONG"` nhận thêm mã dự phòng (tiêu một mã).
 * - NGOÀI VÉ (ADR-0094, T17 — mục có tên trong src/shared/lan-gui-no.ts): đặt chỗ lượt thử, tiêu bước TOTP / mã dự phòng và xoá bộ đếm ghi TRƯỚC lô chính
 *   của lệnh, và phải ghi cả khi lệnh bị từ chối hay lô chính hỏng (chống dùng lại mã, đếm lần sai) — như verifyPinThrottled.
 */
export async function kiemMaHienCo(env: Env, staffId: string, rawCode: unknown, nowMs: number, cach: "TOTP" | "TOTP_HOAC_DU_PHONG"): Promise<Response | null> {
  const code = typeof rawCode === "string" ? rawCode.trim().slice(0, 32) : "";
  if (!code) return error(400, "invalid_input", cach === "TOTP" ? "Cần nhập mã 6 số đang hiện trên ứng dụng xác thực." : "Cần nhập mã từ ứng dụng xác thực hoặc một mã dự phòng.");
  const laTotp = /^\d{6}$/.test(code);
  // Lỗi cấu hình máy chủ không được tiêu lượt thử của người dùng: kiểm khoá TRƯỚC khi đặt chỗ (như bước hai của đăng nhập).
  if (laTotp && !mfaKeyReady(env)) return MFA_UNAVAILABLE();
  const db = dbNgoaiVe(env.DB);
  const reservation = await reserveAttempts(db, [{ key: mfaKey(staffId), max: MFA_LIMIT }]);
  if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds);
  const kq = laTotp
    ? await useTotp({ ...env, DB: db }, staffId, code, nowMs)
    : ((cach === "TOTP_HOAC_DU_PHONG" && (await useRecoveryCode(db, staffId, code, new Date(nowMs).toISOString()))) ? "ok" : "invalid");
  if (kq === "unavailable") return MFA_UNAVAILABLE();
  if (kq !== "ok") {
    return error(401, "invalid_code", cach === "TOTP"
      ? "Mã không đúng hoặc đã dùng. Nhập mã mới nhất trên ứng dụng xác thực (kiểm giờ tự động trên điện thoại nếu sai nhiều lần)."
      : "Mã hiện tại không đúng hoặc đã dùng. Nhập mã mới nhất trên ứng dụng xác thực, hoặc một mã dự phòng chưa dùng.");
  }
  await clearAttempts(db, mfaKey(staffId), reservation.ids);
  return null;
}

/** ADR-0074 điều 7: câu 409 khi tài khoản giữ Quản trị / Toàn quyền / Kế toán định bật yếu tố email (nguyên văn kế hoạch Phần C Task 3). */
export const EMAIL_VAI_LON = (): Response => error(409, "email_not_allowed", "Tài khoản Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực.");

/**
 * Bước 1 tự bật / đổi yếu tố email (Phần C Task 3; route `POST /api/account/mfa/email/start` ở accounts): hạn mức gửi theo TÀI KHOẢN `mfa-mail:<id>` (3 thư / 15
 * phút, CHUNG với gửi mã ở bước đăng nhập) → MỘT lô [huỷ mã bật còn mở → chèn mã mới (băm, gắn băm địa chỉ MỚI)] → rồi mới gửi (Hiến chương 5.16). Trả
 * `{ emailMask }` hoặc Response chặn (429 câu gửi thư, 502 lời thường). KHÔNG ghi yếu tố — chỉ bước xác nhận mới lưu.
 * - NGOÀI VÉ (ADR-0094, T17 — mục có tên trong src/shared/lan-gui-no.ts): bộ đếm gửi thư và dòng mã ghi thẳng D1 gốc. Gửi hỏng (502 — máy khách GIỮ vé) thì
 *   bấm gửi lại phải gửi được thư mới; nếu dòng mã mang vé, lần gửi lại cùng thân bị báo "đã ghi" mà không có thư nào đi. Lệnh không có lô ghi mang vé.
 */
export async function guiMaBatEmail(env: Env, staffId: string, email: string, nowMs: number): Promise<{ emailMask: string } | { response: Response }> {
  const db = dbNgoaiVe(env.DB);
  const reservation = await reserveAttempts(db, [{ key: mailKey(staffId), max: MAIL_LIMIT }]);
  if (!reservation.allowed) return { response: tooMany(reservation.retryAfterSeconds, "gui_thu") };
  const sent = await phatMaEmail({ ...env, DB: db }, { staffId, email, purpose: "enroll", by: staffId, nowMs });
  return sent ? { emailMask: maskEmail(email) ?? "" } : { response: MAIL_FAILED() };
}

/**
 * Bước 2 tự bật / đổi yếu tố email: kiểm mã bật gửi tới ĐÚNG địa chỉ `email`, phát SAU yếu tố sống mới nhất (`phatTu`), có hạn mức nhập CHUNG `mfa:<id>` với
 * bước hai đăng nhập (5 lần / 15 phút) — ngoài giới hạn 5 lần mỗi mã. `null` = đúng (mã đã tiêu, bộ đếm đã xoá); ngược lại là Response trả thẳng (401 / 429).
 * - NGOÀI VÉ (ADR-0094, T17): đặt chỗ lượt thử, tiêu / đếm sai mã và xoá bộ đếm ghi TRƯỚC lô chính, và phải ghi cả khi lệnh bị từ chối hay lô chính hỏng (đếm
 *   lần sai, chống dùng lại mã) — như kiemMaHienCo.
 */
export async function kiemMaBatEmail(env: Env, staffId: string, email: string, code: string, nowMs: number, phatTu: string | null): Promise<Response | null> {
  const db = dbNgoaiVe(env.DB);
  const reservation = await reserveAttempts(db, [{ key: mfaKey(staffId), max: MFA_LIMIT }]);
  if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds);
  const ok = await useEmailCode(db, { staffId, email, purpose: "enroll", code, nowIso: new Date(nowMs).toISOString(), phatTu });
  if (!ok) return error(401, "invalid_code", "Mã không đúng hoặc đã hết hạn. Bấm “Gửi lại mã” để nhận mã mới.");
  await clearAttempts(db, mfaKey(staffId), reservation.ids);
  return null;
}

export type PinAttemptResult =
  | { ok: true; profile: StaffProfile }
  | { ok: false; response: Response };

/**
 * Kiểm SĐT+PIN có chống dò: đặt chỗ lần thử theo SĐT và theo IP trước khi kiểm; quá giới hạn trả 429.
 * Dùng cho đăng nhập và cả đổi PIN (cùng bộ đếm, để đổi PIN không thành đường vòng dò PIN hiện tại).
 */
export async function verifyPinThrottled(request: Request, env: Env, rawPhone: string, pin: string): Promise<PinAttemptResult> {
  const phone = normalizePhone(rawPhone);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const keys = [{ key: ipKey(ip), max: IP_LIMIT }, ...(phone ? [{ key: phoneKey(phone), max: PHONE_LIMIT }] : [])];
  // NGOÀI VÉ (ADR-0094, T17 — mục có tên trong src/shared/lan-gui-no.ts): sổ đếm lần thử ghi TRƯỚC lô chính của lệnh gọi (đổi PIN, bật Face ID) và phải
  // ghi cả khi lệnh bị từ chối — không được mang vé chống ghi trùng của lệnh đó. Đăng nhập (route công khai) không có vé: `dbNgoaiVe` trả nguyên D1.
  const db = dbNgoaiVe(env.DB);
  const reservation = await reserveAttempts(db, keys);
  if (!reservation.allowed) return { ok: false, response: tooMany(reservation.retryAfterSeconds) };
  const profile = await authenticate(db, rawPhone, pin);
  if (!profile) return { ok: false, response: error(401, "invalid_credentials", "Số điện thoại hoặc mã PIN không đúng.") };
  await clearAttempts(db, phone ? phoneKey(phone) : null, reservation.ids);
  return { ok: true, profile };
}

/**
 * Phía route của cổng Turnstile ở đăng nhập: `null` = cho qua, hoặc Response chặn (403 `turnstile_failed` / 503 `turnstile_unavailable`). Chạy TRƯỚC
 * `verifyPinThrottled` — kẻ tấn công không có token thì không tiêu hao lượt thử PIN của SĐT nạn nhân (và không làm SĐT đó bị khoá).
 * Quyết định thuần là `turnstileGate` và các dòng nhật ký là `turnstileLog` (cả hai ở ./turnstile.ts, có test; log KHÔNG bao giờ chứa secret/token/IP — kể cả
 * 403 mỗi lần bị từ chối, để vận hành thấy 403 hàng loạt); hàm này chỉ đổi kết quả thành Response và in nhật ký.
 * (Tên khác `turnstileGate` có chủ ý: đây là chỗ DUY NHẤT dựng Response; `turnstileGate` thuần, không biết HTTP.)
 */
async function turnstileBlockResponse(request: Request, env: Env, token: unknown): Promise<Response | null> {
  const gate = await turnstileGate(env, token, request.headers.get("cf-connecting-ip"));
  for (const entry of turnstileLog(gate)) {
    const line = JSON.stringify(entry);
    if (entry.level === "error") console.error(line);
    else console.warn(line);
  }
  return gate.pass ? null : error(gate.status, gate.code, gate.message);
}

/**
 * Cổng chung của hai route bật lại lớp hai ở bước đăng nhập (ADR-0074 điều 5; đặc tả §4.5; kế hoạch Task 6). Thứ tự: cookie chờ purpose "enroll" (khoá ký
 * riêng, 5 phút) → tài khoản còn hoạt động + lưới credentials_changed_at → bảo trì (route công khai tự gọi, như Face ID) → đã có yếu tố (409 — bật rồi) →
 * cửa sổ `mfa_enroll_until` còn mở (đóng → 403 như đăng nhập bị chặn). Trả hồ sơ hoặc Response chặn.
 */
async function congBatLai(request: Request, env: Env, nowMs: number): Promise<{ profile: StaffProfile } | { response: Response }> {
  const raw = getCookie(request, PENDING_COOKIE);
  const p = raw ? await verifyPendingToken(env.SESSION_SECRET, raw, nowMs) : null;
  if (!p || p.purpose !== "enroll") return { response: MFA_EXPIRED() };
  const profile = await getActiveStaff(env.DB, p.staffId, p.issuedAt);
  if (!profile) return { response: MFA_EXPIRED() };
  const blocked = await maintenanceBlock(env.DB, () => profile.permissions);
  if (blocked) return { response: blocked };
  const [factors, { enrollUntil }] = await Promise.all([factorListLive(env.DB, profile.id), mfaDeadlinesOf(env.DB, profile.id)]);
  if (factors.length > 0) return { response: ENROLL_DONE() };
  if (enrollUntil === null || enrollUntil <= new Date(nowMs).toISOString()) return { response: MFA_SETUP_REQUIRED() };
  return { profile };
}

export const authModule: AppModule = {
  name: "auth",
  routes: [
    // Công khai: trang đăng nhập hỏi trước khi dựng widget. Khoá site không nhúng cứng vào HTML (local dùng khoá thử của Cloudflare).
    // `maintenance`: trang đăng nhập hiện banner + đếm ngược khi đang bảo trì. Chỉ {on, endsAt} — KHÔNG lộ ai được phép.
    route("GET", "/api/auth/config", "public", async ({ env }) => {
      // ADR-0024 6.2: tên + MST của hồ sơ công ty chủ cho chân trang đăng nhập (thêm hai trường, không thêm yêu cầu). Đọc lỗi KHÔNG được làm hỏng cấu hình
      // đăng nhập (Turnstile, bảo trì, Face ID): ghi một dòng log rồi trả null — trang giữ chữ tĩnh.
      const [maintenance, company] = await Promise.all([
        getMaintenanceState(env.DB),
        ownerCompany(env.DB).catch((e: unknown) => {
          console.error(JSON.stringify({ level: "error", event: "company_config_failed", message: e instanceof Error ? e.message : String(e) }));
          return null;
        }),
      ]);
      return json({
        turnstileSiteKey: turnstileSiteKey(env), maintenance: toStatus(maintenance), passkey: passkeyRelyingParty(env) !== null, version: APP_VERSION,
        companyName: company?.displayName ?? null, companyTaxCode: company?.taxCode ?? null,
      } satisfies AuthConfigResponse);
    }),

    route("POST", "/api/auth/login", "public", async ({ request, env, dongBangTin }) => {
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? body.phone : "";
      const pin = body?.pin;
      if (!phone || !isValidPin(pin)) return error(400, "invalid_input", "Cần số điện thoại và mã PIN 6 số.");
      const blocked = await turnstileBlockResponse(request, env, body?.turnstileToken);
      if (blocked) return blocked;
      // Chế độ bảo trì (ADR-0071 điều 3b): khi BẬT, tra tài khoản theo SĐT; không phải Toàn quyền ĐANG HOẠT ĐỘNG — kể cả SĐT không có tài khoản, SĐT hỏng, tài khoản
      // đã ngưng — nhận 503 `maintenance`, CÙNG một thân. Đặt sau Turnstile và TRƯỚC PIN: không tiêu hao lượt thử PIN. Lúc TẮT không tra gì thêm (hàm lười).
      const inMaintenance = await maintenanceBlock(env.DB, async () => {
        const norm = normalizePhone(phone);
        const acct = norm ? await findStaffByPhone(env.DB, norm) : null;
        return acct?.active ? acct.permissions : null;
      });
      if (inMaintenance) return inMaintenance;
      const result = await verifyPinThrottled(request, env, phone, pin);
      if (!result.ok) return result.response;
      // ---- Cổng lớp hai (ADR-0074 điều 2–3; đặc tả §4.1). PIN đúng CHƯA đủ: tài khoản đã bật lớp hai mà máy chưa được tin → chưa cấp phiên, trả cookie chờ
      // (khoá ký riêng, 5 phút, chỉ mở /api/auth/mfa/*). Nội bộ chưa bật và hết ân hạn (kể cả hạn NULL) → 403 (đóng cửa an toàn). Luật thuần: loginStep.
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const profile = result.profile;
      const trustedTok = getCookie(request, TRUSTED_COOKIE);
      const [factors, trusted, { graceUntil, enrollUntil }] = await Promise.all([
        factorListLive(env.DB, profile.id),
        trustedTok ? sha256Hex(trustedTok).then((h) => trustedFind(env.DB, h, profile.id, nowIso)) : Promise.resolve(null),
        mfaDeadlinesOf(env.DB, profile.id),
      ]);
      // Lưới credentials_changed_at: máy tin tạo TRƯỚC lần đổi PIN / đặt lại PIN / gỡ Face ID gần nhất hết tác dụng (đặc tả §6 quy tắc 3).
      const trustedOk = trusted !== null && (await getActiveStaff(env.DB, profile.id, Date.parse(trusted.created_at))) !== null;
      const step = loginStep({ perms: profile.permissions, hasFactor: factors.length > 0, trusted: trustedOk, graceUntil, enrollUntil, nowIso });
      if (step === "blocked_no_factor") return MFA_SETUP_REQUIRED();
      if (step === "enroll") {
        // Cửa sổ 24 giờ sau khi Quản trị/Toàn quyền tắt lớp hai: chỉ được bật lại (/api/auth/mfa/enroll/*), chưa cấp phiên. Cookie chờ purpose "enroll" không qua được verify.
        const pending = await createPendingToken(env.SESSION_SECRET, profile.id, "enroll", now);
        return json({ next: "mfa_enroll" } satisfies LoginMfaStepResponse, 200, { "set-cookie": pendingCookie(pending, isSecure(request)) });
      }
      if (step === "mfa") {
        const pending = await createPendingToken(env.SESSION_SECRET, profile.id, "verify", now);
        // Chỉ liệt kê cách xác minh quyền hiện tại CHO PHÉP (ADR-0074 điều 7 — Phần C Task 3): tài khoản Quản trị / Toàn quyền / Kế toán có dòng EMAIL lệch không
        // thấy lựa chọn email (gửi / nhập mã email của họ đã bị chặn ở máy chủ). Ai phải qua bước hai (loginStep) KHÔNG đổi.
        const duocDung = allowedFactors(profile.permissions);
        const hienThi = factors.filter((f) => duocDung.includes(f.kind));
        const buoc: LoginMfaStepResponse = {
          next: "mfa", factors: [...hienThi.map((f) => f.kind), "RECOVERY"], emailMask: maskEmail(hienThi.find((f) => f.kind === "EMAIL")?.email ?? null),
        };
        return json(buoc, 200, { "set-cookie": pendingCookie(pending, isSecure(request)) });
      }
      // step === "session". Máy tin chỉ tính là "đã dùng" khi tài khoản có yếu tố (không yếu tố thì lớp hai không áp — phiên PIN thường).
      const dungMayTin = trustedOk && factors.length > 0;
      if (dungMayTin) await trustedTouchStatement(env.DB, trusted!.id, nowIso).run();
      const issued = await issueLoginSession(request, env, profile, dungMayTin ? "PIN_TRUSTED" : "PIN", { trustedDeviceId: dungMayTin ? trusted!.id : null, now });
      if ("conflict" in issued) return issued.conflict;
      // ADR-0075 điều 6: máy cũ bị thay tắt hẳn — đóng Bảng tin của đúng phiên bị thay; tắt thông báo của mọi máy trừ máy mang phiên mới. Gọi cả khi không
      // phiên nào bị thay (đăng ký thông báo cũ có session_id NULL, hoặc của phiên đã đăng xuất/hết hạn, vẫn phải tắt — Review Focus 3).
      if (issued.single) dongBangTin({ staffId: profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId });
      await ghiDangNhap(env, profile.id);
      return json({ staff: profile } satisfies MeResponse, 200, { "set-cookie": issued.cookie });
    }),

    // ---- Bước hai (ADR-0074 điều 2–3; đặc tả §4.1 bước 5, §6). Công khai: KHÔNG đi qua cổng bảo trì của router nên tự gọi maintenanceBlock (như Face ID).
    // Thứ tự: cookie chờ (purpose verify, lưới credentials_changed_at) → bảo trì → kiểm thân → khoá máy chủ → hạn mức theo TÀI KHOẢN → kiểm mã → cấp phiên.
    // `method`: "TOTP" (ứng dụng xác thực), "EMAIL" (mã gửi qua email — Phần C; sai thì đếm thêm lần cho mã đó), "RECOVERY" (mã dự phòng).
    route("POST", "/api/auth/mfa/verify", "public", async ({ request, env, dongBangTin }) => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const raw = getCookie(request, PENDING_COOKIE);
      const p = raw ? await verifyPendingToken(env.SESSION_SECRET, raw, now) : null;
      if (!p || p.purpose !== "verify") return MFA_EXPIRED();
      const profile = await getActiveStaff(env.DB, p.staffId, p.issuedAt);
      if (!profile) return MFA_EXPIRED();
      const blocked = await maintenanceBlock(env.DB, () => profile.permissions);
      if (blocked) return blocked;
      const body = await readJson(request);
      const method = body?.method;
      if (method !== "TOTP" && method !== "EMAIL" && method !== "RECOVERY") {
        return error(400, "invalid_input", "Cần chọn cách xác minh (mã ứng dụng xác thực, mã gửi qua email hoặc mã dự phòng) và nhập mã.");
      }
      const code = typeof body?.code === "string" ? body.code.slice(0, 32) : "";
      // Lỗi cấu hình máy chủ không được tiêu lượt thử của người dùng: kiểm khoá TRƯỚC khi đặt chỗ lượt thử.
      if (method === "TOTP" && !mfaKeyReady(env)) return MFA_UNAVAILABLE();
      // CÙNG hạn mức theo tài khoản `mfa:<id>` cho cả ba cách (Phần C: mã email không thành đường dò riêng). Mã email còn giới hạn 5 lần mỗi mã (cột attempts).
      const reservation = await reserveAttempts(env.DB, [{ key: mfaKey(profile.id), max: MFA_LIMIT }]);
      if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds);
      const kq = method === "RECOVERY"
        ? ((await useRecoveryCode(env.DB, profile.id, code, nowIso)) ? "ok" : "invalid")
        : method === "EMAIL"
          ? await useEmailLogin(env.DB, profile, code, nowIso)
          : await useTotp(env, profile.id, code, now);
      if (kq === "unavailable") return MFA_UNAVAILABLE();
      if (kq !== "ok") return error(401, "invalid_code", method === "EMAIL"
        ? "Mã không đúng hoặc đã hết hạn. Bấm “Gửi mã qua email” để nhận mã mới."
        : "Mã không đúng hoặc đã dùng. Kiểm giờ tự động trên điện thoại nếu sai nhiều lần.");
      await clearAttempts(env.DB, mfaKey(profile.id), reservation.ids);
      const cookies: string[] = [clearedPendingCookie(isSecure(request))];
      let trustedId: string | null = null;
      if (body?.trustDevice === true) {
        const tok = newTrustedToken();
        trustedId = crypto.randomUUID();
        await trustedInsertStatement(env.DB, {
          id: trustedId, staffId: profile.id, tokenHash: await sha256Hex(tok), label: sessionDeviceLabel(request.headers.get("user-agent")),
          at: nowIso, expiresAt: new Date(now + TRUSTED_TTL_SECONDS * 1000).toISOString(),
        }).run();
        cookies.push(trustedCookie(tok, isSecure(request)));
      }
      const issued = await issueLoginSession(request, env, profile, "PIN_MFA", { trustedDeviceId: trustedId, now });
      if ("conflict" in issued) return issued.conflict;
      if (issued.single) dongBangTin({ staffId: profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId }); // ADR-0075 điều 6 (như đăng nhập PIN)
      await ghiDangNhap(env, profile.id);
      const out: MfaVerifyResponse = { staff: profile };
      if (method === "RECOVERY") out.recoveryLeft = await recoveryCountLeft(env.DB, profile.id);
      const res = json(out, 200, { "set-cookie": issued.cookie });
      for (const c of cookies) res.headers.append("set-cookie", c);
      return res;
    }),

    // ---- Gửi mã qua email ở bước hai (ADR-0074 điều 4; đặc tả §4.1 bước 4, §6 quy tắc 2, 6, 8; kế hoạch Phần C Task 2). Công khai: tự gọi maintenanceBlock.
    // Thứ tự: cookie chờ (purpose verify, lưới credentials_changed_at) → bảo trì → có yếu tố EMAIL sống mà quyền cho phép (409 — TRƯỚC hạn mức, không tiêu lượt)
    // → hạn mức gửi theo TÀI KHOẢN `mfa-mail:<id>`, 3 thư / 15 phút (đếm mọi lần gửi, không bao giờ xoá) → MỘT lô [huỷ mã mở cũ → chèn mã mới (băm)] → rồi
    // mới gửi (Hiến chương 5.16). Gửi hỏng → 502 lời thường; dòng mã còn, hết hạn tự nhiên. Không vé (KHONG_VE). Không nhật ký: auth không import audit, và
    // mã / địa chỉ không bao giờ vào nhật ký; dấu vết là dòng aut_mfa_email_code (created_by).
    route("POST", "/api/auth/mfa/email", "public", async ({ request, env }) => {
      const now = Date.now();
      const raw = getCookie(request, PENDING_COOKIE);
      const p = raw ? await verifyPendingToken(env.SESSION_SECRET, raw, now) : null;
      if (!p || p.purpose !== "verify") return MFA_EXPIRED();
      const profile = await getActiveStaff(env.DB, p.staffId, p.issuedAt);
      if (!profile) return MFA_EXPIRED();
      const blocked = await maintenanceBlock(env.DB, () => profile.permissions);
      if (blocked) return blocked;
      const email = await emailCuaYeuTo(env.DB, profile);
      if (!email) return NO_EMAIL_FACTOR();
      const reservation = await reserveAttempts(env.DB, [{ key: mailKey(profile.id), max: MAIL_LIMIT }]);
      if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds, "gui_thu");
      const sent = await phatMaEmail(env, { staffId: profile.id, email, purpose: "login", by: profile.id, nowMs: now });
      if (!sent) return MAIL_FAILED();
      return json({ sent: true, emailMask: maskEmail(email) } satisfies MfaEmailSendResponse);
    }),

    // ---- Bật lại lớp hai NGAY ở bước đăng nhập — cửa sổ 24 giờ sau khi Quản trị/Toàn quyền tắt (ADR-0074 điều 5; đặc tả §4.5; kế hoạch Task 6). Công khai: cổng
    // là cookie chờ purpose "enroll" (congBatLai). Giống /api/account/mfa/totp/start|confirm của Task 5 nhưng xác thực bằng cookie chờ thay cho phiên. KHÔNG
    // có dòng nhật ký mfa_enabled (auth không import audit — ALLOWED_EDGES); dấu vết: dòng yếu tố (created_by) + nhật ký mfa_reset của người đã tắt.
    route("POST", "/api/auth/mfa/enroll/start", "public", async ({ request, env }) => {
      const now = Date.now();
      const g = await congBatLai(request, env, now);
      if ("response" in g) return g.response;
      const r = await moiKhoaTotp(env, g.profile.id, g.profile.fullName.trim() || "Tài khoản", now); // nhãn là TÊN, không SĐT
      return r ? json(r satisfies MfaTotpStartResponse) : MFA_UNAVAILABLE();
    }),

    // Mã của khoá mới đúng (hạn mức theo TÀI KHOẢN `mfa:<id>`, như bước hai) → MỘT lô: chèn TOTP (tiêu bước vừa khớp) → 10 mã dự phòng mới → đóng cửa sổ bật
    // lại → rồi mới cấp phiên PIN_MFA. Hai lần xác nhận chạy đua: chỉ mục "một yếu tố sống mỗi loại" cho lần thua 409.
    route("POST", "/api/auth/mfa/enroll/confirm", "public", async ({ request, env, dongBangTin }) => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const g = await congBatLai(request, env, now);
      if ("response" in g) return g.response;
      const profile = g.profile;
      const body = await readJson(request);
      const code = typeof body?.code === "string" ? body.code.trim().slice(0, 32) : "";
      // Lỗi cấu hình máy chủ không được tiêu lượt thử của người dùng: kiểm khoá TRƯỚC khi đặt chỗ lượt thử.
      if (!mfaKeyReady(env)) return MFA_UNAVAILABLE();
      const reservation = await reserveAttempts(env.DB, [{ key: mfaKey(profile.id), max: MFA_LIMIT }]);
      if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds);
      const moi = await khopKhoaMoi(env, profile.id, body?.setupToken, code, now);
      if (moi.kq === "unavailable") return MFA_UNAVAILABLE();
      if (moi.kq === "expired") return error(400, "setup_expired", "Phiên bật đã hết hạn (10 phút). Bấm “Bật ứng dụng xác thực” lại để lấy khoá mới.");
      if (moi.kq !== "ok") return error(401, "invalid_code", "Mã không đúng. Nhập mã 6 số mới nhất trên ứng dụng xác thực (kiểm giờ tự động trên điện thoại nếu sai nhiều lần).");
      await clearAttempts(env.DB, mfaKey(profile.id), reservation.ids);
      const ma = await boMaDuPhongMoi(env.DB, profile.id, nowIso);
      try {
        await env.DB.batch([
          ...batTotpStatements(env.DB, { staffId: profile.id, thayId: null, id: crypto.randomUUID(), secretEnc: moi.secretEnc, step: moi.step, at: nowIso }),
          ...ma.statements,
          mfaEnrollWindowStatement(env.DB, profile.id, null),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: aut_mfa_(factor|recovery_code)\./.test(e.message)) return ENROLL_DONE();
        throw e;
      }
      const issued = await issueLoginSession(request, env, profile, "PIN_MFA", { now });
      if ("conflict" in issued) return issued.conflict;
      if (issued.single) dongBangTin({ staffId: profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId }); // ADR-0075 điều 6 (như đăng nhập PIN)
      await ghiDangNhap(env, profile.id);
      const res = json({ staff: profile, recoveryCodes: ma.codes } satisfies MfaEnrollConfirmResponse, 200, { "set-cookie": issued.cookie });
      res.headers.append("set-cookie", clearedPendingCookie(isSecure(request)));
      return res;
    }),

    // ---- Đăng nhập bằng Face ID (passkey, ADR-0016). Công khai: KHÔNG đi qua cổng bảo trì của router nên tự gọi maintenanceBlock. Không Turnstile, không bộ chống dò PIN (không có PIN để dò) — chỉ hạn mức xin thách thức theo IP.
    route("POST", "/api/auth/passkey/options", "public", async ({ request, env }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const limited = await limitChallenge(request, env);
      if (limited) return limited;
      const { challenge, cookie } = await issuePasskeyChallenge(request, env, "login", null);
      return json(
        { publicKey: { challenge, rpId: rp.rpId, timeout: 120_000, userVerification: "required", allowCredentials: [] } } satisfies PasskeyRequestOptionsResponse,
        200,
        { "set-cookie": cookie },
      );
    }),

    route("POST", "/api/auth/passkey/login", "public", async ({ request, env, dongBangTin }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const credential = (await readJson(request))?.credential;
      const ch = await readPasskeyChallenge(request, env, "login", null);
      if (!ch) return PASSKEY_ERRORS.expired();
      // Thứ tự đặc tả §2.6: kiểm chữ ký/bộ đếm (trong checkPasskeyAssertion) → cổng bảo trì theo quyền của chủ khoá (gate, TRƯỚC dùng một lần) → dùng một lần → recordLogin → td_session.
      // Phiên chỉ được chèn sau khi markPasskeyUsed (trong checkPasskeyAssertion) thành công: khoá bị gỡ trước lúc đánh dấu dùng thì lần dùng thua.
      // Mốc cấp phiên (`opts.now` của issueLoginSession = created_at của dòng phiên và issuedAt của token) lấy TRƯỚC khi kiểm: lần gỡ khoá chạy song song
      // làm credentials_changed_at > mốc này nên lưới getActiveStaff / sessionStatus vẫn thu hồi — phiên không thể "mới hơn" lần gỡ khoá đã sinh ra nó.
      // Còn lại đúng một ca biên: lần gỡ rơi vào CÙNG mili-giây với mốc này (phép so là `>`), cửa sổ 1 ms.
      const phatHanh = Date.now();
      const checked = await checkPasskeyAssertion(env, rp, ch, credential, null, async (pk) => {
        const owner = await getActiveStaff(env.DB, pk.staff_id);
        if (!owner) return PASSKEY_ERRORS.unknown();
        return maintenanceBlock(env.DB, () => owner.permissions); // ADR-0071 điều 3a: theo quyền của chủ khoá
      });
      if (!checked.ok) return checked.response;
      // Gate ở trên đã xác nhận tài khoản đang hoạt động; đọc lại để có kiểu StaffProfile cho phản hồi (tránh giả định trạng thái không đổi giữa hai lần đọc).
      const profile = await getActiveStaff(env.DB, checked.passkey.staff_id);
      if (!profile) return PASSKEY_ERRORS.unknown();
      // ADR-0074 / đặc tả §4.2: Face ID KHÔNG qua bước hai (đã là hai yếu tố: máy + sinh trắc học).
      const issued = await issueLoginSession(request, env, profile, "PASSKEY", { now: phatHanh });
      if ("conflict" in issued) return issued.conflict;
      if (issued.single) dongBangTin({ staffId: profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId }); // ADR-0075 điều 6 (như đăng nhập PIN)
      await ghiDangNhap(env, profile.id);
      const res = json({ staff: profile } satisfies MeResponse, 200, { "set-cookie": issued.cookie });
      res.headers.append("set-cookie", clearChallengeCookie(request));
      return res;
    }),

    // `maintenance` ở đây chỉ tới được Toàn quyền khi đang bảo trì (router chặn người khác trước — ADR-0071) — giao diện dùng để hiện dải "Đang ở chế độ bảo trì".
    // `benDatCuaToi` (sổ đại lý đợt 1, Task 11 — Ruling 21): bên đặt máy chủ SẼ ép cho tài khoản này (chỉ Đối tác có hồ sơ được hưởng), để form lập đơn hiện dòng chỉ đọc mà không tự suy luật. Hai việc đọc chạy song song.
    route("GET", "/api/auth/me", "staff", async ({ env, staff, baoTri, benDatCuaToi }) => {
      // `benDatCuaToi` chỉ để HIỂN THỊ (máy chủ vẫn ép bên đặt lúc lập đơn) mà /me đi qua MỌI trang: câu đọc hỏng (kể cả ném ngay trước khi có lời hứa) thì trả null và log một dòng
      // (chỉ tên sự kiện + câu lỗi — không SĐT, không tên) thay vì kéo cả /me thành 500. Chỉ bọc đúng câu này; việc đọc trạng thái bảo trì giữ nguyên (hỏng thì vẫn là lỗi thật).
      const docBenDat = async (): Promise<Awaited<ReturnType<typeof benDatCuaToi>>> => {
        try {
          return await benDatCuaToi();
        } catch (e) {
          console.error(JSON.stringify({ level: "error", event: "ben_dat_cua_toi_failed", message: e instanceof Error ? e.message : String(e) }));
          return null;
        }
      };
      const [trangThaiBaoTri, benDat] = await Promise.all([(baoTri as MaintenanceState | undefined) ?? getMaintenanceState(env.DB), docBenDat()]);
      return json({ staff, maintenance: toStatus(trangThaiBaoTri), benDatCuaToi: benDat } satisfies MeResponse);
    }),

    // Đăng xuất kết thúc dòng phiên (ADR-0075): cookie bị xoá VÀ cookie đã chép đi nơi khác cũng hết dùng được. Token rác/hết hạn → chỉ xoá cookie.
    route("POST", "/api/auth/logout", "public", async ({ request, env }) => {
      const token = getCookie(request, SESSION_COOKIE);
      const t = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
      // Ghi CSDL hỏng vẫn xoá cookie và trả 200 (người dùng bấm Đăng xuất phải ra khỏi máy này): log một dòng CHỈ có câu lỗi — không token, mã phiên, IP, UA.
      if (t) {
        try {
          await endSessionStatement(env.DB, t.sessionId, "dang_xuat", new Date().toISOString(), t.staffId).run();
        } catch (e) {
          console.error(JSON.stringify({ level: "error", event: "logout_end_failed", message: e instanceof Error ? e.message : String(e) }));
        }
      }
      return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(isSecure(request)) });
    }),

    // Trang đăng nhập hỏi vì sao máy này vừa bị đăng xuất. Chỉ trả khi chữ ký token đúng (cookie của chính máy này; hết hạn vẫn được) — token rác không lộ gì.
    route("POST", "/api/auth/session-ended", "public", async ({ request, env }) => {
      const token = getCookie(request, SESSION_COOKIE);
      const t = token ? await verifySessionToken(env.SESSION_SECRET, token, Date.now(), { ignoreExpiry: true }) : null;
      const row = t ? await getSession(env.DB, t.sessionId) : null;
      const reason = t && row && row.staff_id === t.staffId && row.end_reason ? (END_REASON_LABEL[row.end_reason as EndReason] ?? null) : null;
      return json({ reason, endedAt: reason && row ? row.ended_at : null });
    }),
  ],
};
