// Chỗ mở, đóng đăng ký của Toàn quyền (ADR-0206 Đ9 «Toàn quyền có thêm chỗ mở, đóng đăng ký»; đợt 1 Task 12 vòng sửa 1, I-3). Cổng `accounts`; ô `registration.policy.write`
// (chỉ Toàn quyền) hỏi ở THÂN route trong index.ts. Lệnh đổi = MỘT lô: chèn một dòng dk_policy mới (chép dòng hiện hành, chỉ đổi công tắc và loại mở — mọi con số giữ nguyên) → nhật ký
// `changes() > 0`. Không bao giờ sửa dòng cũ (bảng chỉ thêm, trigger 0170). Nhật ký không chứa dữ liệu cá nhân.
import { VAI_MO_DUOC_CHO_PHIEU_CA_NHAN } from "../../shared/dang-ky-hien-thi.ts";
import { error, json, readJson } from "../../shared/http.ts";
import { ROLES } from "../../shared/roles.ts";
import type { Ctx } from "../../shared/router.ts";
import { auditStatement } from "../audit";
import { chinhSachHienHanh, chinhSachRiengTuHienHanh, doiChinhSachStatement, type ChinhSachDangKyRow } from "./repository.ts";

export const CAM_CHINH_SACH = () => error(403, "forbidden", "Chỉ Toàn quyền đổi được chính sách đăng ký.");
const DA_DOI = () => error(409, "stale", "Chính sách đăng ký vừa được người khác đổi. Hãy tải lại rồi làm lại.");
const CHUA_RIENG_TU = () => error(409, "no_privacy_policy", "Chưa có chính sách riêng tư đang hiệu lực nên chưa mở được đăng ký. Hãy đăng chính sách riêng tư trước.");

const dsLoai = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);

function dto(cs: ChinhSachDangKyRow | null, coRiengTu: boolean) {
  return {
    id: cs?.id ?? null,
    nhanDangKy: cs?.registration_open === 1,
    loaiMo: cs ? dsLoai(cs.open_role_codes) : [],
    loaiCoThe: VAI_MO_DUOC_CHO_PHIEU_CA_NHAN.map((ma) => ({ ma, ten: ROLES[ma].name })),
    coChinhSachRiengTu: coRiengTu,
    tuLuc: cs?.valid_from_at ?? null,
  };
}

/** Thân lệnh đổi: `{ nhanDangKy: boolean, loaiMo: string[], dangHieuLuc: string }` — ba khoá bắt buộc. Loại mở chỉ trong VAI_MO_DUOC_CHO_PHIEU_CA_NHAN (không bao giờ TRAVEL_AGENCY); mở thì ít nhất một loại. */
export function kiemThanChinhSach(raw: Record<string, unknown> | null): { ok: true; mo: boolean; loai: string[]; dangHieuLuc: string } | { ok: false; message: string } {
  if (!raw || Object.keys(raw).some((k) => !["nhanDangKy", "loaiMo", "dangHieuLuc"].includes(k))) return { ok: false, message: "Yêu cầu không hợp lệ." };
  if (typeof raw.nhanDangKy !== "boolean" || !Array.isArray(raw.loaiMo) || typeof raw.dangHieuLuc !== "string" || !raw.dangHieuLuc) return { ok: false, message: "Yêu cầu không hợp lệ." };
  const duoc = VAI_MO_DUOC_CHO_PHIEU_CA_NHAN as readonly string[];
  if (raw.loaiMo.some((x) => typeof x !== "string" || !duoc.includes(x))) return { ok: false, message: "Chỉ mở được cho Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên." };
  const loai = duoc.filter((x) => (raw.loaiMo as string[]).includes(x)); // thứ tự chuẩn, bỏ trùng
  if (raw.nhanDangKy && loai.length === 0) return { ok: false, message: "Chọn ít nhất một vai người dùng trước khi mở đăng ký." };
  return { ok: true, mo: raw.nhanDangKy, loai, dangHieuLuc: raw.dangHieuLuc };
}

// ---- GET /api/dang-ky/chinh-sach ----
export async function xemChinhSach({ env }: Ctx<"accounts">): Promise<Response> {
  const [cs, rt] = await Promise.all([chinhSachHienHanh(env.DB, new Date().toISOString()), chinhSachRiengTuHienHanh(env.DB)]);
  return json(dto(cs, rt !== null));
}

// ---- POST /api/dang-ky/chinh-sach ----
export async function doiChinhSach({ request, env, staff }: Ctx<"accounts">): Promise<Response> {
  const k = kiemThanChinhSach(await readJson(request));
  if (!k.ok) return error(400, "invalid_input", k.message);
  const at = new Date().toISOString();
  const [cs, rt] = await Promise.all([chinhSachHienHanh(env.DB, at), chinhSachRiengTuHienHanh(env.DB)]);
  if (!cs || cs.id !== k.dangHieuLuc) return DA_DOI();
  if (k.mo && !rt) return CHUA_RIENG_TU();
  let kq: D1Result[];
  try {
    kq = await env.DB.batch([
      doiChinhSachStatement(env.DB, { id: crypto.randomUUID(), mo: k.mo, loaiMo: k.loai.join(","), dangHieuLuc: k.dangHieuLuc, at, by: staff.id }),
      auditStatement(env.DB, { staffId: staff.id, action: "registration_policy_set", at, targetType: "system", targetId: "dang-ky", detail: `Nhận đăng ký mới: ${k.mo ? "Bật" : "Tắt"} · loại mở: ${k.loai.join(", ") || "không"}` }, "changes() > 0"),
    ]);
  } catch (e) {
    if (/UNIQUE constraint failed: dk_policy/.test(e instanceof Error ? e.message : "")) return DA_DOI();
    throw e;
  }
  if ((kq[0]?.meta.changes ?? 0) === 0) {
    if (k.mo && !(await chinhSachRiengTuHienHanh(env.DB))) return CHUA_RIENG_TU();
    return DA_DOI();
  }
  const [moi, rt2] = await Promise.all([chinhSachHienHanh(env.DB, new Date().toISOString()), chinhSachRiengTuHienHanh(env.DB)]);
  return json(dto(moi, rt2 !== null));
}
