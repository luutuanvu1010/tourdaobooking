// Khối giao diện dùng chung của V12 — mốc 6 giờ + đặt gấp (ADR-0049 D2; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07 Bieu mau don - chang don.dc.html):
//  - `khoiNhanDatGap`: nhãn "Đặt gấp — lý do — người duyệt" + ghi chú (khung 7c) — hiện đúng theo khoá có trong DTO (chủ H4), không lọc theo vai ở đây;
//  - `khoiCanhBaoMoc`: dải cát "Giờ đón cách bây giờ … — dưới mốc 6 giờ" + dòng nói ai làm gì (7a Quản trị / 7b Bán hàng) + nút "Đặt gấp" (chỉ người có ô
//    order.leg.short_notice — nơi gọi quyết) mở khung "Đặt gấp" (lý do + ghi chú ngắn, "Duyệt đặt gấp" / "Đóng").
// Luật chữ ở src/shared/dat-gap-hien-thi.ts; lý do lấy từ LY_DO_DAT_GAP (R-P18). Mọi nút `type="button"` (khối có thể nằm trong <form> lập đơn).
import { LUA_CHON_LY_DO_DAT_GAP, nhanDatGap, thanDatGap } from "../src/shared/dat-gap-hien-thi";
import { GHI_CHU_DAT_GAP_TOI_DA, type LyDoDatGap } from "../src/shared/chang-dua-don";
import type { DatGapDto } from "../src/shared/contracts";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

let dem = 0;

/** Nhãn đặt gấp (khung 7c). */
export function khoiNhanDatGap(d: DatGapDto): HTMLElement {
  const n = nhanDatGap(d, Date.now());
  return h(
    "div",
    { class: "dg-mark", "data-dat-gap": "lyDoNhan" in d ? "du" : "co" },
    icon("doc-check", 16),
    h("span", null, n.chinh, n.ghiChu ? h("span", { class: "dg-mark-note" }, `“${n.ghiChu}”`) : null),
  );
}

export interface KhungDatGap {
  root: HTMLElement;
  mo(): void;
  dong(): void;
}

/**
 * Khung "Đặt gấp" (khung 7a): ô lý do, ô ghi chú ngắn (đếm /120), "Duyệt đặt gấp", "Đóng". `onDuyet` nhận thân đã kiểm; ném lỗi thì khung giữ nguyên (nơi gọi báo).
 * `nutMo` = nút đã mở khung (trả focus khi đóng).
 */
export function taoKhungDatGap(o: { onDuyet: (than: { lyDo: LyDoDatGap; ghiChu: string | null }) => Promise<void>; nutMo?: () => HTMLElement | null }): KhungDatGap {
  const id = `dg-${++dem}`;
  const lyDo = h("select", { id: `${id}-ly-do`, class: "vc-input", "data-dg": "ly-do" }, h("option", { value: "" }, "Chọn lý do"), ...LUA_CHON_LY_DO_DAT_GAP.map((x) => h("option", { value: x.value }, x.label)));
  const demEl = h("span", { class: "dp-count-text", "aria-hidden": "true" }, `0/${GHI_CHU_DAT_GAP_TOI_DA}`);
  const ghiChu = h("input", { id: `${id}-ghi-chu`, class: "vc-input", type: "text", maxLength: GHI_CHU_DAT_GAP_TOI_DA, autocomplete: "off", "data-dg": "ghi-chu" });
  ghiChu.addEventListener("input", () => (demEl.textContent = `${ghiChu.value.length}/${GHI_CHU_DAT_GAP_TOI_DA}`));
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const duyet = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "duyet-dat-gap" }, "Duyệt đặt gấp");
  const dongNut = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "dong-dat-gap" }, "Đóng");
  const root = h(
    "div",
    { class: "dg-panel", hidden: true, role: "group", "aria-labelledby": `${id}-title` },
    h("span", { id: `${id}-title`, class: "dg-panel-title" }, "Đặt gấp"),
    h("div", { class: "vc-field" }, h("label", { for: lyDo.id }, "Lý do"), lyDo),
    h("div", { class: "vc-field" }, h("div", { class: "dp-field-head" }, h("label", { for: ghiChu.id }, "Ghi chú ngắn"), demEl), ghiChu),
    loi,
    h("div", { class: "dp-panel-actions" }, duyet, dongNut),
  );
  const baoLoi = (cau: string | null): void => {
    replaceChildren(loi, ...(cau ? [icon("alert", 16, 2), cau] : []));
    loi.hidden = !cau;
  };
  lyDo.addEventListener("change", () => baoLoi(null)); // chọn lại thì câu lỗi cũ tắt
  ghiChu.addEventListener("input", () => baoLoi(null));
  const dong = (): void => {
    root.hidden = true;
    baoLoi(null);
    o.nutMo?.()?.focus();
  };
  duyet.addEventListener("click", async () => {
    const r = thanDatGap(lyDo.value, ghiChu.value);
    if (!r.ok) {
      baoLoi(r.loi);
      (r.loi.startsWith("Chọn") ? lyDo : ghiChu).focus();
      return;
    }
    baoLoi(null);
    duyet.disabled = true;
    dongNut.disabled = true;
    duyet.textContent = "Đang duyệt…";
    try {
      await o.onDuyet(r.value);
    } finally {
      if (root.isConnected) {
        duyet.disabled = false;
        dongNut.disabled = false;
        duyet.textContent = "Duyệt đặt gấp";
      }
    }
  });
  dongNut.addEventListener("click", dong);
  return {
    root,
    mo: () => {
      root.hidden = false;
      lyDo.focus();
    },
    dong,
  };
}

/**
 * Dải cảnh báo dưới mốc (khung 7a / 7b) + (người được đặt gấp) nút "Đặt gấp" mở khung. `dongPhu` là dòng dưới tiêu đề: 7a "Xếp xe gấp cần Quản trị duyệt đặt gấp.",
 * 7b "Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp.". `datCau` đổi câu mốc tại chỗ (biểu mẫu gõ giờ) — khung đang mở và chữ đã gõ trong khung giữ nguyên.
 */
export function khoiCanhBaoMoc(o: { cau: string; duocDatGap: boolean; onDuyet?: (than: { lyDo: LyDoDatGap; ghiChu: string | null }) => Promise<void> }): { root: HTMLElement; datCau(cau: string): void } {
  const dongPhu = o.duocDatGap ? "Xếp xe gấp cần Quản trị duyệt đặt gấp." : "Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp.";
  const tieuDe = h("div", { class: "banner-title" }, o.cau);
  const dai = h("div", { class: "banner banner-warning dg-warn", "data-moc": "duoi" }, tieuDe, h("div", { class: "dg-warn-sub" }, dongPhu));
  const root = h("div", { class: "dg-block" }, dai);
  if (o.duocDatGap && o.onDuyet) {
    const nut = h("button", { type: "button", class: "pill-btn dg-open", "data-action": "mo-dat-gap" }, "Đặt gấp");
    const khung = taoKhungDatGap({ onDuyet: o.onDuyet, nutMo: () => nut });
    nut.addEventListener("click", () => (khung.root.hidden ? khung.mo() : khung.dong()));
    dai.append(h("div", { class: "banner-actions" }, nut));
    root.append(khung.root);
  }
  return { root, datCau: (cau) => void (tieuDe.textContent = cau) };
}
