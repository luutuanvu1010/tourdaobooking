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
export interface VeTrongLo { soSeri: string; tuNgay: string; denNgay: string; tinhTrang: TinhTrangVe; nhan: string; maDon?: string }
interface HuyVeRes { soSeri: string; trangThai: string; traSuat: boolean; veThay: "DA_CAP" | "THIEU" | null; canGuiLai: boolean }

const TOI_THIEU_LY_DO = 5;
const TOI_DA_LY_DO = 300;
export const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const ngayDung = (tu: string, den: string): string => { const [a, b] = [tu, den].map((n) => n.split("-").reverse().join("/")); return a === b ? `dùng ngày ${a}` : `dùng từ ${a} đến ${b}`; };

/** Hộp xác nhận một chiều CÓ ô lý do. `gui` chạy ngay trong hộp: lỗi máy chủ hiện trong hộp (hộp giữ nguyên để sửa lý do hoặc bỏ); thành công thì hộp đóng và trả true. */
export function hopHuyCoLyDo(o: { tieuDe: string; hauQua: string[]; nhanNguyHiem: string; opener?: HTMLElement | null; gui: (lyDo: string) => Promise<void> }): Promise<boolean> {
  return new Promise((resolve) => {
    const giu = h("button", { type: "button", class: "btn" }, "Quay lại");
    const nguy = h("button", { type: "button", class: "btn btn-danger" }, o.nhanNguyHiem);
    const o_ = h("input", { type: "text", class: "o", id: "vk-ly-do-huy", maxLength: TOI_DA_LY_DO, autocomplete: "off", required: true });
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    let xong = false;
    const bang = moBangTruot({
      title: o.tieuDe,
      body: [
        h("div", { class: "sheet-canh-bao" }, icon("alertCircle", 24)),
        ...o.hauQua.map((c) => h("p", null, c)),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "vk-ly-do-huy" }, `Lý do huỷ (từ ${TOI_THIEU_LY_DO} đến ${TOI_DA_LY_DO} ký tự, không ghi số điện thoại)`), o_),
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
    nguy.addEventListener("click", async () => {
      const lyDo = o_.value.trim();
      if (lyDo.length < TOI_THIEU_LY_DO) { loi.textContent = `Hãy ghi lý do huỷ (ít nhất ${TOI_THIEU_LY_DO} ký tự).`; loi.hidden = false; o_.focus(); return; }
      loi.hidden = true;
      bang.setBusy(true); nguy.disabled = true; giu.disabled = true; o_.disabled = true;
      try {
        await o.gui(lyDo);
        xong = true;
        bang.setBusy(false);
        bang.close();
      } catch (err) {
        bang.setBusy(false); nguy.disabled = false; giu.disabled = false; o_.disabled = false;
        loi.textContent = lyDoLoi(err); loi.hidden = false;
      }
    });
    o_.focus();
  });
}

/** Câu báo trước khi huỷ một vé, theo tình trạng của vé (khớp bảng quyết định huỷ vé ở máy chủ). */
function cauBaoTruoc(v: VeTrongLo): string[] {
  const dau = `Huỷ vé ${v.soSeri}. Không hoàn tác được.`;
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
}

/** Một dòng vé: số sê-ri, tình trạng, hạn, mã đơn nếu có; nút «Huỷ vé» khi huỷ được. */
export function dongVe(v: VeTrongLo, o: ChoDongVe): HTMLElement {
  const chiTiet = [v.nhan, ngayDung(v.tuNgay, v.denNgay), v.maDon ? `Đơn ${v.maDon}` : "", o.phu ?? ""].filter(Boolean).join(" · ");
  const li = h("li", { "data-so-seri": v.soSeri, "data-tinh-trang": v.tinhTrang }, h("strong", null, v.soSeri), h("p", { class: "muted" }, chiTiet));
  if (o.huyDuoc && v.tinhTrang !== "DA_HUY" && v.tinhTrang !== "DA_DUNG") {
    const nut = h("button", { type: "button", class: "btn", "data-action": "huy-ve", "data-so-seri": v.soSeri }, "Huỷ vé");
    nut.addEventListener("click", async () => {
      let r: HuyVeRes | null = null;
      const lenhId = crypto.randomUUID();
      const dongY = await hopHuyCoLyDo({
        tieuDe: "Huỷ vé này?", hauQua: cauBaoTruoc(v), nhanNguyHiem: "Huỷ vé", opener: nut,
        gui: async (lyDo) => { r = await api<HuyVeRes>("/api/ve/huy-ve", { method: "POST", body: { soSeri: v.soSeri, lyDo, lenhId } }); },
      });
      if (dongY && r) { const c = cauSauHuyVe(v, r); await o.sauHuy(c.ok, c.guiLai); }
    });
    li.append(h("div", { class: "handler-actions" }, nut));
  }
  return li;
}

/** Mở danh sách vé của một lô vào `khu`. */
export async function veCuaLo(khu: HTMLElement, loId: string, o: Omit<ChoDongVe, "phu">): Promise<VeTrongLo[]> {
  replaceChildren(khu, h("p", { class: "muted" }, "Đang tải…"));
  try {
    const r = await api<{ ve: VeTrongLo[] }>(`/api/ve/lo/${encodeURIComponent(loId)}/ve-trong-lo`);
    if (r.ve.length === 0) replaceChildren(khu, h("p", { class: "muted" }, "Lô này chưa có vé nào trong kho."));
    else replaceChildren(khu, h("ul", { class: "pay-list", "data-khoi": "ve-trong-lo" }, ...r.ve.map((v) => dongVe(v, o))));
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
      replaceChildren(kq, dongVe(r.ve, { huyDuoc: huyDuocTheoNguon(r.ve.nguon), phu: r.ve.tenSanPham, sauHuy: async (ok, guiLai) => { replaceChildren(kq); await sauHuy(ok, guiLai); } }));
    } catch (err) {
      loi.textContent = lyDoLoi(err); loi.hidden = false;
    } finally { nut.disabled = false; }
  };
  form.addEventListener("submit", (e) => { e.preventDefault(); void tim(); });
  return form;
}
