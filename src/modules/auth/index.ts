// Module auth — phiên đăng nhập (cookie ký HMAC) + chống dò PIN + Cloudflare Turnstile ở đăng nhập (./turnstile.ts). Route: /api/auth/*.
// Kiểm quyền từng route KHÔNG nằm ở đây: router (src/shared/router.ts) dùng `currentStaff` do gốc lắp ráp truyền vào.
import { getMaintenanceState, maintenanceBlock, toStatus } from "../maintenance";
import { ownerCompany } from "../parties";
import { accountRoleCodesOf, authenticate, findStaffByPhone, getActiveStaff, isValidPin, normalizePhone, recordLogin, type StaffProfile } from "../staff";
import { APP_VERSION } from "../../shared/app-info";
import type { AuthConfigResponse, MeResponse, PasskeyRequestOptionsResponse, SessionPolicyChange } from "../../shared/contracts";
import { error, getCookie, json, readJson } from "../../shared/http";
import { dbNgoaiVe } from "../../shared/lan-gui-boc";
import { route, type AppModule } from "../../shared/router";
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
export async function currentStaff(request: Request, env: Env): Promise<{ staff: StaffProfile; sessionId: string } | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const t = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  if (!t) return null;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const [row, staff] = await Promise.all([findLiveSession(env.DB, t.sessionId, t.staffId, nowIso), getActiveStaff(env.DB, t.staffId, t.issuedAt)]);
  if (!row || !staff) return null;
  if (Date.parse(row.last_seen_at) < now - SESSION_TOUCH_MS) {
    await touchSessionStatement(env.DB, row.id, nowIso, new Date(now - SESSION_TOUCH_MS).toISOString()).run().catch((e: unknown) =>
      console.error(JSON.stringify({ level: "error", event: "session_touch_failed", message: e instanceof Error ? e.message : String(e) })));
  }
  return { staff, sessionId: t.sessionId };
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
/** Kết thúc mọi phiên của tài khoản CHỈ KHI nó đã ngưng lúc câu chạy (đặt CUỐI lô ngưng tài khoản, sau câu chốt). Chưa chạy. */
export const endAllSessionsIfSuspendedStatement = (db: D1Database, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  endAllIfSuspendedRow(db, staffId, "ngung" satisfies EndReason, at, by);
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
  if (!reservation.allowed) {
    const seconds = reservation.retryAfterSeconds;
    const res = json(
      { error: { code: "too_many_attempts", message: `Nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(seconds / 60)} phút hoặc nhờ người phụ trách hệ thống mở khoá.`, retryAfterSeconds: seconds } },
      429,
      { "retry-after": String(seconds) },
    );
    return { ok: false, response: res };
  }
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
      // Ghi nhận đăng nhập thành công cho cột "Đăng nhập gần nhất". Lỗi ghi không được làm hỏng đăng nhập (chỉ là thống kê): ghi log rồi cho qua.
      await recordLogin(env.DB, result.profile.id, new Date().toISOString()).catch((e: unknown) =>
        console.error(JSON.stringify({ level: "error", event: "record_login_failed", message: e instanceof Error ? e.message : String(e) })),
      );
      const issued = await issueLoginSession(request, env, result.profile, "PIN");
      if ("conflict" in issued) return issued.conflict;
      // ADR-0075 điều 6: máy cũ bị thay tắt hẳn — đóng Bảng tin của đúng phiên bị thay; tắt thông báo của mọi máy trừ máy mang phiên mới. Gọi cả khi không
      // phiên nào bị thay (đăng ký thông báo cũ có session_id NULL, hoặc của phiên đã đăng xuất/hết hạn, vẫn phải tắt — Review Focus 3).
      if (issued.single) dongBangTin({ staffId: result.profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId });
      return json({ staff: result.profile } satisfies MeResponse, 200, { "set-cookie": issued.cookie });
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
      await recordLogin(env.DB, profile.id, new Date().toISOString()).catch((e: unknown) =>
        console.error(JSON.stringify({ level: "error", event: "record_login_failed", message: e instanceof Error ? e.message : String(e) })),
      );
      const issued = await issueLoginSession(request, env, profile, "PASSKEY", { now: phatHanh });
      if ("conflict" in issued) return issued.conflict;
      if (issued.single) dongBangTin({ staffId: profile.id, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId }); // ADR-0075 điều 6 (như đăng nhập PIN)
      const res = json({ staff: profile } satisfies MeResponse, 200, { "set-cookie": issued.cookie });
      res.headers.append("set-cookie", clearChallengeCookie(request));
      return res;
    }),

    // `maintenance` ở đây chỉ tới được Toàn quyền khi đang bảo trì (router chặn người khác trước — ADR-0071) — giao diện dùng để hiện dải "Đang ở chế độ bảo trì".
    route("GET", "/api/auth/me", "staff", async ({ env, staff }) => json({ staff, maintenance: toStatus(await getMaintenanceState(env.DB)) } satisfies MeResponse)),

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
