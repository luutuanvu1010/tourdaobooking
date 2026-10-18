// Thẻ dịch vụ của form lập/sửa đơn (đặc tả 5.1). Giữ một ServiceDraft; mọi thay đổi đi qua hàm thuần của src/shared/service-form.ts.
// KHÔNG dựng lại ô người dùng đang gõ: cấu trúc (bộ đếm, dòng tiền) chỉ dựng lại khi structKey đổi; còn lại refresh() cập nhật tại chỗ
// và không ghi đè ô đang có focus (gõ tiếng Việt kiểu Telex/VNI không bị ngắt).
// Thiết kế lại 18/10/2026 (đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C): thẻ GẬP được. Đầu thẻ là MỘT nút (`aria-expanded` + `aria-controls`, trong <h3>):
// gập → một khối "tên · số khách · giờ và nơi đón · thành tiền" kèm chip nền cát; mở → tên, mã, và nút thùng rác "Xoá dịch vụ <tên>" bên phải. Thân thẻ đăng ký làm khối gập
// (`taoKhoiGap`) nên chỉ bị ẨN bằng `hidden` — mọi ô vẫn trong cây DOM, thân gửi lên không đổi — và `moKhoiChua` / `moMoiKhoiGap` (Lưu bị từ chối, máy chủ 400) mở được nó.
// Thẻ có lỗi chặn Lưu đang hiện thì luôn mở (`mustStayOpen`); "chỉ một thẻ mở" do trang quyết (web/order-form.ts). Luật chữ dòng gập: src/shared/dong-gap-the.ts.
import { PAX_LABEL, thanhTienDong, type PaxCode } from "../src/shared/order-lines";
import {
  addManualLine, cardCodes, draftIssues, soKhachNhap, draftSubtotal, groupInfo, guestDetail, isFrozenManual, isLocked, previewLines, removeManualLine, setGuests, setManualLine, setPax, setUnitPrice, unitLabel,
  type CatalogDraft, type ManualDraft, type ServiceDraft,
} from "../src/shared/service-form";
import { canhBaoChuyenThe, coLoiChanLuuDangHien, dongGapThe } from "../src/shared/dong-gap-the";
import { tripSummaryLine } from "../src/shared/trip-form";
import { MAX_LINES_PER_ORDER } from "../src/shared/trip-rules";
import { counter, type Counter } from "./counter";
import { h, replaceChildren } from "./dom";
import { parseMoney, vnd } from "./format";
import { icon } from "./icons";
import { taoKhoiGap } from "./khoi-gap";
import { moneyInput, setMoneyValue } from "./money-input";
import { tripFields } from "./trip-fields";
import { taoKhoiDuaDon, type DiemChon } from "./khoi-dua-don";
import type { MauChang } from "../src/shared/chang-mac-dinh";

export interface CardOptions {
  draft: ServiceDraft;
  /** Hôm nay theo giờ Việt Nam (vnToday(new Date())) — cho cảnh báo ngày. */
  today: string;
  /** Mở sẵn khối Thông tin chuyến (máy tính; hoặc khi cuộn tới từ liên kết "Sửa"). ≤ 640px thẻ mới thu gọn. */
  openTrip: boolean;
  /** Còn thêm được dòng tiền cho dịch vụ nhập tay (trần 50 dòng/đơn) — do trang quyết định. */
  canAddLine: () => boolean;
  onChange: (d: ServiceDraft) => void;
  onRemove: () => void;
  /** Thẻ khoá: "Chọn lại từ danh mục" (trang xoá thẻ rồi mở ô tìm). */
  onRepick: () => void;
  /** Tài khoản có quyền Đối tác (ADR-0027 R2) hoặc Thực tập (ADR-0100) — `chiGiaDanhMuc`: đơn giá luôn là giá danh mục — ô đơn giá CHỈ XEM khi đang bằng giá danh mục; nếu đơn cũ đang lệch thì vẫn
   *  sửa được để đưa về đúng giá (máy chủ từ chối mọi giá khác). */
  retailOnly?: boolean;
  /** ADR-0061: người dùng ĐƯỢC nhập tay (`duocDung` của máy chủ) — thẻ nhập tay đã lưu sửa được tên/giá; vắng/false = chỉ xem (máy chủ vẫn kiểm lại). */
  duocNhapTay?: boolean;
  /** Khối "Đưa đón" (ADR-0047 Phần B, bản vẽ M1/M6): ngày đi của cả đơn, mẫu chặng của dịch vụ, điểm danh mục, ô số người chiều về (văn phòng). */
  duaDon: { ngayDi: () => string; mau: () => MauChang | null; diem: () => readonly DiemChon[]; suaSoVe: boolean; newKey: () => string };
  /** Thẻ MỞ lúc dựng: thẻ vừa thêm (phải điền), thẻ của nháp nạp lại khi `theMoKhiNap` (có lỗi / giá trị bị giấu), thẻ được trỏ tới bằng `?focus=`. Thẻ có lỗi chặn Lưu đang hiện luôn mở. */
  moThe: boolean;
  /** Người dùng vừa MỞ thẻ (chạm dòng gập, Enter / Space): trang gập các thẻ khác — chỉ một thẻ mở. Không gọi khi thẻ tự mở vì lỗi hay do trang mở. */
  onMo?: () => void;
  /** Phần tử trang gắn vào CUỐI thân thẻ (dải đặt gấp của từng chặng) — nằm trong phần gập, cùng ẩn / hiện với thân. */
  cuoiThe?: HTMLElement;
}

export interface ServiceCard {
  root: HTMLElement;
  /** Cập nhật hiển thị theo bản nháp mới từ BÊN NGOÀI (vd tải lại danh mục sau 409); không bắn onChange. */
  update(d: ServiceDraft): void;
  /** Trần dòng tiền tính trên CẢ ĐƠN: khi số dòng của bất kỳ thẻ nào đổi, trang gọi hàm này cho MỌI thẻ để nút "+ Thêm dòng" bật/khoá đúng ngay. */
  refreshLimits(): void;
  /**
   * Hiện mọi lỗi chặn Lưu trên thẻ (sau lần bấm Lưu đầu). Lỗi "Tối đa 50 khách." luôn hiện. Trả ô lỗi chặng đầu tiên (mở khối gập chứa nó) — xem `KhoiDuaDon.showIssues`; thẻ đang GẬP
   * mà chỉ có lỗi cấp thẻ thì trả ô lỗi đầu tiên của thẻ với `daAn: true` (thẻ vừa mở — trang cuộn tới ô đó và đặt tiêu điểm).
   */
  showIssues(show: boolean): { o: HTMLElement; daAn: boolean } | null;
  /** Mở thẻ, mở khối chuyến và cuộn tới thẻ. */
  reveal(): void;
  hasIssues(): boolean;
  /** Mở / gập thẻ. Gập bị bỏ qua khi thẻ đang có lỗi chặn Lưu (`mustStayOpen`). */
  setOpen(open: boolean): void;
  isOpen(): boolean;
  /** Thẻ có lỗi chặn Lưu ĐANG HIỆN (vd "Tối đa 50 khách."; sau lần bấm Lưu đầu: mọi lỗi chặn Lưu) → luôn mở, kể cả khi đang có thẻ khác mở. */
  mustStayOpen(): boolean;
  /** Chip do trang tính cho dòng gập (vd "Cần đặt gấp" — mốc tối thiểu đọc ở trang). */
  datChipNgoai(chips: readonly string[]): void;
}

interface LineRefs {
  row: HTMLElement;
  qty: HTMLElement;
  price: HTMLInputElement;
  total: HTMLElement;
  tag: HTMLElement;
  old: HTMLElement;
}
interface ManualRefs {
  desc: HTMLInputElement;
  detail: HTMLInputElement;
  qty: Counter;
  price: HTMLInputElement;
  total: HTMLElement;
}

/** Khoá cấu trúc: đổi khoá này thì dựng lại phần thân (bộ đếm, dòng tiền); còn lại chỉ refresh tại chỗ. */
function structKey(d: ServiceDraft, duocNhapTay: boolean): string {
  return d.kind === "catalog"
    ? `c|${d.item.code}|${isLocked(d)}|${d.repick}|${cardCodes(d).join(",")}|${groupInfo(d) !== null}` // KHÔNG có d.source: bản chụp → hiện tại không dựng lại (giữ bàn phím); chữ phụ của bộ đếm cập nhật tại chỗ
    : `m|${isFrozenManual(d, duocNhapTay)}|${d.lines.length}`;
}

export function createServiceCard(o: CardOptions): ServiceCard {
  let draft: ServiceDraft = o.draft;
  let issuesVisible = false;
  const cat = () => draft as CatalogDraft;
  const man = () => draft as ManualDraft;

  // ---- khung cố định của thẻ (dựng một lần) ----
  // Đầu thẻ: MỘT nút bật / tắt (chỉ chứa chữ — trong nút chỉ được có phần tử dòng). `.svc-name` chỉ chứa TÊN (kịch bản so đúng chữ). Phần "gập" (số khách + nơi đón, chip, thành tiền)
  // và phần "mở" (chip đơn vị / mã / trạng thái) cùng nằm trong nút, ẩn / hiện theo trạng thái (`veMo`).
  const nameEl = h("span", { class: "svc-name" });
  const chipsEl = h("span", { class: "svc-chips" });
  const tomTatEl = h("span", { class: "svc-gon-tom-tat" });
  const chipGonEl = h("span", { class: "svc-gon-chips" });
  const tienGonEl = h("span", { class: "svc-gon-tien" });
  const nutMo = h(
    "button",
    { type: "button", class: "svc-mo", "data-action": "mo-the" },
    h("span", { class: "svc-mo-chu" }, nameEl, chipsEl, tomTatEl, chipGonEl),
    h("span", { class: "svc-mo-phai" }, tienGonEl, icon("chevron-down", 16)),
  );
  const body = h("div", null);
  const totalEl = h("output", { class: "svc-total-amount" });
  const issuesEl = h("div", { class: "field-errors", role: "alert" });
  const warningsEl = h("div", { class: "svc-warnings" });
  // Thùng rác thay chữ "Xoá" (bản vẽ khung 4): màu nguy hiểm, vùng chạm 44px; tên cho trình đọc màn hình nêu tên dịch vụ (cập nhật khi tên đổi — `veDongGap`). Hành vi xoá giữ nguyên.
  const remove = h("button", { type: "button", class: "svc-remove", "aria-label": "Xoá dịch vụ" }, icon("trash", 20));
  remove.addEventListener("click", () => o.onRemove());
  /** Chip do trang tính (đặt gấp) — `datChipNgoai`. */
  let chipNgoai: readonly string[] = [];
  /** Nhãn ngắn của điểm danh mục theo id ("Khách sạn Biển Xanh · khách sạn" → "Khách sạn Biển Xanh"), như dòng tóm tắt chặng gọn của khối Đưa đón. */
  const nhanTheoId = (id: string): string | null => {
    const nhan = o.duaDon.diem().find((x) => x.id === id)?.nhan;
    if (nhan === undefined) return null;
    const cat = nhan.lastIndexOf(" · ");
    return cat > 0 ? nhan.slice(0, cat) : nhan;
  };

  const duaDon = taoKhoiDuaDon({
    legs: draft.legs, taoSan: draft.taoSan, che: "form", ma: draft.key, ...o.duaDon, soKhach: () => soKhachNhap(draft),
    onChange: (legs, taoSan) => commit({ ...draft, legs, taoSan }),
  });

  const summaryEl = h("span", { class: "trip-summary" });
  const fields = tripFields({ trip: draft.trip, onChange: (trip) => commit({ ...draft, trip }), noDepartDate: true, nhanNoi: true }); // ngày khởi hành chọn một lần cho cả đơn (ADR-0021); nhãn nổi trong ô (đợt 1 #4)
  const tripDetails = h("details", { class: "trip" }, h("summary", null, h("span", { class: "trip-title" }, "Thông tin chuyến"), summaryEl), fields.root);
  tripDetails.open = o.openTrip;

  const than = h(
    "div",
    { class: "svc-than" },
    body,
    h("div", { class: "svc-sum" }, h("span", null, "Tổng dịch vụ"), totalEl),
    issuesEl,
    duaDon.root,
    tripDetails,
    warningsEl,
    o.cuoiThe ?? null,
  );
  const root = h("article", { class: "svc svc-the" }, h("header", { class: "svc-head" }, h("h3", { class: "svc-tieu-de" }, nutMo), remove), than);
  /** Lỗi chặn Lưu đang hiện trên thẻ → thẻ luôn mở (`refresh` chốt mở; bấm gập bị trả lại). Trước lần bấm Lưu đầu chỉ tính lỗi hiện ngay (luật ở dong-gap-the.ts). */
  const mustStayOpen = (): boolean => coLoiChanLuuDangHien(draft, issuesVisible);
  const veMo = (mo: boolean): void => {
    root.classList.toggle("svc-dang-gap", !mo);
    chipsEl.hidden = !mo;
    tomTatEl.hidden = mo || tomTatEl.textContent === "";
    chipGonEl.hidden = mo || chipGonEl.childElementCount === 0;
    tienGonEl.hidden = mo;
    remove.hidden = !mo;
  };
  const gap = taoKhoiGap({ ma: `the-${draft.key}`, nhan: "", than, nut: nutMo, mo: o.moThe, khiDoi: veMo });
  nutMo.addEventListener("click", () => {
    // Chạy SAU bộ bật / tắt của `taoKhoiGap` (đăng ký trước): vừa mở → trang gập thẻ khác; vừa gập mà thẻ đang có lỗi chặn Lưu → mở lại (thẻ lỗi không gập được).
    if (gap.laMo()) o.onMo?.();
    else if (mustStayOpen()) gap.mo();
  });

  // ---- phần thân theo loại (dựng lại khi structKey đổi) ----
  let counters = new Map<PaxCode, Counter>();
  let guestDetails = new Map<PaxCode, HTMLElement>(); // dòng phụ dưới nhãn bộ đếm — cập nhật tại chỗ (giá/ghi chú đổi khi thẻ bản chụp chuyển sang giá hiện tại)
  let lineRefs = new Map<PaxCode, LineRefs>();
  let groupHint: HTMLElement | null = null;
  let emptyHint: HTMLElement | null = null;
  let guestCounter: Counter | null = null;
  let nameInput: HTMLInputElement | null = null;
  let manualRefs: ManualRefs[] = [];
  let addLineBtn: HTMLButtonElement | null = null;

  function buildCatalogBody(d: CatalogDraft): HTMLElement {
    const group = groupInfo(d);
    const codes = cardCodes(d);
    const locked = isLocked(d);
    counters = new Map();
    guestDetails = new Map();
    lineRefs = new Map();
    guestCounter = null;
    nameInput = null;
    manualRefs = [];
    addLineBtn = null;
    const guestRows = codes.map((code) => {
      const label = group ? "Số khách" : PAX_LABEL[code];
      const detail = h("div", { class: "muted" }, guestDetail(d, code, vnd));
      guestDetails.set(code, detail);
      const c = counter({ label, value: d.pax[code], onChange: (n) => commit(setPax(cat(), code, n)) });
      c.setDisabled(locked);
      counters.set(code, c);
      return h("div", { class: "guest-row" }, h("div", { class: "guest-info" }, h("div", { class: "guest-label" }, label), detail), c.root);
    });
    groupHint = group ? h("p", { class: "muted svc-group" }) : null;
    let lockedNote: HTMLElement | null = null;
    if (locked) {
      const repick = h("button", { type: "button", class: "btn" }, "Chọn lại từ danh mục");
      repick.addEventListener("click", () => o.onRepick());
      lockedNote = h("div", { class: "svc-locked" }, h("p", { class: "muted" }, d.repick ? "Dịch vụ này không còn trong danh mục và dòng đã lưu thiếu giá danh mục nên chưa lưu được. Chọn lại từ danh mục, hoặc xoá thẻ này." : "Dịch vụ này không còn trong danh mục nên không đổi được số khách. Vẫn sửa được đơn giá và thông tin chuyến."), repick);
    }
    emptyHint = h("p", { class: "svc-empty" }, "Nhập số khách để xem dòng tiền.");
    const rows = codes.map((code) => {
      const name = group ? "Giá mỗi lượt" : PAX_LABEL[code];
      const qty = h("span", { class: "line-qty" });
      const price = moneyInput({ value: d.unitPrices[code] ?? 0, label: group ? "Đơn giá mỗi lượt" : `Đơn giá ${name.toLowerCase()}`, onChange: (n) => commit(setUnitPrice(cat(), code, n)) });
      price.classList.add("price-field");
      const total = h("output", { class: "line-total" });
      const tag = h("span", { class: "tag-price" }, "Khác giá danh mục");
      const old = h("s", { class: "price-old" });
      const row = h("div", { class: "line" }, h("div", { class: "line-name" }, name), total, h("div", { class: "line-edit" }, qty, price, h("span", { class: "line-unit" }, "₫"), tag, old));
      lineRefs.set(code, { row, qty, price, total, tag, old });
      return row;
    });
    return h("div", null, group ? null : h("div", { class: "svc-sub" }, "Số khách"), ...guestRows, groupHint, lockedNote, h("div", { class: "svc-lines" }, emptyHint, ...rows));
  }

  /**
   * Dịch vụ nhập tay ĐÃ LƯU (DK-T3-01, chủ dự án 2026-09-26: "loại bỏ hoàn toàn dịch vụ nhập tay"): CHỈ XEM tên và dòng tiền — máy chủ chỉ nhận lại
   * nguyên văn. Số khách (vận hành) vẫn sửa được; thông tin chuyến và nút thùng rác "Xoá dịch vụ …" nằm ở khung cố định của thẻ nên vẫn dùng được.
   */
  function buildFrozenManualBody(d: ManualDraft): HTMLElement {
    nameInput = null;
    manualRefs = [];
    addLineBtn = null;
    const guests = counter({ label: "Số khách (chỉ để vận hành)", value: d.guests, onChange: (n) => commit(setGuests(man(), n)) });
    guestCounter = guests;
    const lines = d.lines.map((l) =>
      h(
        "div",
        { class: "mline" },
        h("div", null, l.description),
        l.detail ? h("div", { class: "muted" }, l.detail) : null,
        h("div", { class: "mline-nums" }, h("span", null, `${l.quantity} × ${vnd(l.unitPrice)} =`), h("output", { class: "line-total" }, vnd(thanhTienDong(l)))),
      ),
    );
    return h(
      "div",
      null,
      h("div", { class: "svc-locked" }, h("p", { class: "muted" }, "Dịch vụ nhập tay chỉ xem (đang tắt hoặc tài khoản này không được nhập tay); muốn đổi thì xoá và chọn từ danh mục.")),
      h("div", { class: "guest-row" }, h("div", { class: "guest-info" }, h("div", { class: "guest-label" }, "Số khách"), h("div", { class: "muted" }, "Chỉ để vận hành, không nhân với tiền")), guests.root),
      h("div", { class: "svc-sub" }, "Dòng tiền"),
      ...lines,
    );
  }

  function buildManualBody(d: ManualDraft): HTMLElement {
    counters = new Map();
    guestDetails = new Map();
    lineRefs = new Map();
    groupHint = null;
    emptyHint = null;
    if (isFrozenManual(d, o.duocNhapTay)) return buildFrozenManualBody(d);
    const name = h("input", { type: "text", maxLength: 300, autocomplete: "off", value: d.name, placeholder: "Vd: Xe đưa đón riêng" });
    name.addEventListener("input", () => commit({ ...man(), name: name.value }));
    nameInput = name;
    const guests = counter({ label: "Số khách (chỉ để vận hành)", value: d.guests, onChange: (n) => commit(setGuests(man(), n)) });
    guestCounter = guests;
    manualRefs = [];
    const lines = d.lines.map((l, i) => {
      const desc = h("input", { type: "text", maxLength: 300, autocomplete: "off", value: l.description, placeholder: "Vd: Xe 7 chỗ 2 chiều" });
      desc.addEventListener("input", () => commit(setManualLine(man(), i, { description: desc.value })));
      const detail = h("input", { type: "text", maxLength: 1000, autocomplete: "off", value: l.detail });
      detail.addEventListener("input", () => commit(setManualLine(man(), i, { detail: detail.value })));
      const qty = counter({ label: `Số lượng dòng ${i + 1}`, value: l.quantity, onChange: (n) => commit(setManualLine(man(), i, { quantity: n })) });
      const price = moneyInput({ value: l.unitPrice, label: `Đơn giá dòng ${i + 1}`, onChange: (n) => commit(setManualLine(man(), i, { unitPrice: n })) });
      price.classList.add("price-field");
      const total = h("output", { class: "line-total" });
      const rm = h("button", { type: "button", class: "btn btn-link danger" }, "Xoá dòng");
      rm.addEventListener("click", () => commit(removeManualLine(man(), i)));
      manualRefs.push({ desc, detail, qty, price, total });
      return h(
        "div",
        { class: "mline" },
        h("label", null, "Mô tả", desc),
        h("label", null, "Chi tiết", detail),
        h("div", { class: "mline-nums" }, qty.root, h("span", { class: "line-unit" }, "×"), price, h("span", { class: "line-unit" }, "₫ ="), total, rm),
      );
    });
    const add = h("button", { type: "button", class: "btn btn-block" }, "+ Thêm dòng");
    add.addEventListener("click", () => commit(addManualLine(man())));
    addLineBtn = add;
    return h(
      "div",
      null,
      h("label", null, "Tên dịch vụ", name, h("span", { class: "hint" }, "Tên dịch vụ, không ghi tên khách.")),
      h("div", { class: "guest-row" }, h("div", { class: "guest-info" }, h("div", { class: "guest-label" }, "Số khách"), h("div", { class: "muted" }, "Chỉ để vận hành, không nhân với tiền")), guests.root),
      h("div", { class: "svc-sub" }, "Dòng tiền"),
      ...lines,
      add,
    );
  }

  function rebuildBody(): void {
    const d = draft;
    replaceChildren(body, d.kind === "catalog" ? buildCatalogBody(d) : buildManualBody(d));
  }

  // ---- cập nhật tại chỗ ----
  function chips(d: ServiceDraft): HTMLElement[] {
    const out = [h("span", { class: "chip chip-unit" }, unitLabel(d.kind === "catalog" ? d.unit : "manual"))];
    if (d.kind !== "catalog") return out;
    out.push(h("span", { class: "chip chip-code" }, d.code));
    if (isLocked(d) || d.catalogStatus === "unavailable") out.push(h("span", { class: "chip chip-muted" }, "Dịch vụ đã ẩn khỏi danh mục"));
    else if (d.catalogStatus === "price_changed") out.push(h("span", { class: "chip chip-warn" }, "Giá danh mục đã đổi"));
    return out;
  }

  const sync = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    if (document.activeElement !== el && el.value !== value) el.value = value;
  };

  /** Dòng gập (số khách + nơi đón, chip nền cát, thành tiền) và tên nút thùng rác — cập nhật tại chỗ; `datChipNgoai` gọi riêng khi chip của trang đổi. */
  function veDongGap(): void {
    const d = draft;
    const ten = d.kind === "catalog" ? d.name : d.name.trim() || "Dịch vụ nhập tay";
    nameEl.textContent = ten;
    remove.setAttribute("aria-label", `Xoá dịch vụ ${ten}`);
    const dg = dongGapThe(d, { today: o.today, nhanTheoId, chipNgoai });
    tomTatEl.textContent = [dg.khach, dg.don].filter((x) => x).join(" · ");
    replaceChildren(chipGonEl, ...dg.chips.map((c) => h("span", { class: "svc-chip-gon" }, c))); // lớp riêng (không `.chip`): chip của dòng gập không lẫn với chip của đầu thẻ mở khi kịch bản đếm `.chip`
    tienGonEl.textContent = vnd(draftSubtotal(d));
    root.classList.toggle("svc-co-loi", mustStayOpen());
    veMo(gap.laMo());
  }

  function refresh(): void {
    const d = draft;
    replaceChildren(chipsEl, ...chips(d));
    const p = previewLines(d);
    if (d.kind === "catalog") {
      const g = groupInfo(d);
      let visible = 0;
      for (const [code, r] of lineRefs) {
        const line = p.ok ? p.lines.find((l) => l.pax === code) : undefined;
        r.row.hidden = !line;
        if (!line) {
          r.tag.hidden = true; // hàng ẩn thì nhãn/giá gạch ngang cũng ẩn (bộ chọn `.tag-price:not([hidden])` không khớp nhầm hàng không có khách)
          r.old.hidden = true;
          continue;
        }
        visible++;
        r.qty.textContent = g ? `${line.quantity} lượt ×` : `${line.quantity} ×`;
        if (document.activeElement !== r.price && parseMoney(r.price.value) !== line.unitPrice) setMoneyValue(r.price, line.unitPrice);
        r.total.textContent = vnd(line.lineTotal);
        const deviated = line.deviation !== null; // nhãn chỉ có ở dịch vụ danh mục (catalogPrice !== null)
        r.price.readOnly = Boolean(o.retailOnly) && !deviated;
        r.tag.hidden = !deviated;
        r.old.hidden = !deviated;
        if (deviated && line.catalogPrice !== null) r.old.textContent = vnd(line.catalogPrice);
      }
      if (emptyHint) emptyHint.hidden = visible > 0;
      if (groupHint) groupHint.textContent = g && g.guests > 0 ? `${g.guests} khách ÷ ${g.size} = ${g.trips} lượt (làm tròn lên)` : "";
      for (const [code, c] of counters) if (document.activeElement !== c.input) c.set(d.pax[code]);
      for (const [code, el] of guestDetails) el.textContent = guestDetail(d, code, vnd);
    } else {
      if (p.ok) {
        p.lines.forEach((line, i) => {
          const r = manualRefs[i];
          if (r) r.total.textContent = vnd(line.lineTotal);
        });
      }
      if (guestCounter && document.activeElement !== guestCounter.input) guestCounter.set(d.guests);
      if (nameInput) sync(nameInput, d.name);
      manualRefs.forEach((r, i) => {
        const l = d.lines[i];
        if (!l) return;
        sync(r.desc, l.description);
        sync(r.detail, l.detail);
        if (document.activeElement !== r.qty.input) r.qty.set(l.quantity);
        if (document.activeElement !== r.price && parseMoney(r.price.value) !== l.unitPrice) setMoneyValue(r.price, l.unitPrice);
      });
    }
    totalEl.textContent = vnd(draftSubtotal(d));

    const issues = draftIssues(d);
    const tooMany = issues.some((i) => i.code === "too_many_guests");
    counters.forEach((c) => c.setInvalid(tooMany));
    guestCounter?.setInvalid(tooMany);
    // Lỗi chặng hiện ngay dưới ô của chặng (khối Đưa đón) — không lặp ở dải lỗi của thẻ.
    const shown = (issuesVisible ? issues : issues.filter((i) => i.code === "too_many_guests")).filter((i) => i.code !== "leg");
    replaceChildren(issuesEl, ...shown.map((i) => h("p", { class: "field-error" }, icon("alert", 16), i.message)));

    const s = tripSummaryLine(d.trip);
    summaryEl.textContent = s.text;
    summaryEl.classList.toggle("warn", s.warn);
    // "Giờ đón sau giờ khởi hành": giờ đón nay ở chặng — so giờ của chiều đi sớm nhất có giờ (cùng hàm với chip của dòng gập).
    replaceChildren(warningsEl, ...canhBaoChuyenThe(d, o.today).map((w) => h("p", { class: "svc-warn" }, icon("alert", 16), w.message)));
    fields.sync(d.trip);
    if (mustStayOpen() && !gap.laMo()) gap.mo(); // lỗi chặn Lưu vừa hiện (vd "Tối đa 50 khách.", Lưu bị từ chối): thẻ mở ra và giữ mở tới khi người dùng / trang gập lại sau khi hết lỗi
    veDongGap();
  }

  function commit(next: ServiceDraft): void {
    const before = structKey(draft, o.duocNhapTay === true);
    draft = next;
    if (structKey(next, o.duocNhapTay === true) !== before) rebuildBody();
    refresh();
    o.onChange(next); // trang cập nhật bản nháp của mình rồi gọi refreshLimits() của MỌI thẻ (trần dòng tính trên cả đơn)
  }

  /** Nút "+ Thêm dòng" theo trần 50 dòng của CẢ ĐƠN (`o.canAddLine`); khoá thì kèm chữ giải thích (đặc tả 5.1). Trang gọi cho MỌI thẻ sau khi tạo/xoá thẻ và sau mỗi thay đổi. */
  function refreshLimits(): void {
    if (!addLineBtn) return;
    const can = o.canAddLine();
    addLineBtn.disabled = !can;
    addLineBtn.textContent = can ? "+ Thêm dòng" : `Đã đủ ${MAX_LINES_PER_ORDER} dòng tiền — không thêm được nữa`;
  }

  /**
   * Ô ứng với lỗi CẤP THẺ đầu tiên (lỗi chặng do khối Đưa đón tự trả ô của nó): để trang cuộn tới và đặt tiêu điểm khi thẻ GẬP vừa mở vì Lưu bị từ chối (luật gập an toàn 14/10 §2.4b —
   * người lập phải thấy ô đỏ vừa hiện, không phải banner cuối form). Không có ô nhận tiêu điểm hợp lệ → null (trang dùng cả thẻ).
   */
  function oLoiThe(): HTMLElement | null {
    const loi = draftIssues(draft).find((i) => i.code !== "leg");
    if (!loi) return null;
    let o: HTMLElement | null | undefined;
    if (loi.code === "no_guests" || loi.code === "no_paying_guests" || loi.code === "too_many_guests") o = draft.kind === "catalog" ? [...counters.values()][0]?.input : guestCounter?.input;
    else if (loi.code === "name") o = nameInput;
    else if ((loi.code === "line_description" || loi.code === "line_quantity") && draft.kind === "manual") {
      const i = draft.lines.findIndex((l) => (loi.code === "line_description" ? l.description.trim() === "" : l.quantity < 1));
      o = loi.code === "line_description" ? manualRefs[i]?.desc : manualRefs[i]?.qty.input;
    } else if (loi.code === "preview" || loi.code === "amount") o = body.querySelector<HTMLElement>(".price-field");
    const dungDuoc = (e: HTMLElement | null | undefined): e is HTMLElement => !!e && !(e as HTMLInputElement).disabled;
    return dungDuoc(o) ? o : body.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
  }

  rebuildBody();
  refresh();

  return {
    root,
    update(d) {
      const before = structKey(draft, o.duocNhapTay === true);
      const legsDoi = d.legs !== draft.legs || d.taoSan !== draft.taoSan;
      draft = d;
      if (structKey(d, o.duocNhapTay === true) !== before) rebuildBody();
      if (legsDoi) duaDon.update(d.legs, d.taoSan);
      refresh();
      refreshLimits(); // thân có thể vừa được dựng lại: nút "+ Thêm dòng" mới mặc định bật
    },
    refreshLimits,
    showIssues(show) {
      const daGap = !gap.laMo(); // đo TRƯỚC: refresh() bên dưới mở thẻ khi lỗi chặn Lưu vừa hiện
      issuesVisible = show;
      const dau = duaDon.showIssues(show);
      refresh();
      if (dau || !show || !daGap) return dau;
      // Thẻ đang GẬP có lỗi cấp thẻ (vd "Nhập số khách."): chính thẻ không bao giờ "ẩn" (chỉ thân ẩn) nên trang không tự biết — trả ô lỗi đầu tiên, đánh dấu vừa nằm trong khối đóng.
      return gap.laMo() ? { o: oLoiThe() ?? root, daAn: true } : null;
    },
    reveal() {
      gap.mo();
      tripDetails.open = true;
      root.scrollIntoView({ block: "center" });
    },
    hasIssues: () => draftIssues(draft).length > 0,
    setOpen(open) {
      if (open) gap.mo();
      else if (!mustStayOpen()) gap.dong();
    },
    isOpen: () => gap.laMo(),
    mustStayOpen,
    datChipNgoai(chips) {
      if (chips.length === chipNgoai.length && chips.every((c, i) => c === chipNgoai[i])) return;
      chipNgoai = [...chips];
      veDongGap();
    },
  };
}
