// Dấu «Trả sau theo dịch vụ» (ADR-0178 Đ2 mục 1, Đ3; ADR-0230 Đ1 mục 1): route xem / đặt / gỡ và hàm đọc dấu đang mở cho cổng Trả sau (bước sau).
// Đặt / gỡ: `credit.service_rule.write` (chỉ Toàn quyền). Xem: `credit.service_rule.view` (Kế toán, Quản trị, Toàn quyền). Tài khoản giữ quyền Đối tác không vào (khuôn Trả sau).
// Danh mục (tên, nhóm, «Có vé», «Vé do ai phát» đã gộp) tới qua `ctx.danhMucTraSauDichVu` do gốc lắp ráp tiêm — billing KHÔNG import catalog (ALLOWED_EDGES).
// Đổi số giờ = đóng dòng mở + chèn dòng mới + nhật ký trong MỘT db.batch; gỡ = đóng + nhật ký. Hai tab đua nhau: tab thua va chỉ mục duy nhất / đóng 0 dòng ⇒ 409 `stale`.
// Gỡ khi không có dấu mở ⇒ 404 `not_found` (không ghi) — chọn 404 để giao diện biết dấu đã bị gỡ ở nơi khác.
import type { DanhMucTraSauDichVu, DauTraSauDichVuDto, DauTraSauDichVuResponse } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { route } from "../../shared/router";
import { kiemSoGio } from "../../shared/tra-sau";
import type { DauDichVu } from "../../shared/tra-sau-dich-vu";
import { auditStatement } from "../audit";
import { dauDangMo, dauMoCua, dongDauStatement, themDauStatement, type DauMoRow } from "./tra-sau-dich-vu-repo";

type Loai = "GROUP" | "SERVICE";
const isLoai = (v: unknown): v is Loai => v === "GROUP" || v === "SERVICE";
const MA_RE = /^[^\s]{1,100}$/;

/** API công khai (qua `billing/index.ts`): các dấu đang mở dạng luật thuần — cho cổng Trả sau ở bước sau. KHÔNG tự kiểm quyền. */
export async function dauTraSauDichVu(db: D1Database): Promise<DauDichVu[]> {
  return (await dauDangMo(db)).map((r) => ({ targetKind: r.target_kind, targetCode: r.target_code, gioTra: r.due_hours, gioAnHan: r.grace_hours }));
}

/** Câu cảnh báo của một đích (dấu vẫn lưu được — ADR-0178 Đ2 mục 1: «dịch vụ có vé hãng ngoài chỉ hiện cảnh báo»). */
export function canhBaoDau(loai: Loai, ma: string, dm: DanhMucTraSauDichVu): string | null {
  if (loai === "SERVICE") {
    const d = dm.dichVu.get(ma);
    if (!d) return "Dịch vụ này không còn trong danh mục.";
    if (!d.coVe) return "Dịch vụ này không «Có vé» nên dấu không được tính khi xét Trả sau theo dịch vụ.";
    if (d.nguonVe !== "TOUR_DAO") return "Dịch vụ này là vé hãng ngoài: đơn có dịch vụ này không được Trả sau theo dịch vụ.";
    return null;
  }
  const g = dm.nhom.get(ma);
  if (!g) return "Nhóm này không còn trong danh mục.";
  const hangNgoai = [...dm.dichVu.values()].filter((d) => d.nhom === ma && d.coVe && d.nguonVe !== "TOUR_DAO").length;
  if (hangNgoai > 0) return `Nhóm có ${hangNgoai} dịch vụ vé hãng ngoài: đơn có các dịch vụ đó không được Trả sau theo dịch vụ.`;
  if (!g.dangBat) return "Nhóm này đang tắt.";
  return null;
}

const dto = (r: DauMoRow, dm: DanhMucTraSauDichVu): DauTraSauDichVuDto => ({
  targetKind: r.target_kind,
  targetCode: r.target_code,
  ten: (r.target_kind === "SERVICE" ? dm.dichVu.get(r.target_code)?.ten : dm.nhom.get(r.target_code)?.ten) ?? "",
  gioTra: r.due_hours,
  gioAnHan: r.grace_hours,
  tuLuc: r.valid_from,
  canhBao: canhBaoDau(r.target_kind, r.target_code, dm),
});

const KHONG_XEM = () => error(403, "forbidden", "Chỉ Kế toán, Quản trị hoặc Toàn quyền mới xem được Trả sau theo dịch vụ.");
const KHONG_SUA = () => error(403, "forbidden", "Chỉ Toàn quyền mới đặt hoặc gỡ được Trả sau theo dịch vụ.");
const CHUA_DOC_DUOC = () => error(503, "unavailable", "Chưa đọc được danh mục dịch vụ. Thử lại sau ít phút.");
const STALE = () => error(409, "stale", "Trả sau theo dịch vụ của mục này vừa được người khác đổi. Tải lại rồi làm lại.");
/** Lô va chỉ mục duy nhất `bil_service_credit_rule_one_open` (tab khác vừa mở dòng cho cùng đích). */
const laVaDongMo = (e: unknown): boolean => /UNIQUE constraint failed: bil_service_credit_rule\./.test(e instanceof Error ? e.message : String(e));

async function docDanhSach(db: D1Database, dm: DanhMucTraSauDichVu): Promise<DauTraSauDichVuResponse> {
  return { dau: (await dauDangMo(db)).map((r) => dto(r, dm)) };
}

/** Đích có trong danh mục: dịch vụ có mã trong danh mục (kể cả đang ẩn); nhóm có mã và đang bật. */
function dichHopLe(loai: Loai, ma: string, dm: DanhMucTraSauDichVu): boolean {
  return loai === "SERVICE" ? dm.dichVu.has(ma) : dm.nhom.get(ma)?.dangBat === true;
}

export const traSauDichVuRoutes = [
  route("GET", "/api/tra-sau/dich-vu", "office", async ({ env, staff, danhMucTraSauDichVu }) => {
    if (!can(staff, "credit.service_rule.view") || holdsPartner(staff)) return KHONG_XEM();
    const dm = await danhMucTraSauDichVu();
    if (!dm) return CHUA_DOC_DUOC();
    return json(await docDanhSach(env.DB, dm));
  }),
  route("POST", "/api/tra-sau/dich-vu", "office", async ({ env, request, staff, danhMucTraSauDichVu }) => {
    if (!can(staff, "credit.service_rule.write") || holdsPartner(staff)) return KHONG_SUA();
    const b = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const { targetKind: loai, targetCode: ma } = b;
    if (!isLoai(loai) || typeof ma !== "string" || !MA_RE.test(ma)) return error(400, "invalid_input", "Chọn nhóm hoặc dịch vụ để đặt Trả sau theo dịch vụ.");
    if (!kiemSoGio(b.gioTra, 1)) return error(400, "invalid_input", "Thời hạn trả phải là số giờ nguyên từ 1 tới 8760.");
    if (!kiemSoGio(b.gioAnHan, 0)) return error(400, "invalid_input", "Ân hạn phải là số giờ nguyên từ 0 tới 8760.");
    const gioTra = b.gioTra as number;
    const gioAnHan = b.gioAnHan as number;
    const dm = await danhMucTraSauDichVu();
    if (!dm) return CHUA_DOC_DUOC();
    if (!dichHopLe(loai, ma, dm)) return error(400, "invalid_input", loai === "SERVICE" ? "Không có dịch vụ này trong danh mục." : "Không có nhóm này, hoặc nhóm đang tắt.");
    const cu = await dauMoCua(env.DB, loai, ma);
    if (!cu || cu.due_hours !== gioTra || cu.grace_hours !== gioAnHan) {
      const at = new Date().toISOString();
      const lo: D1PreparedStatement[] = [];
      if (cu) lo.push(dongDauStatement(env.DB, cu.id, at, staff.id));
      lo.push(
        themDauStatement(env.DB, { id: crypto.randomUUID(), kind: loai, code: ma, gioTra, gioAnHan, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "service_credit_rule_set", at, targetType: "ledger", targetId: `${loai}:${ma}`, detail: `${loai} ${ma}: trả ${gioTra} giờ, ân hạn ${gioAnHan} giờ` }),
      );
      try {
        await env.DB.batch(lo);
      } catch (e) {
        if (laVaDongMo(e)) return STALE();
        throw e;
      }
    }
    return json(await docDanhSach(env.DB, dm));
  }),
  route("POST", "/api/tra-sau/dich-vu/go", "office", async ({ env, request, staff, danhMucTraSauDichVu }) => {
    if (!can(staff, "credit.service_rule.write") || holdsPartner(staff)) return KHONG_SUA();
    const b = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const { targetKind: loai, targetCode: ma } = b;
    if (!isLoai(loai) || typeof ma !== "string" || !MA_RE.test(ma)) return error(400, "invalid_input", "Chọn nhóm hoặc dịch vụ để gỡ Trả sau theo dịch vụ.");
    const dm = await danhMucTraSauDichVu();
    if (!dm) return CHUA_DOC_DUOC();
    const cu = await dauMoCua(env.DB, loai, ma);
    if (!cu) return error(404, "not_found", "Mục này không có Trả sau theo dịch vụ để gỡ.");
    const at = new Date().toISOString();
    const [dong] = await env.DB.batch([
      dongDauStatement(env.DB, cu.id, at, staff.id),
      auditStatement(env.DB, { staffId: staff.id, action: "service_credit_rule_removed", at, targetType: "ledger", targetId: `${loai}:${ma}`, detail: `${loai} ${ma}` }, "changes() > 0"),
    ]);
    if ((dong?.meta?.changes ?? 0) === 0) return STALE();
    return json(await docDanhSach(env.DB, dm));
  }),
];
