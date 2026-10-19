// Khối "Đưa đón" (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach/the-dua-don.dc.html): trong thẻ dịch vụ của form đơn (M1, M6 — `che: "form"`) và trong
// bảng "Sửa đưa đón" của đơn đã xác nhận (M4 — `che: "bang"`: "Bỏ chặng" của chặng đã lưu hỏi lý do). Mọi luật ở src/shared/chang-form.ts; ở đây chỉ dựng DOM.
// KHÔNG dựng lại ô người dùng đang gõ: gõ chữ / ngày / giờ chỉ cập nhật chữ gợi ý và lỗi tại chỗ; đổi ô chọn, thêm / bỏ chặng mới dựng lại (rồi trả focus).
// Nơi đón / nơi trả: form dùng MỘT ô có gợi ý mỗi nơi (web/o-noi-goi-y.ts — Tạo đơn thiết kế lại 18/10/2026, việc 7); bảng "Sửa đưa đón" giữ ô tìm + ô chọn + ô địa chỉ (`oChonNoi`).
import { CHIEU_LABEL, LY_DO_DONG_CHANG, khoangNgayDon, type LyDoDongChang } from "../src/shared/chang-dua-don";
import {
  TU_DO, canHienNgayDon, changNenGon, chiTietChangCoGiaTri, coOSoHieu, goiYChang, loiChang, nhanNoiChang, suaChang, themChangDi, themChieuVe, tomTatChang, type ChangNhap, type SuaChang,
} from "../src/shared/chang-form";
import type { MauChang } from "../src/shared/chang-mac-dinh";
import { KHONG_DUA_DON } from "../src/shared/dong-gap-the";
import { cachDungLaiHen } from "../src/shared/goi-y-noi";
import { locDiem } from "../src/shared/loc-diem";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { taoKhoiGap, type KhoiGap } from "./khoi-gap";
import { khungNhanNoi } from "./o-nhan-noi";
import { nhoChamKichHoat, sauThaoTac, taoONoiGoiY, type ONoiGoiY } from "./o-noi-goi-y";

/**
 * Chỗ đặt tiêu điểm khi người lập dùng CẢM ỨNG (vòng sửa 1 của việc 7, M-1): ô "Nơi đón" / "Nơi trả" bản một ô là ô GÕ CHỮ — đặt tiêu điểm vào nó làm bàn phím ảo iPhone bật lên
 * (ô chọn cũ thì không). Nên với cảm ứng, tiêu điểm vào ĐẦU chặng chứa ô (`tabindex="-1"`, đọc "Chiều đi · Lượt N"); nơi gọi vẫn cuộn ô vào khung nhìn. Phần tử khác: chính nó.
 */
export function tieuDiemKhiCham(el: HTMLElement): HTMLElement {
  if (!(el instanceof HTMLInputElement) || el.getAttribute("role") !== "combobox") return el;
  return el.closest(".dd-chang")?.querySelector<HTMLElement>(".dd-chang-dau[tabindex]") ?? el;
}

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
  let refs: { gapChang: KhoiGap | null; gapChiTiet: KhoiGap | null; tomTatEl: HTMLElement | null; ngayEl: HTMLElement | null; nutKhacNgay: HTMLElement | null; ngay: HTMLInputElement; gio: HTMLInputElement; gioMo: HTMLElement; hintNgay: HTMLElement; hintGio: HTMLElement; loiDon: HTMLElement; loiDonTuDo: HTMLElement | null; loiSoVe: HTMLElement | null; loiChoToiThieu: HTMLElement; hintChoToiThieu: HTMLElement; hauTo: HTMLElement; don: HTMLInputElement | HTMLSelectElement; donTuDo: HTMLInputElement | null; soVe: HTMLInputElement | null; choToiThieu: HTMLInputElement; oDon: ONoiGoiY | null; oTra: ONoiGoiY | null }[] = [];

  const laSanBay = (id: string) => o.diem().some((d) => d.id === id && d.sanBay);
  /** Chữ ô nơi (bản một ô) hiện cho giá trị đang lưu của chặng: nhãn điểm / địa chỉ gõ tự do / "". */
  const hienThiNoi = (l: ChangNhap, loai: "don" | "tra") =>
    nhanNoiChang(l[loai], loai === "don" ? l.donTuDo : l.traTuDo, loai === "don" ? l.goc?.pickupLabel : l.goc?.dropoffLabel, (x) => o.diem().find((d) => d.id === x)?.nhan ?? null);
  /**
   * Lần dựng lại đang HẸN (ô nơi lưu chữ gõ khi người lập rời ô bằng cách chạm / bấm / Tab sang chỗ khác — vòng sửa 1 và 2 của việc 7). Bản nháp đã ghi ngay (`ghiHen`); khối chỉ dựng
   * lại khi AN TOÀN, xét SAU cú chạm (`sauThaoTac`): tiêu điểm ở ô ngày / giờ / ô gõ chữ trong khối, hay ở phần tử mà lần dựng lại không trả tiêu điểm về được, thì KHÔNG dựng (luật
   * thuần `cachDungLaiHen`) — chỉ cập nhật tại chỗ (`refresh`) và xét lại khi tiêu điểm rời phần tử đó (`focusout` của khối). Dựng lại gỡ đúng ô vừa nhận cú chạm: bộ chọn ngày / giờ
   * của máy gắn với ô cũ bị đóng (cú chạm mất) hoặc ghi vào ô đã gỡ (người kiểm lại, I-1 còn mở). `build()` nào chạy trước thì bỏ hẹn; Lưu (`showIssues(true)`) dựng ngay.
   */
  let henDung = false;
  let huyLuot: (() => void) | null = null;
  const thuDung = () => {
    huyLuot = null;
    if (!henDung) return;
    const a = document.activeElement;
    const t = a instanceof HTMLElement
      ? { trongKhoi: root.contains(a), the: a.tagName, kieu: a instanceof HTMLInputElement ? a.type : "", coKhoaTraVe: a.hasAttribute("data-o") || a.hasAttribute("data-gap") }
      : null;
    if (cachDungLaiHen(t) === "ngay") build();
    else refresh();
  };
  const xetLaiSau = () => {
    huyLuot?.();
    huyLuot = sauThaoTac(thuDung);
  };
  // Tiêu điểm rời một phần tử trong khối (sang phần tử khác, hay ra ngoài) khi còn lần dựng lại đang hẹn: xét lại SAU cú chạm / phím đang dở.
  root.addEventListener("focusout", () => {
    if (henDung) xetLaiSau();
  });
  /**
   * Rời ô nơi sau khi gõ (vòng sửa 1, `khiRoi`): ghi bản nháp và báo `onChange` NGAY (nút Lưu vừa được chạm thấy bản nháp mới) nhưng KHÔNG vẽ lại gì giữa cú chạm — kể cả `refresh()`
   * (vòng sửa 2, Minor d: câu lỗi "chưa có nơi đón" ẩn ngay lúc ấn thì ô bên dưới dời lên và cú nhả rơi ra ngoài); việc vẽ đi theo lần dựng lại đã hẹn.
   */
  const ghiHen = (i: number, p: SuaChang) => {
    legs = suaChang(legs, i, p);
    if (legs.length === 0) taoSan = null;
    o.onChange(legs, taoSan);
    henDung = true;
    xetLaiSau();
  };
  const commit = (next: ChangNhap[], rebuild: boolean) => {
    legs = next;
    if (legs.length === 0) taoSan = null;
    o.onChange(legs, taoSan);
    if (rebuild) build();
    else refresh();
  };
  const sua = (i: number, p: SuaChang, rebuild: boolean) => commit(suaChang(legs, i, p), rebuild);

  /**
   * CHỈ bảng "Sửa đưa đón" (`che: "bang"`; form dùng `cotNoiMotO`). Ô chọn nơi: điểm danh mục đang dùng + điểm đang lưu đã ngưng (giữ nhãn đã lưu); đầu "Chọn nơi đón…" / "Chưa chốt"; cuối "Gõ tự do…".
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

  /**
   * Form Tạo/sửa đơn: cột MỘT ô "Nơi đón" / "Nơi trả" có gợi ý (`taoONoiGoiY`, việc 7 của Tạo đơn thiết kế lại 18/10/2026). Chọn dòng ghi ĐÚNG các trường ô chọn cũ ghi: điểm danh mục
   * `{ don: id }`, "Chưa chốt" `{ tra: "" }`, gõ tự do `{ don: TU_DO, donTuDo: chữ }` (cũ: chọn "Gõ tự do…" rồi gõ ô địa chỉ — cùng bản nháp, cùng thân gửi). Chọn lại đúng giá trị đang có
   * thì không ghi gì (ô chọn của máy không bắn `change` khi chọn lại — giữ liên kết "theo chiều đi" / chữ "gợi ý theo dịch vụ"). Lỗi "chưa có nơi đón" và "chưa ghi địa chỉ đón" cùng
   * nằm dưới ô này (`loi`). Chữ gõ tự do kèm câu nhắc chỉ ghi địa chỉ (dưới ô khi đang là chữ tự do, và dưới dòng gõ tự do của danh sách).
   * Rời ô sau khi gõ (`khiRoi`, vòng sửa 1): ghi `{ don: TU_DO, donTuDo: chữ }` NGAY (nút Lưu vừa được chạm thấy bản nháp mới) rồi hẹn dựng lại (`ghiHen`). So "chọn lại đúng giá trị
   * đang có" với bản nháp HIỆN TẠI (`legs[i]`), không với giá trị lúc dựng ô (có thể đã đổi trong lúc chờ dựng lại).
   */
  function cotNoiMotO(l: ChangNhap, i: number, loai: "don" | "tra", goiY: string, loi: HTMLElement | null): { w: ONoiGoiY; cot: HTMLElement } {
    const oid = `${o.ma}-${l.key}-${loai}`;
    const ten = loai === "don" ? "Nơi đón" : "Nơi trả";
    const chon = l[loai];
    const hienThi = hienThiNoi(l, loai);
    const hintTuDo = chon === TU_DO ? h("span", { class: "hint", id: `${oid}-chi-dia-chi` }, CHI_DIA_CHI) : null;
    const hintGoiY = goiY ? h("span", { class: "hint", id: `${oid}-goi-y` }, goiY) : null;
    if (loi) loi.id = `${oid}-loi`;
    const w = taoONoiGoiY({
      id: oid, dataO: `${l.key}:${loai}`, ten, hienThi, laTuDo: chon === TU_DO, diem: o.diem, coChuaChot: loai === "tra" && chon !== "", chuPhuTuDo: CHI_DIA_CHI,
      moTa: [loi?.id, hintTuDo?.id, hintGoiY?.id].filter((x): x is string => !!x),
      chon: (d, cham, khiRoi) => {
        const hienTai = legs[i];
        if (!hienTai) return;
        const moi = d.loai === "diem" ? d.id : d.loai === "chua-chot" ? "" : TU_DO;
        const chuMoi = d.loai === "tu-do" ? d.chu : null;
        if (moi === hienTai[loai] && (chuMoi === null || chuMoi === (loai === "don" ? hienTai.donTuDo : hienTai.traTuDo).trim())) return;
        const p: SuaChang = loai === "don" ? { don: moi, ...(chuMoi !== null ? { donTuDo: chuMoi } : {}) } : { tra: moi, ...(chuMoi !== null ? { traTuDo: chuMoi } : {}) };
        if (khiRoi) return ghiHen(i, p); // bản nháp mới ngay (onChange → Lưu thấy); vẽ lại khi an toàn (sau cú chạm, không gỡ ô đang nhận thao tác)
        sua(i, p, true);
        if (cham && document.activeElement instanceof HTMLElement && root.contains(document.activeElement)) document.activeElement.blur(); // chạm cảm ứng: bàn phím ảo không bật lại sau khi dựng lại
      },
    });
    return { w, cot: h("div", { class: "dd-cot" }, h("label", { for: oid, class: "o-noi" }, khungNhanNoi(ten, w.o)), w.ds, w.bao, loi, hintTuDo, hintGoiY) };
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
    const bo = h("button", { type: "button", class: "btn btn-danger", "data-action": "xac-nhan-bo" }, "Bỏ lượt");
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
      { class: "dd-bo", role: "group", "aria-label": `Bỏ lượt ${i + 1}` },
      h("span", { class: "dd-bo-tieu" }, `Bỏ lượt ${i + 1} · ${CHIEU_LABEL[l.direction]}`),
      h("span", { class: "dd-nhan" }, "Lý do (bắt buộc, chọn một)"),
      h("div", { class: "dd-radio-ds" }, ...lua),
      st.loi ? h("p", { class: "field-error", role: "alert" }, icon("alert", 16), "Chọn lý do bỏ lượt.") : null,
      h("span", { class: "hint" }, "Lượt đã bỏ không mất — xem trong lịch sử đơn."),
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
    const boBtn = h("button", { type: "button", class: "btn-link dd-bo-nut", "data-action": "bo-chang" }, "Bỏ lượt");
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

    // Nơi đón / nơi trả. Form Tạo/sửa đơn (`nn`): MỘT ô có gợi ý mỗi nơi (`cotNoiMotO` — chữ gõ tự do nằm ngay trong ô, không còn ô "Địa chỉ đón" riêng). Bảng "Sửa đưa đón": ô tìm +
    // ô chọn + ô địa chỉ như cũ (ngoài phạm vi thiết kế lại 18/10).
    const loiDon = loiEl();
    let don: HTMLInputElement | HTMLSelectElement;
    let donTuDo: HTMLInputElement | null = null;
    let loiDonTuDo: HTMLElement | null = null;
    let cotDon: HTMLElement;
    let cotTra: HTMLElement;
    let oDon: ONoiGoiY | null = null;
    let oTra: ONoiGoiY | null = null;
    if (nn) {
      const d = cotNoiMotO(l, i, "don", g.don, loiDon);
      const t = cotNoiMotO(l, i, "tra", g.tra, null);
      oDon = d.w;
      oTra = t.w;
      don = d.w.o;
      cotDon = d.cot;
      cotTra = t.cot;
    } else {
      const { sel, tim: timDon, timKq: timDonKq } = oChonNoi(l, "don", id("don"));
      sel.addEventListener("change", () => sua(i, { don: sel.value }, true));
      don = sel;
      if (l.don === TU_DO) {
        const chu = h("input", { id: id("don-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.donTuDo, "data-o": `${l.key}:don-chu` });
        chu.addEventListener("input", () => sua(i, { donTuDo: chu.value }, false));
        donTuDo = chu;
        loiDonTuDo = loiEl();
      }
      const { sel: tra, tim: timTra, timKq: timTraKq } = oChonNoi(l, "tra", id("tra"));
      tra.addEventListener("change", () => sua(i, { tra: tra.value }, true));
      let traTuDo: HTMLInputElement | null = null;
      if (l.tra === TU_DO) {
        const chu = h("input", { id: id("tra-chu"), type: "text", maxLength: 200, autocomplete: "off", placeholder: "Số nhà, đường, phường…", value: l.traTuDo, "data-o": `${l.key}:tra-chu` });
        chu.addEventListener("input", () => sua(i, { traTuDo: chu.value }, false));
        traTuDo = chu;
      }
      cotDon = h(
        "div",
        { class: "dd-cot" },
        h("label", { for: sel.id }, "Nơi đón", timDon, sel, timDonKq, loiDon, g.don ? hint(g.don) : null),
        donTuDo && h("label", { for: donTuDo.id }, "Địa chỉ đón", donTuDo, loiDonTuDo, hint(CHI_DIA_CHI)),
      );
      cotTra = h(
        "div",
        { class: "dd-cot" },
        h("label", { for: tra.id }, "Nơi trả", timTra, tra, timTraKq, g.tra ? hint(g.tra) : null),
        traTuDo && h("label", { for: traTuDo.id }, "Địa chỉ trả", traTuDo, hint(CHI_DIA_CHI)),
      );
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
    refs[i] = { gapChang: null, gapChiTiet, tomTatEl: null, ngayEl: nn ? ngayEl : null, nutKhacNgay, ngay, gio, gioMo, hintNgay, hintGio, loiDon, loiDonTuDo, loiSoVe, loiChoToiThieu, hintChoToiThieu, hauTo, don, donTuDo, soVe, choToiThieu, oDon, oTra };

    const chang = h(
      "div",
      { class: "dd-chang", "data-leg-key": l.key, "data-chieu": l.direction },
      // Form: đầu chặng nhận được tiêu điểm bằng mã (`tabindex="-1"`) — chỗ đặt tiêu điểm khi người lập dùng cảm ứng (`tieuDiemKhiCham`); `data-o` để khối dựng lại trả focus về đúng chỗ.
      h("div", { class: "dd-chang-dau", ...(nn ? { tabindex: "-1", "data-o": `${l.key}:dau` } : {}) }, h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]), h("span", { class: "dd-chang-so" }, `Lượt ${so}`), boBtn),
      h("div", { class: "dd-luoi2" }, ngayEl, gioEl, nutKhacNgay),
      h("div", { class: "dd-luoi-noi" }, cotDon, cotTra),
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
    // Sau khi `taoKhoiGap` đã mở chặng (nghe click trước): chuột / bàn phím → tiêu điểm vào ô Nơi đón; cảm ứng (vòng sửa 1, M-1) → tiêu điểm vào đầu chặng và cuộn ô Nơi đón vào khung
    // nhìn (ô gõ nhận focus thì bàn phím ảo iPhone bật). Kiểu ấn nhớ từ `pointerdown` của chính nút (Safari: `click` không mang `pointerType`), xoá khi cú chạm bị huỷ / bấm phím (vòng 2).
    const laChamTomTat = nhoChamKichHoat(nutTomTat);
    nutTomTat.addEventListener("click", () => {
      const cham = laChamTomTat();
      const oDon = refs[i]?.don;
      if (!oDon) return;
      if (!cham) return oDon.focus();
      oDon.scrollIntoView({ block: "center" });
      tieuDiemKhiCham(oDon).focus({ preventScroll: true });
    });
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
    henDung = false; // dựng ngay → bỏ lần dựng đang hẹn (TRƯỚC khi gỡ phần tử cũ: `focusout` lúc gỡ không hẹn lại)
    huyLuot?.();
    huyLuot = null;
    const dang = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null;
    // Trả focus theo `data-o` (ô) hoặc `data-gap` (nút "Thêm chi tiết") — Tab rời ô nơi sau khi gõ rồi khối dựng lại thì tiêu điểm ở đúng chỗ người lập vừa tới.
    const khoaFocus = dang?.getAttribute("data-o") ? `[data-o="${CSS.escape(dang.getAttribute("data-o")!)}"]` : dang?.getAttribute("data-gap") ? `[data-gap="${CSS.escape(dang.getAttribute("data-gap")!)}"]` : null;
    // Ô nơi đang MỞ danh sách lúc dựng lại (người lập vừa chạm nó, ngay sau khi rời ô kia bằng chạm): ô mới cũng mở — cú chạm không mất.
    const moLaiDs = dang?.getAttribute("role") === "combobox" && dang.getAttribute("aria-expanded") === "true";
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
      items.push(h("div", { class: "dd-trong" }, h("span", null, KHONG_DUA_DON), them)); // cùng chữ với dòng gập của thẻ (dong-gap-the.ts)
    }
    legs.forEach((l, i) => items.push(changEl(l, i)));
    if (legs.length > 0) {
      const ve = h("button", { type: "button", class: "pill-btn", "data-action": "them-chieu-ve" }, "+ Thêm chiều về");
      ve.addEventListener("click", () => commit([...legs, themChieuVe(legs, o.mau(), o.ngayDi(), o.newKey())], true));
      const them = h("button", { type: "button", class: "pill-btn", "data-action": "them-chang" }, "+ Thêm lượt");
      them.addEventListener("click", () => commit([...legs, themChangDi(o.mau(), o.ngayDi(), o.newKey())], true));
      items.push(h("div", { class: "dd-nut" }, ve, them));
    }
    replaceChildren(root, ...items);
    refresh();
    const moi = khoaFocus ? root.querySelector<HTMLElement>(khoaFocus) : null;
    moi?.focus();
    if (moLaiDs && moi?.getAttribute("role") === "combobox") moi.click();
  }

  function refresh(): void {
    const ngayDi = o.ngayDi();
    legs.forEach((l, i) => {
      const r = refs[i];
      if (!r) return;
      const g = goiYChang(l, ngayDi);
      // Ô ngày / giờ LUÔN khớp bản nháp (vòng sửa 2): giá trị có thể tới bản nháp qua một ô đã bị gỡ (bộ chọn của máy còn gắn với ô cũ) — ô đang thấy phải hiện đúng giá trị sẽ gửi đi,
      // và chữ mờ "Chưa chốt giờ" đi cùng giá trị đó. Ô đang gõ dở (`badInput`) thì không đè.
      if (r.ngay.value !== l.pickupDate && !r.ngay.validity.badInput) r.ngay.value = l.pickupDate;
      if (r.gio.value !== l.pickupTime && !r.gio.validity.badInput) r.gio.value = l.pickupTime;
      r.oDon?.dat(hienThiNoi(l, "don"), l.don === TU_DO);
      r.oTra?.dat(hienThiNoi(l, "tra"), l.tra === TU_DO);
      r.hintNgay.textContent = g.ngay;
      capNhatNgay(r.ngayEl, r.nutKhacNgay, l);
      r.hintGio.textContent = g.gio;
      r.gioMo.hidden = l.pickupTime !== "";
      const e = loiChang(l, i + 1, o.soKhach(), daLuu);
      datLoi(r.loiDon, r.don, o.che === "form" ? (e.don ?? e.donTuDo) : e.don); // form: một ô nơi đón mang cả lỗi "chưa ghi địa chỉ đón" (không còn ô địa chỉ riêng)
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
      if (show && henDung) build(); // Lưu: dựng ngay lần đang hẹn (ô nơi vừa lưu chữ gõ) để ô lỗi trả về là phần tử của lần dựng mới nhất
      daLuu = show;
      refresh();
      if (!show) return null;
      let dau: { o: HTMLElement; daAn: boolean } | null = null;
      legs.forEach((l, i) => {
        const e = loiChang(l, i + 1, o.soKhach(), true);
        const r = refs[i];
        const oLoi = !r ? null : e.don !== null ? r.don : e.donTuDo !== null ? (r.donTuDo ?? r.don) : e.soVe !== null ? r.soVe : e.choToiThieu !== null ? r.choToiThieu : null;
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
