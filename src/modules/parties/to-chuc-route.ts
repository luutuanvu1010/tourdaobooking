// Màn tổ chức — người quản lý và thành viên (ADR-0213 Đ2.4–Đ2.8, Đ6; mốc B1 đợt 2 đăng ký, Task 10). Route khai ở `index.ts` của parties; SQL ở `repository.ts`.
// Hai nhóm lệnh:
//   - VĂN PHÒNG (cổng `office` + ô `partner.org.manager.write`, kiểm ở chỗ khai route trong index.ts; người giữ quyền Đối tác bị từ chối như route cấp mặc định): giao / chuyển người
//     quản lý (lô đúng thứ tự Đ2.4, mã dòng mới sinh sẵn), gỡ người quản lý khi tổ chức không còn thành viên, gỡ thành viên, gửi lại thư báo người quản lý cũ, xem màn tổ chức.
//   - NGƯỜI QUẢN LÝ CÓ HIỆU LỰC (cổng `staff`, vai trên đối tượng — không qua hàng quyền): gửi yêu cầu chuyển quyền (một dòng chờ văn phòng), gỡ thành viên. Thành viên tự rời; người quản lý thì không.
//     Ba handler này CHƯA khai route (xem chú thích ở parties/index.ts): hàng rào route-write-guard đòi lời kiểm bảng quyền, chờ điều phối chọn cách.
// `parties` không đọc bảng `staff`: «người quản lý có hiệu lực» (ctx.nguoiQuanLyCoHieuLuc) và «tài khoản gắn được» (ctx.taiKhoanGanDuoc, Đ2.6) do gốc lắp ráp tiêm.
// Nhật ký: hành động `org_*`, đích là hồ sơ tổ chức, `acting_party_id` = tổ chức (ruling PF18 — `auditToChucStatement`); không số điện thoại, không email.
// Thư báo người quản lý cũ (Đ6, Ruling R5): lô chuyển đặt `notice_state` CHO (KHONG_EMAIL khi hồ sơ không có email); thư gửi trong `exec.waitUntil` SAU lô, xong thì một câu đặt DA_GUI.
// Lô không bao giờ chờ thư; thư hỏng thì dòng ở lại CHO và văn phòng bấm gửi lại.
import type { ToChucDto, ToChucResponse } from "../../shared/contracts";
import { cauHinhThu, guiThu } from "../../shared/gui-thu";
import { error, json, kemLocation, readJson } from "../../shared/http";
import type { Ctx, KetLuanGanToChuc } from "../../shared/router";
import { NHAN_LY_DO_TO_CHUC, laMaLyDoToChuc, type MaLyDoToChuc } from "../../shared/to-chuc";
import { vnToday } from "../../shared/vn-date";
import { auditToChucStatement } from "../audit";
import {
  LOI_GAC_TO_CHUC, tcDatThuDaGui, tcDongQuanLyStatement, tcDongThanhVienGacStatement, tcDongThanhVienStatement, tcDongYeuCauStatement, tcEmailCua, tcHoSo, tcLienKetDongTuNgay,
  tcLienKetMo, tcMoLienKetStatement, tcTaoYeuCauStatement, tcThuMoiNhat, tcYeuCauMo, type TcLienKet,
} from "./repository";
import { PARTY_ID_RE } from "./rules";

// ---- Câu báo (chữ mới — chờ chủ chọn ở bảng tham chiếu; tên đã duyệt: «Người quản lý tổ chức», «Thành viên», «Chuyển quyền quản lý») -------------------------
/** Câu từ chối của cổng văn phòng — lời kiểm ô partner.org.manager.write nằm ở chỗ khai route (parties/index.ts), không lặp ở thân handler. */
export const CAM_TO_CHUC = () => error(403, "forbidden", "Chỉ Quản lý bán hàng, Quản trị và Toàn quyền đổi được người quản lý của tổ chức.");
const CAM_QUAN_LY = () => error(403, "forbidden", "Chỉ người quản lý của tổ chức làm được việc này.");
const KHONG_THAY_TO_CHUC = () => error(404, "not_found", "Không tìm thấy tổ chức.");
const LOI_THAN = (m: string) => error(400, "invalid_input", m);
const DA_DOI = () => error(409, "org_manager_changed", "Người quản lý của tổ chức vừa thay đổi. Hãy tải lại màn tổ chức rồi làm lại.");
const CUNG_NGAY = () => error(409, "org_same_day", "Không chuyển lại cho người vừa thôi quản lý trong cùng ngày.");
const CON_THANH_VIEN = () =>
  error(409, "org_has_members", "Tổ chức còn thành viên nên chưa gỡ người quản lý được. Hãy chuyển quyền quản lý cho người khác, hoặc gỡ hết thành viên trước.");
const KHONG_LA_THANH_VIEN = () => error(404, "not_found", "Người này không phải thành viên của tổ chức.");
const MAT_VAI = () => error(409, "org_not_partner", "Tổ chức này không còn mang vai trò đối tác nên không giao người quản lý được.");
const CAU_GAN: Record<Exclude<KetLuanGanToChuc, "DUOC">, string> = {
  KHONG_TAI_KHOAN: "Người này chưa có tài khoản Đối tác. Hãy mời họ đăng ký trước.",
  KHONG_DOI_TAC: "Tài khoản của người này không giữ quyền Đối tác nên không gắn vào tổ chức được.",
  QUYEN_KHAC: "Tài khoản nội bộ hoặc tài khoản Tài xế đối tác không gắn vào tổ chức được.",
  NGUNG: "Tài khoản của người này đang ngưng nên không gắn vào tổ chức được.",
};

/** Thư báo người quản lý cũ (Đ6): tên tổ chức và một câu; không tên người mới, không số điện thoại, không liên kết (khuôn thư của dang-ky). */
export function thuBaoNguoiQuanLyCu(tenToChuc: string): { subject: string; text: string; html: string } {
  const dong = [`Tổ chức: ${tenToChuc}`, "Bạn không còn là người quản lý tổ chức này trên Nền tảng Tour Đảo.", "Nếu không phải bạn yêu cầu, hãy liên hệ Tour Đảo."];
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return { subject: "Thay đổi người quản lý tổ chức trên Tour Đảo", text: `${dong.join("\n")}\n`, html: dong.map((d) => `<p>${esc(d)}</p>`).join("") };
}

/** Gửi thư trong waitUntil; xong thì CHO → DA_GUI. KHÔNG BAO GIỜ ném; log chỉ lý do cố định, không địa chỉ. */
function guiThuSauLo(env: Env, exec: ExecutionContext, v: { relationshipId: string; den: string; tenToChuc: string }): void {
  exec.waitUntil((async () => {
    const kq = await guiThu(cauHinhThu(env as Parameters<typeof cauHinhThu>[0]), { to: v.den, ...thuBaoNguoiQuanLyCu(v.tenToChuc) });
    if (!kq.ok) {
      console.error(JSON.stringify({ level: "error", event: "org_notice_failed", message: kq.lyDo }));
      return;
    }
    await tcDatThuDaGui(env.DB, v.relationshipId, new Date().toISOString());
  })().catch((e) => console.error(JSON.stringify({ level: "error", event: "org_notice_failed", message: e instanceof Error ? e.name : "unknown" }))));
}


/** Tổ chức theo id đường dẫn: hồ sơ tổ chức chưa gộp; không thì null. */
async function docToChuc(db: D1Database, id: string | undefined) {
  if (!id || !PARTY_ID_RE.test(id)) return null;
  const o = await tcHoSo(db, id);
  return o && o.kind === "ORGANIZATION" && !o.daGop ? o : null;
}

/** Mã hồ sơ cá nhân trong thân; `chiKhoa` = các khoá được phép. */
function docThan(body: Record<string, unknown> | null, chiKhoa: readonly string[]): body is Record<string, unknown> {
  return body !== null && Object.keys(body).every((k) => chiKhoa.includes(k));
}
const laMaHoSo = (v: unknown): v is string => typeof v === "string" && PARTY_ID_RE.test(v);

async function dtoToChuc(ctx: Ctx, org: { id: string; ten: string }): Promise<ToChucDto> {
  const [lk, yc, thu, hl] = await Promise.all([tcLienKetMo(ctx.env.DB, org.id), tcYeuCauMo(ctx.env.DB, org.id), tcThuMoiNhat(ctx.env.DB, org.id), ctx.nguoiQuanLyCoHieuLuc(org.id)]);
  const ql = lk.find((x) => x.loai === "MANAGER_OF");
  return {
    partyId: org.id,
    ten: org.ten,
    nguoiQuanLy: ql ? { partyId: ql.personPartyId, ten: ql.ten, tuNgay: ql.tuNgay, coHieuLuc: hl?.personPartyId === ql.personPartyId } : null,
    thanhVien: lk.filter((x) => x.loai === "MEMBER_OF").map((x) => ({ partyId: x.personPartyId, ten: x.ten, tuNgay: x.tuNgay })),
    yeuCauChuyen: yc.map((x) => ({ id: x.id, nguoiDeXuat: { partyId: x.personPartyId, ten: x.ten }, luc: x.luc })),
    thu: thu ? { trangThai: thu.trangThai, ngay: thu.ngay } : null,
  };
}

/** Lỗi lô tổ chức → 409 rõ (lính gác, chồng lấn, trigger). Lỗi khác ném lại (500 có log của router). */
function loiLo(e: unknown): Response {
  const m = e instanceof Error ? e.message : "";
  if (LOI_GAC_TO_CHUC.test(m) || /pty_relationship_manager_close_needs_replacement|pty_relationship_org_link_not_both/.test(m)) return DA_DOI();
  if (/party_relationship_overlap/.test(m)) return CUNG_NGAY();
  if (/pty_relationship_org_link_org/.test(m)) return MAT_VAI();
  throw e;
}

// ---- GET /api/parties/:id/to-chuc ----
export async function xemToChuc(ctx: Ctx<"office">): Promise<Response> {
  const org = await docToChuc(ctx.env.DB, ctx.params.id);
  if (!org) return KHONG_THAY_TO_CHUC();
  return json({ toChuc: await dtoToChuc(ctx, org) } satisfies ToChucResponse);
}

// ---- POST /api/parties/:id/to-chuc/nguoi-quan-ly — giao (chưa có) hoặc chuyển (đã có) ----
export async function giaoNguoiQuanLy(ctx: Ctx<"office">): Promise<Response> {
  const { env, staff, exec } = ctx;
  const org = await docToChuc(env.DB, ctx.params.id);
  if (!org) return KHONG_THAY_TO_CHUC();
  const body = await readJson(ctx.request);
  if (!docThan(body, ["personPartyId", "nguoiCuThanhThanhVien", "lyDo"]) || !laMaHoSo(body.personPartyId)) return LOI_THAN("Hãy chọn người sẽ làm người quản lý.");
  if (body.nguoiCuThanhThanhVien !== undefined && typeof body.nguoiCuThanhThanhVien !== "boolean") return LOI_THAN("Lựa chọn giữ người cũ làm thành viên không hợp lệ.");
  if (!laMaLyDoToChuc(body.lyDo)) return LOI_THAN("Hãy chọn một lý do trong danh sách.");
  const person = body.personPartyId;
  const giuNguoiCu = body.nguoiCuThanhThanhVien ?? true; // Đ6: mặc định người quản lý cũ thành thành viên
  const lyDo: MaLyDoToChuc = body.lyDo;
  if (!org.coVaiDoiTac) return MAT_VAI();
  const nguoi = await tcHoSo(env.DB, person);
  if (!nguoi || nguoi.kind !== "PERSON" || nguoi.daGop || !nguoi.active) return error(409, "org_person_invalid", "Hãy chọn một hồ sơ cá nhân đang dùng.");
  const gan = await ctx.taiKhoanGanDuoc(person);
  if (gan !== "DUOC") return error(409, "org_account_invalid", CAU_GAN[gan]);
  const today = vnToday(new Date());
  const [lk, daDong] = await Promise.all([tcLienKetMo(env.DB, org.id), tcLienKetDongTuNgay(env.DB, org.id, today)]);
  const cu = lk.find((x) => x.loai === "MANAGER_OF") ?? null;
  if (cu?.personPartyId === person) return error(409, "org_already_manager", "Người này đang là người quản lý của tổ chức.");
  // Đ2.9: quan hệ hiệu lực theo ngày — mở lại cùng loại cho cùng người trong ngày đã đóng sẽ vướng trigger chống chồng lấn; báo trước lô.
  if (daDong.some((d) => d.personPartyId === person && d.loai === "MANAGER_OF")) return CUNG_NGAY();
  if (cu && giuNguoiCu) {
    if (daDong.some((d) => d.personPartyId === cu.personPartyId && d.loai === "MEMBER_OF")) {
      return error(409, "org_same_day", "Người quản lý hiện tại vừa thôi làm thành viên trong hôm nay nên chưa giữ làm thành viên được. Hãy bỏ chọn giữ làm thành viên.");
    }
    // Ruling T10-5: giữ người cũ làm thành viên cũng là GẮN (Đ2.6) — tài khoản không còn hợp lệ thì phải bỏ chọn (không để R-TC-3 đỏ sau lệnh).
    if ((await ctx.taiKhoanGanDuoc(cu.personPartyId)) !== "DUOC") {
      return error(409, "org_old_manager_invalid", "Người quản lý hiện tại không còn đủ điều kiện làm thành viên. Hãy bỏ chọn giữ người cũ làm thành viên.");
    }
  }
  const thanhVienMoi: TcLienKet | undefined = lk.find((x) => x.loai === "MEMBER_OF" && x.personPartyId === person);
  const at = new Date().toISOString();
  const by = staff.id;
  const newId = crypto.randomUUID();
  const gOld = cu?.id ?? null;
  const emailCu = cu ? await tcEmailCua(env.DB, cu.personPartyId) : null;
  const thu = cu ? (emailCu ? "CHO" as const : "KHONG_EMAIL" as const) : null;
  const detail = cu
    ? `người cũ ${cu.personPartyId} → người mới ${person} · giữ người cũ làm thành viên: ${giuNguoiCu ? "có" : "không"} · lý do: ${NHAN_LY_DO_TO_CHUC[lyDo]}`
    : `người quản lý ${person} · lý do: ${NHAN_LY_DO_TO_CHUC[lyDo]}`;
  // Đ2.4, đúng thứ tự: (1) đóng người cũ kèm replaced_by_id = mã mới → (2) đóng thành viên của người mới → (3) mở người quản lý mới đúng mã đó → (4) người cũ thành thành viên → (5) nhật ký.
  const stmts: D1PreparedStatement[] = [
    ...(cu ? [tcDongQuanLyStatement(env.DB, { id: cu.id, org: org.id, ngay: today, thay: newId, thu, at, by })] : []),
    ...(thanhVienMoi ? [tcDongThanhVienGacStatement(env.DB, { id: thanhVienMoi.id, org: org.id, ngay: today, at, by, gOld, gNew: newId })] : []),
    tcMoLienKetStatement(env.DB, { id: newId, person, org: org.id, loai: "MANAGER_OF", ngay: today, gOld, gNew: newId, at, by }),
    ...(cu && giuNguoiCu ? [tcMoLienKetStatement(env.DB, { id: crypto.randomUUID(), person: cu.personPartyId, org: org.id, loai: "MEMBER_OF", ngay: today, gOld, gNew: newId, at, by })] : []),
    // Ruling T10-4: yêu cầu chuyển đang mở của tổ chức coi như đã xử lý khi văn phòng giao / chuyển (dù chọn người khác người được đề xuất).
    tcDongYeuCauStatement(env.DB, org.id, at, by),
    auditToChucStatement(env.DB, { staffId: by, action: cu ? "org_manager_transferred" : "org_manager_assigned", at, targetId: org.id, detail }),
  ];
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    return loiLo(e);
  }
  if (cu && thu === "CHO" && emailCu) guiThuSauLo(env, exec, { relationshipId: cu.id, den: emailCu, tenToChuc: org.ten });
  return json({ toChuc: await dtoToChuc(ctx, org) } satisfies ToChucResponse);
}

// ---- POST /api/parties/:id/to-chuc/go-nguoi-quan-ly — chỉ khi tổ chức không còn thành viên (Đ2.5) ----
export async function goNguoiQuanLy(ctx: Ctx<"office">): Promise<Response> {
  const { env, staff } = ctx;
  const org = await docToChuc(env.DB, ctx.params.id);
  if (!org) return KHONG_THAY_TO_CHUC();
  const body = await readJson(ctx.request);
  if (!docThan(body, ["lyDo"]) || !laMaLyDoToChuc(body.lyDo)) return LOI_THAN("Hãy chọn một lý do trong danh sách.");
  const lk = await tcLienKetMo(env.DB, org.id);
  const cu = lk.find((x) => x.loai === "MANAGER_OF");
  if (!cu) return error(409, "org_no_manager", "Tổ chức này chưa có người quản lý.");
  if (lk.some((x) => x.loai === "MEMBER_OF")) return CON_THANH_VIEN();
  const at = new Date().toISOString();
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      tcDongQuanLyStatement(env.DB, { id: cu.id, org: org.id, ngay: vnToday(new Date()), thay: null, thu: null, at, by: staff.id }),
      auditToChucStatement(env.DB, { staffId: staff.id, action: "org_manager_removed", at, targetId: org.id, detail: `người quản lý ${cu.personPartyId} · lý do: ${NHAN_LY_DO_TO_CHUC[body.lyDo]}` }, "changes() > 0"),
    ]);
  } catch (e) {
    if (/pty_relationship_manager_close_needs_replacement/.test(e instanceof Error ? e.message : "")) return CON_THANH_VIEN();
    return loiLo(e);
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) return DA_DOI();
  return json({ toChuc: await dtoToChuc(ctx, org) } satisfies ToChucResponse);
}

/** Đóng một thành viên (văn phòng hoặc người quản lý). `lyDo` chỉ khi văn phòng làm. */
async function dongThanhVien(ctx: Ctx, org: { id: string; ten: string }, person: string, action: "org_member_removed" | "org_member_left", lyDo: MaLyDoToChuc | null): Promise<Response | null> {
  const lk = await tcLienKetMo(ctx.env.DB, org.id);
  const tv = lk.find((x) => x.loai === "MEMBER_OF" && x.personPartyId === person);
  if (!tv) return null;
  const at = new Date().toISOString();
  const detail = `thành viên ${person}${lyDo ? ` · lý do: ${NHAN_LY_DO_TO_CHUC[lyDo]}` : ""}`;
  const kq = await ctx.env.DB.batch([
    tcDongThanhVienStatement(ctx.env.DB, { id: tv.id, org: org.id, ngay: vnToday(new Date()), at, by: ctx.staff!.id }),
    auditToChucStatement(ctx.env.DB, { staffId: ctx.staff!.id, action, at, targetId: org.id, detail }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return DA_DOI();
  return json({ ok: true });
}

// ---- POST /api/parties/:id/to-chuc/go-thanh-vien (văn phòng) ----
export async function goThanhVienVanPhong(ctx: Ctx<"office">): Promise<Response> {
  const org = await docToChuc(ctx.env.DB, ctx.params.id);
  if (!org) return KHONG_THAY_TO_CHUC();
  const body = await readJson(ctx.request);
  if (!docThan(body, ["personPartyId", "lyDo"]) || !laMaHoSo(body.personPartyId)) return LOI_THAN("Hãy chọn thành viên cần gỡ.");
  if (!laMaLyDoToChuc(body.lyDo)) return LOI_THAN("Hãy chọn một lý do trong danh sách.");
  return (await dongThanhVien(ctx, org, body.personPartyId, "org_member_removed", body.lyDo)) ?? KHONG_LA_THANH_VIEN();
}

// ---- POST /api/parties/:id/to-chuc/gui-lai-thu — gửi lại thư báo người quản lý cũ còn CHO ----
export async function guiLaiThuToChuc(ctx: Ctx<"office">): Promise<Response> {
  const { env, staff, exec } = ctx;
  const org = await docToChuc(env.DB, ctx.params.id);
  if (!org) return KHONG_THAY_TO_CHUC();
  const thu = await tcThuMoiNhat(env.DB, org.id);
  if (!thu || thu.trangThai !== "CHO") return error(409, "notice_not_pending", "Không có thư nào đang chờ gửi lại.");
  const den = await tcEmailCua(env.DB, thu.personPartyId);
  if (!den) return error(409, "notice_no_email", "Hồ sơ người quản lý cũ không còn email liên hệ nên không gửi lại thư được.");
  const at = new Date().toISOString();
  await env.DB.batch([auditToChucStatement(env.DB, { staffId: staff.id, action: "org_notice_resent", at, targetId: org.id, detail: `người quản lý cũ ${thu.personPartyId}` })]);
  guiThuSauLo(env, exec, { relationshipId: thu.relationshipId, den, tenToChuc: org.ten });
  return json({ thu: { trangThai: "CHO" as const } });
}

// ---- Lệnh của người quản lý có hiệu lực (cổng staff, vai trên đối tượng) ----
async function quanLyHieuLuc(ctx: Ctx<"staff">): Promise<{ org: { id: string; ten: string }; personPartyId: string } | Response> {
  const id = ctx.params.id;
  if (!id || !PARTY_ID_RE.test(id)) return CAM_QUAN_LY();
  const hl = await ctx.nguoiQuanLyCoHieuLuc(id);
  if (!hl || hl.staffId !== ctx.staff.id) return CAM_QUAN_LY();
  const org = await docToChuc(ctx.env.DB, id);
  return org ? { org, personPartyId: hl.personPartyId } : CAM_QUAN_LY();
}

// ---- POST /api/to-chuc/:id/yeu-cau-chuyen — một dòng chờ văn phòng (Đ6: người quản lý chỉ gửi yêu cầu) ----
export async function yeuCauChuyen(ctx: Ctx<"staff">): Promise<Response> {
  const q = await quanLyHieuLuc(ctx);
  if (q instanceof Response) return q;
  const body = await readJson(ctx.request);
  if (!docThan(body, ["personPartyId"]) || !laMaHoSo(body.personPartyId)) return LOI_THAN("Hãy chọn người bạn muốn chuyển quyền quản lý.");
  if (body.personPartyId === q.personPartyId) return LOI_THAN("Hãy chọn một người khác bạn.");
  const nguoi = await tcHoSo(ctx.env.DB, body.personPartyId);
  if (!nguoi || nguoi.kind !== "PERSON" || nguoi.daGop || !nguoi.active) return LOI_THAN("Hãy chọn một hồ sơ cá nhân đang dùng.");
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const kq = await ctx.env.DB.batch([
    tcTaoYeuCauStatement(ctx.env.DB, { id, org: q.org.id, staffId: ctx.staff.id, person: body.personPartyId, at }),
    auditToChucStatement(ctx.env.DB, { staffId: ctx.staff.id, action: "org_transfer_requested", at, targetId: q.org.id, detail: `đề xuất ${body.personPartyId}` }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) === 0) return error(409, "org_request_open", "Tổ chức đã có một yêu cầu chuyển quyền quản lý đang chờ Tour Đảo xử lý.");
  return kemLocation(json({ yeuCau: { id } }, 201), `/parties?id=${q.org.id}`);
}

// ---- POST /api/to-chuc/:id/go-thanh-vien (người quản lý) ----
export async function goThanhVienQuanLy(ctx: Ctx<"staff">): Promise<Response> {
  const q = await quanLyHieuLuc(ctx);
  if (q instanceof Response) return q;
  const body = await readJson(ctx.request);
  if (!docThan(body, ["personPartyId"]) || !laMaHoSo(body.personPartyId)) return LOI_THAN("Hãy chọn thành viên cần gỡ.");
  return (await dongThanhVien(ctx, q.org, body.personPartyId, "org_member_removed", null)) ?? KHONG_LA_THANH_VIEN();
}

// ---- POST /api/to-chuc/:id/roi — thành viên tự rời; người quản lý thì không (Đ2.4, Đ6) ----
export async function roiToChuc(ctx: Ctx<"staff">): Promise<Response> {
  const id = ctx.params.id;
  const KHONG = () => error(404, "not_found", "Bạn không phải thành viên của tổ chức này.");
  if (!id || !PARTY_ID_RE.test(id) || !ctx.staff.partyId) return KHONG();
  const org = await docToChuc(ctx.env.DB, id);
  if (!org) return KHONG();
  const lk = await tcLienKetMo(ctx.env.DB, org.id);
  if (lk.some((x) => x.loai === "MANAGER_OF" && x.personPartyId === ctx.staff.partyId)) {
    return error(409, "org_manager_cannot_leave", "Người quản lý không tự rời tổ chức. Hãy nhờ Tour Đảo giao người quản lý khác trước.");
  }
  return (await dongThanhVien(ctx, org, ctx.staff.partyId, "org_member_left", null)) ?? KHONG();
}
