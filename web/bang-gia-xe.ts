// Bảng giá thuê xe (/bang-gia-xe — ADR-0057 T1 B1–B5, sửa bởi ADR-0095 Q3; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1a; kế hoạch Đợt 4 G1).
// - Xem: ô transport.rate.view (Kế toán, Quản trị, Toàn quyền); ghi (Thêm giá, Đổi giá, Kết thúc, tuyến, cỡ xe): ô transport.rate.manage. Máy chủ luôn kiểm lại.
// - ADR-0095 Q3: mỗi dòng giá BẮT BUỘC cả tuyến LẪN cỡ xe — form không có "Mọi tuyến" / "Mọi cỡ xe"; BỎ câu của bản vẽ "Có cả giá theo tuyến và giá theo cỡ
//   xe thì giá theo tuyến được dùng" và gợi ý "Cần ít nhất một trong tuyến hoặc cỡ xe".
// - Trạng thái dòng (Đang áp / Sắp áp / Đã kết thúc) do MÁY CHỦ gắn theo ngày xem; ô "Giá đang áp ngày" chỉ đổi ngày xem. Lỗi hiện nguyên văn câu máy chủ.
// - Ba tab viên thuốc Giá thuê / Tuyến / Cỡ xe (role="tablist", phím mũi tên). Mã tuyến / cỡ do máy sinh, không hiện.
import type { BangGiaDongResponse, BangGiaDto, BangGiaResponse, CoXeDto, CoXeListResponse, NhaXeBangGiaDto, TuyenDto, TuyenListResponse } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { NHAN_TRANG_THAI_GIA, docSoTien, goiYDoiGia, hieuLuc } from "../src/shared/tien-xe-hien-thi";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { moBangTruot } from "./bang-truot";
import { taoLenh } from "./dieu-phoi-ui";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { datCrumb } from "./giay-to-ui";
import { initShell, showError } from "./shell";
import { cauLoi, chipTx, daiLoi, dangGui, dangTai, loiTai, moForm, nutGui, o, trong } from "./tien-xe-ui";

const errorEl = byId("error");
const trangEl = byId("bg-trang");
const dauNutEl = byId("bg-dau-nut");

const staff = await initShell();
datCrumb("Vận chuyển", "Bảng giá thuê xe");
const coSua = can(staff, "transport.rate.manage");

type Tab = "gia" | "tuyen" | "co";
const TAB: readonly { ma: Tab; nhan: string }[] = [{ ma: "gia", nhan: "Giá thuê" }, { ma: "tuyen", nhan: "Tuyến" }, { ma: "co", nhan: "Cỡ xe" }];
const q = new URLSearchParams(location.search);
let tab: Tab = (["gia", "tuyen", "co"] as const).find((t) => t === q.get("tab")) ?? "gia";
let nhaXeId: string | null = q.get("nha-xe");
let ngay: string = isISODate(q.get("ngay") ?? "") ? q.get("ngay")! : vnToday(new Date());
let duLieu: BangGiaResponse | null = null;

const ghiUrl = (): void => {
  const p = new URLSearchParams();
  if (nhaXeId) p.set("nha-xe", nhaXeId);
  if (ngay !== vnToday(new Date())) p.set("ngay", ngay);
  if (tab !== "gia") p.set("tab", tab);
  history.replaceState(null, "", `${location.pathname}${p.size ? `?${p}` : ""}`);
};

async function nap(): Promise<void> {
  let r = await api<BangGiaResponse>(`/api/van-chuyen/bang-gia?ngay=${ngay}${nhaXeId ? `&nha-xe=${encodeURIComponent(nhaXeId)}` : ""}`);
  // Chưa chọn nhà xe (hoặc nhà xe trong địa chỉ không còn trong danh sách): mặc định nhà xe đầu tiên máy chủ trả.
  if (!r.nhaXe.some((n) => n.partyId === nhaXeId) && r.nhaXe.length) {
    nhaXeId = r.nhaXe[0]!.partyId;
    r = await api<BangGiaResponse>(`/api/van-chuyen/bang-gia?ngay=${ngay}&nha-xe=${encodeURIComponent(nhaXeId)}`);
  }
  duLieu = r;
  ghiUrl();
}

/** Tải lại + vẽ lại; lỗi tải → dải lỗi có "Thử lại" (không mất trang). */
async function taiLai(): Promise<void> {
  replaceChildren(trangEl, dangTai());
  try {
    await nap();
  } catch (e) {
    replaceChildren(trangEl, loiTai(cauLoi(e), () => void taiLai()));
    return;
  }
  ve();
}

const nhaXeDangChon = (): NhaXeBangGiaDto | null => duLieu?.nhaXe.find((n) => n.partyId === nhaXeId) ?? null;
const tenNhaXe = (n: NhaXeBangGiaDto): string => (n.dangHopTac ? n.ten : `${n.ten} (đã thôi hợp tác)`);

function ve(): void {
  const r = duLieu!;
  const nx = nhaXeDangChon();
  const themDuoc = coSua && !!nx?.dangHopTac;
  // Nút "Thêm giá" (bản vẽ: nút accent cạnh tiêu đề) — chỉ ở tab Giá thuê, chỉ khi nhà xe đang hợp tác.
  const nutThem = tab === "gia" && themDuoc ? h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "them-gia" }, "Thêm giá") : null;
  nutThem?.addEventListener("click", () => moFormGia(null, nutThem));
  replaceChildren(dauNutEl, nutThem);

  const selNx = h("select", { class: "vc-input" }, ...r.nhaXe.map((n) => h("option", { value: n.partyId }, tenNhaXe(n))));
  selNx.value = nhaXeId ?? "";
  selNx.disabled = r.nhaXe.length === 0;
  selNx.addEventListener("change", () => {
    nhaXeId = selNx.value;
    void taiLai();
  });
  const oNgay = h("input", { class: "vc-input", type: "date", value: ngay });
  oNgay.addEventListener("change", () => {
    if (!isISODate(oNgay.value)) return;
    ngay = oNgay.value;
    void taiLai();
  });
  const loc = h("section", { class: "vc-card tx-loc", "aria-label": "Lọc" }, o("bg-nha-xe", "Nhà xe", selNx), o("bg-ngay", "Giá đang áp ngày", oNgay));

  const tabs = TAB.map((t) => {
    const b = h("button", { type: "button", role: "tab", class: "tx-tab", id: `bg-tab-${t.ma}`, "aria-selected": String(t.ma === tab), "aria-controls": "bg-panel", tabindex: t.ma === tab ? 0 : -1, "data-tab": t.ma }, t.nhan);
    b.addEventListener("click", () => doiTab(t.ma, false));
    b.addEventListener("keydown", (e) => {
      const i = TAB.findIndex((x) => x.ma === t.ma);
      const toi = e.key === "ArrowRight" ? TAB[(i + 1) % TAB.length] : e.key === "ArrowLeft" ? TAB[(i - 1 + TAB.length) % TAB.length] : null;
      if (toi) {
        e.preventDefault();
        doiTab(toi.ma, true);
      }
    });
    return b;
  });
  const panel = h("div", { id: "bg-panel", role: "tabpanel", "aria-labelledby": `bg-tab-${tab}`, class: "tx-panel" });
  replaceChildren(trangEl, loc, h("div", { class: "tx-tabs", role: "tablist", "aria-label": "Bảng giá thuê xe" }, ...tabs), panel);
  if (tab === "gia") vePanelGia(panel, nx, themDuoc);
  else if (tab === "tuyen") vePanelTuyen(panel, r.tuyen);
  else vePanelCo(panel, r.coXe);
}

function doiTab(t: Tab, focus: boolean): void {
  tab = t;
  ghiUrl();
  ve();
  if (focus) document.getElementById(`bg-tab-${t}`)?.focus();
}

// ---- Tab Giá thuê --------------------------------------------------------------------------------------------------------------------------------------------
function vePanelGia(panel: HTMLElement, nx: NhaXeBangGiaDto | null, themDuoc: boolean): void {
  const r = duLieu!;
  const formHost = h("div", { class: "tx-form-host", hidden: true });
  if (!nx) {
    replaceChildren(panel, trong("Chưa có nhà xe đối tác", "Thêm hồ sơ nhà xe ở Danh bạ (vai Nhà xe đối tác) để nhập giá thuê."));
    return;
  }
  if (r.dong.length === 0) {
    const nut = themDuoc ? h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "them-gia-trong" }, "Thêm giá") : null;
    nut?.addEventListener("click", () => moFormGia(null, nut, formHost));
    replaceChildren(panel, formHost, h("div", { class: "vc-card" }, trong("Nhà xe này chưa có giá", "Thêm giá theo tuyến và cỡ xe để chuyến xe thuê tự lấy giá bảng.", nut)));
    return;
  }
  const nutDong = (d: BangGiaDto, kieu: "link" | "pill") => {
    if (!coSua || d.trangThai === "DA_KET_THUC") return [];
    const doi = nx.dangHopTac ? h("button", { type: "button", class: kieu === "link" ? "vc-btn vc-btn-text" : "pill-btn", "data-action": "doi-gia" }, "Đổi giá") : null;
    doi?.addEventListener("click", () => moFormGia(d, doi, formHost));
    const ket = h("button", { type: "button", class: kieu === "link" ? "vc-btn vc-btn-text tx-nut-do" : "pill-btn pill-btn-danger", "data-action": "ket-thuc-gia" }, "Kết thúc");
    ket.addEventListener("click", () => moKetThuc(d, ket));
    return [doi, ket];
  };
  const tenTuyen = (d: BangGiaDto) => d.tuyen?.ten ?? "—";
  const nhanCo = (d: BangGiaDto) => d.coXe?.nhan ?? "—";
  const bang = h(
    "div",
    { class: "vc-card tx-bang bg-bang", role: "table", "aria-label": "Giá thuê" },
    h("div", { class: "bg-hang tx-hang-dau", role: "row" }, ...["TUYẾN", "CỠ XE", "SỐ TIỀN / CHUYẾN", "HIỆU LỰC", "TRẠNG THÁI", ""].map((t) => h("span", { role: "columnheader" }, t))),
    ...r.dong.map((d) => {
      const tt = NHAN_TRANG_THAI_GIA[d.trangThai];
      return h(
        "div",
        { class: "bg-hang", role: "row", "data-dong": d.id },
        h("span", { role: "cell", class: "bg-tuyen" }, h("strong", null, tenTuyen(d)), d.ghiChu ? h("span", { class: "tx-phu" }, d.ghiChu) : null),
        h("span", { role: "cell" }, nhanCo(d)),
        h("span", { role: "cell", class: "tx-tien" }, vnd(d.soTien)),
        h("span", { role: "cell" }, hieuLuc(d.tuNgay, d.denNgay)),
        h("span", { role: "cell" }, chipTx(tt.nhan, tt.tone)),
        h("span", { role: "cell", class: "tx-nut-dong" }, ...nutDong(d, "link")),
      );
    }),
  );
  const the = h(
    "div",
    { class: "bg-the-ds" },
    ...r.dong.map((d) => {
      const tt = NHAN_TRANG_THAI_GIA[d.trangThai];
      const nut = nutDong(d, "pill");
      return h(
        "div",
        { class: "vc-card bg-the", "data-dong": d.id },
        h("div", { class: "bg-the-dau" }, h("strong", { class: "vc-grow" }, tenTuyen(d)), chipTx(tt.nhan, tt.tone)),
        h("div", { class: "tx-phu" }, nhanCo(d)),
        h("div", { class: "bg-the-tien" }, h("span", { class: "tx-tien" }, vnd(d.soTien)), h("span", { class: "tx-phu" }, hieuLuc(d.tuNgay, d.denNgay))),
        d.ghiChu ? h("div", { class: "tx-phu" }, d.ghiChu) : null,
        nut.length ? h("div", { class: "bg-the-nut" }, ...nut) : null,
      );
    }),
  );
  replaceChildren(panel, formHost, bang, the);
}

/** Form "Thêm giá" (`cu` null) / "Đổi giá — <tuyến>" (khoá tuyến + cỡ, gửi `thayDongId`). requestId mới mỗi lần mở form. */
function moFormGia(cu: BangGiaDto | null, opener: HTMLElement, host?: HTMLElement): void {
  const r = duLieu!;
  const lenh = taoLenh();
  const loi = daiLoi();
  const tuyenDung = r.tuyen.filter((t) => t.dangDung).sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
  const coDung = r.coXe.filter((c) => c.dangDung).sort((a, b) => a.tuSoKhach - b.tuSoKhach);
  const selTuyen = h("select", { class: "vc-input", disabled: !!cu },
    h("option", { value: "" }, "Chọn tuyến"),
    ...(cu?.tuyen && !tuyenDung.some((t) => t.ma === cu.tuyen!.ma) ? [h("option", { value: cu.tuyen.ma }, cu.tuyen.ten)] : []),
    ...tuyenDung.map((t) => h("option", { value: t.ma }, t.ten)));
  selTuyen.value = cu?.tuyen?.ma ?? "";
  const selCo = h("select", { class: "vc-input", disabled: !!cu },
    h("option", { value: "" }, "Chọn cỡ xe"),
    ...(cu?.coXe && !coDung.some((c) => c.ma === cu.coXe!.ma) ? [h("option", { value: cu.coXe.ma }, cu.coXe.nhan)] : []),
    ...coDung.map((c) => h("option", { value: c.ma }, c.nhan)));
  selCo.value = cu?.coXe?.ma ?? "";
  const tien = h("input", { class: "vc-input", type: "text", inputmode: "numeric", autocomplete: "off", value: cu ? String(cu.soTien) : "", placeholder: "Ví dụ: 450000" });
  const tuNgay = h("input", { class: "vc-input", type: "date", value: vnToday(new Date()) });
  const denNgay = h("input", { class: "vc-input", type: "date" });
  const ghiChu = h("input", { class: "vc-input", type: "text", maxLength: 200, value: "" });
  const goiYTu = h("div", { class: "vc-hint", "aria-live": "polite" }, cu ? goiYDoiGia(tuNgay.value) : "");
  if (cu) tuNgay.addEventListener("input", () => (goiYTu.textContent = goiYDoiGia(tuNgay.value)));
  const nut = nutGui(cu ? "Lưu giá mới" : "Lưu giá", "btn btn-primary btn-chinh", "luu-gia");
  const form = moForm({
    tieuDe: cu ? `Đổi giá — ${cu.tuyen?.ten ?? ""}` : "Thêm giá",
    body: [
      o("bg-f-tuyen", "Tuyến", selTuyen, { batBuoc: true, rong: true }),
      o("bg-f-co", "Cỡ xe", selCo, { batBuoc: true }),
      o("bg-f-tien", "Số tiền (₫)", tien, { batBuoc: true }),
      o("bg-f-tu", "Từ ngày", tuNgay, { batBuoc: true, goiY: goiYTu }),
      o("bg-f-den", "Đến ngày", denNgay, { goiY: "Để trống nếu đang áp" }),
      o("bg-f-ghi-chu", "Ghi chú", ghiChu, { rong: true }),
      h("div", { class: "vc-hint tx-o-rong" }, cu ? "Đổi giá giữ nguyên tuyến và cỡ xe của dòng cũ." : "Chọn cả tuyến và cỡ xe."),
      loi.el,
    ],
    nut: [nut],
    host: host ?? byId("bg-panel").querySelector<HTMLElement>(".tx-form-host") ?? trangEl,
    opener,
  });
  if (!form) return;
  nut.addEventListener("click", async () => {
    loi.hien(null);
    form.setBusy(true);
    dangGui(nut, true);
    try {
      await lenh.gui<BangGiaDongResponse>("/api/van-chuyen/bang-gia", "POST", {
        nhaXePartyId: nhaXeId, tuyen: selTuyen.value || null, coXe: selCo.value || null, soTien: docSoTien(tien.value) ?? 0,
        tuNgay: tuNgay.value, denNgay: denNgay.value || null, ghiChu: ghiChu.value.trim() || null, thayDongId: cu?.id ?? null,
      });
      form.setBusy(false);
      form.close();
      await taiLai();
    } catch (e) {
      loi.hien(cauLoi(e));
      form.setBusy(false);
      dangGui(nut, false);
    }
  });
}

/** Hộp "Kết thúc" (bản vẽ thiếu — khuôn hộp của phân hệ): một ô "Đến ngày", điền sẵn hôm nay. */
function moKetThuc(d: BangGiaDto, opener: HTMLElement): void {
  const loi = daiLoi();
  const den = h("input", { class: "vc-input", type: "date", value: vnToday(new Date()) });
  const nut = nutGui("Kết thúc giá", "vc-btn-danger", "ket-thuc-gui");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: "Kết thúc giá",
    body: [
      h("p", { class: "dp-sheet-text" }, `${d.tuyen?.ten ?? "—"} · ${d.coXe?.nhan ?? "—"} · ${vnd(d.soTien)} (${hieuLuc(d.tuNgay, d.denNgay)})`),
      o("bg-kt-den", "Đến ngày", den, { batBuoc: true, goiY: "Giá còn áp tới hết ngày này." }),
      loi.el,
    ],
    foot: [dong, nut],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  nut.addEventListener("click", async () => {
    loi.hien(null);
    bang.setBusy(true);
    dangGui(nut, true);
    try {
      await api(`/api/van-chuyen/bang-gia/${encodeURIComponent(d.id)}/ket-thuc`, { method: "POST", body: { denNgay: den.value } });
      bang.setBusy(false);
      bang.close(false);
      await taiLai();
    } catch (e) {
      loi.hien(cauLoi(e));
      bang.setBusy(false);
      dangGui(nut, false);
    }
  });
}

// ---- Tab Tuyến / Cỡ xe -----------------------------------------------------------------------------------------------------------------------------------
/** Thẻ danh mục: tiêu đề + gợi ý, mỗi dòng tên + chip + "Đổi tên" + "Ngưng dùng"/"Dùng lại", chân có ô thêm (bản vẽ 1a, lưới thẻ). */
function theDanhMuc(o2: { id: string; tieuDe: string; goiY: string; dong: { ten: string; dangDung: boolean; doiTen: () => void; doiDung: (b: HTMLButtonElement) => void }[]; chan: HTMLElement | null; loi: HTMLElement }): HTMLElement {
  return h(
    "section",
    { class: "vc-card tx-dm", id: o2.id, "aria-labelledby": `${o2.id}-title` },
    h("div", { class: "tx-dm-dau" }, h("h2", { id: `${o2.id}-title`, class: "dp-card-title" }, o2.tieuDe), h("div", { class: "vc-hint" }, o2.goiY)),
    ...o2.dong.map((d) => {
      const doiTen = coSua ? h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": "doi-ten" }, "Đổi tên") : null;
      doiTen?.addEventListener("click", d.doiTen);
      const doiDung = coSua ? h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": d.dangDung ? "ngung-dung" : "dung-lai" }, d.dangDung ? "Ngưng dùng" : "Dùng lại") : null;
      doiDung?.addEventListener("click", () => d.doiDung(doiDung));
      return h("div", { class: "tx-dm-dong", "data-ten": d.ten }, h("span", { class: "vc-grow tx-dm-ten" }, d.ten), chipTx(d.dangDung ? "Đang dùng" : "Ngưng dùng", d.dangDung ? "ok" : "muted"), doiTen, doiDung);
    }),
    o2.dong.length === 0 ? h("div", { class: "vc-empty-line" }, "Chưa có mục nào.") : null,
    o2.loi,
    o2.chan,
  );
}

/** Ghi danh mục (tuyến / cỡ): lỗi → dải trong thẻ; xong → tải lại. */
async function ghiDanhMuc(loi: ReturnType<typeof daiLoi>, nut: HTMLButtonElement, fn: () => Promise<unknown>): Promise<void> {
  loi.hien(null);
  nut.disabled = true;
  try {
    await fn();
    await taiLai();
  } catch (e) {
    loi.hien(cauLoi(e));
    nut.disabled = false;
  }
}

/** Hộp đổi tên một mục (tuyến / nhãn cỡ xe). */
function moDoiTen(tieuDe: string, nhan: string, cu: string, toiDa: number, gui: (ten: string) => Promise<unknown>): void {
  const loi = daiLoi();
  const ten = h("input", { class: "vc-input", type: "text", value: cu, maxLength: toiDa });
  const nut = nutGui("Lưu", "btn btn-primary btn-chinh", "luu-ten");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({ title: tieuDe, body: [o("tx-doi-ten", nhan, ten, { batBuoc: true }), loi.el], foot: [dong, nut], footClass: "vc-foot-2" });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  nut.addEventListener("click", async () => {
    loi.hien(null);
    bang.setBusy(true);
    dangGui(nut, true);
    try {
      await gui(ten.value);
      bang.setBusy(false);
      bang.close(false);
      await taiLai();
    } catch (e) {
      loi.hien(cauLoi(e));
      bang.setBusy(false);
      dangGui(nut, false);
    }
  });
}

function vePanelTuyen(panel: HTMLElement, ds: readonly TuyenDto[]): void {
  const loi = daiLoi();
  const sua = (ma: string, body: Record<string, unknown>) => api<TuyenListResponse>(`/api/van-chuyen/tuyen/${encodeURIComponent(ma)}`, { method: "PUT", body });
  let chan: HTMLElement | null = null;
  if (coSua) {
    const ten = h("input", { class: "vc-input", type: "text", maxLength: 120, placeholder: "Ví dụ: Nha Trang – Đầm Môn" });
    const them = h("button", { type: "button", class: "vc-btn btn btn-primary btn-chinh", "data-action": "them-tuyen" }, "Thêm");
    them.addEventListener("click", () => void ghiDanhMuc(loi, them, () => api<TuyenListResponse>("/api/van-chuyen/tuyen", { method: "POST", body: { ten: ten.value } })));
    chan = h("div", { class: "tx-dm-chan" }, o("bg-tuyen-moi", "Tên tuyến mới", ten), them);
  }
  const sx = [...ds].sort((a, b) => Number(b.dangDung) - Number(a.dangDung) || a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
  replaceChildren(panel, h("div", { class: "tx-dm-luoi" }, theDanhMuc({
    id: "bg-dm-tuyen", tieuDe: "Tuyến", goiY: "Thêm, đổi tên hoặc ngưng dùng. Tuyến ngưng dùng vẫn giữ trong giá cũ.", loi: loi.el, chan,
    dong: sx.map((t) => ({
      ten: t.ten, dangDung: t.dangDung,
      doiTen: () => moDoiTen("Đổi tên tuyến", "Tên tuyến", t.ten, 120, (ten) => sua(t.ma, { ten })),
      doiDung: (b) => void ghiDanhMuc(loi, b, () => sua(t.ma, { dangDung: !t.dangDung })),
    })),
  })));
}

function vePanelCo(panel: HTMLElement, ds: readonly CoXeDto[]): void {
  const loi = daiLoi();
  const sua = (ma: string, body: Record<string, unknown>) => api<CoXeListResponse>(`/api/van-chuyen/co-xe/${encodeURIComponent(ma)}`, { method: "PUT", body });
  let chan: HTMLElement | null = null;
  if (coSua) {
    const tu = h("input", { class: "vc-input", type: "number", inputmode: "numeric", min: 1, max: 100 });
    const den = h("input", { class: "vc-input", type: "number", inputmode: "numeric", min: 1, max: 100 });
    const them = h("button", { type: "button", class: "vc-btn btn btn-primary btn-chinh", "data-action": "them-co" }, "Thêm");
    them.addEventListener("click", () => void ghiDanhMuc(loi, them, () => api<CoXeListResponse>("/api/van-chuyen/co-xe", { method: "POST", body: { tuSoKhach: Number(tu.value), denSoKhach: Number(den.value) } })));
    chan = h("div", { class: "tx-dm-chan" }, o("bg-co-tu", "Từ (khách)", tu), o("bg-co-den", "Đến (khách)", den), them);
  }
  /** Ngưng cỡ còn dòng giá đang áp: hỏi xác nhận trước (N do máy chủ đếm — `soDongGiaDangAp`). */
  const ngung = (c: CoXeDto, b: HTMLButtonElement): void => {
    const n = c.soDongGiaDangAp ?? 0;
    if (!c.dangDung || n === 0) return void ghiDanhMuc(loi, b, () => sua(c.ma, { dangDung: !c.dangDung }));
    const nut = h("button", { type: "button", class: "vc-btn vc-btn-danger", "data-action": "ngung-xac-nhan" }, "Vẫn ngưng");
    const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
    const bang = moBangTruot({
      title: `Ngưng dùng cỡ ${c.nhan}`,
      body: [h("p", { class: "dp-sheet-text" }, `Cỡ này còn ${n} dòng giá đang áp. Ngưng dùng thì xe cùng số chỗ sẽ không còn khớp giá theo cỡ — vẫn ngưng?`)],
      foot: [dong, nut], footClass: "vc-foot-2", opener: b,
    });
    if (!bang) return;
    dong.addEventListener("click", () => bang.close());
    nut.addEventListener("click", () => {
      bang.close(false);
      void ghiDanhMuc(loi, b, () => sua(c.ma, { dangDung: false }));
    });
  };
  const sx = [...ds].sort((a, b) => Number(b.dangDung) - Number(a.dangDung) || a.tuSoKhach - b.tuSoKhach);
  replaceChildren(panel, h("div", { class: "tx-dm-luoi" }, theDanhMuc({
    id: "bg-dm-co", tieuDe: "Cỡ xe", goiY: "Nhập khoảng số khách, không kể tài xế.", loi: loi.el, chan,
    dong: sx.map((c) => ({
      ten: c.nhan, dangDung: c.dangDung,
      doiTen: () => moDoiTen("Đổi tên cỡ xe", "Tên cỡ xe", c.nhan, 60, (nhan) => sua(c.ma, { nhan })),
      doiDung: (b) => ngung(c, b),
    })),
  })));
}

if (!can(staff, "transport.rate.view")) showError(errorEl, "Tài khoản này không xem được bảng giá thuê xe.");
else await taiLai();
