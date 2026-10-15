// Tự phục vụ bảo mật hai lớp (ADR-0074 điều 5; đặc tả §4.3; kế hoạch Phần B Task 5) — phần của module auth: khoá TOTP mới + phiếu bật, kiểm mã của khoá
// mới, câu lệnh CHƯA chạy cho lô của route `/api/account/mfa/*`. Route nằm ở module accounts vì lô phải kèm dòng nhật ký, mà auth không import audit
// (ALLOWED_EDGES — như sổ phiên ADR-0075). Hàm đọc ở đây KHÔNG BAO GIỜ trả khoá đã mã hoá (secret_enc) hay băm (mã dự phòng, token máy tin).
import type { MfaTotpStartResponse } from "../../shared/contracts";
import { decryptSecret, encryptSecret, newRecoveryCodes, normalizeRecoveryCode, recoveryHash } from "./mfa-crypto";
import { mfaKeyReady } from "./mfa-dang-nhap";
import {
  factorEndKeepOneStatement, factorEndStatement, factorInsertStatement, factorListLive, recoveryInsertStatement, recoveryRevokeAllStatement, totpConsumeStatement,
  trustedList, trustedRevokeAllStatement, trustedRevokeStatement, type MfaKind,
} from "./mfa-repo";
import { createSetupToken, verifySetupToken } from "./mfa-rules";
import { base32Encode, matchTotp, otpauthUri } from "./totp";

/** Yếu tố còn hiệu lực — chỉ id, loại, lúc bật (KHÔNG khoá, KHÔNG email). */
export interface YeuToSong { id: string; kind: MfaKind; createdAt: string }
export async function yeuToSong(db: D1Database, staffId: string): Promise<YeuToSong[]> {
  return (await factorListLive(db, staffId)).map((f) => ({ id: f.id, kind: f.kind, createdAt: f.valid_from_at }));
}

/** Máy được tin còn hiệu lực (chưa thu hồi, chưa hết hạn) — không băm token. */
export interface MayTin { id: string; label: string; createdAt: string; lastUsedAt: string }
export async function mayTinSong(db: D1Database, staffId: string, nowIso: string): Promise<MayTin[]> {
  return (await trustedList(db, staffId)).filter((d) => d.expires_at > nowIso).map((d) => ({ id: d.id, label: d.label, createdAt: d.created_at, lastUsedAt: d.last_used_at }));
}

/**
 * Bước 1 bật TOTP: khoá 20 byte ngẫu nhiên — trả khoá base32 + chuỗi `otpauth://` (nhãn là TÊN, không SĐT) MỘT lần, kèm phiếu bật mang khoá ĐÃ mã hoá.
 * Không ghi CSDL. Thiếu/sai MFA_ENCRYPTION_KEY → null (đã ghi log `mfa_key_missing`, không in khoá).
 */
export async function moiKhoaTotp(env: Env, staffId: string, ten: string, nowMs: number): Promise<MfaTotpStartResponse | null> {
  if (!mfaKeyReady(env)) return null;
  const raw = crypto.getRandomValues(new Uint8Array(20));
  const secret = base32Encode(raw);
  const secretEnc = await encryptSecret(env.MFA_ENCRYPTION_KEY!, raw);
  return { setupToken: await createSetupToken(env.SESSION_SECRET, staffId, secretEnc, nowMs), secret, otpauth: otpauthUri(secret, ten) };
}

/**
 * Bước 2 bật TOTP: phiếu hợp lệ, CỦA ĐÚNG người đang đăng nhập, còn hạn 10 phút → giải mã khoá → mã khớp bước 0/±1. Không ghi CSDL (khoá mới chưa lưu: dò
 * mã của khoá mới vô ích — người gọi đã biết khoá — nên không đặt hạn mức ở bước này).
 */
export async function khopKhoaMoi(
  env: Env, staffId: string, setupToken: unknown, code: string, nowMs: number,
): Promise<{ kq: "ok"; secretEnc: string; step: number } | { kq: "expired" | "invalid" | "unavailable" }> {
  if (!mfaKeyReady(env)) return { kq: "unavailable" };
  const t = typeof setupToken === "string" ? await verifySetupToken(env.SESSION_SECRET, setupToken, nowMs) : null;
  if (!t || t.staffId !== staffId) return { kq: "expired" };
  let secret: Uint8Array;
  try {
    secret = await decryptSecret(env.MFA_ENCRYPTION_KEY!, t.secretEnc);
  } catch {
    // Phiếu ký đúng mà không giải mã được = khoá máy chủ đã đổi giữa hai bước: coi như phiếu hết hạn (bắt đầu lại sẽ dùng khoá mới). Log KHÔNG in gì của phiếu.
    console.error(JSON.stringify({ level: "error", event: "mfa_decrypt_failed", message: "không giải mã được khoá trong phiếu bật (MFA_ENCRYPTION_KEY vừa đổi?)" }));
    return { kq: "expired" };
  }
  const step = await matchTotp(secret, code, nowMs);
  return step === null ? { kq: "invalid" } : { kq: "ok", secretEnc: t.secretEnc, step };
}

/**
 * Lô bật/đổi TOTP (CHƯA chạy): [kết thúc TOTP cũ (nếu thay)] → chèn TOTP mới → tiêu NGAY bước vừa khớp (`last_totp_step`), để mã dùng lúc bật không đăng nhập
 * được. Chỉ mục duy nhất `aut_mfa_factor_one_live` là lưới khi hai lần bật chạy đua (người gọi đổi lỗi UNIQUE thành 409).
 */
export function batTotpStatements(
  db: D1Database, v: { staffId: string; thayId: string | null; id: string; secretEnc: string; step: number; at: string },
): D1PreparedStatement[] {
  return [
    ...(v.thayId ? [factorEndStatement(db, v.thayId, v.staffId, v.at, v.staffId)] : []),
    factorInsertStatement(db, { id: v.id, staffId: v.staffId, kind: "TOTP", secretEnc: v.secretEnc, email: null, at: v.at, by: v.staffId }),
    totpConsumeStatement(db, v.id, v.step, v.at),
  ];
}

/** Bộ 10 mã dự phòng mới (CHƯA chạy): thu hồi mọi mã còn sống → chèn 10 băm. `codes` (dạng `xxxx-xxxx`) chỉ trả cho người dùng MỘT lần. */
export async function boMaDuPhongMoi(db: D1Database, staffId: string, at: string): Promise<{ codes: string[]; statements: D1PreparedStatement[] }> {
  const codes = newRecoveryCodes();
  const batchId = crypto.randomUUID();
  const inserts = await Promise.all(
    codes.map(async (c) => recoveryInsertStatement(db, { id: crypto.randomUUID(), staffId, batchId, codeHash: await recoveryHash(staffId, normalizeRecoveryCode(c)!), at, by: staffId })),
  );
  return { codes, statements: [recoveryRevokeAllStatement(db, staffId, at, staffId), ...inserts] };
}

/**
 * Gỡ một yếu tố (CHƯA chạy). `giuMot` (tài khoản nội bộ): câu chỉ kết thúc khi còn yếu tố sống khác. `sauKhiGoCuoi` — gỡ yếu tố CUỐI (chỉ tài khoản bên
 * ngoài tới đây): thu hồi mã dự phòng còn sống và máy được tin, để bật lại sau này không kéo theo bộ mã / máy tin cũ.
 */
export function goYeuToStatements(
  db: D1Database, v: { staffId: string; id: string; giuMot: boolean; cuoi: boolean; at: string },
): { goStatement: D1PreparedStatement; sauKhiGoCuoi: D1PreparedStatement[] } {
  return {
    goStatement: v.giuMot ? factorEndKeepOneStatement(db, v.id, v.staffId, v.at, v.staffId) : factorEndStatement(db, v.id, v.staffId, v.at, v.staffId),
    sauKhiGoCuoi: v.cuoi ? [recoveryRevokeAllStatement(db, v.staffId, v.at, v.staffId), trustedRevokeAllStatement(db, v.staffId, "tat_hai_lop", v.at, v.staffId)] : [],
  };
}

/** Quên MỘT máy được tin của chính mình (đúng chủ). Chưa chạy; `changes` = 0 khi máy không phải của mình / đã quên. */
export const quenMayStatement = (db: D1Database, id: string, staffId: string, at: string): D1PreparedStatement =>
  trustedRevokeStatement(db, id, staffId, "quen_may", at, staffId);
/** Quên MỌI máy được tin của chính mình. Chưa chạy. */
export const quenMoiMayStatement = (db: D1Database, staffId: string, at: string): D1PreparedStatement =>
  trustedRevokeAllStatement(db, staffId, "quen_moi_may", at, staffId);
