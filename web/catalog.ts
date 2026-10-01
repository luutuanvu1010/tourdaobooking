import { can } from "../src/shared/permissions";
import { ApiError, api, type CatalogAdminItem, type CatalogSyncState, type PaxCode, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dateTime, grouped, parseMoney, vnd } from "./format";
import { PAX_LABEL, PAX_ORDER } from "../src/shared/order-lines";
import { CHUA_PHAN_LOAI_TEN, dongLichSuNhom } from "../src/shared/lich-su-nhom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const noticeEl = byId("notice");
const statusEl = byId("status");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const editEl = byId("edit");
const qEl = byId<HTMLInputElement>("q");
const filterEl = byId<HTMLSelectElement>("filter");
const pullBtn = byId<HTMLButtonElement>("pull");
const nhomEl = byId("nhom-dv");
const chonBarEl = byId("chon-bar");

let items: CatalogAdminItem[] = [];
let sync: CatalogSyncState;

// ---- Nhóm dịch vụ (ADR-0058 Đ4, Đ8 — Task A7) ----
type Nhom = Api.CatalogAdminGroupDto;
/** Mọi nhóm (cả nhóm tắt), xếp `sortOrder` rồi tên — nguồn: `GET /api/catalog/groups`. */
let nhoms: Nhom[] = [];
/** Số dịch vụ không có nhóm hiện hành — máy chủ đếm CẢ dịch vụ ẩn / đã rời Sheet (nợ N-2: nhãn phải nói rõ để không lệch chip ở form đơn). */
let chuaPhanLoai = 0;
let nhomLoi = "";
let themNhomMo = false;
let suaTenMa: string | null = null;
/** Mã dịch vụ đang chọn để chuyển nhóm; `dangHien` = danh sách sau lọc của lần `render()` gần nhất (cho "Chọn tất cả đang hiện"). */
const chon = new Set<string>();
let dangHien: CatalogAdminItem[] = [];
/** Ô "Chuyển sang nhóm": "" = chưa chọn, `CHUA` = Chưa phân loại, còn lại mã nhóm. */
const CHUA = "-";
let nhomDich = "";
let chonLoi = "";
/** Tên người cho lịch sử nhóm: `GET /api/staff` tải MỘT lần khi mở màn (lỗi → Map rỗng → "Người dùng cũ"). */
let tenNguoi: Promise<Map<string, string>> = Promise.resolve(new Map());
const LO_TOI_DA = 50; // = LO_GAN_TOI_DA của máy chủ (ADR-0058 Đ4)

const tenNhomCua = (it: CatalogAdminItem): string => (it.groupCode === null ? CHUA_PHAN_LOAI_TEN : (nhoms.find((g) => g.code === it.groupCode)?.name ?? CHUA_PHAN_LOAI_TEN));
const nhomDangDung = (): Nhom[] => nhoms.filter((g) => g.active);
const loiChu = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

function renderStatus(): void {
  const parts = [
    sync.lastSuccessAt ? `Đồng bộ thành công lần cuối: ${dateTime(sync.lastSuccessAt)}${sync.itemCount !== null ? ` · ${sync.itemCount} dịch vụ trong Sheet` : ""}.` : "Chưa đồng bộ thành công lần nào.",
    "Hệ thống tự đồng bộ mỗi 15 phút.",
  ];
  replaceChildren(
    statusEl,
    h("p", { class: "muted" }, parts.join(" ")),
    sync.lastError && h("div", { class: "alert" }, `Lần đồng bộ gần nhất lỗi: ${sync.lastError} Hệ thống vẫn dùng bản đã lưu.`),
    sync.problems.length > 0 && h("details", null, h("summary", { class: "muted" }, `${sync.problems.length} dòng trong Sheet bị bỏ qua ở lần đồng bộ cuối`), h("ul", { class: "history" }, ...sync.problems.map((p) => h("li", null, `Dòng ${p.row}: ${p.message}`)))),
  );
}

function priceCell(it: CatalogAdminItem, code: PaxCode): HTMLElement {
  const eff = it.prices[code];
  const sheet = it.sheetPrices[code];
  const over = it.overridden.includes(code);
  if (eff === null && !over) return h("td", { class: "price-cell muted" }, "—");
  return h("td", { class: "price-cell" }, eff === null ? "—" : vnd(eff), over && h("span", { class: "mark", title: "Giá ghi đè bởi Admin" }, " ✎"), over && sheet !== eff && h("span", { class: "sheet" }, sheet === null ? "Sheet: —" : `Sheet: ${vnd(sheet)}`));
}

function row(it: CatalogAdminItem): HTMLElement {
  const btn = (label: string, onclick: () => void, cls = "btn btn-link") => {
    const b = h("button", { type: "button", class: cls }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const update = async (path: string, init: { method: string; body?: unknown }) => {
    const r = await act(() => api<Api.CatalogItemResponse>(path, init));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      render();
    }
  };
  const conflicts = it.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${c.base === null ? "—" : vnd(c.base)} → ${c.current === null ? "—" : vnd(c.current)}`).join("; ");
  return h(
    "tr",
    { class: it.hidden || !it.inSheet ? "row-off" : "", "data-code": it.code },
    h("td", { class: "chon-td" }, oChon(it)),
    h("td", null, it.code),
    h("td", null, it.name, it.hidden && h("span", { class: "badge badge-cancelled" }, "Đã ẩn"), !it.inSheet && h("span", { class: "badge badge-draft" }, "Không còn trong Sheet"), !it.supported && h("span", { class: "badge badge-draft", title: "Chỉ nhập tay được" }, `Đơn vị ${it.unit} chưa hỗ trợ`), it.conflicts.length > 0 && h("div", { class: "alert warn", style: "margin:6px 0 0" }, `Sheet đã đổi giá kể từ khi ghi đè — ${conflicts}. Giá đang bán vẫn là giá ghi đè.`)),
    h("td", { class: "nhom-o" }, tenNhomCua(it)),
    h("td", { class: "muted" }, it.unit),
    ...PAX_ORDER.map((c) => priceCell(it, c)),
    h(
      "td",
      { class: "row-actions" },
      btn("Sửa giá", () => openEdit(it)),
      it.conflicts.length > 0 && btn("Giữ ghi đè", () => update(`/api/catalog/${encodeURIComponent(it.code)}/ack`, { method: "POST" })),
      it.overridden.length > 0 && btn("Bỏ ghi đè", () => confirm(`Quay ${it.code} về giá theo Sheet?`) && update(`/api/catalog/${encodeURIComponent(it.code)}/override`, { method: "DELETE" })),
      btn(it.hidden ? "Hiện lại" : "Ẩn", () => update(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { hidden: !it.hidden } }), it.hidden ? "btn btn-link" : "btn btn-link danger"),
    ),
  );
}

function priceLine(it: CatalogAdminItem): string {
  const PAX_ABBR: Record<PaxCode, string> = { adult: "NL", child: "TE", senior: "NCT", infant: "EB" };
  return PAX_ORDER.filter((c) => it.supported && it.prices[c] !== null)
    .map((c) => `${PAX_ABBR[c]} ${grouped(it.prices[c]!)}`)
    .join(" · ") || "—";
}

function card(it: CatalogAdminItem): HTMLElement {
  const btn = (label: string, onclick: () => void, danger = false) => {
    const b = h("button", { type: "button", class: danger ? "pill-btn pill-btn-danger" : "pill-btn" }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const update = async (path: string, init: { method: string; body?: unknown }) => {
    const r = await act(() => api<Api.CatalogItemResponse>(path, init));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      render();
    }
  };
  const conflicts = it.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${c.base === null ? "—" : vnd(c.base)} → ${c.current === null ? "—" : vnd(c.current)}`).join("; ");
  return h(
    "div",
    { class: it.hidden || !it.inSheet ? "card card-col row-off" : "card card-col", "data-code": it.code },
    h("div", { class: "the-dau" }, oChon(it), h("span", { class: "muted" }, it.code, " · ", it.unit)),
    h("div", null, h("strong", null, it.name), it.hidden && h("span", { class: "badge badge-cancelled" }, " Đã ẩn"), !it.inSheet && h("span", { class: "badge badge-draft" }, " Không còn trong Sheet"), !it.supported && h("span", { class: "badge badge-draft", title: "Chỉ nhập tay được" }, ` Đơn vị ${it.unit} chưa hỗ trợ`)),
    h("div", { class: "nhom-o muted" }, `Nhóm: ${tenNhomCua(it)}`),
    h("div", null, priceLine(it), it.overridden.length > 0 && h("span", { class: "mark", style: "color:var(--c-accent);font-weight:700", title: "Có giá ghi đè" }, " ✎")),
    it.conflicts.length > 0 && h("div", { class: "alert warn" }, `Sheet đã đổi giá kể từ khi ghi đè — ${conflicts}. Giá đang bán vẫn là giá ghi đè.`),
    h(
      "div",
      { style: "display:flex;flex-wrap:wrap;gap:var(--s2);margin-top:var(--s1)" },
      btn("Sửa giá", () => openEdit(it)),
      it.conflicts.length > 0 && btn("Giữ ghi đè", () => update(`/api/catalog/${encodeURIComponent(it.code)}/ack`, { method: "POST" })),
      it.overridden.length > 0 && btn("Bỏ ghi đè", () => confirm(`Quay ${it.code} về giá theo Sheet?`) && update(`/api/catalog/${encodeURIComponent(it.code)}/override`, { method: "DELETE" })),
      btn(it.hidden ? "Hiện lại" : "Ẩn", () => update(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { hidden: !it.hidden } }), !it.hidden),
    ),
  );
}

function render(): void {
  const q = qEl.value.trim().toLowerCase();
  const f = filterEl.value;
  const shown = items.filter((it) => {
    if (q && !it.code.toLowerCase().includes(q) && !it.name.toLowerCase().includes(q)) return false;
    if (f === "overridden") return it.overridden.length > 0;
    if (f === "conflict") return it.conflicts.length > 0;
    if (f === "hidden") return it.hidden;
    if (f === "missing") return !it.inSheet;
    if (f.startsWith("nhom:")) return (it.groupCode ?? "") === f.slice("nhom:".length); // "nhom:" = Chưa phân loại
    return true;
  });
  dangHien = shown;
  replaceChildren(listEl, ...shown.map(row), shown.length === 0 && h("tr", null, h("td", { colspan: 10, class: "empty" }, "Không có dịch vụ nào khớp.")));
  replaceChildren(listCardsEl, ...shown.map(card), shown.length === 0 && h("p", { class: "empty" }, "Không có dịch vụ nào khớp."));
  renderChon();
}

/** Ô chọn một dịch vụ (bảng và thẻ đều có — hai ô cùng mã luôn đồng bộ). Vùng bấm là cả nhãn ≥ 44px. */
function oChon(it: CatalogAdminItem): HTMLElement {
  const cb = h("input", { type: "checkbox", class: "chon-dv", "data-code": it.code, checked: chon.has(it.code), "aria-label": `Chọn ${it.code}` });
  cb.addEventListener("change", () => {
    if (cb.checked) chon.add(it.code);
    else chon.delete(it.code);
    for (const x of document.querySelectorAll<HTMLInputElement>("input.chon-dv")) if (x.dataset.code === it.code) x.checked = cb.checked;
    chonLoi = "";
    renderChon();
  });
  return h("label", { class: "chon-o" }, cb);
}

/** Thanh chọn nhiều: "Chọn tất cả đang hiện", "Đã chọn N dịch vụ", ô nhóm đích, "Chuyển N dịch vụ" (≤ 50 một lần — quá thì nút báo, không gửi). */
function renderChon(): void {
  const n = chon.size;
  const tatCa = dangHien.length > 0 && dangHien.every((it) => chon.has(it.code));
  const het = h("input", { id: "chon-het", type: "checkbox", checked: tatCa, disabled: dangHien.length === 0 });
  het.addEventListener("change", () => {
    if (tatCa) for (const it of dangHien) chon.delete(it.code);
    else for (const it of dangHien) chon.add(it.code);
    chonLoi = "";
    render();
  });
  const nhanHet = h("label", { class: "chon-o chon-het" }, het, `Chọn tất cả đang hiện (${dangHien.length})`);
  const dem = h("span", { id: "chon-dem", class: "chon-dem", role: "status" }, n > 0 ? `Đã chọn ${n} dịch vụ` : "");
  if (n === 0) {
    replaceChildren(chonBarEl, nhanHet, dem);
    return;
  }
  const dich = h(
    "select",
    { id: "chuyen-nhom" },
    h("option", { value: "" }, "Chọn nhóm…"),
    ...nhomDangDung().map((g) => h("option", { value: g.code }, g.name)),
    h("option", { value: CHUA }, CHUA_PHAN_LOAI_TEN),
  );
  dich.value = [...dich.options].some((o) => o.value === nhomDich) ? nhomDich : "";
  const loiEl = h("div", { class: "alert chon-loi", role: "alert", hidden: !chonLoi }, chonLoi);
  dich.addEventListener("change", () => {
    nhomDich = dich.value;
    chonLoi = "";
    showError(loiEl, null);
  });
  const quaTran = n > LO_TOI_DA;
  const nut = h("button", { id: "chuyen-nut", type: "button", class: "btn btn-primary", disabled: quaTran }, quaTran ? `Tối đa ${LO_TOI_DA} dịch vụ một lần` : `Chuyển ${n} dịch vụ`);
  nut.addEventListener("click", () => void chuyenNhom(nut));
  const bo = h("button", { id: "bo-chon", type: "button", class: "btn" }, "Bỏ chọn");
  bo.addEventListener("click", () => {
    chon.clear();
    chonLoi = "";
    render();
  });
  replaceChildren(
    chonBarEl,
    nhanHet,
    dem,
    h("label", { class: "chon-dich" }, "Chuyển sang nhóm", dich),
    h("div", { class: "chon-nut" }, nut, bo),
    quaTran && h("p", { class: "muted chon-ghi" }, `Mỗi lần chuyển tối đa ${LO_TOI_DA} dịch vụ — bỏ chọn bớt ${n - LO_TOI_DA} dịch vụ.`),
    loiEl,
  );
}

async function chuyenNhom(nut: HTMLButtonElement): Promise<void> {
  if (chon.size === 0 || chon.size > LO_TOI_DA) return; // quá trần: không gửi (máy chủ cũng chặn 400)
  if (nhomDich === "") {
    chonLoi = "Chọn nhóm đích trước.";
    renderChon();
    return;
  }
  const groupCode = nhomDich === CHUA ? null : nhomDich;
  const ten = groupCode === null ? CHUA_PHAN_LOAI_TEN : (nhoms.find((g) => g.code === groupCode)?.name ?? "");
  nut.disabled = true;
  noticeEl.hidden = true;
  try {
    const r = await api<Api.CatalogGroupAssignResponse>("/api/catalog/group-assignments", { method: "PUT", body: { codes: [...chon], groupCode } });
    chon.clear();
    chonLoi = "";
    noticeEl.textContent = `Đã chuyển ${r.doi} dịch vụ ${groupCode === null ? "về" : "sang nhóm"} ${ten}.${r.boQua > 0 ? ` ${r.boQua} dịch vụ đã ở sẵn nhóm này.` : ""}`;
    noticeEl.hidden = false;
    await load();
  } catch (err) {
    chonLoi = loiChu(err);
    renderChon();
  }
}

// ---- Khối "Nhóm dịch vụ" ----
function nutNhom(label: string, act: string, onclick: () => void, opts: { disabled?: boolean; aria?: string } = {}): HTMLButtonElement {
  const b = h("button", { type: "button", class: "btn btn-link", "data-act": act, disabled: opts.disabled ?? false, "aria-label": opts.aria }, label);
  b.addEventListener("click", () => {
    b.disabled = true; // chống bấm hai lần khi đang gửi; khối được dựng lại sau mỗi lần
    onclick();
  });
  return b;
}

/** Chữ đang gõ ở ô đổi tên / ô tên nhóm mới — giữ qua lần dựng lại khối sau lỗi 400/409 để người dùng không mất chữ đã gõ. */
let banNhapTen = "";
let banNhapMoi = "";

function oTenNhom(attrs: Record<string, unknown>, value: string, luu: () => void, nhap: (v: string) => void): HTMLInputElement {
  const o = h("input", { type: "text", maxLength: 40, autocomplete: "off", ...attrs });
  o.value = value;
  o.addEventListener("input", () => nhap(o.value));
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      luu();
    }
  });
  queueMicrotask(() => o.focus());
  return o;
}

function dongNhom(g: Nhom, i: number): HTMLElement {
  if (suaTenMa === g.code) {
    const luu = () =>
      void doiNhom(g, { name: o.value.trim() }, () => {
        suaTenMa = null;
        banNhapTen = "";
      });
    const o = oTenNhom({ class: "nhom-ten-sua", "aria-label": `Tên mới cho nhóm ${g.name}` }, banNhapTen || g.name, luu, (v) => (banNhapTen = v));
    const huy = () => {
      suaTenMa = null;
      banNhapTen = "";
      renderNhom();
    };
    return h("li", { class: "nhom-dong", "data-nhom": g.code }, o, h("div", { class: "nhom-nut" }, nutNhom("Lưu", "luu-ten", luu), nutNhom("Huỷ", "huy-ten", huy)));
  }
  const truoc = nhoms[i - 1];
  const sau = nhoms[i + 1];
  const doiTen = () => {
    suaTenMa = g.code;
    banNhapTen = "";
    nhomLoi = "";
    renderNhom();
  };
  return h(
    "li",
    { class: g.active ? "nhom-dong" : "nhom-dong nhom-tat", "data-nhom": g.code },
    h("span", { class: "nhom-ten" }, g.name),
    h("span", { class: "nhom-so" }, `${g.soDichVu} dịch vụ`),
    !g.active && h("span", { class: "badge badge-cancelled" }, "Đã tắt"),
    h(
      "div",
      { class: "nhom-nut" },
      nutNhom("Đổi tên", "doi-ten", doiTen, { aria: `Đổi tên nhóm ${g.name}` }),
      nutNhom("Lên", "len", () => truoc && void doiCho(g, truoc), { disabled: !truoc, aria: `Đưa nhóm ${g.name} lên` }),
      nutNhom("Xuống", "xuong", () => sau && void doiCho(g, sau), { disabled: !sau, aria: `Đưa nhóm ${g.name} xuống` }),
      g.active
        ? nutNhom("Tắt", "tat", () => void doiNhom(g, { active: false }), { aria: `Tắt nhóm ${g.name}` })
        : nutNhom("Bật", "bat", () => void doiNhom(g, { active: true }), { aria: `Bật nhóm ${g.name}` }),
    ),
  );
}

function renderNhom(): void {
  let them: HTMLElement;
  if (themNhomMo) {
    const luu = () => void themNhom(o.value.trim());
    const o = oTenNhom({ id: "nhom-ten-moi" }, banNhapMoi, luu, (v) => (banNhapMoi = v));
    const huy = () => {
      themNhomMo = false;
      banNhapMoi = "";
      nhomLoi = "";
      renderNhom();
    };
    them = h(
      "div",
      { class: "nhom-form" },
      h("label", { for: "nhom-ten-moi" }, "Tên nhóm mới (tối đa 40 ký tự)"),
      o,
      h("div", { class: "nhom-nut" }, nutNhom("Lưu nhóm", "luu-moi", luu), nutNhom("Huỷ", "huy-moi", huy)),
    );
  } else {
    them = h("button", { id: "nhom-them", type: "button", class: "btn" }, "Thêm nhóm");
    them.addEventListener("click", () => {
      themNhomMo = true;
      nhomLoi = "";
      renderNhom();
    });
  }
  replaceChildren(
    nhomEl,
    h("h2", { id: "nhom-dv-tieu-de" }, "Nhóm dịch vụ"),
    h("p", { class: "muted" }, "Nhóm giúp người lập đơn lọc nhanh dịch vụ. Nhóm không xoá được: không dùng nữa thì chuyển hết dịch vụ sang nhóm khác rồi tắt."),
    h("div", { id: "nhom-loi", class: "alert", role: "alert", hidden: !nhomLoi }, nhomLoi),
    h("ul", { class: "nhom-ds" }, ...nhoms.map(dongNhom)),
    h("p", { id: "nhom-chua", class: "muted" }, `Chưa phân loại (kể cả dịch vụ ẩn): ${chuaPhanLoai} dịch vụ`),
    them,
  );
}

/** Ô lọc: sau các lựa chọn sẵn có thêm nhóm "Nhóm dịch vụ" — "Nhóm: <tên>" của nhóm đang dùng + "Chưa phân loại". Nhóm đã chọn không còn → "Tất cả". */
function renderLoc(): void {
  const cu = filterEl.value;
  for (const og of filterEl.querySelectorAll("optgroup")) og.remove();
  filterEl.append(
    h(
      "optgroup",
      { label: "Nhóm dịch vụ" },
      ...nhomDangDung().map((g) => h("option", { value: `nhom:${g.code}` }, `Nhóm: ${g.name}`)),
      h("option", { value: "nhom:" }, CHUA_PHAN_LOAI_TEN),
    ),
  );
  filterEl.value = [...filterEl.options].some((o) => o.value === cu) ? cu : "";
}

async function themNhom(name: string): Promise<void> {
  try {
    await api<Api.CatalogGroupResponse>("/api/catalog/groups", { method: "POST", body: { name } });
    themNhomMo = false;
    banNhapMoi = "";
    nhomLoi = "";
  } catch (err) {
    nhomLoi = loiChu(err);
  }
  await load();
}

/** PATCH một nhóm kèm mốc sửa gần nhất (khoá lạc quan). 409 / 400 → hiện đúng câu tiếng Việt của máy chủ. */
async function patchNhom(g: Nhom, body: { name?: string; sortOrder?: number; active?: boolean }): Promise<boolean> {
  try {
    await api<Api.CatalogGroupResponse>(`/api/catalog/groups/${encodeURIComponent(g.code)}`, { method: "PATCH", body: { expectedUpdatedAt: g.updatedAt, ...body } });
    return true;
  } catch (err) {
    nhomLoi = loiChu(err);
    return false;
  }
}

async function doiNhom(g: Nhom, body: { name?: string; active?: boolean }, khiXong?: () => void): Promise<void> {
  if (await patchNhom(g, body)) {
    nhomLoi = "";
    khiXong?.();
  }
  await load();
}

/** Lên / Xuống: đổi `sortOrder` của hai nhóm kề nhau (hai PATCH, mỗi cái mang mốc của chính nhóm đó); lỗi giữa chừng → vẫn tải lại để thấy trạng thái thật. */
async function doiCho(a: Nhom, b: Nhom): Promise<void> {
  // Hai nhóm trùng thứ tự (hiếm): đặt `a` lệch một bậc về phía `b` thay vì đổi chỗ vô hiệu.
  const lenTren = nhoms.indexOf(b) < nhoms.indexOf(a);
  const thuA = a.sortOrder === b.sortOrder ? Math.max(0, b.sortOrder + (lenTren ? -1 : 1)) : b.sortOrder;
  if (await patchNhom(a, { sortOrder: thuA })) {
    if (a.sortOrder === b.sortOrder || (await patchNhom(b, { sortOrder: a.sortOrder }))) nhomLoi = "";
  }
  await load();
}

function openEdit(it: CatalogAdminItem): void {
  const fields = new Map<PaxCode, HTMLInputElement>();
  for (const c of PAX_ORDER) {
    const el = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", placeholder: it.sheetPrices[c] === null ? "không có giá" : `Sheet: ${grouped(it.sheetPrices[c]!)}` });
    el.value = it.prices[c] === null ? "" : grouped(it.prices[c]!);
    el.addEventListener("input", () => (el.value = el.value.trim() === "" ? "" : grouped(parseMoney(el.value))));
    fields.set(c, el);
  }
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu ghi đè");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    // Trống hoặc bằng giá Sheet → không ghi đè loại đó (nếu đang ghi đè thì bỏ); khác → ghi đè.
    const prices: Partial<Record<PaxCode, number | null>> = {};
    for (const c of PAX_ORDER) {
      const raw = fields.get(c)!.value.trim();
      const value = raw === "" ? null : parseMoney(raw);
      const sheet = it.sheetPrices[c];
      const overridden = it.overridden.includes(c);
      if (value === sheet || value === null) {
        if (overridden) prices[c] = null;
      } else if (value !== it.prices[c] || !overridden) prices[c] = value;
    }
    if (Object.keys(prices).length === 0) {
      editEl.hidden = true;
      return;
    }
    const r = await act(() => api<Api.CatalogItemResponse>(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { prices } }));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      editEl.hidden = true;
      render();
    }
  });
  const unit = it.supported ? null : h("p", { class: "muted" }, `Đơn vị "${it.unit}" chưa được hỗ trợ nên dịch vụ này chỉ nhập tay được trong đơn.`);
  const nhomKhoi = h("div", { class: "nhom-sua" });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa giá: ${it.code} — ${it.name}`),
    h("p", { class: "muted" }, "Giá ghi đè chỉ có hiệu lực trong hệ thống này (không ghi ngược vào Google Sheet) và không bị lần đồng bộ sau đè mất. Để trống hoặc nhập đúng giá Sheet để bỏ ghi đè loại đó."),
    unit,
    h("div", { class: "grid three" }, ...PAX_ORDER.map((c) => h("label", null, `${PAX_LABEL[c]} (₫)`, fields.get(c)!))),
    h("div", { class: "actions", style: "margin-top:12px" }, save, close),
    nhomKhoi,
  );
  renderNhomSua(nhomKhoi, it);
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

/** Lượt mở hộp sửa gần nhất — phản hồi lịch sử của lượt cũ (mở nhanh dịch vụ khác) bị bỏ. */
let luotSua = 0;

/** Phần "Nhóm dịch vụ" của hộp sửa: ô chọn nhóm (nhóm đang dùng + "Chưa phân loại") + "Đổi nhóm", rồi lịch sử nhóm (mới nhất trước). */
function renderNhomSua(khoi: HTMLElement, it: CatalogAdminItem): void {
  const luot = ++luotSua;
  const chonNhom = h(
    "select",
    { id: "sua-nhom" },
    ...nhoms.filter((g) => g.active || g.code === it.groupCode).map((g) => h("option", { value: g.code }, g.active ? g.name : `${g.name} (đã tắt)`)),
    h("option", { value: "" }, CHUA_PHAN_LOAI_TEN),
  );
  chonNhom.value = it.groupCode ?? "";
  const luu = h("button", { id: "sua-nhom-luu", type: "button", class: "btn" }, "Đổi nhóm");
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const ds = h("ul", { id: "nhom-lich-su", class: "history" });
  const trangThai = h("p", { class: "muted" }, "Đang tải lịch sử nhóm…");
  luu.addEventListener("click", async () => {
    const moi = chonNhom.value === "" ? null : chonNhom.value;
    if (moi === it.groupCode) return;
    luu.disabled = true;
    showError(loi, null);
    try {
      await api<Api.CatalogGroupAssignResponse>("/api/catalog/group-assignments", { method: "PUT", body: { codes: [it.code], groupCode: moi } });
    } catch (err) {
      showError(loi, loiChu(err));
      luu.disabled = false;
      return;
    }
    await load();
    const sau = items.find((x) => x.code === it.code);
    if (sau && luot === luotSua) renderNhomSua(khoi, sau);
  });
  replaceChildren(
    khoi,
    h("h3", null, "Nhóm dịch vụ"),
    h("div", { class: "nhom-sua-hang" }, h("label", null, "Nhóm của dịch vụ này", chonNhom), luu),
    loi,
    h("h3", null, "Lịch sử nhóm"),
    trangThai,
    ds,
  );
  void (async () => {
    try {
      const [r, ten] = await Promise.all([api<Api.CatalogGroupHistoryResponse>(`/api/catalog/${encodeURIComponent(it.code)}/group-history`), tenNguoi]);
      if (luot !== luotSua) return;
      const dong = dongLichSuNhom(r.items, ten);
      trangThai.textContent = dong.length === 0 ? "Chưa có lần đổi nhóm nào." : "";
      trangThai.hidden = dong.length > 0;
      replaceChildren(ds, ...dong.map((x) => h("li", null, x)));
    } catch (err) {
      if (luot === luotSua) trangThai.textContent = `Chưa tải được lịch sử nhóm: ${loiChu(err)}`;
    }
  })();
}

async function load(): Promise<void> {
  const r = await act(() => Promise.all([api<Api.CatalogAdminResponse>("/api/catalog/admin"), api<Api.CatalogGroupsResponse>("/api/catalog/groups")]));
  if (!r) return;
  const [dm, nh] = r;
  items = dm.items;
  sync = dm.sync;
  nhoms = [...nh.groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
  chuaPhanLoai = nh.chuaPhanLoai;
  const coMa = new Set(items.map((x) => x.code));
  for (const c of chon) if (!coMa.has(c)) chon.delete(c);
  renderStatus();
  renderNhom();
  renderLoc();
  render();
}

async function pull(force: boolean): Promise<void> {
  pullBtn.disabled = true;
  noticeEl.hidden = true;
  showError(errorEl, null);
  try {
    const r = await api<Api.CatalogSyncResponse>("/api/catalog/sync", { method: "POST", body: { force } });
    noticeEl.textContent = `Đã đồng bộ xong: thêm ${r.added}, đổi ${r.changed}, ẩn ${r.hidden}, giữ nguyên ${r.unchanged}.${r.problems.length ? ` ${r.problems.length} dòng bị bỏ qua.` : ""}${r.warnings.length ? ` Cảnh báo: ${r.warnings.map((w) => w.message).join("; ")}.` : ""}`;
    noticeEl.hidden = false;
  } catch (err) {
    if (err instanceof ApiError && err.code === "sync_guard" && confirm(`${err.message}\n\nChỉ tiếp tục nếu bạn chắc chắn Sheet đúng. Vẫn đồng bộ và ẩn các dịch vụ đó?`)) {
      pullBtn.disabled = false;
      return pull(true);
    }
    fail(err);
  }
  pullBtn.disabled = false;
  await load();
}

pullBtn.addEventListener("click", () => void pull(false));
qEl.addEventListener("input", render);
filterEl.addEventListener("change", render);

const staff = await initShell();
if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else {
  tenNguoi = api<Api.StaffListResponse>("/api/staff")
    .then((r) => new Map(r.staff.map((s) => [s.id, s.fullName])))
    .catch(() => new Map<string, string>());
  await load();
}
