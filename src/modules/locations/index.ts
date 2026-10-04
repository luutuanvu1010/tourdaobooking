// Module locations — địa điểm phát sinh nghiệp vụ (văn phòng, quầy vé, bến tàu, bến cảng). Route: /api/locations*.
// Đáy đồ thị phụ thuộc (ADR-0002): chỉ dùng audit để ghi dấu vết. Module khác đọc nhãn địa điểm qua view công bố v_loc_location_label,
// KHÔNG import repository.ts. Thêm/sửa/ngưng dùng địa điểm chỉ quản trị viên (ADR-0007: "quản lý địa điểm" = ADMIN).
import { auditStatement } from "../audit";
import type { LocationDto, LocationListResponse, LocationResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { findLocation, insertLocationStatement, listLocationTypes, listLocations, locationTypeExists, updateLocationStatement, type LocationRow } from "./repository";
import { validateLocationCreate, validateLocationUpdate } from "./rules";

const toDto = (r: LocationRow): LocationDto => ({
  id: r.id,
  code: r.code,
  name: r.name,
  locationTypeCode: r.location_type_code,
  locationTypeName: r.type_name,
  address: r.address,
  sortOrder: r.sort_order,
  active: r.active === 1,
  updatedAt: r.updated_at,
});

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy địa điểm.");
const BAD_TYPE = () => error(400, "invalid_input", "Loại địa điểm không tồn tại.");

export const locationsModule: AppModule = {
  name: "locations",
  routes: [
    // Mọi tài khoản đăng nhập đọc được danh sách (nhãn không nhạy cảm; người làm việc ngoài hiện trường cũng cần thấy tên nơi).
    route("GET", "/api/locations", "staff", async ({ env }) => {
      const [rows, types] = await Promise.all([listLocations(env.DB), listLocationTypes(env.DB)]);
      return json({ locations: rows.map(toDto), types } satisfies LocationListResponse);
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
      const results = await env.DB.batch([
        updateLocationStatement(env.DB, id, parsed.value, staff.id, at),
        // Chỉ ghi nhật ký khi UPDATE thật sự áp dụng (thắng khoá lạc quan).
        auditStatement(env.DB, { staffId: staff.id, action: "location_updated", at, targetType: "location", targetId: id, detail: current.code }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Địa điểm vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return json({ location: toDto((await findLocation(env.DB, id))!) } satisfies LocationResponse);
    }),
  ],
};
