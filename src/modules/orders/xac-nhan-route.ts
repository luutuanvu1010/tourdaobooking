// ROUTE của BƯỚC XÁC NHẬN ĐƠN (ADR-0136, Task 3.3): Gửi xác nhận, Rút lại, Quyết định (Còn vé / Hết vé / Huỷ), danh sách chờ, cài đặt cờ + công tắc.
// Tệp riêng để `index.ts` (cửa vào module) không phình thêm và để KHÔNG import vòng: tệp này chỉ import `repository.ts`, `xac-nhan-chung.ts`, `xac-nhan-repo.ts` và các module khác QUA `index.ts` của chúng.
// SQL ở `xac-nhan-repo.ts` (nửa nghiêm). KHÔNG tự kiểm quyền bằng vai hồ sơ; mọi cổng hỏi `can(…)` viết thẳng ô.
import { auditStatement } from "../audit";
import type { AnThongTinKhachResponse, CaiDatXacNhanResponse, ChuaCoBanHangResponse, TheDonDto, DonChoXacNhanDto, DonChoXacNhanResponse, GuiDonResponse, GuiXacNhanResponse, LyDoCanXacNhan, PickupTimeRequiredBody, StaffProfile, QuyetDinhXacNhanResponse, ShortNoticeRequiredBody, YeuCauXacNhanDto } from "../../shared/contracts";
import { UUID_RE, error, json, readJson, trangDon } from "../../shared/http";
import { apCongTacAnKhach } from "../../shared/an-thong-tin-khach";
import { can, holdsIntern, holdsPartner, passesAdminGate } from "../../shared/permissions";
import { route } from "../../shared/router";
import { cauThieuChonDon, thieuChonDon } from "../../shared/cong-chon-don";
import { CHIEU_LABEL, LY_DO_DAT_GAP, changDiDau, ghiDatGapNhatKy, thieuGioChangDau, type LyDoDatGap } from "../../shared/chang-dua-don";
import { docLyDoHuy, type LyDoHuy } from "../../shared/ly-do-huy";
import { KHUNG_MAC_DINH, kiemDanhSachKhung } from "../../shared/khung-gio-don";
import { duoiMocKhiSua, nguongMocVn } from "../../shared/moc-toi-thieu";
import { isHHMM, isISODate, vnToday } from "../../shared/vn-date";
import { duocQuyetDinh, hanXacNhan, quaHanXacNhan } from "../../shared/xac-nhan-don";
import { cachThayTheCanhBao, laVaChamOBanHang, phutGioHanhChinhConLai, trangThaiLoiMoi, vaoTheCanhBao, type KhungGioHanhChinh } from "../../shared/ban-hang-phu-trach";
import { tripDeparted } from "../../shared/trip-rules";
import type { BanHangNoi } from "../../shared/router";
import { docKhungGio, soanGhiNhan } from "./ban-hang-ghi-nhan";
import { CAU_BAO_GUI_DON } from "../../shared/gui-don-cau-bao";
import { chiNguoiLapGhiNhap } from "../../shared/xem-don-nhap";
import { canhBaoMocCua, type XetDatGapSua } from "./dat-gap";
import { getEffectiveServices } from "../catalog";
import { anKhachBat, anKhachMoiNhat, cauDoiGioChang, cauDoiNgayChang, cauDoiNgayDichVu, cauGhiKepGio, cauKhepYeuCau, cauMoYeuCau, cauThemAnKhach, cauThemChinhSach, cauThemCo, chinhSachMoiNhat, coHienHanh, coMoiNhat, nhomDangDung, nhomTheoMa, orderTouchDraft, tuXacNhanNoiBo, ungVienTheBanHang, yeuCauMoCuaDon, yeuCauMoTatCa, yeuCauTheoId, type YeuCauRow } from "./xac-nhan-repo";
import { legDatGapByOrder, legShortNoticeConVe, slotPolicy, type DauDatGapMoi } from "./chang-hanh-khach-repo";
import { daHuy, daXacNhan, findOrder, getMeta, nextStamp, soanHuyDon, soanXacNhan } from "./repository";
import { CAU_VUOT_TONG_NGUOI_XET } from "../../shared/dat-coc-truoc";
import { MOC_CHUA_CO, RACED, STALE, canChotGioCuaNguoiLap, chanDoanXacNhan, chayLoNoiChuyen, cocChoXacNhan, congNhomTatDuaDon, dichLoiXacNhan, kemChupXacNhan, kiemCongXacNhan, tinhCanXacNhan, viCuaYeuCau } from "./xac-nhan-chung";
import { confirmGaps, confirmWindow } from "./service-rules";
import { congLuatBan } from "./cong-ban";

const NHAN_VI: Record<LyDoCanXacNhan, string> = { DICH_VU: "dịch vụ cần xác nhận", DAT_GAP: "lượt đón dưới hạn chốt, cần đặt gấp", CHOT_GIO: "có lượt đưa đón chưa có giờ đón" };
const dtoYeuCau = (y: YeuCauRow, vi: LyDoCanXacNhan[], nowMs: number): YeuCauXacNhanDto => ({ id: y.id, guiLuc: y.submitted_at, hanLuc: y.deadline_at, quaHan: quaHanXacNhan(y.deadline_at, nowMs), vi });
const NOT_FOUND_DON = () => error(404, "not_found", "Không tìm thấy đơn.");
const DA_GIAO_DON = () => error(409, "order_delivered", "Đơn đã ở bước Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa.");
export const PHAI_GUI_DON = () => error(409, "partner_submit_required", "Đơn của tài khoản Đối tác được gửi bằng nút Gửi đơn.");
/** Đ13.5: người gọi VỪA là người lập đơn VÀ giữ quyền Đối tác (kể cả tài khoản lai) ⇒ đường xác nhận cũ đóng. Luật ở route vì `can()` lấy HỢP các ô; chỉ chặn NGƯỜI LẬP. */
export const phaiGuiDon = (staff: StaffProfile, meta: { staffId: string; status: string }): boolean => meta.status === "draft" && meta.staffId === staff.id && holdsPartner(staff);
const FORBIDDEN_NGUOI_LAP = () => error(403, "forbidden", "Chỉ người lập đơn mới gửi hoặc rút lại yêu cầu xác nhận.");

async function docCaiDat(db: D1Database, luc: string): Promise<CaiDatXacNhanResponse> {
  const [co, tu] = await Promise.all([coHienHanh(db, luc), tuXacNhanNoiBo(db, luc)]);
  return { dongCo: co.map((r) => ({ pham: r.scope as "SERVICE" | "GROUP", ma: r.code, canXacNhan: r.required === 1 })), tuXacNhanNoiBo: tu };
}

/** Mốc `valid_from_at` của dòng chính sách / cờ mới: `max(lúc ghi, mốc mới nhất + 1 ms)` — hai lần đổi liền nhau không va UNIQUE, dòng sau đi sau dòng trước. Dùng chung các route cài đặt trong tệp này. */
const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();

/** `GET`/`POST /api/cai-dat/an-thong-tin-khach` (ADR-0154 Đ2): trạng thái công tắc + công tắc có ÁP cho người gọi không (`apChoToi` = BẬT và tài khoản Đối tác thuần — C2) + người gọi đổi được không. */
async function docAnKhach(db: D1Database, staff: StaffProfile, luc: string): Promise<AnThongTinKhachResponse> {
  const bat = await anKhachBat(db, luc);
  return { bat, apChoToi: bat && apCongTacAnKhach(staff), doiDuoc: can(staff, "settings.ops") };
}

/**
 * MỞ YÊU CẦU xác nhận (Đ3) — MỘT lô: đẩy mốc đơn nháp (khoá lạc quan) → nhật ký `order_confirm_requested` → dòng yêu cầu. DÙNG CHUNG cho `gui-xac-nhan` và nhánh A của `gui-don` (Task 3.4).
 * Nơi gọi đã kiểm mọi cổng; hàm này chỉ ghi. Thua khoá (người khác vừa đổi đơn) → STALE; va ràng buộc «một yêu cầu mở» → 409 `confirm_already_open`.
 */
async function moYeuCau(db: D1Database, i: { id: string; staffId: string; partyId: string | null; meta: { updatedAt: string }; vi: LyDoCanXacNhan[]; nowMs: number; canChotGio: boolean; banHang: BanHangNoi; khung: KhungGioHanhChinh }): Promise<{ loi: Response } | { yeuCau: YeuCauXacNhanDto }> {
  const at = nextStamp(i.meta.updatedAt);
  const han = hanXacNhan(at, i.khung); // ADR-0142 Đ5: giờ hành chính đọc từ chính sách, cùng khung với hạn ưu tiên của lời mời
  const yeuCauId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  let kq: D1Result[];
  try {
    // ADR-0142: điểm ghi nhận «đơn cần kiểm» — lời mời (nếu có) mở CÙNG lô, đứng SAU câu mở yêu cầu, gác bằng id dòng nhật ký `order_confirm_requested` của lô này.
    const gn = await soanGhiNhan({ db, banHang: i.banHang, orderId: i.id, nguoiLap: { id: i.staffId, partyId: i.partyId }, at, auditId, canKiem: true, khung: i.khung });
    kq = await db.batch([
      orderTouchDraft(db, i.id, at, i.meta.updatedAt),
      auditStatement(db, { id: auditId, orderId: i.id, staffId: i.staffId, action: "order_confirm_requested", at, detail: `Gửi kiểm vé · ${i.vi.map((v) => NHAN_VI[v]).join("; ")}` }, "changes() > 0"),
      cauMoYeuCau(db, { id: yeuCauId, orderId: i.id, at, by: i.staffId, han, auditId, canChotGio: i.canChotGio }),
      ...gn.cau,
    ]);
  } catch (e) {
    if (/dsp_sales_invite/i.test(String((e as Error)?.message ?? e))) return { loi: STALE() }; // còn lời mời mở từ trước (không phải lỗi người dùng): tải lại rồi gửi lại
    if (/ord_confirm_request.*order_id|ord_confirm_request_one_open|UNIQUE constraint failed: ord_confirm_request/i.test(String((e as Error)?.message ?? e))) {
      return { loi: error(409, "confirm_already_open", "Đơn này đã gửi kiểm vé và đang chờ.") };
    }
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return { loi: STALE() }; // người khác vừa đổi đơn giữa lúc đọc và lúc ghi — tải lại rồi bấm lại
  return { yeuCau: dtoYeuCau({ id: yeuCauId, order_id: i.id, submitted_at: at, submitted_by: i.staffId, deadline_at: han, pickup_time_required: i.canChotGio ? 1 : 0 }, i.vi, i.nowMs) };
}

/** Kiểm «chưa có khoản thu» (Đ3; áp cho Gửi xác nhận và nhánh A của Gửi đơn): hàm TIÊM — không đọc được ⇒ 503, KHÔNG đoán «chưa có». Trả `null` khi được phép mở yêu cầu. */
async function chanKhoanThu(daThuCuaDon: (orderId: string) => Promise<number | null>, id: string): Promise<Response | null> {
  const daThu = await daThuCuaDon(id);
  if (daThu === null) return error(503, "khoan_thu_chua_kiem", "Chưa kiểm được khoản thu của đơn nên chưa gửi kiểm vé được — báo người phụ trách hệ thống.");
  if (daThu > 0) return error(409, "confirm_blocked_has_payment", "Đơn đã có khoản thu nên chưa gửi kiểm vé được. Hãy báo Kế toán.");
  return null;
}

/**
 * `xetDatGap` = hàm chỗ canh đặt gấp `xetDatGapSua` của `index.ts` (kiểu `XetDatGapSua` ở `dat-gap.ts`), TIÊM vào đây vì tệp này không import được `index.ts` (vòng) và dấu đặt gấp chỉ được dựng ở MỘT chỗ
 * (ADR-0107; bài tĩnh dat-gap-sat-gio.test.ts). Chỉ route Còn vé (`quyet-dinh`) dùng nó (ADR-0154 Đ1.4).
 */
export const xacNhanRoutes = (xetDatGap: XetDatGapSua) => [
  // DANH SÁCH CHỜ (Đ6, Đ9): MỌI yêu cầu đang mở cho người giữ ô `order.confirm.review` — dịch vụ, ngày, số khách, giờ đón, tiền, hạn; KHÔNG tên khách / SĐT / email (DTO không có chỗ chứa).
  // Phải đứng TRƯỚC `GET /api/orders/:id` (index.ts spread mảng này ở ĐẦU `routes`). Quá hạn chỉ là cờ cảnh báo.
  route("GET", "/api/orders/cho-xac-nhan", "orders", async ({ env, staff, mocToiThieu }) => {
    if (!can(staff, "order.confirm.review")) return error(403, "forbidden", "Tài khoản này không xét duyệt xác nhận đơn.");
    const [ys, moc] = await Promise.all([yeuCauMoTatCa(env.DB), mocToiThieu()]);
    const nowMs = Date.now();
    const don: DonChoXacNhanDto[] = [];
    for (const y of ys) {
      const o = await findOrder(env.DB, y.order_id);
      if (!o) continue;
      const vi = viCuaYeuCau(y, (await tinhCanXacNhan(env.DB, o, moc, nowMs)).vi); // cờ «cần chốt giờ» đã CHỤP vào yêu cầu (ADR-0154 Đ1.2), không tính lại
      const ngay = o.services.map((s) => s.departDate).filter((d): d is string => d !== null).sort()[0] ?? null;
      const dau = o.services.flatMap((s) => s.legs).filter((l) => l.pickupTime !== null).sort((a, b) => `${a.pickupDate ?? ""} ${a.pickupTime}`.localeCompare(`${b.pickupDate ?? ""} ${b.pickupTime}`))[0];
      don.push({
        yeuCauId: y.id, orderId: o.id, orderCode: o.orderCode, dichVu: o.services.map((s) => s.name), ngayDi: ngay,
        soKhach: o.services.reduce((t, s) => t + (s.pax.adult ?? 0) + (s.pax.child ?? 0) + (s.pax.senior ?? 0), 0),
        // yêu cầu mang cờ «cần chốt giờ» (ADR-0154 Đ1.7): lượt đầu CHƯA có giờ — giờ gợi ý của chiều về (hay lượt khác) không được trông như giờ đón của cả đơn.
        gioDon: y.pickup_time_required === 1 ? null : dau ? (dau.pickupSlotEnd ? `${dau.pickupTime}–${dau.pickupSlotEnd}` : dau.pickupTime) : null,
        tong: o.total, guiLuc: y.submitted_at, hanLuc: y.deadline_at, quaHan: quaHanXacNhan(y.deadline_at, nowMs), canDatGap: vi.includes("DAT_GAP"), vi,
      });
    }
    return json({ don } satisfies DonChoXacNhanResponse);
  }),

  // THẺ CẢNH BÁO «Đơn chưa có Bán hàng phụ trách» (ADR-0142 Đ6; `GET`, cổng `order.view` theo đơn CỦA MÌNH nên Đối tác / Thực tập qua được cho đơn họ lập). Nguồn: đơn đã xác nhận (lúc ghi nhận = `confirmed_at`)
  // hoặc đơn nháp có yêu cầu xác nhận mở (lúc ghi nhận = `submitted_at`), từ mốc phát hành; lọc bằng luật thuần `vaoTheCanhBao` + `cachThayTheCanhBao`. Kế toán: đơn chờ xác nhận chỉ là SỐ (`soDonChoXacNhanAn`),
  // không mã đơn. Không tên khách / SĐT. Phải đứng TRƯỚC `GET /api/orders/:id` (index.ts spread mảng này ở đầu).
  route("GET", "/api/orders/chua-co-ban-hang", "orders", async ({ env, staff, banHang }) => {
    if (!can(staff, "order.view", { ownerId: staff.id })) return error(403, "forbidden", "Tài khoản này không xem được thẻ này.");
    const gio = await docKhungGio(banHang);
    if ("loi" in gio) return gio.loi;
    const ungVien = await ungVienTheBanHang(env.DB, gio.khung.mocPhatHanh);
    const co = ungVien.length === 0 ? new Map<string, unknown>() : await banHang.banHangCuaDon(ungVien.map((u) => u.id));
    const nowMs = Date.now();
    const homNay = vnToday(new Date(nowMs));
    const don: TheDonDto[] = [];
    let soAn = 0;
    for (const u of ungVien) {
      const cach = cachThayTheCanhBao(staff, { laNguoiLap: u.staff_id === staff.id, choXacNhan: u.cho_xac_nhan === 1 });
      if (cach === "khong") continue;
      if (!vaoTheCanhBao({ ghiNhanLuc: u.ghi_nhan_luc, nowMs, khung: gio.khung, coBanHang: co.has(u.id), donHuy: false, quaNgayDi: false, daGiao: false, hoanThanh: false })) continue;
      const o = await findOrder(env.DB, u.id);
      if (!o) continue;
      const ngay = o.services.map((s) => s.departDate);
      if (tripDeparted(ngay, homNay)) continue;
      if (cach === "chi_so") { soAn++; continue; }
      don.push({ orderId: u.id, orderCode: u.order_code, ghiNhanLuc: u.ghi_nhan_luc, choXacNhan: u.cho_xac_nhan === 1, ngayDi: ngay.filter((d): d is string => d !== null).sort()[0] ?? null, dichVu: o.services.map((s) => s.name), laCuaToi: u.staff_id === staff.id });
    }
    return json({ don, soDonChoXacNhanAn: soAn } satisfies ChuaCoBanHangResponse);
  }),

  // GỬI XÁC NHẬN (Đ3): người lập, đơn nháp, thuộc diện cần xác nhận (Đ1), đã chọn Đón / Không đón, chưa có yêu cầu mở, đơn CHƯA CÓ KHOẢN THU. Không chạy R2 / R3 ở bước này
  // (giá của Thực tập xét theo người bấm Còn vé — ADR-0136 làm rõ 25/10). Chặng dưới mốc KHÔNG bị từ chối lúc gửi: chính nó đưa đơn vào diện cần xác nhận (`DAT_GAP`).
  // Đ13.5: người lập giữ quyền Đối tác (kể cả tài khoản lai) nhận 409 `partner_submit_required` NGAY SAU `can()` — phải dùng `gui-don`.
  route("POST", "/api/orders/:id/gui-xac-nhan", "orders", async ({ env, params, staff, isAssigned, baoThayDoi, mocToiThieu, daThuCuaDon, cauCocKhiXacNhan, banHang }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
    if (!meta) return NOT_FOUND_DON();
    if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON(); // nháp của người khác: 404 như đơn không có (ADR-0135 Đ2)
    if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN_NGUOI_LAP();
    if (phaiGuiDon(staff, meta)) return PHAI_GUI_DON(); // Đ13.5: người lập giữ quyền Đối tác chỉ có nút «Gửi đơn»
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "invalid_state", "Chỉ gửi kiểm vé được đơn nháp của chính bạn.");
    if (await yeuCauMoCuaDon(env.DB, id)) return error(409, "confirm_already_open", "Đơn này đã gửi kiểm vé và đang chờ.");
    const order = await findOrder(env.DB, id);
    if (!order) return NOT_FOUND_DON();
    const moc = await mocToiThieu(); // MỘT lần mỗi request (TC-26); chưa có mốc thì không xét được "chặng dưới mốc" ⇒ từ chối kín
    if (!moc) return MOC_CHUA_CO();
    const gio = await docKhungGio(banHang); // ADR-0142: khung giờ hành chính MỘT lần mỗi request; thiếu ⇒ 503 trước khi ghi
    if ("loi" in gio) return gio.loi;
    const nowMs = Date.now();
    // ADR-0146 Đ3 + Q-1 (a) của chủ: luật bán đứng TRƯỚC chốt «cần xác nhận» — đơn bị chặn bán nhận `sales_blocked`, không mở yêu cầu (dù cần hay không cần xác nhận).
    const chanBan = await congLuatBan(env.DB, { bookerPartyId: order.bookerPartyId, dong: order.services });
    if (chanBan) return chanBan;
    const canXN = await tinhCanXacNhan(env.DB, order, moc, nowMs);
    if (!canXN.can) return error(409, "confirm_not_required", "Đơn này không cần xác nhận, hãy bấm Xác nhận đơn.");
    const tatDuaDon = await congNhomTatDuaDon(env.DB, order, "xac-nhan"); // ADR-0118 Đ3 (b): cửa này không qua kiemCongXacNhan — chốt riêng, TRƯỚC cổng chọn đón
    if (tatDuaDon) return tatDuaDon;
    const thieuDon = thieuChonDon(order.services.map((s) => ({ pickupChoice: s.pickupChoice, soChangMo: s.legs.length })));
    if (thieuDon.length > 0) return error(409, "pickup_choice_required", cauThieuChonDon(thieuDon[0]!));
    // Đ3 «chưa có khoản thu»: hàm TIÊM từ gốc lắp ráp (orders không đọc bảng bil_).
    const chan = await chanKhoanThu(daThuCuaDon, id);
    if (chan) return chan;
    // ADR-0159: đơn còn lời khai (người lập đã thôi giữ quyền Đối tác) mà sẽ không xác nhận được thì báo ngay, đừng để người xét gặp. Câu dựng ra bỏ đi — Còn vé dựng lại theo bản chụp của lô.
    const cocGui = await cocChoXacNhan(cauCocKhiXacNhan, { order, nguoiBamId: staff.id, chup: [], today: vnToday(new Date(nowMs)) });
    if ("loi" in cocGui) return cocGui.loi;
    const mo = await moYeuCau(env.DB, { id, staffId: staff.id, partyId: staff.partyId, meta, vi: canXN.vi, nowMs, canChotGio: false, banHang, khung: gio.khung });
    if ("loi" in mo) return mo.loi;
    baoThayDoi({ orderId: id, thayDoi: "cho_xac_nhan" });
    return json({ yeuCau: mo.yeuCau } satisfies GuiXacNhanResponse, 201, { location: trangDon(id) });
  }),

  // GỬI ĐƠN (Đ13, Task 3.4): nút duy nhất của tài khoản giữ quyền Đối tác với đơn họ lập. Cổng của quyền là ô `order.submit` (KHÔNG thêm kiểm `holdsPartner`: Toàn quyền gửi nháp của mình được).
  // Thứ tự: nháp của người khác 404 (ADR-0135 Đ2) → `can(order.submit)` 403 → đã giao → không phải nháp / đã có yêu cầu mở 409 → mọi cổng của Xác nhận ngay THEO NGƯỜI GỬI (R2 giá danh mục, người lớn,
  // chọn Đón, R3 trần; mốc chỉ cần CÓ để phân nhánh — chặng dưới mốc KHÔNG bị từ chối lúc gửi) → phân nhánh bằng `canXacNhan`. Cổng hỏng ⇒ đơn ở lại nháp, không câu báo thứ ba. (Cổng «luật bán» — ADR-0146 Đ3:
  // dòng đầu `kiemCongXacNhan`, nên đứng trước mọi cổng khác và trước phân nhánh.) Nhánh A mở yêu cầu như Gửi xác nhận (kèm chặn khoản thu); nhánh B xác nhận ngay trong lô `soanXacNhan` (không mở yêu cầu, không kiểm khoản thu).
  route("POST", "/api/orders/:id/gui-don", "orders", async ({ env, params, staff, baoThayDoi, mocToiThieu, daThuCuaDon, capVeSauXacNhan, cauCocKhiXacNhan, banHang }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON();
    if (!can(staff, "order.submit", { ownerId: meta.staffId })) return error(403, "forbidden", "Chỉ tài khoản Đối tác mới dùng nút Gửi đơn.");
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "order_not_draft", "Chỉ gửi được đơn nháp của chính bạn.");
    if (await yeuCauMoCuaDon(env.DB, id)) return error(409, "confirm_already_open", "Đơn này đã gửi kiểm vé và đang chờ.");
    const order = await findOrder(env.DB, id);
    if (!order) return NOT_FOUND_DON();
    const moc = await mocToiThieu(); // MỘT lần mỗi request (TC-26); chưa có ⇒ không xét được «chặng dưới mốc» ⇒ từ chối kín
    if (!moc) return MOC_CHUA_CO();
    const gio = await docKhungGio(banHang); // ADR-0142: khung giờ hành chính MỘT lần mỗi request
    if ("loi" in gio) return gio.loi;
    const nowMs = Date.now();
    const cong = await kiemCongXacNhan(env.DB, { actor: staff, order, kiemMoc: true, mocToiThieu: moc });
    if ("loi" in cong) return cong.loi;
    // ADR-0159: cổng lời khai đứng TRƯỚC phân nhánh — lời khai sai không vào hàng chờ của người xét. Nhánh A bỏ câu dựng ra (Còn vé dựng lại); nhánh B ghi trong lô xác nhận bên dưới.
    const cocXn = await cocChoXacNhan(cauCocKhiXacNhan, { order, nguoiBamId: staff.id, chup: cong.chup, today: cong.today });
    if ("loi" in cocXn) return cocXn.loi;
    const canXN = await tinhCanXacNhan(env.DB, order, moc, nowMs);
    // ADR-0154 Đ1.2: người lập giữ quyền Đối tác (kể cả lai) mà LƯỢT ĐẦU của một dịch vụ chọn Đón chưa có giờ → luôn nhánh A, dù dịch vụ không «cần xác nhận». Luật đứng ở ĐÂY, không trong
    // `tinhCanXacNhan` (đơn văn phòng, `/status`, Gửi xác nhận không đổi); cờ chụp vào yêu cầu để Còn vé biết phải đòi giờ. Lượt có giờ gửi thẳng qua API vẫn qua cổng 6 giờ (Đ1.7).
    const canChot = canChotGioCuaNguoiLap(staff, order.services);
    if (canXN.can || canChot) {
      const chan = await chanKhoanThu(daThuCuaDon, id);
      if (chan) return chan;
      const vi: LyDoCanXacNhan[] = canChot ? [...canXN.vi, "CHOT_GIO"] : canXN.vi;
      const mo = await moYeuCau(env.DB, { id, staffId: staff.id, partyId: staff.partyId, meta, vi, nowMs, canChotGio: canChot, banHang, khung: gio.khung });
      if ("loi" in mo) return mo.loi;
      baoThayDoi({ orderId: id, thayDoi: "cho_xac_nhan" });
      return json({ nhanh: "A", thongBao: CAU_BAO_GUI_DON.A, yeuCau: mo.yeuCau } satisfies GuiDonResponse, 201, { location: trangDon(id) });
    }
    const detail = ["tự xác nhận khi Đối tác gửi đơn", cong.detail].filter(Boolean).join(" | ");
    const xn = soanXacNhan(env.DB, id, staff.id, cong.today, meta.updatedAt, nguongMocVn(nowMs, moc.phut), detail, kemChupXacNhan(env.DB, { orderId: id, staffId: staff.id, today: cong.today, chup: cong.chup }), cocXn.coc);
    // ADR-0142: điểm ghi nhận «đơn không cần kiểm» — Bán hàng được mời mở lời mời, hoặc người lập tự mời mình thì thành Bán hàng phụ trách ngay; nối CUỐI lô, gác bằng id nhật ký `confirmed`.
    const gn = await soanGhiNhan({ db: env.DB, banHang, orderId: id, nguoiLap: { id: staff.id, partyId: staff.partyId }, at: xn.at, auditId: xn.auditId, canKiem: false, khung: gio.khung });
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([...xn.cau, ...gn.cau]);
    } catch (e) {
      if (laVaChamOBanHang(e)) return STALE(); // ô Bán hàng đã có người (cả lô lui): đơn vẫn nháp
      const res = dichLoiXacNhan(e);
      if (res) return res;
      throw e;
    }
    if (!daXacNhan(kq)) return chanDoanXacNhan(env.DB, { id, today: cong.today, mocToiThieu: moc, nowMs });
    await capVeSauXacNhan(id); // ADR-0153: lô cấp vé RIÊNG sau lô xác nhận; lỗi nuốt, xác nhận đã thắng
    baoThayDoi({ orderId: id, thayDoi: "xac_nhan" }); // Đ10: bảng tin / tin bỏ qua người làm — người gửi không nhận tin về việc chính mình vừa làm
    return json({ nhanh: "B", thongBao: CAU_BAO_GUI_DON.B } satisfies GuiDonResponse);
  }),

  // RÚT LẠI (Đ3): người lập rút yêu cầu còn mở; yêu cầu khép `RUT_LAI`, không có kết quả vé. Đẩy mốc đơn để người xét duyệt đang cầm mốc cũ THUA (409) thay vì huỷ / xác nhận sau lưng.
  route("POST", "/api/orders/:id/rut-xac-nhan", "orders", async ({ env, params, staff, isAssigned, baoThayDoi, traVeKhiHuy, banHang }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
    if (!meta) return NOT_FOUND_DON();
    if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON();
    if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN_NGUOI_LAP();
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
    const y = await yeuCauMoCuaDon(env.DB, id);
    if (!y) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
    const at = nextStamp(meta.updatedAt);
    const auditId = crypto.randomUUID();
    const kq = await env.DB.batch([
      orderTouchDraft(env.DB, id, at, meta.updatedAt),
      auditStatement(env.DB, { id: auditId, orderId: id, staffId: staff.id, action: "order_confirm_withdrawn", at, detail: "Rút lại yêu cầu xác nhận" }, "changes() > 0"),
      cauKhepYeuCau(env.DB, { id: y.id, at, by: staff.id, outcome: "RUT_LAI", ticket: null, note: null, auditId }),
      ...(await traVeKhiHuy(id, "RUT_XAC_NHAN")), // ADR-0153: phòng thủ — đơn nháp không giữ vé; nếu có thì trả cùng nguyên tử (cổng: đơn còn nháp)
      banHang.cauKhepLoiMoiSauLenhDon({ orderId: id, outcome: "RUT_LAI", at, actorId: staff.id, auditId }), // ADR-0142: khép lời mời đang mở (nếu có); gửi lại là lời mời MỚI. Nối CUỐI: chỉ số kq[0], kq[2] giữ nguyên
    ]);
    if ((kq[0]!.meta.changes ?? 0) === 0 || (kq[2]!.meta.changes ?? 0) === 0) {
      // Thua: có người quyết định (hoặc sửa đơn) giữa lúc đọc và lúc ghi — không dòng nào của lô này ghi.
      return error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
    }
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ ok: true });
  }),

  // QUYẾT ĐỊNH (Đ5, Đ7): Còn vé / Hết vé / Huỷ trên yêu cầu ĐANG MỞ. Ô `order.confirm.review` + `duocQuyetDinh` (người lập chỉ tự quyết khi nội bộ + công tắc bật; `can()` lấy HỢP nên tài khoản lai
  // giữ quyền Bán hàng quyết định được đơn chờ của người khác, còn đơn chờ của chính họ thì không). Nháp KHÔNG chờ của người khác vẫn 404 (ADR-0135 Đ2). Khoá lạc quan: `updatedAt` + `yeuCauId`
  // người xét duyệt đã đọc — Rút lại rồi Gửi lại là yêu cầu KHÁC (409). MỘT lô: [đổi ngày / giờ đón có lính gác] → [xác nhận có khoá + vế yêu cầu còn mở] → [nhật ký] → [bản chụp mức] → [khép yêu
  // cầu, gác bằng id nhật ký]; thua ⇒ không câu nào ghi (mọi câu mang cùng điều kiện: yêu cầu còn mở VÀ đơn còn nháp đúng mốc). Thứ tự kiểm TRƯỚC khi ghi để giờ mới không qua mặt mốc 6 giờ.
  route("POST", "/api/orders/:id/quyet-dinh", "orders", async ({ env, request, params, staff, baoThayDoi, mocToiThieu, dongBoChuyen, capVeSauXacNhan, traVeKhiHuy, cauCocKhiXacNhan, banHang }) => {
    if (!can(staff, "order.confirm.review")) return error(403, "forbidden", "Tài khoản này không xét duyệt xác nhận đơn.");
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const body = await readJson(request);
    const ketQua = body?.ketQua;
    if (ketQua !== "CON_VE" && ketQua !== "HET_VE" && ketQua !== "HUY") return error(400, "invalid_input", "Chọn Hết vé, Huỷ, hoặc Còn vé, xác nhận đơn.");
    if (typeof body?.yeuCauId !== "string" || body.yeuCauId === "" || typeof body?.updatedAt !== "string" || body.updatedAt === "") return error(400, "invalid_input", "Thiếu yêu cầu xác nhận hoặc mốc cập nhật của đơn — tải lại rồi thử lại.");
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    if (meta.deliveredAt) return DA_GIAO_DON();
    const y = await yeuCauMoCuaDon(env.DB, id);
    if (meta.status !== "draft") return RACED();
    if (!y) {
      if (meta.staffId === staff.id) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
      // Người khác: nháp không chờ thì như không có (404) — TRỪ khi họ cầm đúng yêu cầu CỦA ĐƠN NÀY vừa khép (người lập Rút lại giữa lúc họ đọc và lúc bấm): bên thua nhận 409 "vừa có người đổi".
      const cu = await yeuCauTheoId(env.DB, body.yeuCauId);
      return cu && cu.order_id === id ? RACED() : NOT_FOUND_DON();
    }
    if (y.id !== body.yeuCauId) return RACED(); // yêu cầu đã khép / đã thay bằng yêu cầu khác
    const laNguoiLap = meta.staffId === staff.id;
    const nowIso = new Date().toISOString();
    // ADR-0142 Đ5: lời mời còn ưu tiên của một Bán hàng KHÁC người bấm ⇒ chỉ Quản trị / Toàn quyền (không giữ quyền Đối tác) quyết được; người khác nhận 409 kèm số phút còn lại.
    const loiMoi = await banHang.loiMoiMoCua(id);
    const laX = loiMoi !== null && loiMoi.staffId === staff.id;
    const uuTienCuaNguoiKhac = loiMoi !== null && !laX && trangThaiLoiMoi({ hanIso: loiMoi.hanIso, nowMs: Date.parse(nowIso), xConHopLe: loiMoi.xConHopLe, daKhep: false }) === "UU_TIEN";
    const vaiQuyetDinh = { laNguoiLap, laNoiBo: !holdsPartner(staff) && !holdsIntern(staff), coQuyenXetDuyet: true, choTuXacNhan: laNguoiLap ? await tuXacNhanNoiBo(env.DB, nowIso) : false, laQuanTriHoacToanQuyen: passesAdminGate(staff), giuDoiTac: holdsPartner(staff) };
    if (!duocQuyetDinh({ ...vaiQuyetDinh, uuTienCuaNguoiKhac: false })) return error(403, "forbidden", "Bạn không quyết định được đơn này.");
    if (!duocQuyetDinh({ ...vaiQuyetDinh, uuTienCuaNguoiKhac })) {
      const gioQd = await docKhungGio(banHang);
      if ("loi" in gioQd) return gioQd.loi;
      return error(409, "dang_cho_nguoi_khac", `Đơn đang chờ ${loiMoi!.name} trả lời, còn ${phutGioHanhChinhConLai(nowIso, loiMoi!.hanIso, gioQd.khung)} phút.`);
    }
    if (body.updatedAt !== meta.updatedAt) return STALE();

    if (ketQua !== "CON_VE") {
      let lyDo: LyDoHuy;
      if (ketQua === "HET_VE") {
        lyDo = { ma: "HET_CHO", nhom: "CONG_TY_HUY", ghiChu: null }; // ngoại lệ có tên của ADR-0089 đ8: máy chủ tự gán, không hỏi `order.cancel.classify`
      } else {
        const d = docLyDoHuy(body, { coTheChonCongTy: can(staff, "order.cancel.classify") });
        if (!d.ok) return error(d.status, d.status === 403 ? "forbidden" : "invalid_input", d.message);
        lyDo = d.lyDo;
      }
      // Lô huỷ (câu đơn đứng đầu) + khúc chuyến của máy đồng bộ — MỘT db.batch; câu khép yêu cầu nối vào CUỐI phần câu đơn, gác bằng id nhật ký `cancelled` của chính lô.
      const huy = soanHuyDon(env.DB, id, staff.id, "draft", meta.updatedAt, lyDo);
      const atHuy = nextStamp(meta.updatedAt);
      const khep = cauKhepYeuCau(env.DB, { id: y.id, at: atHuy, by: staff.id, outcome: "HUY", ticket: ketQua === "HET_VE" ? "HET_VE" : "HUY", note: null, auditId: huy.auditId });
      const khepMoi = banHang.cauKhepLoiMoiSauLenhDon({ orderId: id, outcome: "HUY_DON", at: atHuy, actorId: staff.id, auditId: huy.auditId }); // ADR-0142: lời mời mở (nếu có) khép «đơn huỷ», gác theo dòng nhật ký huỷ
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: huy.auditId, bayGioMs: Date.now(), sau: { trangThai: "cancelled" }, cauDon: [...huy.cau, ...(await traVeKhiHuy(id, "DON_HUY")), khep, khepMoi] }); // ADR-0153: trả vé cùng nguyên tử với việc huỷ
      const r = await chayLoNoiChuyen(env.DB, dong, daHuy);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") return RACED();
      baoThayDoi({ orderId: id, thayDoi: "huy" });
      return json({ ketQua, trangThai: "cancelled" } satisfies QuyetDinhXacNhanResponse);
    }

    // ---- CON_VE ----
    const order = await findOrder(env.DB, id);
    if (!order) return NOT_FOUND_DON();
    const moc = await mocToiThieu();
    if (!moc) return MOC_CHUA_CO();
    const nowMs = Date.now();
    const homNay = vnToday(new Date(nowMs));
    const sai = (m: string) => error(400, "doi_gio_khong_hop_le", m);
    // đổi ngày đi: ngày dân sự giờ VN, không quá khứ, trong cửa sổ xác nhận
    let ngayDi: string | undefined;
    if (body.ngayDi !== undefined && body.ngayDi !== null) {
      if (typeof body.ngayDi !== "string" || !isISODate(body.ngayDi)) return sai("Ngày đi không hợp lệ.");
      if (body.ngayDi < homNay || body.ngayDi > confirmWindow(homNay).to) return sai("Ngày đi phải từ hôm nay trở đi và trong vòng một năm.");
      ngayDi = body.ngayDi;
    }
    // đổi giờ đón: chặng MỞ của chính đơn, giờ HH:MM; có cuối khung thì phải đúng một khung của chính sách ADR-0134 (không có thì là "Giờ khác")
    const chang = new Map(order.services.flatMap((s) => s.legs.map((l) => [l.id, { l, dichVu: s }] as const)));
    const gioMoi = new Map<string, { gio: string; cuoi: string | null }>();
    const datGapLuot = new Map<string, unknown>(); // legId → phần tử `gioDon` có mang `datGap`
    const ds = body.gioDon;
    if (ds !== undefined && ds !== null) {
      if (!Array.isArray(ds)) return sai("Giờ đón không hợp lệ.");
      const pol = await slotPolicy(env.DB, nowIso);
      let khung: { tu: string; den: string }[] = [...KHUNG_MAC_DINH];
      try {
        const k = kiemDanhSachKhung(pol.slotsJson === null ? null : (JSON.parse(pol.slotsJson) as unknown));
        if (k.ok) khung = k.khung;
      } catch { /* dòng hỏng → bộ mặc định, như route khung giờ */ }
      for (const g of ds as unknown[]) {
        const o = g as { legId?: unknown; pickupTime?: unknown; pickupSlotEnd?: unknown; datGap?: unknown } | null;
        if (!o || typeof o.legId !== "string" || !chang.has(o.legId) || gioMoi.has(o.legId)) return sai("Lượt đưa đón không có trong đơn hoặc bị nhắc hai lần.");
        if (typeof o.pickupTime !== "string" || !isHHMM(o.pickupTime)) return sai("Giờ đón phải theo dạng HH:MM (24 giờ).");
        let cuoi: string | null = null;
        if (o.pickupSlotEnd !== undefined && o.pickupSlotEnd !== null && o.pickupSlotEnd !== "") {
          if (typeof o.pickupSlotEnd !== "string" || !isHHMM(o.pickupSlotEnd) || o.pickupSlotEnd <= o.pickupTime) return sai("Giờ cuối khung phải sau giờ đón.");
          if (!khung.some((k) => k.tu === o.pickupTime && k.den === o.pickupSlotEnd)) return sai("Khung giờ đón không nằm trong các khung đã cài đặt.");
          cuoi = o.pickupSlotEnd;
        }
        gioMoi.set(o.legId, { gio: o.pickupTime, cuoi });
        if (o.datGap !== undefined && o.datGap !== null) datGapLuot.set(o.legId, o); // ADR-0154 Đ1.4: lý do đặt gấp CỦA LƯỢT NÀY — xét ở chỗ canh `xetDatGap` sau khi biết giờ, ngày SAU lệnh
      }
    }
    // (0) KIỂM TRƯỚC KHI GHI — mốc tối thiểu / đặt gấp tính trên ngày + giờ MỚI (cùng `canhBaoMocCua`, cùng ngưỡng `nguongMocVn` với câu xác nhận): không để người xét duyệt đổi sang khung sớm hơn mà qua mặt mốc.
    // ADR-0118 Đ3 (b) TRƯỚC mốc (cùng thứ tự với `/status`): lượt của nhóm đã tắt đưa đón phải bỏ, đừng đẩy người xét duyệt đi đặt gấp cho nó trước.
    // ADR-0146 Đ3 (R-7): luật bán đứng TRƯỚC cả nhóm tắt đưa đón và mốc — đừng đẩy người xét duyệt đi bỏ lượt / đặt gấp cho một đơn không bán được. (Dòng đầu
    // `kiemCongXacNhan` bên dưới gọi lại — chỉ đọc.)
    const chanBanXd = await congLuatBan(env.DB, { bookerPartyId: order.bookerPartyId, dong: order.services });
    if (chanBanXd) return chanBanXd;
    const tatDuaDon = await congNhomTatDuaDon(env.DB, order, "xet-duyet");
    if (tatDuaDon) return tatDuaDon;
    const daDatGap = new Set((await legDatGapByOrder(env.DB, id)).map((r) => r.id));
    const legsMoi = [...chang.values()].map(({ l, dichVu }) => ({
      id: l.id,
      serviceId: dichVu.id,
      direction: l.direction,
      pickupDate: ngayDi !== undefined && (l.pickupDate === null || l.pickupDate === dichVu.departDate) ? ngayDi : (l.pickupDate ?? dichVu.departDate),
      pickupTime: gioMoi.get(l.id)?.gio ?? l.pickupTime,
    }));
    // ADR-0154 Đ1.3: yêu cầu mang cờ «cần chốt giờ» mà LƯỢT ĐẦU của một dịch vụ (theo giờ SAU lệnh) còn thiếu giờ ⇒ 409, không ghi gì. Cổng hỏi MỌI dịch vụ cùng lúc: ghi giờ cho một dịch vụ
    // mà dịch vụ khác còn thiếu thì không dịch vụ nào đổi. Yêu cầu không mang cờ (đơn văn phòng, mọi yêu cầu cũ) đi như hôm nay. Chỉ nhánh CON_VE (Hết vé / Huỷ đã rẽ ở trên).
    if (y.pickup_time_required === 1) {
      const thieu = thieuGioChangDau(order.services.map((s) => ({ id: s.id, legs: legsMoi.filter((l) => l.serviceId === s.id) })));
      if (thieu.length > 0) {
        return json({ error: { code: "pickup_time_required", message: "Còn lượt đưa đón chưa có giờ đón. Ghi giờ đón rồi bấm Còn vé, xác nhận đơn.", legs: thieu.map((t) => ({ legId: t.legId })) } } satisfies PickupTimeRequiredBody, 409);
      }
    }
    // ADR-0154 Đ1.4: giờ nhập dưới hạn chốt — mỗi lượt có `datGap` qua MỘT chỗ canh `xetDatGap` (ô `order.leg.short_notice` 403 → lý do 400 → giờ SAU lệnh phải dưới mốc, không thì 409
    // `short_notice_not_needed`). KHÔNG có `datGap` thì không gọi chỗ canh: đi đúng đường cũ (409 `short_notice_required` bên dưới; người không có ô — Kế toán, HDV nội bộ — vẫn nhận 409 này).
    const dauMoi = new Map<string, { dau: DauDatGapMoi; lyDo: LyDoDatGap }>();
    for (const [legId, thanLuot] of datGapLuot) {
      const moiLuot = legsMoi.find((x) => x.id === legId)!; // legId đã kiểm có trong đơn ở trên
      const giay = xetDatGap(staff, thanLuot, duoiMocKhiSua(null, moiLuot, nowMs, moc.phut), moc, nowMs);
      if (!giay.ok) return giay.res;
      const dau = giay.value.dauCho(moiLuot);
      if (dau && giay.value.lyDo) dauMoi.set(legId, { dau, lyDo: giay.value.lyDo });
    }
    const duoi = canhBaoMocCua(legsMoi, new Set([...daDatGap, ...dauMoi.keys()]), nowMs, moc.phut);
    if (duoi.length > 0) {
      return json({ error: { code: "short_notice_required", message: "Có lượt đưa đón mà giờ đón đã qua hạn chốt — cần đặt gấp trước khi xác nhận.", legs: duoi.map((d) => ({ legId: d.legKey, phutConLai: d.phutConLai })) } } satisfies ShortNoticeRequiredBody, 409);
    }
    // Các cổng còn lại (R2 giá, người lớn, nhóm tắt đưa đón, chọn đón, R3 trần) xét theo NGƯỜI BẤM Còn vé — như hôm nay; mốc đã kiểm ở trên.
    const cong = await kiemCongXacNhan(env.DB, { actor: staff, order, kiemMoc: true, mocToiThieu: moc, cuaDuaDon: "xet-duyet" });
    if ("loi" in cong) return cong.loi;
    // ADR-0159 Đ1 mục 3, 4: người LẬP là người thu dù người xét bấm; người xét không sửa được số khai nên câu vượt tổng nói phải trả đơn. `cong.chup` là bản chụp của CHÍNH lô này.
    const cocXn = await cocChoXacNhan(cauCocKhiXacNhan, { order, nguoiBamId: staff.id, chup: cong.chup, today: cong.today, cauVuot: CAU_VUOT_TONG_NGUOI_XET });
    if ("loi" in cocXn) return cocXn.loi;
    // Người kiểm Đợt 1 N-1, ruling R6: `db.batch` KHÔNG lui khi câu xác nhận đổi 0 dòng — các câu đổi ngày / đổi giờ / đóng dấu bên dưới chỉ mang `CON_MO` nên vẫn GHI dù `ORDER_CONFIRM` thua vì một vế
    // khác (ngày đi quá khứ hoặc trống, dịch vụ không còn khách, đơn không dịch vụ) — để lại dấu đặt gấp «mồ côi» mở đường cho người không có ô đặt gấp xác nhận chặng dưới hạn chốt. Nên chặn ĐỦ các vế
    // đó của `ORDER_CONFIRM` mà `CON_MO` không phủ TRƯỚC khi dựng lô, theo trạng thái SAU lệnh (đổi ngày đi áp cho MỌI dịch vụ — `cauDoiNgayDichVu`), cùng cửa sổ `confirmWindow(cong.today)` mà
    // `soanXacNhan` truyền cho câu xác nhận. Trả đúng câu `chanDoanXacNhan` như hôm nay (incomplete_trip). Vế còn lại (đơn vừa đổi, yêu cầu vừa khép) do `CON_MO` phủ: lô thua thì không câu nào ghi.
    const thieuChuyen = confirmGaps(order.services.map((s) => ({ id: s.id, name: s.name, departDate: ngayDi ?? s.departDate, pax: s.pax })), cong.today);
    if (order.services.length === 0 || thieuChuyen.length > 0) return chanDoanXacNhan(env.DB, { id, today: cong.today, mocToiThieu: moc, nowMs });
    const atChang = nextStamp(meta.updatedAt);
    const cauDau: D1PreparedStatement[] = [];
    const doiNgay = ngayDi !== undefined && order.services.some((s) => s.departDate !== ngayDi);
    if (doiNgay) {
      cauDau.push(cauDoiNgayChang(env.DB, { orderId: id, ngay: ngayDi!, at: atChang, by: staff.id, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
      cauDau.push(cauDoiNgayDichVu(env.DB, { orderId: id, ngay: ngayDi!, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
    }
    let doiGio = false;
    for (const [legId, g] of gioMoi) {
      const cu = chang.get(legId)!.l;
      if (cu.pickupTime === g.gio && (cu.pickupSlotEnd ?? null) === g.cuoi) continue;
      doiGio = true;
      cauDau.push(cauDoiGioChang(env.DB, { legId, orderId: id, gio: g.gio, cuoiKhung: g.cuoi, at: atChang, by: staff.id, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
    }
    // ADR-0154 Đ1.4: dấu đặt gấp theo từng lượt — ĐỨNG SAU các câu đổi ngày, đổi giờ (câu dấu khớp `pickup_date`, `pickup_time` dòng SẼ giữ lúc đó) và TRƯỚC câu xác nhận (câu xác nhận có vế mốc
    // «chặng dưới mốc phải mang dấu»). Nằm NGOÀI nhánh «giờ đổi»: chặng giờ không đổi mà đang dưới hạn chốt vẫn cần dấu. Ngày dòng sẽ giữ = ngày đang lưu, dời sang ngày mới CHỈ khi chặng đang đón
    // đúng ngày đi cũ của dịch vụ (cùng điều kiện câu `cauDoiNgayChang`); ngày đang NULL vẫn NULL tới câu điền ngày trong lô xác nhận — KHÔNG dùng ngày dự phòng của `legsMoi`. Mỗi dấu kèm dòng nhật ký
    // `order_leg_short_notice` NGAY SAU nó, `changes() > 0` (khuôn nút Đặt gấp) — không câu nào chen giữa.
    for (const [legId, { dau, lyDo }] of dauMoi) {
      const { l: cu, dichVu } = chang.get(legId)!;
      const gio = { pickupDate: doiNgay && cu.pickupDate !== null && cu.pickupDate === dichVu.departDate ? ngayDi! : cu.pickupDate, pickupTime: gioMoi.get(legId)?.gio ?? cu.pickupTime };
      cauDau.push(legShortNoticeConVe(env.DB, { legId, orderId: id, d: dau, gio, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
      cauDau.push(auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_leg_short_notice", at: dau.at, detail: `${order.orderCode} · ${CHIEU_LABEL[cu.direction]}${ghiDatGapNhatKy(LY_DO_DAT_GAP[lyDo])}` }, "changes() > 0"));
    }
    // GHI KÉP cột cũ `order_service.pickup_time` (ADR-0047 R3; ADR-0154 «Để lại»): chỉ GIỜ, theo LƯỢT ĐI ĐẦU (`changDiDau` — cùng thứ tự với `chieuDiDau` và kiểm `R-ORD-7`), không theo mọi lượt đi.
    // Với mỗi dịch vụ: lượt đi đầu TRƯỚC lệnh (đang lưu) so với SAU lệnh (`legsMoi`); giờ khác nhau thì MỘT câu theo lượt đi đầu sau lệnh, kể cả lượt đó không nằm trong `gioDon`
    // (ví dụ ngày dời làm lượt khác lên đầu). Lượt đi đầu đổi sang lượt khác NƠI thì cột cũ `pickup_place` vẫn lệch như hôm nay — `R-ORD-7` cảnh báo.
    for (const s of order.services) {
      const truoc = changDiDau(s.legs);
      const sau = changDiDau(legsMoi.filter((l) => l.serviceId === s.id));
      if (sau !== null && sau.pickupTime !== null && sau.pickupTime !== (truoc?.pickupTime ?? null)) {
        cauDau.push(cauGhiKepGio(env.DB, { legId: sau.id, orderId: id, gio: sau.pickupTime, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
      }
    }
    const doi = doiNgay && doiGio ? ", đổi ngày và giờ" : doiNgay ? ", đổi ngày" : doiGio ? ", đổi giờ" : "";
    const lyDoNhatKy = [...dauMoi.values()][0]?.lyDo ?? null; // đuôi nhật ký đi theo LÝ DO (G16); mỗi lượt đã có dòng nhật ký riêng với lý do của nó
    const detail = [`Còn vé, xác nhận đơn${doi}${lyDoNhatKy ? ghiDatGapNhatKy(LY_DO_DAT_GAP[lyDoNhatKy]) : ""}`, cong.detail].filter(Boolean).join(" | ");
    const auditId = crypto.randomUUID();
    const xn = soanXacNhan(env.DB, id, staff.id, cong.today, meta.updatedAt, nguongMocVn(nowMs, moc.phut), detail, kemChupXacNhan(env.DB, { orderId: id, staffId: staff.id, today: cong.today, chup: cong.chup }), cocXn.coc, { auditId, yeuCauId: y.id });
    const khep = cauKhepYeuCau(env.DB, { id: y.id, at: xn.at, by: staff.id, outcome: "XAC_NHAN", ticket: "CON_VE", note: null, auditId });
    // ADR-0142 Đ4: Còn vé thêm CÂU MỞ Bán hàng phụ trách cho người bấm, CÙNG lô, gác bằng id nhật ký `confirmed` (bắt buộc: ô đã có người thì cả lô hỏng, đơn vẫn chờ) rồi khép lời mời
    // (X bấm ⇒ NHAN, người khác ⇒ NGUOI_KHAC). Người bấm giữ quyền Đối tác (tài khoản lai, ADR-0136 cho phép bấm) hoặc chưa có hồ sơ: đơn vẫn được xác nhận nhưng KHÔNG mở ô, KHÔNG khép lời mời
    // — đơn sang «Chờ Bán hàng nhận». Mọi câu nối CUỐI lô nên chỉ số câu thắng/thua giữ nguyên.
    const ghiO = !holdsPartner(staff) && staff.partyId !== null;
    const cauBanHang = ghiO
      ? [
          banHang.cauMoBanHangBatBuoc({ id: crypto.randomUUID(), orderId: id, partyId: staff.partyId!, actorId: staff.id, at: xn.at, auditId }),
          banHang.cauKhepLoiMoiSauLenhDon({ orderId: id, outcome: laX ? "NHAN" : "NGUOI_KHAC", at: xn.at, actorId: staff.id, auditId }),
        ]
      : [];
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([...cauDau, ...xn.cau, khep, ...cauBanHang]);
    } catch (e) {
      if (laVaChamOBanHang(e)) return error(409, "stale", "Đơn vừa có Bán hàng phụ trách, hãy tải lại."); // xét TRƯỚC `dichLoiXacNhan`: cả lô lui, đơn vẫn chờ
      const res = dichLoiXacNhan(e);
      if (res) return res;
      throw e;
    }
    if ((kq[cauDau.length + 1]!.meta.changes ?? 0) === 0) {
      // Thua: đọc lại để trả đúng lý do. Yêu cầu không còn mở (rút lại / người khác quyết) → RACED; còn mở → `chanDoanXacNhan` (chưa đủ chuyến, mốc, hoặc đơn vừa đổi).
      const con = await yeuCauMoCuaDon(env.DB, id);
      if (!con || con.id !== y.id) return RACED();
      return chanDoanXacNhan(env.DB, { id, today: cong.today, mocToiThieu: moc, nowMs });
    }
    await capVeSauXacNhan(id); // ADR-0153: lô cấp vé RIÊNG sau lô xác nhận; lỗi nuốt, xác nhận đã thắng
    baoThayDoi({ orderId: id, thayDoi: "xac_nhan" });
    return json({ ketQua, trangThai: "confirmed" } satisfies QuyetDinhXacNhanResponse);
  }),

  // CÀI ĐẶT CỜ «CẦN XÁC NHẬN» VÀ CÔNG TẮC TỰ XÁC NHẬN (Đ1, Đ5): cổng admin, thân hỏi `settings.ops` (hôm nay chỉ Toàn quyền). Khuôn đúng `/api/cai-dat/nhap-tay`: mỗi lần đổi chèn MỘT
  // dòng mới chỉ-thêm với valid_from_at = max(lúc ghi, mới nhất + 1 ms) cùng nhật ký không gắn đơn; gửi đúng trạng thái đang hiệu lực = 200, không ghi; va UNIQUE → 409 `stale`.
  // Cờ chỉ đặt cho mã danh mục có thật (dịch vụ nhập tay không có mã → 400) hoặc nhóm đang có dịch vụ.
  route("GET", "/api/cai-dat/xac-nhan-don", "admin", async ({ env, staff }) => {
    if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem cài đặt xác nhận đơn.");
    return json(await docCaiDat(env.DB, new Date().toISOString()));
  }),
  route("POST", "/api/cai-dat/xac-nhan-don", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi cài đặt xác nhận đơn.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    if (!b || typeof b !== "object") return error(400, "invalid_input", "Thiếu nội dung cài đặt.");
    const now = new Date();
    const luu = async (cau: D1PreparedStatement, action: "confirm_flag_changed" | "confirm_policy_changed", at: string, detail: string): Promise<Response | null> => {
      try {
        await env.DB.batch([cau, auditStatement(env.DB, { staffId: staff.id, action, at, targetType: "system", detail })]);
        return null;
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Cài đặt vừa được đổi — tải lại rồi thử lại.");
        throw e;
      }
    };
    if (typeof b.tuXacNhanNoiBo === "boolean") {
      if ((await tuXacNhanNoiBo(env.DB, now.toISOString())) !== b.tuXacNhanNoiBo) {
        const at = lanSau(await chinhSachMoiNhat(env.DB), now);
        const loi = await luu(cauThemChinhSach(env.DB, { id: crypto.randomUUID(), bat: b.tuXacNhanNoiBo, at, by: staff.id }), "confirm_policy_changed", at, b.tuXacNhanNoiBo ? "Bật tự xác nhận cho nhân viên nội bộ" : "Tắt tự xác nhận cho nhân viên nội bộ");
        if (loi) return loi;
      }
      return json(await docCaiDat(env.DB, new Date().toISOString()));
    }
    const { pham, ma, canXacNhan } = b;
    if ((pham !== "SERVICE" && pham !== "GROUP") || typeof ma !== "string" || ma.trim() === "" || typeof canXacNhan !== "boolean") return error(400, "invalid_input", "Chọn dịch vụ hoặc nhóm và bật / tắt cần xác nhận.");
    const coThat = pham === "SERVICE" ? (await getEffectiveServices(env.DB, [ma])).has(ma) : await nhomDangDung(env.DB, ma);
    if (!coThat) return error(400, "invalid_input", pham === "SERVICE" ? "Mã dịch vụ không có trong danh mục." : "Nhóm này chưa có dịch vụ nào.");
    const co = await coHienHanh(env.DB, now.toISOString());
    const hien = co.find((r) => r.scope === pham && r.code === ma);
    // Đ1: dịch vụ chưa có dòng riêng đang ĐI THEO NHÓM — so với giá trị đang hiệu lực, nếu không «không cần» của một dịch vụ trong nhóm «cần» không bao giờ được ghi.
    const nhomCua = !hien && pham === "SERVICE" ? (await nhomTheoMa(env.DB, [ma])).get(ma) : undefined;
    const dangCan = (hien ?? co.find((r) => r.scope === "GROUP" && r.code === nhomCua))?.required === 1;
    if (dangCan !== canXacNhan) {
      const at = lanSau(await coMoiNhat(env.DB), now);
      const loi = await luu(cauThemCo(env.DB, { id: crypto.randomUUID(), pham, ma, can: canXacNhan, at, by: staff.id }), "confirm_flag_changed", at, `${pham === "SERVICE" ? "Dịch vụ" : "Nhóm"} ${ma}: ${canXacNhan ? "cần xác nhận" : "không cần xác nhận"}`);
      if (loi) return loi;
    }
    return json(await docCaiDat(env.DB, new Date().toISOString()));
  }),

  // CÔNG TẮC «ẨN THÔNG TIN KHÁCH KHI ĐỐI TÁC ĐẶT VÉ» (ADR-0154 Đ2.1): khuôn đúng `/api/cai-dat/xac-nhan-don` (công tắc tự xác nhận). ĐỌC: cổng `orders`, hỏi `order.create` — form Tạo đơn hỏi công tắc có áp cho
  // người gọi không (`apChoToi`); GHI: cổng `admin`, thân hỏi `settings.ops` (chỉ Toàn quyền). MỘT lô: dòng mới chỉ-thêm (mốc `lanSau`) + nhật ký ngay sau — câu chèn hoặc chèn được hoặc NÉM lỗi UNIQUE (không có đường "đổi 0 dòng"), và lô D1 lui trọn khi một câu ném lỗi, nên
  // thua mốc thì (409 `stale`) không để lại nhật ký — bài «hai lần đổi trùng mốc» ghim kết quả đó; gửi đúng trạng thái đang hiệu lực = 200, không ghi. Đổi công tắc không chạm đơn nào (dấu đơn chụp lúc lập).
  route("GET", "/api/cai-dat/an-thong-tin-khach", "orders", async ({ env, staff }) => {
    if (!can(staff, "order.create")) return error(403, "forbidden", "Tài khoản này không xem được cài đặt này.");
    return json(await docAnKhach(env.DB, staff, new Date().toISOString()));
  }),
  route("POST", "/api/cai-dat/an-thong-tin-khach", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi cài đặt ẩn thông tin khách.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    if (!b || typeof b !== "object" || typeof b.bat !== "boolean") return error(400, "invalid_input", "Chọn bật hoặc tắt.");
    const now = new Date();
    if ((await anKhachBat(env.DB, now.toISOString())) !== b.bat) {
      const at = lanSau(await anKhachMoiNhat(env.DB), now);
      try {
        await env.DB.batch([
          cauThemAnKhach(env.DB, { id: crypto.randomUUID(), bat: b.bat, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "partner_customer_policy_changed", at, targetType: "system", detail: b.bat ? "Bật ẩn thông tin khách khi đối tác đặt vé" : "Tắt ẩn thông tin khách khi đối tác đặt vé" }),
        ]);
      } catch (e) {
        if (/UNIQUE constraint failed: ord_partner_customer_policy/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Cài đặt vừa được đổi — tải lại rồi thử lại.");
        throw e;
      }
    }
    return json(await docAnKhach(env.DB, staff, new Date().toISOString()));
  }),
];
