// BÁO BẬN CỦA TÀI XẾ (ADR-0053 D9; kế hoạch A4 T8; G-A4-10, G-A4-19, G-A4-20, G-A4-28). Tệp riêng (không gộp vào index.ts): route ở index.ts chỉ hỏi ô và gọi
// hàm ở đây — dòng `201` + `kemLocation(…, "/ban")` vẫn nằm ở index.ts (hàng rào H7 quét tĩnh). Khung luôn của `staff.partyId` (người gọi) — không nhận id tài
// xế từ thân. Thân KHÔNG có `requestId` (chống ghi trùng ở lớp vé — khuôn POST …/xe/:id/ban). Không gửi tin (D9.4). Văn phòng chỉ thấy "bận", không lý do.
import type { BanTaiXeResponse, KhungBanChongChuyenTaiXeLoi, KhungBanCuaToiDto, KhungBanCuaToiResponse, StaffProfile } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { chongNuaMo, nhanKhoangGio } from "../../shared/khung-ban";
import { addDays, isISODate, msToVnLocal, vnLocalToMs, vnToday } from "../../shared/vn-date";
import { auditStatement } from "../audit";
import { lyDoDangDung, tripsTouching } from "./chuyen-repo";
import { docChung } from "./dieu-phoi-doc";
import { taiXeChon } from "./dieu-phoi-dto";
import { CAU_KHUNG_VUA_DOI, chiTietNhatKyKhungTaiXe, kiemKhungBanMoi, kiemRutKhung, loiRangBuocKhungBan } from "./khung-ban";
import {
  insertKhungTaiXeStatement, khungCuaToi, khungTaiXeTheoId, khungTaiXeVanPhong, rutKhungTaiXeStatement, type KhungCuaToiRow,
} from "./khung-ban-tai-xe-repo";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Dải văn phòng dài tối đa 31 ngày (bảo vệ câu đọc). */
const DAI_VAN_PHONG_TOI_DA_NGAY = 31;
const KHONG_CO_KHUNG = () => error(404, "not_found", "Không có khung bận này.");

const lyDoBanTaiXe = async (db: D1Database) =>
  (await lyDoDangDung(db)).filter((r) => r.reason_group === "BAN_TAI_XE").map((r) => ({ code: r.code, label: r.label }));
const khungCuaToiDto = (r: KhungCuaToiRow): KhungBanCuaToiDto => ({
  id: r.id, batDau: new Date(r.start_ms).toISOString(), ketThuc: new Date(r.end_ms).toISOString(), batDauMs: r.start_ms, ketThucMs: r.end_ms,
  lyDoMa: r.reason_code, lyDo: r.reason_label, version: r.version,
});

/** Thân GET / phản hồi ghi, rút: khung còn hiệu lực của chính người gọi + danh mục lý do. */
export async function khungCuaToiResponse(db: D1Database, partyId: string, bayGioMs: number, status = 200): Promise<Response> {
  const [rows, lyDo] = await Promise.all([khungCuaToi(db, partyId, bayGioMs), lyDoBanTaiXe(db)]);
  return json({ khung: rows.map(khungCuaToiDto), lyDo } satisfies KhungBanCuaToiResponse, status);
}

/**
 * Ghi khung của chính mình. Thứ tự: 400 thân → 400 lý do ngoài nhóm / ngưng → 409 chồng chuyến người gọi đang được xếp (lớp route — liệt kê CHỈ chuyến của mình)
 * → lô ghi + nhật ký → lỗi CSDL (mã lớp CSDL khác). `null` = đã ghi (route trả 201 + Location).
 */
export async function lenhGhiKhungBan(db: D1Database, request: Request, staff: StaffProfile, partyId: string, bayGioMs: number): Promise<Response | null> {
  const parsed = kiemKhungBanMoi(await readJson(request), bayGioMs, "DRIVER");
  if (!parsed.ok) return error(400, "invalid_input", parsed.message);
  const k = parsed.value;
  if (!(await lyDoBanTaiXe(db)).some((r) => r.code === k.lyDo)) return error(400, "invalid_input", "Lý do không có trong danh mục lý do bận.");
  const vuong = (await tripsTouching(db, k.batDauMs, k.ketThucMs)).filter((t) =>
    t.driver_party_id === partyId && (t.status === "PLANNED" || t.status === "RUNNING") && chongNuaMo(t.planned_start_ms, t.planned_end_ms, k.batDauMs, k.ketThucMs));
  if (vuong.length > 0) {
    const dau = vuong[0]!;
    return json({
      error: {
        code: "khung_ban_chong_chuyen_tai_xe",
        message: `Bạn đang được xếp chuyến ${dau.code} lúc ${nhanKhoangGio(dau.planned_start_ms, dau.planned_end_ms)} — từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng trước.`,
        chuyen: vuong.map((t) => ({ id: t.id, ma: t.code, gio: nhanKhoangGio(t.planned_start_ms, t.planned_end_ms) })),
      },
    } satisfies KhungBanChongChuyenTaiXeLoi, 409);
  }
  const at = new Date(bayGioMs).toISOString();
  try {
    await db.batch([
      insertKhungTaiXeStatement(db, crypto.randomUUID(), partyId, k, at, staff.id),
      auditStatement(db, { staffId: staff.id, action: "driver_unavailability_added", at, targetType: "party", targetId: partyId, detail: chiTietNhatKyKhungTaiXe(k) }),
    ]);
  } catch (e) {
    const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "", "DRIVER");
    if (p) return error(p.status, p.code, p.message);
    throw e;
  }
  return null;
}

/** Rút khung của chính mình. Thứ tự: 404 (không phải khung của mình / không có) → 400 phiên bản → 409 đã rút / phiên bản cũ → 409 đã qua → lô. `null` = đã rút. */
export async function lenhRutKhungBan(db: D1Database, request: Request, id: string, staff: StaffProfile, partyId: string, bayGioMs: number): Promise<Response | null> {
  const k = UUID_RE.test(id) ? await khungTaiXeTheoId(db, id, partyId) : null;
  if (!k) return KHONG_CO_KHUNG();
  const parsed = kiemRutKhung(await readJson(request));
  if (!parsed.ok) return error(400, "invalid_input", parsed.message);
  if (k.withdrawn_at !== null || k.version !== parsed.value.version) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
  if (k.end_ms <= bayGioMs) return error(409, "khung_ban_da_qua", "Khung này đã qua — giữ trong lịch sử, không rút.");
  const at = new Date(bayGioMs).toISOString();
  let kq: D1Result[];
  try {
    kq = await db.batch([
      rutKhungTaiXeStatement(db, id, parsed.value.version, at, staff.id, partyId),
      auditStatement(db, {
        staffId: staff.id, action: "driver_unavailability_withdrawn", at, targetType: "party", targetId: partyId,
        detail: chiTietNhatKyKhungTaiXe({ batDauMs: k.start_ms, ketThucMs: k.end_ms }, true),
      }, "changes() > 0"),
    ]);
  } catch (e) {
    const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "", "DRIVER");
    if (p) return error(p.status, p.code, p.message);
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
  return null;
}

/** Dải "Tài xế bận" của văn phòng (G-A4-19): `tu` (mặc định hôm nay VN) → `den` (mặc định tu + 6), hai đầu bao gồm; tên + nhà xe từ `taiXeChoDieuPhoi`. */
export async function banTaiXeResponse(db: D1Database, url: URL, bayGioMs: number): Promise<Response> {
  const tuGui = url.searchParams.get("tu");
  const denGui = url.searchParams.get("den");
  if ((tuGui !== null && !isISODate(tuGui)) || (denGui !== null && !isISODate(denGui))) return error(400, "invalid_input", "Ngày xem: YYYY-MM-DD.");
  const homNay = vnToday(new Date(bayGioMs));
  const tu = tuGui ?? homNay;
  const den = denGui ?? addDays(tu, 6);
  if (den < tu || den > addDays(tu, DAI_VAN_PHONG_TOI_DA_NGAY - 1)) return error(400, "invalid_input", `Khoảng xem từ 1 tới ${DAI_VAN_PHONG_TOI_DA_NGAY} ngày.`);
  const tuMs = vnLocalToMs(tu, "00:00")!;
  const denMs = vnLocalToMs(addDays(den, 1), "00:00")!;
  const [rows, chung] = await Promise.all([khungTaiXeVanPhong(db, tuMs, denMs), docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date)]);
  const taiXe = new Map(taiXeChon(chung).map((t) => [t.partyId, t]));
  return json({
    tu, den,
    khung: rows.map((r) => ({
      id: r.id, taiXeId: r.driver_party_id, tenTaiXe: taiXe.get(r.driver_party_id)?.ten ?? "(không còn là tài xế)", nhaXe: taiXe.get(r.driver_party_id)?.nhaXe ?? [],
      batDauMs: r.start_ms, ketThucMs: r.end_ms, nhan: nhanKhoangGio(r.start_ms, r.end_ms),
    })),
  } satisfies BanTaiXeResponse);
}
