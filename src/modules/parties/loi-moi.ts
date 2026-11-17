// Lời mời vào tổ chức theo số điện thoại (ADR-0213 Đ7; mốc B2 đợt 2 đăng ký, Task 15). Route khai ở `index.ts` của parties; SQL ở `repository.ts` (bảng pty_org_invite, migration 0176).
// - Tạo (Đ7.1–Đ7.3): người quản lý có hiệu lực hoặc văn phòng (ô partner.org.manager.write) — kiểm ở chỗ khai route. Máy KHÔNG tra số có tài khoản hay chưa: luôn 201, luôn cùng câu.
//   Trần NẰM TRONG câu chèn (theo tổ chức: ngày, đang mở ⇒ 409 nói thật; theo số trên toàn Nền tảng ⇒ 429 câu trung tính, không mã). Mã chỉ trả MỘT lần, chỉ lưu bản băm có khoá.
// - Huỷ: lời mời còn mở hoặc đang giữ cho phiếu (Đ7.5 — phiếu đi tiếp như phiếu không có mã).
// - Người được mời (Đ7.4): xem lời mời gửi tới CHÍNH số đăng nhập; nhận bằng mã hoặc bằng mã định danh lời mời ⇒ MỘT lô: đã dùng → «Thành viên của» → nhật ký.
// Nhật ký `org_invite_*`: đích là hồ sơ tổ chức, chi tiết chỉ mã định danh lời mời — KHÔNG số điện thoại, KHÔNG mã. Phản hồi không bao giờ có số điện thoại.
import type { LoiMoiCuaToiResponse, TaoLoiMoiResponse } from "../../shared/contracts";
import { error, json, kemLocation, readJson } from "../../shared/http";
import { MA_DINH_DANH_RE, sinhMa } from "../../shared/ma-dinh-danh";
import { normalizePhone } from "../../shared/phone";
import type { Ctx } from "../../shared/router";
import { CAU_MA_VAO_SAI, CAU_TRAN_THEO_SO, cauTaoLoiMoi, chuanHoaMaVao, hienMaVao, sinhMaVao } from "../../shared/to-chuc";
import { vnToday } from "../../shared/vn-date";
import { auditToChucStatement } from "../audit";
import {
  LOI_GAC_LOI_MOI, lmChinhSach, lmCuaSo, lmDem, lmDungStatement, lmHuyStatement, lmTaoStatement, lmTheoBam, lmTheoId, lmThanhVienStatement, tcHoSo, tcLienKetDongTuNgay, tcLienKetMo,
  type LmDong,
} from "./repository";

const enc = new TextEncoder();
async function hmacBytes(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
/** Bản băm của mã ĐÃ CHUẨN HOÁ: HMAC-SHA256 với khoá dẫn xuất riêng từ SESSION_SECRET (nhãn `td-ma-vao-to-chuc-v1`), hex. Mã không bao giờ lưu, không bao giờ vào log. */
export async function bamMaVao(secret: string, ma: string): Promise<string> {
  const khoa = await hmacBytes(enc.encode(secret), "td-ma-vao-to-chuc-v1");
  return Array.from(await hmacBytes(khoa, ma), (b) => b.toString(16).padStart(2, "0")).join("");
}

const NGAY_MS = 86_400_000;
/** Đầu ngày Việt Nam chứa `d`, dạng ISO UTC (trần «mỗi ngày» tính theo ngày dân sự Việt Nam). */
export const dauNgayVn = (d: Date): string => new Date(Date.parse(`${vnToday(d)}T00:00:00+07:00`)).toISOString();
/** Ngày Việt Nam của một mốc ISO, dạng dd/mm/yyyy (câu trả lời của lệnh tạo). */
export const ngayVnHien = (iso: string): string => vnToday(new Date(iso)).split("-").reverse().join("/");

const LOI_THAN = (m: string) => error(400, "invalid_input", m);
const MA_SAI = () => error(400, "invite_code_invalid", CAU_MA_VAO_SAI);
const CHUA_CHINH_SACH = () => error(503, "invite_policy_missing", "Chưa có chính sách lời mời. Hãy báo quản trị viên.");
const KHONG_THAY_LOI_MOI = () => error(404, "not_found", "Không tìm thấy lời mời.");
const MAT_VAI = () => error(409, "org_not_partner", "Tổ chức này không còn mang vai trò đối tác nên không mời thành viên được.");

// ---- POST /api/to-chuc/:id/loi-moi — gọi SAU khi cổng (người quản lý có hiệu lực hoặc văn phòng) đã đúng ----
export async function taoLoiMoi(ctx: Ctx<"staff">, org: { id: string; ten: string }): Promise<Response> {
  const { env, staff } = ctx;
  const body = await readJson(ctx.request);
  if (!body || Object.keys(body).some((k) => k !== "soDienThoai") || typeof body.soDienThoai !== "string") return LOI_THAN("Hãy nhập số điện thoại của người được mời.");
  const so = normalizePhone(body.soDienThoai.trim());
  if (!so) return LOI_THAN("Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
  const hs = await tcHoSo(env.DB, org.id);
  if (!hs || !hs.coVaiDoiTac) return MAT_VAI();
  const now = new Date();
  const at = now.toISOString();
  const cs = await lmChinhSach(env.DB, at);
  if (!cs) return CHUA_CHINH_SACH();
  const hetHan = new Date(now.getTime() + cs.code_days * NGAY_MS).toISOString();
  const dauNgay = dauNgayVn(now);
  // Băm trùng (rất hiếm) hoặc mã định danh trùng ⇒ sinh lại, tối đa ba lần.
  for (let lan = 0; lan < 3; lan++) {
    const ma = sinhMaVao(crypto.getRandomValues(new Uint8Array(32)));
    const id = sinhMa("MV", crypto.getRandomValues(new Uint8Array(8)));
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([
        lmTaoStatement(env.DB, { id, org: org.id, phoneKey: so, codeHash: await bamMaVao(env.SESSION_SECRET, ma), expiresAt: hetHan, at, by: staff.id, dauNgay }),
        auditToChucStatement(env.DB, { staffId: staff.id, action: "org_invite_created", at, targetId: org.id, detail: `lời mời ${id}` }, "changes() > 0"),
      ]);
    } catch (e) {
      if (/UNIQUE constraint failed: pty_org_invite\.(code_hash|id)/.test(e instanceof Error ? e.message : "")) continue;
      throw e;
    }
    if ((kq[0]?.meta.changes ?? 0) === 1) {
      // H7 (ADR-0094 A-10): 201 kèm Location — màn tổ chức. Lớp vé chỉ lưu Location: gửi lặp cùng vé KHÔNG trả lại mã (mã chỉ hiện một lần); người mời huỷ và tạo lời mời mới.
      return kemLocation(json({ loiMoi: { id, ma: hienMaVao(ma), hetHan }, message: cauTaoLoiMoi(ma, ngayVnHien(hetHan)) } satisfies TaoLoiMoiResponse, 201), `/to-chuc?id=${org.id}`);
    }
    // Khớp 0 dòng: một trần đã đủ. Trần của tổ chức nói thật (người mời là người của tổ chức); trần theo số: câu trung tính, không mã giả.
    const d = await lmDem(env.DB, { org: org.id, phoneKey: so, at, dauNgay });
    if (d.toChucNgay >= cs.per_org_per_day) return error(409, "invite_org_daily_limit", `Tổ chức đã tạo đủ ${cs.per_org_per_day} lời mời trong hôm nay. Hãy tạo tiếp vào ngày mai.`);
    if (d.toChucMo >= cs.open_per_org) return error(409, "invite_org_open_limit", `Tổ chức đang có ${cs.open_per_org} lời mời chưa dùng, đã đến mức tối đa. Hãy huỷ bớt lời mời cũ rồi tạo lại.`);
    return error(429, "invite_phone_limit", CAU_TRAN_THEO_SO);
  }
  throw new Error("taoLoiMoi: không sinh được mã không trùng");
}

// ---- POST /api/to-chuc/:id/loi-moi/:mid/huy — gọi SAU khi cổng đã đúng. Huỷ được lời mời còn mở hoặc đang giữ cho phiếu (Đ7.5). ----
export async function huyLoiMoi(ctx: Ctx<"staff">, org: { id: string; ten: string }): Promise<Response> {
  const mid = ctx.params.mid;
  if (!mid || !MA_DINH_DANH_RE.test(mid)) return KHONG_THAY_LOI_MOI();
  const lm = await lmTheoId(ctx.env.DB, mid);
  if (!lm || lm.org_party_id !== org.id) return KHONG_THAY_LOI_MOI();
  const at = new Date().toISOString();
  const kq = await ctx.env.DB.batch([
    lmHuyStatement(ctx.env.DB, { id: mid, org: org.id, at, by: ctx.staff.id }),
    auditToChucStatement(ctx.env.DB, { staffId: ctx.staff.id, action: "org_invite_cancelled", at, targetId: org.id, detail: `lời mời ${mid}` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return error(409, "invite_not_open", "Lời mời này đã được dùng, đã huỷ hoặc đã hết hạn.");
  return json({ ok: true });
}

// ---- GET /api/to-chuc/loi-moi-cua-toi — lời mời MỞ còn hạn gửi tới số đăng nhập của CHÍNH người gọi (chỉ chính họ thấy — Đ7.4) ----
export async function loiMoiCuaToi(ctx: Ctx<"staff">): Promise<Response> {
  const so = normalizePhone(ctx.staff.phone ?? "");
  const ds = so ? await lmCuaSo(ctx.env.DB, so, new Date().toISOString()) : [];
  return json({ loiMoi: ds.map((x) => ({ id: x.id, toChuc: { partyId: x.orgPartyId, ten: x.tenToChuc }, hetHan: x.hetHan })) } satisfies LoiMoiCuaToiResponse);
}

/** Bộ đếm lượt gõ sai (khuôn `reserveAttempts` của auth — parties không import auth: nơi khai route truyền vào). */
export interface LuotThu {
  giu: (key: string, max: number, windowMs: number) => Promise<{ allowed: true; ids: Record<string, string> } | { allowed: false; retryAfterSeconds: number }>;
  bo: (ids: Record<string, string>) => Promise<void>;
}
/** Khoá đếm lượt gõ sai mã của một tài khoản (Đ7.3: 5 lần mỗi giờ mỗi tài khoản). Không gian `moi:` có câu dọn riêng theo cửa sổ một giờ (auth/repository.ts). */
export const khoaLuotMoiTaiKhoan = (staffId: string): string => `moi:staff:${staffId}`;
const GIO_MS = 3_600_000;

/** Lời mời còn dùng được cho NGƯỜI ĐÃ CÓ TÀI KHOẢN mang số `so` lúc `at`: còn MỞ, còn hạn, cùng số. */
export const loiMoiNhanDuoc = (lm: Pick<LmDong, "status" | "expires_at" | "phone_key"> | null, so: string | null, at: string): boolean =>
  lm !== null && so !== null && lm.status === "MO" && lm.expires_at > at && lm.phone_key === so;

// ---- POST /api/to-chuc/loi-moi/nhan — thân `{ ma }` hoặc `{ loiMoiId }` (Đ7.4). ----
// Cổng ở chỗ khai route: ô `order.create` (cùng lý do với GET /api/to-chuc/cua-toi). Lời kiểm vai «người được mời» nằm ở đây (số đăng nhập, Đ2.6, lời mời, người mời còn quyền).
export async function nhanLoiMoi(ctx: Ctx<"staff">, luot: LuotThu): Promise<Response> {
  const { env, staff } = ctx;
  const body = await readJson(ctx.request);
  const coMa = body !== null && Object.hasOwn(body, "ma");
  const coId = body !== null && Object.hasOwn(body, "loiMoiId");
  if (!body || coMa === coId || Object.keys(body).length !== 1) return LOI_THAN("Hãy nhập mã vào tổ chức, hoặc chọn một lời mời.");
  const now = new Date();
  const at = now.toISOString();
  const cs = await lmChinhSach(env.DB, at);
  if (!cs) return CHUA_CHINH_SACH();
  const so = normalizePhone(staff.phone ?? "");
  let lm: LmDong | null = null;
  let ids: Record<string, string> | null = null;
  if (coMa) {
    // Đặt chỗ TRƯỚC khi so: gõ sai khuôn cũng tính một lần (Review Focus 3); đúng thì trả lại lượt.
    const r = await luot.giu(khoaLuotMoiTaiKhoan(staff.id), cs.wrong_per_hour, GIO_MS);
    if (!r.allowed) return error(429, "invite_code_locked", "Bạn đã nhập sai mã quá nhiều lần. Hãy thử lại sau.");
    ids = r.ids;
    const ma = chuanHoaMaVao(body.ma);
    lm = ma ? await lmTheoBam(env.DB, await bamMaVao(env.SESSION_SECRET, ma)) : null;
  } else {
    lm = typeof body.loiMoiId === "string" && MA_DINH_DANH_RE.test(body.loiMoiId) ? await lmTheoId(env.DB, body.loiMoiId) : null;
  }
  if (!lm || !loiMoiNhanDuoc(lm, so, at)) return MA_SAI();
  if (ids) await luot.bo(ids);
  // Tài khoản hợp lệ (Đ2.6): giữ quyền Đối tác, không giữ quyền nào khác, không ngưng.
  if (!staff.partyId || (await ctx.taiKhoanGanDuoc(staff.partyId)) !== "DUOC") {
    return error(409, "org_account_invalid", "Tài khoản của bạn không gắn vào tổ chức được: chỉ tài khoản Đối tác đang dùng mới nhận được lời mời.");
  }
  if (!(await ctx.conQuyenMoi(lm.created_by, lm.org_party_id))) {
    return error(409, "org_inviter_no_right", "Người mời không còn quyền mời vào tổ chức này. Hãy nhờ người quản lý của tổ chức gửi lời mời mới.");
  }
  const org = await tcHoSo(env.DB, lm.org_party_id);
  if (!org || org.daGop || !org.coVaiDoiTac) return MAT_VAI();
  const today = vnToday(now);
  const [lk, daDong] = await Promise.all([tcLienKetMo(env.DB, org.id), tcLienKetDongTuNgay(env.DB, org.id, today)]);
  if (lk.some((x) => x.personPartyId === staff.partyId)) return error(409, "org_already_linked", "Bạn đã ở trong tổ chức này.");
  if (daDong.some((d) => d.personPartyId === staff.partyId && d.loai === "MEMBER_OF")) {
    return error(409, "org_same_day", "Bạn vừa rời tổ chức này trong hôm nay. Hãy nhận lại lời mời vào ngày mai.");
  }
  try {
    await env.DB.batch([
      lmDungStatement(env.DB, { id: lm.id, phoneKey: so!, staffId: staff.id, at }),
      lmThanhVienStatement(env.DB, { id: crypto.randomUUID(), person: staff.partyId, org: org.id, ngay: today, at, by: staff.id, inviteId: lm.id }),
      auditToChucStatement(env.DB, { staffId: staff.id, action: "org_invite_accepted", at, targetId: org.id, detail: `lời mời ${lm.id} · thành viên ${staff.partyId}` }, "changes() > 0"),
    ]);
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (LOI_GAC_LOI_MOI.test(m)) return MA_SAI();
    if (/party_relationship_overlap/.test(m)) return error(409, "org_same_day", "Bạn vừa rời tổ chức này trong hôm nay. Hãy nhận lại lời mời vào ngày mai.");
    if (/pty_relationship_org_link_org/.test(m)) return MAT_VAI();
    if (/pty_relationship_org_link_not_both|pty_relationship_org_link_person/.test(m)) return error(409, "org_already_linked", "Bạn đã ở trong tổ chức này.");
    throw e;
  }
  return json({ toChuc: { partyId: org.id, ten: org.ten } });
}
