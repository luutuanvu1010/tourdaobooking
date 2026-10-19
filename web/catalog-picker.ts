// Ô chọn dịch vụ của form lập đơn — thiết kế lại 18/10/2026 (đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3A, đề bài
// PROMPT-CLAUDE-DESIGN.md "A. Chọn dịch vụ"; chủ duyệt hàng nhóm CHỌN MỘT ngày 17/10 — bản đề xuất DE-XUAT-ADR-0130.md (số tạm; ADR-0130 trên main là bảng từ giao diện), thay bảng tick nhiều nhóm của đợt 1 ngày 13/10).
// Thứ tự: ô tìm "Tìm theo tên hoặc mã dịch vụ" (nút ✕ xoá chữ) → MỘT hàng nút nhóm cuộn ngang → khung danh sách LUÔN MỞ, cao cố định (token --h-danh-sach),
// cuộn bên trong; thẻ dịch vụ đã chọn nằm bên dưới (ngoài tệp này). Nút "+ Dịch vụ nhập tay" vẫn ở ngay dưới, trong public/order-form.html.
// Hàng nhóm: "Tất cả" đầu, rồi nhóm theo thứ tự Quản trị, "Chưa phân loại" cuối (nếu còn dịch vụ chưa gán). Chọn MỘT nhóm, chạm là lọc liền, nút không số đếm.
// Mép phải mờ + "›" khi còn nhóm phía sau; nhóm đang chọn luôn được cuộn vào tầm nhìn (đặt scrollLeft, không scrollIntoView để trang không cuộn theo).
// Máy tính ≥ 960px: nút ‹ › hiện khi rê chuột / focus vào hàng; phím ← → (và ↑ ↓) Home End đi giữa các nhóm (radiogroup, roving tabindex). Nhớ nhóm THEO TÀI KHOẢN
// (`khoaNhoNhom`, ghi `ghiNhoMotNhom` — mảng một mã để bản cũ đọc được), mọi đọc / ghi bộ nhớ bọc try/catch (bị chặn = "Tất cả").
// Khung: đầu khung "N dịch vụ" / "N dịch vụ · <nhóm>" (`nhanDem`, đếm lúc chạy). "Tất cả": dịch vụ gắn sao CHỈ ở mục "★ Hay dùng" đầu khung, rồi mục theo nhóm
// (`chiaMuc`); chọn một nhóm: dịch vụ có sao lên đầu (`xepGhimTruoc`). Gõ chữ: tìm trong MỌI nhóm, chia mục theo nhóm, hàng nhóm về "Tất cả", nhóm hết kết quả
// mờ + aria-disabled (không số); chạm nhóm còn sáng để thu hẹp, gõ thêm không nhảy; xoá chữ thì về nhóm đã chọn trước khi tìm (`doiChuTim`, `chamNhom`).
// Dòng: nút sao ☆/★ (`.catalog-ghim`) + nút chọn (`.catalog-pick`) — anh em, không lồng; tên tách ở dấu ":" đầu (phần trước màu chữ phụ), không cắt; mã ở dòng phụ;
// giá người lớn thẳng cột, không "₫"; chỉ dịch vụ tính theo nhóm ghi đơn vị dưới giá (`unitLabel`). Chạm dòng = thêm dịch vụ (onPick): khung ĐỨNG YÊN (không
// dựng lại, không xoá chữ tìm), dòng hiện "✓ đã thêm" (không chặn chọn trùng), không thông báo nổi — vùng aria-live đọc "Đã thêm <tên>".
// Dòng không chọn được ("chưa có giá", "chưa hỗ trợ"; ADR-0061: người được nhập tay thấy "chưa hỗ trợ — dùng nhập tay") mờ, `aria-disabled` chứ không
// `disabled` để còn trong cây truy cập, chạm không tác dụng. Danh sách là nút thường (không listbox/option). Đơn đủ 20 dịch vụ (`setDisabled`): ô tìm,
// hàng nhóm và khung khoá (inert), hiện câu lý do. Đây chỉ là cách HIỂN THỊ: dữ liệu tải và luật lọc theo vai (ADR-0033) không đổi.
// `recompute()` của form gọi `setSelected` / `setDisabled` ở MỖI lần gõ: hai hàm này chỉ sửa tại chỗ (nhãn, khoá), không dựng lại khung — nếu không, vị trí cuộn
// trong khung sẽ nhảy về đầu sau mỗi lần thêm dịch vụ.
import type { CatalogGroupDto, CatalogServiceDto } from "../src/shared/contracts";
import { CHUA_PHAN_LOAI, chamNhom, docNhoDanhMuc, docNhoMotNhom, doiChuTim, doiGhim, dungMucDanhMuc, ghiNhoMotNhom, khoaNhoNhom, nhanDem, tachTenDichVu, type NhoDanhMuc, type TrangThaiNhom } from "../src/shared/loc-danh-muc";
import { parseUnit } from "../src/shared/order-lines";
import { unitLabel } from "../src/shared/service-form";
import { h, replaceChildren } from "./dom";
import { grouped } from "./format";
import { icon } from "./icons";

export interface CatalogPicker {
  root: HTMLElement;
  setItems(items: readonly CatalogServiceDto[]): void;
  /** Thông báo của danh mục (trống / chưa đồng bộ được / không tải được); null = ẩn. */
  setNotice(text: string | null): void;
  /** Khoá ô tìm, hàng nhóm và khung kèm lý do (vd "Đơn đã đủ 20 dịch vụ."); null = mở lại. */
  setDisabled(reason: string | null): void;
  /** Bản 1.39: mã dịch vụ đang có trong đơn — dòng trùng mã hiện "✓ đã thêm" (KHÔNG chặn chọn trùng, chủ quyết). Sửa tại chỗ, không dựng lại khung. */
  setSelected(codes: Iterable<string>): void;
  /** ADR-0061: người dùng được nhập tay (`duocDung` của máy chủ) — dịch vụ chưa hỗ trợ ghi "chưa hỗ trợ — dùng nhập tay". */
  setNhapTay(duocNhapTay: boolean): void;
  focus(): void;
  /** ADR-0058 Đ8: nhóm dịch vụ (thứ tự của máy chủ) cho hàng nút nhóm; rỗng = ẩn hàng nhóm, khung không chia mục. */
  setGroups(groups: readonly CatalogGroupDto[]): void;
  /** Id tài khoản đang đăng nhập (gọi ngay sau `initShell()`): đọc nhóm đã chọn lần trước của RIÊNG tài khoản này trên máy. Trước khi gọi: "Tất cả", không đọc / ghi bộ nhớ. */
  setTaiKhoan(staffId: string): void;
}

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
// Nhóm đã chọn: nhớ THEO TÀI KHOẢN (`khoaNhoNhom`), mọi đọc / ghi bọc try/catch (khuôn help-seen.ts) — bị chặn thì coi như "Tất cả".
function docNhoNhomTho(staffId: string): string | null {
  try {
    return localStorage.getItem(khoaNhoNhom(staffId));
  } catch {
    return null;
  }
}
function ghiNhoNhom(staffId: string, ma: string): void {
  try {
    localStorage.setItem(khoaNhoNhom(staffId), JSON.stringify(ghiNhoMotNhom(ma)));
  } catch {
    /* bộ nhớ bị chặn: chỉ không nhớ */
  }
}

/** Bề rộng mép mờ (token --mep-mo, px) — để cuộn nhóm đang chọn ra khỏi vùng mờ. Không đọc được thì 0. */
function beRongMep(el: Element): number {
  const v = parseFloat(getComputedStyle(el).getPropertyValue("--mep-mo"));
  return Number.isFinite(v) ? v : 0;
}

export function createCatalogPicker(o: { onPick: (item: CatalogServiceDto) => void }): CatalogPicker {
  const notice = h("div", { class: "alert warn", role: "status", hidden: true });
  // Câu lý do khoá: `p.muted` con trực tiếp của `.catalog` (kịch bản a2-smoke-form đọc đúng chỗ này).
  const reasonText = h("span", null);
  // tabindex -1: nhận tiêu điểm khi khung thành inert lúc tiêu điểm đang ở trong khung (thêm dịch vụ thứ 20 bằng bàn phím — nợ T2(4), Việc 9).
  const reason = h("p", { class: "muted catalog-khoa", hidden: true, tabindex: "-1" }, icon("lock", 16), reasonText);
  // Ô tìm giữ type="search": order-form.ts chặn Enter theo đúng kiểu ô này (ô nằm trong <form>).
  const q = h("input", { id: "catalog-q", type: "search", placeholder: "Tìm theo tên hoặc mã dịch vụ", "aria-label": "Tìm theo tên hoặc mã dịch vụ", autocomplete: "off", "aria-controls": "catalog-list" });
  const xoa = h("button", { type: "button", class: "catalog-tim-xoa", "aria-label": "Xoá chữ tìm", hidden: true }, icon("close", 20));
  const tim = h("div", { class: "catalog-tim" }, h("span", { class: "catalog-tim-kinh" }, icon("search", 20)), q, xoa);
  // Hàng nhóm: hàng cuộn là radiogroup (NẰM NGOÀI #catalog-list); "›" và hai nút ‹ › phủ lên mép hàng (aria-hidden / tabindex -1: phím mũi tên đã đủ).
  const cuon = h("div", { class: "catalog-hang-cuon", role: "radiogroup", "aria-label": "Nhóm dịch vụ" });
  const con = h("span", { class: "catalog-hang-con", "aria-hidden": "true", hidden: true }, "›");
  const muiTruoc = h("button", { type: "button", class: "catalog-hang-mui", "data-huong": "truoc", "aria-label": "Xem nhóm phía trước", tabindex: "-1", hidden: true }, "‹");
  const muiSau = h("button", { type: "button", class: "catalog-hang-mui", "data-huong": "sau", "aria-label": "Xem nhóm phía sau", tabindex: "-1", hidden: true }, "›");
  const hang = h("div", { class: "catalog-hang", "data-cho": "nhom", hidden: true }, cuon, con, muiTruoc, muiSau);
  const dau = h("div", { class: "catalog-dau" });
  const list = h("div", { id: "catalog-list", class: "catalog-list" });
  const khung = h("div", { class: "catalog-khung" }, dau, list);
  // Báo cho trình đọc màn hình (thay thông báo nổi): chữ đổi sau một nhịp để đọc lại được cả khi thêm cùng dịch vụ hai lần.
  const bao = h("div", { class: "visually-hidden catalog-bao", "aria-live": "polite" });
  const root = h("div", { class: "catalog" }, notice, reason, tim, hang, khung, bao);

  let items: readonly CatalogServiceDto[] = [];
  let groups: readonly CatalogGroupDto[] = [];
  let daNap = false; // đã có danh mục (setItems): trước đó khung để trống, không báo "không tìm thấy"
  let selected = new Set<string>();
  let nhapTay = false;
  let khoa: string | null = null;
  let staffId: string | null = null;
  let choDoc: string | null | undefined; // bản nhớ đã đọc của tài khoản, chờ có groups để kiểm (undefined = không có gì chờ)
  let daCham = false; // người dùng đã tự chạm nhóm: bản nhớ đến muộn không đè lựa chọn đó
  let tt: TrangThaiNhom = { nhom: "", truocKhiTim: null, daThuHep: false };
  let chuCu = "";
  // Mã đã gắn sao (☆/★) nhớ TRÊN MÁY này (bộ nhớ trình duyệt; bị chặn → chỉ không nhớ). Bản nhớ cũ còn trường `loc` thì `docNhoDanhMuc` bỏ qua.
  let nho: NhoDanhMuc = docNhoDanhMuc(docBoNho());
  let nutNhom: HTMLButtonElement[] = [];
  const dongPhu = new Map<string, HTMLElement[]>(); // mã → các dòng phụ đang vẽ (để gắn / gỡ "✓ đã thêm" tại chỗ)
  let henBao = 0;

  const coChuaPhanLoai = (): boolean => items.some((c) => c.groupCode === null);
  const coHangNhom = (): boolean => groups.length > 0;
  /** Nhóm đang chọn còn dùng được (còn trong groups; "Chưa phân loại" chỉ khi còn dịch vụ không nhóm); không thì "Tất cả". Không phụ thuộc thứ tự gọi các hàm set*. */
  const nhomHieuLuc = (): string => {
    const ma = tt.nhom;
    if (ma === "" || !coHangNhom()) return "";
    return (ma === CHUA_PHAN_LOAI ? coChuaPhanLoai() : groups.some((g) => g.code === ma)) ? ma : "";
  };
  const tenNhom = (ma: string): string | null => (ma === "" ? null : ma === CHUA_PHAN_LOAI ? "Chưa phân loại" : (groups.find((g) => g.code === ma)?.name ?? null));
  const dangTim = (): boolean => q.value.trim() !== "";
  const nut = (ma: string): HTMLButtonElement | undefined => nutNhom.find((b) => b.dataset.nhom === ma);

  // ---- hàng nhóm ----
  function veHangNhom(): void {
    hang.hidden = !coHangNhom();
    const ds = [{ ma: "", ten: "Tất cả" }, ...groups.map((g) => ({ ma: g.code, ten: g.name })), ...(coChuaPhanLoai() ? [{ ma: CHUA_PHAN_LOAI, ten: "Chưa phân loại" }] : [])];
    nutNhom = ds.map(({ ma, ten }) => {
      const b = h("button", { type: "button", class: "catalog-nut-nhom", role: "radio", "data-nhom": ma }, ten);
      b.addEventListener("click", () => chamVaoNhom(ma));
      return b;
    });
    replaceChildren(cuon, ...nutNhom);
  }
  /** aria-checked + roving tabindex theo nhóm hiệu lực; `conKetQua` (khi đang tìm) làm mờ nhóm hết kết quả — "Tất cả" không bao giờ mờ. */
  function capNhatHangNhom(conKetQua: ReadonlySet<string> | null): void {
    const chon = nhomHieuLuc();
    for (const b of nutNhom) {
      const ma = b.dataset.nhom ?? "";
      b.setAttribute("aria-checked", String(ma === chon));
      b.tabIndex = ma === chon ? 0 : -1;
      if (conKetQua !== null && ma !== "" && !conKetQua.has(ma)) b.setAttribute("aria-disabled", "true");
      else b.removeAttribute("aria-disabled");
    }
  }
  /** Mép mờ + "›" khi còn nhóm phía sau; nút ‹ › chỉ khi còn chỗ cuộn về phía đó (hiện hay không do CSS: rê chuột / focus, ≥ 960px). */
  function capNhatMep(): void {
    const max = cuon.scrollWidth - cuon.clientWidth;
    const conSau = max > 1 && cuon.scrollLeft < max - 1;
    con.hidden = !conSau;
    hang.classList.toggle("is-con-sau", conSau);
    muiSau.hidden = !conSau;
    muiTruoc.hidden = !(cuon.scrollLeft > 1);
  }
  /** Cuộn hàng nhóm (KHÔNG cuộn trang) để nút `ma` nằm trọn trong tầm nhìn, ra khỏi vùng mép mờ bên phải. */
  function duaVaoTam(ma: string): void {
    const b = nut(ma);
    if (!b || hang.hidden || cuon.clientWidth === 0) return;
    const c = cuon.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    const mep = beRongMep(root);
    if (r.left < c.left) cuon.scrollLeft -= c.left - r.left;
    else if (r.right > c.right - mep) cuon.scrollLeft += Math.min(r.right - c.right + mep, r.left - c.left);
    capNhatMep();
  }
  function chamVaoNhom(ma: string): void {
    if (khoa !== null) return;
    const b = nut(ma);
    if (!b || b.getAttribute("aria-disabled") === "true" || ma === nhomHieuLuc()) return;
    daCham = true;
    const tim = dangTim();
    tt = chamNhom(tt, ma, tim);
    if (!tim && staffId !== null) ghiNhoNhom(staffId, ma); // chạm lúc đang tìm chỉ là thu hẹp tạm: không đè nhóm đã nhớ
    ve(true);
    duaVaoTam(ma);
  }
  cuon.addEventListener("scroll", capNhatMep, { passive: true });
  window.addEventListener("resize", capNhatMep);
  void document.fonts?.ready.then(capNhatMep); // phông tải xong thì nút rộng ra: tính lại mép
  muiTruoc.addEventListener("click", () => cuon.scrollBy({ left: -cuon.clientWidth * 0.8, behavior: "smooth" }));
  muiSau.addEventListener("click", () => cuon.scrollBy({ left: cuon.clientWidth * 0.8, behavior: "smooth" }));
  cuon.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const sang = nutNhom.filter((b) => b.getAttribute("aria-disabled") !== "true");
    if (sang.length === 0) return;
    e.preventDefault();
    const dangO = sang.indexOf(document.activeElement as HTMLButtonElement);
    let k = dangO >= 0 ? dangO : Math.max(0, sang.findIndex((b) => b.dataset.nhom === nhomHieuLuc()));
    if (e.key === "Home") k = 0;
    else if (e.key === "End") k = sang.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") k = Math.min(sang.length - 1, k + 1);
    else k = Math.max(0, k - 1);
    const ma = sang[k]?.dataset.nhom ?? "";
    chamVaoNhom(ma);
    nut(ma)?.focus({ preventScroll: true });
    duaVaoTam(ma);
  });

  // ---- khung danh sách ----
  /** Gắn / gỡ nhãn "✓ đã thêm" trong một dòng phụ (tại chỗ). */
  function nhanDaThem(phu: HTMLElement, co: boolean): void {
    const cu = phu.querySelector(".chip-picked");
    if (co && !cu) phu.querySelector(".catalog-ma")?.after(h("span", { class: "chip chip-picked" }, "✓ đã thêm"));
    else if (!co && cu) cu.remove();
  }
  function baoDaThem(ten: string): void {
    bao.textContent = "";
    window.clearTimeout(henBao);
    henBao = window.setTimeout(() => {
      bao.textContent = `Đã thêm ${ten}`;
    }, 100);
  }
  function dongDichVu(c: CatalogServiceDto): HTMLElement {
    const coGia = c.prices.adult !== null;
    const chonDuoc = c.supported && coGia;
    const ten = tachTenDichVu(c.name);
    const ghi = !c.supported ? (nhapTay ? "chưa hỗ trợ — dùng nhập tay" : "chưa hỗ trợ") : coGia ? null : "chưa có giá";
    const phu = h("span", { class: "catalog-phu" }, h("span", { class: "catalog-ma" }, c.code), ghi ? h("span", { class: "catalog-ghi" }, ghi) : null);
    nhanDaThem(phu, selected.has(c.code));
    dongPhu.set(c.code, [...(dongPhu.get(c.code) ?? []), phu]);
    const gia = h(
      "span",
      { class: "catalog-gia" },
      chonDuoc && c.prices.adult !== null ? h("span", { class: "catalog-gia-so" }, grouped(c.prices.adult)) : h("span", { class: "catalog-gia-so", "aria-hidden": "true" }, "—"),
      chonDuoc && parseUnit(c.unit).kind === "group" ? h("span", { class: "catalog-gia-dv" }, unitLabel(c.unit)) : null,
    );
    const pick = h(
      "button",
      { type: "button", class: "catalog-pick", "aria-disabled": chonDuoc ? undefined : "true" },
      h("span", { class: "catalog-name" }, h("span", { class: "catalog-ten" }, ten.dau ? h("span", { class: "catalog-ten-dau" }, ten.dau) : null, ten.sau), phu),
      gia,
    );
    pick.addEventListener("click", () => {
      if (!chonDuoc || khoa !== null) return; // dòng mờ / đơn đã khoá: không tác dụng
      o.onPick(c); // form dựng thẻ rồi gọi setSelected → nhãn "✓ đã thêm" gắn tại chỗ; khung không dựng lại, chữ tìm giữ nguyên
      baoDaThem(c.name);
    });
    const ghim = h("button", { type: "button", class: "catalog-ghim", "data-ghim": c.code });
    // Bấm sao CHỈ đổi biểu tượng + nhớ ngay tại dòng đó — KHÔNG dựng lại khung, nên dòng không nhảy và vị trí cuộn giữ nguyên (người kiểm 13/10).
    // Mục "★ Hay dùng" / thứ tự sao lên đầu chỉ đổi ở lần dựng khung kế tiếp (đổi nhóm, gõ chữ). Focus vẫn ở chính nút này.
    const veSao = (): void => {
      const da = nho.ghim.includes(c.code);
      ghim.textContent = da ? "★" : "☆";
      ghim.setAttribute("aria-pressed", String(da));
      ghim.setAttribute("aria-label", `${da ? "Bỏ khỏi Hay dùng" : "Thêm vào Hay dùng"}: ${c.name}`);
    };
    veSao();
    ghim.addEventListener("click", () => {
      nho = { ...nho, ghim: doiGhim(nho.ghim, c.code) };
      ghiBoNho(nho);
      veSao();
    });
    return h("div", { class: "catalog-row", "data-ma": c.code }, ghim, pick);
  }
  function cauRong(tim: boolean, nhom: string): string {
    if (items.length === 0) return "Chưa có dịch vụ để chọn.";
    if (tim && nhom !== "") return `Không tìm thấy dịch vụ nào khớp trong nhóm ${tenNhom(nhom) ?? ""}. Chạm "Tất cả" để tìm trong mọi nhóm.`;
    if (tim) return "Không tìm thấy dịch vụ nào khớp. Thử gõ mã dịch vụ.";
    return "Nhóm này chưa có dịch vụ.";
  }
  /** Dựng lại khung theo nhóm + chữ tìm. `veDau` (đổi nhóm / đổi chữ): về đầu khung; còn lại (tải lại danh mục, đổi quyền nhập tay) giữ vị trí cuộn. */
  function ve(veDau: boolean): void {
    const giu = list.scrollTop;
    const tim = dangTim();
    xoa.hidden = !tim || khoa !== null;
    dongPhu.clear();
    if (!daNap) {
      dau.textContent = "";
      replaceChildren(list);
      capNhatHangNhom(null);
      return;
    }
    const nhom = nhomHieuLuc();
    // Luật chia mục / xếp sao ở src/shared/loc-danh-muc.ts (có test): đang tìm mà đã thu hẹp một nhóm thì dịch vụ gắn sao cũng lên đầu (nợ T2(1), Việc 9).
    const { muc, conKetQua } = dungMucDanhMuc(items, { kim: q.value, nhom, ghim: nho.ghim, groups });
    const n = muc.reduce((s, m) => s + m.dong.length, 0);
    dau.textContent = nhanDem(n, tenNhom(nhom));
    replaceChildren(
      list,
      ...muc.filter((m) => m.dong.length > 0).map((m) => h("div", { class: "catalog-khoi", "data-khoa": m.khoa }, m.tieuDe ? h("div", { class: "catalog-muc" }, m.tieuDe) : null, ...m.dong.map(dongDichVu))),
      n === 0 ? h("div", { class: "catalog-empty", role: "status" }, cauRong(tim, nhom)) : null,
    );
    list.scrollTop = veDau ? 0 : giu;
    capNhatHangNhom(conKetQua);
  }

  // ---- ô tìm ----
  function doiChu(): void {
    const moi = q.value;
    tt = doiChuTim(tt, chuCu, moi);
    chuCu = moi;
    ve(true);
    duaVaoTam(nhomHieuLuc());
  }
  q.addEventListener("input", doiChu);
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && q.value !== "") {
      e.preventDefault();
      q.value = "";
      doiChu();
    }
  });
  xoa.addEventListener("click", () => {
    q.value = "";
    doiChu();
    q.focus();
  });

  function apDungNho(): void {
    if (choDoc === undefined || groups.length === 0) return;
    const ma = docNhoMotNhom(choDoc, groups); // nhiều nhóm (bản cũ) → nhóm hợp lệ đầu; nhóm đã xoá / rác → "" (Tất cả)
    choDoc = undefined;
    if (daCham) return;
    tt = dangTim() ? { ...tt, truocKhiTim: ma } : { ...tt, nhom: ma };
  }

  veHangNhom();
  ve(true);

  return {
    root,
    setItems(next) {
      items = next;
      daNap = true;
      khung.hidden = false;
      veHangNhom();
      ve(false);
      duaVaoTam(nhomHieuLuc());
    },
    setGroups(next) {
      groups = next; // tải lại danh mục (xung đột khi lưu) KHÔNG đọc lại bộ nhớ: giữ nhóm đang chọn, nhomHieuLuc tự bỏ nhóm không còn
      apDungNho();
      veHangNhom();
      ve(false);
      duaVaoTam(nhomHieuLuc());
    },
    setTaiKhoan(id) {
      staffId = id;
      choDoc = docNhoNhomTho(id); // đọc bộ nhớ MỘT lần; áp khi đã có groups (danh mục tải SAU initShell)
      apDungNho();
      ve(true);
      duaVaoTam(nhomHieuLuc());
    },
    setNotice(text) {
      notice.textContent = text ?? "";
      notice.hidden = !text;
      // Danh mục không tải được (chưa từng có setItems): chỉ câu báo, không để khung danh sách trống cao cố định (nợ T2(3), Việc 9).
      khung.hidden = !daNap && Boolean(text);
    },
    setDisabled(why) {
      if (why === khoa) return; // recompute() gọi ở mỗi lần gõ: không đổi thì không đụng gì
      khoa = why;
      const k = why !== null;
      const dangO = document.activeElement;
      const mauTieuDiem = k && dangO !== null && (khung.contains(dangO) || hang.contains(dangO)); // đặt inert sẽ làm tiêu điểm rơi về <body>
      q.disabled = k;
      reasonText.textContent = why ?? "";
      reason.hidden = !k;
      khung.inert = k;
      hang.inert = k;
      root.classList.toggle("is-khoa", k);
      xoa.hidden = k || !dangTim();
      if (mauTieuDiem) reason.focus(); // trình đọc màn hình đọc luôn lý do khoá
    },
    setSelected(codes) {
      const moi = new Set(codes);
      if (moi.size === selected.size && [...moi].every((c) => selected.has(c))) return;
      selected = moi;
      for (const [ma, phus] of dongPhu) for (const phu of phus) nhanDaThem(phu, selected.has(ma));
    },
    setNhapTay(v) {
      if (v === nhapTay) return;
      nhapTay = v;
      ve(false);
    },
    focus: () => q.focus(),
  };
}
