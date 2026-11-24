// Danh sách xe (/xe — ADR-0040 D1). GET /api/van-chuyen/xe (ô vehicle.manage — Quản trị, Toàn quyền); lọc trạng thái ở trình duyệt.
// Bố cục: khuôn Danh sách của khung gốc (ADR-0222) — thanh lọc + nút «Thêm xe» ở mép phải, một khối bảng: khối từ 800 là bảng, hẹp hơn là danh sách dòng
// (cả dòng là liên kết mở chi tiết xe).
// Cảnh báo giấy tờ luôn có biểu tượng + chữ (không chỉ màu). Giao diện chỉ ẩn/hiện — máy chủ luôn kiểm lại.
// ADR-0048 D1 (Task B3, khuôn sẵn — chủ chọn Q2 = (a)): xe của nhà xe có dòng phụ "Nhà xe: <tên>"; ô lọc "Chủ xe" (Tất cả / công ty / từng nhà xe) gọi ?chu= —
// chỉ hiện khi đã có nhà xe đang hợp tác.
import { LOC_XE, canhBaoXe, demLocXe, hopLoc, luaChonChuXe, tenXe, type LocXe } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { alertEl, chipTrangThaiXe, datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const filtersEl = byId("vc-filters");
const khoiEl = byId("xe-khoi");
const cardsEl = byId("xe-cards");
const tableEl = byId("xe-table");
const rowsEl = byId("xe-rows");
const emptyEl = byId("xe-empty");
const filterEmptyEl = byId("xe-filter-empty");
const chuLocEl = byId("xe-chu-loc");
const chuSel = byId<HTMLSelectElement>("xe-chu");
let loc: LocXe = "all";
let xe: Api.VehicleDto[] = [];
/** Dòng phụ "Nhà xe: <tên>" khi chủ xe không phải công ty chủ hiện tại (ADR-0048 D1). */
const dongNhaXe = (v: Api.VehicleDto): HTMLElement | null => (v.ownerIsCompany ? null : h("span", { class: "o-phu" }, `Nhà xe: ${v.ownerName}`));
const duongXe = (v: Api.VehicleDto): string => `/xe-chi-tiet?id=${encodeURIComponent(v.id)}`;

/** Dòng của danh sách (khối hẹp hơn 800): cả dòng là liên kết mở chi tiết xe. */
function the(v: Api.VehicleDto): HTMLElement {
  const cb = canhBaoXe(v);
  return h(
    "a",
    { class: "dong", href: duongXe(v) },
    h(
      "span",
      { class: "dong-chu" },
      h("strong", null, v.plateNumber),
      h("span", { class: "o-phu" }, `${tenXe(v)} · ${v.passengerCapacity} người`),
      dongNhaXe(v),
      h("span", null, chipTrangThaiXe(v.status)),
      cb && alertEl(cb.tone, cb.text),
    ),
    icon("next", 20),
  );
}

/** Dòng của bảng (khối từ 800): biển số là liên kết mở chi tiết xe. */
function hang(v: Api.VehicleDto): HTMLElement {
  const cb = canhBaoXe(v);
  return h(
    "tr",
    null,
    h("td", { "data-gon": "" }, h("a", { href: duongXe(v) }, h("strong", null, v.plateNumber))),
    h("td", null, tenXe(v), dongNhaXe(v)),
    h("td", { "data-gon": "" }, `${v.passengerCapacity} người`),
    h("td", null, chipTrangThaiXe(v.status)),
    // Máy chủ không cho biết xe có giấy tờ nào không (xe mới chưa nhập giấy cũng "none") — ghi câu luôn đúng.
    h("td", null, cb ? h("span", { class: `vc-xe-docs vc-tone-${cb.tone}` }, icon("alert", 16, 2), h("span", null, cb.text)) : h("span", { class: "o-phu" }, "Không có giấy sắp hết hạn")),
    h("td", null, icon("next", 18)),
  );
}

function ve(): void {
  replaceChildren(
    filtersEl,
    ...LOC_XE.map((l) => {
      const b = h("button", { type: "button", class: "vien", "aria-pressed": String(l.key === loc) }, `${l.label} ${demLocXe(xe, l.key)}`);
      b.addEventListener("click", () => {
        loc = l.key;
        ve();
        (filtersEl.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? b).focus();
      });
      return b;
    }),
  );
  filtersEl.hidden = false;
  khoiEl.hidden = false;
  const rows = xe.filter((v) => hopLoc(v, loc));
  const locChu = chuSel.value !== "";
  // Đang lọc theo chủ mà không có xe: câu của bộ lọc, không phải "Chưa có xe nào".
  emptyEl.hidden = xe.length > 0 || locChu;
  filterEmptyEl.textContent = xe.length === 0 ? "Không có xe nào của chủ xe này." : "Không có xe nào ở trạng thái này.";
  filterEmptyEl.hidden = (xe.length === 0 && !locChu) || rows.length > 0;
  replaceChildren(cardsEl, ...rows.map(the));
  replaceChildren(rowsEl, ...rows.map(hang));
  tableEl.hidden = rows.length === 0;
  cardsEl.hidden = rows.length === 0;
}

const staff = await initShell();
ganDaiTrangAnhEm("/xe", staff);
datCrumb("Vận chuyển", "Xe");
if (can(staff, "vehicle.manage")) byId("xe-add-top").hidden = false;
const napXe = async (): Promise<void> => {
  try {
    const chu = chuSel.value;
    xe = (await api<Api.VehicleListResponse>(chu ? `/api/van-chuyen/xe?chu=${encodeURIComponent(chu)}` : "/api/van-chuyen/xe")).vehicles;
    ve();
  } catch (err) {
    showError(errorEl, loiCua(err));
  }
};
chuSel.addEventListener("change", () => {
  showError(errorEl, null);
  void napXe();
});
const [, chuXe] = await Promise.all([napXe(), api<Api.CarrierListResponse>("/api/van-chuyen/nha-xe").catch(() => null)]);
if (chuXe && chuXe.carriers.length > 0) {
  replaceChildren(chuSel, h("option", { value: "" }, "Tất cả"), ...luaChonChuXe(chuXe).map((o) => h("option", { value: o.value }, o.label)));
  chuLocEl.hidden = false;
}
