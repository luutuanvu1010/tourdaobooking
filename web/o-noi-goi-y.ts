// Ô "Nơi đón" / "Nơi trả" bản MỘT ô của khối Đưa đón ở form Tạo/sửa đơn (Tạo đơn thiết kế lại 18/10/2026, việc 7 — đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md
// mục 3C; bản vẽ docs/design/tao-don-2026-10-18/ khung 4). Thay cặp "ô tìm điểm + ô chọn của máy": chạm ô → ô thành ô gõ, danh sách gợi ý ngay dưới (`goiYNoi`: "tên · loại", dòng cuối
// "Gõ tự do…" / "Gõ tự do: “…”"); chạm một dòng là chọn. Mẫu combobox + listbox của WAI-ARIA: tiêu điểm LUÔN ở ô gõ, dòng đang trỏ báo bằng aria-activedescendant; ↑ ↓ di chuyển,
// Enter chọn, Esc đóng; không cần rê chuột.
// Luật giữ thật thà: ô ĐÓNG luôn hiện đúng giá trị sẽ gửi đi — chữ đang gõ chưa chọn dòng nào thì Esc / chạm ra ngoài / Tab trả ô về giá trị đã chọn (không tự lưu chữ gõ dở thành
// địa chỉ, không tự chọn điểm). Không mở danh sách khi ô chỉ nhận tiêu điểm (khối dựng lại trả focus, Lưu báo lỗi đặt focus vào ô): chỉ mở khi chạm / bấm ô, gõ chữ, hoặc ↓.
// Ô nằm trong `<form>` đơn: Enter luôn bị chặn (bẫy đã cắn ở ô tìm danh mục). Chỉ dựng DOM; giá trị và luật chặng ở src/shared/chang-form.ts, gợi ý ở src/shared/goi-y-noi.ts.
import { goiYNoi, type DongGoiYNoi } from "../src/shared/goi-y-noi";
import { h, replaceChildren } from "./dom";

export interface ONoiGoiYOptions {
  /** id của ô gõ (`<label for>` trỏ tới); danh sách lấy id `<id>-ds`, dòng `<id>-ds-<n>`. */
  id: string;
  /** `data-o` của ô (kịch bản và việc trả focus khi khối dựng lại dựa vào nó: `<key>:don` / `<key>:tra`). */
  dataO: string;
  /** Tên ô cho danh sách ("Nơi đón" / "Nơi trả") — danh sách đọc là "Gợi ý nơi đón". */
  ten: string;
  /** Chữ ô hiện khi đóng = giá trị đang chọn (nhãn điểm / địa chỉ gõ tự do); "" = chưa có. */
  hienThi: string;
  /** Giá trị đang chọn là chữ gõ tự do: mở ô thì GIỮ chữ để sửa tiếp (điểm danh mục thì ô trống để gõ tìm, nhãn cũ thành chữ mờ). */
  laTuDo: boolean;
  diem: () => readonly { id: string; nhan: string }[];
  /** Có dòng "Chưa chốt" đầu danh sách (ô Nơi trả đang có giá trị — lối về "chưa chốt" của ô chọn cũ). */
  coChuaChot: boolean;
  /** id các dòng mô tả ô (lỗi, gợi ý) cho `aria-describedby`. */
  moTa: string[];
  /** Dòng nhỏ dưới dòng gõ tự do (nhắc chỉ ghi địa chỉ — không ghi tên, số điện thoại khách). */
  chuPhuTuDo: string;
  /** Người lập chọn một dòng (không gọi với dòng gõ tự do còn trống). `cham` = chọn bằng chạm cảm ứng (nơi gọi bỏ focus để bàn phím ảo khỏi bật lại sau khi dựng lại). */
  chon: (d: Exclude<DongGoiYNoi, { loai: "tu-do"; chu: "" }>, cham: boolean) => void;
}

export interface ONoiGoiY {
  o: HTMLInputElement;
  /** `<ul role="listbox">` — đặt NGOÀI `<label>` (bấm nhãn không cướp cú chạm dòng; tên của ô không gộp chữ các dòng). */
  ds: HTMLElement;
  /** Vùng đọc cho máy đọc màn hình: số điểm khớp. */
  bao: HTMLElement;
}

const CHU_MO = "Gõ tên điểm hoặc địa chỉ";
const CHU_MO_TU_DO = "Số nhà, đường, phường…";

export function taoONoiGoiY(op: ONoiGoiYOptions): ONoiGoiY {
  const dsId = `${op.id}-ds`;
  const o = h("input", {
    id: op.id, type: "text", role: "combobox", autocomplete: "off", maxLength: 200, value: op.hienThi, placeholder: CHU_MO,
    "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": dsId, "aria-describedby": op.moTa.length ? op.moTa.join(" ") : null, "data-o": op.dataO,
  });
  const ds = h("ul", { id: dsId, class: "dd-goi-y-ds", role: "listbox", "aria-label": `Gợi ý ${op.ten.toLowerCase()}`, hidden: true });
  const bao = h("span", { class: "visually-hidden", role: "status" });
  let mo = false;
  let kim = "";
  let chiSo = -1;
  let dong: DongGoiYNoi[] = [];

  const datTro = () => {
    ds.querySelectorAll<HTMLElement>("[role=option]").forEach((li, k) => li.setAttribute("aria-selected", String(k === chiSo)));
    if (chiSo < 0) return o.removeAttribute("aria-activedescendant");
    o.setAttribute("aria-activedescendant", `${dsId}-${chiSo}`);
    document.getElementById(`${dsId}-${chiSo}`)?.scrollIntoView({ block: "nearest" });
  };
  const ve = () => {
    dong = goiYNoi(op.diem(), kim, { coChuaChot: op.coChuaChot });
    if (chiSo >= dong.length) chiSo = -1;
    replaceChildren(ds, ...dong.map((d, k) => dongEl(d, k)));
    datTro();
    const n = dong.filter((d) => d.loai === "diem").length;
    bao.textContent = kim.trim() === "" ? "" : n === 0 ? "Không thấy điểm nào — chọn “Gõ tự do…” để ghi địa chỉ" : `${n} điểm khớp`;
  };
  function dongEl(d: DongGoiYNoi, k: number): HTMLElement {
    const noi =
      d.loai === "diem"
        ? [h("span", { class: "dd-goi-y-ten" }, d.ten), d.loaiDiem ? h("span", { class: "dd-goi-y-loai" }, ` · ${d.loaiDiem}`) : null]
        : d.loai === "tu-do"
          ? [h("span", { class: "dd-goi-y-ten" }, d.nhan), h("span", { class: "dd-goi-y-phu" }, op.chuPhuTuDo)]
          : [h("span", { class: "dd-goi-y-ten" }, d.nhan)];
    const li = h("li", { id: `${dsId}-${k}`, role: "option", "aria-selected": "false", class: `dd-goi-y-dong${d.loai === "diem" ? "" : ` dd-goi-y-${d.loai}`}` }, ...noi);
    li.addEventListener("click", (e) => chonDong(k, e));
    return li;
  }
  // Giữ tiêu điểm ở ô gõ khi chạm / bấm danh sách (dòng hay thanh cuộn): không có dòng này thì ô mất focus TRƯỚC cú click và danh sách đóng mất dòng vừa chạm.
  ds.addEventListener("pointerdown", (e) => e.preventDefault());
  ds.addEventListener("mousedown", (e) => e.preventDefault());

  // Chạm / bấm RA NGOÀI ô và danh sách thì đóng (trả giá trị đã chọn). Nghe `click` chứ không `pointerdown`: vuốt cuộn trang không phải là chạm ra ngoài (không có click), và
  // Safari iPhone không bỏ focus ô gõ khi chạm vùng không nhận focus (không có blur) — nên cần lớp này bên cạnh `blur`.
  const ngoai = (e: Event) => {
    if (e.target instanceof Node && (e.target === o || ds.contains(e.target))) return;
    dong_();
  };
  function moRa(): void {
    if (mo) return;
    mo = true;
    kim = op.laTuDo ? o.value : "";
    if (!op.laTuDo) {
      o.value = "";
      o.placeholder = op.hienThi || CHU_MO; // điểm đang chọn thành chữ mờ: người lập vẫn thấy giá trị hiện tại trong lúc gõ tìm
    }
    chiSo = -1;
    ve();
    ds.hidden = false;
    o.setAttribute("aria-expanded", "true");
    document.addEventListener("click", ngoai, true);
    ds.scrollIntoView({ block: "nearest" });
  }
  /** Đóng danh sách và trả ô về giá trị đang chọn (chữ gõ dở không được lưu). */
  function dong_(): void {
    if (!mo) return;
    mo = false;
    ds.hidden = true;
    replaceChildren(ds);
    o.setAttribute("aria-expanded", "false");
    o.removeAttribute("aria-activedescendant");
    o.value = op.hienThi;
    o.placeholder = CHU_MO;
    bao.textContent = "";
    chiSo = -1;
    document.removeEventListener("click", ngoai, true);
  }
  function chonDong(k: number, e: Event): void {
    const d = dong[k];
    if (!d) return;
    if (d.loai === "tu-do" && d.chu === "") {
      // "Gõ tự do…" khi chưa gõ gì: không lưu gì, nhắc gõ địa chỉ ngay trong ô
      o.placeholder = CHU_MO_TU_DO;
      o.focus();
      return;
    }
    const cham = typeof PointerEvent !== "undefined" && e instanceof PointerEvent && (e.pointerType === "touch" || e.pointerType === "pen");
    dong_();
    op.chon(d as Exclude<DongGoiYNoi, { loai: "tu-do"; chu: "" }>, cham);
  }

  o.addEventListener("click", () => moRa());
  o.addEventListener("beforeinput", () => moRa()); // gõ khi ô chỉ đang có focus (Tab tới): mở và xoá nhãn điểm cũ TRƯỚC khi chữ vào ô
  o.addEventListener("input", () => {
    if (!mo) moRa();
    kim = o.value;
    chiSo = -1;
    ve();
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // ô nằm trong <form> đơn: Enter không bao giờ gửi form
      if (mo && chiSo >= 0) chonDong(chiSo, e);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!mo) return moRa();
      if (dong.length === 0) return;
      chiSo = e.key === "ArrowDown" ? (chiSo + 1) % dong.length : chiSo <= 0 ? dong.length - 1 : chiSo - 1;
      datTro();
      return;
    }
    if (e.key === "Escape" && mo) {
      e.preventDefault();
      dong_();
    }
  });
  o.addEventListener("blur", () => dong_());
  return { o, ds, bao };
}
