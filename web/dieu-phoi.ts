// Điều phối xe (/dieu-phoi?ngay=YYYY-MM-DD) — ADR-0049 V1 (route 1, 5, 40), ADR-0050; bản vẽ docs/design/van-chuyen-dieu-phoi/project/01 Dieu phoi xe.dc.html
// (1a–1g) + dp-chua-xep, dp-dong-thoi-gian, dp-can-xu-ly; bản đối chiếu 2.1, 2.9, 2.13, H6–H8, H14, mục 4 (khoảng giờ theo dữ liệu).
// - Ba cột (máy tính): Chưa xếp · Dòng thời gian theo xe (+ thẻ chuyến đang chọn) · Cần xử lý. Điện thoại: ba thẻ (tablist) — "Chưa xếp", "Xe", "Cần xử lý".
// - Xếp khách: bấm thẻ chặng (hoặc kéo thả thẻ chặng vào một khối chuyến) → hộp "Xếp vào chuyến" (chọn chuyến, số khách — ít hơn = tách đoàn) → route 5.
//   Máy chủ đòi vượt luật (409 `canQuyen` + `lop` — ADR-0104 Đ1): người đủ ô của lớp qua hộp "Điều chỉnh khẩn cấp" (vượt mốc; khoảng nghỉ / cam kết khi chuyến
//   dưới mốc — Bán hàng, Quản trị, Toàn quyền) hoặc "Phá lệ" (khoảng nghỉ / cam kết ngoài mốc — Quản trị, Toàn quyền); không có nút vượt đứng riêng (2.13);
//   chặng đặt gấp không cần vượt mốc (máy chủ quyết — 2.1).
// - Khoá theo mốc: chỉ theo cờ `khoaMoc` của từng chuyến (R-P13). Vạch mốc trên dòng thời gian vẽ từ `mocToiThieuPhut` (R-P12) — chỉ để nhìn, KHÔNG tô vùng
//   khoá theo giờ hiện tại (lệnh điều phối vòng 3).
// - Kế toán (ô trip.view, không trip.dispatch): xem đủ, không nút, dải "Chỉ xem". Không "Gọi tài xế" (H7), không "Đã gọi báo" (Q2 / ADR-0051 — Task B-GB sau).
// - A4 T9 (ADR-0053 D9.4, G-A4-19): dải "Tài xế bận" (khung báo bận của tài xế đối tác, 7 ngày từ ngày đang xem) — CHỈ người có ô trip.dispatch (ô `any` của
//   văn phòng: hỏi không ngữ cảnh là đúng); ẩn khi rỗng. Không lý do (văn phòng chỉ thấy "bận"). Kế toán không gọi route (máy chủ cũng 403).
// - CHỜ A15: thẻ chuyến đang chạy (mốc tiến độ, "giờ do văn phòng khai") — chưa dựng.
// - C3 (gói A+C, đánh giá ERP 7/10 C32–C37; luật thuần ở src/shared/dieu-phoi-loc.ts): cột "Chưa xếp" có tổng "khách chưa xếp / ghế trống", bộ lọc ca / chiều / nơi trả,
//   ô chọn nhiều chặng (hộp kiểm đứng NGANG thẻ chặng, không nằm trong nút) → MỘT lệnh xếp trọn hoặc không; hộp "Xếp vào chuyến" ưu tiên chuyến hợp, làm mờ chuyến đầy /
//   giờ hẹn ngoài khung (chỉ nhắc — máy chủ quyết); "+ Chuyến mới" mở bảng trượt (không rời bảng); thanh tải dưới mỗi khối chuyến; nghe tin `don-thay-doi`.
//   C28 (ô chọn người cho chặng về) CHƯA làm: cần route cho văn phòng đọc khoá + tên khách của chặng chưa xếp và ruling R-P3 — chờ chủ.
import { daiBanTrenLich } from "../src/shared/khung-ban-hien-thi";
import {
  CA_DON, LOC_TRONG, NHAN_CHIEU, NHAN_MUC_TAI, TOI_DA_CHANG_MOT_LAN, canhBaoGioHenSauXep, cauTongKhachGhe, chuanHoaBoLoc, dangLoc, doiChon, giuChonConHieuLuc, locChangChuaXep, luaChonChuyenXep,
  mucTai, noiTraCuaCot, tongKhachGhe, tyLeTai, type BoLoc, type CaDon, type MucTai,
} from "../src/shared/dieu-phoi-loc";
import {
  NHAN_KHAN_CAP, NUT_VUOT, cauKhoaMoc, changChuaXep, chipChang, hinhDongThoiGian, kieuChuyen, nhanNgayXem, soLieuDieuPhoi, thanPhaLe, truongLoiChuyen, tuyenChuyen, viecCanXuLy,
  type HangXe, type KhoiChuyen, type ViecCanXuLy,
} from "../src/shared/dieu-phoi-man";
import type { BanTaiXeResponse, ChangLichDto, ChuyenChiTietResponse, ChuyenTomTatDto, CapNhatDiemResponse, CapNhatKhachResponse, GoiBaoChangDto, LichChungResponse, NhacGoiKhachResponse, TaiXeChonDto } from "../src/shared/contracts";
import { NUT_CAP_NHAT_KHACH, giuCapNhatKhach } from "../src/shared/ly-do-giu";
import { NHAN_TU_CHOI_GOI_BAO, type MaTuChoiGoiBao } from "../src/shared/goi-bao";
import { ApiError } from "./api";
import { can } from "../src/shared/permissions";
import { nhanCamKet } from "../src/shared/cam-ket-xe";
import { nhanThoiLuong } from "../src/shared/chinh-sach-hien-thi";
import { addDays, isISODate, ngayNgan, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { moBangTruot } from "./bang-truot";
import { append, byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, docLoiLenh, moPhaLe, nhomChon, taoLenh } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";
import { taoBoLamMoi } from "./lam-moi-logic";

const errorEl = byId("error");
const bannerEl = byId("dp-banner");
const trangEl = byId("dp-trang");
const soEl = byId("dp-so");
const soMEl = byId("dp-so-m");
const soPhuEl = byId("dp-so-phu");
const tabsEl = byId("dp-tabs");
const cotChua = byId("dp-cot-chua-xep");
const cotXe = byId("dp-cot-xe");
const cotCxl = byId("dp-cot-can-xu-ly");
const oNgay = byId<HTMLInputElement>("dp-ngay");
const nutMoi = byId<HTMLAnchorElement>("dp-moi");

const staff = await initShell();
// ADR-0104 Đ1 mục 9: khoá theo mốc chỉ hỏi ô điều chỉnh khẩn cấp (vượt mốc luôn thuộc lớp này); lớp phá lệ do 409 `lop` quyết.
const co = { dieuPhoi: can(staff, "trip.dispatch"), khanCap: can(staff, "trip.urgent_adjust"), quanLyXe: can(staff, "vehicle.manage") };
const homNay = vnToday(new Date());
const tu = new URLSearchParams(location.search).get("ngay");
let ngay = tu && isISODate(tu) ? tu : homNay;
let lich: LichChungResponse | null = null;
/** ADR-0051: danh sách nhắc "gọi báo khách" (theo HÔM NAY, không theo ngày đang xem) — tải lại cùng mỗi lần tải lịch. */
let nhac: NhacGoiKhachResponse | null = null;
/** A4 T9: khung bận của tài xế (7 ngày từ ngày đang xem) — chỉ khi `co.dieuPhoi`; lỗi đọc → không vẽ dải (không chặn bảng). */
let banTx: BanTaiXeResponse | null = null;
const txBanEl = byId("dp-tx-ban");
let chon: string | null = null;
let tab: "chua-xep" | "xe" | "can-xu-ly" = "chua-xep";

datCrumb("Vận chuyển", "Điều phối xe");

async function nap(): Promise<void> {
  // Kiểm độc lập K2b T1: chặn ô trip.view TRƯỚC mọi lời gọi (cả khi bấm đổi ngày), như web/chuyen.ts.
  if (!can(staff, "trip.view")) return;
  oNgay.value = ngay;
  byId("dp-ngay-nhan").textContent = nhanNgayXem(ngay, homNay);
  nutMoi.href = `/chuyen-sua?ngay=${ngay}`;
  nutMoi.hidden = !co.dieuPhoi;
  try {
    [lich, nhac, banTx] = await Promise.all([
      api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${ngay}`),
      api<NhacGoiKhachResponse>("/api/van-chuyen/nhac-goi-khach").catch(() => null),
      co.dieuPhoi ? api<BanTaiXeResponse>(`/api/van-chuyen/ban-tai-xe?tu=${ngay}`).catch(() => null) : Promise.resolve(null),
    ]);
  } catch (e) {
    trangEl.hidden = true;
    return showError(errorEl, loiCua(e));
  }
  errorEl.hidden = true;
  if (chon && !lich.chuyen.some((c) => c.id === chon)) chon = null;
  daChon = giuChonConHieuLuc(daChon, lich); // C34: chặng vừa được người khác xếp / bỏ thì rời lựa chọn
  ve();
}

function doiNgay(moi: string): void {
  if (!isISODate(moi) || moi === ngay) return;
  ngay = moi;
  chon = null;
  daChon = new Set();
  boLoc = { ...LOC_TRONG };
  replaceChildren(bannerEl);
  history.replaceState(null, "", `/dieu-phoi?ngay=${ngay}`);
  void nap();
}
byId("dp-truoc").addEventListener("click", () => doiNgay(addDays(ngay, -1)));
byId("dp-sau").addEventListener("click", () => doiNgay(addDays(ngay, 1)));
oNgay.addEventListener("change", () => doiNgay(oNgay.value));

// ---- vẽ ------------------------------------------------------------------------------------------------------------------------------------------------------
function ve(): void {
  const l = lich!;
  const viec = viecCanXuLy(l, co, nhac?.muc ?? []);
  const s = soLieuDieuPhoi(l, viec.length);
  const rong = l.canhBao.find((w) => w.loai === "CHINH_SACH_RONG");
  const daiRong = document.getElementById("dp-chinh-sach-rong");
  if (rong && !daiRong) bannerEl.prepend(Object.assign(dai("warning", rong.nhan, ["Chưa lưu, xác nhận hay sửa chuyến có giờ đón được cho tới khi Toàn quyền đặt chính sách điều phối."]), { id: "dp-chinh-sach-rong" }));
  if (!rong) daiRong?.remove();

  const moc = [s.satMoc ? `${s.satMoc} sắp tới hạn chốt` : null, s.quaMoc ? `${s.quaMoc} quá hạn chốt` : null].filter(Boolean).join(" · ");
  const o = (nhan: string, so: number, phu = "", tone = "") =>
    h("div", { class: "dp-stat" }, h("span", { class: "dp-stat-k" }, nhan), h("span", { class: "dp-stat-v" }, h("span", { class: "dp-stat-n" }, String(so)), phu ? h("span", { class: `dp-stat-sub ${tone}` }, phu) : null));
  replaceChildren(
    soEl,
    o("LƯỢT ĐƯA ĐÓN", s.chang),
    o("ĐÃ XẾP", s.daXep),
    o("CHƯA XẾP", s.chuaXep, moc, "is-danger"),
    o("CHUYẾN", s.chuyen, s.biGiu ? `${s.biGiu} bị giữ` : "", "is-danger"),
    o("CẦN XỬ LÝ", s.canXuLy),
    o("CHỜ XÁC NHẬN", s.nhap, s.choDatGap ? "chờ duyệt đặt gấp" : "", "is-sand"),
  );
  const om = (nhan: string, so: number, danger = false) => h("div", { class: "dp-stat-m" }, h("span", { class: danger && so > 0 ? "dp-stat-n is-danger" : "dp-stat-n" }, String(so)), h("span", { class: "dp-stat-k" }, nhan));
  replaceChildren(soMEl, om("lượt", s.chang), om("đã xếp", s.daXep), om("chưa xếp", s.chuaXep, true), om("chuyến", s.chuyen));
  soPhuEl.textContent = [s.chuaXep ? `Chưa xếp: ${[s.satMoc ? `${s.satMoc} sắp tới hạn chốt` : null, s.quaMoc ? `${s.quaMoc} quá hạn chốt` : null].filter(Boolean).join(", ") || "chưa tới hạn chốt"}` : null, s.nhap ? `${s.nhap} đơn nháp` : null].filter(Boolean).join(" · ");

  veTaiXeBan();
  veTabs(s.chuaXep, s.chuyen, s.canXuLy);
  veChuaXep();
  veXe();
  veCanXuLy(viec);
  trangEl.hidden = false;
}

/** Dải "Tài xế bận" (A4 T9): một dòng mỗi khung — tên · nhà xe — khoảng giờ. Rỗng / không ô → ẩn. */
function veTaiXeBan(): void {
  const ds = banTx?.khung ?? [];
  txBanEl.hidden = ds.length === 0;
  if (ds.length === 0) return replaceChildren(txBanEl);
  const tieuDe = `Tài xế bận từ ${ngayNgan(banTx!.tu, homNay)} tới ${ngayNgan(banTx!.den, homNay)}`;
  replaceChildren(
    txBanEl,
    Object.assign(dai("info", tieuDe, ds.map((k) => `${k.tenTaiXe}${k.nhaXe.length ? ` (${k.nhaXe.join(", ")})` : ""} — ${k.nhan}`)), { className: "banner banner-info dp-tx-ban" }),
  );
}

function veTabs(nChua: number, nXe: number, nCxl: number): void {
  const ds: [typeof tab, string, number][] = [["chua-xep", "Chưa xếp", nChua], ["xe", "Xe", nXe], ["can-xu-ly", "Cần xử lý", nCxl]];
  const nut = ds.map(([k, nhan, n]) =>
    h("button", { type: "button", id: `dp-tab-${k}`, class: "dp-tab", role: "tab", "aria-selected": String(k === tab), "aria-controls": `dp-cot-${k}`, tabindex: k === tab ? 0 : -1, "data-tab": k },
      nhan, h("span", { class: "dp-tab-n" }, String(n))));
  nut.forEach((b, i) => {
    b.addEventListener("click", () => chonTab(ds[i]![0]));
    b.addEventListener("keydown", (e) => {
      const toi = e.key === "ArrowRight" ? (i + 1) % ds.length : e.key === "ArrowLeft" ? (i - 1 + ds.length) % ds.length : e.key === "Home" ? 0 : e.key === "End" ? ds.length - 1 : -1;
      if (toi < 0) return;
      e.preventDefault();
      chonTab(ds[toi]![0]);
      document.getElementById(`dp-tab-${ds[toi]![0]}`)?.focus();
    });
  });
  replaceChildren(tabsEl, ...nut);
  for (const [k] of ds) byId(`dp-cot-${k}`).classList.toggle("is-active", k === tab);
}
function chonTab(k: typeof tab): void {
  tab = k;
  for (const b of tabsEl.querySelectorAll<HTMLElement>(".dp-tab")) {
    const on = b.dataset.tab === k;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  for (const id of ["chua-xep", "xe", "can-xu-ly"]) byId(`dp-cot-${id}`).classList.toggle("is-active", id === k);
  if (k === "xe") requestAnimationFrame(cuonDau);
}

const dauCot = (tieuDe: string, n: number | null, them: Child = null) =>
  h("div", { class: "dp-card-head" }, h("h2", { class: "dp-card-title" }, tieuDe), n === null ? null : h("span", { class: "dp-count-sand" }, String(n)), them);

/** C3 — chặng đang chọn (C34) và bộ lọc (C35): giữ qua mỗi lần tải lại lịch (tin đơn đổi, chuyến đổi); đổi ngày thì bỏ. Chọn / lọc chỉ là việc của màn — máy chủ không biết. */
let daChon = new Set<string>();
let boLoc: BoLoc = { ...LOC_TRONG };
let thanhChonEl: HTMLElement | null = null;
const CHIEU_LOC = [{ ma: "OUT", nhan: NHAN_CHIEU.OUT }, { ma: "RETURN", nhan: NHAN_CHIEU.RETURN }];

function veChuaXep(): void {
  const tatCa = changChuaXep(lich!);
  boLoc = chuanHoaBoLoc(boLoc, tatCa);
  const ds = locChangChuaXep(tatCa, boLoc);
  const hien = new Set(ds.map((x) => x.chang.legId));
  daChon = new Set([...daChon].filter((id) => hien.has(id))); // chặng bị lọc ẩn / vừa được người khác xếp thì rời lựa chọn
  thanhChonEl = co.dieuPhoi && ds.length ? h("div", { class: "dp-nhieu", "data-role": "thanh-chon" }) : null;
  replaceChildren(
    cotChua,
    dauCot("Chưa xếp", tatCa.length),
    h("div", { class: "dp-tong", "data-role": "tong" }, cauTongKhachGhe(tongKhachGhe(lich!))),
    co.dieuPhoi && tatCa.length ? h("div", { class: "dp-col-note dp-chi-may-tinh" }, "Kéo lượt đưa đón thả vào một chuyến, hoặc bấm vào lượt để chọn chuyến") : null,
    tatCa.length ? veLoc(tatCa, ds.length) : null,
    ...(ds.length ? ds.map(({ chang: c, conLai }) => theChang(c, conLai)) : [h("div", { class: "dp-col-empty" }, tatCa.length ? "Không có lượt đưa đón nào khớp bộ lọc." : "Không còn lượt đưa đón nào chưa xếp.")]),
    thanhChonEl,
  );
  veThanhChon();
}

/** Hàng lọc của cột "Chưa xếp" (C35): ca đón / chiều / nơi trả; lọc CẢ BA (VÀ). Đổi lọc → vẽ lại cột, giữ tiêu điểm ở ô vừa đổi. */
function veLoc(tatCa: { chang: ChangLichDto }[], soHien: number): HTMLElement {
  const o = (id: string, nhan: string, ds: readonly { ma: string; nhan: string }[], gt: string, dat: (v: string) => void) => {
    const sel = h("select", { id, class: "vc-input" }, h("option", { value: "" }, "Tất cả"), ...ds.map((x) => h("option", { value: x.ma }, x.nhan)));
    sel.value = gt;
    sel.addEventListener("change", () => {
      dat(sel.value);
      veChuaXep();
      document.getElementById(id)?.focus();
    });
    return h("label", { class: "dp-loc-o" }, nhan, sel);
  };
  const boLocNut = dangLoc(boLoc) ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-loc-bo", "data-action": "bo-loc" }, `Bỏ lọc · đang hiện ${soHien}/${tatCa.length} lượt`) : null;
  boLocNut?.addEventListener("click", () => {
    boLoc = { ...LOC_TRONG };
    veChuaXep();
    document.getElementById("dp-loc-ca")?.focus();
  });
  return h("div", { class: "dp-loc", role: "group", "aria-label": "Lọc lượt đưa đón chưa xếp" },
    o("dp-loc-ca", "Ca đón", CA_DON, boLoc.ca, (v) => (boLoc = { ...boLoc, ca: v as CaDon | "" })),
    o("dp-loc-chieu", "Chiều", CHIEU_LOC, boLoc.chieu, (v) => (boLoc = { ...boLoc, chieu: v as BoLoc["chieu"] })),
    o("dp-loc-noi-tra", "Nơi trả", noiTraCuaCot(tatCa), boLoc.noiTra, (v) => (boLoc = { ...boLoc, noiTra: v })),
    boLocNut);
}

/** Thanh chọn nhiều (C34), dính đáy cột: "Đã chọn N chặng · M khách" + "Xếp vào chuyến…" / "Bỏ chọn" / "Chọn hết". Vẽ lại tại chỗ (không dựng lại cả cột — giữ chỗ đang cuộn). */
function veThanhChon(): void {
  const el = thanhChonEl;
  if (!el) return;
  const ds = locChangChuaXep(changChuaXep(lich!), boLoc);
  const chon = ds.filter((x) => daChon.has(x.chang.legId));
  const khach = chon.reduce((n, x) => n + x.conLai, 0);
  const chonHet = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "chon-het" }, `Chọn hết ${Math.min(ds.length, TOI_DA_CHANG_MOT_LAN)} lượt đang hiện`);
  chonHet.addEventListener("click", () => {
    daChon = new Set(ds.slice(0, TOI_DA_CHANG_MOT_LAN).map((x) => x.chang.legId));
    capNhatO();
    if (ds.length > TOI_DA_CHANG_MOT_LAN) baoKetQua(dai("info", `Một lần xếp tối đa ${TOI_DA_CHANG_MOT_LAN} lượt — đã chọn ${TOI_DA_CHANG_MOT_LAN} lượt đầu, xếp xong thì chọn tiếp.`));
  });
  const xep = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "xep-nhieu" }, chon.length > 1 ? `Xếp ${chon.length} lượt vào chuyến…` : "Xếp vào chuyến…");
  xep.addEventListener("click", () => moXep(chon.map((x) => ({ chang: x.chang, conLai: x.conLai })), null, xep));
  const bo = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "bo-chon" }, "Bỏ chọn");
  bo.addEventListener("click", () => {
    daChon = new Set();
    capNhatO();
  });
  replaceChildren(
    el,
    h("div", { class: "dp-nhieu-chu", role: "status" }, chon.length ? `Đã chọn ${chon.length} lượt · ${khach} khách` : "Tích ô bên trái thẻ để chọn nhiều lượt rồi xếp một lần."),
    chon.length ? xep : null,
    chon.length ? bo : null,
    ds.length > 1 && chon.length < Math.min(ds.length, TOI_DA_CHANG_MOT_LAN) ? chonHet : null,
  );
}
/** Đổi lựa chọn → chỉnh ô chọn + thanh chọn tại chỗ. */
function capNhatO(): void {
  for (const hang of cotChua.querySelectorAll<HTMLElement>(".dp-leg-hang")) {
    const on = daChon.has(hang.dataset.hang ?? "");
    hang.classList.toggle("is-chon", on);
    const o = hang.querySelector<HTMLInputElement>(".dp-leg-chon");
    if (o) o.checked = on;
  }
  veThanhChon();
}

function theChang(c: ChangLichDto, conLai: number): HTMLElement {
  const noiDung: Child[] = [
    h("span", { class: "dp-leg-top" }, h("span", { class: "dp-leg-gio" }, c.gioDon ?? "Chưa chốt giờ"), ...chipChang(c).map((x) => chip(x.nhan, x.tone)),
      c.soHieuChuyenBay ? h("span", { class: "chip chip-code" }, `✈︎ ${c.soHieuChuyenBay}`) : null,
      // Bảng điều phối (bản vẽ DP): [✈︎][XE RIÊNG][≥ N chỗ] — SAU ✈︎ (khác trang đơn, đúng bản vẽ từng màn); thẻ chỉ xem (Kế toán) cũng hiện.
      ...nhanCamKet(c.xeRieng, c.choToiThieu).map((x) => chip(x.nhan, x.tone))),
    h("span", { class: "dp-leg-tuyen" }, `${c.noiDon} → ${c.noiTra ?? "nơi trả chưa chốt"}`),
    h("span", { class: "dp-leg-meta" }, `${c.maDon} · ${conLai < c.soNguoi ? `còn ${conLai}/${c.soNguoi}` : conLai} khách`),
  ];
  if (!co.dieuPhoi) return h("div", { class: "dp-leg", "data-leg": c.legId }, ...noiDung);
  const b = h("button", { type: "button", class: "dp-leg is-xep", draggable: "true", "data-leg": c.legId, "aria-label": `Xếp lượt đưa đón ${c.gioDon ?? ""} ${c.noiDon}, ${c.maDon}, ${conLai} khách${c.soHieuChuyenBay ? `, chuyến bay ${c.soHieuChuyenBay}` : ""}${c.xeRieng ? ", xe riêng" : ""}${c.choToiThieu !== null ? `, tối thiểu ${c.choToiThieu} chỗ` : ""} vào chuyến` },
    ...noiDung, h("span", { class: "dp-leg-pill", "aria-hidden": "true" }, "Xếp vào chuyến…"));
  b.addEventListener("click", () => moXep([{ chang: c, conLai }], null, b));
  b.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", c.legId);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    b.classList.add("is-keo");
  });
  b.addEventListener("dragend", () => b.classList.remove("is-keo"));
  // C34: ô chọn đứng NGANG nút (không lồng trong nút — nút bấm = xếp một chặng); mỗi ô có tên riêng cho trình đọc màn hình.
  const o = h("input", { type: "checkbox", class: "dp-leg-chon", checked: daChon.has(c.legId), "aria-label": `Chọn lượt đưa đón ${c.maDon} ${c.gioDon ?? ""} ${c.noiDon} để xếp cùng lúc` });
  o.addEventListener("change", () => {
    const r = doiChon(daChon, c.legId);
    if (r.vuotGioiHan) {
      o.checked = false;
      baoKetQua(dai("warning", `Một lần xếp tối đa ${TOI_DA_CHANG_MOT_LAN} lượt — hãy xếp bớt rồi chọn tiếp.`));
      return;
    }
    daChon = r.chon;
    capNhatO();
  });
  return h("div", { class: `dp-leg-hang${daChon.has(c.legId) ? " is-chon" : ""}`, "data-hang": c.legId }, h("label", { class: "dp-leg-o" }, o), b);
}

function veXe(): void {
  const l = lich!;
  const hinh = hinhDongThoiGian(l, Date.now());
  const soChuyen = l.chuyen.filter((c) => c.trangThai !== "CANCELLED").length;
  const tl = h("div", { class: "dp-tl" });
  tl.style.setProperty("--dp-so-gio", String(hinh.gioCuoi - hinh.gioDau));
  const thuoc = h("div", { class: "dp-tl-thuoc" }, h("div", { class: "dp-tl-nhan" }), h("div", { class: "dp-tl-duong" }, ...hinh.nhanGio.map((g) => viTri(h("span", { class: "dp-tl-gio" }, g.nhan), g.x))));
  append(tl, [thuoc]);
  // ADR-0055 VK2-A A4: dải "Xe bận" (khung bận của xe trong ngày giờ VN) nằm DƯỚI khối chuyến — bản vẽ không vẽ, khuôn khối chuyến (Đợt 3 Task 10).
  const ban = daiBanTrenLich(l.khungBanXe ?? [], l.ngay);
  const soGio = hinh.gioCuoi - hinh.gioDau;
  const daiBan = (xeId: string): HTMLElement[] =>
    ban.filter((b) => b.xeId === xeId).flatMap((b) => {
      const x0 = Math.max(0, b.tuPhut / 60 - hinh.gioDau);
      const x1 = Math.min(soGio, b.denPhut / 60 - hinh.gioDau);
      if (x1 <= x0) return [];
      const el = viTri(h("div", { class: "dp-tl-ban", role: "img", "aria-label": b.nhan, title: b.nhan }, b.nhan.replace(/^Xe bận [^·]+· /, "")), x0);
      el.style.setProperty("--dp-dai", String(x1 - x0));
      return [el];
    });
  for (const n of hinh.nhom) {
    append(tl, [h("div", { class: "dp-tl-nhom" }, h("span", { class: "dp-tl-nhom-t" }, n.tieuDe))]);
    for (const hang of n.hang) {
      const duong = h("div", { class: "dp-tl-duong" }, ...daiBan(hang.xeId), ...hang.khoi.map(khoi));
      append(tl, [h("div", { class: "dp-tl-hang" }, nhanHang(hang), duong)]);
    }
  }
  if (!hinh.nhom.length) append(tl, [h("div", { class: "dp-col-empty" }, "Chưa có xe nào.")]);
  if (hinh.bayGio) append(tl, [viTri(h("div", { class: "dp-tl-bay-gio", "aria-hidden": "true" }, h("span", null, hinh.bayGio.nhan)), hinh.bayGio.x)]);
  if (hinh.moc) append(tl, [viTri(h("div", { class: "dp-tl-moc", "aria-hidden": "true" }, h("span", null, hinh.moc.nhan)), hinh.moc.x)]);
  const cuon = h("div", { class: "dp-tl-cuon", tabindex: 0, role: "region", "aria-label": "Dòng thời gian theo xe — cuộn ngang" }, tl);
  const mocNhan = l.mocToiThieuPhut === null ? "Hạn chốt" : `Hạn chốt ${nhanThoiLuong(l.mocToiThieuPhut)}`;
  const the = h(
    "section",
    { class: "vc-card dp-tl-card", "aria-labelledby": "dp-tl-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "dp-tl-title", class: "dp-card-title" }, "Dòng thời gian theo xe"), chip(`${soChuyen} chuyến`, "muted")),
    h("div", { class: "dp-tl-legend" },
      ...([["plan", "Lên kế hoạch"], ["run", "Đang chạy"], ["done", "Xong"], ["held", "Bị giữ"], ["nodrv", "Chưa có tài xế"]] as const).map(([k, t]) => h("span", { class: "dp-lg" }, h("span", { class: `dp-lg-o is-${k}` }), t)),
      ...(["THOANG", "GAN_DAY", "DAY", "VUOT"] as const).map((m) => h("span", { class: "dp-lg" }, h("span", { class: `dp-lg-tai ${lopTai(m)}` }), `Tải: ${NHAN_MUC_TAI[m].toLowerCase()}`)),
      h("span", { class: "dp-lg" }, h("span", { class: "dp-lg-bay-gio" }), "Bây giờ"),
      h("span", { class: "dp-lg" }, h("span", { class: "dp-lg-moc" }), mocNhan)),
    cuon,
    // Điện thoại (thẻ "Xe"): một dòng "Xe bận 08:00–17:00 · Bảo dưỡng" mỗi khung bận của ngày (biểu tượng `ban` có sẵn — không vẽ biểu tượng mới).
    ban.length > 0
      ? h("ul", { class: "dp-ban-ds vc-narrow", "aria-label": "Xe bận trong ngày" },
        ...ban.map((b) => h("li", { class: "dp-ban-dong" }, icon("ban", 14, 2), h("strong", null, l.khungBanXe.find((k) => k.xeId === b.xeId)?.bienSo ?? ""), ` · ${b.nhan}`)))
      : null,
    h("div", { class: "dp-tl-note" }, "Chuyến có ", icon("lock", 12), " đang trong vùng khoá trước giờ xe chạy — khoá xếp khách, đổi xe, đổi tài xế. ● điểm đón · ■ điểm trả."),
  );
  // Vẽ lại (bấm khối, sau khi xếp / cập nhật) GIỮ chỗ đang cuộn; chỉ tự cuộn tới chuyến đầu tiên MỘT lần mỗi ngày xem — và chỉ khi khung đang hiện (thẻ "Xe"
  // ở điện thoại có thể đang ẩn: thử lại lúc mở thẻ).
  const cu = cotXe.querySelector<HTMLElement>(".dp-tl-cuon");
  const giu = cu && daCuon === ngay ? cu.scrollLeft : null;
  replaceChildren(cotXe, the, theChon());
  if (giu !== null) cuon.scrollLeft = giu;
  else requestAnimationFrame(cuonDau);
}
/** Ngày đã tự cuộn tới chuyến đầu tiên (null = chưa). */
let daCuon: string | null = null;
function cuonDau(): void {
  const cuon = cotXe.querySelector<HTMLElement>(".dp-tl-cuon");
  if (daCuon === ngay || !cuon || cuon.clientWidth === 0) return;
  const dau = [...cuon.querySelectorAll<HTMLElement>(".dp-khoi")].sort((a, b) => a.offsetLeft - b.offsetLeft)[0]; // chuyến sớm nhất trong ngày
  if (dau) cuon.scrollLeft = Math.max(0, dau.offsetLeft - dau.offsetWidth / 2);
  daCuon = ngay;
}

/** Tên lớp CSS của một mức tải ("GAN_DAY" → "is-tai-gan-day"). */
const lopTai = (m: MucTai): string => `is-tai-${m.toLowerCase().replace("_", "-")}`;

function viTri(el: HTMLElement, x: number): HTMLElement {
  el.style.setProperty("--dp-x", String(x));
  return el;
}

function nhanHang(hang: HangXe): HTMLElement {
  return h("div", { class: "dp-tl-nhan" }, h("span", { class: "dp-tl-bien" }, hang.bienSo), h("span", { class: "dp-tl-cho" }, hang.soCho), h("span", { class: hang.thieuTaiXe ? "dp-tl-tx is-thieu" : "dp-tl-tx" }, hang.taiXe));
}
function khoi(k: KhoiChuyen): HTMLElement {
  const c = lich!.chuyen.find((x) => x.id === k.id)!;
  // C3: mức tải (thanh màu dưới khối + chữ trong tên truy cập — màu không là cách duy nhất); chuyến đã xong / huỷ không tô.
  const muc = c.trangThai === "PLANNED" || c.trangThai === "RUNNING" ? mucTai(c.tai, c.xe.soCho) : null;
  const el = h(
    "button",
    { type: "button", class: `dp-khoi is-${k.kieu}${muc ? ` ${lopTai(muc)}` : ""}${chon === k.id ? " is-chon" : ""}`, "data-chuyen": k.id, "aria-pressed": String(chon === k.id), "aria-label": `${k.ma}, ${k.gio}, ${k.nhan}, tải ${k.tai}${muc ? ` (${NHAN_MUC_TAI[muc].toLowerCase()})` : ""}${k.khoa ? ", đang khoá" : ""}`, title: `${k.ma} · ${k.gio} · ${k.tai}${muc ? ` · ${NHAN_MUC_TAI[muc]}` : ""}` },
    h("span", { class: "dp-khoi-t" }, h("span", { class: "dp-khoi-ma" }, k.maNgan, k.khoa ? icon("lock", 10) : null), h("span", { class: "dp-khoi-tai" }, k.tai)),
    h("span", { class: "dp-khoi-diem", "aria-hidden": "true" }, ...k.diem.map((d) => h("span", { class: d === "PICKUP" ? "dp-dot is-don" : "dp-dot is-tra" }))),
    muc ? h("span", { class: "dp-khoi-bar", "aria-hidden": "true" }) : null,
  );
  if (muc) el.style.setProperty("--dp-tai", String(tyLeTai(c.tai, c.xe.soCho)));
  el.style.setProperty("--dp-x", String(k.trai));
  el.style.setProperty("--dp-dai", String(k.dai));
  el.addEventListener("click", () => {
    chon = chon === k.id ? null : k.id;
    veXe();
    document.querySelector<HTMLElement>(`.dp-khoi[data-chuyen="${k.id}"]`)?.focus({ preventScroll: true });
  });
  if (co.dieuPhoi && c.trangThai === "PLANNED") {
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.classList.add("is-tha");
    });
    el.addEventListener("dragleave", () => el.classList.remove("is-tha"));
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("is-tha");
      const legId = e.dataTransfer?.getData("text/plain");
      const x = changChuaXep(lich!).find((v) => v.chang.legId === legId);
      if (x) moXep([{ chang: x.chang, conLai: x.conLai }], k.id, el);
    });
  }
  return el;
}

/** Thẻ "chuyến đang chọn" dưới dòng thời gian (bản vẽ 1a). */
function theChon(): HTMLElement | null {
  const c = lich!.chuyen.find((x) => x.id === chon);
  if (!c) return co.dieuPhoi || lich!.chuyen.length ? h("div", { class: "dp-col-note dp-chon-goi-y" }, "Bấm một chuyến trên dòng thời gian để xem nhanh.") : null;
  const k = kieuChuyen(c);
  const t = tuyenChuyen(c.diem);
  const tuyen: Child[] = [];
  t.don.forEach((d, i) => tuyen.push(i ? h("span", { class: "dp-route-sep" }, "→") : null, h("span", null, d)));
  if (t.tra.length) t.tra.forEach((d, i) => tuyen.push(h("span", { class: i ? "dp-route-sep" : "dp-route-arrow" }, i ? "·" : "►"), h("span", null, d)));
  const muc = c.trangThai === "PLANNED" ? mucTai(c.tai, c.xe.soCho) : null;
  const noiDoi = c.trangThai === "PLANNED" && c.lyDoGiu.some((x) => x.ma === "NOI_HEN_DOI") && co.dieuPhoi;
  const capNhat = noiDoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") : null;
  capNhat?.addEventListener("click", () => void capNhatDiem(c, capNhat));
  // Vòng 5e (R-P29): "Cập nhật khách theo đơn" cạnh "Cập nhật điểm theo đơn" — cùng điều kiện (chuyến lên kế hoạch + ô điều phối); lý do giữ nút gỡ được
  // (ADR-0104 Đ2.11 — `giuCapNhatKhach`: khách đổi, đơn huỷ, chặng đã bỏ, đơn không xác nhận, thừa suất).
  const khachDoi = c.trangThai === "PLANNED" && giuCapNhatKhach(c.lyDoGiu).length > 0 && co.dieuPhoi;
  const capNhatKh = khachDoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-khach" }, NUT_CAP_NHAT_KHACH) : null;
  capNhatKh?.addEventListener("click", () => void capNhatKhach(c, capNhatKh));
  return h(
    "section",
    { class: "vc-card dp-chon", "aria-label": `Chuyến đang chọn ${c.ma}` },
    h("div", { class: "dp-chon-head" }, h("span", { class: "dp-chon-ma" }, c.ma), chip(k.nhan, TONE_KIEU[k.kieu]), c.khanCap ? chip(NHAN_KHAN_CAP, "warn") : null, muc === "GAN_DAY" || muc === "DAY" ? chip(NHAN_MUC_TAI[muc], "warn") : muc === "VUOT" ? chip(NHAN_MUC_TAI[muc], "danger") : null, h("span", { class: "dp-chon-tag" }, "Đang chọn")),
    h("div", { class: "dp-chon-line" }, `${c.xe.bienSo} · ${c.xe.soCho} chỗ · ${c.taiXe?.ten ?? "Chưa có tài xế"} · `, gioChuyen(c), " · tải ", h("strong", null, `${c.tai}/${c.xe.soCho}`)),
    tuyen.length ? h("div", { class: "dp-route" }, ...tuyen) : null,
    c.trangThai === "PLANNED" && c.lyDoGiu.length ? h("div", { class: "dp-chon-giu" }, c.lyDoGiu.map((x) => x.loiNhan).join("; ")) : null,
    c.khoaMoc.dangKhoa && c.trangThai === "PLANNED" ? h("div", { class: "dg-lock dp-chon-lock" }, icon("lock", 14), cauKhoaMoc(lich!.mocToiThieuPhut, co)) : null,
    h("div", { class: "dp-chon-actions" }, h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen?id=${encodeURIComponent(c.id)}`, "data-action": "mo-chuyen" }, "Mở chuyến"), capNhat, capNhatKh),
  );
}
const TONE_KIEU = { plan: "unit", run: "navy", done: "ok", held: "danger", nodrv: "warn", cancel: "muted" } as const;
const gioChuyen = (c: ChuyenTomTatDto) => `${c.batDau.ngay === ngay ? c.batDau.gio : `${c.batDau.gio} ${ngayNgan(c.batDau.ngay, ngay)}`}–${c.ketThuc.ngay === ngay ? c.ketThuc.gio : `${c.ketThuc.gio} ${ngayNgan(c.ketThuc.ngay, ngay)}`}`;

function veCanXuLy(viec: ViecCanXuLy[]): void {
  replaceChildren(
    cotCxl,
    dauCot("Cần xử lý", viec.length),
    co.dieuPhoi ? null : h("div", { class: "dp-readonly" }, "Chỉ xem — Kế toán không xếp xe, không điều chỉnh khẩn cấp hay phá lệ."),
    ...(viec.length ? viec.map(mucViec) : [h("div", { class: "dp-col-empty" }, "Không có việc cần xử lý.")]),
  );
}
function mucViec(v: ViecCanXuLy): HTMLElement {
  const nut = v.hanhDong.map((a) => {
    if (a.kieu === "link") return h("a", { class: "vc-btn vc-btn-ghost-primary dp-cxl-btn", href: a.href }, a.nhan);
    if (a.kieu === "goi-bao") {
      const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-cxl-btn", "data-action": "da-goi-bao", "data-leg": a.legId }, a.nhan);
      b.addEventListener("click", () => void daGoiBao(a, b));
      return b;
    }
    const c = lich!.chuyen.find((x) => x.id === a.tripId)!;
    const khach = a.kieu === "cap-nhat-khach";
    const b = h("button", { type: "button", class: "vc-btn btn btn-primary dp-cxl-btn", "data-action": khach ? "cap-nhat-khach" : "cap-nhat-diem" }, a.nhan);
    b.addEventListener("click", () => void (khach ? capNhatKhach(c, b) : capNhatDiem(c, b)));
    return b;
  });
  return h(
    "div",
    { class: "dp-cxl" },
    h("span", { class: `dp-cxl-loai is-${v.tone}` }, icon(v.bieuTuong, 14), v.loai),
    v.href ? h("a", { class: "dp-cxl-tieu-de", href: v.href }, v.tieuDe) : h("span", { class: "dp-cxl-tieu-de" }, v.tieuDe),
    v.noiDung ? h("span", { class: "dp-cxl-text" }, v.noiDung) : null,
    h("span", { class: "dp-cxl-ai" }, `Ai xử lý: ${v.aiXuLy}`),
    v.khoa ? h("span", { class: "dg-lock dp-cxl-khoa" }, icon("lock", 16), v.khoa) : null,
    nut.length ? h("div", { class: "dp-cxl-actions" }, ...nut) : null,
  );
}

// ---- lệnh ----------------------------------------------------------------------------------------------------------------------------------------------------
/** ADR-0051: "Đã gọi báo" (thân: phienBan + giờ "mới" màn đã hiện) → dải "Đã ghi … — Bỏ đánh dấu"; 409 → câu hằng + "Tải lại". */
const lenhGoiBao = new Map<string, ReturnType<typeof taoLenh>>();
const guiGoiBao = (url: string, than: Record<string, unknown>) => {
  let l = lenhGoiBao.get(url);
  if (!l) lenhGoiBao.set(url, (l = taoLenh()));
  return l.gui<GoiBaoChangDto>(url, "POST", than);
};
const loiGoiBao = (e: unknown): HTMLElement => {
  if (e instanceof ApiError && e.code in NHAN_TU_CHOI_GOI_BAO) return dai("warning", NHAN_TU_CHOI_GOI_BAO[e.code as MaTuChoiGoiBao], [], () => void nap());
  const l = docLoiLenh(e);
  return dai("danger", l.tieuDe, l.dong);
};
async function daGoiBao(a: { legId: string; phienBan: number; gioMoi: { ngay: string; gio: string | null }; maDon: string }, nut: HTMLButtonElement): Promise<void> {
  nut.disabled = true;
  try {
    const r = await guiGoiBao(`/api/van-chuyen/chang/${encodeURIComponent(a.legId)}/da-goi-bao`, { phienBan: a.phienBan, gioMoi: a.gioMoi });
    const bo = r.daGoiBao?.boDuoc ? h("button", { type: "button", class: "btn", "data-action": "bo-danh-dau" }, "Bỏ đánh dấu") : null;
    bo?.addEventListener("click", async () => {
      bo.disabled = true;
      try {
        await guiGoiBao(`/api/van-chuyen/chang/${encodeURIComponent(a.legId)}/bo-danh-dau-goi-bao`, { phienBan: r.daGoiBao!.phienBan });
        baoKetQua(dai("info", `Đã bỏ đánh dấu — mục gọi báo khách ${a.maDon} hiện lại.`));
      } catch (e) {
        baoKetQua(loiGoiBao(e));
      }
      await nap();
    });
    baoKetQua(dai("ok", `Đã ghi: đã gọi báo khách ${a.maDon}`, [], undefined, bo ? [h("div", { class: "banner-actions" }, bo)] : []));
  } catch (e) {
    baoKetQua(loiGoiBao(e));
  }
  await nap();
}

const lenhDiem = taoLenh();
async function capNhatDiem(c: ChuyenTomTatDto, nut: HTMLButtonElement): Promise<void> {
  nut.disabled = true;
  try {
    const r = await lenhDiem.gui<CapNhatDiemResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-diem`, "POST", { version: c.version });
    baoKetQua(r.daCapNhat > 0 ? dai("ok", `Đã cập nhật điểm theo đơn — ${c.ma}`, [`Đổi điểm cho ${r.daCapNhat} khách theo nơi đón / trả mới của đơn.`]) : dai("info", `Không có điểm nào cần cập nhật — ${c.ma}`));
  } catch (e) {
    const l = docLoiLenh(e);
    baoKetQua(l.cu ? dai("warning", "Chuyến vừa được người khác sửa — đã tải lại bảng, bấm lại nếu vẫn cần.") : dai("danger", l.tieuDe, l.dong));
  }
  await nap();
}
/** Vòng 5e (R-P29): "Cập nhật khách theo đơn" — khuôn `capNhatDiem`; bảng không hiện tên khách nên chỉ `nap()` lại (tên đọc ở Chi tiết chuyến — GA-55). */
const lenhKhach = taoLenh();
async function capNhatKhach(c: ChuyenTomTatDto, nut: HTMLButtonElement): Promise<void> {
  nut.disabled = true;
  try {
    const r = await lenhKhach.gui<CapNhatKhachResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-khach`, "POST", { version: c.version });
    baoKetQua(r.daCapNhat > 0 ? dai("ok", `Đã cập nhật khách theo đơn — ${c.ma}`, [`Cập nhật ${r.daCapNhat} chỗ theo khách hiện có của đơn.`]) : dai("info", `Không có khách nào cần cập nhật — ${c.ma}`));
  } catch (e) {
    const l = docLoiLenh(e);
    baoKetQua(l.cu ? dai("warning", "Chuyến vừa được người khác sửa — đã tải lại bảng, bấm lại nếu vẫn cần.") : dai("danger", l.tieuDe, l.dong));
  }
  await nap();
}
function baoKetQua(el: HTMLElement): void {
  for (const x of [...bannerEl.children]) if (x.id !== "dp-chinh-sach-rong") x.remove();
  bannerEl.append(el);
  el.scrollIntoView({ block: "nearest" });
}

const lenhXep = taoLenh();
const lenhTao = taoLenh();
interface DoiXep { chang: ChangLichDto; conLai: number }
/**
 * Hộp "Xếp vào chuyến" (C32, C34): MỘT chặng → chọn chuyến + số khách (1..còn lại — ít hơn = tách đoàn); NHIỀU chặng → xếp TRỌN từng chặng trong MỘT lệnh
 * (`POST …/phan-bo` nhận cả danh sách; một chặng sai thì cả lệnh không chạy — máy chủ quyết). Chuyến hợp (không đầy, giờ hẹn trong khung) lên đầu; chuyến đầy /
 * lệch giờ vẫn chọn được nhưng mờ và có chữ lý do (`luaChonChuyenXep`) — chỉ nhắc, không tự chặn (ADR-0096 Đ3.5).
 */
function moXep(doi: DoiXep[], chuyenId: string | null, opener: HTMLElement): void {
  if (doi.length === 0) return;
  const nhieu = doi.length > 1;
  const c = doi[0]!.chang;
  const conLai = doi[0]!.conLai;
  const tongKhach = doi.reduce((n, d) => n + d.conLai, 0);
  const lua = luaChonChuyenXep(lich!, doi.map((d) => ({ chang: d.chang, soKhach: d.conLai })));
  let den = lua.some((x) => x.chuyen.id === chuyenId) ? chuyenId : null;
  let so = conLai;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const ghiChuKhoa = h("div", { class: "dg-lock dg-lock-note", hidden: true });
  const ghiChuMo = h("div", { class: "dp-note dp-xep-nhac", role: "status", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: !den, "data-action": "xep-gui" }, "Xếp vào chuyến");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const veKhoa = () => {
    const x = lua.find((v) => v.chuyen.id === den);
    const khoa = !!x?.khoa && !doi.every((d) => d.chang.datGap);
    ghiChuKhoa.hidden = !khoa;
    replaceChildren(ghiChuKhoa, ...(khoa ? [icon("lock", 14), co.khanCap ? "Chuyến đã vào vùng khoá trước giờ xe chạy — khi xếp, bạn sẽ chọn lý do điều chỉnh khẩn cấp." : "Chuyến đã vào vùng khoá trước giờ xe chạy — cần người xếp xe điều chỉnh khẩn cấp."] : []));
    const nhac = x && x.mo ? x.ghiChu.filter((g) => g !== "đang khoá") : [];
    ghiChuMo.hidden = nhac.length === 0;
    replaceChildren(ghiChuMo, ...(nhac.length ? [`Lưu ý: ${nhac.join("; ")}. Bạn vẫn chọn được — nếu không xếp được, máy chủ sẽ báo.`] : []));
  };
  const taoMoi = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "tao-chuyen" }, "+ Chuyến mới");
  const nhom = lua.length
    ? nhomChon("dp-xep-chuyen", "Chuyến", lua.map((x) => ({ code: x.chuyen.id, nhan: x.nhan, phu: x.ghiChu.join(" · ") || undefined, mo: x.mo })), (id) => {
        den = id;
        chinh.disabled = false;
        loi.hidden = true;
        veKhoa();
      }, den ?? undefined)
    : h("p", { class: "dp-sheet-text" }, "Ngày này chưa có chuyến nào lên kế hoạch — tạo chuyến trước.");
  const oSo = h("input", { id: "dp-xep-so", class: "vc-input", type: "number", inputmode: "numeric", min: 1, max: conLai, value: String(conLai), "aria-describedby": "dp-xep-so-hint" });
  oSo.addEventListener("input", () => {
    so = Number(oSo.value);
  });
  const truongSo = !nhieu && conLai > 1
    ? h("div", { class: "vc-field" }, h("label", { for: "dp-xep-so" }, "Số khách xếp vào chuyến"), oSo, h("div", { id: "dp-xep-so-hint", class: "vc-hint" }, `Ít hơn ${conLai} là tách đoàn — số còn lại ở cột “Chưa xếp”.`))
    : null;
  const dongChang = (d: DoiXep) => `${d.chang.gioDon ?? "Chưa chốt giờ"} · ${d.chang.noiDon} → ${d.chang.noiTra ?? "nơi trả chưa chốt"}`;
  const tieuDe = nhieu ? `${doi.length} lượt · ${tongKhach} khách` : dongChang(doi[0]!);
  const TOI_DA_DONG = 8;
  const tomTat = nhieu
    ? h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, tieuDe),
      h("ul", { class: "dp-xep-ds", "aria-label": "Các lượt đưa đón sẽ xếp" },
        ...doi.slice(0, TOI_DA_DONG).map((d) => h("li", null, `${d.chang.maDon} · ${dongChang(d)} · ${d.conLai} khách`)),
        doi.length > TOI_DA_DONG ? h("li", null, `…và ${doi.length - TOI_DA_DONG} lượt nữa`) : null),
      h("div", { class: "dp-note" }, "Mỗi lượt được xếp trọn số khách còn lại. Một lượt không xếp được thì cả lệnh không chạy."))
    : h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, tieuDe), h("div", { class: "dp-note" }, `${c.maDon} · ${conLai} khách chưa xếp`));
  const bang = moBangTruot({
    title: "Xếp vào chuyến",
    body: [tomTat, nhom, taoMoi, ghiChuKhoa, ghiChuMo, truongSo, loi],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-xep");
  veKhoa();
  dong.addEventListener("click", () => bang.close());
  // "+ Chuyến mới" ngay trong luồng xếp (C34): đóng hộp xếp, mở bảng tạo chuyến; tạo xong → tải lại lịch rồi mở LẠI hộp xếp với chuyến mới đã chọn; đóng mà
  // không tạo → mở lại hộp xếp như cũ. Bảng điều phối không bị rời đi, lựa chọn chặng giữ nguyên.
  const moLai = async (chuyenMoi: string | null): Promise<void> => {
    if (chuyenMoi !== null) await nap();
    const con = new Map(changChuaXep(lich!).map((x) => [x.chang.legId, x.conLai]));
    const moi = doi.flatMap((d) => (con.has(d.chang.legId) ? [{ chang: d.chang, conLai: con.get(d.chang.legId)! }] : []));
    if (moi.length) moXep(moi, chuyenMoi, opener);
  };
  taoMoi.addEventListener("click", () => {
    bang.close(false);
    setTimeout(() => moTaoChuyen({ opener, onTao: (r) => moLai(r.chuyen.id), onHuy: () => void moLai(null) }), 0);
  });
  const gui = async (phaLe?: Record<string, { lyDo: string }>): Promise<ChuyenChiTietResponse> => {
    const t = lich!.chuyen.find((x) => x.id === den)!;
    return lenhXep.gui<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(t.id)}/phan-bo`, "POST", {
      version: t.version, chang: nhieu ? doi.map((d) => ({ legId: d.chang.legId, soSuat: d.conLai })) : [{ legId: c.legId, soSuat: so }], ...(phaLe ?? {}),
    });
  };
  const xong = async (r: ChuyenChiTietResponse) => {
    chon = r.chuyen.id;
    for (const d of doi) daChon.delete(d.chang.legId);
    const conDong = !nhieu && so < conLai ? [`Còn ${conLai - so} khách của ${c.maDon} ở cột “Chưa xếp”.`] : [];
    // Cảnh báo sớm (lời chủ 1/10 — chỉ nhắc, không chặn): máy chủ đã xếp; chặng chưa có nơi trả / chưa đủ tên thì xe sẽ bị giữ lúc xuất bến.
    const canhBao = (r.canhBaoXep ?? []).map((x) => `${x.loiNhan} — cần bổ sung ở đơn trước khi xe chạy.`);
    // C32: giờ hẹn nằm ngoài khung giờ chuyến — của ĐÚNG các chặng vừa xếp, ngay trong phản hồi (không đợi tải lại).
    const lechGio = canhBaoGioHenSauXep(r.canhBao ?? [], doi.map((d) => d.chang.legId)).map((x) => `${x} — chỉ nhắc, chuyến đã xếp.`);
    const tieuDeOk = nhieu ? `Đã xếp ${doi.length} lượt (${tongKhach} khách) vào ${r.chuyen.ma}` : `Đã xếp ${so} khách vào ${r.chuyen.ma}`;
    baoKetQua(dai(canhBao.length + lechGio.length > 0 ? "warning" : "ok", tieuDeOk, [...canhBao, ...lechGio, ...conDong]));
    await nap();
  };
  chinh.addEventListener("click", async () => {
    if (!den) return;
    if (!nhieu && (!Number.isInteger(so) || so < 1 || so > conLai)) {
      replaceChildren(loi, icon("alert", 16, 2), `Số khách từ 1 đến ${conLai}.`);
      loi.hidden = false;
      oSo.setAttribute("aria-invalid", "true");
      return;
    }
    oSo.removeAttribute("aria-invalid");
    bang.setBusy(true);
    chinh.disabled = true;
    loi.hidden = true;
    try {
      const r = await gui();
      bang.close(false);
      await xong(r);
    } catch (e) {
      const l = docLoiLenh(e);
      if (l.canPhaLe && l.duocPhaLe) {
        const t = lich!.chuyen.find((x) => x.id === den)!;
        bang.close(false);
        setTimeout(() => moPhaLe({
          lyDo: lich!.lyDo, opener, nutChinh: NUT_VUOT.xep[l.lop], lop: l.lop,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, nhieu ? `Xếp ${doi.length} lượt` : `Xếp lượt đưa đón ${tieuDe}`), h("div", { class: "dp-note" }, nhieu ? `${tongKhach} khách → vào ${t.ma} (xe chạy ${gioChuyen(t).split("–")[0]})` : `${c.maDon} · ${so} khách → vào ${t.ma} (xe chạy ${gioChuyen(t).split("–")[0]})`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: async (code) => {
            const r = await gui(thanPhaLe(l.lyDo.map((x) => x.ma), code, false));
            await xong(r);
          },
        }), 0);
        return;
      }
      if (l.cu) {
        await nap();
        replaceChildren(loi, icon("alert", 16, 2), "Chuyến vừa được người khác sửa — đã tải lại, bấm lại để xếp.");
      } else replaceChildren(loi, icon("alert", 16, 2), [l.tieuDe, ...l.dong].join(" "));
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/**
 * Bảng trượt "Chuyến mới" (C34): tạo chuyến NGAY trên bảng điều phối, không sang trang khác — cùng ô và cùng lệnh với /chuyen-sua (Xe, Tài xế, Giờ bắt đầu,
 * Giờ kết thúc; `POST /api/van-chuyen/chuyen`), cùng luật lỗi dưới đúng ô (`truongLoiChuyen`) và cùng hộp phá lệ khoảng nghỉ. Ô Tuyến vẫn ở trang đầy đủ (tuyến
 * không cần để tạo chuyến). Tạo xong gọi `onTao`; đóng không tạo gọi `onHuy`.
 */
function moTaoChuyen(o: { opener: HTMLElement | null; onTao: (r: ChuyenChiTietResponse) => Promise<void>; onHuy?: () => void }): void {
  const l = lich!;
  const st = { xe: "", tx: "", tu: "", den: "" };
  let tao = false;
  let sangPhaLe = false;
  const oLoi = (id: string) => h("div", { id: `${id}-error`, class: "vc-field-error", role: "alert", hidden: true });
  const baoLoi = (el: HTMLElement, loiEl: HTMLElement, cau: readonly string[]) => {
    replaceChildren(loiEl, ...(cau.length ? [icon("alert", 16, 2), cau.join(" ")] : []));
    loiEl.hidden = cau.length === 0;
    if (cau.length) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  };
  const truong = (id: string, nhan: string, el: HTMLElement, goiY: HTMLElement | null, loiEl: HTMLElement) =>
    h("div", { class: "vc-field" }, h("label", { for: id }, nhan), el, goiY, loiEl);
  const loiChung = h("div", { class: "vc-field-error", role: "alert", hidden: true });

  const selXe = h("select", { id: "dp-tao-xe", class: "vc-input", "aria-describedby": "dp-tao-xe-error" },
    h("option", { value: "" }, "Chọn xe"),
    ...l.xe.map((x) => h("option", { value: x.id, disabled: x.trangThai !== "active" }, `${x.bienSo} · ${x.soCho} chỗ · ${x.chuLaCongTy ? "xe công ty" : x.chuXe}${x.trangThai !== "active" ? " · đang bảo dưỡng" : ""}`)));
  const loiXe = oLoi("dp-tao-xe");
  selXe.addEventListener("change", () => {
    st.xe = selXe.value;
    baoLoi(selXe, loiXe, []);
  });
  const congTy = l.taiXe.filter((t) => t.loai === "CONG_TY");
  const nhaXe = new Map<string, TaiXeChonDto[]>();
  for (const t of l.taiXe.filter((x) => x.loai === "NHA_XE")) {
    const n = t.nhaXe[0] ?? "Nhà xe";
    nhaXe.set(n, [...(nhaXe.get(n) ?? []), t]);
  }
  const ban = new Map<string, string[]>();
  for (const k of banTx?.khung ?? []) ban.set(k.taiXeId, [...(ban.get(k.taiXeId) ?? []), k.nhan]);
  const opt = (t: TaiXeChonDto) => h("option", { value: t.partyId }, ban.has(t.partyId) ? `${t.ten} · Bận ${ban.get(t.partyId)!.join(", ")}` : t.ten);
  const selTx = h("select", { id: "dp-tao-tai-xe", class: "vc-input", "aria-describedby": "dp-tao-tai-xe-error" },
    h("option", { value: "" }, "Chọn tài xế"),
    congTy.length ? h("optgroup", { label: "Tài xế công ty" }, ...congTy.map(opt)) : null,
    ...[...nhaXe.entries()].map(([n, ds]) => h("optgroup", { label: `Nhà xe ${n}` }, ...ds.map(opt))));
  const loiTx = oLoi("dp-tao-tai-xe");
  selTx.addEventListener("change", () => {
    st.tx = selTx.value;
    baoLoi(selTx, loiTx, []);
  });
  const oTu = h("input", { id: "dp-tao-tu", class: "vc-input", type: "time", "aria-describedby": "dp-tao-tu-error" });
  const oDen = h("input", { id: "dp-tao-den", class: "vc-input", type: "time", "aria-describedby": "dp-tao-den-hint dp-tao-den-error" });
  const loiTu = oLoi("dp-tao-tu");
  const loiDen = oLoi("dp-tao-den");
  const goiYDen = h("div", { id: "dp-tao-den-hint", class: "vc-hint" });
  const veGoiY = () => (goiYDen.textContent = st.tu && st.den && st.den <= st.tu ? "Kết thúc sang ngày hôm sau." : "");
  oTu.addEventListener("input", () => {
    st.tu = oTu.value;
    baoLoi(oTu, loiTu, []);
    veGoiY();
  });
  oDen.addEventListener("input", () => {
    st.den = oDen.value;
    baoLoi(oDen, loiDen, []);
    veGoiY();
  });

  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "tao-chuyen-gui" }, "Tạo chuyến");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: `Chuyến mới · ${ngayNgan(ngay, homNay)}`,
    body: [
      truong("dp-tao-xe", "Xe", selXe, null, loiXe),
      truong("dp-tao-tai-xe", "Tài xế", selTx, null, loiTx),
      h("div", { class: "dp-cx-gio" }, truong("dp-tao-tu", "Giờ bắt đầu", oTu, null, loiTu), truong("dp-tao-den", "Giờ kết thúc", oDen, goiYDen, loiDen)),
      loiChung,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener: o.opener,
    onClosed: () => {
      if (!tao && !sangPhaLe) o.onHuy?.();
    },
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-tao");
  dong.addEventListener("click", () => bang.close());
  const thanTao = (phaLe?: Record<string, { lyDo: string }>): Record<string, unknown> => ({
    xeId: st.xe, taiXePartyId: st.tx, batDau: { ngay, gio: st.tu }, ketThuc: { ngay: st.den <= st.tu ? addDays(ngay, 1) : ngay, gio: st.den }, ...(phaLe ?? {}),
  });
  const gui = (phaLe?: Record<string, { lyDo: string }>) => lenhTao.gui<ChuyenChiTietResponse>("/api/van-chuyen/chuyen", "POST", thanTao(phaLe));
  chinh.addEventListener("click", async () => {
    const thieu = { xe: st.xe ? [] : ["Chọn xe."], tx: st.tx ? [] : ["Chọn tài xế."], tu: st.tu ? [] : ["Nhập giờ bắt đầu."], den: st.den ? [] : ["Nhập giờ kết thúc."] };
    baoLoi(selXe, loiXe, thieu.xe);
    baoLoi(selTx, loiTx, thieu.tx);
    baoLoi(oTu, loiTu, thieu.tu);
    baoLoi(oDen, loiDen, thieu.den);
    loiChung.hidden = true;
    if (Object.values(thieu).some((x) => x.length)) return;
    bang.setBusy(true);
    chinh.disabled = true;
    try {
      const r = await gui();
      tao = true;
      bang.close(false);
      await o.onTao(r);
    } catch (e) {
      const le = docLoiLenh(e);
      if (le.canPhaLe && le.duocPhaLe) {
        sangPhaLe = true;
        bang.close(false);
        setTimeout(() => moPhaLe({
          lyDo: l.lyDo, opener: o.opener, nutChinh: NUT_VUOT.luu[le.lop], lop: le.lop,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `Chuyến mới · ${ngayNgan(ngay, homNay)}`), h("div", { class: "dp-note" }, le.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: async (code) => {
            const r = await gui(thanPhaLe(le.lyDo.map((x) => x.ma), code, true));
            await o.onTao(r);
          },
        }), 0);
        return;
      }
      const t = truongLoiChuyen(le.lyDo, { doiXe: true, doiTaiXe: true });
      baoLoi(selXe, loiXe, t.xe);
      baoLoi(selTx, loiTx, t.taiXe);
      baoLoi(oTu, loiTu, t.gioBatDau);
      baoLoi(oDen, loiDen, t.gioKetThuc);
      const khac = [...t.khac, ...(le.lyDo.length ? [] : le.dong)];
      replaceChildren(loiChung, icon("alert", 16, 2), [le.tieuDe, ...khac].join(" "));
      loiChung.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

async function main(): Promise<void> {
  if (!can(staff, "trip.view")) {
    // Không ô trip.view (tài xế gõ thẳng địa chỉ): không dựng ô ngày / nút đổi ngày — chỉ câu từ chối.
    byId("dp-truoc").closest<HTMLElement>(".dp-date")!.hidden = true;
    byId("dp-ngay-nhan").hidden = true;
    return showError(errorEl, "Tài khoản này không xem được lịch xe.");
  }
  await nap();
}
await main();

/** ADR-0052 D6.4: đang mở bảng trượt / hộp (khuôn `.sheet[role=dialog]`) thì KHÔNG tự dựng lại trang dưới tay người dùng — lần nối lại / tin sau sẽ tải. */
const bangDangMo = (): boolean => document.querySelector('.sheet[role="dialog"]') !== null;
// ADR-0052 D6.4: chuyến nào đổi cũng tải lại lịch đang xem (gộp, không chạy hai lần song song); nối lại Bảng tin → tải lại.
// C3 (C36): tin tới LÚC đang mở bảng trượt thì nhớ lại (`choTai`) và tải ngay khi bảng đóng — không mất tin, không dựng lại trang dưới tay người dùng.
let choTai = false;
const lamMoi = taoBoLamMoi(async () => {
  if (bangDangMo()) {
    choTai = true;
    return;
  }
  choTai = false;
  await nap();
});
new MutationObserver(() => {
  if (choTai && !bangDangMo()) void lamMoi.yeuCau();
}).observe(document.body, { childList: true });
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
// C36: đơn đổi (khách, điểm, giờ hẹn, huỷ…) làm cột "Chưa xếp" lệch — tải lại lịch; lựa chọn và bộ lọc giữ nguyên (chặng không còn thì tự rời lựa chọn).
window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());

// "+ Chuyến mới" mở bảng trượt ngay trên bảng điều phối (C34); mở tab mới / nhấn phím bổ trợ vẫn đi tới trang đầy đủ /chuyen-sua.
nutMoi.addEventListener("click", (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !lich) return;
  e.preventDefault();
  moTaoChuyen({
    opener: nutMoi,
    onTao: async (r) => {
      chon = r.chuyen.id;
      baoKetQua(dai("ok", `Đã tạo chuyến ${r.chuyen.ma}`, ["Bấm “Xếp vào chuyến…” ở lượt đưa đón chưa xếp để xếp khách vào."]));
      await nap();
    },
  });
});
