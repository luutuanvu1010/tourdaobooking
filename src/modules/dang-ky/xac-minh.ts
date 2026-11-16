// dang-ky/xac-minh.ts — luật thuần của bước xác minh phiếu đăng ký (ADR-0207 Đ2, Đ3; ADR-0210 Đ1). Không I/O. Route ở xac-minh-route.ts; câu ghi ở repository.ts.
import { laMaLyDoPhieu, type MaLyDoPhieu } from "../../shared/dang-ky-hien-thi.ts";

export type KetQuaMuc = "DAT" | "KHONG_DAT";
export type Kiem<T> = { ok: true; value: T } | { ok: false; message: string };

const MA_PHIEU_RE = /^DK_[A-Z]{8}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const laMaPhieu = (s: unknown): s is string => typeof s === "string" && MA_PHIEU_RE.test(s);
export const laMaTep = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);
const MA_MUC_RE = /^[A-Z][A-Z0-9_]{1,39}$/;

/**
 * Mục phải kết luận «đạt» trước khi «xác minh đạt» (ADR-0210 Đ1): HỢP của mục chỉ phiếu cần (chính sách đăng ký, cách nhau dấu phẩy) và mục bắt buộc của hồ sơ (parties).
 * Thứ tự cố định (phiếu trước, rồi hồ sơ), không trùng.
 */
export function mucBatBuoc(phieuChiCan: string, mucHoSo: readonly string[]): string[] {
  const rieng = phieuChiCan.split(",").map((x) => x.trim()).filter((x) => MA_MUC_RE.test(x));
  return [...new Set([...rieng, ...mucHoSo])];
}

/** Mục chưa «đạt» ở bản kết luận MỚI NHẤT của bản khai hiện hành (chưa kết luận, hay «không đạt»). */
export function mucChuaDat(batBuoc: readonly string[], moiNhat: ReadonlyMap<string, KetQuaMuc>): string[] {
  return batBuoc.filter((m) => moiNhat.get(m) !== "DAT");
}

/** Số bản khai người xác minh đã xem (lấy từ GET phiếu): số nguyên ≥ 1. */
const laPhienBan = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1;
const khongThua = (body: Record<string, unknown>, cho: readonly string[]): boolean => Object.keys(body).every((k) => cho.includes(k));

/** Thân `ket-luan`: `{ muc, dat, lyDo?, phienBan }`. «không đạt» đòi một mã lý do trong danh sách đóng; «đạt» không kèm lý do. Mục phải thuộc tập mục bắt buộc. */
export function kiemKetLuan(body: Record<string, unknown> | null, batBuoc: readonly string[]): Kiem<{ muc: string; dat: boolean; lyDo: MaLyDoPhieu | null; phienBan: number }> {
  if (!body || !khongThua(body, ["muc", "dat", "lyDo", "phienBan"]) || !laPhienBan(body.phienBan)) return { ok: false, message: "Yêu cầu không hợp lệ." };
  const phienBan = body.phienBan;
  if (typeof body.muc !== "string" || !batBuoc.includes(body.muc)) return { ok: false, message: "Mục này không nằm trong các mục cần xác minh." };
  if (typeof body.dat !== "boolean") return { ok: false, message: "Hãy chọn «Đạt» hoặc «Không đạt»." };
  if (body.dat) return body.lyDo === undefined || body.lyDo === null ? { ok: true, value: { muc: body.muc, dat: true, lyDo: null, phienBan } } : { ok: false, message: "Kết luận «Đạt» không kèm lý do." };
  if (!laMaLyDoPhieu(body.lyDo)) return { ok: false, message: "Hãy chọn một lý do trong danh sách." };
  return { ok: true, value: { muc: body.muc, dat: false, lyDo: body.lyDo, phienBan } };
}

/** Thân `bo-sung`, `tu-choi`: `{ lyDo, phienBan }` — một mã trong danh sách đóng và số bản khai người xác minh đã xem; không trường nào khác. */
export function kiemLyDo(body: Record<string, unknown> | null): Kiem<{ lyDo: MaLyDoPhieu; phienBan: number }> {
  if (!body || !khongThua(body, ["lyDo", "phienBan"]) || !laMaLyDoPhieu(body.lyDo) || !laPhienBan(body.phienBan)) return { ok: false, message: "Hãy chọn một lý do trong danh sách." };
  return { ok: true, value: { lyDo: body.lyDo, phienBan: body.phienBan } };
}

export type HoSoDich = { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string };
const PARTY_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Thân `dat`: `{ phienBan, hoSo?: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId }, hoSoToChuc?: (cùng dạng), nguoiGioiThieuPartyId? }`. `hoSo` là KẾT LUẬN DANH BẠ của người,
 * `hoSoToChuc` của tổ chức (ADR-0212 Đ5 — chỉ khi bản khai có phần tổ chức; route kiểm); vắng mặt thì dùng kết luận đã ghi trước đó (nếu có — không có thì route trả 409). Người giới thiệu:
 * mã hồ sơ, tuỳ chọn.
 */
export function kiemDat(body: Record<string, unknown> | null): Kiem<{ hoSo: HoSoDich | null; hoSoToChuc: HoSoDich | null; nguoiGioiThieuPartyId: string | null; phienBan: number }> {
  const loi = { ok: false, message: "Yêu cầu không hợp lệ." } as const;
  if (!body || !khongThua(body, ["hoSo", "hoSoToChuc", "nguoiGioiThieuPartyId", "phienBan"]) || !laPhienBan(body.phienBan)) return loi;
  const docHoSo = (h: unknown): HoSoDich | null | "LOI" => {
    if (h === undefined || h === null) return null;
    if (typeof h !== "object" || Array.isArray(h)) return "LOI";
    const o = h as Record<string, unknown>;
    if (o.kieu === "MOI" && khongThua(o, ["kieu"])) return { kieu: "MOI" };
    if (o.kieu === "CO_SAN" && khongThua(o, ["kieu", "partyId"]) && typeof o.partyId === "string" && PARTY_ID_RE.test(o.partyId)) return { kieu: "CO_SAN", partyId: o.partyId };
    return "LOI";
  };
  const hoSo = docHoSo(body.hoSo);
  const hoSoToChuc = docHoSo(body.hoSoToChuc);
  if (hoSo === "LOI" || hoSoToChuc === "LOI") return loi;
  const g = body.nguoiGioiThieuPartyId;
  if (g !== undefined && g !== null && !(typeof g === "string" && PARTY_ID_RE.test(g))) return loi;
  return { ok: true, value: { hoSo, hoSoToChuc, nguoiGioiThieuPartyId: typeof g === "string" ? g : null, phienBan: body.phienBan } };
}

/** Gói lỗi lô → 409 có câu rõ (trigger của phiếu). null = không phải lỗi của bước này. */
export function loiLoXacMinh(e: unknown): { status: 409; code: string; message: string } | null {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("dk_registration_transition")) return { status: 409, code: "registration_state_changed", message: "Phiếu vừa được người khác xử lý. Hãy mở lại phiếu." };
  return null;
}

/** Thân `duyet`: `{ roleCode, phienBan }` — mã vai (kiểm nhóm / luật gán ở route) và số bản khai người duyệt đã xem (BẮT BUỘC từ Task 12, như các lệnh của bước xác minh). Không trường nào khác. */
/**
 * Thân `duyet` (mốc B1 Task 13): `{ roleCode, roleCodeToChuc?, phienBan }`. `roleCode` = mã vai, hoặc `null` (phiếu «chỉ tổ chức» — route kiểm phiếu có phần tổ chức và hằng bật).
 * `roleCodeToChuc` = vai của tổ chức người duyệt chọn; VẮNG ⇒ giữ vai của tổ chức trong phiếu (`undefined`), `null` ⇒ không chọn (route đòi khi phiếu có phần tổ chức).
 */
export function kiemDuyet(body: Record<string, unknown> | null): Kiem<{ roleCode: string | null; roleCodeToChuc: string | null | undefined; phienBan: number }> {
  const laMa = (x: unknown): x is string => typeof x === "string" && /^[A-Z][A-Z0-9_]{1,39}$/.test(x);
  if (!body || !khongThua(body, ["roleCode", "roleCodeToChuc", "phienBan"]) || !(body.roleCode === null || laMa(body.roleCode))) return { ok: false, message: "Hãy chọn một vai trò đối tác." };
  const coToChuc = Object.hasOwn(body, "roleCodeToChuc");
  if (coToChuc && !(body.roleCodeToChuc === null || laMa(body.roleCodeToChuc))) return { ok: false, message: "Hãy chọn vai người dùng của tổ chức." };
  if (!laPhienBan(body.phienBan)) return { ok: false, message: "Yêu cầu không hợp lệ." };
  return { ok: true, value: { roleCode: body.roleCode, roleCodeToChuc: coToChuc ? (body.roleCodeToChuc as string | null) : undefined, phienBan: body.phienBan } };
}

/** Thân `tu-choi-duyet`: `{ lyDo, phienBan }` — một mã trong danh sách đóng (ADR-0207 Đ3) và số bản khai người duyệt đã xem (BẮT BUỘC từ Task 12); không trường nào khác. */
export function kiemLyDoDuyet(body: Record<string, unknown> | null): Kiem<{ lyDo: MaLyDoPhieu; phienBan: number }> {
  if (!body || !khongThua(body, ["lyDo", "phienBan"]) || !laMaLyDoPhieu(body.lyDo)) return { ok: false, message: "Hãy chọn một lý do trong danh sách." };
  if (!laPhienBan(body.phienBan)) return { ok: false, message: "Yêu cầu không hợp lệ." };
  return { ok: true, value: { lyDo: body.lyDo, phienBan: body.phienBan } };
}

/** Thân `tra-ve-xac-minh`: `{ phienBan }` — số bản khai người duyệt đã xem (bắt buộc); không trường nào khác. */
export function kiemTraVe(body: Record<string, unknown> | null): Kiem<{ phienBan: number }> {
  if (!body || !khongThua(body, ["phienBan"]) || !laPhienBan(body.phienBan)) return { ok: false, message: "Yêu cầu không hợp lệ." };
  return { ok: true, value: { phienBan: body.phienBan } };
}

/**
 * Gói lỗi của LÔ DUYỆT → 409 có câu rõ (ADR-0207 Đ5: «máy chủ dịch lỗi đó thành 409»). Câu chốt (dk_decision_guard) trước; rồi lưới cuối của các bảng khác (chỉ mục duy nhất, trigger
 * CCCD một người, vai, quan hệ) — mọi câu KHÔNG nhắc dữ liệu khai, không chép chữ lỗi thô. null = lỗi lạ (route ném lên ⇒ 500 có mã yêu cầu).
 */
export function loiLoDuyet(e: unknown): { status: 409; code: string; message: string } | null {
  const m = e instanceof Error ? e.message : "";
  const doi = { status: 409 as const, code: "registration_state_changed", message: "Phiếu vừa được người khác xử lý hoặc không còn chờ duyệt. Hãy mở lại phiếu." };
  if (m.includes("dk_decision_state")) return doi;
  if (m.includes("dk_decision_version")) return { status: 409, code: "registration_version_changed", message: "Phiếu đã thay đổi từ lúc bạn mở. Hãy mở lại phiếu để xem bản mới." };
  if (m.includes("dk_decision_no_match") || m.includes("dk_decision_not_verified")) return { status: 409, code: "registration_not_verified", message: "Phiếu chưa được xác minh đạt đầy đủ nên chưa duyệt được. Hãy bấm «Trả về xác minh» để người xác minh kết luận lại." };
  if (m.includes("dk_decision_same_person")) return { status: 409, code: "registration_same_person", message: "Người duyệt phải khác người đã xác minh phiếu này. Hãy nhờ một người khác duyệt." };
  if (/UNIQUE constraint failed: dk_decision/.test(m)) return doi;
  if (/NOT NULL constraint failed: pty_consent\.party_id/.test(m)) return { status: 409, code: "target_changed", message: "Hồ sơ đích vừa ngưng hoạt động hoặc vừa gộp vào hồ sơ khác nên chưa mở được tài khoản. Hãy bấm «Trả về xác minh» để người xác minh chọn lại hồ sơ." };
  if (/NOT NULL constraint failed: pty_party_relationship\.from_party_id/.test(m)) return { status: 409, code: "referrer_changed", message: "Hồ sơ người giới thiệu vừa ngưng hoạt động hoặc vừa gộp vào hồ sơ khác nên chưa mở được tài khoản. Hãy bấm «Trả về xác minh» để người xác minh chọn lại người giới thiệu." };
  // Phần tổ chức (ADR-0212 Đ5 mục 4, Đ6; đợt 2 Task 7). Không nhắc số.
  if (m.includes("dk_decision_no_org_match")) return { status: 409, code: "registration_not_verified", message: "Phiếu chưa có kết luận Danh bạ cho tổ chức nên chưa duyệt được. Hãy bấm «Trả về xác minh» để người xác minh kết luận lại." };
  if (m.includes("organization_document_gpkd_other_org")) return { status: 409, code: "org_gpkd_other_org", message: "Số giấy chứng nhận đăng ký kinh doanh của phiếu đã thuộc một hồ sơ tổ chức khác. Hãy bấm «Trả về xác minh» để người xác minh gắn vào hồ sơ tổ chức đó, hoặc từ chối phiếu." };
  if (/NOT NULL constraint failed: pty_party_relationship\.to_party_id/.test(m)) return { status: 409, code: "org_target_changed", message: "Hồ sơ tổ chức đã chọn vừa ngưng hoạt động nên chưa mở được tài khoản. Hãy bấm «Trả về xác minh» để người xác minh chọn lại hồ sơ tổ chức." };
  // Liên kết người quản lý của phiếu «chỉ tổ chức» / tổ chức mới (Task 13 vòng sửa 1): trigger hai đầu hoặc chỉ mục một người quản lý — câu riêng, không đổ cho số điện thoại.
  if (m.includes("pty_relationship_org_link_") || /UNIQUE constraint failed: pty_party_relationship\.to_party_id/.test(m)) {
    return { status: 409, code: "org_link_failed", message: "Chưa nối được người đăng ký làm người quản lý của hồ sơ tổ chức (hồ sơ tổ chức vừa thay đổi) nên chưa mở được tài khoản. Hãy mở lại phiếu." };
  }
  if (m.includes("party_relationship_overlap") || m.includes("organization_document_")) return { status: 409, code: "registration_conflict", message: "Dữ liệu vừa thay đổi nên chưa mở được tài khoản. Hãy mở lại phiếu." };
  if (m.includes("person_document_cccd_other_person")) return { status: 409, code: "document_other_person", message: "Số căn cước của phiếu đã thuộc một hồ sơ khác. Hãy bấm «Trả về xác minh» để người xác minh đối chiếu lại Danh bạ, hoặc từ chối phiếu (lý do «Thông tin này đã có trong hệ thống»)." };
  if (/UNIQUE constraint failed|party_role_|lc1|registration_attachment_|verification_target_mismatch|person_document_/i.test(m)) {
    return { status: 409, code: "registration_conflict", message: "Dữ liệu vừa thay đổi nên chưa mở được tài khoản (ví dụ số điện thoại vừa được dùng cho tài khoản khác). Hãy mở lại phiếu." };
  }
  return null;
}

/** Hai lỗi ĐÃ BIẾT khi staff dựng câu tài khoản (vai không mang quyền nào; vai mang quyền nội bộ) ⇒ route trả 400. Mọi lỗi khác ném lên (500) — không đội lốt lỗi vai (M4 vòng sửa 1). */
export function loiDungLoDuyet(e: unknown): boolean {
  const m = e instanceof Error ? e.message : "";
  return m === "createAccountOnPartyStatements: vai trò không mang quyền nào" || m === "createAccountOnPartyStatements: chỉ dùng cho vai trò bên ngoài";
}

