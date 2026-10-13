// Ô "Chọn từ danh mục": MỘT nút xổ xuống "Nhóm dịch vụ" (kèm số nhóm đang tick) NẰM TRÊN ô gõ + danh sách kết quả (tên, mã, đơn vị, giá người lớn). Chạm một kết quả = thêm thẻ (onPick).
// Đợt 1 (13/10, ý chủ: "bỏ hết sự rườm rà, chỉ để lại việc lọc theo nhóm sản phẩm bằng nút xổ xuống + tick chọn"): hàng chip nhóm, chip "★ Hay dùng", hàng "Lọc sẵn có" đều đã bỏ.
// Bấm nút → mở bảng nhóm, mỗi dòng một ô tick (vùng bấm ≥ 44px), tick được NHIỀU nhóm, không tick nhóm nào = tất cả; "Bỏ chọn hết"; đóng bằng nút Đóng, Esc hoặc bấm ra ngoài.
// Chạm hoặc focus vào ô gõ là hiện cả danh sách (kể cả khi ô vẫn đang giữ focus sau lần chọn trước — iPhone không chuyển focus khi chạm nút); dấu ☆/★ ở ĐẦU dòng gắn sao dịch vụ hay dùng
// và dịch vụ có sao xếp lên trước (giả định của người thi công); thanh nhỏ đầu danh sách có số dịch vụ và nút "Đóng" (Esc cũng đóng). Đây chỉ là cách HIỂN THỊ: dữ liệu tải và luật lọc theo vai (ADR-0033) không đổi.
// Dịch vụ chưa hỗ trợ đơn vị hoặc chưa có giá hiện mờ, không chạm được (ghi "chưa hỗ trợ" / "chưa có giá"; ADR-0061: người ĐƯỢC nhập tay — `setNhapTay(true)` —
// thấy "chưa hỗ trợ — dùng nhập tay", gợi ý nút "+ Dịch vụ nhập tay"; người không được nhập tay chỉ thấy "chưa hỗ trợ" như bản 1.40): `aria-disabled` chứ không `disabled`, để vẫn nằm trong cây truy cập (người dùng đọc màn hình biết có mục này). Dịch vụ đã ẩn không có trong /api/catalog/for-order (nguồn của form lập đơn, ADR-0033) nên không hiện.
// Danh sách là các nút thường (không role listbox/option: listbox đòi tên + mô hình phím mũi tên mà ở đây không có). Mỗi dòng: nút sao ☆/★ (`.catalog-ghim`) + nút chọn (`.catalog-pick`) — anh em, không lồng.
import type { CatalogGroupDto, CatalogServiceDto } from "../src/shared/contracts";
import { unitLabel } from "../src/shared/service-form";
import { CHUA_PHAN_LOAI, demTheoNhom, docNhoDanhMuc, docNhoNhom, doiGhim, doiNhom, khoaNhoNhom, locDanhMuc, locTheoNhom, xepGhimTruoc, type ChonNhom, type NhoDanhMuc } from "../src/shared/loc-danh-muc";
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
  /** ADR-0058 Đ8: nhóm dịch vụ (thứ tự của máy chủ) cho nút xổ xuống "Nhóm dịch vụ"; rỗng (và không có dịch vụ chưa phân loại) = ẩn nút. */
  setGroups(groups: readonly CatalogGroupDto[]): void;
  /** Id tài khoản đang đăng nhập (gọi ngay sau `initShell()`): đọc các nhóm đã tick của RIÊNG tài khoản này trên máy. Trước khi gọi: không tick nhóm nào (tất cả), không đọc / ghi bộ nhớ. */
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
// Nhóm dịch vụ đã tick (ADR-0058 Đ8): nhớ THEO TÀI KHOẢN (`khoaNhoNhom`), mọi đọc / ghi bọc try/catch (khuôn help-seen.ts) — bị chặn thì coi như không tick nhóm nào (tất cả).
function docNhoNhomTho(staffId: string): string | null {
  try {
    return localStorage.getItem(khoaNhoNhom(staffId));
  } catch {
    return null;
  }
}
function ghiNhoNhom(staffId: string, nhom: ChonNhom): void {
  try {
    if (nhom.length === 0) localStorage.removeItem(khoaNhoNhom(staffId));
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
  // Mã đã gắn sao (☆/★) nhớ TRÊN MÁY này (bộ nhớ trình duyệt; bị chặn → chỉ không nhớ). Bản nhớ cũ còn trường `loc` (bộ lọc "Hay dùng" / "Theo người" / "Giá theo nhóm") thì `docNhoDanhMuc` bỏ qua.
  let nho: NhoDanhMuc = docNhoDanhMuc(docBoNho());
  // Nút xổ xuống "Nhóm dịch vụ" (ADR-0058 Đ8; đợt 1): bấm mở bảng nhóm — mỗi dòng một ô tick, tick NHIỀU nhóm, không tick = tất cả, kết hợp VÀ với ô gõ. Bảng nằm trong dòng chảy trang
  // (không nổi lên che ô gõ). Các dòng ô tick dựng khi có danh mục / nhóm; bấm một ô chỉ đổi `checked` (KHÔNG dựng lại dòng) — xem bộ nghe "bấm ra ngoài" ở dưới.
  const nhomNutChu = h("span", { class: "catalog-nhom-chu" }, "Nhóm dịch vụ");
  const nhomNut = h("button", { type: "button", id: "catalog-nhom-nut", class: "catalog-nhom-nut", "aria-expanded": "false", "aria-controls": "catalog-nhom-bang" }, nhomNutChu, h("span", { class: "catalog-nhom-mui", "aria-hidden": "true" }, "▾"));
  const nhomBo = h("button", { type: "button", class: "btn btn-link catalog-nhom-bo" }, "Bỏ chọn hết");
  const nhomDong = h("button", { type: "button", class: "btn btn-link catalog-nhom-dong" }, "Đóng");
  const nhomSo = h("span", { class: "catalog-nhom-so-ket-qua muted", role: "status" });
  const nhomCacDong = h("div", { class: "catalog-nhom-cac-dong" });
  const nhomBang = h("div", { id: "catalog-nhom-bang", class: "catalog-nhom-bang", role: "group", "aria-label": "Nhóm dịch vụ", hidden: true }, h("div", { class: "catalog-nhom-dau" }, nhomSo, nhomBo, nhomDong), nhomCacDong);
  const nhomHang = h("div", { class: "catalog-nhom", "data-cho": "nhom", hidden: true }, nhomNut, nhomBang);
  const root = h("div", { class: "catalog" }, notice, nhomHang, q, reason, list);
  let items: readonly CatalogServiceDto[] = [];
  let selected = new Set<string>();
  let groups: readonly CatalogGroupDto[] = [];
  let staffId: string | null = null;
  let nhom: string[] = [];
  let choDoc: string | null | undefined; // bản nhớ đã đọc của tài khoản, chờ có groups để kiểm (undefined = không có gì chờ)
  function apDungNho(): void {
    if (choDoc === undefined || groups.length === 0) return;
    nhom = docNhoNhom(choDoc, groups); // nhóm không còn trong groups / rác / mã của bộ lọc đã bỏ → bỏ qua; không còn gì = tất cả
    choDoc = undefined;
  }

  /** Các nhóm đang tick mà còn dùng được (còn trong `groups`; "Chưa phân loại" chỉ khi còn dịch vụ không nhóm). Không phụ thuộc thứ tự setGroups / setItems / setTaiKhoan. */
  const coChuaPhanLoai = (): boolean => items.some((c) => c.groupCode === null);
  const nhomHieuLuc = (): string[] => nhom.filter((x) => (x === CHUA_PHAN_LOAI ? coChuaPhanLoai() : groups.some((gr) => gr.code === x)));
  const ketQua = (): CatalogServiceDto[] => xepGhimTruoc(locTheoNhom(locDanhMuc(items, { kim: q.value }), nhomHieuLuc()), nho.ghim); // ô gõ VÀ nhóm; dịch vụ có sao lên trước
  function moBang(mo: boolean): void {
    nhomBang.hidden = !mo;
    nhomNut.setAttribute("aria-expanded", String(mo));
  }
  /** Nút ghi "Nhóm dịch vụ" hoặc "Nhóm dịch vụ · N"; ô tick khớp trạng thái; "Bỏ chọn hết" tắt khi chưa tick gì; dòng "N dịch vụ" trong bảng. */
  function capNhatNhom(): void {
    const dang = nhomHieuLuc();
    nhomNutChu.textContent = dang.length > 0 ? `Nhóm dịch vụ · ${dang.length}` : "Nhóm dịch vụ";
    for (const cb of nhomCacDong.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) cb.checked = dang.includes(cb.value);
    nhomBo.disabled = dang.length === 0;
    nhomSo.textContent = `${ketQua().length} dịch vụ`;
  }
  function chonNhom(ma: string): void {
    nhom = doiNhom(nhomHieuLuc(), ma);
    if (staffId !== null) ghiNhoNhom(staffId, nhom);
    capNhatNhom();
    if (!list.hidden) render();
  }
  nhomNut.addEventListener("click", () => {
    const mo = nhomNut.getAttribute("aria-expanded") !== "true";
    moBang(mo);
    if (mo) {
      list.hidden = true; // bảng nhóm thay chỗ danh sách trong lúc chọn; đóng bảng thì danh sách hiện lại
      capNhatNhom();
    }
  });
  nhomBo.addEventListener("click", () => {
    nhom = [];
    if (staffId !== null) ghiNhoNhom(staffId, nhom);
    capNhatNhom();
  });
  function dongBang(): void {
    moBang(false);
    nhomNut.focus();
    render(); // chọn nhóm xong = muốn xem dịch vụ của các nhóm đó: danh sách mở
  }
  nhomDong.addEventListener("click", dongBang);
  nhomHang.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nhomNut.getAttribute("aria-expanded") === "true") {
      e.preventDefault();
      e.stopPropagation();
      dongBang();
    }
  });
  function renderNhom(): void {
    nhomHang.hidden = groups.length === 0 && !coChuaPhanLoai();
    const dem = demTheoNhom(items);
    const dongNhom = (ma: string, ten: string) => {
      const cb = h("input", { type: "checkbox", value: ma, "data-nhom": ma });
      cb.addEventListener("change", () => chonNhom(ma));
      return h("label", { class: "catalog-nhom-hang" }, cb, h("span", { class: "catalog-nhom-ten" }, ten), h("span", { class: "catalog-nhom-so muted" }, String(dem.get(ma) ?? 0)));
    };
    replaceChildren(nhomCacDong, ...groups.map((x) => dongNhom(x.code, x.name)), coChuaPhanLoai() ? dongNhom(CHUA_PHAN_LOAI, "Chưa phân loại") : null);
    capNhatNhom();
  }
  let nhapTay = false;

  function dong(): void {
    list.hidden = true;
  }
  function render(): void {
    capNhatNhom();
    const khop = ketQua();
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
          capNhatNhom(); // ô gõ vừa xoá: số "N dịch vụ" của bảng nhóm tính lại
        });
        const daGhim = nho.ghim.includes(c.code);
        const ghim = h("button", { type: "button", class: "catalog-ghim", "aria-pressed": String(daGhim), "aria-label": `${daGhim ? "Bỏ sao" : "Gắn sao"} ${c.code}${daGhim ? "" : " — dịch vụ hay dùng, xếp lên đầu danh sách"}`, "data-ghim": c.code }, daGhim ? "★" : "☆");
        ghim.addEventListener("click", () => {
          nho = { ...nho, ghim: doiGhim(nho.ghim, c.code) };
          ghiBoNho(nho);
          render(); // dịch vụ có sao xếp lên trước ⇒ dòng đổi chỗ; giữ focus ở nút sao của chính dịch vụ đó
          list.querySelector<HTMLButtonElement>(`[data-ghim="${CSS.escape(c.code)}"]`)?.focus();
        });
        return h("div", { class: "catalog-row" }, ghim, b); // dấu sao ở ĐẦU dòng (bảng việc #8)
      }),
      found.length === 0 && h("div", { class: "catalog-empty", role: "status" }, "Không tìm thấy dịch vụ."),
    );
    list.hidden = false;
  }
  q.addEventListener("focus", () => {
    moBang(false); // một lúc chỉ mở một thứ: gõ tên thì bảng nhóm gập lại
    render();
  });
  q.addEventListener("click", () => {
    moBang(false);
    render(); // ô đang giữ focus (vd sau khi chọn một dịch vụ, nhất là trên iPhone) thì chạm lại không bắn `focus` — vẫn phải mở danh sách
  });
  q.addEventListener("input", render);
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      dong();
    }
  });
  // Bấm ra ngoài thì đóng. Dùng `composedPath()` (chụp LÚC bấm) chứ không `root.contains(e.target)`: bấm nút sao dựng lại danh sách, nút bị gỡ khỏi trang trước khi sự kiện nổi tới đây.
  document.addEventListener("click", (e) => {
    if (e.composedPath().includes(root)) return;
    list.hidden = true;
    moBang(false);
  });

  return {
    root,
    setItems(next) {
      items = next;
      renderNhom();
    },
    setGroups(next) {
      groups = next; // tải lại danh mục (xung đột khi lưu) KHÔNG đọc lại bộ nhớ: giữ các nhóm đang tick, nhomHieuLuc tự bỏ nhóm không còn
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
