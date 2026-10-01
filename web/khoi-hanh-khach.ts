// Khối "Hành khách" (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/khoi-hanh-khach.dc.html): form đơn (M2 — `che: "form"`; máy tính dạng bảng 28/1fr/112/
// 176/96, điện thoại mỗi khách một thẻ) và bảng "Sửa danh sách hành khách" (M5 — `che: "bang"`: luôn dạng thẻ, "Huỷ người" hỏi lại ngay trong thẻ). Luật ở
// src/shared/hanh-khach-form.ts; ở đây chỉ dựng DOM. Gõ chữ chỉ cập nhật dòng đếm / câu nhắc / lỗi tại chỗ (không dựng lại ô đang gõ).
// Đoạn "Số khách đi xe" (ADR-0065, chưa duyệt — D2) KHÔNG dựng.
import { LUA_CHON_LOAI, cauHuyNguoi, chuanNam, dongTrong, loiDong, tomTatKhach, type DongKhach } from "../src/shared/hanh-khach-form";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface KhoiHanhKhachOptions {
  rows: DongKhach[];
  che: "form" | "bang";
  /** Mẫu số "N/M khách đã có tên" (số khách dịch vụ đông nhất). */
  soKhach: () => number;
  today: string;
  /** Dạng bảng (máy tính, form) — false = dạng thẻ. */
  bang: () => boolean;
  newKey: () => string;
  onChange: (rows: DongKhach[]) => void;
  ma: string;
}

export interface KhoiHanhKhach {
  root: HTMLElement;
  rows(): DongKhach[];
  /** Khoá người đã chọn "Huỷ người" (bảng sửa sau xác nhận). */
  huy(): string[];
  showIssues(show: boolean): void;
  /** Vẽ lại (đổi khổ màn hình, đổi số khách dịch vụ). */
  refresh(rebuild?: boolean): void;
}

export function taoKhoiHanhKhach(o: KhoiHanhKhachOptions): KhoiHanhKhach {
  let rows = o.rows;
  let daLuu = false;
  let hoiHuy: string | null = null; // key dòng đang mở hộp "Huỷ người"
  const daHuy: string[] = [];
  const bangMo = o.che === "bang";
  const root = h("div", { class: "hk", "data-hanh-khach": o.ma });
  const demEl = h("span", { class: "hk-dem-so" });
  const thieuEl = h("div", { class: "banner banner-warning hk-nhac", role: "status" });
  const quaEl = h("div", { class: "banner banner-warning hk-nhac", role: "status" });
  let refs: { ten: HTMLInputElement; nam: HTMLInputElement; loi: HTMLElement }[] = [];

  const doi = (next: DongKhach[], rebuild: boolean) => {
    rows = next;
    o.onChange(rows);
    if (rebuild) build();
    else capNhat();
  };
  const sua = (i: number, p: Partial<DongKhach>) => doi(rows.map((r, j) => (j === i ? { ...r, ...p } : r)), false);

  function dongEl(r: DongKhach, i: number, dangBang: boolean): HTMLElement {
    const so = i + 1;
    const id = (f: string) => `${o.ma}-${r.key}-${f}`;
    const ten = h("input", { id: id("ten"), type: "text", maxLength: 120, autocomplete: "off", placeholder: "Như trên giấy tờ", value: r.ten, "data-o": `${r.key}:ten` });
    ten.addEventListener("input", () => sua(i, { ten: ten.value }));
    const nam = h("input", { id: id("nam"), type: "text", inputMode: "numeric", maxLength: 4, autocomplete: "off", placeholder: "VD: 1985", value: r.nam, "data-o": `${r.key}:nam` });
    nam.addEventListener("input", () => {
      const v = chuanNam(nam.value);
      if (v !== nam.value) nam.value = v;
      sua(i, { nam: v });
    });
    const loai = h("select", { id: id("loai"), "data-o": `${r.key}:loai` }, ...LUA_CHON_LOAI.map((x) => h("option", { value: x.value }, x.label)));
    loai.value = r.loai;
    loai.addEventListener("change", () => sua(i, { loai: loai.value as DongKhach["loai"] }));
    const xoa = h("button", { type: "button", class: "btn-link hk-xoa", "data-action": bangMo ? "huy-nguoi" : "xoa-khach" }, bangMo ? "Huỷ người" : "Xoá");
    xoa.addEventListener("click", () => {
      if (bangMo && r.personKey) {
        hoiHuy = r.key;
        build();
      } else doi(rows.filter((_, j) => j !== i), true);
    });
    const loi = h("p", { class: "field-error hk-loi", role: "alert", hidden: true });
    refs[i] = { ten, nam, loi };
    let hoi: HTMLElement | null = null;
    if (hoiHuy === r.key) {
      const chac = h("button", { type: "button", class: "btn btn-danger", "data-action": "xac-nhan-huy" }, "Huỷ người");
      chac.addEventListener("click", () => {
        hoiHuy = null;
        if (r.personKey) daHuy.push(r.personKey);
        doi(rows.filter((_, j) => j !== i), true);
      });
      const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
      thoi.addEventListener("click", () => {
        hoiHuy = null;
        build();
      });
      hoi = h("div", { class: "banner banner-danger", role: "alert" }, h("div", { class: "banner-title" }, cauHuyNguoi(r, so)), h("div", { class: "banner-actions" }, chac, thoi));
    }
    if (dangBang) {
      ten.setAttribute("aria-label", `Họ tên khách ${so}`);
      nam.setAttribute("aria-label", `Năm sinh khách ${so}`);
      loai.setAttribute("aria-label", `Loại khách ${so}`);
      return h("div", { class: "hk-hang", "data-row": r.key }, h("div", { class: "hk-luoi" }, h("span", { class: "hk-so" }, String(so)), ten, nam, loai, xoa), loi, hoi);
    }
    return h(
      "div",
      { class: "hk-the", "data-row": r.key },
      h("div", { class: "hk-the-dau" }, h("span", { class: "hk-the-ten" }, `Khách ${so}`), xoa),
      h("label", { for: ten.id }, "Họ tên", ten),
      h("div", { class: "hk-the-luoi" }, h("label", { for: nam.id }, "Năm sinh", nam), h("label", { for: loai.id }, "Loại khách", loai)),
      loi,
      hoi,
    );
  }

  function build(): void {
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement.getAttribute("data-o") : null;
    refs = [];
    const dangBang = !bangMo && o.bang();
    const them = h("button", { type: "button", class: "pill-btn", "data-action": "them-khach" }, "+ Thêm hành khách");
    them.addEventListener("click", () => {
      const r = dongTrong(o.newKey());
      doi([...rows, r], true);
      root.querySelector<HTMLElement>(`[data-o="${CSS.escape(`${r.key}:ten`)}"]`)?.focus();
    });
    const ds = rows.map((r, i) => dongEl(r, i, dangBang));
    replaceChildren(
      root,
      bangMo ? h("p", { class: "dd-ghi-tao" }, "Không xoá hẳn; mọi lần sửa đều được lưu lại.") : null,
      h("div", { class: "hk-dem" }, h("span", { class: "hk-dem-icon" }, icon("guests", 18)), demEl, h("span", { class: "hk-dem-chu" }, "khách đã có tên")),
      thieuEl,
      quaEl,
      rows.length === 0 ? h("p", { class: "muted hk-trong" }, "Chưa có hành khách nào.") : null,
      rows.length > 0 && dangBang
        ? h("div", { class: "hk-bang" }, h("div", { class: "hk-luoi hk-dau-cot", "aria-hidden": "true" }, h("span", null, "#"), h("span", null, "Họ tên"), h("span", null, "Năm sinh"), h("span", null, "Loại khách (tuỳ chọn)"), h("span", null)), ...ds)
        : rows.length > 0
          ? h("div", { class: "hk-ds" }, ...ds)
          : null,
      h("div", { class: "dd-nut" }, them),
    );
    capNhat();
    if (focused) root.querySelector<HTMLElement>(`[data-o="${CSS.escape(focused)}"]`)?.focus();
  }

  function capNhat(): void {
    const t = tomTatKhach(rows, o.soKhach(), o.today);
    demEl.textContent = t.dem;
    replaceChildren(thieuEl, h("div", { class: "banner-title" }, t.thieu ?? ""));
    thieuEl.hidden = t.thieu === null;
    replaceChildren(quaEl, h("div", { class: "banner-title" }, t.qua ?? ""), h("div", null, "Vẫn lưu được."));
    quaEl.hidden = t.qua === null;
    rows.forEach((r, i) => {
      const ref = refs[i];
      if (!ref) return;
      const e = loiDong(r, i + 1, o.today, daLuu);
      replaceChildren(ref.loi, ...(e ? [icon("alert", 16), e.cau] : []));
      ref.loi.hidden = e === null;
      ref.ten.setAttribute("aria-invalid", e?.o === "ten" ? "true" : "false");
      ref.nam.setAttribute("aria-invalid", e?.o === "nam" ? "true" : "false");
    });
  }

  build();
  return {
    root,
    rows: () => rows,
    huy: () => [...daHuy],
    showIssues(show) {
      daLuu = show;
      capNhat();
    },
    refresh(rebuild = false) {
      if (rebuild) build();
      else capNhat();
    },
  };
}
