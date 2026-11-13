// Route ảnh đại diện dịch vụ (ADR-0199 Đ3). Mảng `anhRoutes` được `index.ts` trải vào trước `/api/catalog/:code`.
// Tải lên / gỡ: cổng admin + `admin.manage` dòng đầu thân → chặn Content-Length TRƯỚC khi đọc thân → kiểm ảnh (luật thuần) → đặt kho (kho-anh.ts) → MỘT lô D1: dòng chi tiết
// mới (giữ tên hiển thị, mô tả; khoá ảnh mới hoặc null) + nhật ký. Xem: cổng office (người lập đơn văn phòng), không nhật ký (ảnh không riêng tư — Đ3 mục 2).
import { auditStatement } from "../audit";
import { can } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { CATALOG_CODE_RE } from "../../shared/order-lines";
import { TOI_DA_THAN_ANH, CAU_ANH_QUA_CO, kiemAnhDichVu } from "../../shared/anh-dich-vu";
import { taoKhoaNgauNhien } from "../../shared/tep-dinh-kem";
import { cauThemChiTiet, chiTietHienHanh, chiTietMoiNhat } from "./chi-tiet-repo";
import { docChiTiet } from "./chi-tiet-route";
import { datAnh, docAnh } from "./kho-anh";
import { loadOne } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();
const KHO_CHUA_BAT = () => error(503, "storage_unavailable", "Kho ảnh dịch vụ chưa sẵn sàng. Báo quản trị kỹ thuật.");
const KHONG_CO = () => error(404, "not_found", "Không tìm thấy dịch vụ.");

export const anhRoutes: Route[] = [
  route("PUT", "/api/catalog/:code/anh", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được đổi ảnh đại diện dịch vụ.");
    if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN_ANH) return error(413, "file_too_large", CAU_ANH_QUA_CO);
    const item = params.code && CATALOG_CODE_RE.test(params.code) ? await loadOne(env.DB, params.code) : null;
    if (!item) return KHONG_CO();
    const kho = env.ANH_DICH_VU;
    if (!kho) return KHO_CHUA_BAT();
    const k = kiemAnhDichVu(await readJson(request));
    if (!k.ok) return error(k.status, k.code, k.message);
    const cu = (await chiTietHienHanh(env.DB)).get(item.code);
    if (k.tep === null && !cu?.khoaAnh) return json(await docChiTiet(env.DB, item.code, item.name)); // gỡ khi chưa có ảnh: không ghi
    let khoa: string | null = null;
    if (k.tep) {
      khoa = taoKhoaNgauNhien("anh");
      if (!(await datAnh(kho, khoa, k.tep.bytes, k.tep.loai))) return error(503, "storage_unavailable", "Chưa lưu được ảnh vào kho. Hãy thử lại.");
    }
    const at = lanSau(await chiTietMoiNhat(env.DB), new Date());
    try {
      await env.DB.batch([
        cauThemChiTiet(env.DB, { id: crypto.randomUUID(), ma: item.code, tenHienThi: cu?.tenHienThi ?? null, moTa: cu?.moTa ?? null, khoaAnh: khoa, tenSheet: item.name, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "service_detail_changed", at, targetType: "catalog", targetId: item.code, detail: `Dịch vụ ${item.code}: ${khoa ? "đổi ảnh đại diện" : "gỡ ảnh đại diện"}` }),
      ]);
    } catch (e) {
      if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Chi tiết dịch vụ vừa được người khác sửa. Hãy tải lại rồi thử lại.");
      throw e;
    }
    return json(await docChiTiet(env.DB, item.code, item.name));
  }),
  route("GET", "/api/catalog/:code/anh", "office", async ({ env, params, staff }) => {
    if (!can(staff, "money.view", { ownerId: staff.id })) return error(403, "forbidden", "Tài khoản này không xem được danh mục dịch vụ.");
    const ma = params.code && CATALOG_CODE_RE.test(params.code) ? params.code : null;
    if (!ma) return KHONG_CO();
    const khoa = (await chiTietHienHanh(env.DB)).get(ma)?.khoaAnh;
    if (!khoa) return error(404, "not_found", "Dịch vụ chưa có ảnh đại diện.");
    const kho = env.ANH_DICH_VU;
    if (!kho) return KHO_CHUA_BAT();
    const anh = await docAnh(kho, khoa);
    if (!anh) return error(404, "not_found", "Không tìm thấy ảnh đại diện.");
    return new Response(anh.body, {
      headers: {
        "content-type": anh.loaiNoiDung,
        "cache-control": "private, max-age=86400", // đường có dấu phiên bản (?v=) — đổi ảnh là đổi đường
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  }),
];
