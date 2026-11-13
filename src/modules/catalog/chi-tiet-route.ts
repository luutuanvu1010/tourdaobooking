// Route chi tiết dịch vụ (ADR-0199 Đ1): tên hiển thị + mô tả do Nền tảng giữ. Mảng `chiTietRoutes` được `index.ts` trải vào trước `/api/catalog/:code`.
// Quyền: `admin.manage` (cùng người sửa giá ghi đè), hỏi DÒNG ĐẦU thân. Khuôn `nguon-ve-route.ts`: mỗi lần đổi chèn MỘT dòng chỉ-thêm với
// valid_from_at = max(lúc ghi, mới nhất + 1 ms) cùng nhật ký trong một lô; gửi đúng giá trị đang có = 200, không ghi; va UNIQUE → 409 `stale`.
// Nhật ký KHÔNG chép tên hay mô tả (chỉ nói trường nào đổi). Khoá ảnh (bước sau của ADR-0199 Đ3) được chép nguyên từ dòng cũ.
import { auditStatement } from "../audit";
import { can } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { CATALOG_CODE_RE } from "../../shared/order-lines";
import { cauTenSheetDoi, giongNhau, kiemChiTiet } from "../../shared/chi-tiet-dich-vu";
import type { CatalogChiTietResponse } from "../../shared/contracts";
import { cauThemChiTiet, chiTietHienHanh, chiTietMoiNhat } from "./chi-tiet-repo";
import { loadOne } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();
const CAM = () => error(403, "forbidden", "Chỉ quản trị viên được sửa chi tiết dịch vụ.");
const KHONG_CO = () => error(404, "not_found", "Không tìm thấy dịch vụ.");

async function doc(db: D1Database, ma: string, tenSheet: string): Promise<CatalogChiTietResponse> {
  const ct = (await chiTietHienHanh(db)).get(ma);
  return { ma, tenSheet, tenHienThi: ct?.tenHienThi ?? null, moTa: ct?.moTa ?? null, cauTenSheetDoi: cauTenSheetDoi(tenSheet, ct) };
}

export const chiTietRoutes: Route[] = [
  route("GET", "/api/catalog/:code/chi-tiet", "admin", async ({ env, params, staff }) => {
    if (!can(staff, "admin.manage")) return CAM();
    const item = params.code && CATALOG_CODE_RE.test(params.code) ? await loadOne(env.DB, params.code) : null;
    if (!item) return KHONG_CO();
    return json(await doc(env.DB, item.code, item.name));
  }),
  route("PUT", "/api/catalog/:code/chi-tiet", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage")) return CAM();
    const item = params.code && CATALOG_CODE_RE.test(params.code) ? await loadOne(env.DB, params.code) : null;
    if (!item) return KHONG_CO();
    const k = kiemChiTiet(await readJson(request));
    if (!k.ok) return error(400, "invalid_input", k.cau);
    const cu = (await chiTietHienHanh(env.DB)).get(item.code);
    if (!giongNhau(k.giaTri, cu)) {
      const doi = [k.giaTri.tenHienThi !== (cu?.tenHienThi ?? null) ? "tên hiển thị" : null, k.giaTri.moTa !== (cu?.moTa ?? null) ? "mô tả" : null].filter(Boolean).join(", ");
      const at = lanSau(await chiTietMoiNhat(env.DB), new Date());
      try {
        await env.DB.batch([
          cauThemChiTiet(env.DB, { id: crypto.randomUUID(), ma: item.code, tenHienThi: k.giaTri.tenHienThi, moTa: k.giaTri.moTa, khoaAnh: cu?.khoaAnh ?? null, tenSheet: item.name, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "service_detail_changed", at, targetType: "catalog", targetId: item.code, detail: `Dịch vụ ${item.code}: đổi ${doi}` }),
        ]);
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Chi tiết dịch vụ vừa được người khác sửa. Hãy tải lại rồi thử lại.");
        throw e;
      }
    }
    return json(await doc(env.DB, item.code, item.name));
  }),
];
