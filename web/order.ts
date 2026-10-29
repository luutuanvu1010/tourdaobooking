import { ApiError, api, vuaLamBoiTabNay, type Api, type AuditEntry, type Order, type Staff } from "./api";
import { renderBanner } from "./banner";
import { openBookerSheet } from "./booker-sheet";
import { openConfirmationDialog } from "./confirmation-dialog";
import { byId, h, replaceChildren } from "./dom";
import { cauXacNhanDaNhan, duocHuyKhoanSo, ghiSoNoiBo, hienNutSuaKhoanThu } from "../src/shared/nut-khoan-thu";
import { METHOD_LABEL, actionLabel, dateTime, ngayNganHomNay, parseMoney, trangThaiHienThi, vnd } from "./format";
import { regroupMoney, setMoneyValue } from "./money-input";
import { moBangTruot } from "./bang-truot";
import { openHandlerSheet } from "./handler-sheet";
import { icon } from "./icons";
import { suKienVeDon, taoBoLamMoi } from "./lam-moi-logic";
import { renderServices } from "./order-services";
import { goiSom } from "./goi-som";
import { layKhungNho } from "./khung-nho";
import { luuHoacChiaSe } from "./luu-anh";
import { dungAnhQr, veMaQr } from "./qr-ve";
import { initShell, setBarTitle } from "./shell";
import { openTripSheet } from "./trip-sheet";
import { khoiCanhBaoMoc, khoiNhanDatGap } from "./dat-gap-ui";
import { khoiNhapKeToan } from "./nhap-ke-toan-ui";
import type { DiemChon } from "./khoi-dua-don";
import { openSheetDuaDon } from "./sheet-dua-don";
import { openSheetHanhKhach } from "./sheet-hanh-khach";
import { openSheetSoKhach } from "./sheet-so-khach";
import { CAU_CAN_NOI_TRA, canhBaoXacNhan, thieuNoiTra } from "../src/shared/canh-bao-xac-nhan";
import { dongThongTinQr } from "../src/shared/qr-thong-tin";
import { PAX_LABEL } from "../src/shared/order-lines";
import { CHIEU_LABEL } from "../src/shared/chang-dua-don";
import { nhanCamKet } from "../src/shared/cam-ket-xe";
import { can, holdsPartner } from "../src/shared/permissions";
import { GHI_CHU_HUY_TOI_DA, NHOM_HUY_NHAN, luaChonLyDo, nhanNhomHuy } from "../src/shared/ly-do-huy";
import { nhanTienDaTra as nhanTienLuat } from "../src/shared/nhan-tien";
import { ngayDayDu } from "../src/shared/vn-date";
import { cauNhacKhoan, quaHanDoiChieu, soNgayCho } from "../src/shared/doi-chieu-hien-thi";
import { NHAN_O_THU_CHO, cauBenKiaDaNhan, cauCanhBaoGiamGia, cauChoKeToan, laBenKia, luaChonNguoiThu, luaChonThuCho, lyDoCanTaiLai, nguoiThuTuGiaTri, oThuCho } from "../src/shared/ben-kia-hien-thi";
import { cauMoc, changDuoiMoc, tomTatChanXacNhan, type ChangCanDatGap } from "../src/shared/dat-gap-hien-thi";
import { NO_BOOKER_VALUE } from "../src/shared/booker";
import { coODatQuaDoiTac, coXemNguoiBan, coXemPhanDoiTac, duocGhiTay, nhanBenDat } from "../src/shared/phan-doi-tac-hien-thi";
import { initPhanDoiTac } from "./phan-doi-tac";
import { handlerControls, handlerFailure, handlerSaved, hoiDuocNguoiPhuTrach, nguoiPhuTrachTuPhien, nhanChoNhan } from "../src/shared/handler-view";
import { tuChoiQuaMuon } from "../src/shared/trip-rules";
import { vnToday } from "../src/shared/vn-date";
import { moHopTuChoi } from "./tu-choi-sheet";
import { HANDLER_HIDDEN } from "../src/shared/order-confirmation";
import { type PaxCounts } from "../src/shared/order-lines";
import { LOI_409_KHONG_CU, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { cauDongBoChuyen } from "../src/shared/dong-bo-chuyen-cau";
import { cauChuaCoNgay, cauKhoaXacNhan, khongQuyenSuaText, orderActions, paxFullText, suaChuyenDuoc, suaKhachDuoc, type ChoXacNhan } from "../src/shared/order-view";
import { bangXacNhanDon, daiChoXacNhan, nutGuiDon, nutGuiXacNhan, nutRutLai, type BoiCanhXacNhan } from "./xac-nhan-don-ui";
import { cauLoiGuiDon } from "../src/shared/xac-nhan-hien-thi";
import { CAU_BAO_GUI_DON } from "../src/shared/gui-don-cau-bao";
import { CHUA_XEP_XE, dongXeTrenDon, duocXemXeTrenDon } from "../src/shared/xe-tren-don";
import { canhBaoGiamGiaVuot, duocSuaSoKhachVanPhong, nguonBangSuaSoKhach } from "../src/shared/so-khach-van-phong";
import { cauNhacSoKhach, daiSauSuaSoKhach, dongLichSuHienThi, type DongLichSuHienThi } from "../src/shared/so-khach-hien-thi";
import type { MoneyEditSource } from "../src/shared/viec-cua-toi";
import type { SuKienDon } from "../src/shared/bang-tin";

const id = new URLSearchParams(location.search).get("id");
const bannerEl = byId("error");
const root = byId("order");
const actions = byId("actions");
const sendEl = byId("send");
let current: Order | null = null;
let staff: Staff | null = null; // gán sau `initShell()`; các hàm dưới chỉ chạy sau đó
/** Mốc tối thiểu đang hiệu lực (phút) từ GET /api/orders/:id (ADR-0049 I31); null = chưa có chính sách (máy chủ trả 503 lúc xác nhận). */
let mocPhut: number | null = null;
/** ADR-0136: khối bước xác nhận do máy chủ gửi kèm chi tiết đơn (null = đơn không phải nháp / người xem không liên quan; undefined → máy chủ cũ coi như null). */
let xacNhan: Api.XacNhanTrenDonDto | null = null;
/** Tiền của đơn từ billing (`GET /api/orders/:id/payments` — sổ tiền lượt 1); null = chưa tải được / không được xem (khối tiền hiện "—", không đoán). */
let tien: Api.OrderPaymentsResponse | null = null;
/** Mở form "Ghi khoản thu" có điền sẵn số tiền (nút "Khách đã chuyển khoản" của bảng QR). null khi người xem không ghi thu được đơn này. */
let moGhiThu: ((soTien: number) => void) | null = null;
/** Xe chở từng chặng (ADR-0059, route của van-chuyen); null = không được xem / chưa tải được — KHÔNG hiện khối (không nói "Chưa xếp xe" khi không biết). */
let xeDon: Api.XeCuaDonResponse | null = null;
/** Dấu "đã nhập phần mềm kế toán" (ADR-0060, route billing); null = không được xem / chưa tải được — ẩn khối. */
let nhapKt: Api.NhapKeToanResponse | null = null;
/** Danh sách hành khách (ADR-0047 A2, `GET /passengers`); null = chưa tải được — ẩn khối "Hành khách", bỏ cảnh báo thiếu tên (không đoán). */
let khachDon: Api.PassengerListResponse | null = null;
/** Loại khách văn phòng sửa được sau xác nhận (ADR-0063 D1) — máy chủ gửi kèm đơn; `null` = không có nút "Sửa số khách dịch vụ". */
let suaSoKhach: Api.SuaSoKhachDichVuDto[] | null = null;
/** Câu nhắc khuyến mại màu đỏ (ADR-0114 D1) — máy chủ gửi kèm đơn, luôn có mặt (câu hoặc `null`); giao diện KHÔNG tự tính gì về giảm giá, chỉ hiện đúng chữ này. */
let canhBaoKhuyenMai: string | null = null;
/** Sổ đại lý đợt 2 (Task 7, ADR-0079 điều 8 gạch 3): giảm giá hiệu lực vượt tổng hoa hồng sau xác nhận — máy chủ gửi `canhBaoGiamGia`; không chặn, chỉ cảnh báo. */
let canhBaoGiamGia: { vuot: number } | null = null;
/** Lịch sử số khách đủ dòng (ADR-0114 D2); `null` = người xem không có `order.history.view`. Khối chỉ hiện khi đơn đã có ít nhất một lần sửa (`dongLichSuHienThi`). */
let lichSuSoKhach: Api.DongLichSuSoKhachDto[] | null = null;

// Biểu mẫu lập đơn "Duyệt đặt gấp" (ADR-0049 R-P15) tự lưu nháp rồi gọi lệnh đặt gấp; lệnh đó hỏng thì chuyển tới đây kèm `datgap=loi` — báo một lần, bỏ tham số
// NGAY (như `moi`) để tải lại trang không báo lại.
let baoDatGapLoi = new URLSearchParams(location.search).get("datgap") === "loi";
if (baoDatGapLoi) {
  const url = new URL(location.href);
  url.searchParams.delete("datgap");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

// Form lập đơn MỚI chuyển tới `/order?id=…&moi=1`: mở hộp thoại "Xác nhận đơn để gửi khách" (ảnh PNG) đúng một lần, sau lần tải đơn đầu tiên. Bỏ `moi` khỏi URL NGAY (trước mọi await), để dù
// bước dựng trang sau đó ném lỗi thì tải lại trang cũng không bật lại hộp thoại.
let autoOpenConfirmation = new URLSearchParams(location.search).get("moi") === "1";
if (autoOpenConfirmation) {
  const url = new URL(location.href);
  url.searchParams.delete("moi");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

// Form lập đơn của người giữ quyền Đối tác chuyển tới `/order?id=…&gui=A|B` (đã Gửi đơn; MỘT chữ cái nhánh) hoặc `&guiloi=1` (đã lưu nháp nhưng Gửi đơn hỏng; câu máy chủ ở sessionStorage). Bỏ khỏi URL NGAY.
const thamSoGui: { nhanh: "A" | "B" | null; loi: boolean } = (() => {
  const p = new URLSearchParams(location.search);
  const nhanh = p.get("gui");
  const loi = p.get("guiloi") === "1";
  if (nhanh !== null || loi) {
    const url = new URL(location.href);
    url.searchParams.delete("gui");
    url.searchParams.delete("guiloi");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  return { nhanh: nhanh === "A" || nhanh === "B" ? nhanh : null, loi };
})();
/** Đ11: ảnh XÁC NHẬN ĐƠN DỊCH VỤ có hay chưa — đơn nháp đang chờ hoặc thuộc diện phải gửi xác nhận thì CHƯA; còn lại (đã xác nhận, nháp thường) có. */
const anhXacNhanLuc = (): boolean => current?.status !== "draft" || !(xacNhan && (xacNhan.yeuCau !== null || xacNhan.canXacNhan));
/** Tải lại đơn rồi hiện một dòng báo (sau Gửi xác nhận / Rút lại / quyết định). */
async function lamMoiSauBuoc(thongBao?: { tone: "success" | "info"; text: string }): Promise<void> {
  await load();
  if (thongBao) show(banner("info", thongBao.text));
}

const sendButton = (): HTMLButtonElement | null => sendEl.querySelector("button");
/** Ảnh xác nhận gửi khách của đơn đang xem (mọi trạng thái, mọi người xem được đơn — ảnh chỉ in lại dữ liệu họ đã thấy). */
function openConfirmation(): void {
  if (current && staff) openConfirmationDialog({ order: current, viewer: staff, opener: sendButton });
}

/** `null` ẩn banner. Liên kết "Sửa" của banner incomplete_trip mở form ĐÚNG thẻ (`?focus=`, Task 7). */
function show(b: Banner | null): void {
  renderBanner(bannerEl, b, {
    reloadOrder: () => void load(),
    reloadPage: () => location.reload(),
    editHref: (serviceId) => `/order-form?id=${encodeURIComponent(id!)}&focus=${encodeURIComponent(serviceId)}`,
  });
}

/**
 * Sau lệnh đơn nối máy đồng bộ chuyến (ADR-0104 Đ2, kế hoạch §8): có câu nhắc (xe đang chạy → "Báo huỷ"; cập nhật tay) thì dải VÀNG mang câu đó thay dải xanh
 * "đã lưu"; không có thì dải xanh như cũ (`xong` null = không dải xanh). `them` = dòng vàng sẵn có của lệnh (vd tổng tiền âm). Tải lại lỗi thì giữ banner lỗi.
 * `tone` (mặc định vàng): ADR-0114 D1 — lệnh sửa số khách đổi sang ĐỎ khi có câu nhắc khuyến mại; các nơi gọi khác không truyền nên không đổi.
 */
function baoSauLenh(xong: string, xanh: string | null, dongBo: readonly (Api.DongBoChuyenDto | undefined)[], them: readonly string[] = [], tone: "warning" | "danger" = "warning"): void {
  if (!bannerEl.hidden) return;
  const cau = [...them, ...cauDongBoChuyen(dongBo)];
  if (cau.length > 0) show(banner(tone, xong, { lines: cau.map((text) => ({ text })) }));
  else if (xanh !== null) show(banner("info", xanh));
}

/** Lỗi của máy chủ → banner theo ma trận đặc tả 5.2 (incomplete_trip có danh sách thiếu); lỗi mạng → câu chung. */
function errorBanner(err: unknown): Banner {
  if (!(err instanceof ApiError)) return banner("danger", "Không kết nối được máy chủ.");
  const b = classifyOrderError(
    { status: err.status, code: err.code, message: err.message, details: err.details },
    { serviceNames: current?.services.map((s) => s.name) ?? [], formatMoney: vnd, tenChang, mocPhut },
  );
  // 409 ở trang đơn (vd invalid_transition: đơn vừa đổi trạng thái ở nơi khác) phải có nút "Tải lại đơn" — PWA standalone không có tải lại của trình duyệt.
  // Trừ incomplete_trip: banner đó đã có liên kết "Sửa" tới đúng dịch vụ và ma trận đặc tả 5.2 ghi cột Hành động là "—" (stale đã có reload_order sẵn).
  // Trừ lỗi mã giao dịch (`bank_txn_*`, ADR-0092 Đ6): tải lại đơn xoá form đang nhập và số thực chuyển điền sẵn từ lần 409 — Kế toán cần sửa ngay tại form đó.
  // Trừ lỗi nghiệp vụ người dùng sửa tại chỗ (`LOI_409_KHONG_CU`, vd thieu_nguoi_lon — ADR-0114 D3): màn hình không cũ, câu máy chủ gửi đã nói việc cần làm.
  return b.action === "none" && err.status === 409 && err.code !== "incomplete_trip" && !err.code.startsWith("bank_txn_") && !LOI_409_KHONG_CU.has(err.code) ? { ...b, action: "reload_order" } : b;
}

/** Hiện banner lỗi của một thao tác ngay trong thẻ (form xác nhận / ghi khoản thu) và đưa nó vào tầm nhìn: banner nằm đầu trang, ngoài màn hình điện thoại khi người dùng đang ở thẻ Thanh toán. */
function hienLoiTaiCho(b: Banner): void {
  show(b);
  bannerEl.scrollIntoView({ block: "nearest" });
}

/** "Chiều đi · <dịch vụ>" của một chặng của đơn đang xem (dòng banner 409 `short_notice_required`). */
function tenChang(legId: string): string | null {
  for (const s of current?.services ?? []) {
    const l = s.legs.find((x) => x.id === legId);
    if (l) return `${CHIEU_LABEL[l.direction]} · ${s.name}`;
  }
  return null;
}

/**
 * Khối V12 dưới thông tin chuyến của một dịch vụ (bản vẽ 07): nhãn "Đặt gấp — …" của chặng đã đặt gấp (theo khoá có trong DTO — chủ H4) và dải cảnh báo dưới mốc
 * của chặng đơn NHÁP còn phải đặt gấp; người có ô order.leg.short_notice có nút "Đặt gấp" (route POST …/legs/:legId/short-notice).
 */
/**
 * ADR-0059: khối "Xe đón" dưới thông tin chuyến của một dịch vụ — mỗi chặng: "Xe … · Tài xế … · n khách · <trạng thái>" (chặng chia nhiều xe → nhiều dòng), chặng
 * chưa xếp → "Chưa xếp xe". Chỉ khi đã tải được `xeDon` (người không đủ quyền không gọi route — `duocXemXeTrenDon`).
 */
function khoiXe(order: Order, serviceId: string): HTMLElement | null {
  const s = order.services.find((x) => x.id === serviceId);
  if (!s || !xeDon || s.legs.length === 0) return null;
  const nhieuChang = s.legs.length > 1;
  const dong: HTMLElement[] = [];
  for (const l of s.legs) {
    const c = xeDon.chang.find((x) => x.legId === l.id);
    if (!c) continue;
    const nhan = nhieuChang ? `Xe đón · ${CHIEU_LABEL[l.direction]}` : "Xe đón";
    if (c.xe.length === 0) dong.push(kv(nhan, CHUA_XEP_XE, "xe-don-dong"));
    for (const x of c.xe) dong.push(kv(nhan, dongXeTrenDon(x), "xe-don-dong"));
  }
  return dong.length ? h("div", { class: "xe-don", "data-xe-don": s.id }, ...dong) : null;
}

function khoiChang(order: Order, serviceId: string, canDatGap: readonly ChangCanDatGap[], duocDatGap: boolean): HTMLElement | null {
  const s = order.services.find((x) => x.id === serviceId);
  if (!s) return null;
  const nhieuChang = s.legs.length > 1;
  const khoi: HTMLElement[] = [];
  for (const l of s.legs) {
    const duoi = canDatGap.find((c) => c.legId === l.id);
    if (!l.datGap && !duoi) continue;
    const dau = nhieuChang ? h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]) : null;
    if (l.datGap) {
      khoi.push(h("div", { class: "dg-leg", "data-leg-id": l.id }, dau, khoiNhanDatGap(l.datGap)));
      continue;
    }
    const c = duoi!;
    const w = khoiCanhBaoMoc({
      cau: cauMoc(c.phutConLai, mocPhut!),
      duocDatGap,
      onDuyet: async (than) => {
        show(null);
        try {
          await api(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(l.id)}/short-notice`, { method: "POST", body: than });
        } catch (err) {
          show(errorBanner(err));
          bannerEl.scrollIntoView({ block: "nearest" });
          return;
        }
        await load();
        if (bannerEl.hidden) show(banner("info", `Đã duyệt đặt gấp: ${c.chieu} · ${c.tenDichVu}.`));
      },
    });
    khoi.push(h("div", { class: "dg-leg", "data-leg-id": l.id }, dau, w.root));
  }
  return khoi.length ? h("div", { class: "dg-legs" }, ...khoi) : null;
}

// ---- khối "Đưa đón" + "Hành khách" (ADR-0047 Phần B; bản vẽ M3 — docs/design/2026-10-01-dua-don-hanh-khach/trang-don.dc.html) ----
const nhacEl = (cau: string): HTMLElement => h("span", { class: "dd-nhac" }, cau);
const canhEl = (cau: string): HTMLElement => h("span", { class: "dd-canh" }, icon("alert", 16), cau);

/** Một chặng: chiều · ngày · giờ (hoặc "Chưa chốt giờ") · số hiệu · số người về; "nơi đón → nơi trả" (hoặc "Chưa chốt nơi trả"); văn phòng thấy câu nhắc. */
function dongChang(l: Api.LegDto, vanPhong: boolean): HTMLElement {
  const ngay = l.pickupDate ? ngayNganHomNay(l.pickupDate) : "—";
  return h(
    "div",
    { class: "dd-dong", "data-leg-id": l.id },
    h(
      "div",
      { class: "dd-dong-dau" },
      h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]),
      h("span", { class: "dd-dong-gio" }, l.pickupTime ? `${ngay} · ${l.pickupTime}` : ngay),
      l.pickupTime ? null : canhEl("Chưa chốt giờ"),
      // Trang đơn (bản vẽ M3): [XE RIÊNG][≥ N chỗ] TRƯỚC [✈︎]; ai xem được chặng đều thấy (ADR-0056 VK3-A; chủ 2/10).
      ...nhanCamKet(l.exclusiveVehicle, l.minVehicleSeats).map((x) => h("span", { class: x.tone === "navy" ? "chip dp-chip-navy" : "chip chip-unit" }, x.nhan)),
      l.flightCode ? h("span", { class: "chip chip-code" }, `✈︎ ${l.flightCode}`) : null,
      l.paxOverride !== null ? h("span", { class: "chip chip-muted" }, `${l.paxOverride} người về`) : null,
    ),
    h("div", { class: "dd-dong-noi" }, h("span", null, l.pickupLabel), h("span", { class: "muted", "aria-hidden": "true" }, "→"), l.dropoffLabel ? h("span", null, l.dropoffLabel) : canhEl("Chưa chốt nơi trả")),
    vanPhong && !l.pickupTime ? nhacEl("Cần giờ đón trước khi xếp xe") : null,
    vanPhong && thieuNoiTra(l) ? nhacEl(CAU_CAN_NOI_TRA) : null,
  );
}

function khoiDuaDonDon(order: Order, vanPhong: boolean, nut: HTMLElement | null): HTMLElement {
  const coChang = order.services.filter((s) => s.legs.length > 0);
  return h(
    "section",
    { class: "card dd-card", "data-khoi": "dua-don" },
    h("h2", null, "Đưa đón"),
    coChang.length === 0 ? h("p", { class: "muted" }, "Không đưa đón") : null,
    ...coChang.map((s) => h("div", { class: "dd-dv" }, h("span", { class: "dd-dv-ten" }, s.name), ...s.legs.map((l) => dongChang(l, vanPhong)))),
    nut,
  );
}

function khoiHanhKhachDon(ds: Api.PassengerListResponse, nut: HTMLElement | null): HTMLElement {
  const du = ds.soNguoiCoTen;
  const mau = ds.soKhachDoan;
  return h(
    "section",
    { class: "card hk-card-don", "data-khoi": "hanh-khach" },
    h("h2", null, "Hành khách"),
    h("div", { class: "hk-dem" }, h("span", { class: "hk-dem-icon" }, icon("guests", 18)), h("span", { class: "hk-dem-so" }, `${du}/${mau}`), h("span", { class: "hk-dem-chu" }, "khách đã có tên")),
    du > 0 && du < mau ? h("p", { class: "alert warn hk-nhac-don" }, icon("alert", 16), `Còn ${mau - du} khách chưa có tên — cần đủ trước khi xe chạy`) : null,
    du === 0 ? h("p", { class: "muted" }, "Chưa có hành khách nào.") : null,
    du > 0
      ? h(
          "ol",
          { class: "hk-xem" },
          ...ds.passengers.map((p, i) =>
            h("li", null, h("span", { class: "hk-xem-ten" }, h("span", { class: "hk-so" }, `${i + 1}.`), ` ${p.fullName}`), h("span", { class: "muted" }, p.paxCode ? `${p.birthYear} · ${PAX_LABEL[p.paxCode]}` : String(p.birthYear))),
          ),
        )
      : null,
    nut,
  );
}

/** Điểm danh mục cho bảng "Sửa đưa đón" (tải khi mở bảng; lỗi → rỗng, vẫn gõ tự do được). */
async function layDiemChon(): Promise<DiemChon[]> {
  try {
    const r = await api<Api.LocationListResponse>("/api/locations");
    return r.locations.filter((l) => l.active).map((l) => ({ id: l.id, nhan: `${l.name} · ${l.locationTypeName.toLowerCase()}`, sanBay: l.locationTypeCode === "AIRPORT" }));
  } catch {
    return [];
  }
}

function nutSuaDuaDon(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "sua-dua-don" }, "Sửa đưa đón");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const diem = await layDiemChon();
    btn.disabled = false;
    openSheetDuaDon(
      {
        order, diem, coDatGap: can(staff!, "order.leg.short_notice"), mocPhut,
        onSaved: (dongBo) =>
          void load().then(() => {
            baoSauLenh("Đã lưu đưa đón.", "Đã lưu đưa đón.", dongBo);
            document.querySelector<HTMLElement>('[data-action="sua-dua-don"]')?.focus();
          }),
        onReload: () => void load(),
      },
      btn,
    );
  });
  return btn;
}

function nutSuaDanhSach(order: Order, ds: Api.PassengerListResponse): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "sua-danh-sach" }, "Sửa danh sách");
  btn.addEventListener("click", () =>
    openSheetHanhKhach(
      {
        orderId: order.id, ds,
        onSaved: (dongBo) =>
          void load().then(() => {
            baoSauLenh("Đã lưu danh sách hành khách.", "Đã lưu danh sách hành khách.", [dongBo]);
            document.querySelector<HTMLElement>('[data-action="sua-danh-sach"]')?.focus();
          }),
        onReload: () => void load(),
      },
      btn,
    ),
  );
  return btn;
}

function kv(label: string, value: string | null, cls = ""): HTMLElement {
  return h("div", { class: `kv ${cls}` }, h("span", { class: "muted" }, label), h("span", null, value || "—"));
}

// ---- người phụ trách (v1.0, Task 8) ----
// null = chưa có người phụ trách; undefined = CHƯA BIẾT (lời gọi lỗi) — xem handlerControls; HANDLER_HIDDEN = người xem không được biết (Đối tác, Thực tập — `hoiDuocNguoiPhuTrach`): ẩn cả khối
type Handler = Api.HandlerDto | null | undefined | typeof HANDLER_HIDDEN;

/**
 * Người phụ trách đang mở của đơn. KHÔNG bao giờ ném lỗi: lời gọi hỏng thì đơn vẫn hiển thị, khối người phụ trách báo "chưa tải được" (không đoán "chưa có người" rồi mời nhận).
 * Phản hồi thiếu khoá hoặc sai dạng cũng coi là chưa biết (dữ liệu từ ngoài trang).
 */
/** Cờ «được trả lại» của đơn đang xem (ADR-0030 điều 3) — `traLai` của `GET /api/dispatch/handlers`; bản máy chủ cũ không có trường → false. */
let donTraLai = false;
async function loadHandler(orderId: string): Promise<Handler> {
  try {
    const r = await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${encodeURIComponent(orderId)}`);
    donTraLai = Array.isArray(r.traLai) && r.traLai.includes(orderId);
    const found = r.handlers[orderId];
    if (found === null) return null;
    return found && typeof found.name === "string" && found.name.trim() !== "" ? found : undefined;
  } catch {
    return undefined;
  }
}

const asErrorInput = (err: unknown) => (err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null);
/** Sau đổi/nhận người phụ trách hoặc khi màn hình đã lỗi thời: tải lại đơn, báo bằng `b` (tải lại lỗi thì giữ banner lỗi của `load()`, không đè), trả focus. */
async function reloadWith(b: Banner): Promise<void> {
  await load();
  if (bannerEl.hidden) show(b);
  focusHandlerControl();
}
/** Nút đổi đã bị dựng lại sau khi tải lại → trả focus về nút mới; người dùng không còn nút nào (vd vừa giao đơn đi) thì focus tiêu đề khối để không rơi ra `body`. */
const focusHandlerControl = (): void => (document.querySelector<HTMLElement>('[data-action="change-handler"]') ?? document.getElementById("handler-title"))?.focus();

function changeButton(order: Order, handler: Api.HandlerDto | null, label: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-handler" }, label);
  btn.addEventListener("click", () =>
    openHandlerSheet(
      {
        order,
        current: handler,
        onSaved: (saved) => void reloadWith(banner("info", handlerSaved("assign", saved.name, handler !== null))),
        onOutdated: (b) => void reloadWith(b),
      },
      btn,
    ),
  );
  return btn;
}

/** "Nhận phụ trách": nhận cho CHÍNH MÌNH khi đơn chưa có người (máy chủ kiểm lại `dispatch.claim` và "chưa có người"). */
function claimButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "claim-handler" }, "Nhận phụ trách");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    show(null);
    try {
      const { handler } = await api<Api.SetHandlerResponse>(`/api/orders/${encodeURIComponent(order.id)}/handler`, { method: "PUT", body: { staffId: staff!.id } });
      await reloadWith(banner("info", handlerSaved("claim", handler.name, false)));
    } catch (err) {
      const failure = handlerFailure(asErrorInput(err), "claim");
      if (failure.reload) await reloadWith(failure.banner);
      else {
        show(failure.banner);
        btn.disabled = false;
      }
    }
  });
  return btn;
}

/**
 * «Từ chối đơn» (ADR-0030 điều 1): người ĐANG phụ trách tự trả đơn (hộp chọn lý do — web/tu-choi-sheet.ts). Thành công: người chỉ xem đơn mình phụ trách
 * (hướng dẫn viên) không còn xem được đơn này (máy chủ 404) → về trang Tôi; người xem được mọi đơn (Bán hàng, Quản trị, Toàn quyền) → tải lại tại chỗ.
 */
function refuseButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "refuse-handler" }, "Từ chối đơn");
  btn.addEventListener("click", () => {
    moHopTuChoi({
      orderId: order.id,
      orderCode: order.orderCode,
      moTa: `Đơn của ${order.customerName}.`,
      opener: btn,
      done: (kq) => {
        if (!kq.ok) return void reloadWith(kq.banner);
        if (nguoiPhuTrachTuPhien(staff!)) location.replace("/account");
        else void reloadWith(banner("info", handlerSaved("refuse", "", true)));
      },
    });
  });
  return btn;
}

/**
 * Khối "Người phụ trách": tên (hoặc chip "Chưa có người phụ trách") + nút đổi/nhận theo `can()` (src/shared/handler-view.ts). Chưa biết người phụ trách → chữ báo + "Thử lại", không nút nào khác.
 * Người xem không được biết (`HANDLER_HIDDEN` — Đối tác, Thực tập; lỗi báo 30/9, L2) → không dựng khối (như ảnh biên nhận: không dòng, không câu chờ).
 */
function handlerCard(order: Order, handler: Handler): HTMLElement | null {
  if (handler === HANDLER_HIDDEN) return null;
  const controls = handlerControls(
    staff!,
    { staffId: order.staffId, status: order.status, daGiao: Boolean(order.deliveredAt), quaMuon: tuChoiQuaMuon(order.services.map((s) => s.departDate), vnToday(new Date())) },
    handler,
  );
  const buttons: HTMLElement[] = [];
  let summary: HTMLElement;
  if (handler === undefined) {
    summary = h("p", { class: "handler-unknown" }, "Chưa tải được người phụ trách.");
    const retry = h("button", { type: "button", class: "btn", "data-action": "retry-handler" }, "Thử lại");
    retry.addEventListener("click", () => void load().then(focusHandlerControl));
    buttons.push(retry);
  } else {
    summary = h("p", { class: "handler-name" }, handler === null ? h("span", { class: "chip chip-warn" }, nhanChoNhan(donTraLai)) : handler.name);
    // Sổ tiền lượt 1 (ADR-0025 đ4): sau "Đã giao" máy chủ từ chối đổi / nhận người phụ trách (409 order_delivered) — không hiện nút.
    if (controls.assign && !order.deliveredAt) buttons.push(changeButton(order, handler, controls.assignLabel));
    if (controls.claim && !order.deliveredAt) buttons.push(claimButton(order));
    if (controls.refuse) buttons.push(refuseButton(order)); // handlerControls đã xét Đã giao, nháp, đơn huỷ, hạn hôm nay / ngày mai
  }
  return h(
    "section",
    { class: "card handler-card", "aria-labelledby": "handler-title" },
    h("h2", { id: "handler-title", tabindex: -1 }, "Người phụ trách"),
    summary,
    buttons.length ? h("div", { class: "handler-actions" }, ...buttons) : null,
  );
}

/**
 * Dải tóm tắt đầu trang (Bước 2 Đợt B): mã đơn + trạng thái, chuyến (của DỊCH VỤ ĐẦU TIÊN — cùng quy ước
 * "dịch vụ đầu quyết định trip" dùng ở trang Đơn hàng, `OrderSummaryTripDto`), khách, tổng số khách (cộng dồn
 * mọi dịch vụ), còn lại phải thu. Phải chạy được khi đơn CHƯA có dịch vụ nào (đơn nháp mới tạo, `services` rỗng):
 * mọi trường của dịch vụ đọc qua `?.`, không văng lỗi.
 */
function summaryBand(order: Order): HTMLElement {
  const firstSvc = order.services[0];
  const when = firstSvc?.departDate ? `${ngayNganHomNay(firstSvc.departDate)}${firstSvc.pickupTime ? ` · ${firstSvc.pickupTime}` : ""}` : "Chưa có ngày khởi hành"; // bản 1.39: cùng chữ với dòng cảnh báo ở thẻ dịch vụ (trước: "Chưa có ngày đón")
  const totalPax = order.services.reduce<PaxCounts>(
    (sum, s) => ({ adult: sum.adult + s.pax.adult, child: sum.child + s.pax.child, senior: sum.senior + s.pax.senior, infant: sum.infant + s.pax.infant }),
    { adult: 0, child: 0, senior: 0, infant: 0 },
  );
  const pax = paxFullText(totalPax); // bản 1.39: viết đủ chữ ("8 người lớn, 1 trẻ em"); danh sách đơn vẫn viết tắt
  // Cùng công thức rút gọn tên dịch vụ dùng ở trang Đơn hàng (`web/orders.ts`, `serviceLine`): tổng số khách phía trên CỘNG DỒN mọi
  // dịch vụ, nên dòng phụ này không được chỉ ghi tên dịch vụ đầu tiên (I2) — phải phản ánh đơn có bao nhiêu dịch vụ.
  const serviceNames = order.services.map((s) => s.name);
  const serviceLine = serviceNames.length === 0 ? "—" : serviceNames.length === 1 ? serviceNames[0] : `${serviceNames[0]} +${serviceNames.length - 1} dịch vụ`;
  const stat = (label: string, value: string, sub?: string, due = false) =>
    h("div", null, h("div", { class: "label" }, label), h("div", { class: due ? "value due" : "value" }, value), sub ? h("div", { class: "sub" }, sub) : null);
  return h(
    "div",
    { class: "order-summary-band" },
    h(
      "div",
      null,
      h("div", { class: "label" }, "MÃ ĐƠN"),
      h("div", { class: "value" }, order.orderCode, " ", badgeTrangThai(order)),
    ),
    h("div", { class: "sep" }),
    h(
      "div",
      { class: "grid4" },
      stat("ĐÓN", when, firstSvc?.pickupPlace ?? undefined),
      stat("KHÁCH", order.customerName, order.customerPhone),
      stat("SỐ KHÁCH", pax || "—", serviceLine),
      tien?.coc
        ? stat(tien.coc.nhan.toUpperCase(), vnd(tien.coc.daTra), tien.coc.nhanPhu ?? `Tổng ${vnd(order.total)}`)
        : tien
          ? stat(tien.du > 0 ? "KHÁCH TRẢ DƯ" : "CÒN LẠI", vnd(tien.du > 0 ? tien.du : tien.conLai), `Tổng ${vnd(order.total)} · ${nhanTienDaTra(order).nhan.toLowerCase()} ${vnd(tien.daThu)}`, tien.conLai > 0 || tien.du > 0)
          : stat("CÒN LẠI", "—", `Tổng ${vnd(order.total)}`),
    ),
  );
}

/** Huy hiệu trạng thái: "Đã giao – đã thu đủ" / "Hoàn thành" suy ra từ mốc (`trangThaiHienThi`, src/shared — một nguồn nhãn). */
function badgeTrangThai(order: Order): HTMLElement {
  const tt = trangThaiHienThi(order);
  return h("span", { class: `badge badge-${tt.khoa}` }, tt.nhan);
}

// ---- Thanh toán (sổ tiền lượt 1 — ADR-0025, ADR-0026): số do billing tính; trình duyệt chỉ vẽ, ẩn/hiện nút theo cờ máy chủ gửi ----
function tienCard(order: Order): HTMLElement {
  const t = tien;
  moGhiThu = null;
  const rows: HTMLElement[] = [kv("Tạm tính", vnd(order.subtotal)), kv("Giảm giá", vnd(order.discount)), kv("Tổng cộng", vnd(order.total), "strong")];
  if (t?.coc) {
    // ADR-0089: đơn huỷ — không có "Còn lại" (khách không còn nợ); số cọc do máy chủ tính.
  } else if (t) {
    rows.push(kv(nhanTienDaTra(order).nhan, vnd(t.daThu)));
    rows.push(t.du > 0 ? kv("Khách trả dư", `${vnd(t.du)} — chờ Kế toán hoàn`, "strong") : kv("Còn lại", vnd(t.conLai), "strong"));
  } else rows.push(kv("Đã thu / còn lại", "Chưa tải được"));
  rows.push(kv("Ghi chú thanh toán", order.paymentNote));
  // ADR-0063 D1 + ADR-0109 QĐ3: bớt khách tới mức giảm giá lớn hơn tạm tính KHÔNG bị chặn — câu cảnh báo hiện thường trực trên khối tiền (phải thu đã kẹp 0).
  // ADR-0114 D1: thêm câu nhắc khuyến mại MÀU ĐỎ (máy chủ gửi `canhBaoKhuyenMai`) cạnh câu vàng cũ — hai câu có thể cùng hiện. Hiện đúng chỗ trang đã hiện giảm giá (khối này), không thêm cổng quyền.
  const daXacNhan = order.status === "confirmed";
  const nhac = cauNhacSoKhach({ tongAm: daXacNhan ? canhBaoGiamGiaVuot(order) : null, khuyenMai: daXacNhan ? canhBaoKhuyenMai : null });
  for (const c of nhac) rows.push(h("p", { class: c.muc === "do" ? "dd-canh-xn is-do" : "dd-canh-xn", "data-canh-bao": c.khoa }, icon("alert", 16), c.cau));
  const vuotHoaHong = cauCanhBaoGiamGia(canhBaoGiamGia, vnd);
  if (vuotHoaHong) rows.push(h("p", { class: "dd-canh-xn is-do", "data-canh-bao": "giam-gia-vuot-hoa-hong" }, icon("alert", 16), vuotHoaHong));
  const lanThu =
    t && t.lanThu.length
      ? h(
          "ul",
          { class: "pay-list", "data-khoi": "lan-thu" },
          ...t.lanThu.map((l) =>
            h(
              "li",
              null,
              h("span", { class: "muted" }, `${ngayNganHomNay(l.ngayPhatSinh)} · ${l.giaiDoan}`),
              // Dòng huỷ (bút toán ngược, ADR-0130): hiện dấu trừ cho dòng huỷ một khoản thu, để không đọc thành khách trả thêm lần nữa. Dòng huỷ một khoản
              // trả lại khách thì nói bằng chữ (số đã thu tăng lại, không phải trừ).
              ` — ${l.traLai ? (l.laDongDao ? "Huỷ khoản trả lại khách " : "Trả lại khách ") : l.laDongDao ? "−" : ""}${vnd(l.soTien)} · ${l.hinhThuc} · người thu tiền: ${l.nguoiThu}`,
              l.laDongDao ? h("span", { class: "muted" }, " (dòng huỷ)") : l.daDao ? h("span", { class: "muted" }, " (đã huỷ)") : null,
              l.maGiaoDich ? h("span", { class: "muted" }, ` · mã GD ${l.maGiaoDich} (thực chuyển ${vnd(l.soThucChuyen ?? 0)})`) : null,
              t.keToan && !t.completedAt ? nhacDoiChieuLanThu(t, l) : null,
              t.keToan && !t.completedAt ? nutKeToanLanThu(order, t, l) : null,
            ),
          ),
        )
      : null;
  // NT-F11 (Hiến chương 5.7): lý do đơn đang bị giữ + ai phải xử lý — hiện NGAY, không đợi bấm nút mới báo lỗi. Đơn nháp / huỷ không cần dòng này.
  const lyDo = t ? (t.deliveredAt ? t.lyDoChuaHoanThanh : t.lyDoChuaGiao) : null;
  const giu =
    lyDo && lyDo.ma !== "not_confirmed" && lyDo.ma !== "cancelled"
      ? h("p", { class: "dg-lock dg-lock-note", "data-khoi": "ly-do-giu" }, `Đang giữ đơn: ${lyDo.cau} Ai xử lý: ${lyDo.aiXuLy}.`, lyDoCanTaiLai(lyDo.ma) ? nutTaiLaiDon() : null)
      : null;
  const keToan = t?.keToan && !t.completedAt ? khoiKeToan(order, t) : null;
  const coc = t?.coc ? khoiCoc(order, t.coc) : null;
  const nut: HTMLElement[] = [];
  // ADR-0108 đ3 (đặc tả §4.2): QR khi đọc được tiền của đơn (route payments đã hỏi order.view + money.view), đơn chưa Đã giao, còn lại > 0. ADR-0135 Đ8: chỉ đơn ĐÃ XÁC NHẬN. Máy chủ kiểm lại.
  if (t && !t.coc && !t.deliveredAt && t.conLai > 0 && order.status === "confirmed") nut.push(nutQr(order, t));
  if (t?.coTheGhiThu) nut.push(nutGhiThu(order, t));
  if (t && t.quyenGiao && !t.deliveredAt && order.status === "confirmed") nut.push(nutChot(order, "delivered", t));
  if (t && t.quyenHoanThanh && t.deliveredAt && !t.completedAt) nut.push(nutChot(order, "completed", t));
  return h(
    "section",
    { class: "card totals", "data-khoi": "thanh-toan" },
    h("h2", null, "Thanh toán"),
    ...rows,
    coc,
    lanThu,
    keToan,
    giu,
    nut.length ? h("div", { class: "handler-actions" }, ...nut) : null,
  );
}

// ---- Thao tác Kế toán đặt TẠM trên trang đơn (điều phối 30/9: hai màn sổ riêng chờ chủ vẽ lại trên Claude Design). Chỉ hiện khi máy chủ gửi khối
// `keToan` (người có ô `ledger.write`); máy chủ vẫn là cổng. Chỉ gọi route billing đã có. Mỗi thao tác mở một hàng xác nhận NGAY trong thẻ (không dùng
// confirm() của trình duyệt): bấm lần hai mới ghi. ----

/**
 * Ô "Mã giao dịch ngân hàng" + "Số tiền thực chuyển" (ADR-0092 Đ6) — chỉ dựng cho Kế toán / Toàn quyền; máy chủ quyết khi nào bắt buộc (trống cả hai ⇒ gửi
 * không mã, máy chủ trả câu nếu cần). Lỗi 409 "số thực chuyển lệch" mang số đã ghi của mã (`error.soThucChuyen`) ⇒ điền sẵn để Kế toán đối chiếu sao kê rồi
 * bấm lại — không có route tra mã (trang ghép §0).
 */
function oMaGiaoDich(macDinh?: { ma?: string; soThucChuyen?: number }): {
  o: HTMLElement[];
  hien: (co: boolean) => void;
  doc: () => { maGiaoDich: string; soThucChuyen: number } | { loi: string } | null;
  tuLoi: (err: unknown) => void;
} {
  const ma = h("input", { type: "text", autocomplete: "off", maxlength: "60", placeholder: "Như in trên sao kê", value: macDinh?.ma ?? "" }) as HTMLInputElement;
  const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "Như in trên sao kê" }) as HTMLInputElement;
  if (macDinh?.soThucChuyen) setMoneyValue(so, macDinh.soThucChuyen);
  so.addEventListener("input", () => regroupMoney(so));
  const o = [h("label", { "data-o": "ma-giao-dich" }, "Mã giao dịch ngân hàng", ma), h("label", { "data-o": "so-thuc-chuyen" }, "Số tiền thực chuyển (₫)", so)];
  let dangHien = true;
  return {
    o,
    hien: (co) => {
      dangHien = co;
      for (const x of o) x.hidden = !co;
    },
    doc: () => {
      if (!dangHien) return null;
      const coMa = ma.value.trim() !== "";
      const soN = parseMoney(so.value);
      if (!coMa && soN <= 0) return null;
      if (!coMa || soN <= 0) return { loi: "Nhập đủ cả mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê." };
      return { maGiaoDich: ma.value.trim(), soThucChuyen: soN };
    },
    tuLoi: (err) => {
      if (!(err instanceof ApiError) || err.code !== "bank_txn_amount_mismatch") return;
      const a = (err.details as { soThucChuyen?: unknown } | undefined)?.soThucChuyen;
      if (typeof a === "number") setMoneyValue(so, a);
    },
  };
}
const loiCuaMa = (d: ReturnType<ReturnType<typeof oMaGiaoDich>["doc"]>): string | null => (d && "loi" in d ? d.loi : null);
const thanCuaMa = (d: ReturnType<ReturnType<typeof oMaGiaoDich>["doc"]>): Record<string, unknown> => (d && !("loi" in d) ? d : {});

/** Mở một hàng xác nhận tại chỗ: `noiDung` (các ô nhập, nếu có) + nút ghi + "Thôi"; `ghi` trả lời gọi máy chủ; xong → tải lại đơn và báo. */
function hangXacNhan(opts: { nhan: string; action: string; cau: string; nutGhi: string; o?: HTMLElement[]; ghi: () => Promise<unknown>; bao: string; kiem?: () => string | null }): HTMLElement {
  const wrap = h("span", { class: "pay-inline" });
  const mo = h("button", { type: "button", class: "btn btn-link", "data-action": opts.action }, opts.nhan);
  mo.addEventListener("click", () => {
    const ghi = h("button", { type: "submit", class: "btn btn-primary" }, opts.nutGhi);
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": `xac-nhan-${opts.action}` },
      h("p", null, opts.cau),
      opts.o && opts.o.length ? h("div", { class: "grid two" }, ...opts.o) : null,
      h("div", { class: "handler-actions" }, ghi, thoi),
    ) as HTMLFormElement;
    thoi.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const loiNhap = opts.kiem?.() ?? null;
      if (loiNhap) return hienLoiTaiCho(banner("danger", loiNhap));
      ghi.disabled = true;
      show(null);
      try {
        await opts.ghi();
        await load();
        if (bannerEl.hidden) show(banner("info", opts.bao));
      } catch (err) {
        hienLoiTaiCho(errorBanner(err));
        ghi.disabled = false;
      }
    });
    replaceChildren(wrap, form);
  });
  wrap.append(mo);
  return wrap;
}

/** Nhãn khoản khách đã trả của đơn KHÔNG huỷ (ADR-0089 đ3: chưa "Đã giao" là "Khách hàng đã trả trước", sau đó "Đã thu") — một luật ở src/shared. */
const nhanTienDaTra = (order: Order): { nhan: string } => nhanTienLuat({ status: order.status, deliveredAt: order.deliveredAt });

/** Ô số tiền dùng chung cho các hàng thao tác cọc. */
function oSoTien(macDinh: number | null): HTMLInputElement {
  const o = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: macDinh ? String(macDinh) : "" }) as HTMLInputElement;
  regroupMoney(o);
  o.addEventListener("input", () => regroupMoney(o));
  return o;
}
const oLyDo = (goiY: string): HTMLInputElement => h("input", { type: "text", autocomplete: "off", maxlength: "500", placeholder: goiY }) as HTMLInputElement;

/**
 * Tiền cọc của ĐƠN HUỶ (ADR-0089 đ2, đ9b): nhãn "Cọc giữ lại – khách huỷ" / "Khách hàng đã trả trước", đã duyệt / đã hoàn / đã chuyển / còn giữ, khoản duyệt,
 * dòng "đã hoàn ngoài hệ thống". Nút theo CỜ máy chủ (`can()` của đúng ô); máy chủ vẫn kiểm lại. Không vẽ màn mới (GĐ kế hoạch §3.5 — hàng nút cùng kiểu).
 */
function khoiCoc(order: Order, c: Api.CocDonDto): HTMLElement {
  const rows: HTMLElement[] = [
    kv("Lý do huỷ", `${c.lyDoNhan} · ${c.nhomNhan} · ngày ${ngayDayDu(c.ngayHuy)}`),
    kv(c.nhan, `${vnd(c.daTra)}${c.nhanPhu ? ` — ${c.nhanPhu}` : ""}`, "strong"),
  ];
  // Chủ 28/10: SV-DH-13 «ghi đủ các dòng» (dư đã trả lại trước khi huỷ), SV-DH-04 chữ «Đã hoàn trả» — cùng chữ với thông báo gửi khách.
  if (c.hoanTruocHuy > 0) rows.push(kv("Đã trả lại khách trước khi huỷ", vnd(c.hoanTruocHuy)));
  if (c.dangDoiChieu > 0) rows.push(kv("Đang đối chiếu", `${vnd(c.dangDoiChieu)} (khách khai chuyển khoản, chưa xác nhận)`));
  if (c.daDuyet > 0) rows.push(kv("Đã duyệt hoàn / chuyển", vnd(c.daDuyet)));
  if (c.daChi > 0) rows.push(kv("Đã hoàn trả", vnd(c.daChi)));
  if (c.daChuyen > 0) rows.push(kv("Đã chuyển sang đơn mới", vnd(c.daChuyen)));
  if (c.choChi > 0) rows.push(kv("Chờ chi", vnd(c.choChi)));
  rows.push(kv("Công ty còn giữ", vnd(c.conGiu), "strong"));
  if (c.nguoiGiu?.length) rows.push(kv("Người chưa nộp tiền", c.nguoiGiu.map((g) => `${g.ten}: ${vnd(g.soTien)}`).join("; ")));

  const khoan = c.khoanDuyet.map((k) => {
    const nut: HTMLElement[] = [];
    if (k.loai === "hoan" && c.coTheChi && k.conLai > 0) {
      const so = oSoTien(k.conLai);
      const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
      nut.push(hangXacNhan({
        nhan: "Ghi chi hoàn", action: "coc-chi", nutGhi: "Ghi chi hoàn",
        cau: `Ghi đã hoàn cho khách theo khoản duyệt ${vnd(k.soTien)} (còn ${vnd(k.conLai)}). Người duyệt không tự chi.`,
        o: [h("label", null, "Số tiền (₫)", so), h("label", null, "Hình thức", hinhThuc)],
        kiem: () => (parseMoney(so.value) > 0 ? null : "Nhập số tiền đã hoàn."),
        ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/chi`, { method: "POST", body: { duyetId: k.id, soTien: parseMoney(so.value), hinhThuc: hinhThuc.value, nguoiTra: "cong_ty" } }),
        bao: "Đã ghi chi hoàn.",
      }));
    }
    if (k.loai === "chuyen" && c.coTheChuyen && k.conLai > 0) {
      const so = oSoTien(k.conLai);
      nut.push(hangXacNhan({
        nhan: "Chuyển tiền sang đơn mới", action: "coc-chuyen", nutGhi: "Ghi chuyển",
        cau: `Chuyển ${vnd(k.conLai)} sang đơn ${k.donNhan ?? ""} (tiền do Công ty giữ). Người duyệt không tự chuyển.`,
        o: [h("label", null, "Số tiền (₫)", so)],
        kiem: () => (parseMoney(so.value) > 0 ? null : "Nhập số tiền chuyển."),
        ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/chuyen`, { method: "POST", body: { duyetId: k.id, soTien: parseMoney(so.value), nguoiGiu: "cong_ty" } }),
        bao: "Đã chuyển tiền sang đơn mới.",
      }));
    }
    if ((k.loai === "chuyen" ? c.coTheDuyetChuyen : c.coTheDuyet) && k.conLai > 0 && k.daHuy === 0) {
      const so = oSoTien(k.conLai);
      const lyDo = oLyDo("Vì sao huỷ duyệt (bắt buộc)");
      nut.push(hangXacNhan({
        nhan: "Huỷ duyệt", action: "coc-huy-duyet", nutGhi: "Huỷ duyệt",
        cau: `Huỷ phần chưa chi của khoản duyệt (tối đa ${vnd(k.conLai)}).`,
        o: [h("label", null, "Số tiền (₫)", so), h("label", null, "Lý do", lyDo)],
        kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền huỷ duyệt." : lyDo.value.trim() ? null : "Nhập lý do."),
        ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/duyet/${encodeURIComponent(k.id)}/huy`, { method: "POST", body: { soTien: parseMoney(so.value), lyDo: lyDo.value.trim() } }),
        bao: "Đã huỷ duyệt phần chưa chi.",
      }));
    }
    return h(
      "li",
      { "data-khoi": "khoan-duyet" },
      `${ngayNganHomNay(k.ngayDuyet)} · ${k.loai === "chuyen" ? `Duyệt chuyển sang ${k.donNhan ?? "đơn mới"}` : "Duyệt hoàn"} ${vnd(k.soTien)}`,
      k.daHuy > 0 ? ` (đã huỷ duyệt ${vnd(k.daHuy)})` : "",
      ` — còn ${vnd(k.conLai)}${k.lyDo ? ` · ${k.lyDo}` : ""}${k.nguoiDuyet ? ` · ${k.nguoiDuyet}` : ""}`, // Đối tác: máy chủ bỏ lý do + người duyệt (D-1)
      nut.length ? h("span", { class: "kt-actions" }, ...nut) : null,
    );
  });
  const ngoai = c.hoanNgoaiDong.map((g) => {
    const nhanTT = g.trangThai === "da_xac_nhan" ? "đã xác nhận" : g.trangThai === "tu_choi" ? "bị từ chối" : "chờ Quản trị xác nhận";
    const nut: HTMLElement[] = [];
    if (g.trangThai === "cho_xac_nhan" && c.coTheXacNhanHoanNgoai) {
      nut.push(hangXacNhan({
        nhan: "Xác nhận", action: "coc-xac-nhan-ngoai", nutGhi: "Xác nhận",
        cau: `Xác nhận công ty đã trả tay ${vnd(g.soTien)} cho khách? Người ghi không tự xác nhận.`,
        ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/hoan-ngoai/${encodeURIComponent(g.id)}/xac-nhan`, { method: "POST", body: { dongY: true } }),
        bao: "Đã xác nhận dòng đã hoàn ngoài hệ thống.",
      }));
      const lyDo = oLyDo("Vì sao từ chối (bắt buộc)");
      nut.push(hangXacNhan({
        nhan: "Từ chối", action: "coc-tu-choi-ngoai", nutGhi: "Từ chối",
        cau: "Từ chối dòng này (Toàn quyền ghi lại được).", o: [h("label", null, "Lý do", lyDo)],
        kiem: () => (lyDo.value.trim() ? null : "Nhập lý do từ chối."),
        ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/hoan-ngoai/${encodeURIComponent(g.id)}/xac-nhan`, { method: "POST", body: { dongY: false, lyDo: lyDo.value.trim() } }),
        bao: "Đã từ chối dòng đã hoàn ngoài hệ thống.",
      }));
    }
    return h("li", { "data-khoi": "hoan-ngoai" }, `Đã hoàn ngoài hệ thống ${vnd(g.soTien)} · ${nhanTT}${g.lyDo ? ` · ${g.lyDo}` : ""}`, nut.length ? h("span", { class: "kt-actions" }, ...nut) : null);
  });

  const nut: HTMLElement[] = [];
  if (c.coThePhanLoai) {
    const nhom = h("select", null, ...(["KHACH_HUY", "CONG_TY_HUY", "LAP_LAI"] as const).map((v) => h("option", { value: v }, NHOM_HUY_NHAN[v]))) as HTMLSelectElement;
    const lyDo = oLyDo("Vì sao xếp nhóm này (bắt buộc)");
    nut.push(hangXacNhan({
      nhan: "Phân loại lý do", action: "phan-loai-huy", nutGhi: "Phân loại",
      cau: "Lý do huỷ đang “chưa kết luận”. Chọn nhóm (quyết định giữ thu trước và hạn hoàn):",
      o: [h("label", null, "Nhóm", nhom), h("label", null, "Lý do", lyDo)],
      kiem: () => (lyDo.value.trim() ? null : "Nhập lý do phân loại."),
      ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/cancel-reason`, { method: "POST", body: { nhom: nhom.value, lyDo: lyDo.value.trim() } }),
      bao: "Đã phân loại lý do huỷ.",
    }));
  }
  if (c.coTheDuyet || c.coTheDuyetChuyen) {
    // ADR-0120 Điều 2: mỗi lựa chọn hiện theo ĐÚNG ô của nó (Kế toán chỉ thấy "Chuyển sang đơn mới"); máy chủ kiểm lại.
    const loai = h("select", null,
      ...(c.coTheDuyet ? [h("option", { value: "hoan" }, "Hoàn cho khách")] : []),
      ...(c.coTheDuyetChuyen ? [h("option", { value: "chuyen" }, "Chuyển sang đơn mới")] : []),
    ) as HTMLSelectElement;
    const so = oSoTien(null);
    const donNhan = h("input", { type: "text", autocomplete: "off", placeholder: "Mã đơn nhận (khi chuyển)" }) as HTMLInputElement;
    const lyDo = oLyDo("Vì sao hoàn / chuyển (bắt buộc)");
    nut.push(hangXacNhan({
      nhan: c.coTheDuyet ? "Duyệt hoàn thu trước" : "Duyệt chuyển sang đơn mới", action: "coc-duyet", nutGhi: "Duyệt",
      cau: `Công ty còn giữ ${vnd(c.conGiu)}.${c.nhom === "KHACH_HUY" ? ` Hạn hoàn: ${ngayDayDu(c.han)}.` : ""} Người duyệt không tự chi.`,
      o: [h("label", null, "Loại", loai), h("label", null, "Số tiền (₫)", so), h("label", null, "Đơn nhận", donNhan), h("label", null, "Lý do", lyDo)],
      kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền." : !lyDo.value.trim() ? "Nhập lý do." : loai.value === "chuyen" && !donNhan.value.trim() ? "Nhập mã đơn nhận." : null),
      ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/duyet`, {
        method: "POST",
        body: loai.value === "chuyen"
          ? { loai: "chuyen", soTien: parseMoney(so.value), lyDo: lyDo.value.trim(), donNhan: donNhan.value.trim() }
          : { loai: "hoan", soTien: parseMoney(so.value), lyDo: lyDo.value.trim() },
      }),
      bao: "Đã duyệt.",
    }));
  }
  if (c.coTheGhiHoanNgoai) {
    const so = oSoTien(c.conGiu);
    const lyDo = oLyDo("Đã trả tay khách thế nào (bắt buộc, không số tài khoản)");
    nut.push(hangXacNhan({
      nhan: "Ghi đã hoàn ngoài hệ thống", action: "coc-ghi-ngoai", nutGhi: "Ghi",
      cau: "Đơn huỷ trước khi có lệnh hoàn thu trước: ghi khoản công ty đã trả tay cho khách (cần Quản trị xác nhận mới tính).",
      o: [h("label", null, "Số tiền (₫)", so), h("label", null, "Lý do", lyDo)],
      kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền." : lyDo.value.trim() ? null : "Nhập lý do."),
      ghi: () => api(`/api/orders/${encodeURIComponent(order.id)}/coc/hoan-ngoai`, { method: "POST", body: { soTien: parseMoney(so.value), lyDo: lyDo.value.trim() } }),
      bao: "Đã ghi — chờ Quản trị xác nhận.",
    }));
  }
  return h(
    "div",
    { class: "kt-khoi", "data-khoi": "coc-don-huy" },
    h("h3", null, "Tiền của đơn huỷ"),
    ...rows,
    khoan.length ? h("ul", { class: "pay-list" }, ...khoan) : null,
    ngoai.length ? h("ul", { class: "pay-list" }, ...ngoai) : null,
    nut.length ? h("div", { class: "handler-actions" }, ...nut) : null,
  );
}

/** ADR-0120 Điều 1 mục 3: dòng nhắc Kế toán dưới khoản "Công ty thu" đang đối chiếu — người khai, số tiền, số ngày chờ (quá 3 ngày thì nổi màu cảnh báo). Không số điện thoại / tài khoản / mã giao dịch. */
function nhacDoiChieuLanThu(t: Api.OrderPaymentsResponse, l: Api.LanThuDto): HTMLElement | null {
  // Chỉ khoản CHUYỂN KHOẢN mới là "đang đối chiếu" (ADR-0120 Điều 1): tiền mặt "Công ty thu" vẫn là nợ giữ hộ (H3 cũ), không nhắc kiểu này.
  if (!t.keToan!.choXacNhan.includes(l.id) || l.daDao || l.laDongDao || l.hinhThuc !== METHOD_LABEL.BANK_TRANSFER) return null;
  const soNgay = soNgayCho(l.ghiLuc, new Date());
  return h("p", { class: quaHanDoiChieu(soNgay) ? "dd-canh-xn is-do" : "muted", "data-khoi": "nhac-doi-chieu" }, cauNhacKhoan({ nguoiKhai: l.nguoiGhi ?? null, soTienDaDinhDang: vnd(l.soTien), soNgay }));
}

/** Nút trên từng khoản thu: "Xác nhận đã nhận" (Công ty thu – CK do người khác khai — H3), "Đảo" (ghi dòng đảo, bắt buộc lý do; gồm khoản thu "chưa rõ" từ cọc cũ). */
function nutKeToanLanThu(order: Order, t: Api.OrderPaymentsResponse, l: Api.LanThuDto): HTMLElement | null {
  const nut: HTMLElement[] = [];
  if (t.keToan!.choXacNhan.includes(l.id)) {
    const laCK = l.hinhThuc === METHOD_LABEL.BANK_TRANSFER;
    const ma = laCK ? oMaGiaoDich() : null;
    const hinhThuc = (Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).find((m) => METHOD_LABEL[m] === l.hinhThuc) ?? "OTHER";
    nut.push(
      hangXacNhan({
        nhan: "Xác nhận đã nhận", action: "xac-nhan-ck", nutGhi: "Công ty đã nhận",
        cau: cauXacNhanDaNhan({ hinhThuc, soTien: vnd(l.soTien) }),
        o: ma?.o,
        kiem: () => loiCuaMa(ma?.doc() ?? null),
        ghi: async () => {
          try {
            return await api(`/api/ledger/company-receipts/${encodeURIComponent(l.id)}/confirm`, { method: "POST", body: thanCuaMa(ma?.doc() ?? null) });
          } catch (err) {
            ma?.tuLoi(err);
            throw err;
          }
        },
        bao: `Đã xác nhận công ty nhận ${vnd(l.soTien)}.`,
      }),
    );
  }
  // ADR-0132 điều 2: khoản khách trả cho đại lý / tại quầy nhà cung cấp do người không ghi sổ khai ⇒ «Bên kia đã nhận» (một lô: dấu xác nhận + nợ bên kia → Tour Đảo).
  // Bên kia báo không nhận ⇒ «Huỷ khoản thu» bên dưới (đơn chưa giao). Không mã giao dịch: tiền vào tài khoản của bên kia (ADR-0132 điều 4).
  if (t.keToan!.choBenKia.includes(l.id)) {
    nut.push(
      hangXacNhan({
        nhan: "Bên kia đã nhận", action: "ben-kia-da-nhan", nutGhi: "Bên kia đã nhận",
        cau: cauBenKiaDaNhan(l.nguoiThu, vnd(l.soTien)),
        ghi: () => api(`/api/ledger/counterparty-receipts/${encodeURIComponent(l.id)}/confirm`, { method: "POST", body: {} }),
        bao: `Đã ghi bên kia nhận ${vnd(l.soTien)}.`,
      }),
    );
  }
  // ADR-0088 đ2, đ3: "Sửa khoản thu đã ghi" — đường sửa sai của khoản thu (sau Đã giao là đường DUY NHẤT; "Đảo" đơn lẻ bị máy chủ chặn nên ẩn). Một khoản thu cũ → một
  // khoản thu đúng (API nhận N → M; màn này làm ca hay gặp). Đơn huỷ đi qua khối cọc.
  // Người kiểm I-1 (19/10): tài khoản giữ quyền Đối tác không thấy «Sửa khoản thu» — máy chủ chặn cùng luật (`ghiSoNoiBo`).
  if (ghiSoNoiBo(staff!, "ledger.write") && hienNutSuaKhoanThu(l, { choXacNhan: t.keToan!.choXacNhan, donDaHuy: order.status === "cancelled" })) {
    const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: String(l.soTien) }) as HTMLInputElement;
    regroupMoney(so);
    so.addEventListener("input", () => regroupMoney(so));
    // Kiểm độc lập vòng 3: mặc định ĐÚNG hình thức và người thu của khoản thu cũ — chỉ sửa số tiền thì không vô tình đổi người thu (đổi sang "Công ty" xoá khoản
    // nhân viên đang giữ).
    const hinhThuc = h("select", null, ...(["CASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => h("option", { value: m, selected: METHOD_LABEL[m] === l.hinhThuc }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const laCongTy = l.nguoiThu === "Công ty";
    const nguoiKhac = t.keToan!.dangGiu.filter((d) => d.partyId !== l.nguoiThuPartyId);
    const nguoiThu = h(
      "select",
      null,
      h("option", { value: "cong_ty", selected: laCongTy }, "Công ty"),
      !laCongTy && l.nguoiThuPartyId ? h("option", { value: l.nguoiThuPartyId, selected: true }, `${l.nguoiThu} (người thu tiền cũ)`) : null,
      ...nguoiKhac.map((d) => h("option", { value: d.partyId }, d.ten)),
    ) as HTMLSelectElement;
    const lyDoThay = h("input", { type: "text", autocomplete: "off", maxlength: "500", placeholder: "Vì sao sửa (ít nhất 10 ký tự)" }) as HTMLInputElement;
    // ADR-0092 Đ6: khoản thu mới CK – Công ty thu cần mã — điền sẵn mã + số thực chuyển của khoản thu cũ (thay một-đổi-một); máy chủ không tự chép.
    const maThay = oMaGiaoDich({ ma: l.maGiaoDich, soThucChuyen: l.soThucChuyen });
    const capNhatMaThay = () => maThay.hien(hinhThuc.value === "BANK_TRANSFER" && nguoiThu.value === "cong_ty");
    hinhThuc.addEventListener("change", capNhatMaThay);
    nguoiThu.addEventListener("change", capNhatMaThay);
    capNhatMaThay();
    nut.push(
      hangXacNhan({
        nhan: "Sửa khoản thu đã ghi", action: "thay-lan-thu", nutGhi: "Lưu khoản thu đúng",
        cau: `Sửa khoản ${vnd(l.soTien)} (người thu tiền: ${l.nguoiThu}): khoản cũ được ghi «đã huỷ» và khoản đúng được ghi thay, cùng một lần. Chỉ đổi người thu tiền khi tiền thật sự đang ở người khác (đổi sang Công ty thì người thu tiền cũ không còn phải nộp khoản này).${t.deliveredAt ? " Đơn đã giao: tổng đã thu phải giữ nguyên." : ""}`,
        o: [h("label", null, "Số tiền đúng (₫)", so), h("label", null, "Hình thức", hinhThuc), h("label", null, "Người thu tiền đúng", nguoiThu), ...maThay.o, h("label", null, "Lý do", lyDoThay)],
        kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền." : lyDoThay.value.trim().length < 10 ? "Lý do ít nhất 10 ký tự." : loiCuaMa(maThay.doc())),
        ghi: async () => {
          try {
            return await api("/api/ledger/receipt-replacements", {
              method: "POST",
              body: {
                orderId: order.id, cu: [l.id], lyDo: lyDoThay.value.trim(),
                moi: [{ soTien: parseMoney(so.value), hinhThuc: hinhThuc.value, nguoiThu: nguoiThu.value === "cong_ty" ? "cong_ty" : { partyId: nguoiThu.value }, ...thanCuaMa(maThay.doc()) }],
              },
            });
          } catch (err) {
            maThay.tuLoi(err);
            throw err;
          }
        },
        bao: "Đã sửa khoản thu.",
      }),
    );
  }
  // BL-SDL2-DAO-DONG-TM (b): tài khoản giữ quyền Đối tác (kể cả lai) không thấy nút — máy chủ chặn cùng luật.
  if (!l.daDao && !l.laDongDao && !t.deliveredAt && duocHuyKhoanSo(staff!)) {
    const lyDo = h("input", { type: "text", autocomplete: "off", maxlength: "500", placeholder: "Vì sao huỷ (bắt buộc)" }) as HTMLInputElement;
    nut.push(
      hangXacNhan({
        nhan: l.traLai ? "Huỷ khoản trả lại" : "Huỷ khoản thu", action: "dao-lan-thu", nutGhi: "Huỷ khoản này",
        cau: `Huỷ khoản ${l.traLai ? "trả lại khách" : "thu"} ${vnd(l.soTien)} (người thu tiền: ${l.nguoiThu})? Sổ vẫn giữ dòng cũ (ghi «đã huỷ») và thêm một dòng ngược lại. Chỉ dùng khi ghi nhầm hẳn; sai số tiền, hình thức hay người thu tiền thì dùng «Sửa khoản thu đã ghi».`,
        o: [h("label", null, "Lý do", lyDo)],
        kiem: () => (lyDo.value.trim() ? null : "Nhập lý do huỷ."),
        ghi: () => api("/api/ledger/adjustments", { method: "POST", body: { loai: "dao_lan_thu", receiptId: l.id, lyDo: lyDo.value.trim() } }),
        bao: `Đã huỷ khoản ${l.traLai ? "trả lại khách" : "thu"} ${vnd(l.soTien)}.`,
      }),
    );
  }
  return nut.length ? h("span", { class: "kt-actions" }, ...nut) : null;
}

/** Khối Kế toán dưới danh sách khoản thu: ai đang giữ tiền của công ty vì đơn này → "Đã nộp về công ty"; khách trả dư → "Ghi hoàn cho khách". */
function khoiKeToan(order: Order, t: Api.OrderPaymentsResponse): HTMLElement | null {
  const kt = t.keToan!;
  // ADR-0092 Đ2b (V2.6): "Đã nộp" chỉ gồm tiền mặt người đó đang giữ — phần "Công ty thu – CK" chờ xác nhận đi đường "Xác nhận đã nhận" (một dòng giữ hộ
  // tất toán MỘT lần). Người khai nộp bù khoản chuyển khoản không về thì Kế toán ghi ở sổ (số máy chủ kẹp).
  const dong: HTMLElement[] = kt.dangGiu.map((d) => {
    const tienMat = d.soTien - d.choXacNhan;
    return h(
      "li",
      { "data-khoi": "dang-giu" },
      `${d.ten} còn ${vnd(d.soTien)} chưa nộp về công ty`,
      d.choXacNhan > 0 ? ` (gồm ${vnd(d.choXacNhan)} chuyển khoản chờ xác nhận) ` : " ",
      tienMat > 0 && ghiSoNoiBo(staff!, "ledger.write") // người kiểm I-1: tài khoản giữ quyền Đối tác không ghi «Đã nộp» (máy chủ chặn cùng luật)
        ? hangXacNhan({
          nhan: "Đã nộp về công ty", action: "da-nop", nutGhi: "Ghi đã nộp",
          cau: `Ghi ${d.ten} đã nộp ${vnd(tienMat)} của đơn này về công ty?`,
          ghi: () => api("/api/ledger/settlements", { method: "POST", body: { chieu: "nop", partyId: d.partyId, phanBo: [{ orderId: order.id, soTien: tienMat }] } }),
          bao: `Đã ghi ${d.ten} nộp ${vnd(tienMat)}.`,
        })
        : null,
    );
  });
  let hoan: HTMLElement | null = null;
  if (t.du > 0 && ghiSoNoiBo(staff!, "payment.refund")) {
    const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: String(t.du) }) as HTMLInputElement;
    regroupMoney(soTien);
    soTien.addEventListener("input", () => regroupMoney(soTien));
    const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const nguoiTra = h("select", null, h("option", { value: "cong_ty" }, "Công ty"), ...kt.dangGiu.map((d) => h("option", { value: d.partyId }, d.ten))) as HTMLSelectElement;
    hoan = hangXacNhan({
      nhan: "Ghi hoàn cho khách", action: "ghi-hoan", nutGhi: "Ghi hoàn",
      cau: `Khách đã trả dư ${vnd(t.du)}. Ghi số tiền đã hoàn cho khách:`,
      o: [h("label", null, "Số tiền (₫)", soTien), h("label", null, "Hình thức", hinhThuc), h("label", null, "Người trả cho khách", nguoiTra)],
      kiem: () => (parseMoney(soTien.value) > 0 ? null : "Nhập số tiền hoàn."),
      ghi: () =>
        api("/api/ledger/refunds", {
          method: "POST",
          body: { orderId: order.id, soTien: parseMoney(soTien.value), hinhThuc: hinhThuc.value, nguoiTra: nguoiTra.value === "cong_ty" ? "cong_ty" : { partyId: nguoiTra.value } },
        }),
      bao: "Đã ghi hoàn cho khách.",
    });
  }
  // ADR-0088 đ2 + kiểm độc lập vòng 3: đơn đã ở bước Đã giao mà đã thu < phải thu (dữ liệu lệch từ trước bản vá) — ghi bù bằng lệnh sửa khoản thu KHÔNG khoản thu cũ.
  let bu: HTMLElement | null = null;
  if (t.deliveredAt && t.conLai > 0 && order.status !== "cancelled" && ghiSoNoiBo(staff!, "ledger.write")) {
    const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: String(t.conLai) }) as HTMLInputElement;
    regroupMoney(so);
    so.addEventListener("input", () => regroupMoney(so));
    const hinhThuc = h("select", null, ...(["CASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const nguoiThu = h("select", null, h("option", { value: "cong_ty" }, "Công ty"), ...kt.dangGiu.map((d) => h("option", { value: d.partyId }, d.ten))) as HTMLSelectElement;
    const lyDo = h("input", { type: "text", autocomplete: "off", maxlength: "500", placeholder: "Vì sao thiếu (ít nhất 10 ký tự)" }) as HTMLInputElement;
    // ADR-0092 Đ6: khoản thu bù CK – Công ty thu cũng cần mã (cùng đường Thay, không có khoản thu cũ để điền sẵn).
    const maBu = oMaGiaoDich();
    const capNhatMaBu = () => maBu.hien(hinhThuc.value === "BANK_TRANSFER" && nguoiThu.value === "cong_ty");
    hinhThuc.addEventListener("change", capNhatMaBu);
    nguoiThu.addEventListener("change", capNhatMaBu);
    capNhatMaBu();
    bu = hangXacNhan({
      nhan: "Ghi bù khoản thu", action: "ghi-bu-lan-thu", nutGhi: "Ghi bù",
      cau: `Đơn đã ở bước Đã giao nhưng sổ còn thiếu ${vnd(t.conLai)} (dữ liệu cũ). Ghi khoản thu bù để đã thu bằng phải thu:`,
      o: [h("label", null, "Số tiền (₫)", so), h("label", null, "Hình thức", hinhThuc), h("label", null, "Người thu tiền", nguoiThu), ...maBu.o, h("label", null, "Lý do", lyDo)],
      kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền." : lyDo.value.trim().length < 10 ? "Lý do ít nhất 10 ký tự." : loiCuaMa(maBu.doc())),
      ghi: async () => {
        try {
          return await api("/api/ledger/receipt-replacements", {
            method: "POST",
            body: { orderId: order.id, cu: [], lyDo: lyDo.value.trim(), moi: [{ soTien: parseMoney(so.value), hinhThuc: hinhThuc.value, nguoiThu: nguoiThu.value === "cong_ty" ? "cong_ty" : { partyId: nguoiThu.value }, ...thanCuaMa(maBu.doc()) }] },
          });
        } catch (err) {
          maBu.tuLoi(err);
          throw err;
        }
      },
      bao: "Đã ghi bù khoản thu.",
    });
  }
  if (dong.length === 0 && !hoan && !bu) return null;
  return h(
    "div",
    { class: "kt-khoi", "data-khoi": "ke-toan" },
    h("h3", null, "Kế toán"),
    dong.length ? h("ul", { class: "pay-list" }, ...dong) : null,
    hoan,
    bu,
  );
}

/** Lý do giữ `stale` (đơn vừa đổi giữa hai lần đọc — Task 9 M-5): nút tải lại đơn ngay cạnh câu. */
function nutTaiLaiDon(): HTMLButtonElement {
  const b = h("button", { type: "button", class: "btn btn-link", "data-action": "tai-lai-don" }, "Tải lại");
  b.addEventListener("click", () => void load());
  return b;
}

/** "Đã giao – đã thu đủ" / "Hoàn thành": nút TẮT khi máy chủ báo chưa đủ điều kiện (lý do hiện ngay trên); bấm → hỏi xác nhận → route billing → tải lại. */
function nutChot(order: Order, loai: "delivered" | "completed", t: Api.OrderPaymentsResponse): HTMLButtonElement {
  const giao = loai === "delivered";
  const btn = h("button", { type: "button", class: giao ? "btn btn-accent" : "btn btn-primary", "data-action": giao ? "da-giao" : "hoan-thanh" }, giao ? "Đã giao – đã thu đủ" : "Hoàn thành");
  btn.disabled = giao ? !t.coTheGiao : !t.coTheHoanThanh;
  btn.addEventListener("click", async () => {
    const cau = giao
      ? `Xác nhận Đã giao – đã thu đủ? Từ lúc này đơn bị khoá, không sửa, huỷ hay đổi người phụ trách được nữa.${t.banDangGiu > 0 ? ` Bạn còn ${vnd(t.banDangGiu)} chưa nộp về công ty — nhớ nộp.` : ""}`
      : "Xác nhận Hoàn thành đơn này? Không mở lại được.";
    if (!confirm(cau)) return;
    btn.disabled = true;
    show(null);
    try {
      await api(`/api/orders/${encodeURIComponent(order.id)}/${loai}`, { method: "POST", body: {} });
      await load();
      if (bannerEl.hidden) show(banner("info", giao ? "Đã giao – đã thu đủ. Đơn đã khoá." : "Đơn đã Hoàn thành."));
    } catch (err) {
      const b = errorBanner(err);
      await load(true);
      show(b);
    }
  });
  return btn;
}

/** "Ghi khoản thu" (ADR-0026 đ2): số tiền, hình thức (mặc định Chuyển khoản — chủ duyệt 30/9), người nhận (Công ty / tôi); Kế toán chọn được ngày phát sinh và nhập
 * mã giao dịch ngân hàng khi CK – Công ty thu (ADR-0092 Đ6). `moGhiThu(soTien)` mở form có điền sẵn (nút "Khách đã chuyển khoản" của bảng QR — đặc tả §4.2). */
function nutGhiThu(order: Order, t: Api.OrderPaymentsResponse): HTMLElement {
  const wrap = h("div", { class: "pay-inline" });
  const mo = h("button", { type: "button", class: "btn", "data-action": "ghi-lan-thu" }, "Ghi khoản thu");
  const moForm = (soTienSan: number | null) => {
    const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "0" }) as HTMLInputElement;
    soTien.addEventListener("input", () => regroupMoney(soTien));
    if (soTienSan !== null) setMoneyValue(soTien, soTienSan);
    const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    // Sổ đại lý đợt 2 (ADR-0132; đặc tả P4): hai lựa chọn mới chỉ khi máy chủ gửi `benKia` (đơn có đại lý được hưởng / quầy nhà cung cấp; không bao giờ với Đối tác).
    const nguoi = h("select", { id: "lan-thu-nguoi-thu" }, ...luaChonNguoiThu(t.benKia).map((c) => h("option", { value: c.value }, c.nhan))) as HTMLSelectElement;
    const thuCho = t.benKia ? (h("select", { id: "lan-thu-thu-cho" }, ...luaChonThuCho(t.benKia).map((c) => h("option", { value: c.value }, c.nhan))) as HTMLSelectElement) : null;
    const oThuChoEl = thuCho ? h("label", { "data-khoi": "thu-cho" }, NHAN_O_THU_CHO, thuCho) : null;
    const choKeToan = h("p", { class: "muted", "data-khoi": "cho-ke-toan", hidden: true });
    const ngay = t.laKeToan ? (h("input", { type: "date" }) as HTMLInputElement) : null;
    const ma = t.laKeToan ? oMaGiaoDich() : null;
    const capNhatMa = () => {
      ma?.hien(hinhThuc.value === "BANK_TRANSFER" && nguoi.value === "cong_ty");
      const o = oThuCho(t.benKia, nguoi.value);
      if (oThuChoEl && thuCho) {
        oThuChoEl.hidden = !o.hien;
        if (o.khoa !== null) thuCho.value = o.khoa;
        thuCho.disabled = o.khoa !== null; // quầy nhà cung cấp thu thì tiền thu cho chính nhà cung cấp đó (máy chủ 400 nếu khác)
      }
      const cau = cauChoKeToan(nguoi.value, t.laKeToan);
      choKeToan.textContent = cau ?? "";
      choKeToan.hidden = cau === null;
    };
    hinhThuc.addEventListener("change", capNhatMa);
    nguoi.addEventListener("change", capNhatMa);
    capNhatMa();
    const ghi = h("button", { type: "submit", class: "btn btn-primary" }, "Ghi");
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": "form-lan-thu" },
      h(
        "div",
        { class: "grid two" },
        h("label", null, "Số tiền (₫)", soTien),
        h("label", null, "Hình thức", hinhThuc),
        h("label", null, "Người thu tiền", nguoi),
        oThuChoEl,
        ngay ? h("label", null, "Ngày phát sinh", ngay) : null,
        ...(ma ? ma.o : []),
      ),
      choKeToan,
      h("div", { class: "handler-actions" }, ghi, thoi),
    ) as HTMLFormElement;
    thoi.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const so = parseMoney(soTien.value);
      if (so <= 0) return hienLoiTaiCho(banner("danger", "Nhập số tiền đã thu."));
      const loiMa = loiCuaMa(ma?.doc() ?? null);
      if (loiMa) return hienLoiTaiCho(banner("danger", loiMa));
      ghi.disabled = true;
      show(null);
      try {
        const than: Api.LanThuInput = {
          soTien: so,
          hinhThuc: hinhThuc.value as Api.LanThuInput["hinhThuc"],
          nguoiThu: nguoiThuTuGiaTri(nguoi.value),
          ...(thuCho && !oThuChoEl?.hidden && thuCho.value ? { thuChoNhaCungCapPartyId: thuCho.value } : {}),
          ...(ngay?.value ? { ngayPhatSinh: ngay.value } : {}),
          ...thanCuaMa(ma?.doc() ?? null),
        };
        await api(`/api/orders/${encodeURIComponent(order.id)}/payments`, { method: "POST", body: than });
        await load();
        if (bannerEl.hidden) show(banner("info", laBenKia(nguoi.value) && !t.laKeToan ? `Đã ghi khoản ${vnd(so)} — chờ Kế toán xác nhận.` : `Đã ghi khoản thu ${vnd(so)}.`));
      } catch (err) {
        ma?.tuLoi(err);
        hienLoiTaiCho(errorBanner(err));
        ghi.disabled = false;
      }
    });
    replaceChildren(wrap, form);
    soTien.focus();
  };
  mo.addEventListener("click", () => moForm(null));
  moGhiThu = (so) => {
    moForm(so);
    wrap.scrollIntoView({ block: "nearest" });
  };
  wrap.append(mo);
  return wrap;
}

/** "QR thanh toán" (ADR-0108 đ3; đặc tả §4.2): máy chủ dựng chuỗi VietQR + các dòng in dưới mã (danh sách trắng); trình duyệt chỉ vẽ ma trận lên canvas. */
function nutQr(order: Order, t: Api.OrderPaymentsResponse): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "qr-thanh-toan" }, "QR thanh toán");
  btn.addEventListener("click", () => moBangQr(order, t, btn));
  return btn;
}

function moBangQr(order: Order, t: Api.OrderPaymentsResponse, opener: HTMLElement): void {
  // Ô số tiền để TRỐNG lúc mở: số còn lại trong `t` là của lúc tải trang và có thể đã cũ. Lần gọi đầu không gửi `soTien` (máy chủ mặc định = số còn lại hiện hành);
  // ô được đặt lại theo số máy chủ đã dùng ngay khi phản hồi về (xem `nap`).
  const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", id: "qr-so-tien" }) as HTMLInputElement;
  const tao = h("button", { type: "button", class: "btn", "data-action": "qr-tao-lai" }, "Tạo lại mã");
  const trangThai = h("p", { class: "muted", role: "status", "data-khoi": "qr-trang-thai", hidden: true });
  const canvas = h("canvas", { class: "qr-anh", role: "img", "aria-label": "Mã QR thanh toán", hidden: true }) as HTMLCanvasElement;
  const dong = h("div", { class: "qr-dong", "data-khoi": "qr-thong-tin" });
  const loiEl = h("p", { class: "alert danger", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "qr-luu-anh", disabled: true }, "Lưu ảnh");
  const daChuyen = t.coTheGhiThu ? h("button", { type: "button", class: "btn", "data-action": "qr-da-chuyen", disabled: true }, "Khách đã chuyển khoản") : null;
  let anh: Blob | null = null;
  let hien: Api.QrThanhToanDto | null = null;
  let dangChiaSe = false;
  let lan = 0; // số thứ tự lần tạo mã: phản hồi của lần cũ (mạng chậm) không được vẽ đè mã của lần mới hơn
  /** Hai nút dùng SỐ của mã đang hiện (ảnh lưu, số điền sẵn vào form ghi thu): chỉ bật khi mã VÀ ảnh đã sẵn; mọi lúc khác tắt cả hai — không để trạng thái nửa vời. */
  const datNut = (bat: boolean): void => {
    luu.disabled = !bat;
    if (daChuyen) daChuyen.disabled = !bat;
  };
  const datTrangThai = (chu: string): void => {
    trangThai.textContent = chu;
    trangThai.hidden = chu === "";
  };
  soTien.addEventListener("input", () => {
    regroupMoney(soTien);
    // Số trong ô đã khác mã đang hiện: huỷ lần tạo còn bay, tắt hai nút theo mã cũ cho tới khi người dùng bấm "Tạo lại mã".
    lan++;
    anh = null;
    hien = null;
    datNut(false);
    datTrangThai("Số tiền đã đổi — bấm “Tạo lại mã” để dùng số mới.");
  });
  const bang = moBangTruot({
    title: "QR thanh toán",
    body: [h("label", null, "Số tiền (₫)", soTien), h("div", { class: "handler-actions" }, tao), trangThai, loiEl, h("div", { class: "qr-khung" }, canvas), dong],
    foot: [luu, daChuyen],
    footClass: "qr-foot",
    opener,
  });
  if (!bang) return;
  const nap = async () => {
    const lanNay = ++lan;
    const so = parseMoney(soTien.value);
    loiEl.hidden = true;
    datTrangThai("Đang tạo mã…");
    datNut(false);
    anh = null;
    hien = null;
    canvas.hidden = true;
    replaceChildren(dong);
    try {
      const r = await api<Api.QrThanhToanResponse>(`/api/orders/${encodeURIComponent(order.id)}/qr-thanh-toan${so > 0 ? `?soTien=${so}` : ""}`);
      if (lanNay !== lan) return;
      // Ô hiện ĐÚNG số máy chủ đã dùng (trống / 0 ⇒ số còn lại hiện hành). Không bắn `input` nên không đụng bộ đếm `lan` và hai nút; phản hồi cũ đã bị chặn ở dòng trên.
      setMoneyValue(soTien, r.qr.soTien);
      veMaQr(canvas, r.qr.payload);
      canvas.hidden = false;
      replaceChildren(dong, ...dongThongTinQr(r.qr).map((x) => h("p", null, x)));
      datTrangThai("");
      try {
        const png = await dungAnhQr(r.qr); // dựng SẴN: bảng chia sẻ của iOS phải mở ngay trong lần bấm "Lưu ảnh"
        if (lanNay !== lan) return;
        hien = r.qr;
        anh = png;
        datNut(true);
      } catch {
        if (lanNay !== lan) return;
        // Mã vẫn quét được trên màn hình, nhưng không có ảnh để lưu ⇒ KHÔNG bật "Khách đã chuyển khoản" (cùng số với ảnh): người dùng bấm "Tạo lại mã" để thử lại.
        loiEl.textContent = "Chưa dựng được ảnh để lưu — bấm “Tạo lại mã” để thử lại.";
        loiEl.hidden = false;
      }
    } catch (err) {
      if (lanNay !== lan) return;
      datTrangThai("");
      loiEl.textContent = err instanceof ApiError ? err.message : "Không tạo được mã — thử lại.";
      loiEl.hidden = false;
    }
  };
  tao.addEventListener("click", () => void nap());
  luu.addEventListener("click", () => {
    if (!anh || !hien || dangChiaSe) return;
    dangChiaSe = true;
    void luuHoacChiaSe(anh, `QR-${hien.noiDung}.png`, `Thanh toán đơn ${hien.maDon}`, bang.body).finally(() => {
      dangChiaSe = false;
    });
  });
  daChuyen?.addEventListener("click", () => {
    const so = hien?.soTien;
    bang.close(false);
    if (!so) return;
    // Trang đã vẽ lại thẻ Thanh toán (tin báo của đơn) và đơn không còn ghi khoản thu được nữa: `moGhiThu` là null. Nói ra thay vì đóng bảng im lặng.
    if (!moGhiThu) return hienLoiTaiCho(banner("warning", "Đơn vừa thay đổi — tải lại trang để ghi khoản thu.", { action: "reload_page" }));
    moGhiThu(so);
  });
  void nap();
}

/** Khối "Số khách qua các lần sửa" (ADR-0114 D2): mỗi dòng = một TRẠNG THÁI (số khách theo dịch vụ + tạm tính), dựng bằng `h()`. `null` = không có gì để hiện. */
function khoiLichSuSoKhach(dong: DongLichSuHienThi[] | null): HTMLElement | null {
  if (!dong) return null;
  return h(
    "div",
    { "data-khoi": "lich-su-so-khach" },
    h("h3", null, "Số khách qua các lần sửa"),
    h(
      "ul",
      { class: "history" },
      ...dong.map((d) =>
        h(
          "li",
          { "data-buoc": d.buoc },
          h("strong", null, d.nhan),
          ` — tạm tính ${d.tamTinh}`,
          ...d.dichVu.map((s) => h("div", { class: "history-detail muted" }, `${s.ten}: ${s.khach}`)),
        ),
      ),
    ),
  );
}

function render(order: Order, history: AuditEntry[], canModify: boolean, handler: Handler): void {
  current = order;
  // L1 (lỗi báo 30/9): nút "Sửa thông tin chuyến" / "Đổi khách" theo ô order.trip.edit (Đối tác, Thực tập: không) — không chỉ theo canModify.
  const suaChuyen = suaChuyenDuoc(staff!, order.staffId, canModify);
  // ADR-0136: cờ bước xác nhận do MÁY CHỦ gửi (`xacNhan`); riêng «người lập giữ quyền Đối tác» suy ở đây (chỉ đổi nút — máy chủ vẫn trả 409 `partner_submit_required`).
  const giuDoiTacLap = order.staffId === staff!.id && holdsPartner(staff!);
  const cho: ChoXacNhan | undefined = order.status === "draft" ? { canXacNhan: xacNhan?.canXacNhan ?? false, dangCho: xacNhan?.yeuCau != null, quyetDinhDuoc: xacNhan?.quyetDinhDuoc ?? false, giuDoiTacLap } : undefined;
  const a = orderActions(order.status, canModify, suaChuyen, cho);
  // Người xét duyệt (không phải người lập) mở đơn ĐANG CHỜ: khối "Người phụ trách" ẩn (HDV tự coi mình là người phụ trách — sai với đơn chưa giao cho họ) và không có "Xem biên nhận" (Đ11: ảnh chỉ sau khi xác nhận).
  const nguoiXetDuyet = cho?.dangCho === true && order.staffId !== staff!.id;
  if (nguoiXetDuyet) handler = HANDLER_HIDDEN;
  const suaKhach = suaKhachDuoc(staff!, order.staffId, canModify) && order.deliveredAt === null;
  // ADR-0063 D1: người lập đơn (Bán hàng), Kế toán, Quản trị, Toàn quyền sửa số khách đơn đã xác nhận, chưa Đã giao — cùng luật ẩn/hiện với máy chủ
  // (`duocSuaSoKhachVanPhong`, hỏi bảng quyền) VÀ máy chủ phải gửi loại khách sửa được (`suaSoKhach`); không dịch vụ nào sửa được thì không có nút.
  const nguonSoKhach = duocSuaSoKhachVanPhong(staff!, order) ? nguonBangSuaSoKhach(order.services, suaSoKhach) : null;
  // Nút sửa của hai khối mới: đơn đã xác nhận → bảng trượt (M4, M5); đơn nháp → về biểu mẫu đơn (M1, M2).
  const formHref = `/order-form?id=${encodeURIComponent(order.id)}`;
  const nutDuaDon =
    order.status === "confirmed" && a.editTrip
      ? h("div", { class: "dd-nut" }, nutSuaDuaDon(order))
      : order.status === "draft" && a.edit && suaChuyen
        ? h("div", { class: "dd-nut dd-nut-nhap" }, h("a", { class: "btn", href: formHref, "data-action": "sua-dua-don" }, "Sửa đưa đón"), h("span", { class: "hint" }, "Đơn nháp — sửa trong biểu mẫu đơn."))
        : null;
  const nutDs =
    khachDon && suaKhach
      ? order.status === "confirmed"
        ? h("div", { class: "dd-nut" }, nutSuaDanhSach(order, khachDon))
        : order.status === "draft"
          ? h("div", { class: "dd-nut" }, h("a", { class: "btn", href: formHref, "data-action": "sua-danh-sach" }, "Sửa danh sách"))
          : null
      : null;
  // Cảnh báo sớm lúc xác nhận (lời chủ 1/10 "2 — Có"): chỉ cảnh báo, vẫn xác nhận được.
  const canhBaoXN = a.confirm ? canhBaoXacNhan(order.services, khachDon ? khachDon.passengers.map((p) => p.personKey) : null) : [];
  // ADR-0049 V12: chặng đơn nháp còn dưới mốc chưa đặt gấp (luật kiemMocDat, dữ liệu N-14) — chỉ để hiện; máy chủ vẫn quyết lúc xác nhận (409).
  const canDatGap = changDuoiMoc(order, mocPhut, Date.now());
  const duocDatGap = can(staff!, "order.leg.short_notice");
  document.title = `${order.orderCode} — Island Booking System`;
  setBarTitle(order.orderCode);
  replaceChildren(
    root,
    // Mã đơn + trạng thái đã hiện nổi bật ở dải tóm tắt ngay dưới đây; h1 ở đây chỉ còn phục vụ trình đọc màn hình (axe page-has-heading-one), ẩn khỏi mắt (CSS `.detail-head h1`).
    h("header", { class: "detail-head" }, h("h1", null, order.orderCode)),
    summaryBand(order),
    cho?.dangCho && xacNhan?.yeuCau ? daiChoXacNhan(xacNhan.yeuCau, Date.now()) : null,
    h("p", { class: "muted" }, `Lập ${dateTime(order.createdAt)} bởi ${order.staffName}`, order.confirmedAt && ` · Xác nhận ${dateTime(order.confirmedAt)}`),
    order.deliveredAt
      ? h("p", { class: "lock-note" }, icon("lock", 18), order.completedAt ? "Đơn đã Hoàn thành — đơn đã khoá." : "Đơn đã ở bước Đã giao – đã thu đủ — đơn đã khoá, không sửa, huỷ hay đổi người phụ trách được nữa.")
      : a.locked
        ? h("p", { class: "lock-note" }, icon("lock", 18), cauKhoaXacNhan(a.editTrip, suaKhach, nguonSoKhach !== null)) // D5 (bản vẽ M3): câu khoá theo những gì người xem còn sửa được
        : null,

    h(
      "div",
      { class: "order-layout" },
      h(
        "div",
        null,
        handlerCard(order, handler),

        h(
          "section",
          { class: "card" },
          h("h2", null, "Khách hàng"),
          kv("Tên", order.customerName),
          kv("Số điện thoại", order.customerPhone),
          kv("Email", order.customerEmail),
          kv("Ghi chú", order.customerNote),
          kv(nhanBenDat(order.bookerLaDoiTac), order.bookerName ?? NO_BOOKER_VALUE), // "Bên đặt (đối tác)" khi bên đặt là hồ sơ được hưởng hoa hồng (cờ máy chủ), còn lại "Hồ sơ khách"
          a.editTrip ? bookerButton(order) : null,
        ),

        khoiDuaDonDon(order, suaChuyen, nutDuaDon),
        khachDon ? khoiHanhKhachDon(khachDon, nutDs) : null,

        renderServices(order, a.locked, (sid) => {
          const xe = khoiXe(order, sid);
          const dg = khoiChang(order, sid, canDatGap, duocDatGap);
          return xe && dg ? h("div", null, xe, dg) : xe ?? dg;
        }),
        // Sổ đại lý đợt 1 (Task 11): "Phần đối tác" — ẩn cho tới khi máy chủ trả dữ liệu (404 ⇒ ẩn luôn); nội dung do web/phan-doi-tac.ts dựng.
        coXemPhanDoiTac(staff!, order) ? h("section", { class: "card pdt", id: "phan-doi-tac", hidden: true }) : null,
      ),
      h(
        "div",
        { class: "side" },
        tienCard(order),
        nhapKt ? khoiNhapKeToan(order.id, nhapKt, hangXacNhan) : null,
      ),
    ),

    // Ở NGOÀI `.order-layout` có chủ đích (điện thoại dưới 900px không có rule riêng cho lưới → các con xếp theo thứ tự DOM;
    // đặt ở đây giữ đúng thứ tự cũ "Thanh toán trước Lịch sử". Máy tính ≥900px: khối này trải hết bề ngang, nằm dưới lưới 2 cột.
    // D6: SALES không thấy nhật ký đơn của người khác → history rỗng: ẩn cả khối. ADR-0131: chỉ Toàn quyền nhận tên người làm; mọi vai khác nhận `staffName` rỗng
    // (lớp rút gọn) → bỏ cả đoạn " · tên" thay vì in dấu chấm trơ.
    // Task 8 Đợt E: `detail` (vd lý do hướng dẫn viên ghi khi sửa số khách/tiền — order_money_adjusted_by_field) đã có sẵn trong `history` từ
    // trước (audit/repository.ts:listByOrder chọn cả cột `detail`) nhưng trang này chưa từng dựng ra — hiện thêm ở ĐÂY, bên trong khối "Lịch sử"
    // đã có, không thêm chỗ hiện nào khác trên trang (thẻ đơn, phần xổ, khối tiền): ô quyền order.history.view đã quyết ai thấy KHỐI này, hiện
    // thêm `detail` của MỘT dòng đã được phép xem không mở rộng thêm ai xem được gì — không đụng permissions.ts.
    history.length
      ? h(
          "section",
          { class: "card" },
          h("h2", null, "Lịch sử"),
          h(
            "ul",
            { class: "history" },
            ...history.map((e) =>
              h(
                "li",
                null,
                h("span", { class: "muted" }, dateTime(e.at)),
                ` — ${actionLabel(e.action)}${e.staffName ? ` · ${e.staffName}` : ""}`,
                e.detail ? h("div", { class: "history-detail muted" }, e.detail) : null,
              ),
            ),
          ),
          // ADR-0114 D2: số khách từ lúc xác nhận qua từng lần sửa. Cùng điều kiện khối Lịch sử (máy chủ chỉ gửi khi có order.history.view); ẩn khi đơn chưa sửa lần nào.
          khoiLichSuSoKhach(dongLichSuHienThi(lichSuSoKhach, vnd)),
        )
      : null,
  );

  const phanDoiTac = document.getElementById("phan-doi-tac");
  if (phanDoiTac) void initPhanDoiTac(phanDoiTac, { orderId: order.id, coGhiTay: duocGhiTay(staff!, order), xemNguoiBan: coXemNguoiBan(staff!), giamGiaHieuLuc: order.giamGiaHieuLuc, daChupBu: () => void load().then(() => show(banner("info", "Đã chụp bù mức của ngày xác nhận."))) });

  const btns: HTMLElement[] = [];
  // Quyền sửa/xác nhận/huỷ do MÁY CHỦ quyết (`canModify`, kể cả người phụ trách — ADR-0009); câu này chỉ giải thích cho người không có quyền.
  // Hướng dẫn viên LÀ người phụ trách mà không sửa được (order.modify FIELD = none) → câu riêng, không nói "người phụ trách đơn … mới được sửa" (`khongQuyenSuaText`).
  if (a.noPermission && !order.deliveredAt) btns.push(h("p", { class: "muted" }, khongQuyenSuaText({ ownerName: order.staffName, status: order.status, viewer: staff!, suaSoKhach: nguonSoKhach !== null })));
  if (a.edit) btns.push(h("a", { class: "btn", href: `/order-form?id=${encodeURIComponent(order.id)}` }, "Sửa"));
  // Bản vẽ 7a / 7b: còn chặng phải đặt gấp → nút Xác nhận khoá + dòng nói vì sao (`tomTatChanXacNhan` — người có ô đặt gấp: "Đặt gấp xong thì xác nhận được."; Đối tác, Thực tập: "Cần văn phòng đặt gấp").
  // ADR-0136: «Gửi đơn» của Đối tác (nhánh A mở yêu cầu, không bị từ chối vì mốc) — chỉ khoá khi chưa có ngày; «Gửi xác nhận» cũng không bị mốc chặn (mốc chỉ chặn ở Còn vé).
  const chanXacNhan = a.confirm ? tomTatChanXacNhan(canDatGap, duocDatGap) : null;
  // YC-0016: đơn nháp chưa có ngày khởi hành — khoá nút và nói vì sao (máy chủ vẫn chặn).
  const chuaCoNgay = a.confirm || a.submit ? cauChuaCoNgay(order.services) : null;
  if (a.confirm) {
    const nut = change("Xác nhận đơn", "confirmed", "Xác nhận đơn này? Sau khi xác nhận, dịch vụ và đơn giá sẽ bị khoá; đổi số khách phải ghi lý do.", "btn btn-accent", canhBaoXN);
    nut.disabled = chanXacNhan !== null || chuaCoNgay !== null;
    btns.push(nut);
  }
  if (a.editTrip) btns.push(editTripButton(order));
  if (nguonSoKhach) btns.push(nutSuaSoKhach(order, nguonSoKhach));
  // ADR-0136 Task 3.5: bước xác nhận. `chanXacNhan` / `chuaCoNgay` khoá nút gửi như khoá «Xác nhận đơn» (cùng lý do; máy chủ vẫn chặn).
  const boiCanh: BoiCanhXacNhan = { orderId: order.id, staff: staff!, lamMoi: lamMoiSauBuoc, baoLoi: (err) => show(errorBanner(err)), xoaBao: () => show(null), moAnhXacNhan: openConfirmation };
  if (a.send) btns.push(nutGuiXacNhan(boiCanh, null)); // chưa có ngày vẫn gửi được: người kiểm vé chọn ngày ở bảng Còn vé
  if (a.submit) btns.push(nutGuiDon(boiCanh, chuaCoNgay));
  if (a.withdraw) btns.push(nutRutLai(boiCanh));
  if (a.decide && xacNhan?.yeuCau) btns.push(bangXacNhanDon(boiCanh, order, xacNhan.yeuCau));
  if (a.cancel) btns.push(nutHuyDon());
  for (const cau of canhBaoXN) btns.push(h("p", { class: "dd-canh-xn", "data-canh-bao": "xac-nhan" }, icon("alert", 16), cau));
  if (chuaCoNgay) btns.push(h("p", { class: "dg-lock", "data-chan": "chua-co-ngay" }, icon("lock", 16), chuaCoNgay));
  if (chanXacNhan) btns.push(duocDatGap ? h("p", { class: "dg-lock dg-lock-note", "data-chan": "xac-nhan" }, chanXacNhan) : h("p", { class: "dg-lock", "data-chan": "xac-nhan" }, icon("lock", 16), chanXacNhan));
  replaceChildren(actions, ...btns);
  // Nút riêng, ngoài `#actions` (bộ nút sửa/xác nhận/huỷ phụ thuộc trạng thái và quyền; nút này luôn có).
  const send = h("button", { type: "button", class: "btn btn-primary", "data-action": "send-confirmation" }, "Xem biên nhận");
  send.addEventListener("click", openConfirmation);
  // Đ11: đơn cần xác nhận (đang chờ, hoặc thuộc diện phải gửi) chỉ có ảnh XÁC NHẬN ĐƠN DỊCH VỤ sau khi đã xác nhận; người xét duyệt không mở được biên nhận của đơn chờ (máy chủ trả 404).
  replaceChildren(sendEl, anhXacNhanLuc() ? send : null);
}

const focusChangeBooker = (): void => document.querySelector<HTMLElement>('[data-action="change-booker"]')?.focus();

/** Đơn đã xác nhận: mở bảng "Đổi khách" (ADR-0011 điều 2 — cùng điều kiện hiện nút với "Sửa thông tin chuyến"). Đơn nháp đổi khách trong form. */
function bookerButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-booker" }, "Đổi khách");
  btn.addEventListener("click", () =>
    openBookerSheet(
      {
        order,
        coDatQuaDoiTac: coODatQuaDoiTac(staff!),
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã đổi khách."));
            focusChangeBooker();
          }),
        onReload: () => void load().then(focusChangeBooker),
      },
      btn,
    ),
  );
  return btn;
}

const focusSoKhach = (): void => document.querySelector<HTMLElement>('[data-action="sua-so-khach"]')?.focus();

/** Đơn đã xác nhận, chưa Đã giao: mở bảng "Sửa số khách dịch vụ" (web/sheet-so-khach.ts). Lưu xong tải lại đơn; giảm giá vượt tạm tính thì dải vàng kèm câu cảnh báo. */
function nutSuaSoKhach(order: Order, nguon: MoneyEditSource[]): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "sua-so-khach" }, "Sửa số khách dịch vụ");
  btn.addEventListener("click", () =>
    openSheetSoKhach(
      {
        orderId: order.id,
        tenDichVu: order.services.map((s) => s.name),
        nguon,
        onSaved: (r) =>
          void load().then(() => {
            // tải lại lỗi thì giữ banner lỗi, không đè (baoSauLenh)
            // Chữ và mức dải do `daiSauSuaSoKhach` ghép (src/shared/so-khach-hien-thi.ts, có bài): câu giảm giá vượt (ADR-0109) vàng, câu khuyến mại (ADR-0114 D1) ĐỎ đi đầu, cùng một nơi
            // ghép chữ với khối Thanh toán.
            const dai = daiSauSuaSoKhach(r);
            baoSauLenh(dai.xong, dai.xanh, [r.dongBoChuyen], dai.them, dai.tone);
            focusSoKhach();
          }),
        onReload: () => void load().then(focusSoKhach),
      },
      btn,
    ),
  );
  return btn;
}

const focusEditTrip = (): void => document.querySelector<HTMLElement>('[data-action="edit-trip"]')?.focus();

/** Đơn đã xác nhận: mở bảng sửa chuyến. Sau khi lưu/tải lại, nút bị dựng lại → trả focus về nút mới; lưu xong báo bằng banner thông tin (bảng vừa biến mất). */
function editTripButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "edit-trip" }, "Sửa thông tin chuyến");
  btn.addEventListener("click", () =>
    openTripSheet(
      {
        order,
        coDatGap: can(staff!, "order.leg.short_notice"),
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã lưu thông tin chuyến.")); // tải lại lỗi thì giữ banner lỗi, không đè
            focusEditTrip();
          }),
        onReload: () => void load().then(focusEditTrip),
      },
      btn,
    ),
  );
  return btn;
}

/**
 * "Huỷ đơn" (ADR-0089 đ8): bấm ra một hàng chọn lý do ngay dưới nút (khuôn `hangXacNhan`, không màn mới). Lý do bắt buộc; nhóm "Công ty huỷ" chỉ hiện khi
 * bảng quyền cho `order.cancel.classify` (cùng ô máy chủ hỏi — máy chủ vẫn kiểm lại). "Khác" bắt ghi rõ; máy chủ chặn số điện thoại.
 */
function nutHuyDon(): HTMLElement {
  const wrap = h("div", { class: "huy-don" });
  const mo = h("button", { type: "button", class: "btn btn-danger", "data-action": "cancel-order" }, "Huỷ đơn");
  mo.addEventListener("click", () => {
    let chon: string | null = null;
    const ghiChu = h("input", {
      type: "text", maxlength: GHI_CHU_HUY_TOI_DA, autocomplete: "off", placeholder: "Ghi rõ lý do (không nhập số điện thoại)", "aria-label": "Lý do khác", hidden: true,
    });
    const nut = h("button", { type: "submit", class: "btn btn-danger", disabled: true }, "Huỷ đơn");
    const giu = h("button", { type: "button", class: "btn" }, "Không huỷ");
    const capNhat = (): void => {
      nut.disabled = chon === null || (chon === "OTHER" && ghiChu.value.trim() === "");
    };
    const lua = luaChonLyDo({ coTheChonCongTy: can(staff!, "order.cancel.classify") }).map((l) => {
      const input = h("input", { type: "radio", name: "huy-ly-do", value: l.ma });
      input.addEventListener("change", () => {
        chon = l.ma;
        ghiChu.hidden = l.ma !== "OTHER";
        if (!ghiChu.hidden) ghiChu.focus();
        capNhat();
      });
      return h("label", { class: "pick" }, input, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, l.nhan, h("span", { class: "muted" }, ` · ${nhanNhomHuy(l.nhom)}`)));
    });
    ghiChu.addEventListener("input", capNhat);
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": "huy-don" },
      h("p", null, "Huỷ đơn này? Việc huỷ không hoàn tác được."),
      h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chọn lý do huỷ (bắt buộc)"), ...lua, ghiChu),
      h("div", { class: "handler-actions" }, nut, giu),
    ) as HTMLFormElement;
    giu.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (chon === null || (chon === "OTHER" && ghiChu.value.trim() === "")) return;
      nut.disabled = true;
      show(null);
      try {
        const r = await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(id!)}/status`, {
          method: "POST",
          body: chon === "OTHER" ? { status: "cancelled", lyDo: chon, ghiChu: ghiChu.value.trim() } : { status: "cancelled", lyDo: chon },
        });
        await load();
        baoSauLenh("Đã huỷ đơn.", null, [r.dongBoChuyen]); // ADR-0104 Đ2: chỉ hiện khi có câu nhắc (huỷ đơn vốn không có dải xanh)
      } catch (err) {
        show(errorBanner(err));
        capNhat();
      }
    });
    replaceChildren(wrap, form);
  });
  wrap.append(mo);
  return wrap;
}

/** `canhBao` (chỉ "Xác nhận đơn"): câu cảnh báo sớm — thêm vào câu hỏi trước khi xác nhận, và hiện lại sau khi xác nhận xong (không chặn). */
function change(label: string, to: "confirmed" | "cancelled", prompt: string, cls: string, canhBao: readonly string[] = []): HTMLButtonElement {
  const btn = h("button", { type: "button", class: cls }, label);
  btn.addEventListener("click", async () => {
    if (!confirm(canhBao.length ? `${prompt}\n\n${canhBao.join("\n")}` : prompt)) return;
    btn.disabled = true;
    show(null);
    try {
      await api(`/api/orders/${encodeURIComponent(id!)}/status`, { method: "POST", body: { status: to } });
      await load();
      if (canhBao.length && bannerEl.hidden) show(banner("warning", "Đã xác nhận đơn.", { lines: canhBao.map((text) => ({ text })) }));
    } catch (err) {
      show(errorBanner(err));
      btn.disabled = false;
    }
  });
  return btn;
}

let loadSeq = 0; // như web/orders.ts: bỏ phản hồi của lần tải cũ hơn lần đã áp (một lần làm mới im lặng chậm không được vẽ đè bản mới hơn)
/** `quiet` = làm mới theo tin của Bảng tin: lỗi mạng thì giữ nguyên màn hình đang hiện (không dựng banner đỏ đè lên đơn còn dùng được). */
async function load(quiet = false): Promise<void> {
  const seq = ++loadSeq;
  try {
    // Người phụ trách tải song song với đơn; lời gọi của nó không bao giờ ném lỗi (xem loadHandler) nên đơn luôn hiển thị được.
    const [{ order, history, canModify, mocToiThieuPhut, suaSoKhach: soKhach, canhBaoKhuyenMai: nhacKhuyenMai, canhBaoGiamGia: canhBaoHoaHong, lichSuSoKhach: lichSu, xacNhan: xn }, handler, tienDon, xe, nhapKtDon, khach] = await Promise.all([layDon!(), layNguoiPhuTrach(id!), layTien(id!), layXe(id!), layNhapKt(id!), layKhach(id!)]);
    if (seq !== loadSeq) return;
    mocPhut = mocToiThieuPhut;
    suaSoKhach = soKhach;
    canhBaoKhuyenMai = nhacKhuyenMai ?? null; // `??`: bản máy chủ cũ (trang mới, máy chủ chưa lên) không gửi khoá ⇒ không nhắc, không hỏng trang
    canhBaoGiamGia = canhBaoHoaHong ?? null;
    lichSuSoKhach = lichSu ?? null;
    tien = tienDon;
    xeDon = xe;
    nhapKt = nhapKtDon;
    khachDon = khach;
    xacNhan = xn ?? null;
    show(null);
    render(order, history, canModify, handler);
    if (thamSoGui.nhanh || thamSoGui.loi) {
      // Gửi đơn từ form mới: câu báo hiện TRƯỚC, rồi (nhánh B) hộp ảnh tự mở như hôm nay (Đ13.7). Gửi hỏng: đơn đã lưu nháp, nói rõ để không bấm lại tạo nháp trùng.
      if (thamSoGui.nhanh) show(banner("info", CAU_BAO_GUI_DON[thamSoGui.nhanh]));
      else {
        let loiMayChu = "";
        try { loiMayChu = sessionStorage.getItem(`gui-don-loi:${order.id}`) ?? ""; sessionStorage.removeItem(`gui-don-loi:${order.id}`); } catch { /* không có sessionStorage: câu chung */ }
        show(banner("danger", cauLoiGuiDon(loiMayChu)));
      }
      thamSoGui.nhanh = null;
      thamSoGui.loi = false;
    }
    if (baoDatGapLoi) {
      baoDatGapLoi = false;
      show(banner("warning", "Đơn đã lưu nhưng chưa duyệt đặt gấp được.", { lines: [{ text: "Bấm “Đặt gấp” ở lượt đưa đón bên dưới để duyệt lại." }] }));
    }
    if (autoOpenConfirmation) {
      autoOpenConfirmation = false;
      // Đ11: ảnh tự bật chỉ khi đơn đã xác nhận, hoặc đơn nháp KHÔNG phải qua bước xác nhận (anhXacNhanDuoc); đơn chờ / cần gửi thì không.
      if (anhXacNhanLuc()) openConfirmation();
    }
  } catch (err) {
    if (seq !== loadSeq) return; // lần tải mới hơn đã/đang lo màn hình (kể cả banner lỗi)
    if (quiet && current) return;
    // Có nút "Tải lại đơn": PWA standalone không có tải lại của trình duyệt, và `load()` tự nuốt lỗi nên các nút vừa bấm (Xác nhận/Huỷ) có thể đang khoá.
    show(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn.", { action: "reload_order" }));
  }
}

/** Đang mở bảng sửa (chuyến/khách/người phụ trách) hoặc hộp xác nhận (cùng khuôn `.sheet[role=dialog]`)? Khi đó không dựng lại trang dưới tay người dùng. */
const sheetOpen = (): boolean => document.querySelector('.sheet[role="dialog"]') !== null;

/** Làm mới theo tin (ADR-0022, TD-3): MỘT lần tải mỗi lúc (bộ gộp). Có bảng đang mở thì chỉ báo bằng dải "Tải lại" — không tự dựng lại, khỏi mất chữ đang gõ. */
const lamMoi = taoBoLamMoi(async () => {
  if (sheetOpen()) return show(banner("info", "Đơn vừa được cập nhật — Tải lại", { action: "reload_order" }));
  await load(true);
});

/** Tiền của đơn (billing). KHÔNG ném lỗi: 403 / lỗi mạng → null — khối tiền hiện "—", đơn vẫn hiển thị. */
const layTien = (orderId: string): Promise<Api.OrderPaymentsResponse | null> =>
  api<Api.OrderPaymentsResponse>(`/api/orders/${encodeURIComponent(orderId)}/payments`).catch(() => null);

/** Danh sách hành khách (ADR-0047 A2). KHÔNG ném lỗi: 403 / 404 / lỗi mạng → null — ẩn khối, không đoán "chưa có ai". */
const layKhach = (orderId: string): Promise<Api.PassengerListResponse | null> =>
  api<Api.PassengerListResponse>(`/api/orders/${encodeURIComponent(orderId)}/passengers`).catch(() => null);

/** Xe chở từng chặng (ADR-0059). Chỉ gọi khi đủ HAI ô (trip.view + order.view không ngữ cảnh); KHÔNG ném lỗi: 403 / lỗi mạng → null — không hiện khối. */
const layXe = (orderId: string): Promise<Api.XeCuaDonResponse | null> =>
  duocXemXeTrenDon(staff!) ? api<Api.XeCuaDonResponse>(`/api/van-chuyen/xe-cua-don/${encodeURIComponent(orderId)}`).catch(() => null) : Promise.resolve(null);

/** ADR-0060: chỉ hỏi khi ô xem dấu có ít nhất một phạm vi (tài khoản chỉ-Đối tác KHÔNG bao giờ gửi); máy chủ quyết theo đơn — 403/404 → ẩn khối. */
const layNhapKt = (orderId: string): Promise<Api.NhapKeToanResponse | null> =>
  can(staff!, "accounting.entry.view", { ownerId: staff!.id, assigned: true })
    ? api<Api.NhapKeToanResponse>(`/api/orders/${encodeURIComponent(orderId)}/nhap-ke-toan`).catch(() => null)
    : Promise.resolve(null);

// Gọi sớm (web/goi-som.ts): đơn gửi NGAY, song song với /api/auth/me của initShell(); chỉ dựng trang sau khi initShell() xong.
const layDon = id ? goiSom(() => api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(id)}`)) : null;
// Người phụ trách (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-2): GET /api/dispatch/handlers chỉ mở cho người XEM ĐƯỢC MỌI ĐƠN (cổng `order.view`
// không ngữ cảnh — đúng cờ `seesAll` của bản nhớ khung ADR-0035) → chỉ gọi SỚM khi bản nhớ khung nói vậy (tiền lệ web/order-form.ts). Quyết định thật đợi
// `initShell()`: hướng dẫn viên (chỉ xem đơn mình phụ trách) → người phụ trách = chính họ, tên từ phiên, KHÔNG gọi route đó (403 với họ — ruling Task 1.6).
const layNguoiPhuTrachSom = id && layKhungNho()?.seesAll === true ? goiSom(() => loadHandler(id)) : null;
// Người KHÔNG xem được mọi đơn (Đối tác, Thực tập — lỗi báo 30/9, L2): route 403 chắc chắn → không gọi, ẩn khối. Kiểm TRƯỚC lời gọi sớm: trên máy dùng chung
// bản nhớ khung có thể là của người trước (văn phòng) nên lời gọi sớm đã chạy — kết quả của nó bị bỏ.
function layNguoiPhuTrach(orderId: string): Promise<Handler> {
  const tuPhien = nguoiPhuTrachTuPhien(staff!);
  if (tuPhien) return Promise.resolve(tuPhien);
  if (!hoiDuocNguoiPhuTrach(staff!)) return Promise.resolve(HANDLER_HIDDEN);
  return layNguoiPhuTrachSom ? layNguoiPhuTrachSom() : loadHandler(orderId);
}
staff = await initShell();
if (!id) show(banner("danger", "Thiếu mã đơn."));
else {
  await load();
  // Đăng ký MỘT lần, sau lần tải đầu (tin đến trong lúc tải đầu thì lần tải đầu đã đọc dữ liệu mới nhất). Tin về đơn KHÁC thì bỏ qua; tin về đơn
  // do CHÍNH tab này vừa ghi (≤ 5 giây, sổ của web/api.ts) cũng bỏ qua — trang đã tự tải lại sau thao tác đó và tải lại lần nữa sẽ xoá dải "Đã lưu…".
  window.addEventListener("don-thay-doi", (ev) => {
    if (suKienVeDon((ev as CustomEvent<SuKienDon[]>).detail, id) && !vuaLamBoiTabNay(id)) void lamMoi.yeuCau();
  });
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
}
