// Ô "Nơi đón" / "Nơi trả" bản MỘT ô của khối Đưa đón ở form Tạo/sửa đơn (Tạo đơn thiết kế lại 18/10/2026, việc 7 — đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md
// mục 3C; bản vẽ docs/design/tao-don-2026-10-18/ khung 4). Thay cặp "ô tìm điểm + ô chọn của máy": chạm ô → ô thành ô gõ, danh sách gợi ý ngay dưới (`goiYNoi`: "tên · loại", dòng cuối
// "Gõ tự do…" / "Gõ tự do: “…”"); chạm một dòng là chọn. Mẫu combobox + listbox của WAI-ARIA: tiêu điểm LUÔN ở ô gõ, dòng đang trỏ báo bằng aria-activedescendant; ↑ ↓ di chuyển,
// Enter chọn, Esc đóng; không cần rê chuột.
// Chữ đã gõ KHÔNG BAO GIỜ mất lặng lẽ (vòng sửa 1 của việc 7 — người kiểm I-1, chủ chọn phương án A; như ô "Địa chỉ đón" cũ ghi từng phím): người lập gõ chữ rồi RỜI ô mà không chạm
// dòng nào — chạm ra ngoài, chạm ô / nút khác (kể cả nút Lưu), Tab, "Xong" của bàn phím iPhone, Enter khi chưa trỏ dòng nào — thì chữ đó được lưu thành địa chỉ gõ tự do (luật thuần
// `chuLuuKhiDong`: chữ rỗng / chỉ dấu cách / trùng giá trị đang có thì giữ nguyên). Esc là HUỶ có chủ đích: trả ô về giá trị đang lưu. Không mở danh sách khi ô chỉ nhận tiêu điểm
// (khối dựng lại trả focus, Lưu báo lỗi đặt focus vào ô): chỉ mở khi chạm / bấm ô, gõ chữ, hoặc ↓.
// Ô nằm trong `<form>` đơn: Enter luôn bị chặn (bẫy đã cắn ở ô tìm danh mục). Chỉ dựng DOM; giá trị và luật chặng ở src/shared/chang-form.ts, gợi ý ở src/shared/goi-y-noi.ts.
import { chuLuuKhiDong, dongTuDo, goiYNoi, type DongGoiYNoi } from "../src/shared/goi-y-noi";
import { h, replaceChildren } from "./dom";

type DongChon = Exclude<DongGoiYNoi, { loai: "tu-do"; chu: "" }>;

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
  /**
   * Người lập chọn một dòng (không gọi với dòng gõ tự do còn trống), hoặc rời ô sau khi gõ (`khiRoi` = true, dòng gõ tự do mang chữ đã gõ). `cham` = chọn bằng chạm cảm ứng (nơi gọi
   * bỏ focus để bàn phím ảo khỏi bật lại sau khi dựng lại). `khiRoi`: người lập đang chạm / bấm / Tab sang chỗ KHÁC — nơi gọi ghi bản nháp NGAY nhưng KHÔNG được dựng lại khối ngay
   * (dựng lại giữa cú chạm thì nút / ô vừa được chạm bị thay và cú chạm mất) — dùng `sauThaoTac`, và không dựng lại khi tiêu điểm đang ở ô ngày / giờ / ô gõ chữ (vòng sửa 2 —
   * `cachDungLaiHen` của src/shared/goi-y-noi.ts).
   */
  chon: (d: DongChon, cham: boolean, khiRoi: boolean) => void;
}

export interface ONoiGoiY {
  o: HTMLInputElement;
  /** `<ul role="listbox">` — đặt NGOÀI `<label>` (bấm nhãn không cướp cú chạm dòng; tên của ô không gộp chữ các dòng). */
  ds: HTMLElement;
  /** Vùng đọc cho máy đọc màn hình: số điểm khớp. */
  bao: HTMLElement;
  /**
   * Giá trị đang lưu đổi từ BÊN NGOÀI mà khối chưa dựng lại (vòng sửa 2: lần dựng lại đang chờ tiêu điểm rời ô ngày / giờ — vd Nơi đón chiều về theo Nơi trả chiều đi): cập nhật chữ
   * ô tại chỗ. Ô đang mở danh sách thì thôi (không đè chữ người lập đang gõ). Chỉ chữ ô — câu nhắc dưới ô vẫn chờ lần dựng lại.
   */
  dat(hienThi: string, laTuDo: boolean): void;
}

const CHU_MO = "Gõ tên điểm hoặc địa chỉ";
const CHU_MO_TU_DO = "Số nhà, đường, phường…";

/** Có ngón tay / chuột đang ấn xuống không (theo dõi cả trang, cài một lần): `sauThaoTac` cần biết để chờ hết cú chạm / bấm. */
let dangAn = false;
const choNha: (() => void)[] = [];
let daCai = false;
function caiTheoDoiAn(): void {
  if (daCai) return;
  daCai = true;
  document.addEventListener("pointerdown", () => { dangAn = true; }, true);
  const nha = () => {
    dangAn = false;
    for (const f of choNha.splice(0)) f();
  };
  document.addEventListener("pointerup", nha, true);
  document.addEventListener("pointercancel", nha, true);
}

/** Số lần bấm phím trên trang (một trình nghe cho cả trang, cài một lần): `nhoChamKichHoat` coi mọi lần bấm phím sau cú ấn là kích hoạt bằng bàn phím. */
let soPhim = 0;
let daCaiPhim = false;

/**
 * Nhớ lần kích hoạt `el` sắp tới có phải bằng CẢM ỨNG không (vòng sửa 1 — M-1, sửa ở vòng 2 — Minor c): Safari bắn `click` / `submit` không mang `pointerType`, nên đọc từ `pointerdown`
 * của chính phần tử. Cờ bị XOÁ khi cú ấn bị huỷ (`pointercancel` — vuốt cuộn), khi nhả tay NGOÀI phần tử (kéo ra ngoài: không có `click`), và khi có lần bấm phím nào sau cú ấn
 * (Enter / Space trên nút, Enter gửi form) — nếu không, lần kích hoạt bằng bàn phím kế tiếp bị coi là cảm ứng. Trả hàm ĐỌC RỒI XOÁ.
 */
export function nhoChamKichHoat(el: HTMLElement): () => boolean {
  if (!daCaiPhim) {
    daCaiPhim = true;
    document.addEventListener("keydown", () => { soPhim++; }, true);
  }
  let cham = false;
  let phimLucAn = 0;
  el.addEventListener("pointerdown", (e) => {
    cham = e.pointerType === "touch" || e.pointerType === "pen";
    phimLucAn = soPhim;
  });
  el.addEventListener("pointercancel", () => { cham = false; });
  el.addEventListener("pointerup", (e) => {
    const duoi = document.elementFromPoint(e.clientX, e.clientY);
    if (!duoi || !el.contains(duoi)) cham = false; // cảm ứng giữ `pointerup` ở phần tử đã ấn dù ngón tay đã kéo ra ngoài
  });
  return () => {
    const co = cham && phimLucAn === soPhim;
    cham = false;
    return co;
  };
}

/**
 * Chạy `fn` SAU khi cú chạm / bấm đang dở (nếu có) xong hẳn — tức sau cả `click` của nó: đang ấn thì chờ `pointerup` rồi thêm một lượt `setTimeout` (`click` đi ngay sau `pointerup`
 * trong cùng lượt xử lý); không ấn (Tab, "Xong" của bàn phím, đang ở pha bắt của `click`) thì chỉ một lượt `setTimeout`. Ấn giữ quá lâu thì sau 1,5 giây vẫn chạy. Trả hàm huỷ.
 */
export function sauThaoTac(fn: () => void): () => void {
  caiTheoDoiAn();
  let xong = false;
  let t = 0;
  const chay = () => {
    if (xong) return;
    xong = true;
    clearTimeout(t);
    fn();
  };
  const henLuot = () => { if (!xong) t = window.setTimeout(chay, 0); };
  if (dangAn) {
    choNha.push(henLuot);
    t = window.setTimeout(chay, 1500);
  } else henLuot();
  return () => {
    xong = true;
    clearTimeout(t);
  };
}

export function taoONoiGoiY(op: ONoiGoiYOptions): ONoiGoiY {
  caiTheoDoiAn(); // theo dõi ấn / nhả từ lúc có ô (cú ấn đầu tiên rời ô cũng phải biết đang ấn)
  const dsId = `${op.id}-ds`;
  // Giá trị đang lưu — đổi tại chỗ khi rời ô giữ chữ gõ (khối dựng lại SAU cú chạm; trong lúc chờ, ô vẫn phải hiện và cư xử đúng giá trị mới).
  let hienThi = op.hienThi;
  let laTuDo = op.laTuDo;
  const o = h("input", {
    id: op.id, type: "text", role: "combobox", autocomplete: "off", maxLength: 200, value: hienThi, placeholder: CHU_MO,
    "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": dsId, "aria-describedby": op.moTa.length ? op.moTa.join(" ") : null, "data-o": op.dataO,
  });
  const ds = h("ul", { id: dsId, class: "dd-goi-y-ds", role: "listbox", "aria-label": `Gợi ý ${op.ten.toLowerCase()}`, hidden: true });
  const bao = h("span", { class: "visually-hidden", role: "status" });
  let mo = false;
  let kim = "";
  let chiSo = -1;
  let dong: DongGoiYNoi[] = [];
  /** Đã gõ chữ từ lúc mở danh sách (chỉ khi đó rời ô mới lưu chữ). */
  let daGo = false;
  /** `pointerType` của cú ấn xuống danh sách gần nhất (M-2: Safari bắn `click` là MouseEvent, không có `pointerType` — nhớ từ `pointerdown` của danh sách). */
  let kieuAn = "";

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
    li.addEventListener("click", () => chonDong(k, kieuAn === "touch" || kieuAn === "pen"));
    return li;
  }
  // Giữ tiêu điểm ở ô gõ khi chạm / bấm danh sách (dòng hay thanh cuộn): không có dòng này thì ô mất focus TRƯỚC cú click và danh sách đóng mất dòng vừa chạm.
  ds.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    kieuAn = e.pointerType;
  });
  ds.addEventListener("mousedown", (e) => e.preventDefault());

  /** Phần tử thuộc chính ô: ô gõ, danh sách, và `<label>` bao ô (nhãn nổi) — chạm vào đó không phải là rời ô. */
  const trongO = (t: EventTarget | null) => t instanceof Node && (t === o || ds.contains(t) || !!o.closest("label")?.contains(t));
  // Chạm / bấm RA NGOÀI ô thì đóng (giữ chữ đã gõ). Nghe `click` ở pha bắt, chứ không `pointerdown`: vuốt cuộn trang không phải là chạm ra ngoài (không có click), và Safari iPhone không
  // bỏ focus ô gõ khi chạm vùng / nút không nhận focus (không có blur) — nên cần lớp này bên cạnh `blur`. Pha bắt chạy TRƯỚC trình xử lý của nút được chạm: nút (vd Lưu) thấy bản nháp đã ghi.
  const ngoai = (e: Event) => {
    if (!o.isConnected) return dong_("huy"); // ô đã bị thay (khối dựng lại): bỏ nghe, không ghi gì từ ô cũ
    if (trongO(e.target)) return;
    dong_("roi");
    o.blur(); // rời ô thật sự (iPhone: hạ bàn phím ảo)
  };
  // Ấn xuống nhãn của ô (không phải chính ô gõ) khi danh sách đang mở: chặn đổi tiêu điểm — nếu không, ô mất focus (rời ô → lưu chữ, đóng) rồi nhãn lại bấm hộ vào ô và mở lại.
  const giuNhan = (e: Event) => {
    if (e.target !== o && trongO(e.target) && !ds.contains(e.target as Node)) e.preventDefault();
  };
  /**
   * Thanh Lưu dính đáy form (`.form-actions`, sticky dưới 960px) che phần dưới khung nhìn, mà `scrollIntoView({ block: "nearest" })` coi cả khung nhìn là chỗ thấy được: ô nằm sát
   * thanh thì danh sách mở ra nằm DƯỚI thanh (rà soát toàn nhánh 19/10, ≤ 640px). Đo phần bị che rồi cuộn thêm đúng chừng đó (+ khe `--s2`), nhưng không bao giờ đẩy ô gõ lên dưới
   * các thanh dính phía trên (`scroll-padding-top` của trang ở điện thoại, `scroll-margin-top` của ô từ 641px) — thanh cao (khung lỗi dài) thì giữ ô gõ, danh sách lộ phần trên và
   * tự cuộn bên trong. Thanh không dính (≥ 960px nằm ở cột phải) hoặc không che: không làm gì. Canh: kich-ban/khong-cuon-truoc-smoke.mjs (bước D-…, chạm mà không cuộn trước).
   */
  const tranhThanhDay = () => {
    const thanh = o.closest("form")?.querySelector<HTMLElement>(".form-actions");
    if (!thanh || getComputedStyle(thanh).position !== "sticky") return;
    const che = ds.getBoundingClientRect().bottom - thanh.getBoundingClientRect().top;
    if (che <= 0) return;
    const goc = getComputedStyle(document.documentElement);
    const tren = (parseFloat(goc.scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(o).scrollMarginTop) || 0);
    const keo = Math.min(che + (parseFloat(goc.getPropertyValue("--s2")) || 0), o.getBoundingClientRect().top - tren);
    if (keo > 0) window.scrollBy(0, keo);
  };
  function moRa(): void {
    if (mo) return;
    mo = true;
    daGo = false;
    kieuAn = "";
    kim = laTuDo ? o.value : "";
    if (!laTuDo) {
      o.value = "";
      o.placeholder = hienThi || CHU_MO; // điểm đang chọn thành chữ mờ: người lập vẫn thấy giá trị hiện tại trong lúc gõ tìm
    }
    chiSo = -1;
    ve();
    ds.hidden = false;
    o.setAttribute("aria-expanded", "true");
    document.addEventListener("click", ngoai, true);
    document.addEventListener("mousedown", giuNhan, true);
    ds.scrollIntoView({ block: "nearest" });
    tranhThanhDay();
  }
  /**
   * Đóng danh sách. `cach`: "huy" (Esc — trả ô về giá trị đang lưu), "chon" (đã chọn một dòng — nơi gọi lo phần còn lại), "roi" (rời ô: chữ đã gõ được LƯU thành gõ tự do theo
   * `chuLuuKhiDong`). Cờ đã gõ xoá TRƯỚC khi gọi `op.chon` (blur / click đến sau không ghi lần hai).
   */
  function dong_(cach: "huy" | "chon" | "roi"): void {
    if (!mo) return;
    const luu = cach === "roi" ? chuLuuKhiDong({ cach: "roi", daGo, chu: o.value, hienThi }) : null;
    mo = false;
    daGo = false;
    const anDs = () => {
      if (mo) return; // đã mở lại trong lúc chờ
      ds.hidden = true;
      replaceChildren(ds);
    };
    // Rời ô bằng một cú chạm / bấm chỗ khác: danh sách nằm TRONG dòng chảy trang (đẩy phần dưới xuống) — ẩn ngay thì ô / nút vừa được ấn xuống bị dời chỗ, lúc nhả tay `click` rơi
    // vào phần tử khác và cú chạm mất. Nên chỉ ẩn SAU cú chạm (`sauThaoTac`); Esc / chọn dòng thì ẩn ngay.
    if (cach === "roi") sauThaoTac(anDs);
    else anDs();
    o.setAttribute("aria-expanded", "false");
    o.removeAttribute("aria-activedescendant");
    o.placeholder = CHU_MO;
    bao.textContent = "";
    chiSo = -1;
    document.removeEventListener("click", ngoai, true);
    document.removeEventListener("mousedown", giuNhan, true);
    if (luu === null) {
      o.value = hienThi;
      return;
    }
    hienThi = luu;
    laTuDo = true;
    o.value = luu;
    op.chon(dongTuDo(luu) as DongChon, false, true);
  }
  function chonDong(k: number, cham: boolean): void {
    const d = dong[k];
    kieuAn = "";
    if (!d) return;
    if (d.loai === "tu-do" && d.chu === "") {
      // "Gõ tự do…" khi chưa gõ gì: không lưu gì, nhắc gõ địa chỉ ngay trong ô
      o.placeholder = CHU_MO_TU_DO;
      bao.textContent = "Gõ địa chỉ vào ô"; // trình đọc màn hình không thấy chữ mờ đổi: báo qua vùng trạng thái (nợ M-4 của việc 7, Việc 9)
      o.focus();
      return;
    }
    dong_("chon");
    op.chon(d as DongChon, cham, false);
  }

  o.addEventListener("click", () => moRa());
  o.addEventListener("beforeinput", () => moRa()); // gõ khi ô chỉ đang có focus (Tab tới): mở và xoá nhãn điểm cũ TRƯỚC khi chữ vào ô
  o.addEventListener("input", () => {
    if (!mo) moRa();
    daGo = true;
    kim = o.value;
    chiSo = -1;
    ve();
  });
  o.addEventListener("keydown", (e) => {
    kieuAn = "";
    // Đang ghép chữ bằng bộ gõ (IME — Telex / VNI, bàn phím tiếng Việt của điện thoại): Enter / mũi tên / Esc thuộc về bộ gõ, không chọn dòng, không đóng (nợ M-3 của việc 7, Việc 9).
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter") {
      e.preventDefault(); // ô nằm trong <form> đơn: Enter không bao giờ gửi form
      if (mo && chiSo >= 0) chonDong(chiSo, false);
      else dong_("roi"); // chưa trỏ dòng nào: giữ chữ đã gõ (không gõ gì thì chỉ đóng)
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
      dong_("huy");
    }
  });
  // Rời ô (Tab, chạm ô / nút nhận focus, "Xong" của bàn phím iPhone): giữ chữ đã gõ. Ô đã bị thay khỏi trang thì chỉ bỏ nghe.
  o.addEventListener("blur", () => dong_(o.isConnected ? "roi" : "huy"));
  const dat = (moiHienThi: string, moiLaTuDo: boolean) => {
    if (mo) return;
    hienThi = moiHienThi;
    laTuDo = moiLaTuDo;
    if (o.value !== hienThi) o.value = hienThi;
  };
  return { o, ds, bao, dat };
}
