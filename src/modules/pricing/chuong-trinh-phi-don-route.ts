// Route CHƯƠNG TRÌNH MIỄN PHÍ ĐƯA ĐÓN (ADR-0218 Đ2; kế hoạch 2026-11-18 Task 4). Mọi route: cổng `admin` + ô `admin.manage` ở dòng đầu thân (Quản trị, Toàn quyền).
// Tạo = MỘT `db.batch` (chương trình + các dòng phạm vi + nhật ký); kết thúc = đặt `ended_at`, không xoá, không sửa tại chỗ. Có hiệu lực ngay khi tạo; chỉ ảnh hưởng đơn CHƯA xác nhận (Đợt 2).
// Nhật ký ghi tên chương trình, khoảng ngày đi, số dịch vụ / đối tác trong phạm vi — không tên khách, SĐT, email, MST.
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { error, json, kemLocation, readJson } from "../../shared/http";
import type { ChuongTrinhPhiDonDto, ChuongTrinhPhiDonGhiResponse, ChuongTrinhPhiDonResponse } from "../../shared/contracts";
import { can } from "../../shared/permissions";
import { route, type Route } from "../../shared/router";
import { ngayDayDu, vnToday } from "../../shared/vn-date";
import { cauKetThucChuongTrinh, cauThemChuongTrinh, cauThemPhamViChuongTrinh, chuongTrinhPhiDonDanhSach, chuongTrinhPhiDonTheoId, hoSoCoThat, type DongChuongTrinh } from "./chuong-trinh-phi-don-repo";
import { laNgay } from "./rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ Quản trị và Toàn quyền được xem và đặt chương trình miễn phí đưa đón.");
const MAX_PHAM_VI = 200;
const SAI = (m: string) => error(400, "invalid_input", m);

async function dto(db: D1Database, cs: readonly DongChuongTrinh[]): Promise<ChuongTrinhPhiDonDto[]> {
  const ma = [...new Set(cs.flatMap((c) => c.services))];
  const dv = ma.length ? await getEffectiveServices(db, ma) : new Map<string, { name: string }>();
  return cs.map((c) => ({
    id: c.id, ten: c.name, phamVi: c.scope, tuNgay: c.tripFrom, denNgay: c.tripTo, gomXeRieng: c.includePrivate,
    dichVu: c.services.map((code) => ({ code, name: dv.get(code)?.name ?? code })), doiTac: c.doiTac, taoLuc: c.createdAt, ketThucLuc: c.ketThucLuc,
  }));
}

export const chuongTrinhPhiDonRoutes: Route[] = [
  // Còn hiệu lực + đã kết thúc trong 30 ngày gần nhất.
  route("GET", "/api/pricing/chuong-trinh-phi-don", "admin", async ({ env, staff }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const tu = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return json({ chuongTrinh: await dto(env.DB, await chuongTrinhPhiDonDanhSach(env.DB, tu)) } satisfies ChuongTrinhPhiDonResponse);
  }),

  route("POST", "/api/pricing/chuong-trinh-phi-don", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const b = await readJson(request);
    if (!b || typeof b !== "object") return SAI("Thân yêu cầu không hợp lệ.");
    const r = b as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 1 || name.length > 120) return SAI("Tên chương trình phải từ 1 đến 120 ký tự.");
    if (r.scope !== "ALL" && r.scope !== "SERVICES" && r.scope !== "PARTNERS") return SAI("Chọn phạm vi: tất cả dịch vụ, một số dịch vụ hoặc một số đối tác.");
    if (typeof r.includePrivate !== "boolean") return SAI("Chọn có gồm xe riêng hay không.");
    if (!laNgay(r.tripFrom) || !laNgay(r.tripTo)) return SAI("Ngày đi không hợp lệ.");
    if (r.tripTo < r.tripFrom) return SAI("Ngày đi đến phải sau hoặc bằng ngày đi từ.");
    if (r.tripTo < vnToday(new Date())) return SAI("Khoảng ngày đi đã qua hết — chương trình sẽ không áp cho đơn nào.");
    const lay = (k: "services" | "parties"): string[] | null => {
      const v = r[k];
      if (v === undefined || v === null) return [];
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x === "" || x.length > 80)) return null;
      return [...new Set(v as string[])];
    };
    const services = lay("services");
    const parties = lay("parties");
    if (services === null || parties === null) return SAI("Danh sách dịch vụ hoặc đối tác không hợp lệ.");
    if (r.scope === "ALL" && (services.length || parties.length)) return SAI("Phạm vi «tất cả dịch vụ» không kèm danh sách.");
    if (r.scope === "SERVICES" && (services.length < 1 || services.length > MAX_PHAM_VI || parties.length)) return SAI(`Chọn từ 1 đến ${MAX_PHAM_VI} dịch vụ.`);
    if (r.scope === "PARTNERS" && (parties.length < 1 || parties.length > MAX_PHAM_VI || services.length)) return SAI(`Chọn từ 1 đến ${MAX_PHAM_VI} đối tác.`);
    if (services.length) {
      const co = await getEffectiveServices(env.DB, services);
      if (services.some((c) => !co.has(c))) return SAI("Có dịch vụ không có trong danh mục.");
    }
    if (parties.length) {
      const co = await hoSoCoThat(env.DB, parties);
      if (parties.some((p) => !co.has(p))) return SAI("Có hồ sơ đối tác không tồn tại.");
    }
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    const phamVi = r.scope === "ALL" ? "tất cả dịch vụ" : r.scope === "SERVICES" ? `${services.length} dịch vụ` : `${parties.length} đối tác`;
    await env.DB.batch([
      cauThemChuongTrinh(env.DB, { id, name, scope: r.scope, tripFrom: r.tripFrom, tripTo: r.tripTo, includePrivate: r.includePrivate, at, by: staff.id }),
      ...services.map((c) => cauThemPhamViChuongTrinh(env.DB, { programId: id, catalogCode: c, partyId: null, at, by: staff.id })),
      ...parties.map((p) => cauThemPhamViChuongTrinh(env.DB, { programId: id, catalogCode: null, partyId: p, at, by: staff.id })),
      auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_program_created", at, targetType: "ledger", targetId: id,
        detail: `${name} · ngày đi từ ${ngayDayDu(r.tripFrom)} đến ${ngayDayDu(r.tripTo)} · ${phamVi} · ${r.includePrivate ? "gồm xe riêng" : "không gồm xe riêng"}` }),
    ]);
    const moi = (await chuongTrinhPhiDonTheoId(env.DB, id))!;
    return kemLocation(json({ chuongTrinh: (await dto(env.DB, [moi]))[0]! } satisfies ChuongTrinhPhiDonGhiResponse, 201), "/phi-don");
  }),

  route("POST", "/api/pricing/chuong-trinh-phi-don/:id/ket-thuc", "admin", async ({ env, params, staff }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const id = params.id!;
    const c = await chuongTrinhPhiDonTheoId(env.DB, id);
    if (!c) return error(404, "not_found", "Không tìm thấy chương trình này.");
    if (c.ketThucLuc !== null) return error(409, "stale", "Chương trình này đã kết thúc rồi.");
    const at = new Date().toISOString();
    const res = await env.DB.batch([
      cauKetThucChuongTrinh(env.DB, { id, at, by: staff.id }),
      auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_program_ended", at, targetType: "ledger", targetId: id, detail: `${c.name} · kết thúc ${ngayDayDu(vnToday(new Date()))}` }, "changes() > 0"),
    ]);
    if ((res[0]?.meta.changes ?? 0) === 0) return error(409, "stale", "Chương trình này đã kết thúc rồi.");
    return json({ chuongTrinh: (await dto(env.DB, [(await chuongTrinhPhiDonTheoId(env.DB, id))!]))[0]! } satisfies ChuongTrinhPhiDonGhiResponse);
  }),
];
