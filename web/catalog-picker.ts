// Ô "Chọn từ danh mục": hàng chip "Nhóm dịch vụ" (kèm chip "★ Hay dùng") NẰM TRÊN ô gõ + danh sách kết quả (tên, mã, đơn vị, giá người lớn). Chạm một kết quả = thêm thẻ (onPick).
// Đợt 1 (bảng việc 13/10, #3, #7, #8): bỏ hàng "Lọc sẵn có" ("Theo người" / "Giá theo nhóm" không còn lối vào; "★ Hay dùng" thành một chip của hàng Nhóm dịch vụ, chọn MỘT trong "Tất cả" /
// "★ Hay dùng" / một nhóm); chạm hoặc focus vào ô gõ là hiện cả danh sách (kể cả khi ô vẫn đang giữ focus sau lần chọn trước — iPhone không chuyển focus khi chạm nút); dấu ☆ lên đầu dòng;
// thanh nhỏ đầu danh sách có số dịch vụ và nút "Đóng" (Esc cũng đóng). Đây chỉ là cách HIỂN THỊ: dữ liệu tải và luật lọc theo vai (ADR-0033) không đổi.
// Dịch vụ chưa hỗ trợ đơn vị hoặc chưa có giá hiện mờ, không chạm được (ghi "chưa hỗ trợ" / "chưa có giá"; ADR-0061: người ĐƯỢC nhập tay — `setNhapTay(true)` —
// thấy "chưa hỗ trợ — dùng nhập tay", gợi ý nút "+ Dịch vụ nhập tay"; người không được nhập tay chỉ thấy "chưa hỗ trợ" như bản 1.40): `aria-disabled` chứ không `disabled`, để vẫn nằm trong cây truy cập (người dùng đọc màn hình biết có mục này). Dịch vụ đã ẩn không có trong /api/catalog/for-order (nguồn của form lập đơn, ADR-0033) nên không hiện.
// Danh sách là các nút thường (không role listbox/option: listbox đòi tên + mô hình phím mũi tên mà ở đây không có). Mỗi dòng: nút ghim ☆/★ "Hay dùng" (`.catalog-ghim`) + nút chọn (`.catalog-pick`) — anh em, không lồng.
import type { CatalogGroupDto, CatalogServiceDto } from "../src/shared/contracts";
import { unitLabel } from "../src/shared/service-form";
import { CHUA_PHAN_LOAI, boLocAn, docNhoDanhMuc, docNhoNhom, doiGhim, khoaNhoNhom, locDanhMuc, locTheoNhom, type ChonNhom, type NhoDanhMuc } from "../src/shared/loc-danh-muc";
import { h, replaceChildren } from "./dom";
import { vnd } from "./format";

export interface CatalogPicker {
  root: HTMLElement;
  setItems(items: readonly CatalogServiceDto[]): void;
  /** Thông báo của danh mục (trống / chưa đồng bộ được / không tải được); null = ẩn. */
  setNotice(text: string | null): void;
  /** Khoá ô tìm kèm lý do (vd "Đơn đã đủ 20 dịch vụ."); null = mở lại. */
  setDisabled(reason: string | null): void;
  /** Bản 1.39: mã dịch vụ đang có trong đơn — kết quả tìm trùng mã gắn nhãn "đã chọn" (KHÔNG chặn chọn trùng, chủ quyết). */
  setSelected(codes: Iterable<string>): void;
  /** ADR-0061: người dùng được nhập tay (`duocDung` của máy chủ) — dịch vụ chưa hỗ trợ ghi "chưa hỗ trợ — dùng nhập tay". */
  setNhapTay(duocNhapTay: boolean): void;
  focus(): void;
  /** ADR-0058 Đ8: nhóm dịch vụ (thứ tự của máy chủ) cho hàng chip "Nhóm dịch vụ"; rỗng = chỉ còn "Tất cả" và "★ Hay dùng". */
  setGroups(groups: readonly CatalogGroupDto[]): void;
  /** Id tài khoản đang đăng nhập (gọi ngay sau `initShell()`): đọc chip nhóm đã nhớ của RIÊNG tài khoản này trên máy. Trước khi gọi: "Tất cả", không đọc / ghi bộ nhớ. */
  setTaiKhoan(staffId: string): void;
}

/** Trần số dòng vẽ trong danh sách (danh mục thật ~109 dịch vụ: vẽ hết để cuộn được; gõ chữ để thu hẹp). */
const MAX_KET_QUA = 150;

const KHOA_NHO = "td.dmLoc.v1";
function docBoNho(): string | null {
  try {
    return localStorage.getItem(KHOA_NHO);
  } catch {
    return null;
  }
}
function ghiBoNho(v: NhoDanhMuc): void {
  try {
    localStorage.setItem(KHOA_NHO, JSON.stringify(v));
  } catch {
    /* bộ nhớ bị chặn: chỉ không nhớ */
  }
}
// Chip nhóm dịch vụ (ADR-0058 Đ8): nhớ THEO TÀI KHOẢN (`khoaNhoNhom`), mọi đọc / ghi bọc try/catch (khuôn help-seen.ts) — bị chặn thì coi như "Tất cả".
function docNhoNhomTho(staffId: string): string | null {
  try {
    return localStorage.getItem(khoaNhoNhom(staffId));
  } catch {
    return null;
  }
}
function ghiNhoNhom(staffId: string, nhom: ChonNhom): void {
  try {
    if (nhom === null) localStorage.removeItem(khoaNhoNhom(staffId));
    else localStorage.setItem(khoaNhoNhom(staffId), JSON.stringify(nhom));
  } catch {
    /* bộ nhớ bị chặn: chỉ không nhớ */
  }
}

export function createCatalogPicker(o: { onPick: (item: CatalogServiceDto) => void }): CatalogPicker {
  const notice = h("div", { class: "alert warn", role: "status", hidden: true });
  // Nhãn "Chọn từ danh mục" ẩn (bảng việc #4): chữ mờ trong ô nói việc cần làm; tên cho trình đọc màn hình ở `aria-label`.
  const q = h("input", { id: "catalog-q", type: "search", placeholder: "Chọn từ danh mục — gõ tên hoặc mã…", "aria-label": "Chọn từ danh mục", autocomplete: "off", "aria-controls": "catalog-list" });
  const reason = h("p", { class: "muted", hidden: true });
  const list = h("div", { id: "catalog-list", class: "catalog-list", hidden: true });
  // Bộ lọc "★ Hay dùng" (ghim trên máy; góp ý YC-0003 — chủ duyệt 30/9) và mã đã ghim nhớ TRÊN MÁY này (bộ nhớ trình duyệt; bị chặn → chỉ không nhớ). Từ đợt 1 "Hay dùng" là một chip
  // của hàng Nhóm dịch vụ; bộ lọc "Theo người" / "Giá theo nhóm" đã nhớ từ trước bị bỏ khi đọc (`boLocAn`: không còn nút nào để tắt).
  let nho: NhoDanhMuc = boLocAn(docNhoDanhMuc(docBoNho()));
  const hayDung = (): boolean => nho.loc === "hay-dung";
  // Hàng "Nhóm dịch vụ" (ADR-0058 Đ8): "Tất cả" + "★ Hay dùng" + các nhóm (thứ tự `groups`) + "Chưa phân loại" (chỉ khi có dịch vụ không nhóm); chọn MỘT chip một lúc;
  // kết hợp VÀ với ô tìm. Hàng trượt ngang (không xuống dòng). Dòng "Đang lọc: <nhóm> — N dịch vụ" nằm NGOÀI danh sách.
  const nhomChips = h("div", { class: "catalog-nhom-chips", role: "group", "aria-labelledby": "catalog-nhom-nhan" });
  // Chữ và nút "Bỏ lọc" dựng MỘT lần (chỉ đổi chữ): nút bị gỡ khỏi trang lúc đang bấm thì bộ nghe "bấm ra ngoài" đóng danh sách.
  const nhomTrangThaiChu = h("span", null);
  const nhomBo = h("button", { type: "button", class: "btn btn-link catalog-nhom-bo" }, "Bỏ lọc");
  const nhomTrangThai = h("p", { class: "catalog-nhom-trang-thai", role: "status", hidden: true }, nhomTrangThaiChu, nhomBo);
  const nhomHang = h("div", { class: "catalog-nhom", "data-cho": "nhom", hidden: true }, h("span", { class: "catalog-hang-nhan", id: "catalog-nhom-nhan" }, "Nhóm dịch vụ"), nhomChips, nhomTrangThai);
  const root = h("div", { class: "catalog" }, notice, nhomHang, q, reason, list);
  let items: readonly CatalogServiceDto[] = [];
  let selected = new Set<string>();
  let groups: readonly CatalogGroupDto[] = [];
  let staffId: string | null = null;
  let nhom: ChonNhom = null;
  let choDoc: string | null | undefined; // bản nhớ đã đọc của tài khoản, chờ có groups để kiểm (undefined = không có gì chờ)
  function apDungNho(): void {
    if (choDoc === undefined || groups.length === 0) return;
    nhom = docNhoNhom(choDoc, groups); // nhóm không còn trong groups / rác → null ("Tất cả")
    choDoc = undefined;
  }

  /** Nhóm đang chọn còn dùng được? (còn trong `groups`; "Chưa phân loại" chỉ khi còn dịch vụ không nhóm) — không thì "Tất cả". Không phụ thuộc thứ tự setGroups / setItems / setTaiKhoan. */
  const coChuaPhanLoai = (): boolean => items.some((c) => c.groupCode === null);
  function nhomHieuLuc(): ChonNhom {
    if (hayDung()) return null; // "Hay dùng" và nhóm loại trừ nhau: chọn Hay dùng thì không lọc theo nhóm
    if (nhom === CHUA_PHAN_LOAI) return coChuaPhanLoai() ? nhom : null;
    return nhom !== null && groups.some((x) => x.code === nhom) ? nhom : null;
  }
  /** Đồng bộ `aria-pressed` của mọi chip theo trạng thái lọc hiện tại (không dựng lại chip: xem `chonNhom`). */
  function capNhatChip(): void {
    const dang = nhomHieuLuc();
    for (const b of nhomChips.querySelectorAll<HTMLButtonElement>(".catalog-nhom-nut")) {
      const bat = b.dataset.loc === "hay-dung" ? hayDung() : !hayDung() && (b.dataset.nhom || null) === dang;
      b.setAttribute("aria-pressed", String(bat));
    }
  }
  function chonNhom(next: ChonNhom): void {
    nhom = next;
    if (staffId !== null) ghiNhoNhom(staffId, next);
    if (hayDung()) {
      nho = { ...nho, loc: null };
      ghiBoNho(nho);
    }
    // Chỉ đổi aria-pressed, KHÔNG dựng lại chip: nút vừa bấm mà bị gỡ khỏi trang thì bộ nghe "bấm ra ngoài" (document) tưởng bấm ngoài ô → đóng danh sách.
    capNhatChip();
    capNhatTrangThai();
    hienChipDangChon();
    render(); // chọn chip = muốn xem dịch vụ của chip đó: danh sách luôn mở
  }
  function chonHayDung(): void {
    nho = { ...nho, loc: hayDung() ? null : "hay-dung" };
    ghiBoNho(nho);
    capNhatChip();
    capNhatTrangThai();
    hienChipDangChon();
    render();
  }
  nhomBo.addEventListener("click", () => {
    nho = { ...nho, loc: null };
    ghiBoNho(nho);
    chonNhom(null);
  });
  function renderNhom(): void {
    nhomHang.hidden = items.length === 0 && groups.length === 0;
    const dang = nhomHieuLuc();
    const chip = (gt: ChonNhom, nhan: string) => {
      const b = h("button", { type: "button", class: "loc-nut catalog-nhom-nut", "aria-pressed": String(!hayDung() && dang === gt), "data-nhom": gt ?? "" }, nhan);
      b.addEventListener("click", () => chonNhom(gt));
      return b;
    };
    const hay = h("button", { type: "button", class: "loc-nut catalog-nhom-nut", "aria-pressed": String(hayDung()), "data-loc": "hay-dung" }, "★ Hay dùng");
    hay.addEventListener("click", chonHayDung);
    replaceChildren(nhomChips, chip(null, "Tất cả"), hay, ...groups.map((x) => chip(x.code, x.name)), coChuaPhanLoai() ? chip(CHUA_PHAN_LOAI, "Chưa phân loại") : null);
    capNhatTrangThai();
    hienChipDangChon();
  }
  /** Chip đang chọn nằm khuất bên phải hàng trượt (vd nhóm nhớ từ lần trước) → trượt NGANG tới nó; không cuộn dọc trang (không dùng scrollIntoView). */
  function hienChipDangChon(): void {
    const b = nhomChips.querySelector<HTMLElement>('.catalog-nhom-nut[aria-pressed="true"]');
    if (!b) return;
    const hang = nhomChips.getBoundingClientRect();
    const chip = b.getBoundingClientRect();
    if (chip.left < hang.left || chip.right > hang.right) nhomChips.scrollLeft += chip.left - hang.left - (hang.width - chip.width) / 2;
  }
  /** "Đang lọc: <nhóm hoặc ★ Hay dùng> — N dịch vụ · Bỏ lọc"; N = số dịch vụ đang hiện (sau ô tìm + chip), trước trần số dòng vẽ. "Bỏ lọc" bỏ chip đang chọn (về "Tất cả"). */
  function capNhatTrangThai(): void {
    const dang = nhomHieuLuc();
    if (dang === null && !hayDung()) {
      nhomTrangThaiChu.textContent = "";
      nhomTrangThai.hidden = true;
      return;
    }
    const ten = hayDung() ? "★ Hay dùng" : dang === CHUA_PHAN_LOAI ? "Chưa phân loại" : (groups.find((x) => x.code === dang)?.name ?? "");
    const n = locTheoNhom(locDanhMuc(items, { kim: q.value, loc: nho.loc, ghim: nho.ghim }), dang).length;
    nhomTrangThaiChu.textContent = `Đang lọc: ${ten} — ${n} dịch vụ · `;
    nhomTrangThai.hidden = false;
  }
  let nhapTay = false;

  function dong(): void {
    list.hidden = true;
  }
  function render(): void {
    capNhatTrangThai();
    const khop = locTheoNhom(locDanhMuc(items, { kim: q.value, loc: nho.loc, ghim: nho.ghim }), nhomHieuLuc());
    const found = khop.slice(0, MAX_KET_QUA);
    const dongBtn = h("button", { type: "button", class: "btn btn-link catalog-dong" }, "Đóng");
    dongBtn.addEventListener("click", dong);
    const dau = h("div", { class: "catalog-dau" }, h("span", { class: "muted" }, khop.length > found.length ? `Hiện ${found.length} / ${khop.length} dịch vụ — gõ để thu hẹp` : `${khop.length} dịch vụ`), dongBtn);
    replaceChildren(
      list,
      dau,
      ...found.map((c) => {
        const usable = c.supported && c.prices.adult !== null;
        // Dòng chọn: tên đứng đầu (xuống dòng tự nhiên), dòng phụ nhỏ "mã · đơn vị · đã chọn"; giá nằm bên phải, không bẻ chữ.
        const b = h(
          "button",
          { type: "button", class: "catalog-pick", "aria-disabled": usable ? false : "true" },
          h(
            "span",
            { class: "catalog-name" },
            h("span", { class: "catalog-ten" }, c.name),
            h("span", { class: "catalog-phu" }, h("strong", null, c.code), c.supported ? h("span", { class: "chip chip-unit" }, unitLabel(c.unit)) : null, selected.has(c.code) ? h("span", { class: "chip chip-picked" }, "đã chọn") : null),
          ),
          h("span", { class: usable ? "price" : "price price-ghi" }, c.supported ? (c.prices.adult === null ? "chưa có giá" : vnd(c.prices.adult)) : nhapTay ? "chưa hỗ trợ — dùng nhập tay" : "chưa hỗ trợ"),
        );
        b.addEventListener("click", () => {
          if (!usable) return; // mục không chọn được: bỏ qua (danh sách vẫn mở)
          o.onPick(c);
          q.value = "";
          list.hidden = true;
          capNhatTrangThai(); // ô tìm vừa xoá: số "N dịch vụ" tính lại
        });
        const daGhim = nho.ghim.includes(c.code);
        const ghim = h("button", { type: "button", class: "catalog-ghim", "aria-pressed": String(daGhim), "aria-label": `${daGhim ? "Bỏ" : "Thêm"} ${c.code} ${daGhim ? "khỏi" : "vào"} Hay dùng`, "data-ghim": c.code }, daGhim ? "★" : "☆");
        ghim.addEventListener("click", () => {
          nho = { ...nho, ghim: doiGhim(nho.ghim, c.code) };
          ghiBoNho(nho);
          render();
          list.querySelector<HTMLButtonElement>(`[data-ghim="${CSS.escape(c.code)}"]`)?.focus();
        });
        return h("div", { class: "catalog-row" }, ghim, b); // dấu sao ở ĐẦU dòng (bảng việc #8)
      }),
      found.length === 0 &&
        h("div", { class: "catalog-empty", role: "status" }, hayDung() && !nho.ghim.length ? "Chưa ghim dịch vụ nào — bấm ☆ cạnh một dịch vụ để thêm vào Hay dùng." : "Không tìm thấy dịch vụ."),
    );
    list.hidden = false;
  }
  q.addEventListener("focus", render);
  q.addEventListener("click", render); // ô đang giữ focus (vd sau khi chọn một dịch vụ, nhất là trên iPhone) thì chạm lại không bắn `focus` — vẫn phải mở danh sách
  q.addEventListener("input", render);
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      dong();
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target instanceof Node && !root.contains(e.target)) list.hidden = true;
  });

  return {
    root,
    setItems(next) {
      items = next;
      renderNhom();
    },
    setGroups(next) {
      groups = next; // tải lại danh mục (xung đột khi lưu) KHÔNG đọc lại bộ nhớ: giữ chip đang chọn, nhomHieuLuc tự bỏ nếu nhóm không còn
      apDungNho();
      renderNhom();
    },
    setTaiKhoan(id) {
      staffId = id;
      choDoc = docNhoNhomTho(id); // đọc bộ nhớ MỘT lần; áp khi đã có groups (danh mục tải SAU initShell)
      apDungNho();
      renderNhom();
    },
    setNotice(text) {
      notice.textContent = text ?? "";
      notice.hidden = !text;
    },
    setDisabled(why) {
      q.disabled = why !== null;
      reason.textContent = why ?? "";
      reason.hidden = why === null;
      if (why !== null) list.hidden = true;
    },
    setSelected(codes) {
      selected = new Set(codes);
      if (!list.hidden) render();
    },
    setNhapTay(v) {
      nhapTay = v;
      if (!list.hidden) render();
    },
    focus: () => q.focus(),
  };
}
