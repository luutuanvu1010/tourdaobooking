// Khối "Đưa đón" (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/the-dua-don.dc.html): trong thẻ dịch vụ của form đơn (M1, M6 — `che: "form"`) và trong
// bảng "Sửa đưa đón" của đơn đã xác nhận (M4 — `che: "bang"`: "Bỏ chặng" của chặng đã lưu hỏi lý do). Mọi luật ở src/shared/chang-form.ts; ở đây chỉ dựng DOM.
// KHÔNG dựng lại ô người dùng đang gõ: gõ chữ / ngày / giờ chỉ cập nhật chữ gợi ý và lỗi tại chỗ; đổi ô chọn, thêm / bỏ chặng mới dựng lại (rồi trả focus).
import { CHIEU_LABEL, LY_DO_DONG_CHANG, khoangNgayDon, type LyDoDongChang } from "../src/shared/chang-dua-don";
import {
  TU_DO, coOSoHieu, goiYChang, loiChang, suaChang, themChangDi, themChieuVe, type ChangNhap, type SuaChang,
} from "../src/shared/chang-form";
import type { MauChang } from "../src/shared/chang-mac-dinh";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

/** Một điểm danh mục cho ô chọn: nhãn "<tên> · <loại>", cờ sân bay (hiện ô số hiệu chuyến bay). */
export interface DiemChon {
  id: string;
  nhan: string;
  sanBay: boolean;
}

export interface KhoiDuaDonOptions {
  legs: ChangNhap[];
  /** Câu "Đã tạo sẵn …" (M6); null = không. */
  taoSan: string | null;
  che: "form" | "bang";
  ngayDi: () => string;
  soKhach: () => number;
  mau: () => MauChang | null;
  diem: () => readonly DiemChon[];
  /** Văn phòng (ô `order.trip.edit`): sửa được "Số người chiều về"; người khác chỉ xem. */
  suaSoVe: boolean;
  newKey: () => string;
  onChange: (legs: ChangNhap[], taoSan: string | null) => void;
  /** Tiền tố id/nhãn duy nhất của khối (nhiều thẻ dịch vụ trên một trang). */
  ma: string;
}

export interface KhoiDuaDon {
  root: HTMLElement;
  /** Bản nháp đổi từ BÊN NGOÀI (vd dời ngày đi): vẽ lại; không bắn onChange. */
  update(legs: ChangNhap[], taoSan: string | null): void;
  /** Hiện lỗi "chưa có nơi đón" (sau lần bấm Lưu đầu). */
  showIssues(show: boolean): void;
  /** Chặng đã lưu người dùng bỏ (bảng sửa sau xác nhận) kèm lý do. */
  daBo(): { leg: ChangNhap; lyDo: LyDoDongChang }[];
}

const LY_DO = Object.entries(LY_DO_DONG_CHANG) as [LyDoDongChang, string][];

export function taoKhoiDuaDon(o: KhoiDuaDonOptions): KhoiDuaDon {
  let legs = o.legs;
  let taoSan = o.taoSan;
  let daLuu = false;
  /** Chặng đang mở hộp "Bỏ chặng" (bảng): key → lý do đang chọn ("" = chưa chọn) + đã bấm Bỏ mà chưa chọn. */
  const boMo = new Map<string, { lyDo: LyDoDongChang | ""; loi: boolean }>();
  const boXong: { leg: ChangNhap; lyDo: LyDoDongChang }[] = [];
  const root = h("div", { class: "dd", "data-dua-don": o.ma });
  /** Phần tử cập nhật tại chỗ theo từng chặng. */
  let refs: { gioMo: HTMLElement; hintNgay: HTMLElement; hintGio: HTMLElement; loiDon: HTMLElement; loiDonTuDo: HTMLElement | null; loiSoVe: HTMLElement | null; don: HTMLSelectElement; donTuDo: HTMLInputElement | null; soVe: HTMLInputElement | null }[] = [];

  const laSanBay = (id: string) => o.diem().some((d) => d.id === id && d.sanBay);
  const commit = (next: ChangNhap[], rebuild: boolean) => {
    legs = next;
    if (legs.length === 0) taoSan = null;
    o.onChange(legs, taoSan);
    if (rebuild) build();
    else refresh();
  };
  const sua = (i: number, p: SuaChang, rebuild: boolean) => commit(suaChang(legs, i, p), rebuild);

  /** Ô chọn nơi: điểm danh mục đang dùng + điểm đang lưu đã ngưng (giữ nhãn đã lưu); đầu "Chọn nơi đón…" / "Chưa chốt"; cuối "Gõ tự do…". */
  function oChonNoi(l: ChangNhap, loai: "don" | "tra", id: string): HTMLSelectElement {
    const gt = l[loai];
    const ds = [...o.diem()];
    if (gt !== "" && gt !== TU_DO && !ds.some((d) => d.id === gt)) {
      const nhan = loai === "don" ? l.goc?.pickupLabel : l.goc?.dropoffLabel;
      ds.push({ id: gt, nhan: nhan ?? "Điểm đã ngưng", sanBay: false });
    }
    const sel = h(
      "select",
      { id, "data-o": `${l.key}:${loai}` },
      h("option", { value: "" }, loai === "don" ? "Chọn nơi đón…" : "Chưa chốt"),
      ...ds.map((d) => h("option", { value: d.id }, d.nhan)),
      h("option", { value: TU_DO }, "Gõ tự do…"),
    );
    sel.value = gt;
    return sel;
  }

  const hint = (text: string) => h("span", { class: "hint" }, text);
  const loiEl = () => h("p", { class: "field-error", role: "alert" });
  const datLoi = (el: HTMLElement | null, input: HTMLElement | null, cau: string | null) => {
    if (!el) return;
    replaceChildren(el, ...(cau ? [icon("alert", 16), cau] : []));
    el.hidden = !cau;
    input?.setAttribute("aria-invalid", cau ? "true" : "false");
  };

  function lyDoBo(l: ChangNhap, i: number): HTMLElement {
    const st = boMo.get(l.key)!;
    const ten = `${o.ma}-bo-${l.key}`;
    const lua = LY_DO.map(([ma, nhan]) => {
      const r = h("input", { type: "radio", name: ten, value: ma, checked: st.lyDo === ma, class: "dd-radio-o" });
      r.addEventListener("change", () => {
        boMo.set(l.key, { lyDo: ma, loi: false });
        build();
      });
      return h("label", { class: st.lyDo === ma ? "dd-radio dd-radio-chon" : "dd-radio" }, r, h("span", { class: "dd-radio-vong", "aria-hidden": "true" }), h("span", null, nhan));
    });
    const bo = h("button", { type: "button", class: "btn btn-danger", "data-action": "xac-nhan-bo" }, "Bỏ chặng");
    bo.addEventListener("click", () => {
      if (st.lyDo === "") {
        boMo.set(l.key, { lyDo: "", loi: true });
        return build();
      }
      boMo.delete(l.key);
      boXong.push({ leg: l, lyDo: st.lyDo });
      commit(legs.filter((_, j) => j !== i), true);
    });
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    thoi.addEventListener("click", () => {
      boMo.delete(l.key);
      build();
    });
    return h(
      "div",
      { class: "dd-bo", role: "group", "aria-label": `Bỏ chặng ${i + 1}` },
      h("span", { class: "dd-bo-tieu" }, `Bỏ chặng ${i + 1} · ${CHIEU_LABEL[l.direction]}`),
      h("span", { class: "dd-nhan" }, "Lý do (bắt buộc, chọn một)"),
      h("div", { class: "dd-radio-ds" }, ...lua),
      st.loi ? h("p", { class: "field-error", role: "alert" }, icon("alert", 16), "Chọn lý do bỏ chặng.") : null,
      h("span", { class: "hint" }, "Chặng đã bỏ không mất — xem trong lịch sử đơn."),
      h("div", { class: "dd-nut" }, bo, thoi),
    );
  }

  function changEl(l: ChangNhap, i: number): HTMLElement {
    const so = i + 1;
    const id = (f: string) => `${o.ma}-${l.key}-${f}`;
    const g = goiYChang(l, o.ngayDi());
    const boBtn = h("button", { type: "button", class: "btn-link dd-bo-nut", "data-action": "bo-chang" }, "Bỏ chặng");
    boBtn.addEventListener("click", () => {
      if (o.che === "bang" && l.id !== null) {
        boMo.set(l.key, { lyDo: "", loi: false });
        build();
      } else commit(legs.filter((_, j) => j !== i), true);
    });

    const ngayDi = o.ngayDi();
    const khoang = ngayDi ? khoangNgayDon(ngayDi) : null;
    const ngay = h("input", { id: id("ngay"), type: "date", value: l.pickupDate, min: khoang?.from ?? null, max: khoang?.to ?? null, "data-o": `${l.key}:ngay` });
    ngay.addEventListener("input", () => sua(i, { pickupDate: ngay.value }, false));
    const gio = h("input", { id: id("gio"), type: "time", value: l.pickupTime, "data-o": `${l.key}:gio` });
    gio.addEventListener("input", () => sua(i, { pickupTime: gio.value }, false));
    const hintNgay = hint(g.ngay);
    // Chữ mờ "Chưa chốt giờ" đặt chồng lên ô giờ khi trống (bản vẽ: ô giờ của máy + chữ mờ); ô đang gõ thì ẩn (CSS :focus-within).
    const gioMo = h("span", { class: "dd-gio-mo", "aria-hidden": "true" }, "Chưa chốt giờ");
    const hintGio = hint(g.gio);

    const don = oChonNoi(l, "don", id("don"));
    don.addEventListener("change", () => sua(i, { don: don.value }, true));
    const loiDon = loiEl();
    let donTuDo: HTMLInputElement | null = null;
    let loiDonTuDo: HTMLElement | null = null;
    if (l.don === TU_DO) {
      donTuDo = h("input", { id: id("don-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.donTuDo, "data-o": `${l.key}:don-chu` });
      donTuDo.addEventListener("input", () => sua(i, { donTuDo: donTuDo!.value }, false));
      loiDonTuDo = loiEl();
    }
    const tra = oChonNoi(l, "tra", id("tra"));
    tra.addEventListener("change", () => sua(i, { tra: tra.value }, true));
    let traTuDo: HTMLInputElement | null = null;
    if (l.tra === TU_DO) {
      traTuDo = h("input", { id: id("tra-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.traTuDo, "data-o": `${l.key}:tra-chu` });
      traTuDo.addEventListener("input", () => sua(i, { traTuDo: traTuDo!.value }, false));
    }

    const phu: HTMLElement[] = [];
    if (coOSoHieu(l, laSanBay)) {
      const bay = h("input", { id: id("bay"), type: "text", maxLength: 8, autocomplete: "off", autocapitalize: "characters", placeholder: "VD: VN1553", value: l.flightCode, "data-o": `${l.key}:bay` });
      bay.addEventListener("input", () => sua(i, { flightCode: bay.value }, false));
      phu.push(h("label", { for: bay.id }, "Số hiệu chuyến bay", bay, hint("Tài xế tự tra giờ bay")));
    }
    let soVe: HTMLInputElement | null = null;
    let loiSoVe: HTMLElement | null = null;
    if (l.direction === "RETURN") {
      if (o.suaSoVe) {
        soVe = h("input", { id: id("so-ve"), type: "text", inputMode: "numeric", maxLength: 3, autocomplete: "off", placeholder: "Cả đoàn", value: l.soVe, "data-o": `${l.key}:so-ve` });
        soVe.addEventListener("input", () => {
          sua(i, { soVe: soVe!.value }, false);
          if (soVe!.value !== legs[i]!.soVe) soVe!.value = legs[i]!.soVe;
        });
        loiSoVe = loiEl();
        phu.push(h("label", { for: soVe.id }, "Số người chiều về", soVe, loiSoVe, hint("Để trống nếu cả đoàn cùng về")));
      } else {
        phu.push(
          h(
            "div",
            { class: "dd-xem" },
            h("span", { class: "dd-nhan" }, "Số người chiều về"),
            h("span", { class: "dd-xem-gt" }, l.soVe ? `${l.soVe} người` : "Cả đoàn"),
            h("span", { class: "dd-xem-khoa" }, icon("lock", 16), "Văn phòng điều chỉnh số người về"),
          ),
        );
      }
    }
    refs[i] = { gioMo, hintNgay, hintGio, loiDon, loiDonTuDo, loiSoVe, don, donTuDo, soVe };

    return h(
      "div",
      { class: "dd-chang", "data-leg-key": l.key, "data-chieu": l.direction },
      h("div", { class: "dd-chang-dau" }, h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]), h("span", { class: "dd-chang-so" }, `Chặng ${so}`), boBtn),
      h("div", { class: "dd-luoi2" }, h("label", { for: ngay.id }, "Ngày đón", ngay, hintNgay), h("label", { for: gio.id }, "Giờ đón", h("span", { class: "dd-gio" }, gio, gioMo), hintGio)),
      h(
        "div",
        { class: "dd-luoi-noi" },
        h("div", { class: "dd-cot" }, h("label", { for: don.id }, "Nơi đón", don, loiDon, g.don ? hint(g.don) : null), donTuDo && h("label", { for: donTuDo.id }, "Địa chỉ đón", donTuDo, loiDonTuDo, hint("Chỉ hiện trong trang đơn."))),
        h("div", { class: "dd-cot" }, h("label", { for: tra.id }, "Nơi trả", tra, g.tra ? hint(g.tra) : null), traTuDo && h("label", { for: traTuDo.id }, "Địa chỉ trả", traTuDo, hint("Chỉ hiện trong trang đơn."))),
      ),
      phu.length ? h("div", { class: "dd-luoi-phu" }, ...phu) : null,
      boMo.has(l.key) ? lyDoBo(l, i) : null,
    );
  }

  function build(): void {
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement.getAttribute("data-o") : null;
    refs = [];
    const items: HTMLElement[] = [h("div", { class: "dd-nhan" }, "Đưa đón")];
    if (taoSan && legs.length > 0) items.push(h("p", { class: "dd-ghi" }, taoSan));
    if (legs.length === 0) {
      const them = h("button", { type: "button", class: "pill-btn", "data-action": "them-dua-don" }, "+ Thêm đưa đón");
      them.addEventListener("click", () => commit([themChangDi(o.mau(), o.ngayDi(), o.newKey())], true));
      items.push(h("div", { class: "dd-trong" }, h("span", null, "Không đưa đón"), them));
    }
    legs.forEach((l, i) => items.push(changEl(l, i)));
    if (legs.length > 0) {
      const ve = h("button", { type: "button", class: "pill-btn", "data-action": "them-chieu-ve" }, "+ Thêm chiều về");
      ve.addEventListener("click", () => commit([...legs, themChieuVe(legs, o.mau(), o.ngayDi(), o.newKey())], true));
      const them = h("button", { type: "button", class: "pill-btn", "data-action": "them-chang" }, "+ Thêm chặng");
      them.addEventListener("click", () => commit([...legs, themChangDi(o.mau(), o.ngayDi(), o.newKey())], true));
      items.push(h("div", { class: "dd-nut" }, ve, them));
    }
    replaceChildren(root, ...items);
    refresh();
    if (focused) root.querySelector<HTMLElement>(`[data-o="${CSS.escape(focused)}"]`)?.focus();
  }

  function refresh(): void {
    const ngayDi = o.ngayDi();
    legs.forEach((l, i) => {
      const r = refs[i];
      if (!r) return;
      const g = goiYChang(l, ngayDi);
      r.hintNgay.textContent = g.ngay;
      r.hintGio.textContent = g.gio;
      r.gioMo.hidden = l.pickupTime !== "";
      const e = loiChang(l, i + 1, o.soKhach(), daLuu);
      datLoi(r.loiDon, r.don, e.don);
      datLoi(r.loiDonTuDo, r.donTuDo, e.donTuDo);
      datLoi(r.loiSoVe, r.soVe, e.soVe);
    });
  }

  build();
  return {
    root,
    update(next, ts) {
      legs = next;
      taoSan = next.length ? ts : null;
      build();
    },
    showIssues(show) {
      daLuu = show;
      refresh();
    },
    daBo: () => [...boXong],
  };
}
