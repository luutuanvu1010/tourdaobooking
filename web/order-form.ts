// Form lập/sửa đơn (A2, đặc tả §5.1–5.2): thẻ dịch vụ + thông tin chuyến, tóm tắt tiền, banner lỗi/xung đột.
// Trang chỉ NỐI: luật ở src/shared (service-form, trip-form, order-errors), DOM ở các khối web/ (service-card, catalog-picker, banner).
import { mayPickHandlerOnCreate } from "../src/shared/assignee-pick";
import type { SuKienDon } from "../src/shared/bang-tin";
import type { AssigneeDto, CatalogServiceDto } from "../src/shared/contracts";
import { canhBaoChangForm } from "../src/shared/dat-gap-hien-thi";
import { CHIP_DAT_GAP, theMoKhiNap } from "../src/shared/dong-gap-the";
import { CHIEU_LABEL, type LyDoDatGap } from "../src/shared/chang-dua-don";
import { cauDoiNgay, changTaoSan, doiNgayDi, giuDatGapNhap, type ChangNhap } from "../src/shared/chang-form";
import type { MauChang } from "../src/shared/chang-mac-dinh";
import { dongTuDto, loiDanhSachKhach, passengersNhap, type DongKhach } from "../src/shared/hanh-khach-form";
import { soKhachDoan } from "../src/shared/hanh-khach";
import { suaChuyenDuoc, suaKhachDuoc } from "../src/shared/order-view";
import { gopBenDat, khoiBenDatForm, nhanSdtKhach, nhanTenKhach, noiNapBenDat, type BenDatChon } from "../src/shared/phan-doi-tac-hien-thi";
import { NETWORK_BANNER, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { can, chiGiaDanhMuc, holdsPartner } from "../src/shared/permissions";
import {
  canAddService, draftFromDto, draftIssues, soKhachNhap, newCatalogDraft, newManualDraft, orderIssues, orderSummary, refreshFromCatalog, toServiceInput, totalLines,
  type ServiceDraft,
} from "../src/shared/service-form";
import { MAX_LINES_PER_ORDER, MAX_SERVICES } from "../src/shared/trip-rules";
import { coGiaTriChuyen } from "../src/shared/trip-form";
import { buocXong } from "../src/shared/buoc-tao-don";
import { vnToday } from "../src/shared/vn-date";
import { ApiError, api, vuaLamBoiTabNay, type Api, type OrderInput } from "./api";
import { openAssigneePicker } from "./assignee-picker";
import { renderBanner } from "./banner";
import { createBookerPicker } from "./booker-picker";
import { canhBaoDoiTac } from "./canh-bao-doi-tac";
import { createCatalogPicker } from "./catalog-picker";
import { dongBenDatChiDoc, oDatQuaDoiTac, type DatQuaDoiTac } from "./dat-qua-doi-tac";
import { byId, h, replaceChildren } from "./dom";
import { grouped, parseMoney, vnd } from "./format";
import { suKienVeDon } from "./lam-moi-logic";
import { regroupMoney } from "./money-input";
import { createServiceCard, type ServiceCard } from "./service-card";
import { khoiCanhBaoMoc, khoiNhanDatGap } from "./dat-gap-ui";
import { tieuDiemKhiCham, type DiemChon } from "./khoi-dua-don";
import { nhoChamKichHoat } from "./o-noi-goi-y";
import { taoKhoiHanhKhach, type KhoiHanhKhach } from "./khoi-hanh-khach";
import { moKhoiChua, moMoiKhoiGap, taoKhoiGap } from "./khoi-gap";
import { taoThanhBuoc } from "./thanh-buoc";
import { goiSom } from "./goi-som";
import { icon } from "./icons";
import { layKhungNho } from "./khung-nho";
import { benDatCuaToi, initShell, setBarTitle } from "./shell";

const params = new URLSearchParams(location.search);
const editId = params.get("id");
/** Tiền trả trước KHÔNG nhận ở form này (ẩn ba ô, không đọc số): đang SỬA đơn, hoặc người lập có quyền ghi sổ (ADR-0092 Đ6 — ô mã chỉ có ở trang đơn). Đặt SAU `initShell()` (cần biết tài khoản); đọc ở `recompute`, `validate` và bước hai của lúc lưu thay cho `editId`. */
let traTruocAn = Boolean(editId);
const focusId = params.get("focus");
const today = vnToday(new Date());
/**
 * ≥ 960px: form hai cột, khung lỗi lưu nằm ở cột phải dính, ngay trên nút Lưu. Dưới 960px (điện thoại VÀ iPad dọc 641–959px) form một cột; từ Việc 8 (thiết kế lại 18/10) khung lỗi
 * nằm TRONG thanh dính cuối trang, ngay trên nút Lưu — ở mọi khổ khung lỗi luôn thấy, nên lỗi cuộn tới Ô lỗi; chỉ khác ở chỗ điện thoại không tự đặt tiêu điểm vào ô thấy sẵn (bàn phím ảo
 * sẽ che thanh dính). Đọc LÚC CẦN: xoay iPad đổi khổ.
 */
const wide = (): boolean => window.matchMedia("(min-width: 960px)").matches;
/**
 * Cuộn ô / thẻ lỗi vào khung nhìn khi Lưu bị từ chối. ≥ 960px: giữa khung (như trước — nút Lưu ở cột dính, không bị đẩy). Dưới 960px: sát dưới phần dính đầu trang (`scroll-padding-top` /
 * `scroll-margin-top` của trang lo phần bị thanh bước che) — thanh dính cuối trang mang khung lỗi có thể cao gần nửa màn hình, cuộn "giữa khung" để ô lỗi nằm khuất dưới thanh đó.
 */
const cuonToiLoi = (el: HTMLElement): void => el.scrollIntoView({ block: wide() ? "center" : "start" });

const errorEl = byId("error"); // lỗi tải trang / khoá form
const saveErrorEl = byId("save-error"); // lỗi khi lưu, ngay trên nút Lưu (trong thanh dính cuối trang dưới 960px; cột phải dính ≥ 960px)
const formEl = byId<HTMLFormElement>("order-form");
const servicesEl = byId("services");
const emptyEl = byId("services-empty");
const limitEl = byId("services-limit");
const addManualBtn = byId<HTMLButtonElement>("add-manual"); // ADR-0061 (sửa ADR-0021 điều 2): ẨN, trừ khi máy chủ trả `duocDung` (công tắc BẬT + được nhập tay)
const orderDateEl = byId<HTMLInputElement>("orderDate");
const saveBtn = byId<HTMLButtonElement>("save");
const field = (id: string) => byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
const num = (id: string) => parseMoney(field(id).value);
// Hồ sơ khách (N2 lát 1): tra theo SĐT, dùng hồ sơ có sẵn hoặc tạo mới khi lưu; không chọn = lưu không gắn (ADR-0011).
// Lớp chặn nhầm (18/10): SĐT khách trùng số của đối tác đang được hưởng hoa hồng → khung nền cát dưới ô SĐT. "Đúng, qua …" làm đúng như chọn đối tác ở công tắc "Đơn của", rồi xoá hai ô khách (số đó là của đối tác, không phải của người đi tour).
const canhBao = canhBaoDoiTac({
  onDung: (d) => {
    const chon: BenDatChon = { partyId: d.partyId, ten: d.ten, loai: d.loai };
    datQua?.datChon(chon); // cập nhật công tắc (không gọi onDoi)
    datBenDat(chon);
    for (const id of ["customerName", "customerPhone"]) {
      field(id).value = "";
      field(id).dispatchEvent(new Event("input", { bubbles: true })); // dọn lỗi kiểm + danh sách hồ sơ trùng số
    }
    field("customerName").focus();
  },
});
const bookerPicker = createBookerPicker({
  name: field("customerName") as HTMLInputElement,
  phone: field("customerPhone") as HTMLInputElement,
  traDoiTac: async (ten) => (await api<Api.NguoiHuongTimResponse>(`/api/pricing/nguoi-huong?q=${encodeURIComponent(ten)}`)).ketQua,
  onDoiTacTrung: (d, soDt) => canhBao.hien(d, soDt),
  khachLe: () => daChonBenDat === null,
});
byId("booker-slot").append(bookerPicker.root);
byId("canh-bao-slot").append(canhBao.root);
// Bản "bốn bước" (14/10/2026; đặc tả docs/superpowers/specs/2026-10-14-tao-don-bon-buoc/README.md): Email + Ghi chú của khách gập sau "Thêm chi tiết" (tự mở khi có giá trị hoặc khi lỗi);
// thanh tiến độ dính trên đầu (bốn bước; vai không chọn được người phụ trách và lúc sửa đơn: ba bước).
const khachThem = byId("khach-them");
const gapKhach = taoKhoiGap({ ma: "khach", nhan: "Email, ghi chú", than: khachThem });
khachThem.before(gapKhach.nut);
const thanhBuoc = taoThanhBuoc({ phanTu: (ma) => document.querySelector<HTMLElement>(`[data-buoc-khoi="${ma}"]`) });
thanhBuoc.an("phu-trach", true); // bật lại khi biết người lập chọn được người phụ trách (`canPickHandler`)
byId("buoc-slot").replaceWith(thanhBuoc.root); // KHÔNG bọc thêm thẻ: thanh dính chỉ dính trong khung cha của nó (.form-main: dưới 960px là `display: contents` nên khung dính là cả biểu mẫu)

/**
 * Thông báo nổi của Bảng tin (`.toast-vung` của web/toast.ts) nằm NGAY DƯỚI thanh bước, không che nó (vòng sửa 1 của việc 8, M-3; đề bài "không thông báo nổi che thanh bước").
 * Thanh bước đứng ở chỗ khác nhau tuỳ lúc (đang dính sát thanh đầu trang; chưa cuộn thì bị dải nhắc `#strips` đẩy xuống) nên đo lúc chạy: `--toast-tren` = đáy thanh bước
 * (số đo của trình duyệt, không phải giá trị CSS viết cứng); khối Bảng tin của app.css đọc biến này cho trang có thanh bước. Đo lại khi cuộn, đổi khổ và khi có thông báo mới
 * (dải nhắc có thể vừa chèn sau lúc tải). Gọi SAU `initShell()` — vùng thông báo được tạo ở đó.
 */
function ganViTriThongBao(): void {
  const goc = document.documentElement;
  let cu = ""; // chỉ ghi lên gốc trang khi số đo đổi — cuộn trong lúc thanh bước đang dính không ghi lại mỗi khung hình (nợ T8(c), Việc 9)
  const doNgay = (): void => {
    const moi = `${Math.round(thanhBuoc.root.getBoundingClientRect().bottom)}px`;
    if (moi === cu) return;
    cu = moi;
    goc.style.setProperty("--toast-tren", moi);
  };
  let hen = 0;
  const doSau = (): void => {
    cancelAnimationFrame(hen);
    hen = requestAnimationFrame(doNgay);
  };
  addEventListener("scroll", doSau, { passive: true });
  addEventListener("resize", doSau);
  const vung = document.querySelector(".toast-vung");
  if (vung) new MutationObserver(doNgay).observe(vung, { childList: true }); // đo NGAY (trước khi vẽ) để thông báo mới không loé ở chỗ cũ một khung hình
  doNgay();
}

interface Entry {
  draft: ServiceDraft;
  card: ServiceCard;
  /** ADR-0049 V12: chỗ của nhãn đặt gấp / dải cảnh báo dưới mốc của TỪNG chặng, cuối thẻ dịch vụ (dưới "Thông tin chuyến"). */
  mocEl: HTMLElement;
  /** Dải cảnh báo đang hiện theo khoá chặng (giữ lại giữa các lần gõ để khung "Đặt gấp" đang mở không mất chữ). */
  canhBao: Map<string, { datCau(cau: string): void; root: HTMLElement }>;
  /** Chữ ký nội dung `mocEl` lần vẽ trước — chỉ dựng lại khi đổi (không cướp focus của khung "Đặt gấp"). */
  mocKy: string;
}
const entries: Entry[] = [];
let seq = 0;
let live = new Map<string, CatalogServiceDto>(); // dịch vụ danh mục ĐANG HIỆN và được hỗ trợ, theo mã
let orderUpdatedAt: string | null = null;
let formLocked = false;
let saving = false;

// ---- mốc 6 giờ + đặt gấp (ADR-0049 V12; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07; ruling R-P15) ----
// Mốc đọc từ GET /api/orders/moc-toi-thieu (đơn CHƯA lưu cũng cảnh báo được); chỉ để HIỆN — máy chủ quyết lúc lưu (canhBaoMoc) và lúc xác nhận (409).
// Người có ô order.leg.short_notice (Quản trị, Toàn quyền) có nút "Đặt gấp": "Duyệt đặt gấp" = LƯU NHÁP rồi gọi lệnh đặt gấp cho chặng chiều đi của dịch vụ đó.
let mocPhut: number | null = null;
let duocDatGap = false;
// ---- khối Đưa đón + Hành khách (ADR-0047 Phần B; bản vẽ docs/design/2026-10-01-dua-don-hanh-khach M1, M2, M6) ----
/** Điểm danh mục đang dùng (GET /api/locations, cổng staff) cho ô Nơi đón / Nơi trả. Lỗi → rỗng (vẫn gõ tự do được). */
let diem: DiemChon[] = [];
/** Mẫu chặng hiện hành theo mã dịch vụ (GET /api/van-chuyen/mau-chang — chỉ người lập đơn). Lỗi → không tạo sẵn chặng. */
let mauChang = new Map<string, MauChang>();
/** Văn phòng (ô `order.trip.edit`) sửa / gửi "Số người chiều về"; Đối tác, Thực tập chỉ xem (gửi khoá này sẽ bị 403). Đặt trước khi dựng thẻ. */
let suaSoVe = false;
const newKey = () => `k${++seq}`;
const mauCua = (d: ServiceDraft): MauChang | null => (d.kind === "catalog" ? (mauChang.get(d.code) ?? null) : null);
const hkCard = byId("hk-card");
const dateMovedEl = byId("orderDate-moved");
/** Khối hành khách; null = không dựng (không có ô order.passenger.write, hoặc sửa nháp mà không tải được danh sách — khi đó KHÔNG gửi khoá `passengers`). */
let hk: KhoiHanhKhach | null = null;
const wideQuery = window.matchMedia("(min-width: 960px)");

const drafts = () => entries.map((e) => e.draft);
const nameOf = (d: ServiceDraft, i: number) => d.name.trim() || `Dịch vụ ${i + 1}`;

// ---- một ngày cho cả đơn (ADR-0021) ----
// Ô "Chọn ngày" là ô ngày khởi hành DUY NHẤT của form; thẻ dịch vụ không còn ô ngày riêng. Dữ liệu vẫn lưu theo từng dịch vụ
// (không đổi API/bảng) nhưng mọi dịch vụ luôn mang cùng ngày này.
let orderDate = "";
const withOrderDate = <D extends ServiceDraft>(d: D): D => ({ ...d, trip: { ...d.trip, departDate: orderDate } });
orderDateEl.addEventListener("input", () => {
  const cu = orderDate;
  orderDate = orderDateEl.value;
  let soDoi = 0;
  for (const en of entries) {
    const r = doiNgayDi(en.draft.legs, cu, orderDate); // dời ngày đón mọi chặng cùng số ngày (Ruling R4e)
    soDoi += r.soDoi;
    en.draft = { ...withOrderDate(en.draft), legs: r.legs };
    en.card.update(en.draft);
  }
  dateMovedEl.textContent = soDoi > 0 ? cauDoiNgay(soDoi) : "";
  dateMovedEl.hidden = soDoi === 0;
  recompute();
});

// ---- ô chọn danh mục và danh sách thẻ ----
const picker = createCatalogPicker({
  onPick: (item) => {
    const tao = changTaoSan(mauChang.get(item.code) ?? null, orderDate, newKey); // M6: dịch vụ có mẫu Một / Hai chiều → tạo sẵn chặng (sửa / bỏ được)
    // Thiết kế lại 18/10 (mục 3C): thẻ vừa thêm MỞ (người lập phải điền), thẻ đang mở khác tự gập — trừ thẻ có lỗi chặn Lưu (`mustStayOpen`). Thẻ nằm dưới khung danh sách nên gập không xê dịch khung.
    chiMoMot(mount({ ...withOrderDate(newCatalogDraft(item, newKey())), legs: tao.legs, taoSan: tao.taoSan }, true));
    // Thiết kế lại 18/10 (đặc tả mục 3A): KHÔNG cuộn trang tới thẻ mới và KHÔNG thông báo nổi — khung danh sách đứng yên để thêm nhiều dịch vụ liền tay;
    // dòng vừa chạm hiện "✓ đã thêm" và vùng aria-live của ô chọn đọc "Đã thêm <tên>" (web/catalog-picker.ts). Thẻ mới nằm ngay dưới khung.
  },
});
byId("catalog-slot").append(picker.root);

// Tài khoản có quyền Đối tác (ADR-0027) hoặc Thực tập (ADR-0100) — `chiGiaDanhMuc`, MỘT định nghĩa với máy chủ: đơn giá = giá danh mục; giảm giá: Đối tác tạm chưa được (chủ dự án 26/9), Thực tập không được theo ADR-0100. Máy chủ là nơi chặn; form chỉ khoá ô cho khỏi gõ rồi bị từ chối.
let retailOnly = false;
// ADR-0061: người dùng được nhập tay (công tắc BẬT, có ô order.service.manual, không mang quyền Đối tác) — MÁY CHỦ quyết (`duocDung` của
// GET /api/cai-dat/nhap-tay), giao diện không tự tính luật. Đọc TRƯỚC khi dựng thẻ đã lưu (loadOrder); lỗi / 403 → false (ẩn nút, thẻ chỉ xem).
let duocNhapTay = false;

/**
 * `moThe` (thiết kế lại 18/10, mục 3C): thẻ MỞ lúc dựng — thẻ vừa thêm; thẻ của nháp nạp lại khi `theMoKhiNap` (có lỗi, hoặc giá trị mà dòng gập không cho thấy); thẻ `?focus=`.
 * `open` = mở sẵn khối "Thông tin chuyến" (vắng → tự mở khi đã có giá trị).
 */
function mount(d: ServiceDraft, moThe: boolean, open?: boolean): Entry {
  const entry = { draft: d, mocEl: h("div", { class: "dg-form-slot" }), canhBao: new Map(), mocKy: "" } as Omit<Entry, "card"> as Entry;
  entry.card = createServiceCard({
    draft: d,
    today,
    openTrip: open ?? coGiaTriChuyen(d.trip), // bản 1.39: thu gọn mặc định; bốn bước (14/10): TỰ MỞ khi đã có giá trị (nháp đã lưu, bản sửa) — không giấu giá trị đang có; `?focus=` của cảnh báo thiếu chuyến vẫn mở đúng thẻ
    canAddLine: () => totalLines(drafts()) < MAX_LINES_PER_ORDER,
    retailOnly,
    duocNhapTay,
    duaDon: { ngayDi: () => orderDate, mau: () => mauCua(entry.draft), diem: () => diem, suaSoVe, newKey },
    moThe,
    onMo: () => chiMoMot(entry, true),
    cuoiThe: entry.mocEl, // dải đặt gấp nằm TRONG phần gập của thẻ (gập thì thành chip "Cần đặt gấp" trên dòng gập)
    onChange: (next) => {
      entry.draft = next;
      recompute();
    },
    onRemove: () => {
      // Nợ T5 (Việc 9): bấm thùng rác bằng bàn phím / chuột (tiêu điểm đang ở trong thẻ) → tiêu điểm sang đầu thẻ kế (hoặc thẻ trước), hết thẻ thì sang câu "Chưa có dịch vụ";
      // không để rơi về <body>. Chạm cảm ứng không đặt tiêu điểm vào nút nên không đổi gì (không bật bàn phím ảo).
      const coTieuDiem = entry.card.root.contains(document.activeElement);
      const i = entries.indexOf(entry);
      const ke = entries[i + 1] ?? entries[i - 1];
      unmount(entry);
      if (!coTieuDiem) return;
      const dich = ke?.card.root.querySelector<HTMLElement>(".svc-mo") ?? emptyEl;
      if (dich === emptyEl) emptyEl.tabIndex = -1;
      dich.focus();
    },
    onRepick: () => {
      unmount(entry);
      picker.focus();
    },
  });
  entries.push(entry);
  servicesEl.append(entry.card.root);
  recompute();
  return entry;
}

/**
 * Nhãn đặt gấp (dấu còn giữ khi lưu lại) hoặc dải cảnh báo dưới mốc của TỪNG chặng của một thẻ (bản vẽ 07 ghép M1 hàng 1f); không có gì → trống.
 * Giờ đón nay ở chặng (ADR-0047 Phần B) — mỗi chặng có giờ xét mốc riêng; "Duyệt đặt gấp" = lưu nháp rồi đặt gấp ĐÚNG chặng đó.
 */
function capNhatMoc(entry: Entry): void {
  const d = entry.draft;
  const khoi: { ky: string; el: () => HTMLElement }[] = [];
  const conKhoa = new Set<string>();
  d.legs.forEach((l, i) => {
    const dau = () => h("div", { class: "dg-chang-dau" }, h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]), h("span", { class: "dd-chang-so" }, `Chặng ${i + 1}`));
    if (giuDatGapNhap(l) && l.goc?.datGap) {
      const dg = l.goc.datGap;
      khoi.push({ ky: `${l.key}:giu:${i}`, el: () => h("div", { class: "dg-leg", "data-leg-key": l.key }, dau(), khoiNhanDatGap(dg)) });
      return;
    }
    const cau = canhBaoChangForm({ ngayDon: l.pickupDate || orderDate, gioDon: l.pickupTime, datGap: false }, mocPhut, Date.now());
    if (!cau) return;
    conKhoa.add(l.key);
    let w = entry.canhBao.get(l.key);
    if (w) w.datCau(cau);
    else {
      w = khoiCanhBaoMoc({ cau, duocDatGap, onDuyet: (than) => luu({ entry, legKey: l.key, than }), nutDuyetPhu: true }); // thang nút ba cấp: nút chính duy nhất của form là Lưu
      entry.canhBao.set(l.key, w);
    }
    const widget = w;
    khoi.push({ ky: `${l.key}:moc:${i}`, el: () => h("div", { class: "dg-leg", "data-leg-key": l.key }, dau(), widget.root) });
  });
  for (const k of [...entry.canhBao.keys()]) if (!conKhoa.has(k)) entry.canhBao.delete(k);
  entry.card.datChipNgoai(conKhoa.size > 0 ? [CHIP_DAT_GAP] : []); // thẻ gập: dải cảnh báo dưới mốc bị ẩn cùng thân thẻ → hiện chip "Cần đặt gấp" trên dòng gập
  const ky = khoi.map((x) => x.ky).join("|");
  if (ky === entry.mocKy) return;
  entry.mocKy = ky;
  replaceChildren(entry.mocEl, ...khoi.map((x) => x.el()));
}

function unmount(entry: Entry): void {
  entries.splice(entries.indexOf(entry), 1);
  entry.card.root.remove();
  recompute();
}

/**
 * Chỉ một thẻ mở (thiết kế lại 18/10, mục 3C): gập mọi thẻ khác `giu` — thẻ có lỗi chặn Lưu đang hiện tự từ chối gập (`setOpen(false)` bỏ qua khi `mustStayOpen`).
 * `giuViTri` (người dùng vừa chạm mở `giu`): thẻ phía trên gập lại làm `giu` trôi lên — cuộn bù để đầu thẻ vừa chạm đứng yên dưới ngón tay (Safari iPhone không tự neo cuộn).
 */
function chiMoMot(giu: Entry, giuViTri = false): void {
  const truoc = giuViTri ? giu.card.root.getBoundingClientRect().top : 0;
  for (const e of entries) if (e !== giu) e.card.setOpen(false);
  if (!giuViTri) return;
  const lech = giu.card.root.getBoundingClientRect().top - truoc;
  if (lech !== 0) window.scrollBy(0, lech);
}

addManualBtn.addEventListener("click", () => {
  const entry = mount(withOrderDate(newManualDraft(newKey())), true);
  chiMoMot(entry);
  entry.card.root.scrollIntoView({ block: "nearest" });
});

// ---- người phụ trách chọn ngay lúc lập đơn (Task 1.8 phần b ADR-0030; bản thiết kế "Nguoi phu trach - Form lap don", phương án 1b) ----
// Khối nằm CUỐI form, ngay trước vùng nút Lưu (cột phải ≥ 960px, sau "Tóm tắt" ở khổ một cột). Chỉ dựng khi LẬP đơn mới và người lập có `dispatch.assign`
// trên đơn của mình (`mayPickHandlerOnCreate` — đúng câu máy chủ hỏi); sửa đơn thì đổi người ở trang đơn (`web/handler-sheet.ts`). Chọn chỉ lưu vào biến
// dưới đây; máy chủ nhận khi bấm Lưu (`handlerStaffId` trong thân POST — `collect`). Mọi nút trong khối là `type="button"` (khối nằm trong <form>).
const ownerEl = byId("owner-card");
let canPickHandler = false;
let handlerPick: AssigneeDto | null = null;
/** Banner lưu đang hiện là lỗi `invalid_assignee`: đổi/bỏ lựa chọn thì gỡ banner đó (lời báo về người cũ không còn đúng). */
let assigneeErrorShown = false;

function setHandlerPick(picked: AssigneeDto | null): void {
  handlerPick = picked;
  capNhatBuoc();
  if (assigneeErrorShown) {
    assigneeErrorShown = false;
    renderBanner(saveErrorEl, null);
  }
  renderOwner(true); // nút mở bảng bị dựng lại → đặt focus vào nút mới ("Đổi" / "Chọn người phụ trách"), không để focus rơi ra `body`
}

function renderOwner(focus = false): void {
  const p = handlerPick;
  const head = h(
    "div",
    { class: "owner-head" },
    h("h2", { id: "owner-title", class: "owner-title" }, "Người phụ trách"),
    p === null ? h("span", { class: "chip hdv-chip chip-warn" }, "Chờ nhận") : null,
  );
  let opener: HTMLButtonElement;
  if (p === null) {
    opener = h("button", { type: "button", class: "owner-pick", "data-action": "pick-handler" }, h("span", null, "Chọn người phụ trách"), icon("next", 18));
    replaceChildren(ownerEl, head, h("div", { class: "owner-body" }, h("p", { class: "owner-text" }, "Chưa chọn ai — hướng dẫn viên nào cũng bấm Nhận được."), opener));
  } else {
    opener = h(
      "button",
      { type: "button", class: "owner-current", "data-action": "pick-handler", "aria-label": `Đổi người phụ trách, đang chọn ${p.name}` },
      h("span", { class: "owner-current-text" }, h("span", { class: "owner-name" }, `HDV: ${p.name}`), h("span", { class: "owner-role" }, p.roleLabel)),
      h("span", { class: "owner-change" }, "Đổi"),
    );
    const clear = h("button", { type: "button", class: "owner-clear", "data-action": "clear-handler" }, "Bỏ chọn — để Chờ nhận");
    clear.addEventListener("click", () => setHandlerPick(null));
    replaceChildren(ownerEl, head, h("div", { class: "owner-body" }, opener, clear));
  }
  opener.addEventListener("click", () => openAssigneePicker({ current: handlerPick, onPick: setHandlerPick }, opener));
  if (focus) opener.focus();
}

// ---- thanh tiến độ: bước nào đã đủ thông tin (luật ở src/shared/buoc-tao-don.ts) ----
function capNhatBuoc(): void {
  const ds = drafts();
  thanhBuoc.datXong(
    buocXong({
      coNgayDi: orderDate !== "", ten: field("customerName").value, sdt: field("customerPhone").value,
      soDichVu: ds.length, coLoiDichVu: ds.some((d) => draftIssues(d).length > 0),
      coLoiTien: loiTienForm().cau.length > 0, daChonNguoi: handlerPick !== null,
    }),
  );
}
for (const id of ["customerName", "customerPhone"]) {
  field(id).addEventListener("input", () => {
    datLoiO(id, null); // đang sửa ô thì gỡ câu lỗi dưới ô
    capNhatBuoc();
  });
}

// ---- thanh dính cuối trang: dòng tổng mở / đóng bảng chi tiết tiền (Việc 8, thiết kế lại 18/10; dưới 960px thay khối Tóm tắt) ----
const nutChiTiet = byId<HTMLButtonElement>("sum-mo"); // type="button": nằm trong <form>, không được gửi đơn
const bangChiTiet = byId("sum-chi-tiet");
function datMoChiTiet(mo: boolean): void {
  bangChiTiet.hidden = !mo;
  nutChiTiet.setAttribute("aria-expanded", String(mo));
  byId("sum-mo-chu").textContent = mo ? "Thu gọn" : "Chi tiết";
  byId("sum-mo-dau").textContent = mo ? "▾" : "▴";
}
nutChiTiet.addEventListener("click", () => datMoChiTiet(nutChiTiet.getAttribute("aria-expanded") !== "true"));
for (const el of [nutChiTiet, bangChiTiet]) {
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || bangChiTiet.hidden) return;
    datMoChiTiet(false);
    nutChiTiet.focus();
  });
}
/** Lưu bị từ chối dưới 960px: gập bảng chi tiết tiền TRƯỚC khi cuộn tới ô lỗi — bảng mở cộng khung lỗi làm thanh dính cao gần 500px, che ô lỗi ở màn nhỏ 375×667 (vòng sửa 1, I-2). */
function gapChiTietKhiLoi(): void {
  if (!wide() && !bangChiTiet.hidden) datMoChiTiet(false);
}

/**
 * Việc 8: "Hình thức", "Người nhận tiền" và câu ghi sổ chỉ hiện khi đã nhập số trả trước (lúc lưu chỉ đọc hai ô này khi số > 0 — thân gửi không đổi).
 * `traTruocAn` (đang sửa đơn / người có quyền ghi sổ): ba ô đã ẩn hẳn và câu giải thích riêng luôn hiện — không đụng ở đây.
 */
function capNhatOTraTruoc(): void {
  if (traTruocAn) return;
  const co = num("prepaidAmount") > 0;
  for (const id of ["prepaid-method-field", "prepaid-collector-field", "prepaid-hint"]) byId(id).hidden = !co;
}

// ---- tóm tắt tiền và trạng thái nút ----
function recompute(): void {
  const ds = drafts();
  const s = orderSummary(ds, num("discount"), traTruocAn ? 0 : num("prepaidAmount"));
  // MỘT lần tính (`orderSummary`), cùng chuỗi `vnd()` cho Tóm tắt (≥ 960px) và thanh dính cuối trang + bảng chi tiết (dưới 960px) — không tính tiền ở chỗ thứ hai; máy chủ tính lại khi lưu.
  const tamTinh = vnd(s.subtotal);
  const giamGia = vnd(s.discount);
  const tong = vnd(s.total);
  // Sổ tiền lượt 1 (ADR-0026 đ9): KHÔNG tự trừ ra "còn lại" ở trình duyệt — chỉ nhắc lại số trả trước sẽ ghi thành lần thu sau khi lưu.
  const traTruoc = vnd(s.traTruoc);
  const khongTraTruoc = s.traTruoc === 0;
  byId("sum-subtotal").textContent = tamTinh;
  byId("sum-discount").textContent = giamGia;
  byId("sum-total").textContent = tong;
  byId("sum-prepaid").textContent = traTruoc;
  byId("sum-prepaid-row").hidden = khongTraTruoc;
  byId("mobile-total").textContent = tong;
  byId("mobile-prepaid").textContent = traTruoc;
  byId("mobile-prepaid-row").hidden = khongTraTruoc;
  byId("ct-tam-tinh").textContent = tamTinh;
  byId("ct-giam-gia").textContent = giamGia;
  byId("ct-tong").textContent = tong;
  byId("ct-tra-truoc").textContent = traTruoc;
  byId("ct-tra-truoc-dong").hidden = khongTraTruoc;
  capNhatOTraTruoc();
  // Bản 1.39: đếm dịch vụ ở tiêu đề khối, Tóm tắt và thanh dính đáy (một dòng "N dịch vụ · Tổng …"; sổ tiền lượt 1: "Trả trước" chỉ khi có số trả trước —
  // không tự trừ "còn lại" ở trình duyệt, ADR-0026 đ9).
  const n = entries.length;
  byId("services-title").textContent = n > 0 ? `Dịch vụ (${n})` : "Dịch vụ";
  byId("sum-count").textContent = `${n} dịch vụ`;
  byId("mobile-count").textContent = `${n} dịch vụ`;
  picker.setSelected(ds.flatMap((d) => (d.kind === "catalog" ? [d.code] : [])));
  const warn = byId("sum-warning");
  warn.textContent = s.warning ?? "";
  warn.hidden = !s.warning;
  emptyEl.hidden = entries.length > 0;
  const full = !canAddService(ds);
  addManualBtn.disabled = full || formLocked;
  picker.setDisabled(formLocked ? "Đơn này đang khoá." : full ? `Đơn đã đủ ${MAX_SERVICES} dịch vụ.` : null);
  limitEl.hidden = !full;
  limitEl.textContent = full ? `Đơn đã đủ ${MAX_SERVICES} dịch vụ — không thêm được nữa.` : "";
  for (const e of entries) e.card.refreshLimits(); // trần 50 dòng tính trên CẢ ĐƠN: nút "+ Thêm dòng" của mọi thẻ nhập tay bật/khoá đúng ngay
  for (const e of entries) capNhatMoc(e);
  hk?.refresh(); // mẫu số "N/M khách đã có tên" theo số khách dịch vụ
  capNhatBuoc();
  const tooMany = ds.some((d) => draftIssues(d).some((i) => i.code === "too_many_guests")); // vượt 50 khách khoá nút Lưu (đặc tả 5.1)
  saveBtn.disabled = formLocked || saving || tooMany;
  saveBtn.textContent = saving ? "Đang lưu…" : editId ? "Lưu thay đổi" : "Lưu, chờ xác nhận";
}

for (const id of ["discount", "prepaidAmount"]) {
  const el = field(id) as HTMLInputElement;
  el.addEventListener("input", () => {
    regroupMoney(el); // gõ tự nhóm hàng nghìn, giữ con trỏ
    recompute();
  });
}

// ---- kiểm phía trình duyệt (máy chủ vẫn là nơi quyết định) ----
/** Câu lỗi ngay dưới ô tên / SĐT khách (kèm `aria-invalid`); `null` = gỡ. */
function datLoiO(id: string, cau: string | null): void {
  const el = document.getElementById(`${id}-loi`);
  if (!el) return;
  replaceChildren(el, ...(cau ? [icon("alert", 16), cau] : []));
  el.hidden = !cau;
  field(id).setAttribute("aria-invalid", cau ? "true" : "false");
}

/** Câu lỗi tiền của biểu mẫu (giảm giá quá tạm tính / trả trước quá tổng): MỘT nơi, dùng cho cả khung "Chưa lưu được" (`validate`) lẫn dấu ✓ của bước Thanh toán (`capNhatBuoc`) — không so sánh tiền ở chỗ thứ hai. Máy chủ vẫn chặn lại ở rules.ts. */
function loiTienForm(): { cau: string[]; oTraTruoc: boolean } {
  const lines: string[] = [];
  let oTraTruoc = false;
  const s = orderSummary(drafts(), num("discount"), traTruocAn ? 0 : num("prepaidAmount"));
  if (s.discount > s.subtotal) lines.push("Giảm giá không được vượt quá tạm tính.");
  else if (s.traTruoc > s.total) {
    lines.push("Thanh toán trước không được vượt quá tổng cộng.");
    oTraTruoc = true;
  }
  return { cau: lines, oTraTruoc };
}

/** `cacO` = mọi ô / khối có lỗi: nơi gọi mở khối gập chứa chúng (`moKhoiChua`) — lỗi không bao giờ nằm trong khối đóng. */
function validate(): { banner: Banner; focus: HTMLElement; cacO: HTMLElement[] } | null {
  const lines: string[] = [];
  const focusables: HTMLElement[] = [];
  const need = (id: string, message: string) => {
    const thieu = !field(id).value.trim();
    datLoiO(id, thieu ? message : null);
    if (thieu) {
      lines.push(message);
      focusables.push(field(id));
    }
  };
  // Cùng thứ tự với form: khách hàng, dịch vụ, thanh toán (chủ duyệt 30/9 — YC-0001/0002; bản bốn bước 14/10 đưa khách lên đầu form nên câu lỗi khách cũng lên đầu).
  need("customerName", "Nhập tên khách.");
  need("customerPhone", "Nhập số điện thoại khách.");
  if (entries.length === 0) lines.push("Thêm ít nhất một dịch vụ.");
  entries.forEach((e, i) => {
    for (const issue of draftIssues(e.draft)) {
      lines.push(`${nameOf(e.draft, i)}: ${issue.message}`);
      focusables.push(e.card.root);
    }
  });
  lines.push(...orderIssues(drafts()));
  if (hk) {
    const loiKhach = loiDanhSachKhach(hk.rows(), today);
    lines.push(...loiKhach);
    if (loiKhach.length) focusables.push(hkCard);
  }
  if (new Set(entries.map((e) => e.draft.trip.departDate)).size > 1) {
    lines.push("Các dịch vụ đang khác ngày — chọn một ngày cho cả đơn.");
    focusables.push(orderDateEl);
  }
  const tien = loiTienForm();
  lines.push(...tien.cau);
  if (tien.oTraTruoc) focusables.push(field("prepaidAmount"));
  if (lines.length === 0) return null;
  return { banner: banner("danger", "Chưa lưu được — kiểm tra lại:", { lines: lines.map((text) => ({ text })) }), focus: focusables[0] ?? saveErrorEl, cacO: focusables };
}

function collect(): OrderInput {
  return {
    customerName: field("customerName").value,
    customerPhone: field("customerPhone").value,
    customerEmail: field("customerEmail").value,
    customerNote: field("customerNote").value,
    services: entries.map((e) => toServiceInput(e.draft, suaSoVe)),
    // ADR-0047 R1: khoá `passengers` CHỈ khi khối hành khách đang dựng (có ô + đã tải được danh sách) — vắng = máy chủ giữ danh sách đang lưu.
    ...(hk ? { passengers: passengersNhap(hk.rows()) } : {}),
    discount: num("discount"),
    paymentNote: field("paymentNote").value,
    // Bên đặt (sổ đại lý đợt 1, Task 11): dòng chỉ đọc của Đối tác hoặc đại lý đã chọn ở ô "Đặt qua đối tác" thắng ô tra SĐT; không thì như hôm nay.
    ...gopBenDat({ chiDoc: khoiBenDat.kieu === "chi-doc" ? khoiBenDat.benDat : null, daChon: daChonBenDat, tra: bookerPicker.payload() }),
    ...(orderUpdatedAt ? { expectedUpdatedAt: orderUpdatedAt } : {}),
    // Chỉ khi LẬP đơn và đã chọn người: chưa chọn → KHÔNG gửi trường này (đơn "Chờ nhận"), sửa đơn → không bao giờ gửi (PUT không đổi người phụ trách).
    ...(canPickHandler && !editId && handlerPick ? { handlerStaffId: handlerPick.staffId } : {}),
  };
}

// ---- khoá form, banner lỗi ----
function lockForm(b: Banner): void {
  formLocked = true;
  formEl.toggleAttribute("inert", true);
  renderBanner(errorEl, b);
  recompute();
}

function setSaving(value: boolean): void {
  saving = value;
  formEl.toggleAttribute("inert", value); // đang lưu: các ô nhập khoá (đặc tả 10)
  recompute();
}

async function refreshCatalogAfterConflict(): Promise<void> {
  try {
    const res = await api<Api.CatalogPublicResponse>("/api/catalog/for-order"); // ADR-0033: route cho người lập đơn (cả Đối tác, Thực tập)
    setCatalog(res);
    for (const en of entries) {
      const d = en.draft;
      if (d.kind !== "catalog") continue;
      const item = live.get(d.code);
      if (!item) continue;
      const next = refreshFromCatalog(d, item); // giá mới cho thẻ đang theo danh mục hiện tại; GIỮ đơn giá đã thương lượng
      if (next !== d) {
        en.draft = next;
        en.card.update(next);
      }
    }
    recompute();
  } catch {
    /* banner "giá danh mục vừa đổi" vẫn hiện; lần Lưu tiếp theo sẽ báo lỗi rõ hơn */
  }
}

async function onSaveError(err: unknown): Promise<void> {
  const failure =
    err instanceof ApiError
      ? classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: entries.map((e, i) => nameOf(e.draft, i)), formatMoney: vnd })
      : NETWORK_BANNER;
  if (failure.refreshCatalog) await refreshCatalogAfterConflict();
  if (failure.action === "lock_form") lockForm(failure);
  renderBanner(saveErrorEl, failure, { reloadOrder: () => void loadOrder(), reloadPage: () => location.reload() });
  gapChiTietKhiLoi();
  // 400 `invalid_assignee`: người được chọn vừa nghỉ/mất quyền giữa lúc điền form — máy chủ KHÔNG tạo đơn; form giữ nguyên (kể cả lựa chọn, để người dùng
  // thấy mình đã chọn ai) và banner nói cách sửa. Đổi/bỏ lựa chọn thì banner này tự gỡ (`setHandlerPick`).
  assigneeErrorShown = err instanceof ApiError && err.code === "invalid_assignee";
  // Máy chủ từ chối (400) mà không chỉ ra ô nào: mở mọi khối gập của dịch vụ bị nêu (hoặc của cả form + khách) — khối còn đóng thì bên trong chỉ toàn giá trị mặc định, nên mở thêm không giấu gì,
  // và một ô lỗi không bao giờ nằm trong khối đóng. Cuộn vẫn tới banner (nêu rõ dịch vụ / lý do) như trước.
  if (err instanceof ApiError && err.status === 400) {
    const the = failure.focusService === null ? undefined : entries[failure.focusService]?.card.root;
    if (the) moMoiKhoiGap(the);
    else {
      moMoiKhoiGap(formEl);
    }
  }
  if (failure.focusService !== null) entries[failure.focusService]?.card.setOpen(true); // thẻ gập (18/10) được câu lỗi nêu tên: mở ra cho thấy (không gập thẻ khác)
  const target = failure.focusService === null ? undefined : entries[failure.focusService]?.card.root;
  // Khung lỗi (nêu rõ dịch vụ / giá / mất mạng) ngay trên nút Lưu, luôn thấy ở mọi khổ (Việc 8: dưới 960px nằm trong thanh dính) → cuộn tới thẻ được nêu tên; không có thẻ thì
  // ≥ 960px vẫn cuộn tới khung như trước, dưới 960px đứng yên (trang không nhảy xuống cuối).
  if (target) cuonToiLoi(target);
  else if (wide()) saveErrorEl.scrollIntoView({ block: "center" });
}

// Ô tìm danh mục nằm TRONG form: Enter (hoặc phím "Tìm" của bàn phím iPhone) sẽ gửi ngầm cả đơn qua nút "Lưu" mặc định. Chỉ chặn ở ô tìm; các ô văn bản khác giữ hành vi form thường.
formEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type === "search") e.preventDefault();
});

// Dấu ✓ của thanh tiến độ theo kịp mọi cách đổi ô (chọn hồ sơ khách, đổi nhóm…): tính lại sau mỗi lần đổi / bấm — chỉ cộng vài phép so sánh.
for (const ten of ["change", "click"]) formEl.addEventListener(ten, () => queueMicrotask(capNhatBuoc));

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  void luu();
});
// Lưu bằng CẢM ỨNG (vòng sửa 1 của việc 7, M-1): nhớ kiểu ấn từ `pointerdown` của chính nút Lưu (Safari: `click` / `submit` không mang `pointerType`); `luu()` đọc rồi xoá. Cú chạm bị
// huỷ / kéo ra ngoài / bấm phím sau đó thì không còn là "lưu bằng chạm" (vòng sửa 2, Minor c).
const laLuuBangCham = nhoChamKichHoat(saveBtn);

/**
 * Lưu đơn nháp. `datGap` (ADR-0049 R-P15 — nút "Duyệt đặt gấp" của Quản trị trên thẻ): lưu xong gọi lệnh đặt gấp cho chặng chiều đi của đúng dịch vụ đó (thứ tự
 * dịch vụ trong phản hồi = thứ tự thẻ). Lệnh đặt gấp hỏng thì đơn VẪN đã lưu → vẫn chuyển sang trang đơn, kèm `datgap=loi` để trang đơn báo và cho duyệt lại.
 */
async function luu(datGap?: { entry: Entry; legKey: string; than: { lyDo: LyDoDatGap; ghiChu: string | null } }): Promise<void> {
  const cham = laLuuBangCham() && !datGap;
  if (formLocked || saving) return;
  renderBanner(saveErrorEl, null);
  assigneeErrorShown = false;
  const loiChangCuaThe = entries.map((en) => en.card.showIssues(true)); // mở chặng gọn / khối chi tiết chứa ô lỗi; nhớ ô lỗi đầu tiên của từng thẻ + ô đó có đang nằm trong khối đóng không
  hk?.showIssues(true);
  const invalid = validate();
  if (invalid) {
    renderBanner(saveErrorEl, invalid.banner);
    gapChiTietKhiLoi();
    // Ô lỗi đầu tiên: ô khách thì chính nó; lỗi chặng của một thẻ dịch vụ thì ô lỗi trong chặng (đã đo "đang nằm trong khối đóng" TRƯỚC khi mở); lỗi khác của thẻ thì cả thẻ.
    const loiChang = loiChangCuaThe[entries.findIndex((en) => en.card.root === invalid.focus)] ?? null;
    const dich = loiChang?.o ?? invalid.focus;
    const dangAn = loiChang?.daAn ?? (dich !== saveErrorEl && dich.getClientRects().length === 0);
    for (const o of invalid.cacO) moKhoiChua(o);
    moKhoiChua(dich);
    // Khung lỗi (liệt kê đủ lỗi) nằm ngay trên nút Lưu và luôn thấy: ≥ 960px ở cột phải dính, dưới 960px trong thanh dính cuối trang (Việc 8) → cuộn tới ô / thẻ lỗi đầu tiên.
    // Dưới 960px không cuộn khi không có ô nào để chỉ (vd "Thêm ít nhất một dịch vụ."): `scrollIntoView` của phần tử trong thanh dính kéo trang xuống cuối.
    if (wide() || dich !== saveErrorEl) cuonToiLoi(dich);
    // Tiêu điểm: ≥ 960px luôn; điện thoại CHỈ khi ô nằm trong khối gập vừa được mở (người lập phải thấy ô đỏ vừa hiện ra) — ô thấy sẵn thì không, kẻo bàn phím ảo bật lên che thanh dính.
    // Lưu bằng cảm ứng mà ô lỗi là ô nơi đón / nơi trả (ô gõ chữ — bàn phím ảo iPhone sẽ bật): tiêu điểm vào đầu chặng; ô lỗi vẫn đã được cuộn vào khung nhìn (vòng sửa 1, M-1).
    if (wide() || dangAn) (cham ? tieuDiemKhiCham(dich) : dich).focus({ preventScroll: true });
    return;
  }
  setSaving(true);
  try {
    const { order } = editId
      ? await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(editId)}`, { method: "PUT", body: collect() })
      : await api<Api.OrderResponse>("/api/orders", { method: "POST", body: collect() });
    let datGapLoi = "";
    if (datGap) {
      const chang = changDaLuu(order.services[entries.indexOf(datGap.entry)]?.legs ?? [], datGap.entry.draft.legs, datGap.legKey);
      try {
        if (!chang) throw new Error("không thấy chặng");
        await api(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(chang.id)}/short-notice`, { method: "POST", body: datGap.than });
      } catch {
        datGapLoi = "&datgap=loi";
      }
    }
    // BƯỚC HAI (sổ tiền lượt 1 — ADR-0026 đ9, NT-S6): tiền trả trước KHÔNG nằm trong lô tạo đơn; đơn đã lưu xong mới ghi LẦN THU qua billing. Lỗi ở bước này
    // KHÔNG làm mất đơn: vẫn sang trang đơn, kèm `thutruoc=loi` để trang đơn báo "Đơn đã lưu, chưa ghi được tiền trả trước — thử lại".
    let thuTruocLoi = "";
    const traTruoc = traTruocAn ? 0 : num("prepaidAmount");
    if (traTruoc > 0) {
      try {
        await api(`/api/orders/${encodeURIComponent(order.id)}/payments`, {
          method: "POST",
          body: { soTien: traTruoc, hinhThuc: field("prepaidMethod").value as Api.LanThuInput["hinhThuc"], nguoiThu: field("prepaidCollector").value === "toi" ? "toi" : "cong_ty" } satisfies Api.LanThuInput,
        });
      } catch {
        thuTruocLoi = "&thutruoc=loi";
      }
    }
    // THAY mục lịch sử của form (không thêm): Back/bfcache không đưa người dùng về form đã lưu, nơi bấm Lưu lần hai sẽ POST /api/orders lần hai (đơn trùng).
    // Đơn MỚI kèm `moi=1`: trang đơn tự mở hộp thoại "Xác nhận đơn để gửi khách" (ảnh PNG) một lần rồi bỏ tham số; đơn SỬA thì không.
    location.replace(`/order?id=${encodeURIComponent(order.id)}${editId ? "" : "&moi=1"}${datGapLoi}${thuTruocLoi}`);
  } catch (err) {
    setSaving(false);
    await onSaveError(err);
  }
}

/**
 * Chặng ĐÃ LƯU ứng với chặng `legKey` của thẻ (sau lưu nháp, chặng mới mới có id): cùng id nếu chặng đã có id; chặng mới → chặng đã lưu chưa có trong thẻ, cùng
 * chiều, ngày (trống = ngày đi), giờ — lấy cái đầu.
 */
function changDaLuu(saved: readonly Api.LegDto[], draftLegs: readonly ChangNhap[], legKey: string): Api.LegDto | undefined {
  const l = draftLegs.find((x) => x.key === legKey);
  if (!l) return undefined;
  if (l.id) return saved.find((x) => x.id === l.id);
  const cu = new Set(draftLegs.flatMap((x) => (x.id ? [x.id] : [])));
  return saved.find((x) => !cu.has(x.id) && x.direction === l.direction && (x.pickupDate ?? "") === (l.pickupDate || orderDate) && (x.pickupTime ?? "") === l.pickupTime);
}

// Sau khi lưu thành công `saving` không bao giờ về false (trang sắp bị thay). iOS đưa trang này vào bộ nhớ đệm (bfcache) và KHÔI PHỤC nguyên trạng khi người dùng vuốt Back từ /order
// → form `inert` + "Đang lưu…" vĩnh viễn, mà PWA không có nút tải lại. `pageshow` với `persisted` báo đúng trường hợp đó: mở khoá lại form (dữ liệu đã gõ vẫn còn).
// (Lưu xong nay dùng `location.replace` nên form không còn trong lịch sử và Back không tới được nó; listener này giữ lại làm đai an toàn.)
// Chỉ khi đang kẹt `saving`: `setSaving(false)` gỡ `inert` của form, không được gỡ nhầm form đã bị `lockForm` (đơn không sửa được / không có quyền lập đơn).
window.addEventListener("pageshow", (e) => {
  if (e.persisted && saving) setSaving(false);
});

// ---- danh mục và đơn ----
function setCatalog(res: Api.CatalogPublicResponse): void {
  live = new Map(res.items.filter((c) => c.supported).map((c) => [c.code, c]));
  picker.setItems(res.items);
  picker.setGroups(res.groups); // ADR-0058 Đ8 (thiết kế lại 18/10): hàng nút nhóm cuộn ngang, chọn MỘT nhóm
}

async function loadCatalog(): Promise<void> {
  try {
    const res = await layDanhMuc(); // ADR-0033: route cho người lập đơn (cả Đối tác, Thực tập)
    setCatalog(res);
    if (res.items.length === 0) picker.setNotice("Danh mục dịch vụ đang trống — báo quản trị viên.");
    else if (res.sync.error) picker.setNotice(`Chưa cập nhật được giá mới từ Google Sheet (${res.sync.error.replace(/[.\s]+$/, "")}). Đang dùng bản đã lưu — hãy kiểm tra lại giá trước khi gửi khách.`);
  } catch {
    // Mất danh mục khi sửa nháp: thẻ đã lưu hiện ở dạng khoá (vẫn sửa được đơn giá/chuyến và lưu được; máy chủ giữ bản chụp).
    picker.setNotice("Không tải được danh mục dịch vụ — tải lại trang để thử lại.");
  }
}

/**
 * Nạp bên đặt đang lưu của đơn nháp. Đối tác mà máy chủ ép bên đặt: không nạp gì (dòng chỉ đọc). Bên đặt là đối tác (cờ `bookerLaDoiTac` do MÁY CHỦ tính) và người sửa có ô "Đặt qua đối tác" ⇒ nạp vào ô đó,
 * không vào ô tra SĐT; còn lại giữ cách cũ (ô tra SĐT nạp hồ sơ đang lưu — kể cả Đối tác / tài khoản lai mở nháp có đại lý do văn phòng gắn). Nạp lại sau 409 phải dọn lựa chọn cũ của ô kia.
 */
function napBenDat(o: Api.OrderDetailDto): void {
  if (khoiBenDat.kieu === "chi-doc") return;
  if (noiNapBenDat({ coODatQua: datQua !== null, bookerLaDoiTac: o.bookerLaDoiTac, bookerPartyId: o.bookerPartyId }) === "dat-qua" && o.bookerPartyId) {
    const chon: BenDatChon = { partyId: o.bookerPartyId, ten: o.bookerName ?? "" };
    datQua?.datChon(chon);
    datBenDat(chon);
    bookerPicker.set(null, null);
    return;
  }
  datQua?.datChon(null);
  datBenDat(null);
  bookerPicker.set(o.bookerPartyId, o.bookerName);
}

function fill(o: Api.OrderDetailDto): void {
  field("customerName").value = o.customerName;
  field("customerPhone").value = o.customerPhone;
  napBenDat(o);
  field("customerEmail").value = o.customerEmail ?? "";
  field("customerNote").value = o.customerNote ?? "";
  if (field("customerEmail").value !== "" || field("customerNote").value.trim() !== "") gapKhach.mo(); // nháp đã có email / ghi chú: khối gập tự mở — không giấu giá trị đang có
  (field("discount") as HTMLInputElement).value = o.discount ? grouped(o.discount) : "";
  field("paymentNote").value = o.paymentNote ?? "";
  for (const en of [...entries]) unmount(en);
  orderUpdatedAt = o.updatedAt;
  // Ngày của cả đơn đặt TRƯỚC khi dựng thẻ: khối Đưa đón quyết chặng gọn / mở lúc dựng bằng cách so ngày đón với ngày đi (`changNenGon`) — ngày đi còn trống thì chặng nào cũng "đón khác ngày".
  const ngayDv = new Set(o.services.map((s) => s.departDate ?? ""));
  orderDate = ngayDv.size === 1 ? [...ngayDv][0]! : "";
  orderDateEl.value = orderDate;
  // Thiết kế lại 18/10 (mục 3C): thẻ của nháp nạp lại GẬP, trừ khi có lỗi hoặc có giá trị mà dòng gập không cho thấy (`theMoKhiNap` — luật tự mở của các khối bên trong) hoặc là thẻ `?focus=`.
  // Lúc nạp có thể nhiều thẻ cùng mở; "chỉ một thẻ mở" áp từ thao tác đầu tiên của người dùng (thêm dịch vụ / chạm mở thẻ khác).
  const laSanBay = (id: string): boolean => diem.some((x) => x.id === id && x.sanBay);
  for (const s of o.services) {
    const d = draftFromDto(s, live, newKey());
    const entry = mount(d, s.id === focusId || theMoKhiNap(d, orderDate, laSanBay), s.id === focusId ? true : undefined);
    if (s.id === focusId) entry.card.reveal(); // liên kết "Sửa" của banner incomplete_trip: mở thẻ + khối chuyến và cuộn tới thẻ
  }
  // Đơn cũ (trước ADR-0021) có thể mỗi dịch vụ một ngày: khi đó ô để trống và Lưu báo "chọn một ngày cho cả đơn" (không đoán hộ).
  const dates = new Set(entries.map((e) => e.draft.trip.departDate));
  orderDate = dates.size === 1 ? [...dates][0]! : "";
  orderDateEl.value = orderDate;
}

async function loadOrder(): Promise<void> {
  if (!editId) return;
  renderBanner(errorEl, null);
  renderBanner(saveErrorEl, null);
  try {
    const { order, canModify } = await layDon!();
    // `canModify` do MÁY CHỦ quyết (người lập, người phụ trách đơn — ADR-0009 — hoặc quản trị); câu này chỉ giải thích khi bị từ chối.
    if (!canModify) return lockForm(banner("danger", "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được sửa đơn này."));
    if (order.status !== "draft") return lockForm(banner("danger", "Chỉ sửa được đơn đang chờ xác nhận."));
    byId("form-title").textContent = `Sửa đơn ${order.orderCode}`;
    setBarTitle(`Sửa đơn ${order.orderCode}`);
    suaSoVe = suaChuyenDuoc(staff, order.staffId, canModify); // trước fill: thẻ dựng ô "Số người chiều về" theo cờ này
    fill(order);
    // Hành khách của nháp: chỉ người có ô order.passenger.write; tải hỏng → KHÔNG dựng khối và KHÔNG gửi khoá `passengers` (máy chủ giữ danh sách đang lưu —
    // không bao giờ gửi [] khi chưa biết danh sách thật).
    // Tải lại đơn (sau 409 stale): bỏ khối cũ TRƯỚC — tải danh sách hỏng thì không được gửi lại danh sách cũ đè lên bản người khác vừa sửa (R6).
    hk = null;
    hkCard.hidden = true;
    if (suaKhachDuoc(staff, order.staffId, canModify)) {
      try {
        const ds = await api<Api.PassengerListResponse>(`/api/orders/${encodeURIComponent(order.id)}/passengers`);
        dungKhoiKhach(ds.passengers.map((x) => dongTuDto(x, newKey(), false)));
      } catch {
        /* để trống khối: lưu nháp không đụng danh sách hành khách */
      }
    }
  } catch (err) {
    lockForm(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn."));
  }
}

/** Số khách của cả đoàn (mẫu số "N/M khách đã có tên") = số khách dịch vụ đông nhất (R9, cùng luật máy chủ `soKhachDoan`). */
const soKhachForm = (): number => soKhachDoan(drafts().map((d) => (d.kind === "catalog" ? d.pax : { adult: soKhachNhap(d), child: 0, senior: 0, infant: 0 })));

/** Dựng khối "Hành khách" (M2) ở `#hk-card`; máy tính (≥ 960px) dạng bảng trải hết bề ngang dưới hàng "thẻ dịch vụ | Tóm tắt". */
function dungKhoiKhach(rows: DongKhach[]): void {
  hk = taoKhoiHanhKhach({ rows, che: "form", soKhach: soKhachForm, today, bang: () => wideQuery.matches, newKey, ma: "hk", onChange: () => recompute() });
  replaceChildren(hkCard, h("h2", null, "Hành khách"), hk.root);
  hkCard.hidden = false;
  datViTriKhoiKhach();
}
// Đổi khổ màn hình: dời khối + đổi bảng ↔ thẻ (một listener cho cả trang, không gắn lại mỗi lần dựng khối).
wideQuery.addEventListener("change", () => {
  if (!hk) return;
  datViTriKhoiKhach();
  hk.refresh(true);
});

/** ≥ 960px: khối trải ngang SAU lưới 2 cột (cột Tóm tắt dính không đè lên); dưới 960px: ngay sau thẻ "Dịch vụ" (bản vẽ điện thoại M2). Chỉ DỜI nút, không dựng lại. */
function datViTriKhoiKhach(): void {
  if (wideQuery.matches) formEl.querySelector(".form-cols")?.after(hkCard);
  else servicesEl.closest("section")?.after(hkCard);
}

// ---- khởi động ----
// Gọi sớm (web/goi-som.ts): danh mục (và đơn đang sửa) gửi NGAY, song song với /api/auth/me của initShell(); vẫn chỉ DÙNG theo đúng điều kiện
// quyền bên dưới. Danh mục chỉ gọi sớm khi bản nhớ khung (ADR-0035) nói máy này thuộc người được lập đơn — Kế toán không gọi route này như cũ.
const layDanhMuc = layKhungNho()?.canCreate === true ? goiSom(() => api<Api.CatalogPublicResponse>("/api/catalog/for-order")) : () => api<Api.CatalogPublicResponse>("/api/catalog/for-order");
const layDon = editId ? goiSom(() => api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(editId)}`)) : null;
const staff = await initShell();
ganViTriThongBao();
// Cờ "không nhận tiền trả trước" bật NGAY khi biết tài khoản (người có quyền ghi sổ): từ đây tới khối ẩn ba ô ở dưới không còn khe nào mà số gõ sớm bị đọc ở `recompute` / `validate` / lúc lưu.
traTruocAn ||= can(staff, "ledger.write");
picker.setTaiKhoan(staff.id); // ADR-0058 Đ8: nhóm đã chọn nhớ THEO TÀI KHOẢN trên máy — bộ chọn dựng trước khi biết tài khoản, trước dòng này không đọc / ghi bộ nhớ
retailOnly = chiGiaDanhMuc(staff); // trước loadCatalog/loadOrder: thẻ dịch vụ dựng sau dòng này
duocDatGap = can(staff, "order.leg.short_notice");
// ---- bên đặt (sổ đại lý đợt 1, Task 11; đặc tả §7) ----
// Quyết định hiện gì do `khoiBenDatForm` (src/shared/phan-doi-tac-hien-thi.ts): Đối tác mà máy chủ ÉP bên đặt (trường `benDatCuaToi` của /api/auth/me — giao diện không suy) → dòng chỉ đọc "Bên đặt: <tên>"
// thay ô tra hồ sơ khách; văn phòng (người lập đơn, KHÔNG giữ quyền Đối tác) → thêm ô "Đặt qua đối tác"; còn lại → ô tra SĐT như hôm nay. Dựng TRƯỚC loadOrder (nạp nháp cần biết có ô nào).
const khoiBenDat = khoiBenDatForm(staff, benDatCuaToi());
bookerPicker.datCoODatQuaDoiTac(khoiBenDat.kieu === "tra-sdt-va-dat-qua"); // câu cạnh hồ sơ tổ chức chỉ trỏ tới ô «Đặt qua đối tác» khi ô đó CÓ ở form này (Task 14, nợ (d))
let datQua: DatQuaDoiTac | null = null;
let daChonBenDat: BenDatChon | null = null;
/** Đã chọn / bỏ chọn đại lý: ô tra hồ sơ khách theo SĐT ẩn khi đã chọn (tên + SĐT khách đi tour vẫn nhập ở hai ô khách); bỏ chọn thì hiện lại như cũ. */
function datBenDat(chon: BenDatChon | null): void {
  const truoc = daChonBenDat;
  daChonBenDat = chon;
  bookerPicker.root.hidden = chon !== null;
  if (chon !== null) canhBao.hien(null, ""); // đã chọn đối tác thì hết điều để hỏi
  else if (truoc !== null) bookerPicker.kiemLai(); // vừa bỏ đối tác: số khách đang gõ có thể là của một đối tác — hỏi lại (nợ T4(2), Việc 9)
  datNhanKhach(chon !== null);
}
/** Nhãn nổi của hai ô khách theo việc đã chọn đối tác (luật chữ ở `src/shared/phan-doi-tac-hien-thi.ts`): đã chọn thì SĐT ghi rõ là của khách, không phải của đối tác. */
function datNhanKhach(daChonDoiTac: boolean): void {
  for (const [id, nhan] of [["customerName", nhanTenKhach(daChonDoiTac)], ["customerPhone", nhanSdtKhach(daChonDoiTac)]] as const) {
    const chu = field(id).parentElement?.querySelector(".o-noi-chu");
    if (chu) chu.textContent = nhan;
  }
}
if (khoiBenDat.kieu === "chi-doc") {
  bookerPicker.tat();
  bookerPicker.root.replaceWith(dongBenDatChiDoc(khoiBenDat.benDat));
  datNhanKhach(true); // bên đặt là đối tác (máy chủ ép): hai ô khách là của người đi tour
} else if (khoiBenDat.kieu === "tra-sdt-va-dat-qua") {
  datQua = oDatQuaDoiTac({ daChon: null, onDoi: datBenDat }); // công tắc "Đơn của: Khách lẻ | Qua đối tác" ở hàng đầu khối Khách hàng
  byId("don-cua-slot").append(datQua); // hàng đầu của khối "Khách hàng"
}
// R-P15: mốc cho biểu mẫu chưa lưu — chỉ người được lập đơn (máy chủ hỏi order.create). Lỗi / chưa có chính sách (503) → không cảnh báo; máy chủ vẫn chặn lúc xác nhận.
const layMoc = can(staff, "order.create")
  ? api<Api.MocToiThieuResponse>("/api/orders/moc-toi-thieu").then((r) => r.mocToiThieuPhut, () => null)
  : Promise.resolve(null);
// Khối "Người phụ trách": chỉ lập đơn mới, chỉ ai máy chủ cho chọn (Thực tập, Đối tác thuần: khối KHÔNG hiện — không phải hiện rồi báo lỗi).
canPickHandler = !editId && mayPickHandlerOnCreate(staff);
thanhBuoc.an("phu-trach", !canPickHandler); // bước "Phụ trách" chỉ có khi khối người phụ trách có (lập đơn mới, người lập chọn được)
if (canPickHandler) {
  ownerEl.hidden = false;
  renderOwner();
}
// "Sử dụng thông tin của tôi": điền tên + SĐT của tài khoản đang đăng nhập (hồ sơ tài khoản chưa có email nên ô Email không đổi).
// Bắn "input" để ô hồ sơ khách (booker-picker) tra lại theo SĐT mới như khi gõ tay.
byId("use-mine").addEventListener("click", () => {
  for (const [id, value] of [["customerName", staff.fullName], ["customerPhone", staff.phone]] as const) {
    const el = field(id);
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
// ADR-0047 Phần B: điểm danh mục cho ô Nơi đón / Nơi trả (cổng staff — mọi tài khoản) và mẫu chặng theo dịch vụ (chỉ người lập đơn). Lỗi → rỗng.
const layDiem = api<Api.LocationListResponse>("/api/locations").then(
  (r) => r.locations.filter((l) => l.active).map((l): DiemChon => ({ id: l.id, nhan: `${l.name} · ${l.locationTypeName.toLowerCase()}`, sanBay: l.locationTypeCode === "AIRPORT" })),
  () => [] as DiemChon[],
);
const layMau = can(staff, "order.create")
  ? api<Api.MauChangFormResponse>("/api/van-chuyen/mau-chang").then((r) => new Map(Object.entries(r.mauChang)), () => new Map<string, MauChang>())
  : Promise.resolve(new Map<string, MauChang>());
// ADR-0061: công tắc nhập tay — chỉ người lập đơn hỏi (máy chủ hỏi order.create; Kế toán, chỉ-HDV không gọi). Trước loadOrder: thẻ nhập tay đã lưu dựng theo cờ này.
// Gọi song song với danh mục; chờ kết quả ngay sau danh mục (vẫn trước loadOrder).
const layNhapTay = can(staff, "order.create")
  ? api<Api.NhapTayResponse>("/api/cai-dat/nhap-tay").then((r) => r.duocDung, () => false)
  : Promise.resolve(false);
// ADR-0033: danh mục cho form chỉ dành cho người được lập đơn — máy chủ trả 403 cho tài khoản không có `order.create` (Kế toán), nên không gọi
// (gọi thì hiện thêm "Không tải được danh mục dịch vụ — tải lại trang…", lời khuyên sai vì tải lại không giúp gì). Hôm nay mọi mã có `order.modify`
// đều có `order.create`; ai sửa đơn mà không được lập đơn thì thẻ đã lưu hiện ở dạng khoá như khi mất danh mục (xem `loadCatalog`).
// Điểm + mẫu chặng TRƯỚC khi danh mục hiện ra ô chọn: chọn dịch vụ sớm mà mẫu chưa về thì mất chặng tạo sẵn (M6) — kịch bản 9b bắt được.
[diem, mauChang] = await Promise.all([layDiem, layMau]);
if (can(staff, "order.create")) await loadCatalog(); // trước loadOrder: thẻ đã lưu cần danh mục hiện tại để biết còn đổi số khách được không
duocNhapTay = await layNhapTay;
addManualBtn.hidden = !duocNhapTay;
picker.setNhapTay(duocNhapTay);
// Sửa đơn nháp: tiền trả trước là LẦN THU ở trang đơn (mục Thanh toán), không nhập lại ở form (sổ tiền lượt 1).
if (editId) {
  for (const f of ["prepaid-amount-field", "prepaid-method-field", "prepaid-collector-field"]) byId(f).hidden = true;
  byId("prepaid-hint").textContent = "Tiền khách đã trả trước ghi ở trang đơn (mục Thanh toán → Ghi lần thu).";
  byId("prepaid-hint").hidden = false; // câu giải thích duy nhất của khối khi không nhận trả trước — luôn hiện (`capNhatOTraTruoc` không đụng khi `traTruocAn`)
}
// ADR-0092 Đ6 (C1): người có quyền ghi sổ (Toàn quyền) ghi CK – Công ty thu phải kèm mã giao dịch ngân hàng — ô mã chỉ ở trang đơn ⇒ form không nhận tiền trả
// trước của người này (tránh lần gửi chắc chắn 400 làm rơi tiền trả trước); cùng khuôn với lúc sửa đơn.
if (!editId && can(staff, "ledger.write")) {
  for (const f of ["prepaid-amount-field", "prepaid-method-field", "prepaid-collector-field"]) byId(f).hidden = true;
  byId("prepaid-hint").textContent = "Tiền khách đã trả trước ghi ở trang đơn sau khi lưu (mục Thanh toán → Ghi lần thu, kèm mã giao dịch ngân hàng nếu chuyển khoản vào tài khoản công ty).";
  byId("prepaid-hint").hidden = false;
  // Form dùng được trong lúc tải (initShell, danh mục…): số đã gõ sớm phải bị xoá (cờ `traTruocAn` đã bật ngay sau `initShell()`, nên số đó không còn được đọc), kẻo vẫn gửi lần thu CK – Công ty thu không mã (400) và làm rơi tiền trả trước.
  field("prepaidAmount").value = "";
  recompute();
}
if (editId) {
  byId("form-title").textContent = "Sửa đơn";
  setBarTitle("Sửa đơn");
  await loadOrder();
} else if (!can(staff, "order.create")) {
  // ADR-0007: kế toán xem được đơn nhưng không lập đơn; nút "Đơn mới" đã ẩn, đây là lớp chặn khi mở thẳng đường dẫn.
  lockForm(banner("danger", "Tài khoản này không được lập đơn."));
} else {
  // Lập đơn mới: người lập là chủ đơn (phạm vi "own").
  suaSoVe = can(staff, "order.trip.edit", { ownerId: staff.id, assigned: false });
  if (can(staff, "order.passenger.write", { ownerId: staff.id, assigned: false })) dungKhoiKhach([]);
}
mocPhut = await layMoc;
if (retailOnly) {
  // Sau loadOrder: đơn cũ đã lưu giảm giá > 0 thì để ô sửa được (đưa về 0), không thì khoá.
  const discountEl = field("discount") as HTMLInputElement;
  discountEl.readOnly = num("discount") === 0;
  // Dòng báo nằm DƯỚI cả hàng ba ô Thanh toán (không trong cột hẹp của ô giảm giá — ở máy tính từng xuống 3 hàng), ô trỏ tới nó cho trình đọc màn hình.
  // Câu theo quyền như máy chủ: có quyền Đối tác (kể cả kèm Thực tập) → câu của Đối tác; chỉ Thực tập → "không được giảm giá" (trần của Thực tập là 0, không phải "tạm").
  const hint = h("p", { class: "muted", id: "discount-hint" }, holdsPartner(staff) ? "Tài khoản đối tác tạm chưa được giảm giá." : "Tài khoản Thực tập không được giảm giá.");
  discountEl.setAttribute("aria-describedby", hint.id);
  (discountEl.closest(".grid") ?? discountEl).after(hint);
}
recompute();

// Bảng tin (ADR-0022, TD-3): trang này KHÔNG BAO GIỜ tự tải lại (sẽ xoá những gì người dùng đang nhập). Chỉ khi đang SỬA đơn `editId` mà có tin về đúng đơn đó
// thì hiện dải báo; khoá lạc quan `stale` ở máy chủ vẫn là lưới thật khi bấm Lưu. Lập đơn mới (không có `editId`) thì không làm gì. Không đè lên một dải báo
// đang hiện (lỗi lưu/khoá form) và không hiện lúc chính tab này đang lưu hoặc vừa ghi đơn này.
if (editId) {
  window.addEventListener("don-thay-doi", (ev) => {
    if (!suKienVeDon((ev as CustomEvent<SuKienDon[]>).detail, editId)) return;
    if (formLocked || saving || vuaLamBoiTabNay(editId) || !saveErrorEl.hidden) return;
    renderBanner(saveErrorEl, banner("warning", "Đơn vừa được người khác cập nhật — lưu sẽ báo lỗi, hãy mở lại đơn"));
  });
}
