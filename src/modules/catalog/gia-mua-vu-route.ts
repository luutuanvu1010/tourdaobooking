// Route «Giá mùa vụ» (ADR-0229 Đ1, Đ3, Đ8). Mảng `giaMuaVuRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`.
// Quyền: ô `catalog.seasonal.write` (xem, đặt, kết thúc), `catalog.seasonal.approve` (duyệt quy tắc NGƯỜI KHÁC đặt), `catalog.seasonal.cap` (trần %, chỉ Toàn quyền);
// tài khoản giữ quyền Đối tác bị từ chối dù tài khoản lai. Mỗi lệnh = MỘT câu ghi + nhật ký trong một lô; trigger lùi cả lô khi trạng thái đã đổi (hai người cùng bấm).
// Luật thuần dùng chung với form xem trước: `src/shared/gia-mua-vu.ts` (một nơi tính — Đ4).
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, kemLocation, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { ngayDayDu, vnToday } from "../../shared/vn-date";
import { kiemChongNgay, kiemQuyTacMoi, type LoiQuyTacMuaVu } from "../../shared/gia-mua-vu";
import type { CatalogGiaMuaVuDto, CatalogGiaMuaVuListResponse, CatalogGiaMuaVuResponse, CatalogGiaMuaVuTranResponse } from "../../shared/contracts";
import {
  cauDatTran, cauDuyetQuyTac, cauKetThucQuyTac, cauThemQuyTac, quyTacChuaKetThuc, quyTacCungMa, quyTacTheoId, thanhQuyTac, tranHienHanh, type QuyTacRow,
} from "./gia-mua-vu-repo";
import { danhSachNhom } from "./nhom-repo";
import { loadAll } from "./repository";

const CAM = () => error(403, "forbidden", "Tài khoản này không đặt được giá mùa vụ.");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const khoangChu = (tu: string, den: string): string => (tu === den ? ngayDayDu(tu) : `${ngayDayDu(tu)} – ${ngayDayDu(den)}`);
const dongVn = (n: number): string => `${n.toLocaleString("vi-VN")} đ`;
/** «+10 % +20.000 đ» — mức tăng của một quy tắc, dùng cho nhật ký và câu báo. */
export const mucTangChu = (q: { phanTram: number; soTien: number }): string =>
  [q.phanTram > 0 ? `+${q.phanTram} %` : "", q.soTien > 0 ? `+${dongVn(q.soTien)}` : ""].filter(Boolean).join(" ");

const LOI: Record<LoiQuyTacMuaVu, (tran: number) => string> = {
  phan_tram: () => "Phần trăm tăng phải là số nguyên từ 0 trở lên.",
  so_tien: () => "Số tiền tăng phải là số đồng nguyên từ 0 trở lên.",
  khong_tang: () => "Nhập phần trăm hoặc số tiền tăng (ít nhất một số lớn hơn 0).",
  vuot_tran: (tran) => `Phần trăm tăng vượt mức tối đa ${tran} %.`,
  khoang_ngay: () => "Chọn ngày đầu và ngày cuối; ngày cuối không được trước ngày đầu.",
  qua_khu: () => "Ngày cuối đã qua.",
};

async function tenTheoMa(db: D1Database): Promise<{ dichVu: Map<string, string>; nhom: Map<string, string> }> {
  const [items, nhoms] = await Promise.all([loadAll(db), danhSachNhom(db)]);
  return { dichVu: new Map(items.map((i) => [i.code, i.name])), nhom: new Map(nhoms.map((g) => [g.code, g.name])) };
}
const thanhDto = (r: QuyTacRow, ten: { dichVu: Map<string, string>; nhom: Map<string, string> }, toi: string): CatalogGiaMuaVuDto => {
  const ma = (r.scope === "SERVICE" ? r.catalog_code : r.group_code) ?? "";
  return {
    id: r.id, phamVi: r.scope, ma, ten: (r.scope === "SERVICE" ? ten.dichVu.get(ma) : ten.nhom.get(ma)) ?? ma, tuNgay: r.from_date, denNgay: r.to_date,
    phanTram: r.pct, soTien: r.amount, ghiChu: r.note, taoLuc: r.created_at, daDuyet: r.approved_at !== null, duyetLuc: r.approved_at, cuaToi: r.created_by === toi,
  };
};
const chiTietNhatKy = (r: { scope: string; ma: string; tenNhom: string; tu: string; den: string; phanTram: number; soTien: number }): string =>
  `${r.scope === "SERVICE" ? `Dịch vụ ${r.ma}` : `Nhóm ${r.tenNhom}`}: ${khoangChu(r.tu, r.den)}, ${mucTangChu(r)}`;
const loiTrigger = (e: unknown): boolean => /ctl_append_only|ctl_seasonal_overlap|CHECK constraint/.test(String((e as Error)?.message ?? e));

export const giaMuaVuRoutes: Route[] = [
  // Quy tắc chưa kết thúc, chưa qua ngày cuối (chờ duyệt và đang áp) + trần %. Đã kết thúc / đã qua: xem ở Nhật ký.
  route("GET", "/api/catalog/gia-mua-vu", "office", async ({ env, staff }) => {
    if (!can(staff, "catalog.seasonal.write") || holdsPartner(staff)) return CAM();
    const [rows, ten, tran] = await Promise.all([quyTacChuaKetThuc(env.DB, vnToday(new Date())), tenTheoMa(env.DB), tranHienHanh(env.DB)]);
    return json({ quyTac: rows.map((r) => thanhDto(r, ten, staff.id)), tranPhanTram: tran } satisfies CatalogGiaMuaVuListResponse);
  }),

  route("POST", "/api/catalog/gia-mua-vu", "office", async ({ env, request, staff }) => {
    if (!can(staff, "catalog.seasonal.write") || holdsPartner(staff)) return CAM();
    const b = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    if (b.phamVi !== "SERVICE" && b.phamVi !== "GROUP") return error(400, "invalid_input", "Chọn giá mùa vụ cho một dịch vụ hoặc một nhóm.");
    if (typeof b.ma !== "string" || b.ma.trim() === "") return error(400, "invalid_input", b.phamVi === "GROUP" ? "Chọn nhóm dịch vụ." : "Chọn dịch vụ.");
    let ghiChu: string | null = null;
    if (b.ghiChu !== undefined && b.ghiChu !== null) {
      if (typeof b.ghiChu !== "string" || b.ghiChu.trim().length > 200) return error(400, "invalid_input", "Ghi chú tối đa 200 ký tự.");
      ghiChu = b.ghiChu.trim() || null;
    }
    const tran = await tranHienHanh(env.DB);
    const loi = kiemQuyTacMoi({ phanTram: b.phanTram, soTien: b.soTien, tu: b.tuNgay, den: b.denNgay }, { tranPhanTram: tran, homNay: vnToday(new Date()) });
    if (loi) return error(400, "invalid_input", LOI[loi](tran));
    const phamVi = b.phamVi, ma = b.ma.trim(), tuNgay = b.tuNgay as string, denNgay = b.denNgay as string, phanTram = b.phanTram as number, soTien = b.soTien as number;
    const ten = await tenTheoMa(env.DB);
    if (phamVi === "SERVICE" ? !ten.dichVu.has(ma) : !ten.nhom.has(ma)) return error(400, "invalid_input", phamVi === "SERVICE" ? "Mã dịch vụ không có trong danh mục." : "Nhóm dịch vụ không có.");
    const trung = kiemChongNgay({ phamVi, ma, tu: tuNgay, den: denNgay }, (await quyTacCungMa(env.DB, phamVi, ma)).map(thanhQuyTac));
    const CHONG = () => error(409, "seasonal_overlap", "Đã có giá mùa vụ (đang áp hoặc chờ duyệt) cho cùng dịch vụ hoặc nhóm này trong khoảng ngày đã chọn. Kết thúc quy tắc cũ trước.");
    if (trung) return CHONG();
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    try {
      await env.DB.batch([
        cauThemQuyTac(env.DB, { id, scope: phamVi, ma, tuNgay, denNgay, phanTram, soTien, ghiChu, at, by: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: "catalog_seasonal_added", at, targetType: "catalog", ...(phamVi === "SERVICE" ? { targetId: ma } : {}),
          detail: chiTietNhatKy({ scope: phamVi, ma, tenNhom: ten.nhom.get(ma) ?? ma, tu: tuNgay, den: denNgay, phanTram, soTien }),
        }),
      ]);
    } catch (e) {
      if (/ctl_seasonal_overlap/.test(String((e as Error)?.message ?? e))) return CHONG();
      throw e;
    }
    const r = (await quyTacTheoId(env.DB, id))!;
    return kemLocation(json({ quyTac: thanhDto(r, ten, staff.id) } satisfies CatalogGiaMuaVuResponse, 201), "/catalog");
  }),

  // Duyệt (10c): người duyệt KHÁC người đặt; kiểm lại trần %, chồng ngày (quy tắc khác chưa kết thúc), ngày cuối chưa qua, quy tắc chưa kết thúc (Đ1).
  route("POST", "/api/catalog/gia-mua-vu/:id/duyet", "office", async ({ env, params, staff }) => {
    if (!can(staff, "catalog.seasonal.approve") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không duyệt được giá mùa vụ.");
    const id = params.id!;
    const r = UUID_RE.test(id) ? await quyTacTheoId(env.DB, id) : null;
    if (!r) return error(404, "not_found", "Không tìm thấy quy tắc giá mùa vụ.");
    const DOI = () => error(409, "seasonal_state_changed", "Quy tắc này đã được duyệt hoặc đã kết thúc. Hãy tải lại.");
    if (r.approved_at !== null || r.ended_at !== null) return DOI();
    if (r.created_by === staff.id) return error(409, "seasonal_self_approve", "Người đặt giá mùa vụ không tự duyệt được; cần người khác duyệt.");
    if (r.to_date < vnToday(new Date())) return error(409, "seasonal_expired", "Ngày cuối của quy tắc này đã qua; không duyệt được.");
    const tran = await tranHienHanh(env.DB);
    if (r.pct > tran) return error(409, "seasonal_over_cap", `Phần trăm tăng vượt mức tối đa hiện hành ${tran} %.`);
    const khac = (await quyTacCungMa(env.DB, r.scope, (r.scope === "SERVICE" ? r.catalog_code : r.group_code) ?? "")).filter((x) => x.id !== r.id).map(thanhQuyTac);
    if (kiemChongNgay({ phamVi: r.scope, ma: thanhQuyTac(r).ma, tu: r.from_date, den: r.to_date }, khac)) {
      return error(409, "seasonal_overlap", "Có quy tắc khác chưa kết thúc chồng khoảng ngày này.");
    }
    const at = new Date().toISOString();
    const ten = await tenTheoMa(env.DB);
    const q = thanhQuyTac(r);
    try {
      await env.DB.batch([
        cauDuyetQuyTac(env.DB, { id, at, by: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: "catalog_seasonal_approved", at, targetType: "catalog", ...(r.scope === "SERVICE" && r.catalog_code ? { targetId: r.catalog_code } : {}),
          detail: chiTietNhatKy({ scope: r.scope, ma: q.ma, tenNhom: ten.nhom.get(q.ma) ?? q.ma, tu: r.from_date, den: r.to_date, phanTram: r.pct, soTien: r.amount }),
        }),
      ]);
    } catch (e) {
      if (loiTrigger(e)) return DOI();
      throw e;
    }
    return json({ quyTac: thanhDto((await quyTacTheoId(env.DB, id))!, ten, staff.id) } satisfies CatalogGiaMuaVuResponse);
  }),

  // Kết thúc (cả quy tắc chờ duyệt — Đ1: để bản bị bỏ quên không chặn khoảng ngày mãi). Đơn đã chụp giữ nguyên tiền.
  route("POST", "/api/catalog/gia-mua-vu/:id/ket-thuc", "office", async ({ env, params, staff }) => {
    if (!can(staff, "catalog.seasonal.write") || holdsPartner(staff)) return CAM();
    const id = params.id!;
    const r = UUID_RE.test(id) ? await quyTacTheoId(env.DB, id) : null;
    if (!r) return error(404, "not_found", "Không tìm thấy quy tắc giá mùa vụ.");
    const DA = () => error(409, "already_ended", "Quy tắc giá mùa vụ này đã kết thúc. Hãy tải lại.");
    if (r.ended_at !== null) return DA();
    const at = new Date().toISOString();
    const q = thanhQuyTac(r);
    const ten = await tenTheoMa(env.DB);
    try {
      await env.DB.batch([
        cauKetThucQuyTac(env.DB, { id, at, by: staff.id }),
        auditStatement(env.DB, {
          staffId: staff.id, action: "catalog_seasonal_ended", at, targetType: "catalog", ...(r.scope === "SERVICE" && r.catalog_code ? { targetId: r.catalog_code } : {}),
          detail: chiTietNhatKy({ scope: r.scope, ma: q.ma, tenNhom: ten.nhom.get(q.ma) ?? q.ma, tu: r.from_date, den: r.to_date, phanTram: r.pct, soTien: r.amount }),
        }),
      ]);
    } catch (e) {
      if (loiTrigger(e)) return DA();
      throw e;
    }
    return json({ id, daKetThuc: true });
  }),

  // Trần % (Đ8): chỉ Toàn quyền. Hạ trần không đổi quy tắc đã duyệt; quy tắc mới và lần duyệt sau so với trần mới.
  route("POST", "/api/catalog/gia-mua-vu/tran", "office", async ({ env, request, staff }) => {
    if (!can(staff, "catalog.seasonal.cap") || holdsPartner(staff)) return error(403, "forbidden", "Chỉ Toàn quyền đặt được mức tăng tối đa của giá mùa vụ.");
    const v = ((await readJson(request)) as { tranPhanTram?: unknown } | null)?.tranPhanTram;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) return error(400, "invalid_input", "Mức tăng tối đa là số nguyên từ 0 đến 100.");
    const at = new Date().toISOString();
    await env.DB.batch([
      cauDatTran(env.DB, { id: crypto.randomUUID(), maxPct: v, at, by: staff.id }),
      auditStatement(env.DB, { staffId: staff.id, action: "catalog_seasonal_cap_set", at, targetType: "catalog", detail: `Mức tăng tối đa: ${v} %` }),
    ]);
    return json({ tranPhanTram: v } satisfies CatalogGiaMuaVuTranResponse);
  }),
];
