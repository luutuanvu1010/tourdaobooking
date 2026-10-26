// Phần DÙNG CHUNG của bước xác nhận đơn (Task 3.2b, ADR-0136): cổng trước khi xác nhận, bản chụp mức, dịch lỗi/kết quả thua của lô, chạy lô nối chuyến.
// Ba nơi gọi: `POST /api/orders/:id/status` (confirmed) hôm nay; `quyet-dinh` (Còn vé) và `gui-don` nhánh B ở Task 3.3, 3.4 — nên đứng một tệp riêng để
// `index.ts` và tệp route sau này không import vòng nhau. KHÔNG tự kiểm quyền người gọi (route đã làm); KHÔNG đổi hành vi so với thân nhánh `confirmed` cũ.
import { auditStatement } from "../audit";
import { chupDon, docBangChoChup, soKhachTinhHoaHong, type BanChup } from "../pricing";
import type { DongBoChuyenDto, IncompleteTripBody, LyDoCanXacNhan, OrderDetailDto, OrderStatus, PaxCounts, ShortNoticeRequiredBody, StaffProfile, XacNhanTrenDonDto } from "../../shared/contracts";
import { can, holdsIntern, holdsPartner } from "../../shared/permissions";
import { error, json } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";
import { parseUnit } from "../../shared/order-lines";
import type { DongBoTheoDon } from "../../shared/dong-bo-chuyen";
import { CAU_THIEU_NGUOI_LON, donThieuNguoiLon } from "../../shared/nguoi-di-kem";
import { cauThieuChonDon, thieuChonDon } from "../../shared/cong-chon-don";
import type { MocToiThieu } from "../../shared/moc-toi-thieu";
import { canXacNhan, duocQuyetDinh, quaHanXacNhan } from "../../shared/xac-nhan-don";
import { canhBaoMocCua } from "./dat-gap";
import { coHienHanh, nhomTheoMa, tuXacNhanNoiBo, yeuCauMoCuaDon } from "./xac-nhan-repo";
import { legDatGapByOrder } from "./chang-hanh-khach-repo";
import { findOrder, getMeta, getStoredServices } from "./repository";
import { viPhamGiaDanhMuc, viPhamTranGiamGia } from "./price-guards";
import { cauChupChuoi } from "./thuong-mai-repo";
import { donChoTran, dongGhiTuChup, moTaChup } from "./thuong-mai";
import { confirmGaps, summarizeDeviations } from "./service-rules";

/** Đơn đã nạp đầy đủ (dịch vụ, chặng, dòng tiền) — kết quả `findOrder`. */
export type DonXacNhan = NonNullable<Awaited<ReturnType<typeof findOrder>>>;

// ---- Phản hồi lỗi dùng chung (trước đây là hằng riêng của `index.ts`; `index.ts` import lại từ đây để MỘT nguồn chữ).
export const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
export const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
/** Luật giá R2 (Đối tác ADR-0027, Thực tập ADR-0100): `cau` là câu lỗi của `viPhamGiaDanhMuc`. */
export const GIA_DANH_MUC = (cau: string) => error(403, "forbidden", cau);
/** Phản hồi lỗi trần giảm giá (`viPhamTranGiamGia`): 403 luật theo quyền, 400 `discount_exceeds_commission` trần hoa hồng. */
export const TRAN_GIAM_GIA = (v: NonNullable<ReturnType<typeof viPhamTranGiamGia>>) => error(v.status, v.code, v.cau);
/** Mốc tối thiểu chưa có (bảng chính sách rỗng / môi trường không tiêm) — CHẶN lệnh cần mốc, không đoán con số (I25). */
export const MOC_CHUA_CO = () => error(503, "moc_toi_thieu_chua_co", "Chưa có chính sách điều phối đang hiệu lực (hạn chốt trước giờ đón) — báo người phụ trách hệ thống.");

/**
 * Thành tiền (Σ thành tiền dòng, trước giảm giá cấp đơn) và số khách tính hoa hồng (`soKhachTinhHoaHong`) của MỘT dịch vụ — MỘT công thức cho phần thương mại (`phanThuongMaiCuaDon`)
 * và trần giảm giá (Task 7). Đứng ngoài thân route (bài `src/so-khach-mot-luat-tien.test.ts` (4): thân route không tính trên tiền dòng).
 */
export function tienChoHoaHong(s: { unit: string; pax: PaxCounts; items: readonly { quantity: number; lineTotal: number }[] }): { thanhTien: number; soKhachTinh: number; pax: { adult: number; child: number; senior: number } | null } {
  // ADR-0133: số khách theo loại cho mức «mỗi khách theo loại»; dịch vụ tính theo nhóm/lượt không tách loại ⇒ null (soKhachTinh là số lượt).
  return { thanhTien: s.items.reduce((t, i) => t + i.lineTotal, 0), soKhachTinh: soKhachTinhHoaHong({ unit: s.unit, pax: s.pax, items: s.items }),
    pax: parseUnit(s.unit).kind === "group" ? null : { adult: s.pax.adult ?? 0, child: s.pax.child ?? 0, senior: s.pax.senior ?? 0 } };
}

/** Kết quả lệnh đơn có nối máy đồng bộ chuyến, cho route của module KHÁC (dispatch): thắng kèm phần "chuyến" của phản hồi; thua khoá lạc quan; lỗi đã dịch. */
export type KetQuaLenhDon = { kq: "thang"; dongBoChuyen: DongBoChuyenDto } | { kq: "thua" } | { kq: "loi"; res: Response };

/** Chạy MỘT lô (câu đơn + khúc chuyến) rồi hỏi `thang(kq)` (đọc câu đơn ở chỉ số cũ); lỗi phần chuyến → 409 `trip_rule` qua `dichLoi`, lỗi khác ném tiếp. */
export async function chayLoNoiChuyen(db: D1Database, dong: DongBoTheoDon, thang: (kq: readonly D1Result[]) => boolean): Promise<KetQuaLenhDon> {
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

/**
 * CÁC CỔNG trước khi xác nhận — gom từ thân nhánh `confirmed` của `POST /status`, GIỮ NGUYÊN thứ tự: R2 giá danh mục (Đối tác / Thực tập) → thiếu người lớn (ADR-0114 D3) →
 * chọn Đón/Không đón (ADR-0134 Đ2) → [mốc tối thiểu, chỉ khi `kiemMoc`: chưa có → 503] → dựng bản chụp mức hoa hồng theo bảng HÔM NAY → R3 trần giảm giá theo bản chụp vừa tính.
 * `kiemMoc` = lô sau đó có vế mốc trong câu xác nhận (Còn vé, `/status`); lúc chỉ GỬI yêu cầu thì không đòi mốc (mốc chỉ chặn ở Còn vé — Review Focus 10).
 * Trả `{ loi }` (Response đã dịch) hoặc `{ ok, chup, detail, today }`: `chup` + `detail` đưa vào `kemChupXacNhan` / `soanXacNhan`.
 */
export async function kiemCongXacNhan(
  db: D1Database,
  i: { actor: StaffProfile; order: DonXacNhan; kiemMoc: boolean; mocToiThieu: MocToiThieu | null },
): Promise<{ loi: Response } | { ok: true; chup: BanChup[]; detail: string | undefined; today: string }> {
  const { actor, order } = i;
  const today = vnToday(new Date());
  // DK-T3-01 R2: xác nhận là bước phát phiếu gửi khách mang tên/MST công ty → tài khoản có quyền Đối tác HOẶC Thực tập (ADR-0100) chỉ xác nhận được đơn
  // mà MỌI dòng đúng giá danh mục (bắt cả đơn nháp CŨ lập trước bản vá, và dòng nhập tay cũ — không có giá danh mục). R3 (trần giảm giá ĐÃ LƯU) kiểm SAU khi tính bản chụp (Task 7).
  const giaLoi = viPhamGiaDanhMuc(actor, order.services.flatMap((s) => s.items));
  if (giaLoi) return { loi: GIA_DANH_MUC(giaLoi) };
  // ADR-0114 D3: cửa xác nhận đọc số khách ĐÃ LƯU (nháp cũ lập trước ADR có thể không có người lớn); lập đơn / lưu nháp đã chặn ở `validateOrder`.
  if (donThieuNguoiLon(order.services.map((s) => s.pax))) return { loi: error(409, "thieu_nguoi_lon", CAU_THIEU_NGUOI_LON) };
  // ADR-0134 Đ2: mỗi dịch vụ phải chọn Đón (có chặng mở) hoặc Không đón (không chặng mở). Đọc từ `order` đã nạp (dịch vụ + chặng CÒN HIỆU LỰC).
  const thieuDon = thieuChonDon(order.services.map((s) => ({ pickupChoice: s.pickupChoice, soChangMo: s.legs.length })));
  if (thieuDon.length > 0) return { loi: error(409, "pickup_choice_required", cauThieuChonDon(thieuDon[0]!)) };
  const detail = summarizeDeviations(order.services.flatMap((s) => s.items));
  // ADR-0049 D2 (I15, I25): mốc chưa có → 503, không đoán.
  if (i.kiemMoc && !i.mocToiThieu) return { loi: MOC_CHUA_CO() };
  // Sổ đại lý đợt 1 (ADR-0077 điều 8; đặc tả §5): đọc bảng ở ngày xác nhận rồi gửi các câu chụp trong CÙNG lô. Đơn đang nháp nên dịch vụ đọc từ `order` là số hiện hành.
  const bang = await docBangChoChup(db, { bookerPartyId: order.bookerPartyId, catalogCodes: order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay: today });
  const chup = chupDon({
    nguoiHuong: bang.nguoiHuong, ngay: today, muc: bang.muc, gan: bang.gan, ganRieng: bang.ganRieng, dieuKhoan: bang.dieuKhoan,
    dong: order.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })),
  });
  // Task 7 (ADR-0079 điều 8 gạch 2): R3 theo BẢN CHỤP VỪA TÍNH — đơn có người hưởng: trần = tổng hoa hồng (dòng thiếu mức tính 0); không người hưởng: luật hôm nay (Đối tác, Thực tập 0).
  const tien = order.services.map((s) => ({ id: s.id, ...tienChoHoaHong(s) }));
  const tranLoi = viPhamTranGiamGia(actor, order.discount, donChoTran(chup, tien)); // I-1: Đối tác trên đơn đại lý KHÁC ⇒ luật cũ, không nêu số
  if (tranLoi) return { loi: TRAN_GIAM_GIA(tranLoi) };
  return { ok: true, chup, detail, today };
}

/** Câu kèm của lô xác nhận: bản chụp mức hoa hồng + nhật ký `order_terms_captured`, cùng mốc `at` của lô (`soanXacNhan`/`confirmOrder` truyền `at`). */
export const kemChupXacNhan = (db: D1Database, i: { orderId: string; staffId: string; today: string; chup: readonly BanChup[] }) => (at: string): D1PreparedStatement[] => [
  ...cauChupChuoi(db, i.chup.map((c) => dongGhiTuChup(c, { id: crypto.randomUUID(), orderId: i.orderId, ngay: i.today, at, by: i.staffId, source: "AUTO", reason: null, supersedesId: null }))),
  auditStatement(db, { orderId: i.orderId, staffId: i.staffId, action: "order_terms_captured", at, detail: moTaChup(i.chup) }, "changes() > 0"),
];

/**
 * Dịch LỖI do trigger khi chạy lô xác nhận → phản hồi, hoặc `null` (lỗi lạ: nơi gọi ném tiếp). F-03 (0081): tạm tính lệch Σ thành tiền dòng; bảng mức / điều khoản
 * đổi giữa lúc đọc và lúc ghi (`terms_rule_stale` / `terms_term_stale`) — cả lô rơi, đơn vẫn nháp; dịch vụ đổi mã giữa lúc đọc và lúc ghi (`terms_service_mismatch`).
 */
export function dichLoiXacNhan(e: unknown): Response | null {
  if (/order_subtotal_mismatch/.test(String((e as Error)?.message ?? e))) {
    return error(409, "order_subtotal_mismatch", "Tiền của đơn chưa khớp các dòng dịch vụ — mở đơn, bấm Lưu rồi xác nhận lại.");
  }
  const loi = e instanceof Error ? e.message : String(e);
  if (/\bterms_(rule|term)_stale:/.test(loi)) return error(409, "bang_muc_doi", "Bảng mức vừa đổi — thử lại");
  if (/\bterms_service_mismatch:/.test(loi)) return STALE();
  return null;
}

/**
 * Lô xác nhận THUA (`daXacNhan` false) → đọc lại để trả đúng lý do (không ghi nhật ký): đơn đã đổi trạng thái → RACED; chưa đủ chuyến → 409 `incomplete_trip`;
 * còn chặng dưới mốc chưa đặt gấp → 409 `short_notice_required`; còn lại (vừa có người sửa, khoá `updated_at`) → STALE.
 */
export async function chanDoanXacNhan(db: D1Database, i: { id: string; today: string; mocToiThieu: MocToiThieu; nowMs: number }): Promise<Response> {
  const now = await getMeta(db, i.id);
  if (!now || now.status !== "draft") return RACED();
  const stored = await getStoredServices(db, i.id);
  const missing = confirmGaps(stored.map((s) => ({ id: s.id, name: s.name, departDate: s.trip.departDate, pax: s.pax })), i.today);
  if (missing.length > 0) {
    return json({ error: { code: "incomplete_trip", message: "Chưa đủ thông tin chuyến để xác nhận đơn.", missing } } satisfies IncompleteTripBody, 409);
  }
  const daDatGap = new Set((await legDatGapByOrder(db, i.id)).map((r) => r.id));
  const duoi = canhBaoMocCua(stored.flatMap((s) => s.legs), daDatGap, i.nowMs, i.mocToiThieu.phut);
  if (duoi.length > 0) {
    const legs = duoi.map((d) => ({ legId: d.legKey, phutConLai: d.phutConLai }));
    const message = "Có lượt đưa đón mà giờ đón đã qua hạn chốt — cần đặt gấp trước khi xác nhận.";
    return json({ error: { code: "short_notice_required", message, legs } } satisfies ShortNoticeRequiredBody, 409);
  }
  return STALE(); // vừa có người sửa / bổ sung xong (kể cả khoá phiên bản `updated_at` của câu xác nhận) — tải lại rồi bấm lại
}

// ---- Bước xác nhận đơn (Task 3.3, ADR-0136) — phần dùng chung giữa `index.ts` (`/status`, khoá khi chờ) và `xac-nhan-route.ts` ------------------------------------------
export const CAN_YEU_CAU = () => error(409, "confirm_request_required", "Đơn có dịch vụ cần xác nhận, hãy bấm Gửi xác nhận.");
export const KHOA_KHI_CHO = () => error(409, "confirm_pending_locked", "Đơn đang chờ xác nhận, hãy Rút lại trước khi sửa.");

/**
 * Đ1: đơn này có PHẢI qua bước xác nhận không (cờ dịch vụ → cờ nhóm hiện hành → không cần, và chặng dưới mốc 6 giờ chưa đặt gấp). Đọc cờ HIỆN HÀNH lúc `nowMs`.
 * `moc` null (khung thử không tiêm / bảng rỗng) ⇒ không xét được phần chặng dưới mốc, coi là KHÔNG có — nơi gọi phải tự trả 503 khi việc của nó cần mốc.
 */
export async function tinhCanXacNhan(db: D1Database, order: DonXacNhan, moc: MocToiThieu | null, nowMs: number): Promise<{ can: boolean; vi: LyDoCanXacNhan[] }> {
  const ma = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
  const [co, nhom] = await Promise.all([coHienHanh(db, new Date(nowMs).toISOString()), nhomTheoMa(db, ma)]);
  const coDichVu = new Map<string, boolean>();
  const coNhom = new Map<string, boolean>();
  for (const r of co) (r.scope === "SERVICE" ? coDichVu : r.scope === "GROUP" ? coNhom : new Map<string, boolean>()).set(r.code, r.required === 1);
  let duoiMoc = false;
  if (moc) {
    const daDatGap = new Set((await legDatGapByOrder(db, order.id)).map((r) => r.id));
    duoiMoc = canhBaoMocCua(order.services.flatMap((s) => s.legs), daDatGap, nowMs, moc.phut).length > 0;
  }
  const kq = canXacNhan({
    dichVu: order.services.map((s) => ({ ma: s.catalogCode, nhom: s.catalogCode ? (nhom.get(s.catalogCode) ?? null) : null })),
    coDichVu, coNhom, coChangDuoiMocChuaDatGap: duoiMoc,
  });
  return { can: kq.can, vi: kq.vi };
}

/**
 * KHOÁ KHI CHỜ (Đ3): đơn nháp đang có yêu cầu xác nhận mở ⇒ người lập không sửa / xác nhận / huỷ được — phải Rút lại. Gọi ngay SAU cổng 404 của nháp (`ghiDuocNhap`)
 * ở mọi route ghi của người lập, TRƯỚC các 409 khác (nếu không ca "sửa khi chờ" thấy `use_order_form`). Đơn đã xác nhận / huỷ: không truy vấn.
 */
export async function khoaKhiCho(db: D1Database, orderId: string, status: OrderStatus): Promise<Response | null> {
  if (status !== "draft") return null;
  return (await yeuCauMoCuaDon(db, orderId)) ? KHOA_KHI_CHO() : null;
}

/**
 * Đ6: chi tiết đơn ĐANG CHỜ cho người xét duyệt KHÔNG phải người lập — bỏ SĐT, email, tên khách, ghi chú khách, ghi chú thanh toán (liên hệ người đặt vốn không nằm trong DTO này, chỉ có
 * `bookerName`). Dịch vụ, ngày, số khách, giờ đón, tiền giữ nguyên. Hành khách (họ tên, năm sinh) không bao giờ nằm trong DTO đơn — route `…/passengers` vẫn 404.
 */
export const catChoXetDuyet = (o: OrderDetailDto): OrderDetailDto => ({ ...o, customerName: "", customerPhone: "", customerEmail: null, customerNote: null, paymentNote: null });

/**
 * Khối `xacNhan` của `GET /api/orders/:id` (Task 3.5): giao diện KHÔNG suy ra «đang chờ», «cần xác nhận», «quyết định được» — máy chủ quyết theo người xem, cùng hàm với các route
 * (`tinhCanXacNhan`, `duocQuyetDinh`, `tuXacNhanNoiBo`). Chỉ cho đơn NHÁP và chỉ người liên quan (người lập; hoặc người giữ ô xét duyệt khi đơn đang chờ); còn lại null.
 * `canXacNhan` chỉ tính cho người lập. Không chứa dữ liệu khách.
 */
export async function xacNhanTrenDon(db: D1Database, i: { staff: StaffProfile; order: { id: string; staffId: string; status: OrderStatus }; moc: MocToiThieu | null; nowMs: number }): Promise<XacNhanTrenDonDto | null> {
  if (i.order.status !== "draft") return null;
  const laNguoiLap = i.order.staffId === i.staff.id;
  const coQuyenXetDuyet = can(i.staff, "order.confirm.review");
  const y = await yeuCauMoCuaDon(db, i.order.id);
  if (!laNguoiLap && !(y && coQuyenXetDuyet)) return null;
  let canXN = false;
  let vi: LyDoCanXacNhan[] = [];
  const don = await findOrder(db, i.order.id);
  if (don) {
    const kq = await tinhCanXacNhan(db, don, i.moc, i.nowMs);
    vi = kq.vi;
    canXN = laNguoiLap && kq.can;
  }
  const quyetDinhDuoc = y !== null && duocQuyetDinh({
    laNguoiLap, laNoiBo: !holdsPartner(i.staff) && !holdsIntern(i.staff), coQuyenXetDuyet,
    choTuXacNhan: laNguoiLap ? await tuXacNhanNoiBo(db, new Date(i.nowMs).toISOString()) : false,
  });
  return { yeuCau: y ? { id: y.id, guiLuc: y.submitted_at, hanLuc: y.deadline_at, quaHan: quaHanXacNhan(y.deadline_at, i.nowMs), vi } : null, canXacNhan: canXN, quyetDinhDuoc };
}
