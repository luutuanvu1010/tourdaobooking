// Trang "Đối chiếu vé" (ADR-0175 §2.7). Chỉ xem. Gọi:
//   GET /api/ve/doi-chieu?ngay=YYYY-MM-DD   → { ngay, dong: [{ dichVu, soKhachTheoDon, daDung, chenhLech }], soVe: { daTao, trongKho, daCapChuaMo, daMoChuaDung, daDung, daHuy } }
//   GET /api/ve/nguoi-quet?ngay=YYYY-MM-DD  → { ngay, dong: [{ nguoi, daTinh, chiXem, tuChoi, daBo }] }
// Hiện cho người có `ve.doi-chieu.view`; máy chủ kiểm lại. Không có mã vé, tên khách, SĐT hay giá. Không innerHTML.
import { ApiError, api } from "./api";
import { can } from "../src/shared/permissions";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

interface DongKhach { dichVu: string; soKhachTheoDon: number; daDung: number; chenhLech: number }
interface SoVe { daTao: number; trongKho: number; daCapChuaMo: number; daMoChuaDung: number; daDung: number; daHuy: number }
interface DongLuot { id: string; luc: string; nguoi: string; dichVu: string; soCuoi: string }
interface DongNguoi { nguoi: string; daTinh: number; chiXem: number; tuChoi: number; daBo: number }

const errorEl = byId("error");
const noiDungEl = byId("vdc-noi-dung");
const ngayEl = byId<HTMLInputElement>("vdc-ngay");
const khachEl = byId("vdc-khach");
const nguoiEl = byId("vdc-nguoi");
const soVeEl = byId("vdc-so-ve");
const khoiLuotEl = byId("vdc-khoi-luot");
const luotEl = byId("vdc-luot");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** Bảng nhiều cột: cột đầu chữ, các cột sau số (căn phải). */
function bang(dau: string[], dong: (string | number)[][]): HTMLElement {
  return h("table", { class: "items" },
    h("thead", null, h("tr", null, ...dau.map((c, i) => h("th", { class: i === 0 ? "" : "num", scope: "col" }, c)))),
    h("tbody", null, ...dong.map((d) => h("tr", null, ...d.map((c, i) => h(i === 0 ? "th" : "td", i === 0 ? { scope: "row" } : { class: "num" }, String(c)))))));
}

if (!can(staff, "ve.doi-chieu.view")) {
  showError(errorEl, "Trang Đối chiếu vé chỉ Kế toán, Quản lý bán hàng, Quản trị và Toàn quyền xem được.");
} else {
  noiDungEl.hidden = false;
  ngayEl.value = vnToday(new Date());
  let lanTai = 0;

  async function tai(): Promise<void> {
    const ngay = ngayEl.value;
    if (!isISODate(ngay)) return;
    const lan = ++lanTai;
    for (const el of [khachEl, nguoiEl]) replaceChildren(el, h("p", { class: "muted" }, "Đang tải…"));
    errorEl.hidden = true;
    try {
      const [dc, nq] = await Promise.all([
        api<{ dong: DongKhach[]; soVe: SoVe }>(`/api/ve/doi-chieu?ngay=${encodeURIComponent(ngay)}`),
        api<{ coTheBoLuot: boolean; dong: DongNguoi[] }>(`/api/ve/nguoi-quet?ngay=${encodeURIComponent(ngay)}`),
      ]);
      if (lan !== lanTai) return; // người dùng đã đổi ngày: bỏ kết quả cũ
      replaceChildren(khachEl, dc.dong.length === 0
        ? h("p", { class: "muted" }, "Ngày này không có dịch vụ nào dùng vé Tour Đảo.")
        : bang(["Dịch vụ", "Khách theo đơn", "Đã dùng", "Chênh lệch"], dc.dong.map((d) => [d.dichVu, d.soKhachTheoDon, d.daDung, d.chenhLech])),
      h("p", { class: "muted" }, "Chênh lệch = khách theo đơn trừ khách đã dùng. Dương là còn khách chưa quét; âm là quét nhiều hơn số khách của đơn."));
      replaceChildren(nguoiEl, nq.dong.length === 0
        ? h("p", { class: "muted" }, "Ngày này chưa có lượt quét nào.")
        : bang(["Người quét", "Đã dùng", "Chỉ xem", "Từ chối", "Đã bỏ"], nq.dong.map((d) => [d.nguoi, d.daTinh, d.chiXem, d.tuChoi, d.daBo])));
      khoiLuotEl.hidden = !nq.coTheBoLuot;
      if (nq.coTheBoLuot) await taiLuot(ngay, lan);
      const s = dc.soVe;
      replaceChildren(soVeEl,
        bang(["Vé Tour Đảo", "Số vé"], [["Đã tạo", s.daTao], ["Trong kho", s.trongKho], ["Đã cấp, chưa mở", s.daCapChuaMo], ["Đã mở, chưa dùng", s.daMoChuaDung], ["Đã dùng", s.daDung], ["Đã huỷ", s.daHuy]]),
        h("p", { class: "muted" }, "Đã tạo bằng tổng năm dòng dưới. Vé đã mở rồi mà đơn bị huỷ tính vào «Đã huỷ». Số khách còn phải phục vụ là «Đã cấp, chưa mở» cộng «Đã mở, chưa dùng». Sổ này tính cả kho, không theo ngày."));
    } catch (err) {
      if (lan !== lanTai) return;
      for (const el of [khachEl, nguoiEl]) replaceChildren(el);
      showError(errorEl, lyDoLoi(err));
    }
  }
  const gioVn = (iso: string): string => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(11, 16);

  /** Danh sách lượt đã dùng của ngày, mỗi lượt một nút «Bỏ lượt quét» (mở ô lý do). Máy chủ chỉ trả cho Quản trị, Toàn quyền và kiểm lại khi bỏ. */
  async function taiLuot(ngay: string, lan: number): Promise<void> {
    const r = await api<{ dong: DongLuot[] }>(`/api/ve/luot-quet?ngay=${encodeURIComponent(ngay)}`);
    if (lan !== lanTai) return;
    if (r.dong.length === 0) { replaceChildren(luotEl, h("p", { class: "muted" }, "Ngày này không có lượt đã dùng nào.")); return; }
    replaceChildren(luotEl, ...r.dong.map((l) => {
      const loi = h("p", { class: "alert", role: "alert", hidden: true });
      const o = h("input", { type: "text", class: "o", maxLength: 300, autocomplete: "off", "aria-label": "Lý do bỏ lượt quét" });
      const nutGui = h("button", { type: "submit", class: "nut", "data-cap": "phu" }, "Bỏ lượt quét");
      const form = h("form", { class: "qv-bo-form", hidden: true }, o, nutGui, loi);
      const nutMo = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Bỏ lượt quét");
      nutMo.addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) o.focus(); });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const lyDo = o.value.trim();
        if (lyDo.length < 5) { loi.hidden = false; loi.textContent = "Hãy ghi lý do bỏ lượt quét (ít nhất 5 ký tự)."; return; }
        nutGui.disabled = true; loi.hidden = true;
        try { await api(`/api/ve/quet/${encodeURIComponent(l.id)}/bo`, { method: "POST", body: { lyDo } }); await tai(); }
        catch (err) { loi.hidden = false; loi.textContent = lyDoLoi(err); nutGui.disabled = false; }
      });
      return h("div", { class: "qv-luot" }, h("p", { class: "qv-luot-chu" }, `${gioVn(l.luc)} · ${l.dichVu} · số cuối ${l.soCuoi} · ${l.nguoi}`), h("div", { class: "qv-bo" }, nutMo, form));
    }));
  }
  ngayEl.addEventListener("change", () => void tai());
  await tai();
}
