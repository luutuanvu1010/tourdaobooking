// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn, người phụ trách đang mở của đơn (ADR-0009) hoặc admin được sửa/xác nhận/huỷ.
// "Người phụ trách" do module `dispatch` giữ: `orders` KHÔNG import `dispatch` mà hỏi qua `ctx.isAssigned(orderId)` (gốc lắp ráp tiêm — ADR-0007 điều 4(b)).
import { auditStatement, getAuditTrail } from "../audit";
import { chupDon, docBangChoChup, laNguoiHuong, soKhachTinhHoaHong, type BanChup } from "../pricing";
import { ownerCompany } from "../parties";
import type {
  CanhBaoMocDto, CatalogChangeDto, CatalogChangedBody, DashboardResponse, DongBoChuyenDto, DongLichSuSoKhachDto, DraftCountResponse, IncompleteTripBody, MoneyEditResponse, MyAssignmentDto, NhapTayResponse, OrderDetailDto,
  OrderDetailResponse, OrderListResponse, MocToiThieuResponse, NguoiLapResponse, OrderResponse, PassengerListResponse, PaxCounts, PoolResponse, ShortNoticeRequiredBody,
  SuaSoKhachDichVuDto, StaffProfile, ThuongMaiResponse,
} from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson, trangDon } from "../../shared/http";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday, vnWeekRange } from "../../shared/vn-date";
import { benDatChoTaiKhoan, benDatDoiTacBiCam, type BookerInput } from "../../shared/booker";
import { docLocDon } from "../../shared/loc-don";
import { LOC_NHAP_TOI_DA_NGAY, LOC_NHAP_TOI_DA_UNG_VIEN, laDongNhapKeToan, soNgayKhoang } from "../../shared/nhap-ke-toan";
import { maDonTuNoiDung } from "../../shared/noi-dung-chuyen-khoan";
import { dungLichSuSoKhach } from "../../shared/lich-su-so-khach";
import { editablePaxCodesOf, effectiveSubtotal, planMoneyEdit, type AdjustmentEntry } from "./money-adjustment";
import {
  addLeg, cancelOrder, changeBooker, daHuy, soanDoiKhach, soanHuyDon, soanSuaChang, soanThayChang, thangCauDau, changeLeg, cocCuNhap, confirmOrder, countDrafts, createOrder, effectivePax, findOrder, getDashboard, getDepartDates, getLatestAdjustment, getMeta, getOrderRef,
  chayLoSuaSoKhach, demThanCu, getServicesForSubtotal, getStoredPax, getStoredServices, insertMoneyAdjustment, listAdjustments, listOrderIds, listOrders, listPoolSources, updateDraftOrder, updateTrip,
} from "./repository";
import {
  legById, legDatGapByOrder, legLichChungNhapRows, legLichChungRows, legShortNotice, legTripRows, manualPolicy, manualPolicyInsert, openLegsByOrders, orderContactRows, passengerRowsByOrders,
  servicePaxByIds, servicePaxByOrder, passengerInsertDriver, nguoiDaLapDon, type DatGapWrite,
} from "./chang-hanh-khach-repo";
import { khoaNoi } from "../../shared/khoa-noi";
import { CHIEU_LABEL, LY_DO_DAT_GAP } from "../../shared/chang-dua-don";
import { duoiMocKhiSua, nguongMocVn, type MocToiThieu } from "../../shared/moc-toi-thieu";
import { canhBaoMocCua, chepDatGapNhap, docDatGap, ghiDatGapNhatKy, lichSuTheoVai } from "./dat-gap";
import { dongHienHanh, kiemHanhKhach, soKhachDoan } from "../../shared/hanh-khach";
import type { PaxCode } from "../../shared/order-lines";
import { cauKhongDoiDuocTrangThai } from "../../shared/order-status-label";
import { soNguoiChang, tongKhach } from "../../shared/so-nguoi-chang";
import { maskLongDigits } from "../../shared/text-guards";
import { doanSoKhach, ghepLyDo } from "../../shared/tin-doi-don";
import type { HanhDongDoiSoKhach } from "../../shared/audit-actions";
import { CAU_THIEU_NGUOI_LON, donThieuNguoiLon } from "../../shared/nguoi-di-kem";
import { canhBaoGiamGiaVuot, canhBaoKhuyenMai, docThanSuaSoKhach, duocSuaSoKhachVanPhong, soKhachTraTien } from "../../shared/so-khach-van-phong";
import { docLyDoHuy, docPhanLoai, nhanNhomHuy, type LyDoHuy } from "../../shared/ly-do-huy";
import { lyDoHienHanh, phanLoaiStatement } from "./huy-don-repo";
import { toPoolOrders } from "./pool";
import { soNguoiSauSuaKhach, type ChangSoNguoi } from "./dong-bo-chuyen-don";
import type { DongBoTheoDon, NoiChuyen } from "../../shared/dong-bo-chuyen";
import { CAU_X3_THUE_XE, NHOM_THUE_XE, laDongThuongMai } from "../../shared/so-dai-ly-nhan";
import { apGhiTay, banChupTuDb, cheDoThuongMai, chuaCoBanChup, dongGhiTuChup, dungThuongMai, kiemGhiTayVoiBanChup, kiemThanGhiTay, moTaChup, moTaGhiTay, type PhanThuongMai } from "./thuong-mai";
import { banChupHienHanh, cauChupChuoi, cauGhiTay, demBanChup, laNhaCungCap, nhomCuaMa, tenHoSo } from "./thuong-mai-repo";
import { laThanDonCu, laThanTripCu } from "./than-cu";
import { duocNhapTay, giaDanhMucViolation, holdsPartner, lyDoKhongNhapTay, manualFreezeViolation } from "./price-guards";
import { canTransition, hasHandlerPick, parseHandlerPick, validateBookerChange, validateOrder, type Failure, type OrderStatus, type ValidOrder } from "./rules";
import {
  keHoachChangTrip, loadOrderView, passengerList, planAddLeg, planCloseLeg, planEditLeg, planPassengerChange, planPaxOverrideNhap, planReplaceLeg, resolveBooker, resolveLegPlaces,
  validationContext,
  type OrderValidationContext,
} from "./service";
import { confirmGaps, describeTripUpdates, giaiOPhuNhap, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này.");
const CANNOT_CREATE = () => error(403, "forbidden", "Tài khoản này không được lập đơn.");
/** Chọn người phụ trách lúc lập đơn cần `dispatch.assign` trên đơn của chính mình (ADR-0030 S20-4, G4) — Thực tập, Đối tác không có. */
const CANNOT_PICK_HANDLER = () => error(403, "forbidden", "Tài khoản này không được chọn người phụ trách khi lập đơn. Bỏ chọn hướng dẫn viên rồi lưu lại.");
/** Từ chối XEM (đơn, tiền, liên hệ khách — ADR-0019 điều 2): không cắt bớt trường, trả 403 cả phản hồi. */
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
/** Ghi mức hoa hồng tay (sổ đại lý đợt 1): chỉ Kế toán, Quản trị, Toàn quyền; không bao giờ cho tài khoản có quyền Đối tác. */
const FORBIDDEN_TERMS = () => error(403, "forbidden", "Chỉ Kế toán, Quản trị hoặc Toàn quyền mới ghi được mức hoa hồng tay.");
const NOT_EDITABLE = () => error(409, "not_editable", "Chỉ sửa được đơn đang chờ xác nhận. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
const CANCELLED = () => error(409, "not_editable", "Đơn đã huỷ, không sửa được.");
/** Sổ tiền lượt 1 (ADR-0025 đ5): đơn đã "Đã giao – đã thu đủ" bị khoá — mọi route ghi từ chối SỚM bằng câu tiếng Việt (trigger 0044 là lưới cuối). */
const DA_GIAO = () => error(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa. Sai sót thì Kế toán dùng “Thay lần thu”.");
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
/** ADR-0063 D1: văn phòng sửa số khách — ô `order.money.edit` KHÔNG ngữ cảnh "đang phụ trách" (Bán hàng chỉ đơn mình lập; HDV dùng "Việc của tôi"). */
const MONEY_EDIT_FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn (Bán hàng), Kế toán, Quản trị hoặc Toàn quyền mới sửa được số khách của đơn này.");
const MONEY_EDIT_DRAFT = () => error(409, "use_order_form", "Đơn nháp: sửa số khách ngay trong form đơn.");
const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
/** Luật giá R2/R3 (Đối tác ADR-0027, Thực tập ADR-0100): `cau` là câu lỗi của `giaDanhMucViolation` — câu theo quyền (Đối tác / chỉ Thực tập). */
const GIA_DANH_MUC = (cau: string) => error(403, "forbidden", cau);
/** ADR-0047 Ruling R1: chặng / danh sách khách của ĐƠN NHÁP đi trong thân `POST/PUT /api/orders`; route riêng chỉ nhận đơn đã xác nhận. */
const USE_ORDER_FORM = () => error(409, "use_order_form", "Đơn nháp: sửa đưa đón và danh sách hành khách ngay trong form đơn.");
const LEG_NOT_FOUND = () => error(404, "leg_not_found", "Không tìm thấy chặng đưa đón của đơn này.");
const LEG_CLOSED = (message = "Chặng đưa đón này đã bỏ — không sửa được.") => error(409, "leg_closed", message);
const CANNOT_WRITE_PASSENGERS = () => error(403, "forbidden", "Tài khoản này không được nhập danh sách hành khách của đơn này.");
/** ADR-0054 D10.3 (Q-L4-B "Chỉ văn phòng"): số người chiều về chỉ người qua ô `order.trip.edit` đổi — kể cả khi lập / lưu nháp. */
const CANNOT_PAX_OVERRIDE = () => error(403, "forbidden", "Chỉ văn phòng đổi được số người chiều về.");

/**
 * Lập / lưu nháp (kế hoạch ô mới Task 3.3): giải hai ô phụ của chặng (`giaiOPhuNhap` — khoá vắng = chép giá trị đang lưu) rồi hỏi `order.trip.edit` khi số người
 * chiều về ĐỔI (403, trước khi ghi) và L-R1 (400). Trả dịch vụ đã giải.
 */
function oPhuNhap(
  staff: PermissionHolder, scope: { ownerId: string; assigned: boolean }, order: ValidOrder, storedLegs: readonly { id: string; flightCode: string | null; paxOverride: number | null; exclusiveVehicle: boolean; minVehicleSeats: number | null }[],
): { ok: true; value: ValidOrder } | { ok: false; res: Response } {
  const g = giaiOPhuNhap(order.services, storedLegs);
  if (g.doiSoNguoi && !can(staff, "order.trip.edit", scope)) return { ok: false, res: CANNOT_PAX_OVERRIDE() };
  if (g.vuot) return { ok: false, res: error(400, "invalid_input", g.vuot) };
  return { ok: true, value: { ...order, services: g.services } };
}
/** ADR-0049 D3: đặt gấp chặng dưới mốc — chỉ Quản trị, Toàn quyền (ô `order.leg.short_notice`). */
const CANNOT_SHORT_NOTICE = () => error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền được đặt gấp chặng đưa đón.");
/** Mốc tối thiểu chưa có (bảng chính sách rỗng / môi trường không tiêm) — CHẶN lệnh cần mốc, không đoán con số (I25). */
const MOC_CHUA_CO = () => error(503, "moc_toi_thieu_chua_co", "Chưa có chính sách điều phối đang hiệu lực (mốc tối thiểu) — báo người phụ trách hệ thống.");
/** I14 (Q3 chủ): sửa / thêm chặng đơn ĐÃ XÁC NHẬN dưới mốc cần Quản trị, Toàn quyền + lý do đặt gấp trong CHÍNH lệnh. */
const SUA_DUOI_MOC = () =>
  error(409, "short_notice_required", "Chặng dưới mốc tối thiểu trước giờ đón — chỉ Quản trị hoặc Toàn quyền sửa được, kèm lý do đặt gấp.");

/**
 * Nhánh `datGap` của lệnh sửa / thêm chặng (ADR-0049 I14): thân CÓ khoá `datGap` → phải có ô `order.leg.short_notice` (403) và lý do hợp lệ (400) → dấu MỚI
 * (số phút = mốc hiện hành); VẮNG mà lệnh sửa dưới mốc → 409; vắng và không dưới mốc → null (nội dung đổi thì dấu cũ bỏ — I16).
 */
function xetDatGapSua(
  staff: PermissionHolder & { id: string }, body: Record<string, unknown> | null, duoiMoc: boolean, moc: MocToiThieu,
): { ok: true; value: DatGapWrite | null } | { ok: false; res: Response } {
  const raw = body && typeof body === "object" ? body.datGap : undefined;
  if (raw === undefined || raw === null) return duoiMoc ? { ok: false, res: SUA_DUOI_MOC() } : { ok: true, value: null };
  if (!can(staff, "order.leg.short_notice")) return { ok: false, res: CANNOT_SHORT_NOTICE() };
  const d = docDatGap(raw);
  if (!d.ok) return { ok: false, res: error(400, "invalid_input", d.message) };
  return { ok: true, value: { lyDo: d.value.lyDo, ghiChu: d.value.ghiChu, by: staff.id, at: new Date().toISOString(), phut: moc.phut } };
}
/** Chủ H4 / N-14: người xem thấy ĐỦ dấu đặt gấp (lý do, người duyệt, lúc, ghi chú) hay chỉ cờ — MỘT câu hỏi bảng quyền cho mọi phản hồi chi tiết đơn. */
const xemDuDatGap = (staff: PermissionHolder): boolean => can(staff, "order.leg.short_notice.view");
const kemDatGap = (detail: string, d: DatGapWrite | null) => (d ? `${detail}${ghiDatGapNhatKy(LY_DO_DAT_GAP[d.lyDo as keyof typeof LY_DO_DAT_GAP])}` : detail);

const BEN_DAT_DOI_TAC_CAM = () => error(403, "partner_booker_forbidden", "Đơn qua đại lý hoặc cộng tác viên do văn phòng lập hộ — tài khoản đối tác không chọn được bên đặt này.");

/**
 * Luật K1 (lời chủ 2026-10-09; hàm thuần `benDatDoiTacBiCam` ở `src/shared/booker.ts`): tài khoản giữ quyền Đối tác — kể cả tài khoản lai — gửi hồ sơ CÓ SẴN đang được
 * hưởng mà khác hồ sơ của chính mình và khác bên đặt đang lưu (`dangLuu`; đơn mới = null) ⇒ 403 `partner_booker_forbidden`. `guiLaHuong` truyền sẵn khi nơi gọi đã hỏi
 * `laNguoiHuong` (tránh hỏi hai lần); không truyền thì chỉ hỏi CSDL khi tài khoản giữ quyền Đối tác VÀ gửi hồ sơ có sẵn (nhân viên văn phòng không tốn thêm câu đọc).
 * Dùng chung cho ba đường: lập đơn, lưu nháp (qua `benDatCuaTaiKhoan`) và đổi khách (`PUT …/booker`, gọi thẳng — đường này KHÔNG ép bên đặt, không 409 chưa gắn hồ sơ).
 */
async function chanBenDatDoiTac(
  db: D1Database, staff: Pick<StaffProfile, "partyId" | "permissions">, guiLen: BookerInput, dangLuu: string | null, guiLaHuong?: boolean,
): Promise<Response | null> {
  const laDoiTac = holdsPartner(staff);
  if (!laDoiTac || guiLen.kind !== "existing") return null;
  const huong = guiLaHuong ?? (await laNguoiHuong(db, guiLen.partyId));
  return benDatDoiTacBiCam({ laDoiTac, partyId: staff.partyId, guiLen, guiLaNguoiHuong: huong, benDatDangLuu: dangLuu }) ? BEN_DAT_DOI_TAC_CAM() : null;
}

/**
 * Bên đặt của đơn do tài khoản này lập / lưu nháp (sổ đại lý đợt 1, ADR-0077 đ3 (i) — THU HẸP theo lời chủ 2026-10-08): Đối tác có hồ sơ cá nhân đang mang vai được
 * hưởng ⇒ chính hồ sơ đó (`ep` = true: bỏ qua điều trình duyệt gửi, kể cả khi thân cũ không có khoá bên đặt). Thứ tự nhánh: ép bên đặt → Đối tác CHƯA gắn hồ sơ mà gửi
 * bên đặt đang được hưởng ⇒ 409 (không có hồ sơ nào để ghi — không đoán) → luật K1 (403, `chanBenDatDoiTac`: Đối tác không tự chọn đại lý / cộng tác viên khác; `dangLuu` =
 * bên đặt đang lưu trên đơn, đơn mới null). Còn lại giữ nguyên điều thân gửi (kể cả cá nhân khách lẻ, tổ chức không được hưởng → 400 ở `resolveBooker`). Gọi TRƯỚC `resolveBooker`.
 */
async function benDatCuaTaiKhoan(
  db: D1Database,
  staff: Pick<StaffProfile, "partyId" | "permissions">,
  guiLen: BookerInput,
  dangLuu: string | null,
): Promise<{ ok: true; booker: BookerInput; ep: boolean } | { ok: false; res: Response }> {
  const laDoiTac = holdsPartner(staff);
  const huong = laDoiTac && staff.partyId !== null && (await laNguoiHuong(db, staff.partyId));
  if (laDoiTac && !huong && guiLen.kind === "existing") {
    const guiLaHuong = await laNguoiHuong(db, guiLen.partyId);
    if (staff.partyId === null && guiLaHuong) return { ok: false, res: error(409, "partner_no_party", "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng") };
    const cam = await chanBenDatDoiTac(db, staff, guiLen, dangLuu, guiLaHuong);
    if (cam) return { ok: false, res: cam };
  }
  return { ok: true, booker: benDatChoTaiKhoan({ laDoiTac, partyId: staff.partyId, laNguoiHuong: huong, guiLen }), ep: huong };
}

/** Cảnh báo mốc (I27) + con số mốc (I31) cho phản hồi LẬP / SỬA NHÁP. `moc` null = nháp không chặng (không hỏi mốc). */
async function phanHoiMoc(db: D1Database, orderId: string, order: OrderDetailDto, moc: MocToiThieu | null): Promise<{ canhBaoMoc: CanhBaoMocDto[]; mocToiThieuPhut: number | null }> {
  if (!moc) return { canhBaoMoc: [], mocToiThieuPhut: null };
  const daDatGap = new Set((await legDatGapByOrder(db, orderId)).map((r) => r.id));
  return { canhBaoMoc: canhBaoMocCua(order.services.flatMap((s) => s.legs), daDatGap, Date.now(), moc.phut), mocToiThieuPhut: moc.phut };
}
/** Thân yêu cầu CÓ khoá `passengers` (kể cả `[]`) — ADR-0047 R2b: vắng = giữ danh sách đang lưu, không hỏi ô. */
const hasPassengersKey = (body: Record<string, unknown> | null): boolean => body !== null && typeof body === "object" && "passengers" in body;

/** Lỗi lập kế hoạch sửa/đóng chặng → phản hồi. */
function legFailure(f: { code: "invalid_input" | "leg_not_found" | "leg_closed"; message: string }): Response {
  if (f.code === "leg_not_found") return LEG_NOT_FOUND();
  if (f.code === "leg_closed") return LEG_CLOSED(f.message);
  return error(400, "invalid_input", f.message);
}

/** `soNguoi` (ADR-0104 Đ2 điểm gọi 4): số người hiệu lực của chặng trước / sau — chỉ khi lệnh đụng số người chiều về. */
type LenhChang = { res: Response } | { sua: Parameters<typeof changeLeg>[4] | null; soNguoi?: { truoc: number; sau: number } };

/** Đầu vào `sau` + `tangTheoChang` của máy đồng bộ chuyến cho lệnh SỬA chặng (ADR-0104 Đ2 điểm gọi 4): chỉ số người; giờ / nơi theo VK1-B (giữ + nút). */
function sauSuaChang(trangThai: string, legId: string, sn: { truoc: number; sau: number } | undefined) {
  if (!sn) return { sau: { trangThai } };
  return { sau: { trangThai, soNguoiTheoChang: { [legId]: sn.sau } }, tangTheoChang: { [legId]: Math.max(0, sn.sau - sn.truoc) } };
}

/**
 * NHÁNH NHÁP của `PUT /api/orders/:id/legs/:legId` (ADR-0054 D10.3 "đường mới cho đơn nháp"; kế hoạch ô mới Task 3.5): thân CHỈ `paxOverride` +
 * `expectedUpdatedAt` (mốc CỦA CHẶNG); có khoá khác → 409 `use_order_form` như cũ (giờ, nơi của nháp đi trong thân PUT /api/orders). Ô `order.trip.edit` đã
 * hỏi ở route. Không xét mốc 6 giờ. `sua` null = không đổi gì.
 */
async function lenhSoNguoiVeNhap(db: D1Database, id: string, legId: string, request: Request): Promise<LenhChang> {
  const nhap = await readJson(request);
  const khoa = nhap && typeof nhap === "object" && !Array.isArray(nhap) ? Object.keys(nhap) : [];
  if (!khoa.includes("paxOverride") || khoa.some((k) => k !== "paxOverride" && k !== "expectedUpdatedAt")) return { res: USE_ORDER_FORM() };
  if (!UUID_RE.test(legId)) return { res: LEG_NOT_FOUND() };
  const pn = await planPaxOverrideNhap(db, id, legId, nhap!);
  if (!pn.ok) return { res: legFailure(pn) };
  return { sua: pn.value.detail === null ? null : { kind: "paxNhap", ...pn.value, detail: pn.value.detail } };
}

/**
 * Sửa chặng đơn ĐÃ XÁC NHẬN (ADR-0047 A1). ADR-0049 I14 (Q3 chủ): min(giờ cũ, giờ mới) dưới mốc → Quản trị, Toàn quyền + `datGap`; dấu cũ KHÔNG miễn. Không dấu
 * mới → dấu cũ bỏ (I16). Kế hoạch ô mới Task 3.4 (ADR-0055 C2, ADR-0054 D10.3): CHỈ đổi số hiệu / số người (`chiOPhu`) → không xét mốc; thân không có `datGap`
 * → GIỮ dấu đặt gấp cũ (chủ Q-B 1/10); thân có `datGap` (Quản trị vừa duyệt) → ghi dấu mới.
 */
async function lenhSuaChang(
  db: D1Database, id: string, legId: string, request: Request, staff: PermissionHolder & { id: string }, status: OrderStatus, mocToiThieu: () => Promise<MocToiThieu | null>,
): Promise<LenhChang> {
  if (status === "cancelled") return { res: CANCELLED() };
  if (!UUID_RE.test(legId)) return { res: LEG_NOT_FOUND() };
  const body = await readJson(request);
  const plan = await planEditLeg(db, id, legId, body, vnToday(new Date()));
  if (!plan.ok) return { res: legFailure(plan) };
  if (plan.value.detail === null) return { sua: null };
  const coDatGap = body !== null && typeof body === "object" && body.datGap !== undefined && body.datGap !== null;
  const giuDatGap = plan.value.chiOPhu && !coDatGap;
  let datGapMoi: DatGapWrite | null = null;
  if (!giuDatGap) {
    const moc = await mocToiThieu();
    if (!moc) return { res: MOC_CHUA_CO() };
    const x = xetDatGapSua(staff, body, !plan.value.chiOPhu && duoiMocKhiSua(plan.value.cu, plan.value.fields, Date.now(), moc.phut), moc);
    if (!x.ok) return { res: x.res };
    datGapMoi = x.value;
  }
  const { soNguoi, ...v } = plan.value;
  return { sua: { kind: "update", ...v, detail: kemDatGap(plan.value.detail, datGapMoi), datGap: datGapMoi, giuDatGap }, ...(soNguoi ? { soNguoi } : {}) };
}

/** Câu đầu lô sửa/đóng chặng không áp dụng: vì chặng vừa bị bỏ, đơn vừa huỷ, hay vì mốc chặng đã cũ? Đọc lại để trả đúng lý do. */
async function legRaced(db: D1Database, orderId: string, legId: string): Promise<Response> {
  const [now, leg] = await Promise.all([getMeta(db, orderId), legById(db, legId, orderId)]);
  if (now?.status === "cancelled") return CANCELLED();
  if (leg?.closed_at) return LEG_CLOSED();
  return STALE();
}

/**
 * DK-T3-01 (kiểm toán 24/9; chủ dự án trả lời 2026-09-26) — các kiểm RIÊNG chạy SAU `validateOrder` ở POST/PUT đơn (luật thuần: `price-guards.ts`),
 * theo thứ tự: R1 — khi KHÔNG `duocNhapTay` (ADR-0061: tài khoản có quyền Đối tác TRƯỚC, rồi công tắc TẮT, rồi không có ô `order.service.manual`) dịch vụ
 * nhập tay mới / sửa tên-giá dịch vụ nhập tay cũ → 400 `invalid_input` (câu theo lý do); R2 (tài khoản có quyền Đối tác hoặc Thực tập — `chiGiaDanhMuc`, ADR-0100) đơn giá khác
 * giá danh mục → 403 `forbidden`; R3 (cùng `chiGiaDanhMuc`) giảm giá cấp đơn vượt trần — hôm nay trần 0: Đối tác "tạm không cho giảm" (chủ dự án 26/9), Thực tập không giảm
 * theo ADR-0100 (trần riêng, không đổi theo trần Đối tác) → 403 `forbidden`.
 * `batNhapTay` = công tắc nhập tay, route đọc MỘT lần mỗi request (`manualPolicy`). null = đạt. MỌI route gọi `validateOrder` phải gọi hàm này (bài tĩnh
 * `src/nhap-tay-guard.test.ts` — route sửa sau xác nhận C2 tương lai không lách được).
 */
function priceGuard(staff: PermissionHolder, order: ValidOrder, ctx: OrderValidationContext, batNhapTay: boolean): Response | null {
  const lyDo = lyDoKhongNhapTay(staff, batNhapTay);
  const frozen = lyDo === null ? null : manualFreezeViolation(order.services, ctx.stored, lyDo);
  if (frozen) return error(400, "invalid_input", frozen);
  const giaLoi = giaDanhMucViolation(staff, order.items, order.discount); // R2 + R3 cho tài khoản có quyền Đối tác HOẶC Thực tập (`chiGiaDanhMuc`)
  return giaLoi ? GIA_DANH_MUC(giaLoi) : null;
}

/** Lỗi kiểm đầu vào → phản hồi: tab cũ 409, giá danh mục vừa đổi 409 kèm chi tiết, còn lại 400. */
function failure(f: Failure): Response {
  if (f.code === "client_outdated") return error(409, "client_outdated", f.message);
  if (f.code === "catalog_changed") {
    return json({ error: { code: "catalog_changed", message: f.message, changes: f.details as CatalogChangeDto[] } } satisfies CatalogChangedBody, 409);
  }
  return error(400, f.code ?? "invalid_input", f.message);
}

/**
 * API công khai cho module khác (`dispatch`, cạnh dispatch → orders — ADR-0006 điều 8): đơn có tồn tại không, AI LẬP, trạng thái, và mốc `updated_at`
 * (để `dispatch` truyền vào khoá lạc quan khi tự ghi qua `cancelOrderByHandler` — khoá theo CẢ `status` VÀ `updated_at`, T1d). Chỉ trả các trường này,
 * không lộ gì khác của đơn; null nếu không có đơn.
 */
export async function findOrderOwner(db: D1Database, id: string): Promise<{ staffId: string; status: OrderStatus; updatedAt: string } | null> {
  const meta = await getMeta(db, id);
  return meta ? { staffId: meta.staffId, status: meta.status, updatedAt: meta.updatedAt } : null;
}

/**
 * API công khai cho GỐC LẮP RÁP (src/index.ts — Bảng tin, ADR-0022): mã đơn (`orders.order_code`) + AI LẬP, để dựng sự kiện 5 khoá (điều 4) và tính nhãn
 * người nhận `nguoi:<người lập>` (NT-2). Chỉ hai trường này — không tên/SĐT khách, không tiền; null nếu không có đơn. Module bảng tin KHÔNG gọi hàm này
 * (hạng KHONG_DB, không import module nào): gốc lắp ráp đọc rồi truyền dữ liệu vào.
 */
export async function findOrderRef(db: D1Database, id: string): Promise<{ staffId: string; orderCode: string } | null> {
  return getOrderRef(db, id);
}

/**
 * API công khai cho `dispatch` (DK-T4-02): ngày khởi hành của từng dịch vụ trong đơn (null = chưa có ngày). `dispatch` đưa vào luật thuần
 * `tripDeparted` (`src/shared/trip-rules.ts`) để chặn hướng dẫn viên huỷ tour đã qua ngày đi — không đọc thẳng bảng `order_service`.
 */
export async function findOrderDepartDates(db: D1Database, id: string): Promise<(string | null)[]> {
  return getDepartDates(db, id);
}

/**
 * API công khai (ADR-0047 A3) — SỐ KHÁCH HIỆU LỰC của từng dịch vụ: số đã lưu ở `order_service`, phủ dòng điều chỉnh GẦN NHẤT của chính đơn chứa dịch
 * vụ đó (ADR-0014 điều 6) qua ĐÚNG `getLatestAdjustments` → `money-adjustment.ts:parseAdjustmentAfter` → `applyAdjustedPax` — một nguồn với danh sách
 * đơn, Trang chủ, hàng chờ (bài học Đợt E: không viết bộ phân tích `after_json` thứ hai). Id lạ: không có trong Map. Không module nào khác đọc
 * `order_money_adjustment`/`after_json` (bài quét src/orders-cong-bo.test.ts).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function soKhachHieuLuc(db: D1Database, serviceIds: readonly string[]): Promise<Map<string, PaxCounts>> {
  return effectivePax(db, await servicePaxByIds(db, serviceIds));
}

/**
 * Đợt 5 A-1b (ADR-0052 D5b): câu ghi MỘT hành khách do tài xế nhập — van-chuyen đặt câu này vào lô của mình (sau dòng nhật ký `auditId`). Số tối đa = số khách
 * hiệu lực của dịch vụ đông nhất của đơn (đọc lúc dựng câu; câu so lại số người hiện hành TRONG lô). KHÔNG tự kiểm quyền — chỉ gọi trong thân route, sau
 * `can(staff, "trip.passenger.add", { assigned })` + trong ngày chạy (bài src/orders-cong-bo.test.ts). Thân kiểm bằng `kiemHanhKhachTaiXe`.
 */
export interface HanhKhachTaiXeVao { id: string; orderId: string; fullName: string; birthYear: number; paxCode: PaxCode | null; at: string; by: string }
export async function cauThemHanhKhachTaiXe(db: D1Database, v: HanhKhachTaiXeVao, auditId: string): Promise<D1PreparedStatement> {
  const pax = await effectivePax(db, await servicePaxByOrder(db, v.orderId));
  const toiDa = soKhachDoan([...pax.values()]);
  return passengerInsertDriver(db, { id: v.id, orderId: v.orderId, ten: v.fullName, birthYear: v.birthYear, paxCode: v.paxCode, at: v.at, by: v.by }, auditId, toiDa);
}
/** Thân "Bổ sung tên" của tài xế: họ tên, năm sinh, loại khách (được null) — cùng luật `kiemHanhKhach` của văn phòng. `today` = ngày VN. */
export function kiemHanhKhachTaiXe(body: unknown, today: string): { ok: true; value: { fullName: string; birthYear: number; paxCode: PaxCode | null } } | { ok: false; message: string } {
  const r = kiemHanhKhach(body, { at: "Khách", today });
  return r.ok ? { ok: true, value: { fullName: r.value.fullName, birthYear: r.value.birthYear, paxCode: r.value.paxCode } } : r;
}

/** Một chặng cho tài xế / chuyến xe (ADR-0047 A3) — ĐÚNG các khoá này; thêm khoá = sửa bài liệt kê khoá ở src/modules/orders/ham-cong-bo.test.ts. */
export interface ChangChoChuyen {
  legId: string;
  orderId: string;
  orderCode: string;
  /** Tên dịch vụ (nhập tay là chữ tự do) — đã che dãy từ 8 chữ số. */
  serviceName: string;
  direction: "OUT" | "RETURN";
  pickupDate: string | null;
  pickupTime: string | null;
  /** Tên điểm danh mục hoặc chữ tự do — đã che dãy số. */
  noiDon: string;
  noiTra: string | null;
  /** Số người HIỆU LỰC của CHẶNG (`soNguoiChang` — ADR-0054 D10.3: chặng về có số riêng → min(số riêng, số khách hiệu lực của dịch vụ)). */
  soNguoi: number;
  /** Cam kết xe riêng của chặng (ADR-0056 VK3-A, ADR A4). */
  xeRieng: boolean;
  /** Cam kết xe tối thiểu N chỗ, không kể tài xế (ADR-0056 VK3-A); null = không cam kết. */
  choToiThieu: number | null;
  /** Người có tên (dòng hiện hành): khoá bền `personKey`, bản tên đã dùng `rowId`. */
  nguoi: { personKey: string; rowId: string; fullName: string; birthYear: number }[];
}

/**
 * API công khai — hàm đọc HẸP cho Vận chuyển (ADR-0047 A3): chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN theo danh sách id chặng, mỗi phần tử dựng MỚI TỪNG KHOÁ (danh
 * sách trường được phép — khuôn `pool.ts`, Hiến chương 4.4): không tiền, ghi chú, người lập, SĐT, email. Chữ tự do (nơi, tên dịch vụ) che dãy số. Liên hệ
 * cho tài xế: chờ lượt 2 (Q3). Chưa module nào gọi hàm này (hôm nay 0 nơi gọi).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function hanhKhachChoChuyen(db: D1Database, legIds: readonly string[]): Promise<ChangChoChuyen[]> {
  const legs = await legTripRows(db, legIds);
  if (legs.length === 0) return [];
  const orderIds = [...new Set(legs.map((l) => l.order_id))];
  const [paxRows, people] = await Promise.all([servicePaxByIds(db, [...new Set(legs.map((l) => l.service_id))]), passengerRowsByOrders(db, orderIds)]);
  const pax = await effectivePax(db, paxRows);
  const current = new Map<string, ChangChoChuyen["nguoi"]>();
  for (const orderId of orderIds) {
    const rows = people.filter((p) => p.order_id === orderId).map((p) => ({
      id: p.id, personKey: p.person_key, previousId: p.previous_id, voided: p.voided === 1, fullName: p.ten, birthYear: p.birth_year, paxCode: p.pax_code, updatedAt: p.updated_at,
    }));
    current.set(orderId, dongHienHanh(rows).map((p) => ({ personKey: p.personKey, rowId: p.id, fullName: p.fullName, birthYear: p.birthYear })));
  }
  return legs.map((l) => {
    const p = pax.get(l.service_id);
    return {
      legId: l.id,
      orderId: l.order_id,
      orderCode: l.order_code,
      serviceName: maskLongDigits(l.service_name),
      direction: l.direction,
      pickupDate: l.pickup_date,
      pickupTime: l.pickup_time,
      noiDon: maskLongDigits(l.noi_don),
      noiTra: maskLongDigits(l.noi_tra),
      soNguoi: soNguoiChang({ direction: l.direction, paxOverride: l.pax_override }, p ? tongKhach(p) : 0),
      xeRieng: l.exclusive_vehicle === 1,
      choToiThieu: l.min_vehicle_seats,
      nguoi: (current.get(l.order_id) ?? []).map((n) => ({ personKey: n.personKey, rowId: n.rowId, fullName: n.fullName, birthYear: n.birthYear })),
    };
  });
}

/** Một chặng cho LỊCH CHUNG điều phối (ADR-0049 D1) — ĐÚNG các khoá này; thêm khoá = sửa bài liệt kê khoá ở src/modules/orders/lich-chung-chang.test.ts. */
export interface ChangLichChung {
  legId: string;
  orderId: string;
  orderCode: string;
  /** Tên dịch vụ — đã che dãy từ 8 chữ số. */
  serviceName: string;
  direction: "OUT" | "RETURN";
  pickupDate: string;
  pickupTime: string | null;
  /** Tên điểm danh mục hoặc chữ tự do — ĐÃ CHE dãy số (hiển thị). */
  noiDon: string;
  noiDonDiemId: string | null;
  noiTra: string | null;
  noiTraDiemId: string | null;
  /** Số người HIỆU LỰC của CHẶNG (`soNguoiChang` — ADR-0054 D10.3; số khách dịch vụ = cả bốn loại tuổi — LC-02). */
  soNguoi: number;
  /** Số hiệu chuyến bay của chặng (ADR-0055 VK2-C C3); null = chưa có. */
  soHieuChuyenBay: string | null;
  /** Cam kết xe riêng của chặng (ADR-0056 VK3-A, ADR A4). */
  xeRieng: boolean;
  /** Cam kết xe tối thiểu N chỗ, không kể tài xế (ADR-0056 VK3-A); null = không cam kết. */
  choToiThieu: number | null;
  /** Khoá người (`person_key`) của hành khách HIỆN HÀNH của đơn — chỉ khoá, không tên (I12). */
  nguoiCuaDon: string[];
  /** Chặng mang dấu đặt gấp. */
  datGap: boolean;
  /**
   * ADR-0050 VK1-B: KHOÁ SO SÁNH NƠI (`khoaNoi`, src/shared/khoa-noi.ts) tính trên chữ CHƯA che — CHỈ để so với `vc_trip_stop.place_key`; KHÔNG BAO GIỜ vào
   * DTO, nhật ký, bản chụp của van-chuyen. `khoaNoiTra` null = chặng chưa có nơi trả.
   */
  khoaNoiDon: string;
  khoaNoiTra: string | null;
}
/** Chặng của đơn NHÁP trên lịch chung (I11) — chỉ khoá, mã đơn, ngày giờ, cờ đặt gấp. */
export interface ChangNhapLichChung {
  legId: string;
  orderId: string;
  orderCode: string;
  pickupDate: string;
  pickupTime: string | null;
  datGap: boolean;
}

/**
 * API công khai — hàm đọc HẸP cho LỊCH CHUNG điều phối (ADR-0049 D1, lát 1.4; kế hoạch A11): chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN có ngày đón trong
 * [tuNgay, denNgay] + chặng của đơn NHÁP (chỉ để đếm / duyệt đặt gấp). Dựng MỚI TỪNG KHOÁ (khuôn `pool.ts`): không tiền, ghi chú, người lập, liên hệ khách,
 * họ tên. Số người qua CÙNG `effectivePax` với `soKhachHieuLuc` (một nguồn). Hàm async vì băm khoá nơi (Web Crypto).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function lichChungChang(db: D1Database, tuNgay: string, denNgay: string): Promise<{ chang: ChangLichChung[]; nhap: ChangNhapLichChung[] }> {
  const [legs, nhap] = await Promise.all([legLichChungRows(db, tuNgay, denNgay), legLichChungNhapRows(db, tuNgay, denNgay)]);
  const orderIds = [...new Set(legs.map((l) => l.order_id))];
  const [paxRows, people] = legs.length === 0 ? [[], []] : await Promise.all([servicePaxByIds(db, [...new Set(legs.map((l) => l.service_id))]), passengerRowsByOrders(db, orderIds)]);
  const pax = await effectivePax(db, paxRows);
  const khoaNguoi = new Map<string, string[]>();
  for (const orderId of orderIds) {
    const rows = people.filter((p) => p.order_id === orderId).map((p) => ({
      id: p.id, personKey: p.person_key, previousId: p.previous_id, voided: p.voided === 1, fullName: p.ten, birthYear: p.birth_year, paxCode: p.pax_code, updatedAt: p.updated_at,
    }));
    khoaNguoi.set(orderId, dongHienHanh(rows).map((p) => p.personKey));
  }
  const chang = await Promise.all(legs.map(async (l): Promise<ChangLichChung> => {
    const p = pax.get(l.service_id);
    return {
      legId: l.id,
      orderId: l.order_id,
      orderCode: l.order_code,
      serviceName: maskLongDigits(l.service_name),
      direction: l.direction,
      pickupDate: l.pickup_date,
      pickupTime: l.pickup_time,
      noiDon: maskLongDigits(l.noi_don),
      noiDonDiemId: l.pickup_location_id,
      noiTra: maskLongDigits(l.noi_tra),
      noiTraDiemId: l.dropoff_location_id,
      soNguoi: soNguoiChang({ direction: l.direction, paxOverride: l.pax_override }, p ? tongKhach(p) : 0),
      soHieuChuyenBay: l.flight_code,
      xeRieng: l.exclusive_vehicle === 1,
      choToiThieu: l.min_vehicle_seats,
      nguoiCuaDon: [...(khoaNguoi.get(l.order_id) ?? [])],
      datGap: l.dat_gap === 1,
      khoaNoiDon: (await khoaNoi({ locationId: l.pickup_location_id, placeText: l.pickup_place }))!,
      khoaNoiTra: await khoaNoi({ locationId: l.dropoff_location_id, placeText: l.dropoff_place }),
    };
  }));
  return {
    chang,
    nhap: nhap.map((n) => ({ legId: n.id, orderId: n.order_id, orderCode: n.order_code, pickupDate: n.pickup_date, pickupTime: n.pickup_time, datGap: n.dat_gap === 1 })),
  };
}

/** Liên hệ khách cho tài xế (ADR-0049 D3) — ĐÚNG bốn khoá. */
export interface LienHeTaiXe {
  orderId: string;
  orderCode: string;
  tenLienHe: string;
  sdtLienHe: string;
}
/**
 * API công khai — tên + SĐT người liên hệ của các đơn ĐÃ XÁC NHẬN được hỏi (ADR-0049 D3: tài xế chỉ thấy TRONG ngày chạy — route van-chuyen kiểm
 * `trongNgayChay` trước khi gọi). Rỗng → [] (không truy vấn).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function lienHeChoTaiXe(db: D1Database, orderIds: readonly string[]): Promise<LienHeTaiXe[]> {
  return (await orderContactRows(db, orderIds)).map((r) => ({ orderId: r.id, orderCode: r.order_code, tenLienHe: r.customer_name, sdtLienHe: r.customer_phone }));
}

/**
 * Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (`FIELD`, ADR-0014 điều 11) — CHỈ đổi `status`/`updated_at`, không đụng dịch vụ hay cột tiền (đúng khoá
 * "đơn đã xác nhận không đổi tiền" — xem `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md`). Route gọi hàm này SAU KHI đã tự kiểm
 * `status === "confirmed"` bằng `findOrderOwner`; hàm này chỉ còn lo tranh chấp (khoá lạc quan khoá theo CẢ `status` VÀ `updated_at`, T1d) nên vẫn
 * ràng buộc `from: "confirmed"` cho chắc.
 */
export async function cancelOrderByHandler(
  db: D1Database, id: string, staffId: string, prevUpdatedAt: string, lyDo: LyDoHuy, reasonLabel: string, noiChuyen: NoiChuyen,
): Promise<KetQuaLenhDon> {
  // ADR-0104 Đ2 (điểm gọi 2): route dispatch truyền `noiChuyen` = ctx.dongBoChuyen (orders không xuất hàm soạn, không import van-chuyen). MỘT lô: câu huỷ đứng
  // đầu, khúc chuyến sau.
  const huy = soanHuyDon(db, id, staffId, "confirmed", prevUpdatedAt, lyDo, { action: "order_cancelled_by_field", detail: reasonLabel });
  const dong = await noiChuyen({ orderId: id, auditIdDon: huy.auditId, bayGioMs: Date.now(), sau: { trangThai: "cancelled" }, cauDon: huy.cau });
  return chayLoNoiChuyen(db, dong, daHuy);
}

/** Kết quả lệnh đơn có nối máy đồng bộ chuyến, cho route của module KHÁC (dispatch): thắng kèm phần "chuyến" của phản hồi; thua khoá lạc quan; lỗi đã dịch. */
export type KetQuaLenhDon = { kq: "thang"; dongBoChuyen: DongBoChuyenDto } | { kq: "thua" } | { kq: "loi"; res: Response };

/** Chạy MỘT lô (câu đơn + khúc chuyến) rồi hỏi `thang(kq)` (đọc câu đơn ở chỉ số cũ); lỗi phần chuyến → 409 `trip_rule` qua `dichLoi`, lỗi khác ném tiếp. */
async function chayLoNoiChuyen(db: D1Database, dong: DongBoTheoDon, thang: (kq: readonly D1Result[]) => boolean): Promise<KetQuaLenhDon> {
  let kq: D1Result[];
  try {
    kq = await db.batch(dong.lo);
  } catch (e) {
    const res = dong.dichLoi(e);
    if (res) return { kq: "loi", res };
    throw e;
  }
  return thang(kq) ? { kq: "thang", dongBoChuyen: dong.sauKhiGhi(kq).dto } : { kq: "thua" };
}

// ---- Sổ tiền lượt 1 (ADR-0024 điều 3–4, ADR-0025): `orders` công bố trạng thái + "phải thu hiện hành" + hai câu mốc CHƯA CHẠY cho billing gộp vào
// MỘT db.batch() (quy tắc 3 ADR-0002). `orders` không đọc bảng của billing. KHÔNG tự kiểm quyền — route của billing hỏi can() trước.
export { donDangThuTien, phaiThuNhieuDon, thongTinGiaoDon, type PhaiThuDon, type ThongTinGiaoDon } from "./hoan-tat";
export { datGiaoStatement, hoanThanhStatement, type DatGiaoInput } from "./hoan-tat-repo";

/**
 * API công khai cho module `receipt` (biên nhận — ADR-0024 đ1): chi tiết đơn HIỆN HÀNH (đã áp điều chỉnh) để receipt CHÉP TỪNG trường được phép vào
 * `ReceiptDto` (danh sách trắng — không trải đối tượng). KHÔNG tự kiểm quyền — route của receipt hỏi can() trước khi trả.
 */
export const donChoBienNhan = (db: D1Database, id: string): Promise<OrderDetailDto | null> => loadOrderView(db, id, false);

/** `detail` (ADR-0062 Đ2) = chữ dòng nhật ký VỪA ghi; vắng = y nguyên số khách, không ghi gì. Route KHÔNG chuyển nó đi đâu: màn hình khoá do gốc lắp ráp tự đọc lại dòng đổi của chính request (`dayGoCuaDoi`, mốc `batDau` của router). */
export type MoneyEditResult =
  | { ok: true; detail?: string; dongBoChuyen?: DongBoChuyenDto }
  | { ok: false; code: "not_found" | "not_confirmed" | "invalid_input" | "stale"; message?: string }
  /** ADR-0114 D3: lần sửa đưa tổng người đi kèm của đơn từ ≥ 1 xuống 0 — route hướng dẫn viên (`dispatch`) trả 409 `thieu_nguoi_lon` với `message` này. */
  | { ok: false; code: "thieu_nguoi_lon"; message: string }
  /** ADR-0104 Đ2: lỗi của PHẦN CHUYẾN trong lô (đã dịch — 409 `trip_rule`). */
  | { ok: false; code: "trip_rule"; res: Response };

/**
 * Kết quả SOẠN một lần sửa số khách (chưa chạy gì): `cau` = câu ghi đơn chưa chạy (dòng điều chỉnh + nhật ký cùng id), `auditId` = id đó (sinh trước),
 * `truoc` / `sau` = số khách từng dịch vụ trước / sau (để nối đồng bộ chuyến — ADR-0104 Đ2, thi công sau — tính "số người lệnh này tăng ở từng chặng").
 */
export type SoanSuaSoKhach =
  | { ok: true; ghi: false }
  | { ok: true; ghi: true; auditId: string; cau: D1PreparedStatement[]; detail: string; truoc: AdjustmentEntry[]; sau: AdjustmentEntry[] }
  | { ok: false; code: "invalid_input" | "thieu_nguoi_lon"; message: string };

/**
 * MỘT đường soạn lần sửa số khách cho CẢ HAI route (HDV `handler-money-edit` qua `editMoneyAsHandler`, văn phòng `money-edit` — ADR-0063 D1): đọc D1 → luật
 * thuần `money-adjustment.ts:planMoneyEdit` (kiểm dạng, y nguyên thì không ghi, tiền trước/sau theo ĐƠN GIÁ ĐÃ THOẢ THUẬN bằng `effectiveSubtotal` trên MỌI
 * dịch vụ kể cả nhập tay — Hiến chương 5.4 một luật tiền) → `detail` khuôn A3 → câu ghi CHƯA chạy (`insertMoneyAdjustment`). Nơi gọi chạy MỘT `db.batch`
 * (`chayLoSuaSoKhach`). Không tự kiểm quyền / trạng thái đơn — route đã làm trước khi gọi.
 */
async function soanSuaSoKhach(
  db: D1Database,
  orderId: string,
  staffId: string,
  body: Record<string, unknown> | null,
  action: HanhDongDoiSoKhach,
): Promise<SoanSuaSoKhach> {
  const [stored, latest, servicesByOrder] = await Promise.all([
    getStoredServices(db, orderId),
    getLatestAdjustment(db, orderId),
    getServicesForSubtotal(db, [orderId]),
  ]);
  const services = servicesByOrder.get(orderId) ?? [];
  const plan = planMoneyEdit({
    services,
    storedPax: new Map(stored.map((s) => [s.id, s.pax])),
    latestAfter: latest?.after ?? null,
    body,
  });
  if (!plan.ok) return { ok: false, code: plan.code, message: plan.message };
  if (!plan.write) return { ok: true, ghi: false }; // y nguyên số khách: không ghi dòng điều chỉnh, không đổi tiền (DK-T2-01)
  // ADR-0062 Đ2: đoạn đầu có khuôn "số khách: …" (tên danh mục, hoặc nhãn "dịch vụ nhập tay"), lý do LUÔN ở cuối.
  const detail = ghepLyDo(doanSoKhach(plan.before, plan.after, services), plan.reason);
  const { auditId, cau } = insertMoneyAdjustment(db, orderId, staffId, (latest?.seq ?? 0) + 1, plan.before, plan.after, plan.subtotalBefore, plan.subtotalAfter, action, detail);
  return { ok: true, ghi: true, auditId, cau, detail, truoc: plan.before, sau: plan.after };
}

/**
 * ADR-0114 D1 — lời nhắc khuyến mại khi bớt khách, cho phản hồi `money-edit` VÀ chi tiết đơn (MỘT hàm, hai nơi gọi). `khachLucXacNhan` = số khách trả tiền ĐÃ LƯU của mọi dịch
 * vụ (đóng băng sau xác nhận); `khachHienHanh` = số khách của đơn HIỆN HÀNH (`order` đã áp dòng điều chỉnh gần nhất). Giảm giá hiệu lực 0 thì không có gì để nhắc nên khỏi đọc thêm.
 * Không lưu cờ, không đổi số tiền (luật thuần: `canhBaoKhuyenMai` của src/shared/so-khach-van-phong.ts).
 */
async function nhacKhuyenMaiCuaDon(db: D1Database, order: OrderDetailDto): Promise<string | null> {
  if (order.giamGiaHieuLuc <= 0) return null; // lối thoát sớm cho đỡ đọc CSDL; luật vẫn ở `canhBaoKhuyenMai` (cùng một khoá giảm giá hiệu lực)
  const daLuu = await getStoredPax(db, order.id);
  return canhBaoKhuyenMai(order, soKhachTraTien(Array.from(daLuu.values(), (pax) => ({ pax }))), soKhachTraTien(order.services));
}

/**
 * ADR-0114 D2 — khối "Lịch sử số khách" của chi tiết đơn: dòng LÚC XÁC NHẬN (số khách đã lưu + tạm tính gốc), mỗi lần sửa, kết quả hiện hành. Chỉ GỌI sau khi route đã hỏi
 * `order.history.view` với đơn này (cùng điều kiện khối `history`). Nguồn: `order_service` (đóng băng) + `order_money_adjustment` theo `seq`; tạm tính mỗi dòng tính lại bằng
 * MỘT nguồn `effectiveSubtotal` trên MỌI dịch vụ (kể cả nhập tay) — không tin cột `subtotal_after` đã lưu; KHÔNG đọc chữ nhật ký. Dựng dòng ở src/shared/lich-su-so-khach.ts.
 */
async function lichSuSoKhachCuaDon(db: D1Database, order: OrderDetailDto): Promise<DongLichSuSoKhachDto[]> {
  const [daLuu, lanSua, dichVuTien] = await Promise.all([getStoredPax(db, order.id), listAdjustments(db, order.id), getServicesForSubtotal(db, [order.id])]);
  const tien = dichVuTien.get(order.id) ?? [];
  return dungLichSuSoKhach({
    dichVu: order.services.map((s) => ({ id: s.id, catalogCode: s.catalogCode, name: s.name, pax: daLuu.get(s.id) ?? s.pax })),
    tamTinhKhoiTao: effectiveSubtotal(tien, []),
    lanSua: lanSua.map((l) => ({ seq: l.seq, sau: l.after, tamTinhSau: effectiveSubtotal(tien, l.after) })),
  });
}

/**
 * Sửa số khách qua đường hẹp của người phụ trách CẤP HẸP (FIELD, ADR-0014 điều 6) — CHỈ ghi thêm một dòng điều chỉnh, không đụng
 * order_service/order_item/cột tiền của orders. `body` là thân JSON THÔ (đã đọc từ request, route chưa kiểm; lý do chữ tự gõ — hành vi cũ, chưa đổi sang mã).
 * Soạn qua `soanSuaSoKhach` (một đường với văn phòng), chạy MỘT lô. Lưới e2e ở `tests/e2e/dispatch.mjs` khối D3 đọc thẳng cột đã lưu.
 */
/** Đầu vào `sau` + `tangTheoChang` của máy đồng bộ chuyến cho lệnh SỬA SỐ KHÁCH (cả hai đường — ADR-0104 Đ2, điểm gọi 6 và 7). */
function sauSuaSoKhach(trangThai: string, chang: readonly ChangSoNguoi[], truoc: readonly AdjustmentEntry[], sau: readonly AdjustmentEntry[]) {
  const s = soNguoiSauSuaKhach(chang, new Map(truoc.map((e) => [e.serviceId, e.pax])), new Map(sau.map((e) => [e.serviceId, e.pax])));
  return { sau: { trangThai, soNguoiTheoChang: s.soNguoiTheoChang }, tangTheoChang: s.tangTheoChang };
}

export async function editMoneyAsHandler(
  db: D1Database, orderId: string, staffId: string, body: Record<string, unknown> | null, noiChuyen: NoiChuyen,
): Promise<MoneyEditResult> {
  const meta = await getMeta(db, orderId);
  if (!meta) return { ok: false, code: "not_found" };
  if (meta.status !== "confirmed") return { ok: false, code: "not_confirmed" };
  const soan = await soanSuaSoKhach(db, orderId, staffId, body, "order_money_adjusted_by_field");
  if (!soan.ok) return { ok: false, code: soan.code, message: soan.message };
  if (!soan.ghi) return { ok: true };
  // ADR-0104 Đ2 (điểm gọi 7): route dispatch truyền `noiChuyen` = ctx.dongBoChuyen; MỘT lô câu đơn + khúc chuyến (Q-2 = a: chỉ mở tối đa số vừa tăng).
  const dong = await noiChuyen({
    orderId, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau,
    ...sauSuaSoKhach(meta.status, await openLegsByOrders(db, [orderId]), soan.truoc, soan.sau),
  });
  let kq: D1Result[] | null;
  try {
    kq = await chayLoSuaSoKhach(db, dong.lo);
  } catch (e) {
    const res = dong.dichLoi(e);
    if (res) return { ok: false, code: "trip_rule", res };
    throw e;
  }
  return kq !== null ? { ok: true, detail: soan.detail, dongBoChuyen: dong.sauKhiGhi(kq).dto } : { ok: false, code: "stale" };
}

/**
 * Dữ liệu cho màn "việc của tôi" (`GET /api/dispatch/mine`, module dispatch) — tái dùng `loadOrderView` (đã có overlay điều chỉnh, ADR-0014 điều 6)
 * rồi dựng lại TỪNG trường được phép (không trải đối tượng nguồn). Từ bản 1.6 (ADR-0030 S23-8, lượt 1): trả CẢ đơn nháp, chỉ loại đơn đã huỷ — trước đó
 * chỉ trả đơn đã xác nhận, nay HDV cũng thấy đơn nháp mình đang phụ trách (chưa có nút huỷ/sửa số khách cho đơn nháp: `myJobActions` ở giao diện quyết
 * theo `status`). Tiền: chủ dự án quyết 2026-09-27 (Task 1.8): HDV cần biết còn thu bao nhiêu — mở ĐÚNG ba trường tiền cấp đơn (`total`,
 * `depositAmount`, `remainingAmount`, số hiện hành sau điều chỉnh của `loadOrderView` — ADR-0017 điều 5), dựa trên quyền `money.view` (assigned) đã
 * cấp từ Task 1.5/ADR-0017; route hỏi ô đó trước khi gọi hàm này. Không giá từng dòng, không giảm giá, không ghi chú thanh toán.
 * `orderIds` do `dispatch` truyền vào (đơn mà staff gọi đang là người phụ trách — dispatch tự tra, orders
 * không biết khái niệm "người phụ trách"). `editablePaxCodes` tính từ đơn GỐC (`findOrder`, trước overlay) qua `editablePaxCodesOf` — KHÔNG tính từ
 * `items` của bản đã overlay (`loadOrderView`), vì overlay có thể bỏ hẳn dòng của một loại khách đã bị sửa về 0, làm loại đó biến mất khỏi ô nhập
 * (lỗi thật, kiểm độc lập 2026-09-22).
 */
export async function getMyAssignments(db: D1Database, orderIds: readonly string[]): Promise<MyAssignmentDto[]> {
  const [views, originals] = await Promise.all([
    Promise.all(orderIds.map((id) => loadOrderView(db, id, false))), // "việc của tôi" không trả chặng — không cần dấu đặt gấp
    Promise.all(orderIds.map((id) => findOrder(db, id))),
  ]);
  const originalById = new Map(originals.flatMap((o) => (o ? [[o.id, o] as const] : [])));
  return views
    .filter((o): o is OrderDetailDto => o !== null && o.status !== "cancelled")
    .map((o) => {
      const editableById = new Map(originalById.get(o.id)!.services.map((s) => [s.id, editablePaxCodesOf(s)]));
      return {
        orderId: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        total: o.total,
        services: o.services.map((s) => ({
          id: s.id,
          name: s.name,
          catalogCode: s.catalogCode,
          pax: s.pax,
          editablePaxCodes: [...(editableById.get(s.id) ?? [])],
          departDate: s.departDate,
          departTime: s.departTime,
          pickupTime: s.pickupTime,
          pickupPlace: s.pickupPlace,
          checkinDate: s.checkinDate,
          checkinTime: s.checkinTime,
          checkinPlace: s.checkinPlace,
          note: s.note,
        })),
      };
    });
}

/**
 * HÀM CÔNG BỐ (sổ đại lý đợt 1; đợt 2 billing dùng lại): phần thương mại của một đơn, ĐÃ đọc nhưng CHƯA phân quyền — nơi gọi hỏi `can(...)` rồi qua `dungThuongMai` để chọn DTO theo người xem.
 * Thành tiền / số khách mỗi dòng lấy từ DTO đơn HIỆN HÀNH (`loadOrderView`, đã áp dòng điều chỉnh) — một công thức `soKhachTinhHoaHong`; mức là mức ĐÃ CHỤP (A-2). Đơn nháp ⇒ bản tính
 * thử theo bảng hôm nay (`duKien`, KHÔNG ghi); đơn xác nhận chưa có bản chụp (trước đợt 1) ⇒ `chuaChup`; đơn huỷ / không có ⇒ null.
 * KHÔNG tự kiểm quyền — chỉ gọi trong THÂN một `route(…)`, SAU `can()` (bài src/orders-cong-bo.test.ts).
 */
export async function phanThuongMaiCuaDon(db: D1Database, orderId: string): Promise<PhanThuongMai | null> {
  const don = await loadOrderView(db, orderId, false);
  if (!don || don.status === "cancelled") return null;
  const dichVu = don.services.map((s) => ({ id: s.id, name: s.name, thanhTien: s.items.reduce((t, i) => t + i.lineTotal, 0), soKhachTinh: soKhachTinhHoaHong({ unit: s.unit, pax: s.pax, items: s.items }) }));
  let chup: BanChup[];
  let duKien = false;
  let chuaChup = false;
  const ghiTay = new Set<string>();
  if (don.status === "draft") {
    duKien = true;
    const ngay = vnToday(new Date());
    const bang = await docBangChoChup(db, { bookerPartyId: don.bookerPartyId, catalogCodes: don.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay });
    chup = chupDon({
      nguoiHuong: bang.nguoiHuong, ngay, muc: bang.muc, dieuKhoan: bang.dieuKhoan,
      dong: don.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })),
    });
  } else {
    const rows = await banChupHienHanh(db, orderId);
    if (rows.length === 0) {
      chuaChup = true;
      chup = don.services.map((s) => chuaCoBanChup(s.id));
    } else {
      chup = rows.map(banChupTuDb);
      for (const r of rows) if (r.source === "MANUAL") ghiTay.add(r.order_service_id);
    }
  }
  const cty = await ownerCompany(db);
  const ids = chup.flatMap((c) => [c.beneficiaryPartyId, ...(c.cungUng.status === "SET" ? [c.cungUng.sellerPartyId] : [])]).filter((x): x is string => x !== null);
  return { duKien, chuaChup, chup, dichVu, ten: await tenHoSo(db, ids), congTyChuId: cty?.partyId ?? null, ghiTay };
}

export const ordersModule: AppModule = {
  name: "orders",
  routes: [
    // ADR-0061 điều 6: công tắc "Dịch vụ nhập tay". Hai route thuộc module orders (bảng ord_manual_service_policy) nhưng CỐ Ý không nằm dưới /api/orders:
    // đổi chính sách không phải thay đổi một đơn (không thuộc bài baoThayDoi của src/bang-tin-guard.test.ts), và tránh bẫy router ":id".
    // ĐỌC (cổng orders): form lập đơn biết hiện nút theo `duocDung` (= duocNhapTay của CHÍNH người gọi). Chỉ người lập đơn cần biết → hỏi order.create
    // (ADR-0019 điều 6: route sau cổng phải hỏi bảng; chỉ-HDV, Kế toán không lập đơn → 403). Toàn quyền có order.create nên màn cài đặt đọc cùng route.
    route("GET", "/api/cai-dat/nhap-tay", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Tài khoản này không lập đơn nên không dùng dịch vụ nhập tay.");
      const { bat } = await manualPolicy(env.DB, new Date().toISOString());
      return json({ batNhapTay: bat, duocDung: duocNhapTay(staff, bat), doiDuoc: can(staff, "settings.ops") } satisfies NhapTayResponse);
    }),
    // GHI (cổng admin): chỉ ô settings.ops (hôm nay chỉ Toàn quyền — Quản trị qua cổng nhưng 403). Đổi = chèn dòng mới, valid_from_at = lúc ghi, không lùi
    // (đi SAU dòng mới nhất, không trùng UNIQUE). Gửi CÙNG trạng thái đang hiệu lực = 200, không ghi dòng, không nhật ký. Nhật ký không gắn đơn (orderId NULL).
    // Hai lệnh cùng lúc cùng mốc ⇒ lệnh thua va UNIQUE ⇒ 409 `stale` (lô không áp).
    // Miễn trừ có tên ở bài NT-F7 (src/modules/billing/sau-da-giao.test.ts): không ghi đơn nào, không có đơn để khoá sau "Đã giao".
    route("POST", "/api/cai-dat/nhap-tay", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền bật / tắt được dịch vụ nhập tay.");
      const body = (await readJson(request)) as { batNhapTay?: unknown } | null;
      if (!body || typeof body !== "object" || typeof body.batNhapTay !== "boolean") return error(400, "invalid_input", "Chọn bật hoặc tắt dịch vụ nhập tay.");
      const muon = body.batNhapTay;
      const now = new Date();
      const hienTai = await manualPolicy(env.DB, now.toISOString());
      if (hienTai.bat !== muon) {
        const sau = hienTai.moiNhat && Date.parse(hienTai.moiNhat) >= now.getTime() ? new Date(Date.parse(hienTai.moiNhat) + 1) : now;
        const at = sau.toISOString();
        try {
          await env.DB.batch([
            manualPolicyInsert(env.DB, crypto.randomUUID(), muon, at, staff.id),
            auditStatement(env.DB, { staffId: staff.id, action: "manual_service_policy_changed", at, targetType: "system", detail: muon ? "Bật dịch vụ nhập tay" : "Tắt dịch vụ nhập tay" }),
          ]);
        } catch (e) {
          // Hai lệnh đổi cùng lúc (kiểm độc lập VỪA-2): lệnh sau va UNIQUE valid_from_at ⇒ cả lô không áp (không dòng, không nhật ký) — báo tải lại, không 500.
          if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Công tắc vừa được đổi — tải lại rồi thử lại.");
          throw e;
        }
      }
      return json({ batNhapTay: muon, duocDung: duocNhapTay(staff, muon), doiDuoc: true } satisfies NhapTayResponse);
    }),

    // Trang chủ (docs/superpowers/sdd/2026-09-23-trang-chu-moi): số liệu TOÀN CÔNG TY + "Chuyến đón hôm nay" (`OrderSummaryDto[]` có tên/SĐT khách, tiền).
    // ADR-0019 điều 1–2: cổng "orders" chỉ lọc thô; thân hỏi ba ô KHÔNG ngữ cảnh (= xem được MỌI đơn, mọi tiền, mọi liên hệ) TRƯỚC mọi truy vấn —
    // Đối tác/Thực tập (`own`) → 403. Nếu sau này `money.view`/`contact.view` của một mã bị thu hẹp (vd `assigned`), Trang chủ của mã đó 403 chứ
    // không trả số toàn công ty (Review Focus 4).
    // PHẢI đứng TRƯỚC route "GET /api/orders/:id" ở dưới: router (`match()`) khớp path theo VỊ TRÍ đoạn, nên ":id" cũng khớp chuỗi "dashboard" —
    // `createApp` lấy candidate ĐẦU TIÊN cùng method trong mảng `routes` (thứ tự khai ở đây), route này đứng trước nên thắng.
    // `ordersWithHandler` (ADR-0030 S20-13): tập đơn đang có người phụ trách cho ô "Chưa phụ trách" — gốc lắp ráp nối vào dispatch, orders không tự đọc.
    route("GET", "/api/orders/dashboard", "orders", async ({ env, staff, ordersWithHandler }) => {
      if (!can(staff, "order.view") || !can(staff, "money.view") || !can(staff, "contact.view")) return FORBIDDEN_VIEW();
      const today = vnToday(new Date());
      const { from, to } = vnWeekRange(today);
      const data = await getDashboard(env.DB, staff.id, today, from, to, ordersWithHandler);
      return json({ ...data, revenueWeek: { ...data.revenueWeek, from, to } } satisfies DashboardResponse);
    }),

    // Huy hiệu "Đơn hàng" ở thanh bên: CHỈ số đơn chưa xác nhận, một câu D1 (trước: nguyên Bảng điều khiển ~15 câu ở mọi trang). CÙNG ba ô quyền với dashboard
    // (bài `dem-nhap.test.ts` ép cùng mã trạng thái cho mọi loại tài khoản). PHẢI đứng TRƯỚC "GET /api/orders/:id" (":id" cũng khớp chữ "dem-nhap").
    route("GET", "/api/orders/dem-nhap", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.view") || !can(staff, "money.view") || !can(staff, "contact.view")) return FORBIDDEN_VIEW();
      return json({ draftCount: await countDrafts(env.DB) } satisfies DraftCountResponse);
    }),

    // Hàng chờ nhận (ADR-0030 S23-1, S23-2): PHẦN HẸP của các đơn chưa có người phụ trách, chưa huỷ, chưa qua ngày đi — hướng dẫn viên xem để bấm Nhận
    // (`PUT /api/orders/:id/handler`, module dispatch). PHẢI đứng TRƯỚC "GET /api/orders/:id" (cùng lý do với route dashboard ở trên — ":id" cũng khớp
    // chữ "pool"; Review Focus 3). Kiểm quyền TRƯỚC mọi đọc: ô `order.pool.view` (Hướng dẫn viên, Toàn quyền — Quản trị KHÔNG có: đã thấy đủ mọi đơn
    // qua `order.view`) VÀ không mang quyền Đối tác (tài khoản lai, Q-M — một trong "bốn cửa" của S20-5). Không đòi `contact.view`: nơi đón/giờ đón ở
    // phần hẹp là ngoại lệ có tên của ô đó, bù bằng che dãy số (`pool.ts`). Tập đơn đang có người hỏi qua `ordersWithHandler` (gốc lắp ráp nối vào
    // dispatch — S20-13), không SQL nào của orders đọc view của dispatch.
    route("GET", "/api/orders/pool", "orders", async ({ env, staff, ordersWithHandler }) => {
      if (!can(staff, "order.pool.view") || holdsPartner(staff)) return FORBIDDEN_VIEW();
      const today = vnToday(new Date());
      const sources = await listPoolSources(env.DB, today);
      const withHandler = await ordersWithHandler(sources.map((o) => o.id));
      return json({ orders: toPoolOrders(sources, withHandler, today) } satisfies PoolResponse);
    }),

    // Mốc tối thiểu cho biểu mẫu đơn CHƯA lưu (ruling R-P15 của điều phối, 29/9 — kế hoạch I31 cách (a)): người LẬP đơn đọc con số mốc + cảnh báo sát mốc
    // của chính sách HIỆN HÀNH để màn cảnh báo "dưới mốc" ngay khi gõ (CHỈ hiển thị — máy chủ vẫn quyết lúc lưu / xác nhận: `canhBaoMoc`, 409). Không đọc
    // bảng vc_: qua hàm tiêm `ctx.mocToiThieu` (gốc lắp ráp); thiếu hàm tiêm / chính sách rỗng → 503 như cổng Xác nhận (không đoán con số). PHẢI đứng TRƯỚC
    // "GET /api/orders/:id" (cùng lý do với route dashboard, pool ở trên — ":id" cũng khớp chữ "moc-toi-thieu").
    route("GET", "/api/orders/moc-toi-thieu", "orders", async ({ staff, mocToiThieu }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Bạn không lập đơn nên không cần mốc tối thiểu.");
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      return json({ mocToiThieuPhut: moc.phut, canhBaoPhut: moc.canhBaoPhut } satisfies MocToiThieuResponse);
    }),

    // ADR-0067 (chủ duyệt 30/9): danh sách NHỮNG NGƯỜI ĐÃ TỪNG LẬP ĐƠN cho ô "Người lập" của bộ lọc danh sách đơn. Hỏi ĐÚNG ba câu của nhánh "xem mọi
    // đơn" của `GET /api/orders` ngay dưới (order.view / money.view / contact.view, KHÔNG ngữ cảnh) TRƯỚC mọi truy vấn: tập người nhận danh sách = tập
    // người dùng được bộ lọc "mọi người" — ghép bằng bài ghim hành vi trên 512 tập con quyền (src/modules/orders/nguoi-lap-route.test.ts). Danh sách trắng
    // `{ id, ten, ganNhat }` (tên đã hiện trên thẻ đơn cho đúng những người này); không SĐT, vai, trạng thái nghỉ. Chỉ đọc — không nhật ký.
    // PHẢI đứng TRƯỚC "GET /api/orders/:id" (cùng lý do với route dashboard, pool ở trên — ":id" cũng khớp chữ "nguoi-lap").
    route("GET", "/api/orders/nguoi-lap", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.view") || !can(staff, "money.view") || !can(staff, "contact.view")) return FORBIDDEN_VIEW();
      const rows = await nguoiDaLapDon(env.DB);
      return json({ nguoiLap: rows.map((r) => ({ id: r.id, ten: r.ten, ganNhat: vnToday(new Date(r.gan_nhat)) })) } satisfies NguoiLapResponse);
    }),

    route("GET", "/api/orders", "orders", async ({ env, url, staff, myHandledOrderIds, nhapKeToanCuaDon }) => {
      // BA NHÁNH LỌC (ADR-0030 S23-4, Review Focus 1), mỗi nhánh hỏi bảng quyền với ĐÚNG ngữ cảnh của tập đơn nó trả:
      //  (1) `can(order.view)` KHÔNG ngữ cảnh ("any" — SALES/ACCOUNTING/ADMIN/SUPER_ADMIN) → mọi đơn, không lọc;
      //  (2) "mình lập": `can(order.view, { ownerId: chính mình })` ("own" — PARTNER/INTERN) → đơn có người lập = chính mình;
      //  (3) "mình phụ trách": `can(order.view, { assigned: true })` ("assigned" — FIELD) → đơn đang phụ trách, tập lấy qua `ctx.myHandledOrderIds` (gốc
      //      lắp ráp nối vào dispatch; orders không đọc dữ liệu phân công). Tài khoản ghép (vd FIELD + INTERN) thấy HỢP (2) ∪ (3).
      // Không nhánh nào đúng → 403 (mã `none` lọt qua cổng cũng không bao giờ thành "mọi đơn"). ADR-0019 điều 2: danh sách trả tiền (`total`…) và liên
      // hệ khách (`customerPhone`) → hỏi `money.view`/`contact.view` cho TỪNG tập sẽ trả với đúng ngữ cảnh đó. Mọi câu hỏi quyền đứng TRƯỚC đọc tham
      // số và trước mọi truy vấn (403 không đứng sau 400).
      const seesAll = can(staff, "order.view");
      const mine = { ownerId: staff.id };
      const handling = { assigned: true };
      const own = !seesAll && can(staff, "order.view", mine);
      const handled = !seesAll && can(staff, "order.view", handling);
      if (!seesAll && !own && !handled) return FORBIDDEN_VIEW();
      if (seesAll && (!can(staff, "money.view") || !can(staff, "contact.view"))) return FORBIDDEN_VIEW();
      if (own && (!can(staff, "money.view", mine) || !can(staff, "contact.view", mine))) return FORBIDDEN_VIEW();
      if (handled && (!can(staff, "money.view", handling) || !can(staff, "contact.view", handling))) return FORBIDDEN_VIEW();
      // ADR-0060 điều 5 (4): tham số lọc dấu kế toán CHỈ cho người có ô `accounting.entry.view` KHÔNG ngữ cảnh (any — Bán hàng, Kế toán, Quản trị, Toàn quyền);
      // HDV, Thực tập, Đối tác gửi tham số → 403 (họ chỉ thấy nhãn trên thẻ đơn của mình). Đứng TRƯỚC mọi 400 của tham số.
      const locNhapTho = url.searchParams.get("nhapKeToan");
      if (locNhapTho !== null && !can(staff, "accounting.entry.view")) return error(403, "forbidden", "Tài khoản này không lọc được theo dấu nhập phần mềm kế toán.");
      // Bộ lọc nhiều điều kiện (góp ý T4): kiểm ở `docLocDon` (thuần) SAU mọi câu hỏi quyền; listOrders AND bộ lọc với phạm vi ở trên — không bao giờ nới.
      const loc = docLocDon(url.searchParams);
      if (!loc.ok) return error(400, "invalid_input", loc.message);
      let locNhap: "da" | "chua" | null = null;
      if (locNhapTho !== null) {
        if (locNhapTho !== "da" && locNhapTho !== "chua") return error(400, "invalid_input", "Bộ lọc nhập phần mềm kế toán không hợp lệ.");
        // A-6: bắt buộc kèm khoảng ngày đi, tối đa 92 ngày (tính cả hai đầu) — giữ tập ứng viên nhỏ, không phình theo năm tháng.
        if (loc.loc.tu === null || loc.loc.den === null) return error(400, "invalid_input", "Lọc theo nhập phần mềm kế toán phải chọn Từ ngày và Đến ngày.");
        if (soNgayKhoang(loc.loc.tu, loc.loc.den) > LOC_NHAP_TOI_DA_NGAY) {
          return error(400, "invalid_input", `Lọc theo nhập phần mềm kế toán chỉ trong tối đa ${LOC_NHAP_TOI_DA_NGAY} ngày.`);
        }
        locNhap = locNhapTho;
      }
      // Nhãn "đã nhập" trên thẻ (A-12): ô xem hỏi theo TỪNG đơn — any; own (đơn mình lập); assigned (tập đơn đang phụ trách lấy MỘT lần mỗi request).
      const xemNhapMoi = can(staff, "accounting.entry.view");
      const xemNhapCuaMinh = can(staff, "accounting.entry.view", mine);
      const xemNhapPhuTrach = can(staff, "accounting.entry.view", handling);
      const phuTrach = handled || (!xemNhapMoi && xemNhapPhuTrach) ? await myHandledOrderIds() : null;
      // Đặc tả QR §4.3: chữ tìm chứa nội dung chuyển khoản (mã đơn bỏ gạch) ⇒ tìm theo mã đơn chuẩn; câu SQL không đổi (query-plan.test.mjs ghim nó).
      const qGo = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const phamVi = {
        q: maDonTuNoiDung(qGo) ?? qGo,
        loc: loc.loc,
        ownerId: own ? staff.id : null,
        // Tập rỗng (chưa phụ trách đơn nào) = danh sách rỗng, KHÔNG phải "không lọc" (listOrders coi [] là "không đơn nào").
        orderIds: handled ? phuTrach : null,
      };
      const limit = intParam(url.searchParams.get("limit"), 30, 1, 100);
      const offset = intParam(url.searchParams.get("offset"), 0, 0, 100000);
      let result: Awaited<ReturnType<typeof listOrders>>;
      let daNhap: Set<string> | null = null;
      if (locNhap !== null) {
        // ADR-0060 điều 5 (2): tập ứng viên trong khoảng ngày (CÙNG phạm vi + bộ lọc) → hàm tiêm của billing → lọc + phân trang trên tập đã lọc.
        const ungVien = await listOrderIds(env.DB, phamVi, LOC_NHAP_TOI_DA_UNG_VIEN);
        if (ungVien.length > LOC_NHAP_TOI_DA_UNG_VIEN) return error(400, "invalid_input", "Khoảng ngày có quá nhiều đơn để lọc theo nhập phần mềm kế toán — thu hẹp khoảng ngày.");
        daNhap = await nhapKeToanCuaDon(ungVien);
        if (daNhap === null) return error(503, "chua_san_sang", "Chưa lọc được theo nhập phần mềm kế toán. Thử lại sau.");
        const set = daNhap;
        const daLoc = ungVien.filter((id) => set.has(id) === (locNhap === "da"));
        const trang = daLoc.slice(offset, offset + limit);
        const r = await listOrders(env.DB, { ...phamVi, chiTrongIds: trang, limit, offset: 0 });
        result = { ...r, hasMore: daLoc.length > offset + limit };
      } else {
        result = await listOrders(env.DB, { ...phamVi, limit, offset });
      }
      const phuTrachSet = new Set(phuTrach ?? []);
      const duocXem = result.orders
        .map((o) => o.id)
        .filter((id) => xemNhapMoi || (xemNhapCuaMinh && result.owners.get(id) === staff.id) || (xemNhapPhuTrach && phuTrachSet.has(id)));
      if (daNhap === null && duocXem.length) daNhap = await nhapKeToanCuaDon(duocXem);
      const choXem = new Set(duocXem);
      const orders = result.orders.map((o) => (daNhap?.has(o.id) && choXem.has(o.id) ? { ...o, nhapKeToan: true as const } : o));
      return json({ orders, hasMore: result.hasMore } satisfies OrderListResponse);
    }),

    // Lập đơn. Đơn mới KHÔNG tự gắn người lập (ADR-0030 S20-4, ADR-0020 điều 1, Q-C): người lập chọn người phụ trách ngay trong form (`handlerStaffId`,
    // tuỳ chọn); không chọn → đơn chờ người nhận. Thứ tự: 403 (không lập đơn được) → đọc thân → 403 (có chọn người mà không có `dispatch.assign` trên đơn
    // của chính mình — Thực tập, Đối tác: G4; đứng TRƯỚC mọi 400 và mọi đọc CSDL) → 400 (dạng mã người được chọn) → 400/409 (đơn: validateOrder,
    // priceGuard, người đặt) → 400 `invalid_assignee` (người được chọn không đủ điều kiện — `dispatch` xét bằng `checkAssignee`; KHÔNG tạo đơn) → ghi.
    route("POST", "/api/orders", "orders", async ({ env, request, staff, newOrderHandler, baoThayDoi, mocToiThieu }) => {
      if (!can(staff, "order.create")) return CANNOT_CREATE();
      const body = await readJson(request);
      // ADR-0047 A2: thân có khoá `passengers` (danh sách khách của đơn nháp — Ruling R1) → hỏi thêm ô nhập tên khách trên đơn của chính mình.
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: staff.id })) return CANNOT_WRITE_PASSENGERS();
      if (hasHandlerPick(body) && !can(staff, "dispatch.assign", { ownerId: staff.id })) return CANNOT_PICK_HANDLER();
      if (laThanDonCu(body)) await demThanCu(env.DB, staff.id, "lap_don"); // ADR-0047 §6 — đếm máy cũ (cổng Đợt 8); sau 403, trước 400
      const pick = parseHandlerPick(body);
      if (!pick.ok) return error(400, "invalid_input", pick.message);
      const ctx = await validationContext(env.DB, null);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx, (await manualPolicy(env.DB, new Date().toISOString())).bat); // ADR-0061: công tắc đọc một lần
      if (guard) return guard;
      // ADR-0047 (R7, R3): điểm danh mục của chặng phải đang dùng; đặt hai khoá cũ = dẫn xuất từ chặng (ghi kép vào cột cũ).
      const placed0 = await resolveLegPlaces(env.DB, parsed.value, ctx);
      if (!placed0.ok) return error(400, "invalid_input", placed0.message);
      const placed = oPhuNhap(staff, { ownerId: staff.id, assigned: false }, placed0.value, []); // kế hoạch ô mới Task 3.3
      if (!placed.ok) return placed.res;
      // Sổ đại lý đợt 1 (ADR-0077 đ3 (i), thu hẹp): Đối tác có hồ sơ được hưởng ⇒ bên đặt luôn là hồ sơ của tài khoản, bỏ qua điều trình duyệt gửi.
      const ben = await benDatCuaTaiKhoan(env.DB, staff, placed.value.booker, null);
      if (!ben.ok) return ben.res;
      const booker = await resolveBooker(env.DB, ben.booker, staff.id, new Date());
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // ADR-0049 D2 (I25, I27): nháp CÓ chặng cần mốc tối thiểu để cảnh báo (không chặn lưu) — gọi ĐÚNG MỘT lần; chưa có mốc → 503 (không đoán).
      const coChang = placed.value.services.some((s) => s.legs.length > 0);
      const moc = coChang ? await mocToiThieu() : null;
      if (coChang && !moc) return MOC_CHUA_CO();
      // Người được chọn: `dispatch` trả câu lệnh (mở dòng `HANDLE` + nhật ký `order_handler_changed`) để gộp vào CÙNG db.batch() tạo đơn — dựng theo id
      // đơn và mốc `at` của TỪNG lần thử của `createOrder`, nên dòng phụ trách và nhật ký cùng mốc với dòng `created`. Không đạt → 400, không tạo đơn.
      const handler = pick.staffId === null ? null : await newOrderHandler(pick.staffId);
      if (handler && !handler.ok) return error(400, "invalid_assignee", handler.message);
      const id = await createOrder(env.DB, staff.id, placed.value, handler?.statements, booker.write);
      // Bảng tin (ADR-0022 điều 4/7): "tao" — KHÔNG truyền `handlerTruoc` (ADR-0030 Review Focus 5); gốc lắp ráp (src/index.ts) tự đổi thành
      // "tao_cho_nhan" khi đơn không có người phụ trách (chỉ làm mới màn hình, KHÔNG thông báo nổi/gõ cửa — ADR-0045). Không bao giờ phát "giao" cho đơn vừa lập.
      baoThayDoi({ orderId: id, thayDoi: "tao" });
      const taoXong = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
      return json({ order: taoXong, ...(await phanHoiMoc(env.DB, id, taoXong, moc)) } satisfies OrderResponse, 201, { location: trangDon(id) });
    }),

    route("GET", "/api/orders/:id", "orders", async ({ env, params, staff, isAssigned, mocToiThieu }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      // ADR-0049 I31: kèm mốc tối thiểu đang hiệu lực (biểu mẫu cảnh báo trước khi xác nhận) — đọc không bị chặn khi chưa có mốc (null).
      const [order, assigned, moc] = await Promise.all([loadOrderView(env.DB, params.id!, xemDuDatGap(staff)), isAssigned(params.id!), mocToiThieu()]);
      if (!order) return NOT_FOUND();
      // ADR-0007/0009: nhật ký/lịch sử sửa đơn — SALES chỉ đơn của mình hoặc đơn mình đang phụ trách; ACCOUNTING và ADMIN mọi đơn.
      // `assigned` tính MỘT lần cho cả nhật ký và `canModify`.
      const scope = { ownerId: order.staffId, assigned };
      // ADR-0014 điều 3 (D-01): PARTNER chỉ xem được chi tiết đơn của chính mình — SALES/ACCOUNTING/ADMIN/SUPER_ADMIN (order.view = any) luôn qua.
      // ADR-0030 S23-4: tài khoản CHỈ xem đơn mình phụ trách (chỉ-FIELD) nhận 404 như đơn không tồn tại (không dò được đơn người khác, kể cả đơn chờ nhận —
      // hàng chờ có route riêng ở dạng phần hẹp); Đối tác/Thực tập mở đơn người khác vẫn 403 (Review Focus 2).
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN();
      // ADR-0019 điều 2: chi tiết đơn trả tiền và liên hệ khách — hỏi hai ô với phạm vi CỦA ĐƠN NÀY; sai thì 403 (không cắt bớt trường).
      if (!can(staff, "money.view", scope) || !can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      // R-P21 (áp lời chủ H4): dòng đặt gấp của lịch sử rút gọn theo vai (Đối tác, HDV, Thực tập không thấy lý do, tên người duyệt).
      // ADR-0060 điều 3 (ii): dòng order_accounting_entry_* chỉ cho người qua ô accounting.entry.view với ĐƠN NÀY (luật theo ô, không theo danh tính "Đối tác").
      const xemNhapKeToan = can(staff, "accounting.entry.view", scope);
      const history = can(staff, "order.history.view", scope)
        ? lichSuTheoVai(await getAuditTrail(env.DB, order.id), xemDuDatGap(staff))
          .filter((e) => xemNhapKeToan || !laDongNhapKeToan(e.action))
          // Sổ đại lý đợt 1 (C9 = A): mức hoa hồng đã chụp / ghi tay KHÔNG lộ cho Đối tác qua lịch sử — tài khoản lai cũng bị lọc ("có quyền Đối tác là áp").
          .filter((e) => !holdsPartner(staff) || !laDongThuongMai(e.action))
        : [];
      // ADR-0063 D1: dữ liệu bảng "Sửa số khách dịch vụ" — chỉ khi người xem sửa được (cùng hàm ẩn/hiện của giao diện); loại khách sửa được tính từ BẢN CHỤP GỐC
      // (`findOrder`, trước điều chỉnh — loại đã về 0 vẫn còn ô, cùng cách "Việc của tôi").
      const suaSoKhach: SuaSoKhachDichVuDto[] | null = duocSuaSoKhachVanPhong(staff, order)
        ? ((await findOrder(env.DB, order.id))?.services ?? []).filter((s) => s.catalogCode !== null).map((s) => ({ serviceId: s.id, loaiKhach: [...editablePaxCodesOf(s)] }))
        : null;
      // Đơn đã "Đã giao" bị khoá (ADR-0025 đ5) ⇒ không còn nút sửa (giao diện chỉ ẩn/hiện; máy chủ từ chối ở mọi route ghi).
      return json({
        order, history, canModify: can(staff, "order.modify", scope) && order.deliveredAt === null, mocToiThieuPhut: moc?.phut ?? null, suaSoKhach,
        canhBaoKhuyenMai: await nhacKhuyenMaiCuaDon(env.DB, order), // ADR-0114 D1: người xem đã qua `money.view` ở trên (giảm giá là dữ liệu tiền) — không lộ thêm gì
        // ADR-0114 D2: lịch sử số khách CHỈ cho người qua `order.history.view` với đơn này (cùng điều kiện khối `history` ở trên), còn lại null — không đổi ai được xem gì.
        lichSuSoKhach: can(staff, "order.history.view", scope) ? await lichSuSoKhachCuaDon(env.DB, order) : null,
      } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const body = await readJson(request);
      // ADR-0047 A2: thân có khoá `passengers` → hỏi thêm ô nhập tên khách với phạm vi CỦA ĐƠN NÀY (trước validateOrder).
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: meta.staffId, assigned })) return CANNOT_WRITE_PASSENGERS();
      if (laThanDonCu(body)) await demThanCu(env.DB, staff.id, "luu_nhap"); // ADR-0047 §6 — trước PM-1
      // PM-1: khoá lạc quan kiểm TRƯỚC thân — mốc gửi lên đã cũ thì thân so với chặng/dịch vụ ĐANG lưu (phiên khác vừa đổi) sẽ báo lỗi sai chỗ
      // ("chặng không thuộc dịch vụ"); trả 409 stale cho form bảo tải lại. Lính gác `updated_at = ?` trong câu ghi vẫn giữ (đua sau bước này).
      const mocGui = body?.expectedUpdatedAt;
      if (typeof mocGui === "string" && mocGui !== "" && mocGui !== meta.updatedAt) return STALE();
      const ctx = await validationContext(env.DB, id);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx, (await manualPolicy(env.DB, new Date().toISOString())).bat); // ADR-0061: công tắc đọc một lần
      if (guard) return guard;
      const placed0 = await resolveLegPlaces(env.DB, parsed.value, ctx); // ADR-0047 (R7, R3)
      if (!placed0.ok) return error(400, "invalid_input", placed0.message);
      // Kế hoạch ô mới Task 3.3: số hiệu chuyến bay / số người chiều về — khoá vắng = chép giá trị đang lưu của chặng cùng id; đổi số người cần order.trip.edit.
      const placed = oPhuNhap(staff, { ownerId: meta.staffId, assigned }, placed0.value, ctx.stored.flatMap((s) => s.legs));
      if (!placed.ok) return placed.res;
      const expected = placed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      // Thân yêu cầu không có CẢ HAI khoá `bookerPartyId`/`newBooker` (một `order-form.js` PWA cũ trong bộ nhớ đệm chưa biết trường người đặt) → GIỮ NGUYÊN
      // người đặt đang lưu, không gọi resolveBooker (đơn đang phụ trách bởi hồ sơ đã bị ngưng sẽ 400 nếu resolveBooker chạy lại). `bookerPartyId: null`
      // tường minh vẫn bỏ gắn như cũ. Giới hạn đã biết: BOOKER_VALUE ghi NULL nếu hồ sơ giữ lại không còn đủ điều kiện (cá nhân đang hoạt động, hoặc tổ chức đang mang vai được hưởng) — chấp nhận được.
      const noBookerKeys = body !== null && typeof body === "object" && !("bookerPartyId" in body) && !("newBooker" in body);
      // Sổ đại lý đợt 1: Đối tác có hồ sơ được hưởng luôn ghi hồ sơ của mình — kể cả khi thân cũ không có khoá bên đặt (nhường nhánh "giữ bên đặt cũ").
      const ben = await benDatCuaTaiKhoan(env.DB, staff, placed.value.booker, meta.bookerPartyId);
      if (!ben.ok) return ben.res;
      const booker = noBookerKeys && !ben.ep
        ? { ok: true as const, write: { partyId: meta.bookerPartyId, before: [], note: null } }
        : await resolveBooker(env.DB, ben.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // ADR-0047: lưu nháp xoá–chèn lại chặng — giữ `created_*` của chặng gửi lại cùng id.
      const legMeta = new Map(ctx.stored.flatMap((s) => s.legs.map((l) => [l.id, { createdAt: l.createdAt, createdBy: l.createdBy }] as const)));
      // ADR-0049 D2: nháp có chặng → mốc (một lần; chưa có → 503). Q1 = (a): chặng khớp ĐÚNG MỘT chặng cũ đã đặt gấp thì mang dấu cũ (đọc từ CSDL).
      const coChang = placed.value.services.some((s) => s.legs.length > 0);
      const moc = coChang ? await mocToiThieu() : null;
      if (coChang && !moc) return MOC_CHUA_CO();
      const datGapNhap = coChang ? chepDatGapNhap(await legDatGapByOrder(env.DB, id), placed.value.services) : new Map<string, DatGapWrite>();
      // Q2 (chủ trả lời 2026-09-30 "Đưa cọc cũ về 0, ghi nhật ký"): nháp CŨ còn cọc ghi trên đơn mà tổng mới < cọc cũ → câu lưu nháp đưa cột cọc về 0 (số tiền
      // không mất — đã là lần thu "chưa rõ" trong sổ của billing); ghi số cọc cũ vào dòng nhật ký `updated` (không SĐT).
      const cocCu = await cocCuNhap(env.DB, id);
      const ghiChuCoc = cocCu > placed.value.total ? `đưa tiền cọc cũ ${cocCu.toLocaleString("vi-VN")} ₫ ghi trên đơn về 0 (tiền đã nằm ở lần thu "chưa rõ" trong sổ)` : null;
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...placed.value, expectedUpdatedAt: expected }, booker.write, legMeta, datGapNhap, ghiChuCoc))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      const suaXong = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
      return json({ order: suaXong, ...(await phanHoiMoc(env.DB, id, suaXong, moc)) } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      const stored = await getStoredServices(env.DB, id);
      const tripBody = await readJson(request);
      if (laThanTripCu(tripBody)) await demThanCu(env.DB, staff.id, "sua_chuyen"); // ADR-0047 §6 — đếm máy cũ
      const parsed = validateTripUpdate(tripBody, stored.map((s) => ({ id: s.id, departDate: s.trip.departDate })), meta.status, vnToday(new Date()));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      // ADR-0047 (R2c, R4e, R3): trộn hai khoá cũ CÓ MẶT vào chặng chiều đi đầu, dời chặng theo ngày đi mới; `trip` mang giá trị dẫn xuất (ghi kép + nhật ký).
      const planned = keHoachChangTrip(stored, parsed.value.updates);
      const moTa = describeTripUpdates(stored, planned.updates) ?? (planned.ops.length ? "cập nhật chặng đưa đón" : null);
      if (moTa === null) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      // ADR-0049 I14: đơn ĐÃ XÁC NHẬN mà lệnh đổi / thêm chặng dưới mốc (min giờ cũ, giờ mới) → Quản trị, Toàn quyền + `datGap`. Chặng đổi mà không dấu mới →
      // dấu cũ bỏ (I16). Đơn nháp: mốc xét lúc xác nhận; khoá `datGap` không dùng ở đây (dấu nháp đi qua route đặt gấp).
      let datGap: DatGapWrite | null = null;
      const doiChang = planned.ops.filter((op) => op.kind !== "close");
      if (meta.status === "confirmed" && doiChang.length > 0) {
        const moc = await mocToiThieu();
        if (!moc) return MOC_CHUA_CO();
        const cuTheoId = new Map(stored.flatMap((s) => s.legs).map((l) => [l.id, l] as const));
        const nowMs = Date.now();
        const duoi = doiChang.some((op) => (op.kind === "update" ? duoiMocKhiSua(cuTheoId.get(op.legId) ?? null, op.fields, nowMs, moc.phut) : duoiMocKhiSua(null, op.kind === "insert" ? op.leg : null, nowMs, moc.phut)));
        const x = xetDatGapSua(staff, tripBody, duoi, moc);
        if (!x.ok) return x.res;
        datGap = x.value;
      }
      const detail = kemDatGap(moTa, datGap);
      // G17: dòng `order_leg_updated` của chặng đổi ngày / giờ mang cùng đuôi đặt gấp như route sửa chặng (hàm đọc tin bóc đuôi — `bocDatGap`).
      const ops = planned.ops.map((op) => (op.kind === "update" && op.nhatKy !== undefined ? { ...op, nhatKy: kemDatGap(op.nhatKy, datGap) } : op));
      if (!(await updateTrip(env.DB, id, staff.id, planned.updates, parsed.value.expectedUpdatedAt, detail, ops, datGap))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    // ---- Chặng đưa đón SAU XÁC NHẬN (ADR-0047 A1, Ruling R1): thêm / sửa trường vận hành / bỏ (= đóng dòng có lý do). Ô `order.trip.edit` { ownerId,
    // assigned } (cùng loại dữ liệu với "Sửa thông tin chuyến"), hỏi TRƯỚC khi đọc thân. Đơn nháp → 409 `use_order_form` (chặng của nháp đi trong thân
    // PUT /api/orders); đơn huỷ → 409. Khoá lạc quan: thêm theo mốc ĐƠN, sửa/đóng theo mốc CHẶNG. Mỗi lần ghi báo Bảng tin "chuyen" đúng một lần.
    route("POST", "/api/orders/:id/legs", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      const body = await readJson(request);
      const plan = await planAddLeg(env.DB, id, body, vnToday(new Date()));
      if (!plan.ok) return error(400, "invalid_input", plan.message);
      // ADR-0049 I14: chặng MỚI dưới mốc → Quản trị, Toàn quyền + `datGap` (dấu ghi cùng dòng).
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      const x = xetDatGapSua(staff, body, duoiMocKhiSua(null, plan.value.leg, Date.now(), moc.phut), moc);
      if (!x.ok) return x.res;
      if (!(await addLeg(env.DB, id, staff.id, { ...plan.value, detail: kemDatGap(plan.value.detail, x.value), datGap: x.value }))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse, 201, { location: trangDon(id) });
    }),

    route("PUT", "/api/orders/:id/legs/:legId", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu, dongBoChuyen }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      // NHÁNH NHÁP (ADR-0054 D10.3 "đường mới cho đơn nháp"; kế hoạch ô mới Task 3.5) — `lenhNhap` (dưới đây); đơn đã xác nhận đi đường cũ. Cả hai về MỘT chỗ
      // ghi + một lời gọi Bảng tin.
      const lenh = meta.status === "draft" ? await lenhSoNguoiVeNhap(env.DB, id, legId, request) : await lenhSuaChang(env.DB, id, legId, request, staff, meta.status, mocToiThieu);
      if ("res" in lenh) return lenh.res;
      if (lenh.sua === null) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      // ADR-0104 Đ2 (điểm gọi 4): lô sửa chặng (câu đơn đứng đầu) + khúc chuyến của máy — chỉ theo SỐ NGƯỜI của chặng; đơn nháp không có suất (lc09).
      const soan = soanSuaChang(env.DB, id, staff.id, meta.updatedAt, lenh.sua);
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau, ...sauSuaChang(meta.status, legId, lenh.soNguoi) });
      const r = await chayLoNoiChuyen(env.DB, dong, thangCauDau);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!, dongBoChuyen: r.dongBoChuyen } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/legs/:legId/close", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, dongBoChuyen }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const plan = await planCloseLeg(env.DB, id, legId, await readJson(request));
      if (!plan.ok) return legFailure(plan);
      // ADR-0104 Đ2 (điểm gọi 3): lô bỏ chặng (câu đơn đứng đầu) + khúc chuyến của máy (đóng suất của chặng — REMOVED).
      const soan = soanSuaChang(env.DB, id, staff.id, meta.updatedAt, { kind: "close", ...plan.value });
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau, sau: { trangThai: meta.status, changDong: [legId] } });
      const r = await chayLoNoiChuyen(env.DB, dong, thangCauDau);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!, dongBoChuyen: r.dongBoChuyen } satisfies OrderResponse);
    }),

    // ---- THAY chặng (C14 — đánh giá ERP 2026-10-07): "Đổi sang chặng khác" / "Nhập nhầm" = đóng chặng cũ (`reasonCode` REPLACED | WRONG_ENTRY, vắng = REPLACED)
    // + thêm chặng mới cùng dịch vụ, cùng chiều, trong
    // MỘT lô và MỘT khoá lạc quan (mốc ĐƠN) — không còn cảnh bỏ được mà thêm bị chặn (đơn đã xác nhận còn 0 chặng). Ô, thứ tự từ chối như route thêm chặng.
    // Mốc 6 giờ (ADR-0049 D2, I14) xét như lệnh SỬA chặng — min(giờ chặng cũ, giờ chặng mới) — vì thay chặng thực chất là sửa chặng đó (người điều phối quyết
    // 2026-10-08), TRƯỚC khi ghi: dưới mốc → 409 `short_notice_required` (Quản trị, Toàn quyền kèm `datGap` thì qua — dấu ghi lên chặng mới) và chặng cũ KHÔNG
    // bị đóng. Lệnh BỎ chặng đứng riêng vẫn không có luật mốc. Phản hồi 200 `{ order }` như route sửa / bỏ chặng: lệnh đổi chặng của một đơn có sẵn, trả lại
    // chính đơn đó (không có tài nguyên mới để trỏ `Location`).
    route("POST", "/api/orders/:id/legs/:legId/replace", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu, dongBoChuyen }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const body = await readJson(request);
      const plan = await planReplaceLeg(env.DB, id, legId, body, vnToday(new Date()));
      if (!plan.ok) return legFailure(plan);
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      const x = xetDatGapSua(staff, body, duoiMocKhiSua(plan.value.cu, plan.value.leg, Date.now(), moc.phut), moc);
      if (!x.ok) return x.res;
      // ADR-0104 Đ2 (điểm gọi 8): lô thay chặng (câu đơn đứng đầu; mã nhật ký = dòng `order_leg_closed`) + khúc chuyến của máy (đóng suất của chặng CŨ).
      const soan = soanThayChang(env.DB, id, staff.id, { ...plan.value, detailThem: kemDatGap(plan.value.detailThem, x.value), datGap: x.value });
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau, sau: { trangThai: meta.status, changDong: [legId] } });
      const r = await chayLoNoiChuyen(env.DB, dong, thangCauDau);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!, dongBoChuyen: r.dongBoChuyen } satisfies OrderResponse);
    }),

    // ---- ĐẶT GẤP (ADR-0049 D2, D3; kế hoạch Task A10, TC-22, TC-25, TC-28): Quản trị / Toàn quyền đóng dấu "đặt gấp" lên MỘT chặng còn mở của đơn nháp
    // hoặc đã xác nhận → chặng đó được xác nhận / xếp dưới mốc tối thiểu. Ô hỏi ĐẦU thân (403 trước 400). Số phút = mốc HIỆN HÀNH (chụp tại mốc — 5.6);
    // mốc chưa có → 503. Ghi chú che dãy số, lưu trên chặng, KHÔNG vào nhật ký (I18). Nhật ký: mã đơn + chiều + nhãn lý do.
    route("POST", "/api/orders/:id/legs/:legId/short-notice", "orders", async ({ env, request, params, staff, baoThayDoi, mocToiThieu }) => {
      if (!can(staff, "order.leg.short_notice")) return CANNOT_SHORT_NOTICE();
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const than = docDatGap(await readJson(request)); // MỘT bộ đọc với nhánh `datGap` của lệnh sửa chặng
      if (!than.ok) return error(400, "invalid_input", than.message);
      const { lyDo, ghiChu: ghiChuSach } = than.value;
      const [meta, moc] = await Promise.all([getMeta(env.DB, id), mocToiThieu()]);
      if (!meta) return NOT_FOUND();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const [leg, ref] = await Promise.all([legById(env.DB, legId, id), getOrderRef(env.DB, id)]);
      if (!leg) return LEG_NOT_FOUND();
      if (leg.closed_at) return LEG_CLOSED();
      if (!moc) return MOC_CHUA_CO();
      const at = new Date().toISOString();
      const detail = `${ref?.orderCode ?? ""} · ${CHIEU_LABEL[leg.direction]}${ghiDatGapNhatKy(LY_DO_DAT_GAP[lyDo])}`;
      const results = await env.DB.batch([
        legShortNotice(env.DB, legId, id, { lyDo, ghiChu: ghiChuSach, by: staff.id, at, phut: moc.phut }),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_leg_short_notice", at, detail }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    // ---- Danh sách hành khách (ADR-0047 A2). ĐỌC: khuôn chi tiết đơn — `order.view` theo phạm vi đơn (chỉ-FIELD không phụ trách → 404 như đơn không tồn
    // tại), rồi `contact.view` (nay gồm họ tên + năm sinh). Chỉ dòng hiện hành; cờ "nhiều hơn số khách" (R9). Không tên/năm sinh trong nhật ký/Bảng tin.
    route("GET", "/api/orders/:id/passengers", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      const scope = { ownerId: meta.staffId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN();
      if (!can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      return json((await passengerList(env.DB, id)) satisfies PassengerListResponse);
    }),

    // GHI (đơn ĐÃ XÁC NHẬN — Ruling R1; đơn nháp đi trong thân PUT /api/orders): ô `order.passenger.write` { ownerId, assigned } TRƯỚC khi đọc thân; khoá
    // lạc quan theo `orders.updated_at`; chỉ-thêm (R8); nhật ký ĐÚNG khuôn "thêm N, sửa N, huỷ N khách"; Bảng tin "sua" đúng một lần.
    route("POST", "/api/orders/:id/passengers", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, dongBoChuyen }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.passenger.write", { ownerId: meta.staffId, assigned })) return CANNOT_WRITE_PASSENGERS();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      const plan = await planPassengerChange(env.DB, id, await readJson(request), vnToday(new Date()));
      if (!plan.ok) return error(400, "invalid_input", plan.message);
      if (plan.value.none) return json((await passengerList(env.DB, id)) satisfies PassengerListResponse); // không đổi gì
      // ADR-0104 Đ2 (điểm gọi 5): lô sửa khách (câu đơn đứng đầu) + khúc chuyến của máy — khoá người của đơn SAU lệnh; số người không đổi ở route này.
      const soan = soanDoiKhach(env.DB, id, staff.id, plan.value);
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau, sau: { trangThai: meta.status, nguoi: plan.value.nguoiSau } });
      const r = await chayLoNoiChuyen(env.DB, dong, thangCauDau);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json({ ...(await passengerList(env.DB, id)), dongBoChuyen: r.dongBoChuyen } satisfies PassengerListResponse);
    }),

    // ---- VĂN PHÒNG SỬA SỐ KHÁCH sau xác nhận (ADR-0063 D1, chủ duyệt 2026-10-08). Ô `order.money.edit` hỏi KHÔNG truyền `assigned`: Bán hàng chỉ đơn MÌNH lập
    // (own), Kế toán / Quản trị / Toàn quyền mọi đơn (any); HDV giữ route hẹp `handler-money-edit` (dispatch). Thứ tự: 404 → 403 → 409 Đã giao (trước khi đọc
    // thân; trigger 0044 là lưới cuối) → 409 nháp / huỷ → 400 thân (lý do MÃ ĐÓNG ADR-0023 điều 4, không chữ tự gõ, không số tiền) → 409 stale. KHÔNG chặn theo
    // ngày đi; KHÔNG chặn giảm giá vượt tạm tính (chỉ cảnh báo — ADR-0109; phải thu kẹp 0 ở effectiveMoney). Tiền: `planMoneyEdit` (một luật với đường HDV) — không bao giờ tin số từ trình duyệt. Đây không phải đường
    // thêm / sửa dịch vụ nhập tay (chỉ số khách của dịch vụ danh mục đã có — ADR-0061 điều 5 không áp, câu duyệt của chủ).
    route("POST", "/api/orders/:id/money-edit", "office", async ({ env, request, params, staff, baoThayDoi, dongBoChuyen }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.money.edit", { ownerId: meta.staffId })) return MONEY_EDIT_FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return MONEY_EDIT_DRAFT();
      if (meta.status === "cancelled") return CANCELLED();
      const than = docThanSuaSoKhach(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      // Lý do đi vào luật chung dưới dạng NHÃN cố định do máy chủ chọn (planMoneyEdit nhận `reason` chữ — cùng bộ đọc với đường HDV).
      const soan = await soanSuaSoKhach(env.DB, id, staff.id, { reason: than.nhan, services: than.services }, "order_money_adjusted");
      if (!soan.ok) return soan.code === "thieu_nguoi_lon" ? error(409, "thieu_nguoi_lon", soan.message) : error(400, "invalid_input", soan.message); // ADR-0114 D3: 409, cùng mã với đường hướng dẫn viên
      if (!soan.ghi) {
        const order = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
        return json({ order, daGhi: false, canhBaoTongAm: canhBaoGiamGiaVuot(order), canhBaoKhuyenMai: await nhacKhuyenMaiCuaDon(env.DB, order) } satisfies MoneyEditResponse);
      }
      // ADR-0104 Đ2 (điểm gọi 6): máy đồng bộ chuyến nối khúc chuyến SAU câu đơn — MỘT lô; số người từng chặng sau lệnh + phần vừa tăng (Q-2 = a).
      const dong = await dongBoChuyen({
        orderId: id, auditIdDon: soan.auditId, bayGioMs: Date.now(), cauDon: soan.cau,
        ...sauSuaSoKhach(meta.status, await openLegsByOrders(env.DB, [id]), soan.truoc, soan.sau),
      });
      let kq: D1Result[] | null;
      try {
        kq = await chayLoSuaSoKhach(env.DB, dong.lo);
      } catch (e) {
        const loi = dong.dichLoi(e);
        if (loi) return loi;
        throw e;
      }
      if (!kq) return STALE();
      const { dto } = dong.sauKhiGhi(kq);
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      const order = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
      return json({ order, daGhi: true, canhBaoTongAm: canhBaoGiamGiaVuot(order), canhBaoKhuyenMai: await nhacKhuyenMaiCuaDon(env.DB, order), dongBoChuyen: dto } satisfies MoneyEditResponse);
    }),

    // Đổi khách (hồ sơ người đặt + tên/SĐT trên đơn) — đơn nháp HOẶC đã xác nhận: coi như thông tin vận hành, cùng quyền với sửa chuyến (ADR-0011 điều 2).
    route("PUT", "/api/orders/:id/booker", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      const parsed = validateBookerChange(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // K1 (lời chủ 2026-10-09): tài khoản giữ quyền Đối tác (kể cả lai, qua ô `order.trip.edit`) không tự chọn đại lý / cộng tác viên khác — văn phòng lập hộ. Đường này
      // KHÔNG ép bên đặt (đổi khách là việc của người sửa đơn) và không có 409 chưa gắn hồ sơ: chỉ luật 403, đứng TRƯỚC mọi đọc / ghi khác.
      const cam = await chanBenDatDoiTac(env.DB, staff, v.booker, meta.bookerPartyId);
      if (cam) return cam;
      const booker = await resolveBooker(env.DB, v.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      const snapshotChanged = v.customerName !== meta.customerName || v.customerPhone !== meta.customerPhone;
      const detail = [booker.write.note, snapshotChanged ? "sửa tên/SĐT khách trên đơn" : null].filter(Boolean).join(" | ");
      if (!detail) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      // Sổ đại lý đợt 1 (ADR-0077 điều 8): đơn ĐÃ XÁC NHẬN có bản chụp mà bên đặt đổi thật ⇒ chụp lại mức CÙNG lô với việc đổi (bản mới trỏ bản cũ, bản cũ còn). Đơn
      // xác nhận trước đợt 1 (chưa có bản chụp) KHÔNG chụp — N15, đợt 2 chụp bù; đơn nháp chụp ở lúc xác nhận.
      const benMoi = booker.write.partyId;
      let kemChup: ((at: string) => D1PreparedStatement[]) | undefined;
      if (meta.status === "confirmed" && benMoi !== meta.bookerPartyId && (await demBanChup(env.DB, id)) > 0) {
        const order = await findOrder(env.DB, id); // chỉ cần mã dòng dịch vụ + mã danh mục: không phụ thuộc điều chỉnh số khách / tiền
        if (!order) return NOT_FOUND();
        const cu = new Map((await banChupHienHanh(env.DB, id)).map((r) => [r.order_service_id, r.id]));
        const homNay = vnToday(new Date());
        const bang = await docBangChoChup(env.DB, { bookerPartyId: benMoi, catalogCodes: order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay: homNay });
        const chup = chupDon({
          nguoiHuong: bang.nguoiHuong, ngay: homNay, muc: bang.muc, dieuKhoan: bang.dieuKhoan,
          dong: order.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })),
        });
        kemChup = (at) => [
          ...cauChupChuoi(env.DB, chup.map((c) => dongGhiTuChup(c, { id: crypto.randomUUID(), orderId: id, ngay: homNay, at, by: staff.id, source: "AUTO", reason: null, supersedesId: cu.get(c.serviceId) ?? null }))),
          auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_recaptured", at, detail: moTaChup(chup) }, "changes() > 0"),
        ];
      }
      let daDoi: boolean;
      try {
        daDoi = await changeBooker(env.DB, id, staff.id, v, booker.write, detail, kemChup);
      } catch (e) {
        const loi = e instanceof Error ? e.message : String(e);
        // Bảng mức / điều khoản đổi giữa lúc đọc và lúc ghi (trigger terms_rule_stale / terms_term_stale): cả lô rơi, bên đặt cũ giữ nguyên — bấm lại là chụp theo bảng mới.
        if (/\bterms_(rule|term)_stale:/.test(loi)) return error(409, "bang_muc_doi", "Bảng mức vừa đổi — thử lại");
        // Bản chụp hiện hành bị bản khác thay giữa lúc đọc và lúc ghi (ghi mức tay chen vào: UNIQUE supersedes_id / terms_one_current), hoặc dòng dịch vụ không còn ⇒ cả lô rơi.
        if (/ord_service_terms\.supersedes_id|\bterms_(one_current|supersede_mismatch|service_mismatch):/.test(loi)) return STALE();
        // Đơn vừa "Đã giao" giữa lúc đọc và lúc ghi (trigger terms_order_delivered).
        if (/\bterms_order_delivered:/.test(loi)) return DA_GIAO();
        throw e;
      }
      if (!daDoi) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/status", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu, dongBoChuyen }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", cauKhongDoiDuocTrangThai(from, to)); // nhãn tiếng Việt, không mã thô (Task 14, nợ (g)); mã `invalid_transition` giữ nguyên

      let dongBo: DongBoChuyenDto | undefined;
      if (to === "cancelled") {
        // ADR-0089 đ8 (H-C4): lý do bắt buộc; nhóm "Công ty huỷ" chỉ khi có ô `order.cancel.classify` (Quản trị, Toàn quyền — Đ-2).
        const lyDo = docLyDoHuy(body, { coTheChonCongTy: can(staff, "order.cancel.classify") });
        if (!lyDo.ok) return error(lyDo.status, lyDo.status === 403 ? "forbidden" : "invalid_input", lyDo.message);
        // ADR-0104 Đ2 (điểm gọi 1): lô huỷ (câu đơn đứng đầu) + khúc chuyến của máy đồng bộ — MỘT db.batch. Chỉ nhánh huỷ nối máy (xác nhận không đụng chuyến).
        const huy = soanHuyDon(env.DB, id, staff.id, from, meta.updatedAt, lyDo.lyDo);
        const dong = await dongBoChuyen({ orderId: id, auditIdDon: huy.auditId, bayGioMs: Date.now(), sau: { trangThai: "cancelled" }, cauDon: huy.cau });
        const r = await chayLoNoiChuyen(env.DB, dong, daHuy);
        if (r.kq === "loi") return r.res;
        if (r.kq === "thua") return RACED();
        dongBo = r.dongBoChuyen;
      } else {
        const today = vnToday(new Date());
        const order = await findOrder(env.DB, id);
        // DK-T3-01 R2 + R3: xác nhận là bước phát phiếu gửi khách mang tên/MST công ty → tài khoản có quyền Đối tác HOẶC Thực tập (ADR-0100) chỉ xác nhận được đơn
        // mà MỌI dòng đúng giá danh mục (bắt cả đơn nháp CŨ lập trước bản vá, và dòng nhập tay cũ — không có giá danh mục) VÀ giảm giá ĐÃ LƯU không vượt trần (hôm nay 0).
        const giaLoi = order ? giaDanhMucViolation(staff, order.services.flatMap((s) => s.items), order.discount) : null;
        if (giaLoi) return GIA_DANH_MUC(giaLoi);
        // ADR-0114 D3: cửa xác nhận đọc số khách ĐÃ LƯU (nháp cũ lập trước ADR có thể không có người lớn); lập đơn / lưu nháp đã chặn ở `validateOrder`.
        if (order && donThieuNguoiLon(order.services.map((s) => s.pax))) return error(409, "thieu_nguoi_lon", CAU_THIEU_NGUOI_LON);
        const detail = order ? summarizeDeviations(order.services.flatMap((s) => s.items)) : undefined;
        // ADR-0049 D2 (I15, I25): điều kiện mốc nằm TRONG câu xác nhận — ngưỡng chuỗi giờ VN tính bằng `nguongMocVn` (MỘT luật với `kiemMocDat`). Mốc chưa
        // có → 503, không đoán. MỘT mốc giờ (`nowMs`) cho câu ghi và cho việc đọc lại lý do.
        const moc = await mocToiThieu();
        if (!moc) return MOC_CHUA_CO();
        const nowMs = Date.now();
        // Sổ đại lý đợt 1 (ADR-0077 điều 8; đặc tả §5): đọc bảng ở ngày xác nhận rồi gửi các câu chụp trong CÙNG lô. Đơn đang nháp nên
        // dịch vụ đọc từ `order` là số hiện hành (chưa có dòng điều chỉnh). Câu chụp lỗi ⇒ cả lô rơi (đơn vẫn nháp).
        const bang = order ? await docBangChoChup(env.DB, { bookerPartyId: order.bookerPartyId, catalogCodes: order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay: today }) : null;
        const chup = order && bang ? chupDon({
          nguoiHuong: bang.nguoiHuong, ngay: today, muc: bang.muc, dieuKhoan: bang.dieuKhoan,
          dong: order.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })),
        }) : [];
        const kemChup = (at: string): D1PreparedStatement[] => [
          ...cauChupChuoi(env.DB, chup.map((c) => dongGhiTuChup(c, { id: crypto.randomUUID(), orderId: id, ngay: today, at, by: staff.id, source: "AUTO", reason: null, supersedesId: null }))),
          auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_captured", at, detail: moTaChup(chup) }, "changes() > 0"),
        ];
        let daXacNhan: boolean;
        try {
          daXacNhan = await confirmOrder(env.DB, id, staff.id, today, meta.updatedAt, nguongMocVn(nowMs, moc.phut), detail, kemChup);
        } catch (e) {
          // F-03 (0081): tạm tính đã lưu lệch Σ thành tiền dòng (nháp cũ / SQL tay) — CSDL chặn; Lưu nháp lại thì máy chủ tính lại từ các dòng.
          if (/order_subtotal_mismatch/.test(String((e as Error)?.message ?? e))) {
            return error(409, "order_subtotal_mismatch", "Tiền của đơn chưa khớp các dòng dịch vụ — mở đơn, bấm Lưu rồi xác nhận lại.");
          }
          const loi = e instanceof Error ? e.message : String(e);
          // Bảng mức / điều khoản đổi giữa lúc đọc và lúc ghi (trigger terms_rule_stale / terms_term_stale): cả lô rơi, đơn vẫn nháp — bấm lại là chụp theo bảng mới.
          if (/\bterms_(rule|term)_stale:/.test(loi)) return error(409, "bang_muc_doi", "Bảng mức vừa đổi — thử lại");
          // Người khác lưu nháp giữa lúc đọc và lúc ghi, dòng dịch vụ đổi mã (lưu nháp xoá–chèn lại dịch vụ): bản chụp trỏ dòng không còn ⇒ cả lô rơi (trigger terms_service_mismatch).
          if (/\bterms_service_mismatch:/.test(loi)) return STALE();
          throw e;
        }
        if (!daXacNhan) {
          // Thua vì đơn đã đổi trạng thái, vì chưa đủ chuyến, hay vì còn chặng dưới mốc chưa đặt gấp? Đọc lại để trả đúng lý do (không ghi nhật ký).
          const now = await getMeta(env.DB, id);
          if (!now || now.status !== "draft") return RACED();
          const stored = await getStoredServices(env.DB, id);
          const missing = confirmGaps(stored.map((s) => ({ id: s.id, name: s.name, departDate: s.trip.departDate, pax: s.pax })), today);
          if (missing.length > 0) {
            return json({ error: { code: "incomplete_trip", message: "Chưa đủ thông tin chuyến để xác nhận đơn.", missing } } satisfies IncompleteTripBody, 409);
          }
          const daDatGap = new Set((await legDatGapByOrder(env.DB, id)).map((r) => r.id));
          const duoi = canhBaoMocCua(stored.flatMap((s) => s.legs), daDatGap, nowMs, moc.phut);
          if (duoi.length > 0) {
            const legs = duoi.map((d) => ({ legId: d.legKey, phutConLai: d.phutConLai }));
            const message = "Có chặng đón dưới mốc tối thiểu — cần Quản trị hoặc Toàn quyền đặt gấp trước khi xác nhận.";
            return json({ error: { code: "short_notice_required", message, legs } } satisfies ShortNoticeRequiredBody, 409);
          }
          return STALE(); // vừa có người sửa / bổ sung xong (kể cả khoá phiên bản `updated_at` của câu xác nhận) — tải lại rồi bấm lại
        }
      }
      baoThayDoi({ orderId: id, thayDoi: to === "cancelled" ? "huy" : "xac_nhan" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!, ...(dongBo ? { dongBoChuyen: dongBo } : {}) } satisfies OrderResponse);
    }),

    // PHÂN LOẠI lý do huỷ "chưa kết luận" (ADR-0089 đ8, X-2; NT-L5, NT-L6): ô `order.cancel.classify` (Quản trị, Toàn quyền — Đ-2), không phạm vi đơn.
    // Chỉ từ "chưa kết luận" sang nhóm khác, lý do bắt buộc. MỘT lô: dòng phân loại (chỉ chèn khi dòng hiện hành đã đọc còn hiện hành) → nhật ký
    // `changes() > 0`. Thua (người khác vừa phân loại) ⇒ 409, không dòng nào. Trigger `ord_cancel_reason_reclassify` là lưới cuối.
    route("POST", "/api/orders/:id/cancel-reason", "orders", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "order.cancel.classify")) return error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền mới phân loại được lý do huỷ.");
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (meta.status !== "cancelled") return error(409, "invalid_state", "Đơn chưa huỷ — không có lý do huỷ để phân loại.");
      const doc = docPhanLoai(await readJson(request));
      if (!doc.ok) return error(400, "invalid_input", doc.message);
      const hien = await lyDoHienHanh(env.DB, id);
      if (!hien || hien.group_code !== "CHUA_KET_LUAN") return error(409, "invalid_state", "Lý do huỷ của đơn này đã được phân loại.");
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        phanLoaiStatement(env.DB, { orderId: id, hienHanhId: hien.id, nhom: doc.nhom, ghiChu: doc.ghiChu, at, staffId: staff.id }),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_cancel_reason_classified", at, detail: `${nhanNhomHuy(doc.nhom)}: ${doc.ghiChu}` }, "changes() > 0"),
      ]);
      if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Lý do huỷ vừa được người khác phân loại — tải lại.");
      baoThayDoi({ orderId: id, thayDoi: "huy" });
      return json({ ok: true }, 201, { location: trangDon(id) });
    }),

    // ---- Phần thương mại của đơn (sổ đại lý đợt 1 — ADR-0077 điều 10–11; đặc tả §6). ĐỌC: khuôn chi tiết đơn — `order.view` theo phạm vi đơn (chỉ-FIELD không phụ trách → 404), rồi
    // `order.terms.view`. Tài khoản giữ quyền Đối tác (`holdsPartner`, KỂ CẢ tài khoản lai — "có quyền Đối tác là áp") nhận DTO HẸP: chỉ số tiền hoa hồng của mình (C9 = A), không tỷ lệ.
    // VÒNG SỬA 1 (Ruling 18): tài khoản giữ quyền Đối tác CHỈ mở được đơn của chính mình, và chỉ khi mọi dòng không có người hưởng khác ngoài hồ sơ của mình — còn lại 404 cho cả đơn
    // (tài khoản lai Bán hàng / Kế toán + Đối tác từng thấy số tiền hoa hồng của đại lý khác). Luật nằm ở MỘT hàm thuần `cheDoThuongMai`; route gọi hai lần: lần đầu (chưa biết người hưởng) chặn
    // TRƯỚC khi đọc đơn, lần hai với người hưởng thật của các dòng. Chỉ kết quả đúng "doiTac" / "vanPhong" mới ra DTO (mặc định từ chối).
    route("GET", "/api/orders/:id/thuong-mai", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      const scope = { ownerId: meta.staffId, assigned };
      const coXemDon = can(staff, "order.view", scope);
      const dauVao = {
        laDoiTac: holdsPartner(staff), laDonCuaMinh: meta.staffId === staff.id, coXemDon, coXemThuongMai: can(staff, "order.terms.view", scope),
        chiXemDonDuocGiao: seesOnlyAssignedOrders(staff), partyId: staff.partyId,
      };
      const truoc = cheDoThuongMai({ ...dauVao, nguoiHuong: [] });
      if (truoc === "404") return NOT_FOUND();
      if (truoc === "403") return coXemDon ? FORBIDDEN_VIEW() : FORBIDDEN();
      const phan = await phanThuongMaiCuaDon(env.DB, id);
      if (!phan) return NOT_FOUND();
      const che = cheDoThuongMai({ ...dauVao, nguoiHuong: phan.chup.map((c) => c.beneficiaryPartyId) });
      if (che !== "doiTac" && che !== "vanPhong") return NOT_FOUND();
      return json(dungThuongMai({ laDoiTac: che === "doiTac", xemNguoiBan: can(staff, "supply.terms.view"), ...phan }) satisfies ThuongMaiResponse);
    }),

    // GHI MỨC TAY (cổng `office`, ô `order.terms.override`; không bao giờ cho tài khoản giữ quyền Đối tác — kể cả lai, vì phản hồi là DTO văn phòng có tỷ lệ): chỉ đơn ĐÃ XÁC NHẬN, chưa "Đã giao", dòng
    // dịch vụ đã có bản chụp hiện hành. Một lô: câu chèn bản MANUAL (trỏ `supersedes_id` bản hiện hành; lính gác trạng thái ngay trong câu) → nhật ký `order_terms_manual` (`changes() > 0`). Hai người ghi
    // cùng lúc: `supersedes_id UNIQUE` chặn người sau ⇒ 409 (cả lô rơi — không dòng thừa, không nhật ký).
    route("POST", "/api/orders/:id/thuong-mai/:serviceId", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "order.terms.override") || holdsPartner(staff)) return FORBIDDEN_TERMS();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const than = kiemThanGhiTay(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (meta.status !== "confirmed") return error(409, "not_confirmed", "Chỉ ghi mức tay cho đơn đã xác nhận.");
      if (meta.deliveredAt) return DA_GIAO();
      const hienHanh = await banChupHienHanh(env.DB, id);
      if (hienHanh.length === 0) return error(409, "chua_chup", "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau");
      const dong = hienHanh.find((r) => r.order_service_id === params.serviceId);
      if (!dong) return error(404, "not_found", "Không tìm thấy dịch vụ này trong đơn.");
      const truoc = banChupTuDb(dong);
      const cty = await ownerCompany(env.DB);
      const ktra = kiemGhiTayVoiBanChup(truoc, than.value, cty?.partyId ?? null);
      if (!ktra.ok) return error(ktra.status, ktra.status === 409 ? "khong_nguoi_huong" : "invalid_input", ktra.message);
      const nb = than.value.nguoiBan;
      if (nb && nb.partyId !== cty?.partyId && !(await laNhaCungCap(env.DB, nb.partyId))) return error(400, "invalid_input", "Người bán phải là Tour Đảo hoặc hồ sơ mang vai Nhà cung cấp.");
      const sau = apGhiTay(truoc, than.value, cty?.partyId ?? null);
      const [view, ten] = await Promise.all([loadOrderView(env.DB, id, false), tenHoSo(env.DB, [truoc, sau].flatMap((c) => (c.cungUng.status === "SET" ? [c.cungUng.sellerPartyId] : [])))]);
      const dichVu = view?.services.find((s) => s.id === params.serviceId);
      // Luật X3 (đặc tả Phần A điểm 2): dòng nhóm Thuê xe không ghi nhà cung cấp mua lại. Trigger `prc_supply_term_x3` chỉ phủ bảng điều khoản, không phủ bản chụp của đơn ⇒ kiểm ở đây, cùng nguồn nhóm
      // (view v_ctl_service_group) và cùng câu với route điều khoản. Chỉ khi THÂN ghi người bán là nhà cung cấp (đổi riêng mức hoa hồng của dòng Thuê xe vẫn được).
      if (than.value.nguoiBan && sau.cungUng.status === "SET" && sau.cungUng.supplierPartyId !== null && dichVu?.catalogCode && (await nhomCuaMa(env.DB, dichVu.catalogCode)) === NHOM_THUE_XE) {
        return error(409, "prc_transfer_no_supplier", CAU_X3_THUE_XE);
      }
      const at = new Date().toISOString();
      const tenDv = dichVu?.name ?? "";
      const moi = dongGhiTuChup(sau, { id: crypto.randomUUID(), orderId: id, ngay: vnToday(new Date()), at, by: staff.id, source: "MANUAL", reason: than.value.lyDo, supersedesId: dong.id });
      let kq: D1Result[];
      try {
        kq = await env.DB.batch([cauGhiTay(env.DB, moi), auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_manual", at, detail: moTaGhiTay(truoc, sau, tenDv, ten) }, "changes() > 0")]);
      } catch (e) {
        const loi = e instanceof Error ? e.message : String(e);
        // Người khác ghi tay (hoặc chụp lại) cùng dòng giữa lúc đọc và lúc ghi: bản hiện hành đã có người thay ⇒ UNIQUE supersedes_id / trigger terms_one_current.
        if (/UNIQUE constraint failed: ord_service_terms\.supersedes_id|\bterms_one_current:/.test(loi)) return error(409, "stale", "Mức của dòng này vừa được người khác ghi — tải lại.");
        if (/\bterms_order_delivered:/.test(loi)) return DA_GIAO();
        throw e;
      }
      if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Đơn vừa đổi trạng thái — tải lại.");
      const phan = await phanThuongMaiCuaDon(env.DB, id);
      // Đơn vừa bị huỷ sau lô (người khác huỷ giữa lúc ghi và lúc dựng phản hồi): bản ghi tay đã vào sổ nhưng không còn phần thương mại để trả ⇒ 409, không 500. Lệnh huỷ đã tự báo thay đổi của nó.
      if (!phan) return STALE();
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      return json(dungThuongMai({ laDoiTac: false, xemNguoiBan: can(staff, "supply.terms.view"), ...phan }) satisfies ThuongMaiResponse);
    }),
  ],
};
export type { PhanThuongMai } from "./thuong-mai";
// ADR-0068 Đ1 bước 5: CHỈ gốc lắp ráp gọi (ctx.gopHoSo của route gộp hồ sơ) — bài siết ở src/architecture.test.ts.
export { cauDoiNguoiDat, donCuaNguoiDat } from "./nguoi-dat-gop-repo";
