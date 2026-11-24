// Bảng giá thuê xe (/bang-gia-xe — ADR-0057 T1 B1–B5, sửa bởi ADR-0095 Q3; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1a; kế hoạch Đợt 4 G1).
// - Xem: ô transport.rate.view (Kế toán, Quản trị, Toàn quyền); ghi (Thêm giá, Đổi giá, Kết thúc, tuyến, cỡ xe): ô transport.rate.manage. Máy chủ luôn kiểm lại.
// - ADR-0095 Q3: mỗi dòng giá BẮT BUỘC cả tuyến LẪN cỡ xe — form không có "Mọi tuyến" / "Mọi cỡ xe"; BỎ câu của bản vẽ "Có cả giá theo tuyến và giá theo cỡ
//   xe thì giá theo tuyến được dùng" và gợi ý "Cần ít nhất một trong tuyến hoặc cỡ xe".
// - Trạng thái dòng (Đang áp / Sắp áp / Đã kết thúc) do MÁY CHỦ gắn theo ngày xem; ô "Giá đang áp ngày" chỉ đổi ngày xem. Lỗi hiện nguyên văn câu máy chủ.
// - Ba thẻ con Giá thuê / Tuyến / Cỡ xe (role="tablist", phím mũi tên). Mã tuyến / cỡ do máy sinh, không hiện.
// - Bố cục: khuôn Thiết lập của khung gốc (ADR-0222) — đoạn dẫn, khối lọc (nhà xe, ngày áp), thẻ con, rồi MỘT khối của thẻ đang chọn với nút «thêm» ở đầu
//   khối; form thêm / đổi mở trong khối form (#bg-form, máy tính) hoặc bảng trượt (điện thoại).
import type { BangGiaDongResponse, BangGiaDto, BangGiaResponse, CoXeDto, CoXeListResponse, NhaXeBangGiaDto, TuyenDto, TuyenListResponse } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { NHAN_TRANG_THAI_GIA, docSoTien, goiYDoiGia, hieuLuc, loiSoTien } from "../src/shared/tien-xe-hien-thi";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { moBangTruot } from "./bang-truot";
import { taoLenh } from "./dieu-phoi-ui";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { datCrumb } from "./giay-to-ui";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";
import { dsDong, khoi, luoi, truong } from "./khung";
import { cauLoi, chipTx, daiLoi, dangGui, dangTai, loiTai, moFormKhung, oKhung } from "./tien-xe-ui";

const errorEl = byId("error");
const trangEl = byId("bg-trang");

const staff = await initShell();
ganDaiTrangAnhEm("/bang-gia-xe", staff);
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

/** Khối form (máy tính): một khối riêng đứng trên khối của thẻ con, ẩn tới khi mở form. */
let formHost: HTMLElement = h("section", { id: "bg-form", class: "khoi", hidden: true });
/** Nút «thêm» ở đầu khối đang hiện: lúc form mở, nút nền đặc là nút lưu trong form — nút này lui về nút viền (tối đa một nút nền đặc mỗi màn). */
let nutThemDangHien: HTMLButtonElement | null = null;
const moFormCua = (o2: Parameters<typeof moFormKhung>[0]) => {
  const nut = nutThemDangHien;
  const f = moFormKhung({ ...o2, onClosed: () => nut?.setAttribute("data-cap", "chinh") });
  if (f && !formHost.hidden) nut?.setAttribute("data-cap", "phu");
  return f;
};

function ve(): void {
  const r = duLieu!;
  const nx = nhaXeDangChon();
  const themDuoc = coSua && !!nx?.dangHopTac;

  const selNx = h("select", { id: "bg-nha-xe", class: "o" }, ...r.nhaXe.map((n) => h("option", { value: n.partyId }, tenNhaXe(n))));
  selNx.value = nhaXeId ?? "";
  selNx.disabled = r.nhaXe.length === 0;
  selNx.addEventListener("change", () => {
    nhaXeId = selNx.value;
    void taiLai();
  });
  const oNgay = h("input", { id: "bg-ngay", class: "o", type: "date", value: ngay });
  oNgay.addEventListener("change", () => {
    if (!isISODate(oNgay.value)) return;
    ngay = oNgay.value;
    void taiLai();
  });
  const loc = khoi({ thuoc: { "aria-label": "Lọc" } }, luoi(null, truong("Nhà xe", selNx, { cot: 6 }), truong("Giá đang áp ngày", oNgay, { cot: 6 })));

  const tabs = TAB.map((t) => {
    const b = h("button", { type: "button", role: "tab", id: `bg-tab-${t.ma}`, "aria-selected": String(t.ma === tab), "aria-controls": "bg-panel", tabindex: t.ma === tab ? 0 : -1, "data-tab": t.ma }, t.nhan);
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
  formHost = h("section", { id: "bg-form", class: "khoi", hidden: true });
  nutThemDangHien = null;
  const panel = tab === "gia" ? khoiGia(nx, themDuoc) : tab === "tuyen" ? khoiTuyen(r.tuyen) : khoiCo(r.coXe);
  replaceChildren(trangEl, loc, h("div", { class: "tab-phu", "data-kieu": "gach", role: "tablist", "aria-label": "Bảng giá thuê xe" }, ...tabs), formHost, panel);
}

function doiTab(t: Tab, focus: boolean): void {
  tab = t;
  ghiUrl();
  ve();
  if (focus) document.getElementById(`bg-tab-${t}`)?.focus();
}

/** Thuộc tính chung của khối thẻ con đang chọn (vùng của thẻ con — role tabpanel). */
const thuocPanel = (): Record<string, unknown> => ({ id: "bg-panel", role: "tabpanel", "aria-labelledby": `bg-tab-${tab}` });

// ---- Thẻ Giá thuê --------------------------------------------------------------------------------------------------------------------------------------------
function khoiGia(nx: NhaXeBangGiaDto | null, themDuoc: boolean): HTMLElement {
  const r = duLieu!;
  if (!nx) {
    return khoi({ kieu: "bang", thuoc: thuocPanel() }, h("p", { class: "rong" }, h("strong", null, "Chưa có nhà xe đối tác"), h("span", null, "Thêm hồ sơ nhà xe ở Danh bạ (vai trò Nhà xe đối tác) để nhập giá thuê.")));
  }
  // Nút "Thêm giá" ở đầu khối — chỉ khi nhà xe đang hợp tác. Trạng thái rỗng không lặp lại nút này.
  const nutThem = themDuoc ? (h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "them-gia" }, "Thêm giá") as HTMLButtonElement) : null;
  nutThem?.addEventListener("click", () => moFormGia(null, nutThem));
  nutThemDangHien = nutThem;
  const dau = { tieuDe: tenNhaXe(nx), idTieuDe: "bg-gia-ten", viec: nutThem ? [nutThem] : undefined, viecODau: true, kieu: "bang" as const, thuoc: thuocPanel() };
  if (r.dong.length === 0) {
    return khoi(dau, h("p", { class: "rong" }, h("strong", null, "Nhà xe này chưa có giá"), h("span", null, "Thêm giá theo tuyến và cỡ xe để chuyến xe thuê tự lấy giá bảng.")));
  }
  const nutDong = (d: BangGiaDto): HTMLElement[] => {
    if (!coSua || d.trangThai === "DA_KET_THUC") return [];
    const doi = nx.dangHopTac ? (h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "doi-gia" }, "Đổi giá") as HTMLButtonElement) : null;
    doi?.addEventListener("click", () => moFormGia(d, doi));
    const ket = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", "data-action": "ket-thuc-gia" }, "Kết thúc") as HTMLButtonElement;
    ket.addEventListener("click", () => moKetThuc(d, ket));
    return doi ? [doi, ket] : [ket];
  };
  const tenTuyen = (d: BangGiaDto) => d.tuyen?.ten ?? "—";
  const nhanCo = (d: BangGiaDto) => d.coXe?.nhan ?? "—";
  const bang = h(
    "table",
    { class: "bang", "aria-label": "Giá thuê" },
    h("thead", null, h("tr", null, h("th", null, "Tuyến"), h("th", null, "Cỡ xe"), h("th", { "data-so": "" }, "Số tiền / chuyến"), h("th", null, "Hiệu lực"), h("th", null, "Trạng thái"), h("th", null, ""))),
    h(
      "tbody",
      null,
      ...r.dong.map((d) => {
        const tt = NHAN_TRANG_THAI_GIA[d.trangThai];
        return h(
          "tr",
          { "data-dong": d.id },
          h("td", null, tenTuyen(d), d.ghiChu ? h("span", { class: "o-phu" }, d.ghiChu) : null),
          h("td", null, nhanCo(d)),
          h("td", { "data-so": "" }, vnd(d.soTien)),
          h("td", null, hieuLuc(d.tuNgay, d.denNgay)),
          h("td", null, chipTx(tt.nhan, tt.tone)),
          h("td", null, h("span", { class: "hang" }, ...nutDong(d))),
        );
      }),
    ),
  );
  const ds = h(
    "div",
    { class: "ds-dong", "data-thay-bang": "" },
    ...r.dong.map((d) => {
      const tt = NHAN_TRANG_THAI_GIA[d.trangThai];
      const nut = nutDong(d);
      return h(
        "div",
        { class: "dong", "data-dong": d.id },
        h(
          "span",
          { class: "dong-chu" },
          h("strong", null, tenTuyen(d)),
          h("span", { class: "o-phu" }, `${nhanCo(d)} · ${hieuLuc(d.tuNgay, d.denNgay)}`),
          d.ghiChu ? h("span", { class: "o-phu" }, d.ghiChu) : null,
          h("span", null, chipTx(tt.nhan, tt.tone)),
        ),
        h("span", null, vnd(d.soTien)),
        nut.length ? h("span", { class: "hang" }, ...nut) : null,
      );
    }),
  );
  return khoi(dau, bang, ds);
}

/** Form "Thêm giá" (`cu` null) / "Đổi giá — <tuyến>" (khoá tuyến + cỡ, gửi `thayDongId`). requestId mới mỗi lần mở form. */
function moFormGia(cu: BangGiaDto | null, opener: HTMLElement): void {
  const r = duLieu!;
  const lenh = taoLenh();
  const loi = daiLoi();
  const tuyenDung = r.tuyen.filter((t) => t.dangDung).sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
  const coDung = r.coXe.filter((c) => c.dangDung).sort((a, b) => a.tuSoKhach - b.tuSoKhach);
  const selTuyen = h("select", { disabled: !!cu },
    h("option", { value: "" }, "Chọn tuyến"),
    ...(cu?.tuyen && !tuyenDung.some((t) => t.ma === cu.tuyen!.ma) ? [h("option", { value: cu.tuyen.ma }, cu.tuyen.ten)] : []),
    ...tuyenDung.map((t) => h("option", { value: t.ma }, t.ten)));
  selTuyen.value = cu?.tuyen?.ma ?? "";
  const selCo = h("select", { disabled: !!cu },
    h("option", { value: "" }, "Chọn cỡ xe"),
    ...(cu?.coXe && !coDung.some((c) => c.ma === cu.coXe!.ma) ? [h("option", { value: cu.coXe.ma }, cu.coXe.nhan)] : []),
    ...coDung.map((c) => h("option", { value: c.ma }, c.nhan)));
  selCo.value = cu?.coXe?.ma ?? "";
  const tien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: cu ? String(cu.soTien) : "", placeholder: "Ví dụ: 450000" });
  const tuNgay = h("input", { type: "date", value: vnToday(new Date()) });
  const denNgay = h("input", { type: "date" });
  const ghiChu = h("input", { type: "text", maxLength: 200, value: "" });
  const goiYTu = h("span", { "aria-live": "polite" }, cu ? goiYDoiGia(tuNgay.value) : "");
  if (cu) tuNgay.addEventListener("input", () => (goiYTu.textContent = goiYDoiGia(tuNgay.value)));
  const nut = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "luu-gia" }, cu ? "Lưu giá mới" : "Lưu giá") as HTMLButtonElement;
  nut.dataset.nhan = nut.textContent ?? "";
  const form = moFormCua({
    tieuDe: cu ? `Đổi giá — ${cu.tuyen?.ten ?? ""}` : "Thêm giá",
    body: [
      oKhung("bg-f-tuyen", "Tuyến", selTuyen, { batBuoc: true, cot: 6 }),
      oKhung("bg-f-co", "Cỡ xe", selCo, { batBuoc: true, cot: 6 }),
      oKhung("bg-f-tien", "Số tiền (₫)", tien, { batBuoc: true, cot: 4 }),
      oKhung("bg-f-tu", "Từ ngày", tuNgay, { batBuoc: true, goiY: goiYTu, cot: 4 }),
      oKhung("bg-f-den", "Đến ngày", denNgay, { goiY: "Để trống nếu đang áp", cot: 4 }),
      oKhung("bg-f-ghi-chu", "Ghi chú", ghiChu),
      h("p", { class: "truong-goi-y" }, cu ? "Đổi giá giữ nguyên tuyến và cỡ xe của dòng cũ." : "Chọn cả tuyến và cỡ xe."),
      loi.el,
    ],
    nut: [nut],
    host: formHost,
    opener,
  });
  if (!form) return;
  nut.addEventListener("click", async () => {
    loi.hien(null);
    // L3 (vòng vá 1): số gõ sai định dạng → báo ngay, không gửi 0. Chỉ kiểm định dạng, giá trị do máy chủ kiểm.
    const saiSo = loiSoTien(tien.value);
    if (saiSo) return loi.hien(saiSo);
    form.setBusy(true);
    dangGui(nut, true);
    try {
      await lenh.gui<BangGiaDongResponse>("/api/van-chuyen/bang-gia", "POST", {
        nhaXePartyId: nhaXeId, tuyen: selTuyen.value || null, coXe: selCo.value || null, soTien: docSoTien(tien.value),
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
  const den = h("input", { type: "date", value: vnToday(new Date()) });
  const nut = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "nguy-hiem", "data-action": "ket-thuc-gui" }, "Kết thúc giá") as HTMLButtonElement;
  nut.dataset.nhan = "Kết thúc giá";
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "phu" }, "Đóng");
  const bang = moBangTruot({
    title: "Kết thúc giá",
    body: [
      h("p", { class: "dp-sheet-text" }, `${d.tuyen?.ten ?? "—"} · ${d.coXe?.nhan ?? "—"} · ${vnd(d.soTien)} (${hieuLuc(d.tuNgay, d.denNgay)})`),
      oKhung("bg-kt-den", "Đến ngày", den, { batBuoc: true, goiY: "Giá còn áp tới hết ngày này." }),
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

// ---- Thẻ Tuyến / Cỡ xe -----------------------------------------------------------------------------------------------------------------------------------
/** Khối danh mục: đầu khối có nút «Thêm» (mở form thêm), mô tả, mỗi dòng tên + huy hiệu + "Đổi tên" + "Ngưng dùng"/"Dùng lại". */
function khoiDanhMuc(o2: { id: string; tieuDe: string; goiY: string; nutThem: HTMLButtonElement | null; dong: { ten: string; dangDung: boolean; doiTen: () => void; doiDung: (b: HTMLButtonElement) => void }[]; loi: HTMLElement }): HTMLElement {
  nutThemDangHien = o2.nutThem;
  return khoi(
    { tieuDe: o2.tieuDe, idTieuDe: `${o2.id}-title`, viec: o2.nutThem ? [o2.nutThem] : undefined, viecODau: true, moTa: o2.goiY, kieu: "bang", thuoc: { ...thuocPanel(), "data-danh-muc": o2.id } },
    o2.loi,
    o2.dong.length === 0 ? h("p", { class: "rong" }, "Chưa có mục nào.") : null,
    // Danh sách luôn có trong khối (kể cả khi rỗng — ẩn) để `#bg-dm-tuyen` / `#bg-dm-co` luôn tìm được.
    dsDong(
          { id: o2.id, hidden: o2.dong.length === 0 },
          ...o2.dong.map((d) => {
            const doiTen = coSua ? (h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "doi-ten" }, "Đổi tên") as HTMLButtonElement) : null;
            doiTen?.addEventListener("click", d.doiTen);
            const doiDung = coSua ? (h("button", { type: "button", class: "nut", "data-cap": "loi", "data-action": d.dangDung ? "ngung-dung" : "dung-lai" }, d.dangDung ? "Ngưng dùng" : "Dùng lại") as HTMLButtonElement) : null;
            doiDung?.addEventListener("click", () => d.doiDung(doiDung));
            return h(
              "div",
              { class: "dong", "data-ten": d.ten, "data-ngung": d.dangDung ? undefined : "" },
              h("span", { class: "dong-chu" }, h("strong", null, d.ten), h("span", null, chipTx(d.dangDung ? "Đang dùng" : "Ngưng dùng", d.dangDung ? "ok" : "muted"))),
              doiTen,
              doiDung,
            );
          }),
    ),
  );
}

/** Ghi danh mục (tuyến / cỡ): lỗi → dải trong khối (hoặc trong form đang mở); xong → tải lại. */
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
  const ten = h("input", { type: "text", value: cu, maxLength: toiDa });
  const nut = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "luu-ten" }, "Lưu") as HTMLButtonElement;
  nut.dataset.nhan = "Lưu";
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "phu" }, "Đóng");
  const bang = moBangTruot({ title: tieuDe, body: [oKhung("tx-doi-ten", nhan, ten, { batBuoc: true }), loi.el], foot: [dong, nut], footClass: "vc-foot-2" });
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

/** Form thêm một mục danh mục (tuyến / cỡ xe): khối form ở máy tính, bảng trượt ở điện thoại. */
function moFormThemDanhMuc(o2: { tieuDe: string; body: HTMLElement[]; nut: HTMLButtonElement; opener: HTMLElement; gui: () => Promise<unknown> }): void {
  const loi = daiLoi();
  const form = moFormCua({ tieuDe: o2.tieuDe, body: [...o2.body, loi.el], nut: [o2.nut], host: formHost, opener: o2.opener });
  if (!form) return;
  o2.nut.addEventListener("click", async () => {
    loi.hien(null);
    form.setBusy(true);
    dangGui(o2.nut, true);
    try {
      await o2.gui();
      form.setBusy(false);
      form.close();
      await taiLai();
    } catch (e) {
      loi.hien(cauLoi(e));
      form.setBusy(false);
      dangGui(o2.nut, false);
    }
  });
}

function khoiTuyen(ds: readonly TuyenDto[]): HTMLElement {
  const loi = daiLoi();
  const sua = (ma: string, body: Record<string, unknown>) => api<TuyenListResponse>(`/api/van-chuyen/tuyen/${encodeURIComponent(ma)}`, { method: "PUT", body });
  let nutThem: HTMLButtonElement | null = null;
  if (coSua) {
    const mo = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "mo-them-tuyen" }, "Thêm") as HTMLButtonElement;
    mo.addEventListener("click", () => {
      const ten = h("input", { type: "text", maxLength: 120, placeholder: "Ví dụ: Nha Trang – Đầm Môn" });
      const them = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "them-tuyen" }, "Thêm") as HTMLButtonElement;
      them.dataset.nhan = "Thêm";
      moFormThemDanhMuc({ tieuDe: "Tuyến", body: [oKhung("bg-tuyen-moi", "Tên tuyến mới", ten)], nut: them, opener: mo, gui: () => api<TuyenListResponse>("/api/van-chuyen/tuyen", { method: "POST", body: { ten: ten.value } }) });
    });
    nutThem = mo;
  }
  const sx = [...ds].sort((a, b) => Number(b.dangDung) - Number(a.dangDung) || a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
  return khoiDanhMuc({
    id: "bg-dm-tuyen", tieuDe: "Tuyến", goiY: "Thêm, đổi tên hoặc ngưng dùng. Tuyến ngưng dùng vẫn giữ trong giá cũ.", loi: loi.el, nutThem,
    dong: sx.map((t) => ({
      ten: t.ten, dangDung: t.dangDung,
      doiTen: () => moDoiTen("Đổi tên tuyến", "Tên tuyến", t.ten, 120, (ten) => sua(t.ma, { ten })),
      doiDung: (b) => void ghiDanhMuc(loi, b, () => sua(t.ma, { dangDung: !t.dangDung })),
    })),
  });
}

function khoiCo(ds: readonly CoXeDto[]): HTMLElement {
  const loi = daiLoi();
  const sua = (ma: string, body: Record<string, unknown>) => api<CoXeListResponse>(`/api/van-chuyen/co-xe/${encodeURIComponent(ma)}`, { method: "PUT", body });
  let nutThem: HTMLButtonElement | null = null;
  if (coSua) {
    const mo = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "mo-them-co" }, "Thêm") as HTMLButtonElement;
    mo.addEventListener("click", () => {
      const tu = h("input", { type: "number", inputmode: "numeric", min: 1, max: 100 });
      const den = h("input", { type: "number", inputmode: "numeric", min: 1, max: 100 });
      const them = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "them-co" }, "Thêm") as HTMLButtonElement;
      them.dataset.nhan = "Thêm";
      moFormThemDanhMuc({
        tieuDe: "Cỡ xe", body: [oKhung("bg-co-tu", "Từ (khách)", tu, { cot: 6 }), oKhung("bg-co-den", "Đến (khách)", den, { cot: 6 })], nut: them, opener: mo,
        gui: () => api<CoXeListResponse>("/api/van-chuyen/co-xe", { method: "POST", body: { tuSoKhach: Number(tu.value), denSoKhach: Number(den.value) } }),
      });
    });
    nutThem = mo;
  }
  /** Ngưng cỡ còn dòng giá đang áp: hỏi xác nhận trước (N do máy chủ đếm — `soDongGiaDangAp`). */
  const ngung = (c: CoXeDto, b: HTMLButtonElement): void => {
    const n = c.soDongGiaDangAp ?? 0;
    if (!c.dangDung || n === 0) return void ghiDanhMuc(loi, b, () => sua(c.ma, { dangDung: !c.dangDung }));
    const nut = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "nguy-hiem", "data-action": "ngung-xac-nhan" }, "Vẫn ngưng");
    const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "phu" }, "Đóng");
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
  return khoiDanhMuc({
    id: "bg-dm-co", tieuDe: "Cỡ xe", goiY: "Nhập khoảng số khách, không kể tài xế.", loi: loi.el, nutThem,
    dong: sx.map((c) => ({
      ten: c.nhan, dangDung: c.dangDung,
      doiTen: () => moDoiTen("Đổi tên cỡ xe", "Tên cỡ xe", c.nhan, 60, (nhan) => sua(c.ma, { nhan })),
      doiDung: (b) => ngung(c, b),
    })),
  });
}

if (!can(staff, "transport.rate.view")) showError(errorEl, "Tài khoản này không xem được bảng giá thuê xe.");
else await taiLai();
