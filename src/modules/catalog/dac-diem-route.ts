// Route ĐẶC ĐIỂM DỊCH VỤ (ADR-0152 Đ1, Đ3, Đ4 nhật ký, Đ5; kế hoạch 2026-10-30 R-6, T7). Mảng `dacDiemRoutes` được `index.ts` trải vào ĐẦU danh sách route của module — trước mọi
// route `/api/catalog/:code…`. Định nghĩa đặc điểm / giá trị và gắn THEO NHÓM: cổng `admin` + `admin.manage`; gắn cho MỘT dịch vụ: cổng `office` + `catalog.attribute.assign`; đọc: một
// trong hai ô. Tài khoản giữ quyền Đối tác (kể cả lai) bị chặn ở mọi route mới (chủ chọn Q-2 (a)). Không đọc `pricing` (catalog chỉ phụ thuộc audit): cảnh báo «còn N luật bán» là việc
// của giao diện (Đ4 mục 2). Mọi SQL ở `dac-diem-repo.ts` (hàng rào (f)); dữ liệu + nhật ký MỘT `db.batch`, nhật ký chỉ ghi khi câu chốt đổi dòng.
import { auditStatement } from "../audit";
import type {
  CatalogDacDiemDemResponse, CatalogDacDiemGanResponse, CatalogDacDiemMotResponse, CatalogDacDiemResponse, DacDiemDto,
} from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { route, type Route } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { CATALOG_CODE_RE } from "../../shared/order-lines";
import {
  dacDiemTheoMa, danhSachDacDiem, danhSachGiaTri, demGanMoCuaDacDiem, demGanMoCuaGiaTri, dichVuChoDacDiem, doiGiaTriStatements, giaTriHieuLucTatCa, giaTriNhomDangMo,
  giaTriRiengDangMo, giaTriTheoMa, giaTriTheoNhomDangMo, suaDacDiem, suaGiaTri, themDacDiemStatements, themGiaTri, type DacDiemRow, type GiaTriRow,
} from "./dac-diem-repo";
import { MA_DAC_DIEM_RE, MA_GIA_TRI_RE, chuaKhai, kiemTenDacDiem, kiemTenGiaTri, maDacDiemMoi, maGiaTriMoi, moiTheoNhom, type DichVuDacDiem } from "./dac-diem-rules";
import { danhSachNhom, nhomHienHanhTheoMa, nhomTheoMa } from "./nhom-repo";
import { loadAll } from "./repository";

const THU_TU_TOI_DA = 9999;
const laThuTu = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= THU_TU_TOI_DA;
const LOI_THU_TU = `Thứ tự phải là số nguyên từ 0 đến ${THU_TU_TOI_DA}.`;
const CAM_DINH_NGHIA = () => error(403, "forbidden", "Chỉ Quản trị, Toàn quyền định nghĩa đặc điểm và gắn giá trị chung cho nhóm.");
const CAM_GAN = () => error(403, "forbidden", "Chỉ Bán hàng, Quản trị, Toàn quyền gắn đặc điểm cho dịch vụ.");
const CAM_XEM = () => error(403, "forbidden", "Tài khoản này không xem được đặc điểm dịch vụ.");
const KHONG_CO_DD = () => error(404, "not_found", "Không tìm thấy đặc điểm này.");
const KHONG_CO_GT = () => error(404, "not_found", "Không tìm thấy giá trị này.");
const VUA_DOI = () => error(409, "stale", "Đặc điểm vừa được người khác sửa. Tải lại rồi thử lại.");
const GAN_VUA_DOI = () => error(409, "stale", "Giá trị đặc điểm vừa được người khác đổi. Tải lại rồi thử lại.");
const CON_DUNG = (n: number, cai: string) => error(409, "attribute_in_use", `${cai} còn ${n} dịch vụ hoặc nhóm đang mang — bỏ giá trị ở các dịch vụ, nhóm đó trước khi tắt.`);
/** Trigger R-8 của 0128 (lưới khi đua giữa đếm và ghi) → cùng câu với kiểm ở route. */
const laConDung = (e: unknown) => /\bctl_attribute_in_use:/.test(e instanceof Error ? e.message : String(e));

const dtoDacDiem = (a: DacDiemRow, gt: readonly GiaTriRow[], chua: string[]): DacDiemDto => ({
  code: a.code, ten: a.name, thuTu: a.sort_order, dangDung: a.active === 1, capNhatLuc: a.updated_at, chuaKhai: chua,
  giaTri: gt.filter((v) => v.attribute_code === a.code).map((v) => ({ code: v.code, ten: v.name, thuTu: v.sort_order, dangDung: v.active === 1, capNhatLuc: v.updated_at })),
});
const dichVuXet = async (db: D1Database): Promise<DichVuDacDiem[]> =>
  (await dichVuChoDacDiem(db)).map((r) => ({ code: r.code, inSheet: r.in_sheet === 1, hidden: r.hidden === 1, firstSeenAt: r.first_seen_at }));

/** Toàn bộ dữ liệu màn Đặc điểm dịch vụ (Đ5: «chưa khai», «mới, đang theo nhóm» tính lúc đọc trên view — một nguồn sự thật). */
async function docManDacDiem(db: D1Database): Promise<CatalogDacDiemResponse> {
  const homNay = vnToday(new Date());
  const [dd, gt, hl, dv, items, nhomCuaDv, nhoms, ganNhom] = await Promise.all([
    danhSachDacDiem(db), danhSachGiaTri(db), giaTriHieuLucTatCa(db), dichVuXet(db), loadAll(db), nhomHienHanhTheoMa(db), danhSachNhom(db), giaTriTheoNhomDangMo(db),
  ]);
  const hieuLuc = hl.map((r) => ({ catalogCode: r.catalog_code, attributeCode: r.attribute_code, source: r.source }));
  const theoDv = new Map<string, Record<string, { valueCode: string; nguon: "SERVICE" | "GROUP" }>>();
  for (const r of hl) theoDv.set(r.catalog_code, { ...(theoDv.get(r.catalog_code) ?? {}), [r.attribute_code]: { valueCode: r.value_code, nguon: r.source } });
  const dangBan = new Map(dv.map((d) => [d.code, d.inSheet && !d.hidden]));
  const theoNhom = new Map<string, Record<string, string>>();
  for (const r of ganNhom) theoNhom.set(r.group_code, { ...(theoNhom.get(r.group_code) ?? {}), [r.attribute_code]: r.value_code });
  return {
    homNay,
    dacDiem: dd.map((a) => dtoDacDiem(a, gt, chuaKhai(dv, hieuLuc, a.code))),
    dichVu: items.map((i) => ({ code: i.code, ten: i.name, dangBan: dangBan.get(i.code) ?? false, groupCode: nhomCuaDv.get(i.code) ?? null, giaTri: theoDv.get(i.code) ?? {} })),
    nhom: nhoms.map((g) => ({ code: g.code, ten: g.name, dangDung: g.active === 1, giaTri: theoNhom.get(g.code) ?? {} })),
    moiTheoNhom: moiTheoNhom(dv, hieuLuc, homNay),
  };
}
async function motDacDiem(db: D1Database, code: string): Promise<CatalogDacDiemMotResponse | null> {
  const a = await dacDiemTheoMa(db, code);
  if (!a) return null;
  const [gt, hl, dv] = await Promise.all([danhSachGiaTri(db), giaTriHieuLucTatCa(db), dichVuXet(db)]);
  return { dacDiem: dtoDacDiem(a, gt, chuaKhai(dv, hl.map((r) => ({ catalogCode: r.catalog_code, attributeCode: r.attribute_code })), a.code)) };
}
/** Tên một giá trị (cùng đặc điểm), hoặc chữ thay khi trống. */
const tenGt = (gt: readonly GiaTriRow[], code: string | null, trong: string) => (code === null ? trong : (gt.find((v) => v.code === code)?.name ?? code));

/** Thân của PUT gắn (dịch vụ / nhóm): `giaTri` mới (`null` = bỏ) và `dangThay` = giá trị RIÊNG đang thấy (`null` = chưa có) — khoá lạc quan theo giá trị. */
function docThanGan(body: unknown): { giaTri: string | null; dangThay: string | null } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const ma = (x: unknown): x is string | null => x === null || (typeof x === "string" && MA_GIA_TRI_RE.test(x));
  return ma(b.giaTri) && ma(b.dangThay) ? { giaTri: b.giaTri, dangThay: b.dangThay } : null;
}

/** Kiểm giá trị mới (thuộc đặc điểm, đang dùng) và đặc điểm đang dùng — trước khi ghi (trigger 0128 là lưới). */
async function kiemGiaTriMoi(db: D1Database, attr: DacDiemRow, giaTri: string | null): Promise<Response | null> {
  if (giaTri === null) return null;
  if (attr.active !== 1) return error(409, "attribute_inactive", "Đặc điểm này đang tắt — bật lại trước khi gắn giá trị.");
  const v = await giaTriTheoMa(db, giaTri);
  if (!v || v.attribute_code !== attr.code) return error(400, "invalid_input", "Giá trị không thuộc đặc điểm này.");
  if (v.active !== 1) return error(409, "attribute_inactive", "Giá trị này đang tắt — bật lại trước khi gắn.");
  return null;
}
async function chayGan(db: D1Database, lo: D1PreparedStatement[], chot: number): Promise<boolean> {
  try {
    const res = await db.batch(lo);
    return (res[chot]?.meta.changes ?? 0) > 0;
  } catch {
    return false; // chỉ mục «một dòng mở» / trigger chặn khi đua ⇒ coi như thua khoá
  }
}

export const dacDiemRoutes: Route[] = [
  route("GET", "/api/catalog/dac-diem", "office", async ({ env, staff }) => {
    if (!(can(staff, "catalog.attribute.assign") || can(staff, "admin.manage")) || holdsPartner(staff)) return CAM_XEM();
    return json((await docManDacDiem(env.DB)) satisfies CatalogDacDiemResponse);
  }),
  // Huy hiệu menu (Đ5 mục 3, khuôn `dem-xung-dot`): số dịch vụ đang bán thiếu giá trị của ít nhất một đặc điểm ĐANG DÙNG.
  route("GET", "/api/catalog/dac-diem/dem-chua-khai", "office", async ({ env, staff }) => {
    if (!(can(staff, "catalog.attribute.assign") || can(staff, "admin.manage")) || holdsPartner(staff)) return CAM_XEM();
    const [dd, hl, dv] = await Promise.all([danhSachDacDiem(env.DB), giaTriHieuLucTatCa(env.DB), dichVuXet(env.DB)]);
    const hieuLuc = hl.map((r) => ({ catalogCode: r.catalog_code, attributeCode: r.attribute_code }));
    const thieu = new Set(dd.filter((a) => a.active === 1).flatMap((a) => chuaKhai(dv, hieuLuc, a.code)));
    return json({ soChuaKhai: thieu.size } satisfies CatalogDacDiemDemResponse);
  }),
  // Tạo đặc điểm kèm ≥ 1 giá trị. Nhật ký HAI dòng (tiêu chí 1): đặc điểm; danh sách giá trị.
  route("POST", "/api/catalog/dac-diem", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "admin.manage") || holdsPartner(staff)) return CAM_DINH_NGHIA();
    const body = await readJson(request);
    const ten = kiemTenDacDiem(body?.ten);
    if (!ten.ok) return error(400, "invalid_input", ten.message);
    if (body?.thuTu !== undefined && !laThuTu(body.thuTu)) return error(400, "invalid_input", LOI_THU_TU);
    const raw = Array.isArray(body?.giaTri) ? (body.giaTri as unknown[]) : [];
    if (raw.length === 0) return error(400, "invalid_input", "Đặc điểm phải có ít nhất một giá trị.");
    const giaTri: string[] = [];
    for (const g of raw) {
      const t = kiemTenGiaTri((g as Record<string, unknown> | null)?.ten);
      if (!t.ok) return error(400, "invalid_input", t.message);
      if (giaTri.includes(t.value)) return error(400, "invalid_input", `Giá trị «${t.value}» bị trùng.`);
      giaTri.push(t.value);
    }
    const dd = await danhSachDacDiem(env.DB);
    if (dd.some((a) => a.active === 1 && a.name === ten.value)) return error(409, "attribute_name_taken", `Đã có đặc điểm đang dùng tên «${ten.value}».`);
    const code = maDacDiemMoi();
    const now = new Date().toISOString();
    try {
      await env.DB.batch([
        ...themDacDiemStatements(env.DB, {
          code, name: ten.value, sortOrder: laThuTu(body?.thuTu) ? body.thuTu : dd.reduce((m, a) => Math.max(m, a.sort_order), 0) + 1,
          values: giaTri.map((name, i) => ({ code: maGiaTriMoi(), name, sortOrder: i + 1 })), staffId: staff.id, now,
        }),
        auditStatement(env.DB, { staffId: staff.id, action: "ctl_attribute_created", at: now, targetType: "catalog", detail: ten.value }),
        auditStatement(env.DB, { staffId: staff.id, action: "ctl_attribute_value_created", at: now, targetType: "catalog", detail: `${ten.value}: ${giaTri.join(", ")}` }),
      ]);
    } catch {
      return error(409, "attribute_name_taken", "Chưa thêm được đặc điểm — có thể vừa có người thêm đặc điểm cùng tên. Tải lại rồi thử lại.");
    }
    return json((await motDacDiem(env.DB, code))! satisfies CatalogDacDiemMotResponse, 201, { location: "/dac-diem-dich-vu" });
  }),
  // Thêm giá trị cho đặc điểm đang dùng.
  route("POST", "/api/catalog/dac-diem/:code/gia-tri", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage") || holdsPartner(staff)) return CAM_DINH_NGHIA();
    const a = MA_DAC_DIEM_RE.test(params.code ?? "") ? await dacDiemTheoMa(env.DB, params.code!) : null;
    if (!a) return KHONG_CO_DD();
    if (a.active !== 1) return error(409, "attribute_inactive", "Đặc điểm này đang tắt — bật lại trước khi thêm giá trị.");
    const body = await readJson(request);
    const ten = kiemTenGiaTri(body?.ten);
    if (!ten.ok) return error(400, "invalid_input", ten.message);
    if (body?.thuTu !== undefined && !laThuTu(body.thuTu)) return error(400, "invalid_input", LOI_THU_TU);
    const gt = (await danhSachGiaTri(env.DB)).filter((v) => v.attribute_code === a.code);
    if (gt.some((v) => v.active === 1 && v.name === ten.value)) return error(409, "attribute_name_taken", `Đặc điểm «${a.name}» đã có giá trị đang dùng tên «${ten.value}».`);
    const now = new Date().toISOString();
    try {
      await env.DB.batch([
        themGiaTri(env.DB, { code: maGiaTriMoi(), attributeCode: a.code, name: ten.value, sortOrder: laThuTu(body?.thuTu) ? body.thuTu : gt.reduce((m, v) => Math.max(m, v.sort_order), 0) + 1, staffId: staff.id, now }),
        auditStatement(env.DB, { staffId: staff.id, action: "ctl_attribute_value_created", at: now, targetType: "catalog", detail: `${a.name}: ${ten.value}` }),
      ]);
    } catch {
      return error(409, "attribute_name_taken", "Chưa thêm được giá trị — có thể vừa có người thêm giá trị cùng tên. Tải lại rồi thử lại.");
    }
    return json((await motDacDiem(env.DB, a.code))! satisfies CatalogDacDiemMotResponse, 201, { location: "/dac-diem-dich-vu" });
  }),
  // Sửa giá trị: tên / thứ tự / tắt / bật lại. Khai TRƯỚC `PATCH /api/catalog/dac-diem/:code`.
  route("PATCH", "/api/catalog/dac-diem/gia-tri/:code", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage") || holdsPartner(staff)) return CAM_DINH_NGHIA();
    const v = MA_GIA_TRI_RE.test(params.code ?? "") ? await giaTriTheoMa(env.DB, params.code!) : null;
    if (!v) return KHONG_CO_GT();
    const a = (await dacDiemTheoMa(env.DB, v.attribute_code))!;
    const sua = await docSua(await readJson(request), v, "giá trị");
    if (sua instanceof Response) return sua;
    if (sua.doi.length === 0) return json((await motDacDiem(env.DB, a.code))! satisfies CatalogDacDiemMotResponse);
    if (sua.active && (sua.name !== v.name || v.active !== 1)) {
      const trung = (await danhSachGiaTri(env.DB)).some((x) => x.code !== v.code && x.attribute_code === v.attribute_code && x.active === 1 && x.name === sua.name);
      if (trung) return error(409, "attribute_name_taken", `Đặc điểm «${a.name}» đã có giá trị đang dùng tên «${sua.name}».`);
    }
    if (v.active === 1 && !sua.active) {
      const n = await demGanMoCuaGiaTri(env.DB, v.code);
      if (n > 0) return CON_DUNG(n, `Giá trị «${v.name}»`);
    }
    const now = new Date().toISOString();
    let changes = 0;
    try {
      const res = await env.DB.batch([
        suaGiaTri(env.DB, { code: v.code, name: sua.name, sortOrder: sua.sortOrder, active: sua.active, staffId: staff.id, now, updatedAtCu: sua.expected }),
        auditStatement(env.DB, { staffId: staff.id, action: "ctl_attribute_value_updated", at: now, targetType: "catalog", detail: `${a.name} · ${v.name}: ${sua.doi.join("; ")}` }, "changes() > 0"),
      ]);
      changes = res[0]?.meta.changes ?? 0;
    } catch (e) {
      if (laConDung(e)) return CON_DUNG(await demGanMoCuaGiaTri(env.DB, v.code), `Giá trị «${v.name}»`);
      return error(409, "attribute_name_taken", "Chưa lưu được giá trị — có thể vừa có người đặt cùng tên. Tải lại rồi thử lại.");
    }
    if (changes === 0) {
      const n = v.active === 1 && !sua.active ? await demGanMoCuaGiaTri(env.DB, v.code) : 0;
      return n > 0 ? CON_DUNG(n, `Giá trị «${v.name}»`) : VUA_DOI();
    }
    return json((await motDacDiem(env.DB, a.code))! satisfies CatalogDacDiemMotResponse);
  }),
  // Sửa đặc điểm: tên / thứ tự / tắt / bật lại.
  route("PATCH", "/api/catalog/dac-diem/:code", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage") || holdsPartner(staff)) return CAM_DINH_NGHIA();
    const a = MA_DAC_DIEM_RE.test(params.code ?? "") ? await dacDiemTheoMa(env.DB, params.code!) : null;
    if (!a) return KHONG_CO_DD();
    const sua = await docSua(await readJson(request), a, "đặc điểm");
    if (sua instanceof Response) return sua;
    if (sua.doi.length === 0) return json((await motDacDiem(env.DB, a.code))! satisfies CatalogDacDiemMotResponse);
    if (sua.active && (sua.name !== a.name || a.active !== 1)) {
      const trung = (await danhSachDacDiem(env.DB)).some((x) => x.code !== a.code && x.active === 1 && x.name === sua.name);
      if (trung) return error(409, "attribute_name_taken", `Đã có đặc điểm đang dùng tên «${sua.name}».`);
    }
    if (a.active === 1 && !sua.active) {
      const n = await demGanMoCuaDacDiem(env.DB, a.code);
      if (n > 0) return CON_DUNG(n, `Đặc điểm «${a.name}»`);
    }
    const now = new Date().toISOString();
    let changes = 0;
    try {
      const res = await env.DB.batch([
        suaDacDiem(env.DB, { code: a.code, name: sua.name, sortOrder: sua.sortOrder, active: sua.active, staffId: staff.id, now, updatedAtCu: sua.expected }),
        auditStatement(env.DB, { staffId: staff.id, action: "ctl_attribute_updated", at: now, targetType: "catalog", detail: `${a.name}: ${sua.doi.join("; ")}` }, "changes() > 0"),
      ]);
      changes = res[0]?.meta.changes ?? 0;
    } catch (e) {
      if (laConDung(e)) return CON_DUNG(await demGanMoCuaDacDiem(env.DB, a.code), `Đặc điểm «${a.name}»`);
      return error(409, "attribute_name_taken", "Chưa lưu được đặc điểm — có thể vừa có người đặt cùng tên. Tải lại rồi thử lại.");
    }
    if (changes === 0) {
      const n = a.active === 1 && !sua.active ? await demGanMoCuaDacDiem(env.DB, a.code) : 0;
      return n > 0 ? CON_DUNG(n, `Đặc điểm «${a.name}»`) : VUA_DOI();
    }
    return json((await motDacDiem(env.DB, a.code))! satisfies CatalogDacDiemMotResponse);
  }),
  // Gắn / đổi / bỏ giá trị CHUNG của một nhóm (A-C1: Quản trị, Toàn quyền). Đổi kết quả luật cho mọi dịch vụ «theo nhóm» (Đ4 (b)) — không cổng, cảnh báo ở giao diện.
  route("PUT", "/api/catalog/groups/:code/dac-diem/:attr", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage") || holdsPartner(staff)) return CAM_DINH_NGHIA();
    const than = docThanGan(await readJson(request));
    if (!than) return error(400, "invalid_input", "Thiếu giá trị mới hoặc giá trị đang thấy — tải lại rồi thử lại.");
    const g = params.code ? await nhomTheoMa(env.DB, params.code) : null;
    if (!g) return error(404, "not_found", "Không tìm thấy nhóm dịch vụ.");
    const a = MA_DAC_DIEM_RE.test(params.attr ?? "") ? await dacDiemTheoMa(env.DB, params.attr!) : null;
    if (!a) return KHONG_CO_DD();
    const cu = await giaTriNhomDangMo(env.DB, g.code, a.code);
    if (cu !== than.dangThay) return GAN_VUA_DOI();
    if (than.giaTri === cu) return json({ giaTri: cu } satisfies CatalogDacDiemGanResponse);
    const loi = await kiemGiaTriMoi(env.DB, a, than.giaTri);
    if (loi) return loi;
    if (than.giaTri !== null && g.active !== 1) return error(409, "group_inactive", "Nhóm này đang tắt — bật lại nhóm trước khi gắn giá trị.");
    const gt = await danhSachGiaTri(env.DB);
    const now = new Date().toISOString();
    const doi = doiGiaTriStatements(env.DB, { dich: { loai: "GROUP", code: g.code }, attributeCode: a.code, cu, moi: than.giaTri, staffId: staff.id, now });
    const detail = `nhóm ${g.name} · ${a.name}: ${tenGt(gt, cu, "chưa có")} → ${tenGt(gt, than.giaTri, "bỏ giá trị chung")}`;
    const thang = await chayGan(env.DB, [...doi.statements, auditStatement(env.DB, { staffId: staff.id, action: "ctl_group_attribute_set", at: now, targetType: "catalog", detail }, "changes() > 0")], doi.chot);
    if (!thang) return GAN_VUA_DOI();
    return json({ giaTri: than.giaTri } satisfies CatalogDacDiemGanResponse);
  }),
  // Gắn / đổi / bỏ giá trị RIÊNG của MỘT dịch vụ (Bán hàng, Quản trị, Toàn quyền). Bỏ = về «theo nhóm». Khoá lạc quan theo giá trị riêng đang thấy (tiêu chí 4).
  route("PUT", "/api/catalog/:code/dac-diem/:attr", "office", async ({ env, request, params, staff }) => {
    if (!can(staff, "catalog.attribute.assign") || holdsPartner(staff)) return CAM_GAN();
    const than = docThanGan(await readJson(request));
    if (!than) return error(400, "invalid_input", "Thiếu giá trị mới hoặc giá trị đang thấy — tải lại rồi thử lại.");
    const code = params.code ?? "";
    const dv = CATALOG_CODE_RE.test(code) ? (await dichVuChoDacDiem(env.DB)).find((d) => d.code === code) : undefined;
    if (!dv) return error(404, "not_found", "Không tìm thấy dịch vụ.");
    const a = MA_DAC_DIEM_RE.test(params.attr ?? "") ? await dacDiemTheoMa(env.DB, params.attr!) : null;
    if (!a) return KHONG_CO_DD();
    const cu = await giaTriRiengDangMo(env.DB, code, a.code);
    if (cu !== than.dangThay) return GAN_VUA_DOI();
    if (than.giaTri === cu) return json({ giaTri: cu } satisfies CatalogDacDiemGanResponse);
    const loi = await kiemGiaTriMoi(env.DB, a, than.giaTri);
    if (loi) return loi;
    // Chữ nhật ký (tiêu chí 2): không có giá trị riêng ⇒ «theo nhóm» khi nhóm hiện hành đang dùng có giá trị chung, không thì «chưa khai».
    const nhom = (await nhomHienHanhTheoMa(env.DB)).get(code) ?? null;
    const g = nhom ? await nhomTheoMa(env.DB, nhom) : null;
    const coChung = g && g.active === 1 ? (await giaTriNhomDangMo(env.DB, g.code, a.code)) !== null : false;
    const trong = coChung ? "theo nhóm" : "chưa khai";
    const gt = await danhSachGiaTri(env.DB);
    const now = new Date().toISOString();
    const doi = doiGiaTriStatements(env.DB, { dich: { loai: "SERVICE", code }, attributeCode: a.code, cu, moi: than.giaTri, staffId: staff.id, now });
    const detail = `${code} · ${a.name}: ${tenGt(gt, cu, trong)} → ${tenGt(gt, than.giaTri, trong)}`;
    const thang = await chayGan(env.DB, [...doi.statements, auditStatement(env.DB, { staffId: staff.id, action: "ctl_service_attribute_set", at: now, targetType: "catalog", targetId: code, detail }, "changes() > 0")], doi.chot);
    if (!thang) return GAN_VUA_DOI();
    return json({ giaTri: than.giaTri } satisfies CatalogDacDiemGanResponse);
  }),
];

/** Thân PATCH (đặc điểm / giá trị): `expectedUpdatedAt` bắt buộc; `ten`, `thuTu`, `dangDung` tuỳ chọn. Trả giá trị mới + danh sách thay đổi bằng lời (cho nhật ký). */
async function docSua(body: Record<string, unknown> | null, cu: DacDiemRow, cai: "đặc điểm" | "giá trị"):
  Promise<Response | { expected: string; name: string; sortOrder: number; active: boolean; doi: string[] }> {
  if (!body) return error(400, "invalid_input", "Dữ liệu không hợp lệ.");
  const expected = body.expectedUpdatedAt;
  if (typeof expected !== "string" || expected.length === 0) return error(400, "invalid_input", `Thiếu mốc sửa gần nhất của ${cai} — tải lại rồi thử lại.`);
  let name = cu.name;
  if (body.ten !== undefined) {
    const t = cai === "đặc điểm" ? kiemTenDacDiem(body.ten) : kiemTenGiaTri(body.ten);
    if (!t.ok) return error(400, "invalid_input", t.message);
    name = t.value;
  }
  if (body.thuTu !== undefined && !laThuTu(body.thuTu)) return error(400, "invalid_input", LOI_THU_TU);
  if (body.dangDung !== undefined && typeof body.dangDung !== "boolean") return error(400, "invalid_input", "Trạng thái dùng / tắt không hợp lệ.");
  if (cu.updated_at !== expected) return VUA_DOI();
  const sortOrder = laThuTu(body.thuTu) ? body.thuTu : cu.sort_order;
  const active = typeof body.dangDung === "boolean" ? body.dangDung : cu.active === 1;
  const doi: string[] = [];
  if (name !== cu.name) doi.push(`tên ${cu.name} → ${name}`);
  if (sortOrder !== cu.sort_order) doi.push(`thứ tự ${cu.sort_order} → ${sortOrder}`);
  if (active !== (cu.active === 1)) doi.push(active ? "đã tắt → đang dùng" : "đang dùng → đã tắt");
  return { expected, name, sortOrder, active, doi };
}
