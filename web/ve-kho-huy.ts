// Phần giao diện kho vé theo số sê-ri (ADR-0217 Phần B): danh sách vé của một lô, tìm vé theo số sê-ri, «Huỷ vé» và hộp xác nhận có ô lý do (dùng chung cho «Huỷ lô» của lô đã cấp).
//   GET  /api/ve/lo/:id/ve-trong-lo   → { ve: [{ soSeri, tuNgay, denNgay, tinhTrang, nhan, maDon? }] }
//   GET  /api/ve/tim?soSeri=VE_…      → { ve: { …dòng vé, loId, tenSanPham, trangThaiLo } }
//   POST /api/ve/huy-ve { soSeri, lyDo, lenhId } → { traSuat, veThay, canGuiLai }
// Số sê-ri không bí mật nên hiện đủ; mã vé (bí mật) máy chủ không trả và trang không bao giờ có. Máy chủ chưa tự báo người phụ trách đơn khi huỷ vé đã gửi khách (nợ đã ghi ở ADR-0217),
// nên mọi nơi huỷ phải nói rõ: văn phòng tự gửi lại vé thay. Ẩn/hiện theo quyền do nơi gọi truyền (`huyDuoc`); máy chủ kiểm lại. Không innerHTML.
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { chuanHoaSoSeri } from "../src/shared/so-seri-ve";

export type TinhTrangVe = "TRONG_KHO" | "DA_GIU" | "DA_GUI" | "DA_DUNG" | "DA_HUY";
export type NhapLai = "NHAP_LAI_DUOC" | "DA_NHAP_LAI" | "KHONG_NHAP_LAI_DUOC";
export interface VeTrongLo { soSeri: string; tuNgay: string; denNgay: string; tinhTrang: TinhTrangVe; nhan: string; maDon?: string; nhapLaiNeuHuy?: boolean; huyLuc?: string; huyBoi?: string | null; lyDoHuy?: string | null; nhapLai?: NhapLai }
export interface TrangVe { ve: VeTrongLo[]; trang: number; coTrangSau: boolean; tongVe: number }
const NHAN_NHAP_LAI: Readonly<Record<NhapLai, string>> = { NHAP_LAI_DUOC: "Nhập lại được", DA_NHAP_LAI: "Đã nhập lại", KHONG_NHAP_LAI_DUOC: "Không nhập lại được" };
/** «HH:mm ngày dd/MM» giờ Việt Nam của một mốc ISO UTC. */
const gioNgayVn = (iso: string): string => { const [n, g] = new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().split("T") as [string, string]; return `${g.slice(0, 5)} ngày ${n.slice(8, 10)}/${n.slice(5, 7)}`; };
/** Dòng «Trang N» và hai nút «Trang trước» / «Trang sau» (chia trang 50, chủ chốt 18/11). Không hiện khi chỉ có một trang. */
export function thanhTrang(trang: number, coTrangSau: boolean, doi: (trangMoi: number) => void): HTMLElement | null {
  if (trang <= 1 && !coTrangSau) return null;
  const truoc = h("button", { type: "button", class: "btn", "data-action": "trang-truoc", disabled: trang <= 1 }, "Trang trước");
  const sau = h("button", { type: "button", class: "btn", "data-action": "trang-sau", disabled: !coTrangSau }, "Trang sau");
  truoc.addEventListener("click", () => doi(trang - 1));
  sau.addEventListener("click", () => doi(trang + 1));
  return h("div", { class: "handler-actions", "data-khoi": "thanh-trang" }, truoc, h("span", { class: "muted", "aria-live": "polite" }, `Trang ${trang}`), sau);
}
interface HuyVeRes { soSeri: string; trangThai: string; traSuat: boolean; veThay: "DA_CAP" | "THIEU" | null; canGuiLai: boolean }

const TOI_THIEU_LY_DO = 5;
const TOI_DA_LY_DO = 300;
export const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const ngayDung = (tu: string, den: string): string => { const [a, b] = [tu, den].map((n) => n.split("-").reverse().join("/")); return a === b ? `dùng ngày ${a}` : `dùng từ ${a} đến ${b}`; };

/** Hộp xác nhận một chiều CÓ ô lý do. `gui` chạy ngay trong hộp: lỗi máy chủ hiện trong hộp (hộp giữ nguyên để sửa lý do hoặc bỏ); thành công thì hộp đóng và trả true. */
/** `xacNhan` (chủ chốt 18/11): thêm ô gõ (16px) — nút nguy hiểm chỉ bấm được khi `dung(giáTrịĐãGõ)`; `gui` nhận giá trị đã gõ. Máy chủ vẫn kiểm lại. */
export function hopHuyCoLyDo(o: { tieuDe: string; hauQua: string[]; nhanNguyHiem: string; opener?: HTMLElement | null; xacNhan?: { nhan: string; dung: (go: string) => boolean }; gui: (lyDo: string, xacNhanGo: string) => Promise<void> }): Promise<boolean> {
  return new Promise((resolve) => {
    const giu = h("button", { type: "button", class: "btn" }, "Quay lại");
    const nguy = h("button", { type: "button", class: "btn btn-danger" }, o.nhanNguyHiem);
    const o_ = h("input", { type: "text", class: "o", id: "vk-ly-do-huy", maxLength: TOI_DA_LY_DO, autocomplete: "off", required: true });
    const xn = o.xacNhan ? h("input", { type: "text", class: "o", id: "vk-xac-nhan", maxLength: 12, autocomplete: "off", autocapitalize: "characters", spellcheck: false, required: true }) : null;
    if (xn) nguy.disabled = true;
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    let xong = false;
    const bang = moBangTruot({
      title: o.tieuDe,
      body: [
        h("div", { class: "sheet-canh-bao" }, icon("alertCircle", 24)),
        ...o.hauQua.map((c) => h("p", null, c)),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "vk-ly-do-huy" }, `Lý do huỷ (từ ${TOI_THIEU_LY_DO} đến ${TOI_DA_LY_DO} ký tự, không ghi số điện thoại)`), o_),
        ...(xn && o.xacNhan ? [h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "vk-xac-nhan" }, o.xacNhan.nhan), xn)] : []),
        loi,
      ],
      foot: [giu, nguy],
      footClass: "sheet-foot-xac-nhan",
      opener: o.opener,
      vaiTro: "alertdialog",
      khongNutDong: true,
      onClosed: () => resolve(xong),
    });
    if (!bang) return resolve(false);
    giu.addEventListener("click", () => bang.close());
    o_.addEventListener("input", () => { loi.hidden = true; });
    xn?.addEventListener("input", () => { nguy.disabled = !(o.xacNhan?.dung(xn.value) ?? true); });
    nguy.addEventListener("click", async () => {
      const lyDo = o_.value.trim();
      if (xn && !(o.xacNhan?.dung(xn.value) ?? true)) { nguy.disabled = true; xn.focus(); return; }
      if (lyDo.length < TOI_THIEU_LY_DO) { loi.textContent = `Hãy ghi lý do huỷ (ít nhất ${TOI_THIEU_LY_DO} ký tự).`; loi.hidden = false; o_.focus(); return; }
      loi.hidden = true;
      bang.setBusy(true); nguy.disabled = true; giu.disabled = true; o_.disabled = true; if (xn) xn.disabled = true;
      try {
        await o.gui(lyDo, xn?.value ?? "");
        xong = true;
        bang.setBusy(false);
        bang.close();
      } catch (err) {
        bang.setBusy(false); nguy.disabled = false; giu.disabled = false; o_.disabled = false; if (xn) xn.disabled = false;
        loi.textContent = lyDoLoi(err); loi.hidden = false;
      }
    });
    o_.focus();
  });
}

/** Câu báo trước khi huỷ một vé, theo tình trạng của vé (khớp bảng quyết định huỷ vé ở máy chủ). */
function cauBaoTruoc(v: VeTrongLo): string[] {
  // Vé hãng ngoài chưa từng giữ cho đơn: huỷ nhầm thì nhập lại đúng ảnh vé đó là được. Còn lại: huỷ xong không nhập lại được.
  const nhapLaiDuoc = v.nhapLaiNeuHuy === true;
  const dau = nhapLaiDuoc ? `Huỷ vé ${v.soSeri}. Vé này chưa từng giữ cho đơn nào: huỷ nhầm thì nhập lại đúng ảnh vé đó là được.` : `Huỷ vé ${v.soSeri}. Huỷ xong không nhập lại được, không hoàn tác được.`;
  if (v.tinhTrang === "TRONG_KHO") return [dau, "Vé đang nằm trong kho; huỷ xong không bán được nữa."];
  if (v.tinhTrang === "DA_GIU") return [dau, `Vé đang giữ cho${v.maDon ? ` đơn ${v.maDon}` : " một đơn"}. Huỷ thì đơn được trả suất và máy tự cấp vé khác từ kho; kho hết vé thì đơn báo thiếu vé.`];
  return [dau, `Vé này ĐÃ GỬI cho khách${v.maDon ? ` (đơn ${v.maDon})` : ""}. Khách còn cầm vé cũ; huỷ xong vé đó quét ra đỏ «Vé đã huỷ». Máy cấp vé thay từ kho nhưng chưa tự báo ai: văn phòng phải gửi lại vé thay cho khách.`];
}

/** Câu sau khi huỷ vé thành công: một câu kết quả, và (nếu vé đã gửi khách) một câu riêng nói văn phòng phải gửi lại. */
export function cauSauHuyVe(v: VeTrongLo, r: HuyVeRes): { ok: string; guiLai: string | null } {
  const thay = r.traSuat ? (r.veThay === "DA_CAP" ? " Máy đã cấp vé khác cho đơn." : r.veThay === "THIEU" ? " Kho hết vé phù hợp nên đơn đang thiếu vé: nhập thêm vé rồi cấp cho đơn." : " Đơn đã được trả suất.") : "";
  return {
    ok: `Đã huỷ vé ${r.soSeri}.${thay}`,
    guiLai: r.canGuiLai ? `Vé ${r.soSeri} đã gửi cho khách${v.maDon ? ` (đơn ${v.maDon})` : ""}: khách còn giữ vé cũ và vé đó không dùng được nữa. Nền tảng chưa tự báo người phụ trách đơn, nên văn phòng phải mở đơn${v.maDon ? ` ${v.maDon}` : ""} và gửi lại vé thay cho khách.` : null,
  };
}

export interface ChoDongVe {
  /** Người xem huỷ được vé của lô này (theo nguồn lô). */
  huyDuoc: boolean;
  /** Sau khi huỷ xong: cập nhật câu báo và tải lại danh sách. */
  sauHuy: (ok: string, guiLai: string | null) => Promise<void>;
  /** Chữ phụ thêm (tìm vé: tên sản phẩm của lô). */
  phu?: string;
  /** Nguồn của lô chứa vé: vé hãng ngoài đã gửi khách (đã mở) máy chủ không cho huỷ, nên không hiện nút. */
  nguon?: string;
}

/** Một dòng vé: số sê-ri, tình trạng, hạn, mã đơn nếu có; nút «Huỷ vé» khi huỷ được. */
export function dongVe(v: VeTrongLo, o: ChoDongVe): HTMLElement {
  const chiTiet = [v.nhan, ngayDung(v.tuNgay, v.denNgay), v.maDon ? `Đơn ${v.maDon}` : "", o.phu ?? ""].filter(Boolean).join(" · ");
  const li = h("li", { "data-so-seri": v.soSeri, "data-tinh-trang": v.tinhTrang }, h("strong", null, v.soSeri), h("p", { class: "muted" }, chiTiet));
  if (v.tinhTrang === "DA_HUY" && v.huyLuc) {
    li.append(h("p", { class: "muted", "data-khoi": "huy-ve-chi-tiet" }, `Đã huỷ lúc ${gioNgayVn(v.huyLuc)} · bởi ${v.huyBoi ?? "không rõ"}${v.lyDoHuy ? ` · lý do: ${v.lyDoHuy}` : ""}`));
    if (v.nhapLai) li.append(h("p", { "data-khoi": "nhap-lai", "data-nhap-lai": v.nhapLai }, h("strong", null, NHAN_NHAP_LAI[v.nhapLai])));
  }
  if (o.huyDuoc && v.tinhTrang !== "DA_HUY" && v.tinhTrang !== "DA_DUNG" && !(o.nguon === "HANG_NGOAI" && v.tinhTrang === "DA_GUI")) {
    const nut = h("button", { type: "button", class: "btn", "data-action": "huy-ve", "data-so-seri": v.soSeri }, "Huỷ vé");
    nut.addEventListener("click", async () => {
      let r: HuyVeRes | null = null;
      const lenhId = crypto.randomUUID();
      const daGui = v.tinhTrang === "DA_GUI"; // vé khách đang cầm: gõ lại bốn chữ cuối số sê-ri mới bấm huỷ được (chủ chốt 18/11)
      const bonCuoi = v.soSeri.slice(-4);
      const dongY = await hopHuyCoLyDo({
        tieuDe: "Huỷ vé này?", hauQua: cauBaoTruoc(v), nhanNguyHiem: "Huỷ vé", opener: nut,
        ...(daGui ? { xacNhan: { nhan: `Gõ bốn chữ cuối của số sê-ri (…${bonCuoi}) để xác nhận`, dung: (go: string) => go.replace(/\s+/g, "").toUpperCase() === bonCuoi } } : {}),
        gui: async (lyDo, go) => { r = await api<HuyVeRes>("/api/ve/huy-ve", { method: "POST", body: { soSeri: v.soSeri, lyDo, lenhId, ...(daGui ? { xacNhanBonCuoi: go } : {}) } }); },
      });
      if (dongY && r) { const c = cauSauHuyVe(v, r); await o.sauHuy(c.ok, c.guiLai); }
    });
    li.append(h("div", { class: "handler-actions" }, nut));
  }
  return li;
}

/** Mở một trang (50 vé) của danh sách vé của một lô vào `khu`; có nút «Trang trước» / «Trang sau» khi lô nhiều hơn 50 vé. */
export async function veCuaLo(khu: HTMLElement, loId: string, o: Omit<ChoDongVe, "phu">, trang = 1): Promise<VeTrongLo[]> {
  replaceChildren(khu, h("p", { class: "muted" }, "Đang tải…"));
  try {
    const r = await api<TrangVe>(`/api/ve/lo/${encodeURIComponent(loId)}/ve-trong-lo?trang=${trang}`);
    if (r.ve.length === 0) replaceChildren(khu, h("p", { class: "muted" }, "Lô này chưa có vé nào trong kho."));
    else {
      const tt = thanhTrang(r.trang, r.coTrangSau, (t) => { void veCuaLo(khu, loId, o, t); });
      replaceChildren(khu, h("p", { class: "muted" }, `${r.tongVe} vé trong lô`), h("ul", { class: "pay-list", "data-khoi": "ve-trong-lo" }, ...r.ve.map((v) => dongVe(v, o))), ...(tt ? [tt] : []));
    }
    return r.ve;
  } catch (err) {
    replaceChildren(khu, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    return [];
  }
}

/** Ô tìm vé theo số sê-ri: gõ thường, có khoảng trắng đều được (`chuanHoaSoSeri`); kết quả một dòng vé dùng chung dòng của danh sách lô. */
export function khoiTimVe(huyDuocTheoNguon: (nguon: string) => boolean, sauHuy: (ok: string, guiLai: string | null) => Promise<void>): HTMLElement {
  const o_ = h("input", { type: "text", class: "o", id: "vk-tim-so-seri", maxLength: 20, autocomplete: "off", autocapitalize: "characters", spellcheck: false, placeholder: "VE_ABCDEFGH" });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const kq = h("ul", { class: "pay-list", "data-khoi": "tim-ve" });
  const nut = h("button", { type: "submit", class: "btn", "data-action": "tim-ve" }, "Tìm vé");
  const form = h("form", { id: "vk-tim-form", novalidate: true },
    h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "vk-tim-so-seri" }, "Số sê-ri của vé"), o_), loi, h("div", { class: "handler-actions" }, nut), kq);
  const tim = async (): Promise<void> => {
    loi.hidden = true; replaceChildren(kq);
    const so = chuanHoaSoSeri(o_.value);
    if (so === null) { loi.textContent = "Số sê-ri gồm «VE_» và tám chữ cái, ví dụ VE_ABCDEFGH."; loi.hidden = false; return; }
    o_.value = so;
    nut.disabled = true;
    try {
      const r = await api<{ ve: VeTrongLo & { tenSanPham: string; nguon: string } }>(`/api/ve/tim?soSeri=${encodeURIComponent(so)}`);
      replaceChildren(kq, dongVe(r.ve, { huyDuoc: huyDuocTheoNguon(r.ve.nguon), nguon: r.ve.nguon, phu: r.ve.tenSanPham, sauHuy: async (ok, guiLai) => { replaceChildren(kq); await sauHuy(ok, guiLai); } }));
    } catch (err) {
      loi.textContent = lyDoLoi(err); loi.hidden = false;
    } finally { nut.disabled = false; }
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); void tim(); });
  return form;
}
