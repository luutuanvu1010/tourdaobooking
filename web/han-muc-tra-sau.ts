// Màn «Hạn mức trả sau» (ADR-0168; kế hoạch Trả sau Task 6). Kế toán và Toàn quyền xem; chỉ Toàn quyền đặt / ngừng. Máy chủ hỏi lại quyền ở mọi lời gọi; hỏi ở đây chỉ để không gọi và nói câu rõ ràng.
//   GET  /api/tra-sau/han-muc → { danhSach, coQuyenSua }        GET /api/tra-sau/han-muc/:partyId/don → { partyId, ten, don }
//   POST /api/tra-sau/han-muc { partyId, hanMuc, soNgay, lyDo? }   POST /api/tra-sau/han-muc/:partyId/ngung
// Số nợ, còn được dùng, đơn quá hạn do máy chủ tính; trang chỉ hiện. Cảnh báo "nợ vượt hạn mức hiện hành" lấy từ `canhBaoVuotHanMuc` (thay R-CRD-3). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { canhBaoVuotHanMuc, cauHanMuc, docHanMuc, docSoNgay, locHoSoTraSau, nhanQuaHan } from "../src/shared/han-muc-tra-sau-hien-thi";
import { dongTien } from "../src/shared/tra-sau";
import { moTrang } from "../src/shared/muc-giao-dien";

const errorEl = byId("error");
const okEl = byId("ok");
const datEl = byId("hm-dat");
const khungEl = byId("hm-khung");
const bangEl = byId("hm-bang");
const theEl = byId("hm-the");
const rongEl = byId("hm-rong");
const donEl = byId("hm-don");

const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const hienLoi = (cau: string): void => {
  okEl.hidden = true;
  showError(errorEl, cau);
  errorEl.scrollIntoView({ block: "nearest" });
};

let danhSach: Api.HanMucTraSauDto[] = [];
let suaDuoc = false;
let chonBen: { id: string; ten: string } | null = null;

async function nap(): Promise<boolean> {
  try {
    const r = await api<Api.HanMucTraSauListResponse>("/api/tra-sau/han-muc");
    danhSach = r.danhSach;
    suaDuoc = r.coQuyenSua;
    showError(errorEl, null);
    return true;
  } catch (err) {
    hienLoi(lyDoLoi(err));
    return false;
  }
}

async function xemDon(d: Api.HanMucTraSauDto): Promise<void> {
  try {
    const r = await api<Api.DonNoTraSauResponse>(`/api/tra-sau/han-muc/${encodeURIComponent(d.partyId)}/don`);
    const dong = (x: Api.DonNoTraSauDto): HTMLElement =>
      h("li", null, h("a", { href: `/order?id=${encodeURIComponent(x.orderId)}` }, x.maDon), ` · nợ ${dongTien(x.no)}`, x.hanTra ? ` · hạn trả ${x.hanTra.split("-").reverse().join("/")}` : "", x.quaHan ? " · quá hạn" : "");
    replaceChildren(donEl, h("h2", null, `Đơn còn nợ của ${r.ten}`), r.don.length === 0 ? h("p", { class: "muted" }, "Không có đơn nào còn nợ.") : h("ul", null, ...r.don.map(dong)));
    donEl.hidden = false;
    donEl.scrollIntoView({ block: "nearest" });
  } catch (err) {
    hienLoi(lyDoLoi(err));
  }
}

async function ngungHanMuc(d: Api.HanMucTraSauDto, opener: HTMLElement): Promise<void> {
  const dongY = await hoiXacNhan({
    tieuDe: `Ngừng hạn mức của ${d.ten}?`,
    hauQua: "Từ lúc này đối tác không đặt thêm đơn trả sau được. Các đơn trả sau đã xác nhận vẫn giữ nguyên, nợ vẫn phải thu.",
    nhanNguyHiem: "Ngừng hạn mức",
    nhanGiu: "Giữ hạn mức",
    opener,
  });
  if (!dongY) return;
  try {
    await api(`/api/tra-sau/han-muc/${encodeURIComponent(d.partyId)}/ngung`, { method: "POST", body: {} });
    await lamMoi(`Đã ngừng hạn mức của ${d.ten}.`);
  } catch (err) {
    hienLoi(lyDoLoi(err));
  }
}

const nutHanh = (d: Api.HanMucTraSauDto): HTMLElement[] => {
  const kq: HTMLElement[] = [];
  if (d.soDonNo > 0) kq.push(h("button", { type: "button", class: "btn", "data-action": "xem-don-no", onclick: () => void xemDon(d) }, "Xem đơn nợ"));
  if (suaDuoc) {
    kq.push(h("button", { type: "button", class: "btn", "data-action": "dat-han-muc", onclick: () => veForm({ id: d.partyId, ten: d.ten }, d) }, "Đặt hạn mức"));
    if (d.coHanMuc) kq.push(h("button", { type: "button", class: "btn", "data-action": "ngung-han-muc", onclick: (ev: Event) => void ngungHanMuc(d, ev.currentTarget as HTMLElement) }, "Ngừng hạn mức"));
  }
  return kq;
};

const canhBao = (d: Api.HanMucTraSauDto): HTMLElement | null => {
  const c = canhBaoVuotHanMuc(d);
  return c ? h("div", { class: "alert", role: "status" }, c) : null;
};
const conDuoc = (d: Api.HanMucTraSauDto): string => (d.conDuocDung === null ? "—" : dongTien(d.conDuocDung));

const hang = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("tr", null,
    h("td", null, d.ten, canhBao(d)),
    h("td", null, cauHanMuc(d)),
    h("td", null, dongTien(d.dangNo)),
    h("td", null, conDuoc(d)),
    h("td", null, nhanQuaHan(d.soDonQuaHan) ?? "—"),
    h("td", null, h("div", { class: "handler-actions" }, ...nutHanh(d))),
  );

const the = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("div", { class: "card card-col" },
    h("div", null, h("strong", null, d.ten)),
    h("div", { class: "muted" }, cauHanMuc(d)),
    h("div", null, `Đang nợ ${dongTien(d.dangNo)} · Còn được dùng ${conDuoc(d)}`),
    nhanQuaHan(d.soDonQuaHan) ? h("div", { class: "muted" }, nhanQuaHan(d.soDonQuaHan)) : null,
    canhBao(d),
    h("div", { class: "handler-actions" }, ...nutHanh(d)),
  );

function ve(): void {
  replaceChildren(bangEl, ...danhSach.map(hang));
  replaceChildren(theEl, ...danhSach.map(the));
  const rong = danhSach.length === 0;
  byId("hm-bang-wrap").hidden = rong;
  rongEl.textContent = rong ? "Chưa có đối tác nào được cấp hạn mức hoặc đang nợ." : "";
  rongEl.hidden = !rong;
  khungEl.hidden = false;
}

/**
 * Hồ sơ chọn được = mọi hồ sơ đang mang loại đối tác được hưởng (cùng danh sách màn «Cấp độ đại lý», `GET /api/pricing/cap-dai-ly`; Toàn quyền giữ ô
 * `partner.commission.write`). Nạp một lần, lọc ở trình duyệt bằng `locHoSoTraSau` (không phân biệt dấu): ô tìm chung của Danh bạ dùng LIKE nên «đại lý» không ra «Đại Lý».
 */
let hoSoChon: Promise<Api.CapDaiLyDongDto[]> | null = null;
const napHoSoChon = (): Promise<Api.CapDaiLyDongDto[]> =>
  (hoSoChon ??= api<Api.CapDaiLyResponse>("/api/pricing/cap-dai-ly").then((r) => r.hoSo, (err: unknown) => { hoSoChon = null; throw err; }));

/** Biểu mẫu «Đặt hạn mức» (Toàn quyền): chọn hồ sơ từ danh sách đối tác được hưởng (lọc theo tên), nhập hạn mức, số ngày, lý do (không bắt buộc). Đặt lại hồ sơ đã có hạn mức = đóng dòng cũ, mở dòng mới. */
function veForm(ben: { id: string; ten: string } | null, hienTai: Api.HanMucTraSauDto | null): void {
  chonBen = ben;
  const oTim = h("input", { type: "search", class: "o", id: "hm-tim", autocomplete: "off", enterkeyhint: "search", placeholder: "Lọc theo tên", "aria-label": "Lọc hồ sơ đối tác theo tên" });
  const ketQua = h("div", { class: "card-list", id: "hm-ds-ho-so" });
  const ghiChu = h("p", { class: "muted", id: "hm-ds-ghi-chu" });
  const dangChon = h("p", { class: "muted", id: "hm-dang-chon" });
  const veChon = (): void => { dangChon.textContent = chonBen ? `Hồ sơ đã chọn: ${chonBen.ten}` : "Chưa chọn hồ sơ."; };
  veChon();
  const veDanhSach = async (): Promise<void> => {
    let ds: Api.CapDaiLyDongDto[];
    try {
      ds = await napHoSoChon();
    } catch (err) {
      replaceChildren(ketQua);
      ghiChu.textContent = `Không tải được danh sách đối tác: ${lyDoLoi(err)}`;
      return;
    }
    if (ds.length === 0) {
      replaceChildren(ketQua);
      ghiChu.textContent = "Chưa có hồ sơ nào mang loại đối tác được hưởng. Gán loại đối tác cho hồ sơ ở Danh bạ trước.";
      return;
    }
    const r = locHoSoTraSau(ds.map((x) => ({ id: x.partyId, ten: x.ten, vai: x.vaiTro.map((v) => v.ten).join(", ") })), oTim.value);
    replaceChildren(ketQua, ...r.hien.map((x) => h("button", { type: "button", class: "btn", "aria-pressed": String(chonBen?.id === x.id), onclick: () => { chonBen = { id: x.id, ten: x.ten }; veChon(); void veDanhSach(); } },
      x.ten, x.vai ? h("span", { class: "muted" }, ` · ${x.vai}`) : null)));
    ghiChu.textContent = r.hien.length === 0 ? "Không có hồ sơ nào khớp tên đã gõ." : r.conLai > 0 ? `Còn ${r.conLai} hồ sơ nữa, gõ tên để lọc.` : "";
  };
  void veDanhSach();
  let tre: ReturnType<typeof setTimeout> | undefined;
  oTim.addEventListener("input", () => {
    if (tre !== undefined) clearTimeout(tre);
    tre = setTimeout(() => void veDanhSach(), 150);
  });
  const oHan = h("input", { type: "text", class: "o", id: "hm-han-muc", inputMode: "numeric", autocomplete: "off", maxLength: 14, required: true, value: hienTai?.hanMuc != null ? String(hienTai.hanMuc) : "" });
  const oNgay = h("input", { type: "text", class: "o", id: "hm-so-ngay", inputMode: "numeric", autocomplete: "off", maxLength: 3, required: true, value: hienTai?.soNgay != null ? String(hienTai.soNgay) : "" });
  const oLyDo = h("input", { type: "text", class: "o", id: "hm-ly-do", autocomplete: "off", maxLength: 200 });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const nut = h("button", { type: "submit", class: "btn btn-primary", "data-action": "luu-han-muc" }, "Đặt hạn mức");
  const form = h("form", { id: "hm-form" },
    h("h2", null, "Đặt hạn mức"),
    h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hm-tim" }, "Hồ sơ đối tác"), oTim), ketQua, ghiChu, dangChon,
    h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hm-han-muc" }, "Hạn mức (đồng)"), oHan),
    h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hm-so-ngay" }, "Số ngày được nợ"), oNgay),
    h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hm-ly-do" }, "Lý do (không bắt buộc)"), oLyDo),
    loi,
    h("div", { class: "handler-actions" }, nut),
  );
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    loi.hidden = true;
    okEl.hidden = true;
    const hm = docHanMuc(oHan.value);
    const ng = docSoNgay(oNgay.value);
    const sai = !chonBen ? "Chọn hồ sơ đối tác trước." : !hm.ok ? hm.message : !ng.ok ? ng.message : null;
    if (sai || !chonBen || !hm.ok || !ng.ok) {
      loi.textContent = sai ?? "";
      loi.hidden = false;
      return;
    }
    nut.disabled = true;
    try {
      const lyDo = oLyDo.value.trim();
      await api("/api/tra-sau/han-muc", { method: "POST", body: { partyId: chonBen.id, hanMuc: hm.dong, soNgay: ng.ngay, ...(lyDo ? { lyDo } : {}) } });
      const ten = chonBen.ten;
      chonBen = null;
      veForm(null, null);
      await lamMoi(`Đã đặt hạn mức cho ${ten}.`);
    } catch (err) {
      loi.textContent = lyDoLoi(err);
      loi.hidden = false;
    } finally {
      nut.disabled = false;
    }
  });
  replaceChildren(datEl, form);
  datEl.hidden = false;
  if (ben) oHan.focus();
}

async function lamMoi(thongBao: string): Promise<void> {
  if (!(await nap())) return;
  ve();
  donEl.hidden = true;
  okEl.textContent = thongBao;
  okEl.hidden = false;
}

const staff = await initShell();
if (!moTrang("hanMucTraSau", staff)) {
  hienLoi("Trang này chỉ Kế toán và Toàn quyền dùng được.");
} else if (await nap()) {
  if (suaDuoc) veForm(null, null);
  ve();
}
