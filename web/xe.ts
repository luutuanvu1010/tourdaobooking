// Danh sách xe (/xe — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/01 Danh sach xe.dc.html). GET /api/van-chuyen/xe (ô vehicle.manage — Quản trị,
// Toàn quyền); lọc trạng thái ở trình duyệt. Điện thoại: thẻ bấm được cả thẻ, nút "Thêm xe" dính đáy; máy tính (≥900px): bảng, nút ở góc phải tiêu đề.
// Cảnh báo giấy tờ luôn có biểu tượng + chữ (không chỉ màu). Giao diện chỉ ẩn/hiện — máy chủ luôn kiểm lại.
// ADR-0048 D1 (Task B3, khuôn sẵn — chủ chọn Q2 = (a)): xe của nhà xe có dòng phụ "Nhà xe: <tên>"; ô lọc "Chủ xe" (Tất cả / công ty / từng nhà xe) gọi ?chu= —
// chỉ hiện khi đã có nhà xe đang hợp tác.
import { LOC_XE, canhBaoXe, demLocXe, hopLoc, luaChonChuXe, tenXe, type LocXe } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { alertEl, chipTrangThaiXe, datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const filtersEl = byId("vc-filters");
const cardsEl = byId("xe-cards");
const tableEl = byId("xe-table");
const emptyEl = byId("xe-empty");
const filterEmptyEl = byId("xe-filter-empty");
const chuLocEl = byId("xe-chu-loc");
const chuSel = byId<HTMLSelectElement>("xe-chu");
let loc: LocXe = "all";
let xe: Api.VehicleDto[] = [];
/** Dòng phụ "Nhà xe: <tên>" khi chủ xe không phải công ty chủ hiện tại (ADR-0048 D1). */
const dongNhaXe = (v: Api.VehicleDto): HTMLElement | null => (v.ownerIsCompany ? null : h("div", { class: "vc-xe-meta vc-xe-owner" }, `Nhà xe: ${v.ownerName}`));

emptyEl.prepend(icon("truck", 44, 1.5));
for (const a of document.querySelectorAll<HTMLElement>("#xe-add-top, #xe-add-bottom a")) a.prepend(icon("plus", 20));

function the(v: Api.VehicleDto): HTMLElement {
  const cb = canhBaoXe(v);
  return h(
    "a",
    { class: "vc-card vc-xe-card", href: `/xe-chi-tiet?id=${encodeURIComponent(v.id)}` },
    h("div", { class: "vc-row-between" }, h("span", { class: "vc-xe-plate" }, v.plateNumber), chipTrangThaiXe(v.status)),
    h("div", { class: "vc-row-between vc-xe-meta" }, h("span", null, `${tenXe(v)} · ${v.passengerCapacity} người`), icon("next", 20)),
    dongNhaXe(v),
    cb && alertEl(cb.tone, cb.text, "vc-xe-alert"),
  );
}

function hang(v: Api.VehicleDto): HTMLElement {
  const cb = canhBaoXe(v);
  return h(
    "a",
    { class: "vc-xe-grid vc-xe-row", href: `/xe-chi-tiet?id=${encodeURIComponent(v.id)}` },
    h("span", { class: "vc-xe-plate" }, v.plateNumber),
    h("div", null, h("div", null, tenXe(v)), dongNhaXe(v)),
    h("span", null, `${v.passengerCapacity} người`),
    h("span", null, chipTrangThaiXe(v.status)),
    // Bản vẽ ghi "Còn hạn" khi không có cảnh báo; máy chủ không cho biết xe có giấy tờ nào không (xe mới chưa nhập giấy cũng "none") — ghi câu luôn đúng.
    h("span", { class: `vc-xe-docs vc-xe-alert vc-tone-${cb ? cb.tone : "none"}` }, cb && icon("alert", 16, 2), h("span", null, cb ? cb.text : "Không có giấy sắp hết hạn")),
  );
}

function ve(): void {
  replaceChildren(
    filtersEl,
    ...LOC_XE.map((l) => {
      const b = h("button", { type: "button", class: "vc-filter", "aria-pressed": String(l.key === loc) }, `${l.label} ${demLocXe(xe, l.key)}`);
      b.addEventListener("click", () => {
        loc = l.key;
        ve();
        (filtersEl.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? b).focus();
      });
      return b;
    }),
  );
  filtersEl.hidden = false;
  const rows = xe.filter((v) => hopLoc(v, loc));
  const locChu = chuSel.value !== "";
  // Đang lọc theo chủ mà không có xe: câu của bộ lọc, không phải "Chưa có xe nào".
  emptyEl.hidden = xe.length > 0 || locChu;
  filterEmptyEl.textContent = xe.length === 0 ? "Không có xe nào của chủ xe này." : "Không có xe nào ở trạng thái này.";
  filterEmptyEl.hidden = (xe.length === 0 && !locChu) || rows.length > 0;
  replaceChildren(cardsEl, ...rows.map(the));
  replaceChildren(
    tableEl,
    h("div", { class: "vc-xe-grid vc-th", "aria-hidden": "true" }, h("span", null, "BIỂN SỐ"), h("span", null, "TÊN / ĐỜI XE"), h("span", null, "SỐ NGƯỜI ĐƯỢC CHỞ"), h("span", null, "TRẠNG THÁI"), h("span", null, "GIẤY TỜ")),
    ...rows.map(hang),
  );
  tableEl.hidden = rows.length === 0;
}

const staff = await initShell();
datCrumb("Vận chuyển", "Xe");
if (can(staff, "vehicle.manage")) {
  byId("xe-add-top").hidden = false;
  byId("xe-add-bottom").hidden = false;
}
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
