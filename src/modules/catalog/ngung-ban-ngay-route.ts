// Route «Ngừng bán theo ngày» (ADR-0220 Đ1, Đ4, Đ5). Mảng `ngungBanNgayRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`.
// Quyền: dùng lại ô `catalog.hidden.write` của nút «Ngừng bán» (Quản lý bán hàng, Quản trị, Toàn quyền), chặn tài khoản giữ quyền Đối tác; cổng thật ở thân route.
// Bảng chỉ thêm: đặt = MỘT dòng mới + nhật ký trong một lô; kết thúc = đặt mốc kết thúc một lần + nhật ký trong một lô (trigger lùi cả lô khi đã kết thúc).
// Số đơn đã xác nhận trong khoảng do gốc lắp ráp tiêm (`ctx.demDonTrongKhoangNgay`) — `catalog` không đọc bảng của `orders`; chỉ con số, không tên khách.
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, kemLocation, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { ngayDayDu, vnToday } from "../../shared/vn-date";
import type { CatalogNgungBanNgayDto, CatalogNgungBanNgayListResponse, CatalogNgungBanNgayResponse } from "../../shared/contracts";
import { cauKetThucKhoang, cauThemKhoang, khoangConChan, khoangTheoId, thanhKhoang, type KhoangRow } from "./ngung-ban-ngay-repo";
import { docKhoangMoi, trungNgungBanNgay, type TrungNgungBan } from "./ngung-ban-ngay-rules";
import { danhSachNhom, nhomHienHanhTheoMa } from "./nhom-repo";
import { loadAll } from "./repository";

const CAM = () => error(403, "forbidden", "Tài khoản này không đặt được Ngừng bán theo ngày.");
const duoc = (staff: Parameters<typeof can>[0]): boolean => can(staff, "catalog.hidden.write") && !holdsPartner(staff);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const khoangChu = (tu: string, den: string): string => (tu === den ? ngayDayDu(tu) : `${ngayDayDu(tu)} – ${ngayDayDu(den)}`);

async function tenTheoMa(db: D1Database): Promise<{ dichVu: Map<string, string>; nhom: Map<string, string> }> {
  const [items, nhoms] = await Promise.all([loadAll(db), danhSachNhom(db)]);
  return { dichVu: new Map(items.map((i) => [i.code, i.name])), nhom: new Map(nhoms.map((g) => [g.code, g.name])) };
}
const thanhDto = (r: KhoangRow, ten: { dichVu: Map<string, string>; nhom: Map<string, string> }): CatalogNgungBanNgayDto => {
  const ma = (r.scope === "SERVICE" ? r.catalog_code : r.group_code) ?? "";
  return { id: r.id, phamVi: r.scope, ma, ten: (r.scope === "SERVICE" ? ten.dichVu.get(ma) : ten.nhom.get(ma)) ?? ma, tuNgay: r.from_date, denNgay: r.to_date, ghiChu: r.note, taoLuc: r.created_at };
};

/**
 * CỔNG ADR-0220 Đ2, Đ3 — hàm công bố qua `index.ts` (`kiemNgungBanTheoNgay`): dòng dịch vụ đầu tiên (theo thứ tự trên đơn) có ngày khởi hành trúng một khoảng còn chặn,
 * hoặc `null`. KHÔNG tự kiểm quyền, không ngoại lệ theo người thao tác hay bên đặt. Không dòng nào có mã + ngày thì không truy vấn.
 */
export async function trungDauTien(db: D1Database, dong: readonly { catalogCode: string | null; ngay: string | null; name: string }[]): Promise<TrungNgungBan | null> {
  const xet = dong.filter((d) => d.catalogCode && d.ngay);
  if (xet.length === 0) return null;
  const nhoNhat = xet.reduce((m, d) => (d.ngay! < m ? d.ngay! : m), xet[0]!.ngay!);
  const khoang = await khoangConChan(db, nhoNhat);
  if (khoang.length === 0) return null;
  const nhom = khoang.some((k) => k.scope === "GROUP") ? await nhomHienHanhTheoMa(db) : new Map<string, string | null>();
  return trungNgungBanNgay({ khoang: khoang.map(thanhKhoang), dong: dong.map((d) => ({ ...d, nhom: d.catalogCode ? (nhom.get(d.catalogCode) ?? null) : null })) })[0] ?? null;
}

export const ngungBanNgayRoutes: Route[] = [
  // Khoảng còn chặn và chưa qua ngày cuối (khoảng đã qua, đã kết thúc: xem ở Nhật ký).
  route("GET", "/api/catalog/ngung-ban-ngay", "office", async ({ env, staff }) => {
    if (!duoc(staff)) return CAM();
    const [rows, ten] = await Promise.all([khoangConChan(env.DB, vnToday(new Date())), tenTheoMa(env.DB)]);
    return json({ khoang: rows.map((r) => thanhDto(r, ten)) } satisfies CatalogNgungBanNgayListResponse);
  }),

  route("POST", "/api/catalog/ngung-ban-ngay", "office", async ({ env, request, staff, demDonTrongKhoangNgay }) => {
    if (!duoc(staff)) return CAM();
    const doc = docKhoangMoi(await readJson(request), vnToday(new Date()));
    if (!doc.ok) return error(400, "invalid_input", doc.message);
    const k = doc.value;
    const [ten, nhomCuaMa] = await Promise.all([tenTheoMa(env.DB), nhomHienHanhTheoMa(env.DB)]);
    if (k.scope === "SERVICE" ? !ten.dichVu.has(k.ma) : !ten.nhom.has(k.ma)) return error(400, "invalid_input", k.scope === "SERVICE" ? "Mã dịch vụ không có trong danh mục." : "Nhóm dịch vụ không có.");
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    const tenDich = (k.scope === "SERVICE" ? ten.dichVu.get(k.ma) : ten.nhom.get(k.ma)) ?? k.ma;
    await env.DB.batch([
      cauThemKhoang(env.DB, { id, scope: k.scope, ma: k.ma, tuNgay: k.tuNgay, denNgay: k.denNgay, ghiChu: k.ghiChu, at, by: staff.id }),
      auditStatement(env.DB, {
        staffId: staff.id, action: "catalog_pause_added", at, targetType: "catalog", ...(k.scope === "SERVICE" ? { targetId: k.ma } : {}),
        detail: `${k.scope === "SERVICE" ? `Dịch vụ ${k.ma}` : `Nhóm ${tenDich}`}: ${khoangChu(k.tuNgay, k.denNgay)}`,
      }),
    ]);
    const ma = k.scope === "SERVICE" ? [k.ma] : [...nhomCuaMa].filter(([, g]) => g === k.ma).map(([code]) => code);
    const soDon = await demDonTrongKhoangNgay({ codes: ma, tuNgay: k.tuNgay, denNgay: k.denNgay });
    const dto: CatalogNgungBanNgayDto = { id, phamVi: k.scope, ma: k.ma, ten: tenDich, tuNgay: k.tuNgay, denNgay: k.denNgay, ghiChu: k.ghiChu, taoLuc: at };
    return kemLocation(json({ khoang: dto, soDonDaXacNhan: soDon } satisfies CatalogNgungBanNgayResponse, 201), "/catalog");
  }),

  route("POST", "/api/catalog/ngung-ban-ngay/:id/ket-thuc", "office", async ({ env, params, staff }) => {
    if (!duoc(staff)) return CAM();
    const id = params.id!;
    const r = UUID_RE.test(id) ? await khoangTheoId(env.DB, id) : null;
    if (!r) return error(404, "not_found", "Không tìm thấy khoảng ngừng bán.");
    const DA_KET_THUC = () => error(409, "already_ended", "Khoảng ngừng bán này đã kết thúc. Hãy tải lại.");
    if (r.ended_at !== null) return DA_KET_THUC();
    const at = new Date().toISOString();
    try {
      await env.DB.batch([
        cauKetThucKhoang(env.DB, { id, at, by: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: "catalog_pause_ended", at, targetType: "catalog", ...(r.scope === "SERVICE" && r.catalog_code ? { targetId: r.catalog_code } : {}),
          detail: `${r.scope === "SERVICE" ? `Dịch vụ ${r.catalog_code}` : `Nhóm ${r.group_code}`}: ${khoangChu(r.from_date, r.to_date)}`,
        }),
      ]);
    } catch (e) {
      if (/ctl_append_only/.test(String((e as Error)?.message ?? e))) return DA_KET_THUC();
      throw e;
    }
    return json({ id, daKetThuc: true });
  }),
];
