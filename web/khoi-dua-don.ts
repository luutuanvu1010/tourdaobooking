// Khối "Đưa đón" (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/the-dua-don.dc.html): trong thẻ dịch vụ của form đơn (M1, M6 — `che: "form"`) và trong
// bảng "Sửa đưa đón" của đơn đã xác nhận (M4 — `che: "bang"`: "Bỏ chặng" của chặng đã lưu hỏi lý do). Mọi luật ở src/shared/chang-form.ts; ở đây chỉ dựng DOM.
// KHÔNG dựng lại ô người dùng đang gõ: gõ chữ / ngày / giờ chỉ cập nhật chữ gợi ý và lỗi tại chỗ; đổi ô chọn, thêm / bỏ chặng mới dựng lại (rồi trả focus).
import { CHIEU_LABEL, LY_DO_DONG_CHANG, khoangNgayDon, type LyDoDongChang } from "../src/shared/chang-dua-don";
import {
  TU_DO, canHienNgayDon, changNenGon, chiTietChangCoGiaTri, coOSoHieu, goiYChang, loiChang, suaChang, themChangDi, themChieuVe, tomTatChang, type ChangNhap, type SuaChang,
} from "../src/shared/chang-form";
import type { MauChang } from "../src/shared/chang-mac-dinh";
import { locDiem } from "../src/shared/loc-diem";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { taoKhoiGap, type KhoiGap } from "./khoi-gap";
import { khungNhanNoi } from "./o-nhan-noi";

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
  /**
   * Hiện lỗi "chưa có nơi đón" (sau lần bấm Lưu đầu). Form (bản bốn bước): lỗi nằm trong chặng gọn / khối "Thêm chi tiết" gập thì MỞ ra; trả ô lỗi đầu tiên và `daAn` = ô đó đang nằm trong khối đóng
   * TRƯỚC khi mở (nơi gọi cuộn tới ô khi `daAn`, vì khi đó người lập chưa thể thấy nó); không lỗi / `show = false` → null.
   */
  showIssues(show: boolean): { o: HTMLElement; daAn: boolean } | null;
  /** Chặng đã lưu người dùng bỏ (bảng sửa sau xác nhận) kèm lý do. */
  daBo(): { leg: ChangNhap; lyDo: LyDoDongChang }[];
}

const LY_DO = Object.entries(LY_DO_DONG_CHANG) as [LyDoDongChang, string][];
const CHI_DIA_CHI = "Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách";

export function taoKhoiDuaDon(o: KhoiDuaDonOptions): KhoiDuaDon {
  let legs = o.legs;
  let taoSan = o.taoSan;
  let daLuu = false;
  /** Chặng đang mở hộp "Bỏ chặng" (bảng): key → lý do đang chọn ("" = chưa chọn) + đã bấm Bỏ mà chưa chọn. */
  const boMo = new Map<string, { lyDo: LyDoDongChang | ""; loi: boolean }>();
  const boXong: { leg: ChangNhap; lyDo: LyDoDongChang }[] = [];
  /** Form Tạo đơn (đợt 1 #9): chặng người dùng bấm "Đón khác ngày" để mở ô "Ngày đón" (giữ qua các lần dựng lại khối). */
  const moNgay = new Set<string>();
  /**
   * Bản "bốn bước" (14/10/2026), CHỈ form Tạo/sửa đơn: chặng đã đủ nơi đón và không có gì bị giấu thì hiện gọn MỘT dòng (bấm để mở); ba ô ít dùng (số hiệu chuyến bay, xe riêng, xe tối thiểu) gập sau
   * "Thêm chi tiết". Quyết định gọn / mở chỉ lúc LẦN ĐẦU thấy chặng (`daThay`, luật thuần `changNenGon`); chặng đã mở thì giữ mở (`moChang`) — không tự gập giữa lúc người lập đang gõ. Nội dung gập chỉ
   * ẩn bằng `hidden` (vẫn trong cây DOM): không ô nào mất, thân gửi lên không đổi.
   */
  const daThay = new Set<string>();
  const moChang = new Set<string>();
  const moChiTiet = new Set<string>();
  const root = h("div", { class: "dd", "data-dua-don": o.ma });
  /** Phần tử cập nhật tại chỗ theo từng chặng. */
  let refs: { gapChang: KhoiGap | null; gapChiTiet: KhoiGap | null; tomTatEl: HTMLElement | null; ngayEl: HTMLElement | null; nutKhacNgay: HTMLElement | null; gioMo: HTMLElement; hintNgay: HTMLElement; hintGio: HTMLElement; loiDon: HTMLElement; loiDonTuDo: HTMLElement | null; loiSoVe: HTMLElement | null; loiChoToiThieu: HTMLElement; hintChoToiThieu: HTMLElement; hauTo: HTMLElement; don: HTMLSelectElement; donTuDo: HTMLInputElement | null; soVe: HTMLInputElement | null; choToiThieu: HTMLInputElement }[] = [];

  const laSanBay = (id: string) => o.diem().some((d) => d.id === id && d.sanBay);
  const commit = (next: ChangNhap[], rebuild: boolean) => {
    legs = next;
    if (legs.length === 0) taoSan = null;
    o.onChange(legs, taoSan);
    if (rebuild) build();
    else refresh();
  };
  const sua = (i: number, p: SuaChang, rebuild: boolean) => commit(suaChang(legs, i, p), rebuild);

  /**
   * Ô chọn nơi: điểm danh mục đang dùng + điểm đang lưu đã ngưng (giữ nhãn đã lưu); đầu "Chọn nơi đón…" / "Chưa chốt"; cuối "Gõ tự do…".
   * Kèm ô tìm điểm (C10, việc 11 — C4; khuôn ô tìm của `catalog-picker`): gõ thì dựng lại `<option>` của ô chọn TẠI CHỖ (không `build()` — không dựng lại ô
   * đang gõ; không dùng `option.hidden` vì Safari iPhone bỏ qua). Luôn giữ dòng đầu, điểm đang chọn và "Gõ tự do…"; không tự chọn khi chỉ còn một điểm. Chọn
   * xong thì khối dựng lại → ô tìm trống (như `catalog-picker` xoá ô tìm sau khi chọn). Chỉ lọc hiển thị — không đụng khoá so sánh nơi.
   */
  function oChonNoi(l: ChangNhap, loai: "don" | "tra", id: string): { sel: HTMLSelectElement; tim: HTMLInputElement; timKq: HTMLElement } {
    const gt = l[loai];
    const ds = [...o.diem()];
    if (gt !== "" && gt !== TU_DO && !ds.some((d) => d.id === gt)) {
      const nhan = loai === "don" ? l.goc?.pickupLabel : l.goc?.dropoffLabel;
      ds.push({ id: gt, nhan: nhan ?? "Điểm đã ngưng", sanBay: false });
    }
    const sel = h("select", { id, "data-o": `${l.key}:${loai}` });
    const datOption = (kim: string) => {
      replaceChildren(
        sel,
        h("option", { value: "" }, loai === "don" ? "Chọn nơi đón…" : "Chưa chốt"),
        ...locDiem(ds, kim, gt).map((d) => h("option", { value: d.id }, d.nhan)),
        h("option", { value: TU_DO }, "Gõ tự do…"),
      );
      sel.value = gt;
    };
    datOption("");
    const tim = h("input", {
      id: `${id}-tim`, type: "search", autocomplete: "off", placeholder: "Tìm điểm…", "aria-label": loai === "don" ? "Tìm nơi đón" : "Tìm nơi trả", "data-o": `${l.key}:${loai}-tim`,
    });
    const timKq = h("span", { class: "hint", role: "status", hidden: true });
    tim.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault(); // ô nằm trong <form> đơn: Enter không được gửi form (bẫy đã cắn ở ô tìm danh mục)
    });
    tim.addEventListener("input", () => {
      datOption(tim.value);
      const kim = tim.value.trim();
      const n = kim === "" ? 0 : locDiem(o.diem(), kim, "").length;
      timKq.textContent = kim === "" ? "" : n === 0 ? "Không thấy điểm nào — chọn “Gõ tự do…” để ghi địa chỉ" : `${n} điểm khớp — chọn ở ô bên dưới`;
      timKq.hidden = kim === "";
    });
    return { sel, tim, timKq };
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

  /** Nhãn ngắn của điểm danh mục ("<tên> · <loại>" → "<tên>") cho dòng tóm tắt chặng gọn. */
  const nhanNgan = (id: string): string | null => {
    const nhan = o.diem().find((d) => d.id === id)?.nhan;
    if (nhan === undefined) return null;
    const cat = nhan.lastIndexOf(" · ");
    return cat > 0 ? nhan.slice(0, cat) : nhan;
  };

  function changEl(l: ChangNhap, i: number): HTMLElement {
    const so = i + 1;
    // Form Tạo/sửa đơn (`che: "form"`) dùng nhãn nổi trong ô (đợt 1, bảng việc 13/10 #4); bảng "Sửa đưa đón" của trang đơn giữ nhãn phía trên ô như cũ.
    const nn = o.che === "form";
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
    ngay.addEventListener("input", () => {
      moNgay.add(l.key); // đang sửa ô này thì ô không được tự ẩn giữa chừng (vd gõ lại đúng ngày đi)
      sua(i, { pickupDate: ngay.value }, false);
    });
    const gio = h("input", { id: id("gio"), type: "time", value: l.pickupTime, "data-o": `${l.key}:gio` });
    gio.addEventListener("input", () => sua(i, { pickupTime: gio.value }, false));
    const hintNgay = hint(g.ngay);
    // Chữ mờ "Chưa chốt giờ" đặt chồng lên ô giờ khi trống (bản vẽ: ô giờ của máy + chữ mờ); ô đang gõ thì ẩn (CSS :focus-within).
    const gioMo = h("span", { class: "dd-gio-mo", "aria-hidden": "true" }, "Chưa chốt giờ");
    const hintGio = hint(g.gio);

    const { sel: don, tim: timDon, timKq: timDonKq } = oChonNoi(l, "don", id("don"));
    don.addEventListener("change", () => sua(i, { don: don.value }, true));
    const loiDon = loiEl();
    let donTuDo: HTMLInputElement | null = null;
    let loiDonTuDo: HTMLElement | null = null;
    if (l.don === TU_DO) {
      donTuDo = h("input", { id: id("don-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.donTuDo, "data-o": `${l.key}:don-chu` });
      donTuDo.addEventListener("input", () => sua(i, { donTuDo: donTuDo!.value }, false));
      loiDonTuDo = loiEl();
    }
    const { sel: tra, tim: timTra, timKq: timTraKq } = oChonNoi(l, "tra", id("tra"));
    tra.addEventListener("change", () => sua(i, { tra: tra.value }, true));
    let traTuDo: HTMLInputElement | null = null;
    if (l.tra === TU_DO) {
      traTuDo = h("input", { id: id("tra-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.traTuDo, "data-o": `${l.key}:tra-chu` });
      traTuDo.addEventListener("input", () => sua(i, { traTuDo: traTuDo!.value }, false));
    }

    const ngayEl = nn ? h("label", { for: ngay.id, class: "o-noi" }, khungNhanNoi("Ngày đón", ngay), hintNgay) : h("label", { for: ngay.id }, "Ngày đón", ngay, hintNgay);
    const gioEl = nn ? h("label", { for: gio.id, class: "o-noi" }, khungNhanNoi("Giờ đón", gio, { khungClass: "dd-gio", giua: [gioMo] }), hintGio) : h("label", { for: gio.id }, "Giờ đón", h("span", { class: "dd-gio" }, gio, gioMo), hintGio);
    // Form Tạo đơn: "Ngày đón" ẩn khi chặng cùng ngày đi (máy chủ tự điền khi trống); lối nhỏ "Đón khác ngày" nằm cạnh ô giờ để mở ô.
    const nutKhacNgay = nn ? h("button", { type: "button", class: "btn btn-link dd-khac-ngay", "data-action": "don-khac-ngay" }, "Đón khác ngày") : null;
    nutKhacNgay?.addEventListener("click", () => {
      moNgay.add(l.key);
      capNhatNgay(ngayEl, nutKhacNgay, l);
      ngay.focus();
    });
    // Ô phụ của chặng. Form (`nn`): "số người chiều về" ở lại hàng chính; hai ô ÍT DÙNG (xe riêng, xe tối thiểu) vào `phuGap` — gập sau "Thêm chi tiết"; số hiệu chuyến bay HIỆN SẴN (sau kiểm độc lập 14/10: tài xế dựa vào nó). Bảng "Sửa đưa đón": mọi ô một lưới như cũ.
    const phu: HTMLElement[] = [];
    const phuGap: HTMLElement[] = [];
    const themPhu = (el: HTMLElement, gap: boolean) => (nn && gap ? phuGap : phu).push(el);
    if (coOSoHieu(l, laSanBay)) {
      const bay = h("input", { id: id("bay"), type: "text", maxLength: 8, autocomplete: "off", autocapitalize: "characters", placeholder: "VD: VN1553", value: l.flightCode, "data-o": `${l.key}:bay` });
      bay.addEventListener("input", () => sua(i, { flightCode: bay.value }, false));
      themPhu(nn ? h("label", { for: bay.id, class: "o-noi" }, khungNhanNoi("Số hiệu chuyến bay", bay), hint("Tài xế tự tra giờ bay")) : h("label", { for: bay.id }, "Số hiệu chuyến bay", bay, hint("Tài xế tự tra giờ bay")), false);
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
        themPhu(nn ? h("label", { for: soVe.id, class: "o-noi" }, khungNhanNoi("Số người chiều về", soVe), loiSoVe, hint("Để trống nếu cả đoàn cùng về")) : h("label", { for: soVe.id }, "Số người chiều về", soVe, loiSoVe, hint("Để trống nếu cả đoàn cùng về")), false);
      } else {
        themPhu(
          h(
            "div",
            { class: "dd-xem" },
            h("span", { class: "dd-nhan" }, "Số người chiều về"),
            h("span", { class: "dd-xem-gt" }, l.soVe ? `${l.soVe} người` : "Cả đoàn"),
            h("span", { class: "dd-xem-khoa" }, icon("lock", 16), "Văn phòng điều chỉnh số người về"),
          ),
          false,
        );
      }
    }
    // Hai ô cam kết (ADR-0056 VK3-A; bản vẽ 2/10) — LUÔN ở cuối lưới, mọi chặng, mọi chiều. Đối tác / Thực tập sửa được trên nháp (không dùng khuôn "chỉ xem + ổ khoá").
    const dangBat = l.xeRieng;
    const congTac = h("button", { id: id("xe-rieng"), type: "button", role: "switch", class: "dp-switch", "aria-checked": String(dangBat), "data-o": `${l.key}:xe-rieng` },
      h("span", { class: "dp-switch-knob", "aria-hidden": "true" }));
    const chuCongTac = h("span", { class: "dd-switch-chu", "aria-hidden": "true" }, dangBat ? "Bật" : "Tắt");
    congTac.addEventListener("click", () => {
      const bat = congTac.getAttribute("aria-checked") !== "true";
      congTac.setAttribute("aria-checked", String(bat));
      chuCongTac.textContent = bat ? "Bật" : "Tắt";
      sua(i, { xeRieng: bat }, false);
    });
    themPhu(h("div", { class: "dd-xem dd-switch-o" }, h("label", { class: "dd-nhan", for: congTac.id }, "Xe riêng"), h("span", { class: "dd-switch-khung" }, congTac, chuCongTac), hint("Không ghép khách đơn khác")), true);
    const choToiThieu = h("input", { id: id("cho"), type: "text", inputMode: "numeric", maxLength: 3, autocomplete: "off", placeholder: "Để trống = không yêu cầu", value: l.choToiThieu, "data-o": `${l.key}:cho` });
    const hauTo = h("span", { class: "dd-hau-to", "aria-hidden": "true" }, "chỗ");
    hauTo.hidden = l.choToiThieu === "";
    choToiThieu.addEventListener("input", () => {
      sua(i, { choToiThieu: choToiThieu.value }, false);
      if (choToiThieu.value !== legs[i]!.choToiThieu) choToiThieu.value = legs[i]!.choToiThieu;
    });
    const loiChoToiThieu = loiEl();
    const hintChoToiThieu = hint("Không kể tài xế (xe 16 chỗ nhập 15)");
    themPhu(
      nn
        ? h("label", { for: choToiThieu.id, class: "o-noi" }, khungNhanNoi("Xe tối thiểu", choToiThieu, { khungClass: "dd-hau-to-khung", giua: [hauTo] }), loiChoToiThieu, hintChoToiThieu)
        : h("label", { for: choToiThieu.id }, "Xe tối thiểu", h("span", { class: "dd-hau-to-khung" }, choToiThieu, hauTo), loiChoToiThieu, hintChoToiThieu),
      true,
    );

    // Khối gập "Thêm chi tiết" của chặng (form) — tự mở khi bên trong có giá trị (đã tính ở `build`: `moChiTiet`).
    let gapChiTiet: KhoiGap | null = null;
    if (nn) {
      const luoiGap = h("div", { class: "dd-luoi-phu" }, ...phuGap);
      gapChiTiet = taoKhoiGap({ ma: `chi-tiet-${l.key}`, nhan: "Thêm chi tiết (xe riêng, số chỗ)", than: luoiGap, mo: moChiTiet.has(l.key), khiDoi: (mo) => (mo ? moChiTiet.add(l.key) : moChiTiet.delete(l.key)) });
    }
    refs[i] = { gapChang: null, gapChiTiet, tomTatEl: null, ngayEl: nn ? ngayEl : null, nutKhacNgay, gioMo, hintNgay, hintGio, loiDon, loiDonTuDo, loiSoVe, loiChoToiThieu, hintChoToiThieu, hauTo, don, donTuDo, soVe, choToiThieu };

    const chang = h(
      "div",
      { class: "dd-chang", "data-leg-key": l.key, "data-chieu": l.direction },
      h("div", { class: "dd-chang-dau" }, h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]), h("span", { class: "dd-chang-so" }, `Chặng ${so}`), boBtn),
      h("div", { class: "dd-luoi2" }, ngayEl, gioEl, nutKhacNgay),
      h(
        "div",
        { class: "dd-luoi-noi" },
        h(
          "div",
          { class: "dd-cot" },
          nn ? h("label", { for: don.id, class: "o-noi" }, timDon, khungNhanNoi("Nơi đón", don), timDonKq, loiDon, g.don ? hint(g.don) : null) : h("label", { for: don.id }, "Nơi đón", timDon, don, timDonKq, loiDon, g.don ? hint(g.don) : null),
          donTuDo && (nn ? h("label", { for: donTuDo.id, class: "o-noi" }, khungNhanNoi("Địa chỉ đón", donTuDo), loiDonTuDo, hint(CHI_DIA_CHI)) : h("label", { for: donTuDo.id }, "Địa chỉ đón", donTuDo, loiDonTuDo, hint(CHI_DIA_CHI))),
        ),
        h(
          "div",
          { class: "dd-cot" },
          nn ? h("label", { for: tra.id, class: "o-noi" }, timTra, khungNhanNoi("Nơi trả", tra), timTraKq, g.tra ? hint(g.tra) : null) : h("label", { for: tra.id }, "Nơi trả", timTra, tra, timTraKq, g.tra ? hint(g.tra) : null),
          traTuDo && (nn ? h("label", { for: traTuDo.id, class: "o-noi" }, khungNhanNoi("Địa chỉ trả", traTuDo), hint(CHI_DIA_CHI)) : h("label", { for: traTuDo.id }, "Địa chỉ trả", traTuDo, hint(CHI_DIA_CHI))),
        ),
      ),
      phu.length ? h("div", { class: "dd-luoi-phu" }, ...phu) : null,
      gapChiTiet ? gapChiTiet.nut : null,
      gapChiTiet ? gapChiTiet.than : null,
      boMo.has(l.key) ? lyDoBo(l, i) : null,
    );
    if (!nn) return chang;

    // Form: chặng gọn một dòng (bấm để mở) hoặc mở sẵn — quyết ở `build` (`moChang`). Cả hai phần đều nằm trong cây DOM; chỉ ẩn bằng `hidden`.
    const tomTat = h("span", { class: "dd-tom-tat-chu" }, tomTatChang(l, nhanNgan));
    const nutTomTat = h("button", { type: "button", class: "dd-tom-tat", "aria-expanded": "false" }, tomTat, icon("chevron-down", 16));
    const gapChang = taoKhoiGap({ ma: `chang-${l.key}`, nhan: "", than: chang, nut: nutTomTat, mo: moChang.has(l.key), khiDoi: (mo) => { if (mo) moChang.add(l.key); nutTomTat.hidden = mo; } });
    nutTomTat.addEventListener("click", () => refs[i]?.don.focus()); // sau khi `taoKhoiGap` đã mở chặng (nghe click trước)
    refs[i]!.gapChang = gapChang;
    refs[i]!.tomTatEl = tomTat;
    return h("div", { class: "dd-chang-khung" }, nutTomTat, chang);
  }

  /** Form Tạo đơn: hiện ô "Ngày đón" khi chặng có ngày đón khác ngày đi hoặc người dùng đã bấm "Đón khác ngày"; còn lại ẩn ô (`hidden`, vẫn nằm trong cây DOM) và hiện lối "Đón khác ngày". */
  function capNhatNgay(ngayEl: HTMLElement | null, nut: HTMLElement | null, l: ChangNhap): void {
    if (!ngayEl || !nut) return;
    const hien = canHienNgayDon(l, o.ngayDi()) || moNgay.has(l.key);
    ngayEl.hidden = !hien;
    nut.hidden = hien;
  }

  function build(): void {
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement.getAttribute("data-o") : null;
    refs = [];
    if (o.che === "form") {
      legs.forEach((l, i) => {
        if (daThay.has(l.key)) return;
        daThay.add(l.key);
        if (!changNenGon(l, i + 1, o.soKhach(), o.ngayDi(), coOSoHieu(l, laSanBay))) moChang.add(l.key);
        if (chiTietChangCoGiaTri(l)) moChiTiet.add(l.key);
      });
    }
    const items: HTMLElement[] = [h("div", { class: "dd-nhan" }, "Đưa đón")];
    if (taoSan && legs.length > 0) items.push(h("p", { class: "dd-ghi-tao" }, taoSan));
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
      capNhatNgay(r.ngayEl, r.nutKhacNgay, l);
      r.hintGio.textContent = g.gio;
      r.gioMo.hidden = l.pickupTime !== "";
      const e = loiChang(l, i + 1, o.soKhach(), daLuu);
      datLoi(r.loiDon, r.don, e.don);
      datLoi(r.loiDonTuDo, r.donTuDo, e.donTuDo);
      datLoi(r.loiSoVe, r.soVe, e.soVe);
      datLoi(r.loiChoToiThieu, r.choToiThieu, e.choToiThieu);
      r.hintChoToiThieu.hidden = e.choToiThieu !== null;
      r.hauTo.hidden = l.choToiThieu === "";
      if (r.tomTatEl) r.tomTatEl.textContent = tomTatChang(l, nhanNgan);
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
      if (!show) return null;
      let dau: { o: HTMLElement; daAn: boolean } | null = null;
      legs.forEach((l, i) => {
        const e = loiChang(l, i + 1, o.soKhach(), true);
        const r = refs[i];
        const oLoi = !r ? null : e.don !== null ? r.don : e.donTuDo !== null ? r.donTuDo : e.soVe !== null ? r.soVe : e.choToiThieu !== null ? r.choToiThieu : null;
        if (!oLoi) return;
        dau ??= { o: oLoi, daAn: oLoi.getClientRects().length === 0 }; // đo TRƯỚC khi mở
        // Lỗi nằm trong chặng gọn / khối chi tiết gập: mở ra để người lập THẤY ô lỗi (không bao giờ để lỗi trong khối đóng).
        r?.gapChang?.mo();
        if (e.choToiThieu !== null) r?.gapChiTiet?.mo();
      });
      return dau;
    },
    daBo: () => [...boXong],
  };
}
