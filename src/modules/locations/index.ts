// Module locations — địa điểm phát sinh nghiệp vụ (văn phòng, quầy vé, bến tàu, bến cảng). Route: /api/locations*.
// Đáy đồ thị phụ thuộc (ADR-0002): chỉ dùng audit để ghi dấu vết. Module khác đọc nhãn địa điểm qua view công bố v_loc_location_label,
// KHÔNG import repository.ts. Thêm/sửa/ngưng dùng địa điểm chỉ quản trị viên (ADR-0007: "quản lý địa điểm" = ADMIN).
import { auditStatement } from "../audit";
import type { LocationDto, LocationListResponse, LocationResponse, VungDonDto, VungDonResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { findLocation, insertLocationStatement, listLocationTypes, listLocations, locationTypeExists, updateLocationStatement, type LocationRow } from "./repository";
import { validateLocationCreate, validateLocationUpdate } from "./rules";
import { MA_NGOAI_VUNG, kiemThanVungSua, kiemThanVungTao } from "./vung-rules";
import { findVung, insertVungStatement, khuVucCuaDiaDiem, listVung, listVungDangBat, updateVungStatement, vungDangBatTonTai, type VungRow } from "./vung-repo";

const toDto = (r: LocationRow): LocationDto => ({
  id: r.id,
  code: r.code,
  name: r.name,
  locationTypeCode: r.location_type_code,
  locationTypeName: r.type_name,
  address: r.address,
  sortOrder: r.sort_order,
  active: r.active === 1,
  quickPickOrder: r.quick_pick_order,
  zoneCode: r.zone_code,
  updatedAt: r.updated_at,
});

const vungToDto = (r: VungRow): VungDonDto => ({ code: r.code, name: r.name, sortOrder: r.sort_order, active: r.active === 1, soDiaDiem: r.so_dia_diem, updatedAt: r.updated_at });

/** Khu vực đón đang bật (sắp theo thứ tự, rồi mã) — hàm công bố cho gốc lắp ráp (ADR-0147 Đ1). Module khác KHÔNG import repository. */
export function vungDangBat(db: D1Database): Promise<{ code: string; name: string }[]> {
  return listVungDangBat(db);
}

/**
 * Khu vực đón của các địa điểm (id địa điểm → mã khu vực; chưa xếp vùng ⇒ NGOAI_VUNG) — hàm công bố cho `orders` làm phẳng chặng tính phí đưa đón (Đợt C; ADR-0147 Đ1).
 * Tên cột khu vực chỉ nằm trong `locations` (bài «khoá điều kiện chỉ được biết ở pricing» quét `orders`). Id không có trong danh mục: vắng khỏi kết quả.
 */
export function khuVucCuaDiaDiemDanhMuc(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  return khuVucCuaDiaDiem(db, ids);
}

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy địa điểm.");
const BAD_TYPE = () => error(400, "invalid_input", "Loại địa điểm không tồn tại.");
const BAD_ZONE = () => error(400, "invalid_input", "Khu vực đón không có hoặc đã ngưng dùng.");
const ZONE_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy khu vực đón.");
const CHI_QUAN_TRI = () => error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");

export const locationsModule: AppModule = {
  name: "locations",
  routes: [
    // Mọi tài khoản đăng nhập đọc được danh sách (nhãn không nhạy cảm; người làm việc ngoài hiện trường cũng cần thấy tên nơi).
    route("GET", "/api/locations", "staff", async ({ env }) => {
      const [rows, types, zones] = await Promise.all([listLocations(env.DB), listLocationTypes(env.DB), listVung(env.DB)]);
      return json({ locations: rows.map(toDto), types, zones: zones.map(vungToDto) } satisfies LocationListResponse);
    }),

    route("POST", "/api/locations", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const parsed = validateLocationCreate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (!(await locationTypeExists(env.DB, parsed.value.locationTypeCode))) return BAD_TYPE();
      const id = crypto.randomUUID();
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertLocationStatement(env.DB, id, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "location_created", at, targetType: "location", targetId: id, detail: `${parsed.value.code} — ${parsed.value.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: loc_location\.code/.test(e.message)) return error(409, "code_taken", "Mã địa điểm này đã có.");
        throw e;
      }
      return json({ location: toDto((await findLocation(env.DB, id))!) } satisfies LocationResponse, 201, { location: "/locations" });
    }),

    route("PUT", "/api/locations/:id", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const id = params.id!;
      const current = UUID_RE.test(id) ? await findLocation(env.DB, id) : null;
      if (!current) return NOT_FOUND();
      const parsed = validateLocationUpdate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (!(await locationTypeExists(env.DB, parsed.value.locationTypeCode))) return BAD_TYPE();
      const at = new Date().toISOString();
      // ADR-0118 Đ4 / Ruling R-G: khoá `quickPickOrder` VẮNG = giữ số đang lưu (màn Địa điểm bản cũ không biết khoá này); `null` = bỏ chọn nhanh.
      const quickPick = parsed.value.quickPickOrder === undefined ? current.quick_pick_order : parsed.value.quickPickOrder;
      // ADR-0147 Đ1: cùng luật với quickPickOrder — khoá `zoneCode` VẮNG = giữ vùng đang lưu; `null` = bỏ xếp vùng; mã phải là vùng đang bật.
      const zone = parsed.value.zoneCode === undefined ? current.zone_code : parsed.value.zoneCode;
      if (zone !== null && zone !== current.zone_code && !(await vungDangBatTonTai(env.DB, zone))) return BAD_ZONE();
      let detail = current.code;
      if (quickPick !== current.quick_pick_order) detail += ` — chọn nhanh: ${current.quick_pick_order ?? "chưa có"} → ${quickPick ?? "bỏ"}`;
      if (zone !== current.zone_code) detail += ` — khu vực: ${current.zone_code ?? "chưa xếp"} → ${zone ?? "chưa xếp"}`;
      let results;
      try {
        results = await env.DB.batch([
          updateLocationStatement(env.DB, id, parsed.value, quickPick, zone, staff.id, at),
          // Chỉ ghi nhật ký khi UPDATE thật sự áp dụng (thắng khoá lạc quan).
          auditStatement(env.DB, { staffId: staff.id, action: "location_updated", at, targetType: "location", targetId: id, detail }, "changes() > 0"),
        ]);
      } catch (e) {
        // Lớp hai: trigger 0164 chặn gán vùng vừa bị ngưng giữa lúc kiểm và lúc ghi.
        if (e instanceof Error && /loc_location_zone_dang_bat/.test(e.message)) return BAD_ZONE();
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Địa điểm vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return json({ location: toDto((await findLocation(env.DB, id))!) } satisfies LocationResponse);
    }),

    route("POST", "/api/location-zones", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return CHI_QUAN_TRI();
      const parsed = kiemThanVungTao(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertVungStatement(env.DB, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "location_zone_created", at, targetType: "location", targetId: parsed.value.code, detail: `${parsed.value.code} — ${parsed.value.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: loc_zone\.code/.test(e.message)) return error(409, "code_taken", "Mã khu vực này đã có.");
        throw e;
      }
      return json({ zone: vungToDto((await findVung(env.DB, parsed.value.code))!) } satisfies VungDonResponse, 201, { location: "/locations" });
    }),

    route("PUT", "/api/location-zones/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return CHI_QUAN_TRI();
      const code = params.code!;
      const current = await findVung(env.DB, code);
      if (!current) return ZONE_NOT_FOUND();
      const parsed = kiemThanVungSua(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      if (!v.active && current.code === MA_NGOAI_VUNG) return error(409, "zone_required", "Khu vực «Ngoài khu vực» luôn bật, không ngưng được.");
      if (!v.active && current.active === 1 && current.so_dia_diem > 0) return error(409, "zone_in_use", "Khu vực còn địa điểm, hãy chuyển các địa điểm sang khu vực khác trước khi ngưng.");
      const at = new Date().toISOString();
      const doiTrangThai = (v.active ? 1 : 0) !== current.active ? (v.active ? " — bật lại" : " — ngưng") : "";
      let results;
      try {
        results = await env.DB.batch([
          updateVungStatement(env.DB, code, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "location_zone_updated", at, targetType: "location", targetId: code, detail: `${code} — ${v.name}${doiTrangThai}` }, "changes() > 0"),
        ]);
      } catch (e) {
        // Lớp hai: trigger 0164 chặn ngưng vùng vừa có địa điểm giữa lúc kiểm và lúc ghi.
        if (e instanceof Error && /loc_zone_con_dia_diem/.test(e.message)) return error(409, "zone_in_use", "Khu vực còn địa điểm, hãy chuyển các địa điểm sang khu vực khác trước khi ngưng.");
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Khu vực vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return json({ zone: vungToDto((await findVung(env.DB, code))!) } satisfies VungDonResponse);
    }),
  ],
};
