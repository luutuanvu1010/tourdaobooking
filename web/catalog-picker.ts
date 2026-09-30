// Ô "Chọn từ danh mục": ô tìm + danh sách kết quả (tên, mã, đơn vị, giá người lớn). Chạm một kết quả = thêm thẻ (onPick).
// Dịch vụ chưa hỗ trợ đơn vị hoặc chưa có giá hiện mờ, không chạm được (ghi "chưa hỗ trợ" / "chưa có giá" — dịch vụ nhập tay đã bỏ từ bản 1.11): `aria-disabled` chứ không `disabled`, để vẫn nằm trong cây truy cập (người dùng đọc màn hình biết có mục này). Dịch vụ đã ẩn không có trong /api/catalog/for-order (nguồn của form lập đơn, ADR-0033) nên không hiện.
// Danh sách là các nút thường (không role listbox/option: listbox đòi tên + mô hình phím mũi tên mà ở đây không có). Mỗi dòng: nút chọn (`.catalog-pick`) + nút ghim ☆/★ "Hay dùng" (`.catalog-ghim`) — anh em, không lồng.
import type { CatalogGroupDto, CatalogServiceDto } from "../src/shared/contracts";
import { unitLabel } from "../src/shared/service-form";
import { CHUA_PHAN_LOAI, LOC_DANH_MUC, demTheoNhom, docNhoDanhMuc, docNhoNhom, doiGhim, khoaNhoNhom, locDanhMuc, locTheoNhom, type ChonNhom, type NhoDanhMuc } from "../src/shared/loc-danh-muc";
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
  focus(): void;
  /** ADR-0058 Đ8: nhóm dịch vụ (thứ tự của máy chủ) cho hàng chip "Nhóm dịch vụ"; rỗng = ẩn hàng. */
  setGroups(groups: readonly CatalogGroupDto[]): void;
  /** Id tài khoản đang đăng nhập (gọi ngay sau `initShell()`): đọc chip nhóm đã nhớ của RIÊNG tài khoản này trên máy. Trước khi gọi: "Tất cả", không đọc / ghi bộ nhớ. */
  setTaiKhoan(staffId: string): void;
}

const MAX_RESULTS = 40;

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
  const q = h("input", { id: "catalog-q", type: "search", placeholder: "Gõ tên hoặc mã dịch vụ…", autocomplete: "off", "aria-controls": "catalog-list" });
  const reason = h("p", { class: "muted", hidden: true });
  const list = h("div", { id: "catalog-list", class: "catalog-list", hidden: true });
  // Hàng lọc (góp ý YC-0003 — chủ duyệt 30/9): "★ Hay dùng" (ghim trên máy) + đơn vị tính; chọn một, bấm lại để bỏ. Bộ lọc và mã đã ghim nhớ TRÊN MÁY
  // này (bộ nhớ trình duyệt; bị chặn → chỉ không nhớ). Chip nhóm dịch vụ (ADR-0058) ở hàng RIÊNG ngay dưới (chủ chọn cách 1, 30/9) — `data-cho="nhom"`.
  let nho: NhoDanhMuc = docNhoDanhMuc(docBoNho());
  const locNut = LOC_DANH_MUC.map((l) => {
    const b = h("button", { type: "button", class: "loc-nut catalog-loc-nut", "aria-pressed": String(nho.loc === l.khoa), "data-loc": l.khoa }, l.nhan);
    b.addEventListener("click", () => {
      nho = { ...nho, loc: nho.loc === l.khoa ? null : l.khoa };
      for (const x of locNut) x.setAttribute("aria-pressed", String(x.dataset.loc === nho.loc));
      ghiBoNho(nho);
      render();
    });
    return b;
  });
  const locHang = h("div", { class: "catalog-loc", role: "group", "aria-labelledby": "catalog-loc-nhan" }, ...locNut);
  // Hàng "Nhóm dịch vụ" (ADR-0058 Đ8): "Tất cả" + các nhóm (thứ tự `groups`) + "Chưa phân loại" (chỉ khi có dịch vụ không nhóm); chọn một chip một lúc;
  // kết hợp VÀ với hàng trên và ô tìm. Nhóm hàng trượt ngang (không xuống dòng). Dòng "Đang lọc: <nhóm> — N dịch vụ" nằm NGOÀI danh sách (danh sách chỉ mở khi bấm ô tìm).
  const nhomChips = h("div", { class: "catalog-nhom-chips", role: "group", "aria-labelledby": "catalog-nhom-nhan" });
  // Chữ và nút "Bỏ lọc" dựng MỘT lần (chỉ đổi chữ): nút bị gỡ khỏi trang lúc đang bấm thì bộ nghe "bấm ra ngoài" đóng danh sách.
  const nhomTrangThaiChu = h("span", null);
  const nhomBo = h("button", { type: "button", class: "btn btn-link catalog-nhom-bo" }, "Bỏ lọc");
  const nhomTrangThai = h("p", { class: "catalog-nhom-trang-thai", role: "status", hidden: true }, nhomTrangThaiChu, nhomBo);
  const nhomHang = h("div", { class: "catalog-nhom", "data-cho": "nhom", hidden: true }, h("span", { class: "catalog-hang-nhan", id: "catalog-nhom-nhan" }, "Nhóm dịch vụ"), nhomChips, nhomTrangThai);
  const root = h("div", { class: "catalog" }, notice, h("label", null, "Chọn từ danh mục", q), h("span", { class: "catalog-hang-nhan", id: "catalog-loc-nhan" }, "Lọc sẵn có"), locHang, nhomHang, reason, list);
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
    if (nhom === CHUA_PHAN_LOAI) return coChuaPhanLoai() ? nhom : null;
    return nhom !== null && groups.some((x) => x.code === nhom) ? nhom : null;
  }
  function chonNhom(next: ChonNhom): void {
    nhom = next;
    if (staffId !== null) ghiNhoNhom(staffId, next);
    // Chỉ đổi aria-pressed, KHÔNG dựng lại chip: nút vừa bấm mà bị gỡ khỏi trang thì bộ nghe "bấm ra ngoài" (document) tưởng bấm ngoài ô → đóng danh sách.
    const dang = nhomHieuLuc();
    for (const b of nhomChips.querySelectorAll<HTMLButtonElement>(".catalog-nhom-nut")) b.setAttribute("aria-pressed", String((b.dataset.nhom || null) === dang));
    capNhatTrangThai();
    hienChipDangChon();
    if (!list.hidden) render();
  }
  nhomBo.addEventListener("click", () => chonNhom(null));
  function renderNhom(): void {
    nhomHang.hidden = groups.length === 0;
    const dang = nhomHieuLuc();
    const chip = (gt: ChonNhom, nhan: string) => {
      const b = h("button", { type: "button", class: "loc-nut catalog-nhom-nut", "aria-pressed": String(dang === gt), "data-nhom": gt ?? "" }, nhan);
      b.addEventListener("click", () => chonNhom(gt));
      return b;
    };
    replaceChildren(nhomChips, chip(null, "Tất cả"), ...groups.map((x) => chip(x.code, x.name)), coChuaPhanLoai() ? chip(CHUA_PHAN_LOAI, "Chưa phân loại") : null);
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
  /** "Đang lọc: <nhóm> — N dịch vụ · Bỏ lọc"; N = số dịch vụ đang hiện (sau ô tìm + hàng lọc trên + nhóm), trước trần 40 kết quả. "Bỏ lọc" chỉ bỏ chip nhóm. */
  function capNhatTrangThai(): void {
    const dang = nhomHieuLuc();
    if (dang === null) {
      nhomTrangThaiChu.textContent = "";
      nhomTrangThai.hidden = true;
      return;
    }
    const ten = dang === CHUA_PHAN_LOAI ? "Chưa phân loại" : (groups.find((x) => x.code === dang)?.name ?? "");
    const n = locTheoNhom(locDanhMuc(items, { kim: q.value, loc: nho.loc, ghim: nho.ghim }), dang).length;
    nhomTrangThaiChu.textContent = `Đang lọc: ${ten} — ${n} dịch vụ · `;
    nhomTrangThai.hidden = false;
  }

  function render(): void {
    capNhatTrangThai();
    const found = locTheoNhom(locDanhMuc(items, { kim: q.value, loc: nho.loc, ghim: nho.ghim }), nhomHieuLuc()).slice(0, MAX_RESULTS);
    replaceChildren(
      list,
      ...found.map((c) => {
        const usable = c.supported && c.prices.adult !== null;
        const b = h(
          "button",
          { type: "button", class: "catalog-pick", "aria-disabled": usable ? false : "true" },
          h("span", { class: "catalog-name" }, h("strong", null, c.code), " ", c.name, c.supported ? h("span", { class: "chip chip-unit" }, unitLabel(c.unit)) : null, selected.has(c.code) ? h("span", { class: "chip chip-picked" }, "đã chọn") : null),
          h("span", { class: "price" }, c.supported ? (c.prices.adult === null ? "chưa có giá" : vnd(c.prices.adult)) : "chưa hỗ trợ"),
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
        return h("div", { class: "catalog-row" }, b, ghim);
      }),
      found.length === 0 &&
        h("div", { class: "catalog-empty", role: "status" }, nho.loc === "hay-dung" && !nho.ghim.length ? "Chưa ghim dịch vụ nào — bấm ☆ cạnh một dịch vụ để thêm vào Hay dùng." : "Không tìm thấy dịch vụ."),
    );
    list.hidden = false;
  }
  q.addEventListener("focus", render);
  q.addEventListener("input", render);
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
    focus: () => q.focus(),
  };
}
