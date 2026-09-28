// Thành phần giao diện dùng chung cho giấy tờ (xe + người) — Vận chuyển lượt 1a (ADR-0040 D1, D2; bản vẽ docs/design/van-chuyen-1a/: form-giay-to,
// bang-truot, 03, 04). Luật hiển thị thuần ở src/shared/giay-to-hien-thi.ts; lý do sửa sai là danh sách ĐÓNG của máy chủ (src/shared/giay-to.ts). Không
// innerHTML. SỐ ĐỦ của giấy tờ người: chỉ nằm trong text node của ô số lúc đang "Xem đủ số" (không thuộc tính, không nhãn trợ năng, không lưu trình duyệt,
// không console) và rời DOM khi hết giờ / "Che lại" / rời trang.
import { LOAI_CO_DINH, LY_DO_SUA_SAI, type LyDoSuaSai } from "../src/shared/giay-to";
import { NHAN_TRANG_THAI_XE, TONE_TRANG_THAI_XE, lyDoSuaSai, ngayVN, thanSuaSai, thoiGianTuToken, type Chip, type Tone } from "../src/shared/giay-to-hien-thi";
import { vnToday } from "../src/shared/vn-date";
import { ApiError, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import { icon } from "./icons";

export const LOI_MANG = "Không kết nối được máy chủ.";
export const loiCua = (err: unknown): string => (err instanceof ApiError ? err.message : LOI_MANG);

/**
 * Breadcrumb nhiều cấp của các trang Vận chuyển (bản vẽ: "Vận chuyển › Xe › 79B-123.45"). `#bar-title` là CÙNG một ô cho breadcrumb máy tính và tiêu đề
 * thanh đầu điện thoại: phần đầu (`.vc-crumb-pre`) ẩn ở ≤640px nên điện thoại chỉ còn `cuoi` (như tiêu đề bản vẽ điện thoại).
 */
export function datCrumb(dau: string, cuoi: string): void {
  const el = document.getElementById("bar-title");
  if (el) replaceChildren(el, h("span", { class: "vc-crumb-pre" }, `${dau} › `), cuoi);
}

/** Chip trạng thái xe (Đang dùng / Bảo dưỡng / Ngừng — bản vẽ 01, 02, 03). */
export function chipTrangThaiXe(status: Api.VehicleStatus): HTMLElement {
  return h("span", { class: `vc-chip vc-chip-${TONE_TRANG_THAI_XE[status]}` }, NHAN_TRANG_THAI_XE[status]);
}

export function chipEl(c: Chip): HTMLElement {
  return h("span", { class: `vc-chip vc-chip-${c.tone}` }, c.icon && icon("alert", 12, 2.4), c.text);
}

/** Hộp cảnh báo có biểu tượng + chữ (bản vẽ: "không chỉ màu"). Còn hạn: dấu ✓ (bản vẽ vẽ tam giác cho cả trường hợp này — xem nhật ký thi công). */
export function alertEl(tone: Tone, text: string, extraClass = ""): HTMLElement {
  const bieuTuong = tone === "danger" || tone === "warn" ? icon("alert", 16, 2) : tone === "ok" ? icon("checkCircle", 16, 2) : null;
  return h("div", { class: `vc-alert vc-alert-${tone} ${extraClass}`.trim() }, bieuTuong, h("span", null, text));
}

/** Thời gian số hiện đủ, đọc từ token --t-reveal của public/app.css (mili-giây). */
export function thoiGianHienSo(): number {
  return thoiGianTuToken(getComputedStyle(document.documentElement).getPropertyValue("--t-reveal"));
}

// ---- Bảng "Thêm / Gia hạn / Sửa sai" (bản vẽ form-giay-to — dùng chung giấy tờ xe và giấy tờ người) ---------------------------------------------------
export interface GiayToDong {
  typeCode: string;
  typeName: string;
  className: string | null;
  classCode: string | null;
  /** Số để HIỆN (xe: số đủ — không phải dữ liệu cá nhân; người: số CHE của máy chủ). */
  soHien: string | null;
  issuedDate: string | null;
  issuedPlace: string | null;
  expiryDate: string | null;
  updatedAt: string;
}

export function moFormGiayTo(o: {
  kind: "add" | "renew" | "fix";
  cho: "xe" | "nguoi";
  opener: HTMLElement;
  /** Mọi loại (kể cả đã ngưng — để biết "có hạn" của dòng cũ); "Thêm" chỉ cho chọn loại đang dùng. */
  types: readonly Api.DocumentTypeDto[];
  classes?: readonly Api.LicenseClassDto[];
  doc?: GiayToDong;
  /** Gọi máy chủ + dựng lại trang; ném ApiError để bảng hiện câu của máy chủ. */
  gui: (body: Record<string, unknown>) => Promise<void>;
}): void {
  const nguoi = o.cho === "nguoi";
  const doc = o.doc;
  const loaiDung = [...o.types].filter((t) => t.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const hangDung = [...(o.classes ?? [])].filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const coHanCua = (code: string): boolean => o.types.find((t) => t.code === code)?.hasExpiry ?? true;
  const st = {
    typeCode: o.kind === "add" ? (loaiDung[0]?.code ?? "") : (doc?.typeCode ?? ""),
    no: o.kind === "fix" && !nguoi ? (doc?.soHien ?? "") : "",
    cls: (doc?.classCode && hangDung.some((c) => c.code === doc.classCode) ? doc.classCode : hangDung[0]?.code) ?? "",
    place: o.kind === "add" ? "" : (doc?.issuedPlace ?? ""),
    issued: o.kind === "fix" ? (doc?.issuedDate ?? "") : vnToday(new Date()),
    exp: o.kind === "fix" ? (doc?.expiryDate ?? "") : "",
    noExp: false,
    reason: null as LyDoSuaSai | null,
  };
  const laGplx = (): boolean => st.typeCode === LOAI_CO_DINH.GPLX;

  const errEl = h("div", { id: "gt-error", class: "vc-field-error", role: "alert", hidden: true });
  const baoLoi = (msg: string | null): void => {
    replaceChildren(errEl, ...(msg ? [icon("alert", 16, 2), msg] : []));
    errEl.hidden = !msg;
  };
  const truong = (label: string, input: HTMLElement, sau?: Child): HTMLElement => h("div", { class: "vc-field" }, h("label", { for: input.id }, label), input, sau);
  const oChu = (id: string, key: "no" | "place", attrs: Record<string, unknown> = {}): HTMLInputElement => {
    const el = h("input", { id, class: "vc-input", type: "text", autocomplete: "off", value: st[key], ...attrs });
    el.addEventListener("input", () => {
      st[key] = el.value;
      baoLoi(null);
    });
    return el;
  };
  const oNgay = (id: string, key: "issued" | "exp"): HTMLInputElement => {
    const el = h("input", { id, class: "vc-input", type: "date", value: st[key] });
    el.addEventListener("input", () => {
      st[key] = el.value;
      baoLoi(null);
    });
    el.addEventListener("change", () => (st[key] = el.value));
    return el;
  };
  const oHang = (): HTMLSelectElement => {
    const s = h("select", { id: "gt-class", class: "vc-input" }, ...hangDung.map((c) => h("option", { value: c.code }, c.name)));
    s.value = st.cls;
    s.addEventListener("change", () => (st.cls = s.value));
    return s;
  };

  const soPart = h("div", { class: "vc-gt" });
  const ngayPart = h("div", { class: "vc-gt" });
  const chkPart = h("div", null);
  const veSo = (): void => {
    if (o.kind === "fix") return;
    const renew = o.kind === "renew";
    const input = oChu("gt-no", "no", { placeholder: nguoi && renew ? "Nhập đủ số" : "In trên giấy", maxLength: 60 });
    const hint = renew && doc?.soHien ? h("div", { id: "gt-no-hint", class: "vc-hint" }, `Số hiện tại ${doc.soHien} — để trống nếu không đổi số.`) : null;
    if (hint) input.setAttribute("aria-describedby", "gt-no-hint");
    replaceChildren(
      soPart,
      truong(renew ? "Số mới" : "Số", input, hint),
      nguoi && laGplx() ? truong("Hạng", oHang()) : null,
      nguoi ? truong("Nơi cấp", oChu("gt-place", "place", { maxLength: 200 })) : null,
    );
  };
  const coHanNay = (): boolean => (o.kind === "renew" ? true : coHanCua(st.typeCode) && !st.noExp);
  const veNgay = (): void => {
    if (o.kind === "fix") return;
    replaceChildren(ngayPart, h("div", { class: "vc-dates" }, truong("Ngày cấp", oNgay("gt-issued", "issued")), coHanNay() ? truong("Ngày hết hạn", oNgay("gt-exp", "exp")) : null));
  };
  const veChk = (): void => {
    if (o.kind !== "add" || !coHanCua(st.typeCode)) return replaceChildren(chkPart);
    const cb = h("input", { id: "gt-noexp", type: "checkbox", checked: st.noExp });
    cb.addEventListener("change", () => {
      st.noExp = cb.checked;
      baoLoi(null);
      veNgay();
    });
    replaceChildren(chkPart, h("label", { class: "vc-check", for: "gt-noexp" }, cb, "Giấy này không có hạn"));
  };

  // Sửa sai: MỘT ô đúng trường của lý do đã chọn (máy chủ: mỗi lý do sửa đúng một trường — src/shared/giay-to.ts LY_DO_SUA_SAI).
  const suaPart = h("div", { class: "vc-gt" });
  const veSua = (): void => {
    const truongSua = st.reason ? LY_DO_SUA_SAI[st.reason].truong : undefined;
    if (!st.reason || truongSua === undefined) return replaceChildren(suaPart);
    if (truongSua === null) return replaceChildren(suaPart, h("p", { class: "vc-fix-void" }, "Dòng này sẽ bị huỷ (không xoá) và ghi nhật ký kèm lý do."));
    if (truongSua === "number") {
      const input = oChu("gt-no", "no", { placeholder: nguoi ? "Nhập đủ số" : "In trên giấy", maxLength: 60 });
      const hint = nguoi && doc?.soHien ? h("div", { id: "gt-no-hint", class: "vc-hint" }, `Số hiện tại ${doc.soHien}`) : null;
      if (hint) input.setAttribute("aria-describedby", "gt-no-hint");
      return replaceChildren(suaPart, truong("Số", input, hint));
    }
    if (truongSua === "issuedDate") return replaceChildren(suaPart, truong("Ngày cấp", oNgay("gt-issued", "issued")));
    if (truongSua === "expiryDate") return replaceChildren(suaPart, truong("Ngày hết hạn", oNgay("gt-exp", "exp")));
    if (truongSua === "issuedPlace") return replaceChildren(suaPart, truong("Nơi cấp", oChu("gt-place", "place", { maxLength: 200 })));
    return replaceChildren(suaPart, truong("Hạng", oHang()));
  };

  const nhan = o.kind === "renew" ? "Lưu gia hạn" : o.kind === "fix" ? "Lưu sửa sai" : "Thêm giấy tờ";
  const nut = h("button", { id: "gt-submit", type: "button", class: "vc-btn btn btn-primary vc-submit", disabled: o.kind === "fix" }, nhan);

  const dau: Child[] = [];
  if (o.kind === "renew" && doc) {
    const cu = [doc.soHien, doc.expiryDate ? `hết hạn ${ngayVN(doc.expiryDate)}` : null].filter(Boolean).join(" · ");
    dau.push(h("div", { class: "vc-renew-note" }, icon("history", 18), h("span", null, cu ? `Dòng hiện tại (${cu}) được giữ làm lịch sử. Gia hạn thêm một dòng mới.` : "Dòng hiện tại được giữ làm lịch sử. Gia hạn thêm một dòng mới.")));
  }
  if (o.kind === "fix" && doc) {
    const lyDo = lyDoSuaSai(nguoi ? { typeCode: doc.typeCode } : "xe");
    const nutLyDo = lyDo.map((l) => {
      const b = h("button", { type: "button", class: "vc-reason", role: "radio", "aria-checked": "false" }, h("span", { class: "vc-radio-dot", "aria-hidden": "true" }), l.nhan);
      b.addEventListener("click", () => {
        st.reason = l.code;
        for (const x of nutLyDo) x.setAttribute("aria-checked", String(x === b));
        nut.disabled = false;
        baoLoi(null);
        veSua();
      });
      return b;
    });
    dau.push(
      h("div", { class: "vc-field" }, h("div", { id: "gt-reason-label", class: "vc-label" }, "Lý do sửa"), h("div", { class: "vc-reasons", role: "radiogroup", "aria-labelledby": "gt-reason-label" }, ...nutLyDo)),
      h("div", { class: "vc-fix-note" }, "Sửa sai ghi đè dòng hiện tại và được ghi nhật ký kèm lý do. Giấy mới được cấp thì dùng “Gia hạn”."),
    );
  }
  if (o.kind === "add") {
    const s = h("select", { id: "gt-type", class: "vc-input" }, ...loaiDung.map((t) => h("option", { value: t.code }, t.name)));
    s.value = st.typeCode;
    s.addEventListener("change", () => {
      st.typeCode = s.value;
      st.noExp = false;
      baoLoi(null);
      veSo();
      veNgay();
      veChk();
    });
    dau.push(truong("Loại giấy tờ", s));
  }
  veSo();
  veNgay();
  veChk();

  const tieuDe = o.kind === "add" ? "Thêm giấy tờ" : `${o.kind === "renew" ? "Gia hạn" : "Sửa sai"} · ${doc?.typeName ?? ""}`;
  const bang = moBangTruot({
    title: tieuDe,
    body: [h("div", { class: "vc-gt" }, ...dau, ...(o.kind === "fix" ? [suaPart] : [soPart, ngayPart, chkPart]), errEl)],
    foot: [nut],
    footClass: "vc-sheet-foot",
    opener: o.opener,
  });
  if (!bang) return;

  nut.addEventListener("click", async () => {
    baoLoi(null);
    let body: Record<string, unknown>;
    if (o.kind === "fix") {
      if (!st.reason || !doc) return baoLoi("Chọn lý do trước khi lưu.");
      const t = LY_DO_SUA_SAI[st.reason].truong;
      const giaTri = t === "number" ? st.no : t === "issuedDate" ? st.issued : t === "expiryDate" ? st.exp : t === "issuedPlace" ? st.place : t === "classCode" ? st.cls : null;
      body = thanSuaSai(st.reason, giaTri, doc.updatedAt);
    } else {
      const coHan = coHanNay();
      if (coHan && !st.exp) return baoLoi("Nhập ngày hết hạn.");
      const chung = { number: st.no.trim() || null, issuedDate: st.issued || null, expiryDate: coHan ? st.exp || null : null };
      if (o.kind === "add") body = { typeCode: st.typeCode, ...chung, ...(nguoi ? { classCode: laGplx() ? st.cls : null, issuedPlace: st.place.trim() || null } : {}) };
      else body = { ...chung, ...(nguoi ? { issuedPlace: st.place.trim() || null, ...(laGplx() ? { classCode: st.cls } : {}) } : {}) };
    }
    bang.setBusy(true);
    nut.disabled = true;
    try {
      await o.gui(body);
      bang.close(false);
    } catch (err) {
      baoLoi(loiCua(err));
      nut.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

// ---- "Xem đủ số" (giấy tờ người — bản vẽ 04, quyết định thiết kế 6) ---------------------------------------------------------------------------------------
/**
 * Bộ che số của MỘT khu (mục "Giấy tờ" ở Danh bạ): chỉ một dòng hiện đủ một lúc; tự che khi hết giờ token --t-reveal, khi bấm "Che lại", khi rời trang
 * (pagehide — bài học bfcache của web/CLAUDE.md) hay khi ẩn ứng dụng (visibilitychange). Phần tử do nơi dựng gắn thuộc tính:
 *   [data-no-for=id] ô số (data-masked = số che) · [data-reveal-for=id] nút "Xem đủ số" · [data-hide-for=id] nút "Che lại" · [data-count-for=id] dòng đếm ngược
 *   (chứa .vc-count-n).
 */
export interface BoCheSo {
  hien(docId: string, so: string): void;
  che(): void;
}
export function taoBoCheSo(khu: HTMLElement): BoCheSo {
  let dang: string | null = null;
  let hen = 0;
  let het = 0;
  const cua = (thuoc: string, id: string): HTMLElement[] => [...khu.querySelectorAll<HTMLElement>(`[${thuoc}="${CSS.escape(id)}"]`)];
  const dongHo = (): void => {
    const conLai = het - Date.now();
    if (conLai <= 0) return che();
    for (const el of dang ? cua("data-count-for", dang) : []) {
      const n = el.querySelector(".vc-count-n");
      if (n) n.textContent = String(Math.ceil(conLai / 1000));
    }
  };
  function che(): void {
    if (dang === null) return;
    const id = dang;
    dang = null;
    window.clearInterval(hen);
    for (const el of cua("data-no-for", id)) {
      el.textContent = el.dataset.masked ?? "";
      el.classList.remove("is-revealed");
    }
    for (const el of cua("data-reveal-for", id)) el.hidden = false;
    for (const el of [...cua("data-hide-for", id), ...cua("data-count-for", id)]) el.hidden = true;
  }
  const bo: BoCheSo = {
    hien(docId, so) {
      che();
      dang = docId;
      het = Date.now() + thoiGianHienSo();
      for (const el of cua("data-no-for", docId)) {
        el.textContent = so;
        el.classList.add("is-revealed");
      }
      for (const el of cua("data-reveal-for", docId)) el.hidden = true;
      for (const el of [...cua("data-hide-for", docId), ...cua("data-count-for", docId)]) el.hidden = false;
      dongHo();
      hen = window.setInterval(dongHo, 250);
    },
    che,
  };
  window.addEventListener("pagehide", che);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") che();
  });
  return bo;
}

/** Hộp xác nhận "Xem đủ số?" (bản vẽ 04): mỗi lần xem ghi nhật ký; gọi máy chủ khi xác nhận; trả số qua `khiCo`. */
export function moXacNhanXemSo(o: { opener: HTMLElement; tieuDe: string; soChe: string; xem: () => Promise<string>; khiCo: (so: string) => void }): void {
  const giay = Math.round(thoiGianHienSo() / 1000);
  const errEl = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Huỷ");
  const xem = h("button", { type: "button", class: "vc-btn btn btn-primary" }, "Xem đủ số");
  const bang = moBangTruot({
    title: "Xem đủ số?",
    body: [
      h(
        "div",
        { class: "vc-sheet-text" },
        h("div", { class: "vc-warnbox" }, icon("alert", 18, 2), h("span", null, "Mỗi lần xem đều được ghi nhật ký. Xem đủ số?")),
        h("div", { class: "vc-reveal-line" }, `${o.tieuDe} · ${o.soChe} · số tự che lại sau ${giay} giây.`),
        errEl,
      ),
    ],
    foot: [huy, xem],
    footClass: "vc-foot-2",
    opener: o.opener,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  xem.addEventListener("click", async () => {
    bang.setBusy(true);
    xem.disabled = true;
    huy.disabled = true;
    try {
      const so = await o.xem();
      bang.close(false);
      o.khiCo(so);
    } catch (err) {
      replaceChildren(errEl, icon("alert", 16, 2), loiCua(err));
      errEl.hidden = false;
      xem.disabled = false;
      huy.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}
