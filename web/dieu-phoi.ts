// Điều phối xe (/dieu-phoi?ngay=YYYY-MM-DD) — ADR-0049 V1 (route 1, 5, 40), ADR-0050; bản vẽ docs/design/van-chuyen-dieu-phoi/project/01 Dieu phoi xe.dc.html
// (1a–1g) + dp-chua-xep, dp-dong-thoi-gian, dp-can-xu-ly; bản đối chiếu 2.1, 2.9, 2.13, H6–H8, H14, mục 4 (khoảng giờ theo dữ liệu).
// - Ba cột (máy tính): Chưa xếp · Dòng thời gian theo xe (+ thẻ chuyến đang chọn) · Cần xử lý. Điện thoại: ba thẻ (tablist) — "Chưa xếp", "Xe", "Cần xử lý".
// - Xếp khách: bấm thẻ chặng (hoặc kéo thả thẻ chặng vào một khối chuyến) → hộp "Xếp vào chuyến" (chọn chuyến, số khách — ít hơn = tách đoàn) → route 5.
//   Máy chủ đòi phá lệ (409 `canQuyen`) → Quản trị qua hộp "Phá lệ"; không có nút "Phá lệ" đứng riêng (2.13); chặng đặt gấp không cần phá lệ (máy chủ quyết — 2.1).
// - Khoá theo mốc: chỉ theo cờ `khoaMoc` của từng chuyến (R-P13). Vạch mốc trên dòng thời gian vẽ từ `mocToiThieuPhut` (R-P12) — chỉ để nhìn, KHÔNG tô vùng
//   khoá theo giờ hiện tại (lệnh điều phối vòng 3).
// - Kế toán (ô trip.view, không trip.dispatch): xem đủ, không nút, dải "Chỉ xem". Không "Gọi tài xế" (H7), không "Đã gọi báo" (Q2 / ADR-0051 — Task B-GB sau).
// - CHỜ A15: thẻ chuyến đang chạy (mốc tiến độ, "giờ do văn phòng khai") — chưa dựng.
import {
  cauKhoaMoc, changChuaXep, chipChang, chuyenXepDuoc, hinhDongThoiGian, kieuChuyen, nhanNgayXem, soLieuDieuPhoi, tuyenChuyen, viecCanXuLy,
  type HangXe, type KhoiChuyen, type ViecCanXuLy,
} from "../src/shared/dieu-phoi-man";
import type { ChangLichDto, ChuyenChiTietResponse, ChuyenTomTatDto, CapNhatDiemResponse, CapNhatKhachResponse, GoiBaoChangDto, LichChungResponse, NhacGoiKhachResponse } from "../src/shared/contracts";
import { NUT_CAP_NHAT_KHACH } from "../src/shared/ly-do-giu";
import { NHAN_TU_CHOI_GOI_BAO, type MaTuChoiGoiBao } from "../src/shared/goi-bao";
import { ApiError } from "./api";
import { can } from "../src/shared/permissions";
import { nhanThoiLuong } from "../src/shared/chinh-sach-hien-thi";
import { addDays, isISODate, vnToday } from "../src/shared/vn-date";
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
const co = { dieuPhoi: can(staff, "trip.dispatch"), phaLe: can(staff, "trip.override"), quanLyXe: can(staff, "vehicle.manage") };
const homNay = vnToday(new Date());
const tu = new URLSearchParams(location.search).get("ngay");
let ngay = tu && isISODate(tu) ? tu : homNay;
let lich: LichChungResponse | null = null;
/** ADR-0051: danh sách nhắc "gọi báo khách" (theo HÔM NAY, không theo ngày đang xem) — tải lại cùng mỗi lần tải lịch. */
let nhac: NhacGoiKhachResponse | null = null;
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
    [lich, nhac] = await Promise.all([
      api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${ngay}`),
      api<NhacGoiKhachResponse>("/api/van-chuyen/nhac-goi-khach").catch(() => null),
    ]);
  } catch (e) {
    trangEl.hidden = true;
    return showError(errorEl, loiCua(e));
  }
  errorEl.hidden = true;
  if (chon && !lich.chuyen.some((c) => c.id === chon)) chon = null;
  ve();
}

function doiNgay(moi: string): void {
  if (!isISODate(moi) || moi === ngay) return;
  ngay = moi;
  chon = null;
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

  const moc = [s.satMoc ? `${s.satMoc} sát mốc` : null, s.quaMoc ? `${s.quaMoc} quá mốc` : null].filter(Boolean).join(" · ");
  const o = (nhan: string, so: number, phu = "", tone = "") =>
    h("div", { class: "dp-stat" }, h("span", { class: "dp-stat-k" }, nhan), h("span", { class: "dp-stat-v" }, h("span", { class: "dp-stat-n" }, String(so)), phu ? h("span", { class: `dp-stat-sub ${tone}` }, phu) : null));
  replaceChildren(
    soEl,
    o("CHẶNG", s.chang),
    o("ĐÃ XẾP", s.daXep),
    o("CHƯA XẾP", s.chuaXep, moc, "is-danger"),
    o("CHUYẾN", s.chuyen, s.biGiu ? `${s.biGiu} bị giữ` : "", "is-danger"),
    o("CẦN XỬ LÝ", s.canXuLy),
    o("ĐƠN NHÁP", s.nhap, s.choDatGap ? "chờ duyệt đặt gấp" : "", "is-sand"),
  );
  const om = (nhan: string, so: number, danger = false) => h("div", { class: "dp-stat-m" }, h("span", { class: danger && so > 0 ? "dp-stat-n is-danger" : "dp-stat-n" }, String(so)), h("span", { class: "dp-stat-k" }, nhan));
  replaceChildren(soMEl, om("chặng", s.chang), om("đã xếp", s.daXep), om("chưa xếp", s.chuaXep, true), om("chuyến", s.chuyen));
  soPhuEl.textContent = [s.chuaXep ? `Chưa xếp: ${[s.satMoc ? `${s.satMoc} sát mốc` : null, s.quaMoc ? `${s.quaMoc} quá mốc` : null].filter(Boolean).join(", ") || "chưa tới mốc"}` : null, s.nhap ? `${s.nhap} đơn nháp` : null].filter(Boolean).join(" · ");

  veTabs(s.chuaXep, s.chuyen, s.canXuLy);
  veChuaXep();
  veXe();
  veCanXuLy(viec);
  trangEl.hidden = false;
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

function veChuaXep(): void {
  const ds = changChuaXep(lich!);
  replaceChildren(
    cotChua,
    dauCot("Chưa xếp", ds.length),
    co.dieuPhoi && ds.length ? h("div", { class: "dp-col-note dp-chi-may-tinh" }, "Kéo chặng thả vào một chuyến, hoặc bấm chặng để chọn chuyến") : null,
    ...(ds.length ? ds.map(({ chang: c, conLai }) => theChang(c, conLai)) : [h("div", { class: "dp-col-empty" }, "Không còn chặng nào chưa xếp.")]),
  );
}
function theChang(c: ChangLichDto, conLai: number): HTMLElement {
  const noiDung: Child[] = [
    h("span", { class: "dp-leg-top" }, h("span", { class: "dp-leg-gio" }, c.gioDon ?? "Chưa chốt giờ"), ...chipChang(c).map((x) => chip(x.nhan, x.tone)),
      c.soHieuChuyenBay ? h("span", { class: "chip chip-code" }, `✈︎ ${c.soHieuChuyenBay}`) : null),
    h("span", { class: "dp-leg-tuyen" }, `${c.noiDon} → ${c.noiTra ?? "nơi trả chưa chốt"}`),
    h("span", { class: "dp-leg-meta" }, `${c.maDon} · ${conLai < c.soNguoi ? `còn ${conLai}/${c.soNguoi}` : conLai} khách`),
  ];
  if (!co.dieuPhoi) return h("div", { class: "dp-leg", "data-leg": c.legId }, ...noiDung);
  const b = h("button", { type: "button", class: "dp-leg is-xep", draggable: "true", "data-leg": c.legId, "aria-label": `Xếp chặng ${c.gioDon ?? ""} ${c.noiDon}, ${c.maDon}, ${conLai} khách${c.soHieuChuyenBay ? `, chuyến bay ${c.soHieuChuyenBay}` : ""} vào chuyến` },
    ...noiDung, h("span", { class: "dp-leg-pill", "aria-hidden": "true" }, "Xếp vào chuyến…"));
  b.addEventListener("click", () => moXep(c, conLai, null, b));
  b.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", c.legId);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    b.classList.add("is-keo");
  });
  b.addEventListener("dragend", () => b.classList.remove("is-keo"));
  return b;
}

function veXe(): void {
  const l = lich!;
  const hinh = hinhDongThoiGian(l, Date.now());
  const soChuyen = l.chuyen.filter((c) => c.trangThai !== "CANCELLED").length;
  const tl = h("div", { class: "dp-tl" });
  tl.style.setProperty("--dp-so-gio", String(hinh.gioCuoi - hinh.gioDau));
  const thuoc = h("div", { class: "dp-tl-thuoc" }, h("div", { class: "dp-tl-nhan" }), h("div", { class: "dp-tl-duong" }, ...hinh.nhanGio.map((g) => viTri(h("span", { class: "dp-tl-gio" }, g.nhan), g.x))));
  append(tl, [thuoc]);
  for (const n of hinh.nhom) {
    append(tl, [h("div", { class: "dp-tl-nhom" }, h("span", { class: "dp-tl-nhom-t" }, n.tieuDe))]);
    for (const hang of n.hang) {
      const duong = h("div", { class: "dp-tl-duong" }, ...hang.khoi.map(khoi));
      append(tl, [h("div", { class: "dp-tl-hang" }, nhanHang(hang), duong)]);
    }
  }
  if (!hinh.nhom.length) append(tl, [h("div", { class: "dp-col-empty" }, "Chưa có xe nào.")]);
  if (hinh.bayGio) append(tl, [viTri(h("div", { class: "dp-tl-bay-gio", "aria-hidden": "true" }, h("span", null, hinh.bayGio.nhan)), hinh.bayGio.x)]);
  if (hinh.moc) append(tl, [viTri(h("div", { class: "dp-tl-moc", "aria-hidden": "true" }, h("span", null, hinh.moc.nhan)), hinh.moc.x)]);
  const cuon = h("div", { class: "dp-tl-cuon", tabindex: 0, role: "region", "aria-label": "Dòng thời gian theo xe — cuộn ngang" }, tl);
  const mocNhan = l.mocToiThieuPhut === null ? "Mốc" : `Mốc ${nhanThoiLuong(l.mocToiThieuPhut)}`;
  const the = h(
    "section",
    { class: "vc-card dp-tl-card", "aria-labelledby": "dp-tl-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "dp-tl-title", class: "dp-card-title" }, "Dòng thời gian theo xe"), chip(`${soChuyen} chuyến`, "muted")),
    h("div", { class: "dp-tl-legend" },
      ...([["plan", "Lên kế hoạch"], ["run", "Đang chạy"], ["done", "Xong"], ["held", "Bị giữ"], ["nodrv", "Chưa có tài xế"]] as const).map(([k, t]) => h("span", { class: "dp-lg" }, h("span", { class: `dp-lg-o is-${k}` }), t)),
      h("span", { class: "dp-lg" }, h("span", { class: "dp-lg-bay-gio" }), "Bây giờ"),
      h("span", { class: "dp-lg" }, h("span", { class: "dp-lg-moc" }), mocNhan)),
    cuon,
    h("div", { class: "dp-tl-note" }, "Chuyến có ", icon("lock", 12), " đang trong vùng khoá trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. ● điểm đón · ■ điểm trả."),
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

function viTri(el: HTMLElement, x: number): HTMLElement {
  el.style.setProperty("--dp-x", String(x));
  return el;
}

function nhanHang(hang: HangXe): HTMLElement {
  return h("div", { class: "dp-tl-nhan" }, h("span", { class: "dp-tl-bien" }, hang.bienSo), h("span", { class: "dp-tl-cho" }, hang.soCho), h("span", { class: hang.thieuTaiXe ? "dp-tl-tx is-thieu" : "dp-tl-tx" }, hang.taiXe));
}
function khoi(k: KhoiChuyen): HTMLElement {
  const c = lich!.chuyen.find((x) => x.id === k.id)!;
  const el = h(
    "button",
    { type: "button", class: `dp-khoi is-${k.kieu}${chon === k.id ? " is-chon" : ""}`, "data-chuyen": k.id, "aria-pressed": String(chon === k.id), "aria-label": `${k.ma}, ${k.gio}, ${k.nhan}, tải ${k.tai}${k.khoa ? ", đang khoá" : ""}`, title: `${k.ma} · ${k.gio} · ${k.tai}` },
    h("span", { class: "dp-khoi-t" }, h("span", { class: "dp-khoi-ma" }, k.maNgan, k.khoa ? icon("lock", 10) : null), h("span", { class: "dp-khoi-tai" }, k.tai)),
    h("span", { class: "dp-khoi-diem", "aria-hidden": "true" }, ...k.diem.map((d) => h("span", { class: d === "PICKUP" ? "dp-dot is-don" : "dp-dot is-tra" }))),
  );
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
      if (x) moXep(x.chang, x.conLai, k.id, el);
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
  const noiDoi = c.trangThai === "PLANNED" && c.lyDoGiu.some((x) => x.ma === "NOI_HEN_DOI") && co.dieuPhoi;
  const capNhat = noiDoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") : null;
  capNhat?.addEventListener("click", () => void capNhatDiem(c, capNhat));
  // Vòng 5e (R-P29): "Cập nhật khách theo đơn" cạnh "Cập nhật điểm theo đơn" — cùng điều kiện (chuyến lên kế hoạch + ô điều phối), lý do giữ KHACH_DA_DOI.
  const khachDoi = c.trangThai === "PLANNED" && c.lyDoGiu.some((x) => x.ma === "KHACH_DA_DOI") && co.dieuPhoi;
  const capNhatKh = khachDoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-khach" }, NUT_CAP_NHAT_KHACH) : null;
  capNhatKh?.addEventListener("click", () => void capNhatKhach(c, capNhatKh));
  return h(
    "section",
    { class: "vc-card dp-chon", "aria-label": `Chuyến đang chọn ${c.ma}` },
    h("div", { class: "dp-chon-head" }, h("span", { class: "dp-chon-ma" }, c.ma), chip(k.nhan, TONE_KIEU[k.kieu]), h("span", { class: "dp-chon-tag" }, "Đang chọn")),
    h("div", { class: "dp-chon-line" }, `${c.xe.bienSo} · ${c.xe.soCho} chỗ · ${c.taiXe?.ten ?? "Chưa có tài xế"} · `, gioChuyen(c), " · tải ", h("strong", null, `${c.tai}/${c.xe.soCho}`)),
    tuyen.length ? h("div", { class: "dp-route" }, ...tuyen) : null,
    c.trangThai === "PLANNED" && c.lyDoGiu.length ? h("div", { class: "dp-chon-giu" }, c.lyDoGiu.map((x) => x.loiNhan).join("; ")) : null,
    c.khoaMoc.dangKhoa && c.trangThai === "PLANNED" ? h("div", { class: "dg-lock dp-chon-lock" }, icon("lock", 14), cauKhoaMoc(lich!.mocToiThieuPhut, co)) : null,
    h("div", { class: "dp-chon-actions" }, h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen?id=${encodeURIComponent(c.id)}`, "data-action": "mo-chuyen" }, "Mở chuyến"), capNhat, capNhatKh),
  );
}
const TONE_KIEU = { plan: "unit", run: "navy", done: "ok", held: "danger", nodrv: "warn", cancel: "muted" } as const;
const gioChuyen = (c: ChuyenTomTatDto) => `${c.batDau.ngay === ngay ? c.batDau.gio : `${c.batDau.gio} ${c.batDau.ngay.slice(8, 10)}/${c.batDau.ngay.slice(5, 7)}`}–${c.ketThuc.ngay === ngay ? c.ketThuc.gio : `${c.ketThuc.gio} ${c.ketThuc.ngay.slice(8, 10)}/${c.ketThuc.ngay.slice(5, 7)}`}`;

function veCanXuLy(viec: ViecCanXuLy[]): void {
  replaceChildren(
    cotCxl,
    dauCot("Cần xử lý", viec.length),
    co.dieuPhoi ? null : h("div", { class: "dp-readonly" }, "Chỉ xem — Kế toán không xếp xe, không phá lệ."),
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
/** Hộp "Xếp vào chuyến": chọn chuyến (chỉ chuyến lên kế hoạch), số khách (1..còn lại — ít hơn = tách đoàn). */
function moXep(c: ChangLichDto, conLai: number, chuyenId: string | null, opener: HTMLElement): void {
  const ds = chuyenXepDuoc(lich!);
  let den = ds.some((x) => x.chuyen.id === chuyenId) ? chuyenId : null;
  let so = conLai;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const ghiChuKhoa = h("div", { class: "dg-lock dg-lock-note", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: !den, "data-action": "xep-gui" }, "Xếp vào chuyến");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const veKhoa = () => {
    const x = ds.find((v) => v.chuyen.id === den);
    const khoa = !!x?.khoa && !c.datGap;
    ghiChuKhoa.hidden = !khoa;
    replaceChildren(ghiChuKhoa, ...(khoa ? [icon("lock", 14), co.phaLe ? "Chuyến đã vào vùng khoá trước giờ xuất bến — khi xếp, bạn sẽ chọn lý do phá lệ." : "Chuyến đã vào vùng khoá trước giờ xuất bến — cần Quản trị phá lệ."] : []));
  };
  const nhom = ds.length
    ? nhomChon("dp-xep-chuyen", "Chuyến", ds.map((x) => ({ code: x.chuyen.id, nhan: x.nhan, phu: x.khoa ? "đang khoá" : undefined })), (id) => {
        den = id;
        chinh.disabled = false;
        loi.hidden = true;
        veKhoa();
      }, den ?? undefined)
    : h("p", { class: "dp-sheet-text" }, "Ngày này chưa có chuyến nào lên kế hoạch — tạo chuyến trước.", " ", h("a", { href: `/chuyen-sua?ngay=${ngay}` }, "+ Chuyến mới"));
  const oSo = h("input", { id: "dp-xep-so", class: "vc-input", type: "number", inputmode: "numeric", min: 1, max: conLai, value: String(conLai), "aria-describedby": "dp-xep-so-hint" });
  oSo.addEventListener("input", () => {
    so = Number(oSo.value);
  });
  const truongSo = conLai > 1
    ? h("div", { class: "vc-field" }, h("label", { for: "dp-xep-so" }, "Số khách xếp vào chuyến"), oSo, h("div", { id: "dp-xep-so-hint", class: "vc-hint" }, `Ít hơn ${conLai} là tách đoàn — số còn lại ở cột “Chưa xếp”.`))
    : null;
  const tieuDe = `${c.gioDon ?? "Chưa chốt giờ"} · ${c.noiDon} → ${c.noiTra ?? "nơi trả chưa chốt"}`;
  const bang = moBangTruot({
    title: "Xếp vào chuyến",
    body: [h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, tieuDe), h("div", { class: "dp-note" }, `${c.maDon} · ${conLai} khách chưa xếp`)), nhom, ghiChuKhoa, truongSo, loi],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-xep");
  veKhoa();
  dong.addEventListener("click", () => bang.close());
  const gui = async (phaLe?: string): Promise<ChuyenChiTietResponse> => {
    const t = lich!.chuyen.find((x) => x.id === den)!;
    return lenhXep.gui<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(t.id)}/phan-bo`, "POST", {
      version: t.version, chang: [{ legId: c.legId, soSuat: so }], ...(phaLe ? { phaLe: { lyDo: phaLe } } : {}),
    });
  };
  const xong = async (r: ChuyenChiTietResponse) => {
    chon = r.chuyen.id;
    const conDong = so < conLai ? [`Còn ${conLai - so} khách của ${c.maDon} ở cột “Chưa xếp”.`] : [];
    // Cảnh báo sớm (lời chủ 1/10 — chỉ nhắc, không chặn): máy chủ đã xếp; chặng chưa có nơi trả / chưa đủ tên thì xe sẽ bị giữ lúc xuất bến.
    const canhBao = (r.canhBaoXep ?? []).map((x) => `${x.loiNhan} — cần bổ sung ở đơn trước khi xe chạy.`);
    baoKetQua(dai(canhBao.length > 0 ? "warning" : "ok", `Đã xếp ${so} khách vào ${r.chuyen.ma}`, [...canhBao, ...conDong]));
    await nap();
  };
  chinh.addEventListener("click", async () => {
    if (!den) return;
    if (!Number.isInteger(so) || so < 1 || so > conLai) {
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
          lyDo: lich!.lyDo, opener, nutChinh: "Phá lệ và xếp",
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `Xếp chặng ${tieuDe}`), h("div", { class: "dp-note" }, `${c.maDon} · ${so} khách → vào ${t.ma} (xuất bến ${gioChuyen(t).split("–")[0]})`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: async (code) => {
            const r = await gui(code);
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
const lamMoi = taoBoLamMoi(async () => {
  if (!bangDangMo()) await nap();
});
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
