// Giao diện bước xác nhận đơn (ADR-0136, Task 3.5): nút Gửi xác nhận / Rút lại / Gửi đơn, dải «Chờ xác nhận», bảng «Xác nhận đơn» (Còn vé / Hết vé / Huỷ).
// Chỉ ẩn/hiện theo cờ do MÁY CHỦ gửi (`xacNhan` của chi tiết đơn); mọi cổng thật ở máy chủ. Dựng bằng `h()`, không innerHTML. Không đụng tên / SĐT / email khách.
import { ApiError, api, type Api, type Order, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { vnd } from "./format";
import { KHUNG_MAC_DINH, type KhungGio } from "../src/shared/khung-gio-don";
import { GHI_CHU_HUY_TOI_DA, luaChonLyDo, nhanNhomHuy } from "../src/shared/ly-do-huy";
import { can } from "../src/shared/permissions";
import { CAU_TIEN_KHOA_KHI_CHO, NHAN_KET_QUA, NHAN_NUT_XAC_NHAN, dongChoXacNhan, nhanLyDoCanXacNhan } from "../src/shared/xac-nhan-hien-thi";

/** Những gì trang đơn cung cấp: tải lại đơn, báo thành công / lỗi. */
export interface BoiCanhXacNhan {
  orderId: string;
  staff: Staff;
  /** Tải lại trang đơn rồi hiện `thongBao` (nếu có). */
  lamMoi: (thongBao?: { tone: "success" | "info"; text: string }) => Promise<void>;
  baoLoi: (err: unknown) => void;
  xoaBao: () => void;
  /** Gửi đơn nhánh B xong: câu báo hiện TRƯỚC, rồi hộp ảnh tự mở như hôm nay (Đ13.7). */
  moAnhXacNhan: () => void;
}

function nutHanhDong(nhan: string, cls: string, action: string, chay: (nut: HTMLButtonElement) => Promise<void>): HTMLButtonElement {
  const nut = h("button", { type: "button", class: cls, "data-action": action }, nhan);
  nut.addEventListener("click", async () => {
    nut.disabled = true;
    try {
      await chay(nut);
    } finally {
      nut.disabled = false;
    }
  });
  return nut;
}

/** «Gửi xác nhận» (người lập KHÔNG giữ quyền Đối tác; đơn thuộc diện cần xác nhận). */
export function nutGuiXacNhan(c: BoiCanhXacNhan, chan: string | null): HTMLButtonElement {
  const nut = nutHanhDong(NHAN_NUT_XAC_NHAN.send, "btn btn-accent", "gui-xac-nhan", async () => {
    c.xoaBao();
    try {
      await api<Api.GuiXacNhanResponse>(`/api/orders/${encodeURIComponent(c.orderId)}/gui-xac-nhan`, { method: "POST", body: {} });
      await c.lamMoi({ tone: "success", text: "Đã gửi xác nhận. Đơn đang chờ người kiểm vé." });
    } catch (err) {
      c.baoLoi(err);
    }
  });
  if (chan) nut.disabled = true;
  return nut;
}

/** «Rút lại» (người lập, đơn đang chờ). */
export function nutRutLai(c: BoiCanhXacNhan): HTMLButtonElement {
  return nutHanhDong(NHAN_NUT_XAC_NHAN.withdraw, "btn", "rut-xac-nhan", async () => {
    if (!confirm("Rút lại yêu cầu xác nhận? Đơn trở về nháp để bạn sửa tiếp.")) return;
    c.xoaBao();
    try {
      await api(`/api/orders/${encodeURIComponent(c.orderId)}/rut-xac-nhan`, { method: "POST", body: {} });
      await c.lamMoi({ tone: "info", text: "Đã rút lại. Đơn trở về nháp." });
    } catch (err) {
      c.baoLoi(err);
    }
  });
}

/** «Gửi đơn» (người lập giữ quyền Đối tác, đơn nháp đã lưu). Câu báo lấy từ máy chủ (`CAU_BAO_GUI_DON`). */
export function nutGuiDon(c: BoiCanhXacNhan, chan: string | null): HTMLButtonElement {
  const nut = nutHanhDong(NHAN_NUT_XAC_NHAN.submit, "btn btn-accent", "gui-don", async () => {
    c.xoaBao();
    try {
      const r = await api<Api.GuiDonResponse>(`/api/orders/${encodeURIComponent(c.orderId)}/gui-don`, { method: "POST", body: {} });
      await c.lamMoi({ tone: "success", text: r.thongBao });
      if (r.nhanh === "B") c.moAnhXacNhan();
    } catch (err) {
      c.baoLoi(err);
    }
  });
  if (chan) nut.disabled = true;
  return nut;
}

/** Dải «Chờ xác nhận · còn N phút» (hoặc «Quá hạn»). Hạn do máy chủ gửi; chữ do `dongChoXacNhan`. */
export function daiChoXacNhan(y: Api.YeuCauXacNhanDto, nowMs: number): HTMLElement {
  const d = dongChoXacNhan({ hanLuc: y.hanLuc, nowMs });
  const ly = nhanLyDoCanXacNhan(y.vi);
  return h(
    "div",
    { class: `cx-dai${d.quaHan ? " cx-dai-qua-han" : ""}`, role: "status", "data-khoi": "cho-xac-nhan" },
    icon(d.quaHan ? "alert" : "clock", 18),
    h("span", { class: "cx-dai-chu" }, h("strong", null, d.text), ly ? h("span", { class: "muted" }, ` · ${ly}`) : null),
  );
}

let khungCache: readonly KhungGio[] | null = null;
/** Khung giờ đón hiệu lực (route của người lập đơn). Người xét duyệt không lập đơn → 403 → dùng bộ mặc định (máy chủ vẫn kiểm đúng khung đang cài, sai thì báo lỗi tiếng Việt). */
async function layKhung(): Promise<readonly KhungGio[]> {
  if (khungCache) return khungCache;
  try {
    const r = await api<Api.KhungGioDonResponse>("/api/cai-dat/khung-gio-don");
    khungCache = r.khung;
  } catch {
    khungCache = KHUNG_MAC_DINH;
  }
  return khungCache;
}

const nhanKhung = (k: KhungGio): string => `${k.tu}–${k.den}`;

/**
 * Bảng «Xác nhận đơn» cho người quyết định được: Còn vé (có thể đổi ngày đi và giờ đón theo khung), Hết vé, Huỷ kèm lý do. Gửi `yeuCauId` + `updatedAt` đã đọc; máy chủ trả 409 khi
 * có người vừa đổi → báo câu của máy chủ rồi tải lại. Tiền chỉ đọc (chạy tạm Hướng 2): có câu giải thích, không ô sửa tiền.
 */
export function bangXacNhanDon(c: BoiCanhXacNhan, order: Order, y: Api.YeuCauXacNhanDto): HTMLElement {
  const goc = h("section", { class: "cx-bang", "aria-labelledby": "cx-tieu-de", "data-khoi": "xac-nhan-don" });
  const tieuDe = h("h2", { id: "cx-tieu-de", class: "cx-tieu-de" }, "Xác nhận đơn");
  const loi = h("p", { class: "cx-loi", role: "alert", hidden: true });
  const baoLoiTaiCho = (err: unknown): void => {
    loi.hidden = false;
    loi.textContent = err instanceof ApiError ? err.message : "Chưa thực hiện được, hãy thử lại.";
  };
  const guiQuyet = async (than: Omit<Api.QuyetDinhXacNhanInput, "yeuCauId" | "updatedAt">, loiBao: string): Promise<void> => {
    loi.hidden = true;
    c.xoaBao();
    try {
      await api<Api.QuyetDinhXacNhanResponse>(`/api/orders/${encodeURIComponent(c.orderId)}/quyet-dinh`, { method: "POST", body: { ...than, yeuCauId: y.id, updatedAt: order.updatedAt } });
      await c.lamMoi({ tone: "success", text: loiBao });
    } catch (err) {
      baoLoiTaiCho(err);
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) await c.lamMoi();
    }
  };

  // ---- Còn vé: ngày đi + giờ đón (tuỳ chọn) ----
  const ngayOng = h("input", { type: "date", class: "vc-input", id: "cx-ngay", "aria-label": "Ngày đi" }) as HTMLInputElement;
  const ngayHienTai = order.services.map((s) => s.departDate).filter((d): d is string => !!d).sort()[0] ?? "";
  ngayOng.value = ngayHienTai;
  const chang = order.services.flatMap((s) => s.legs.filter((l) => l.pickupTime !== null).map((l) => ({ l, ten: s.name })));
  const chonGio = new Map<string, HTMLSelectElement>();
  const hangGio = h("div", { class: "cx-gio" });
  void layKhung().then((khung) => {
    for (const { l, ten } of chang) {
      const sel = h("select", { class: "vc-input", id: `cx-gio-${l.id}`, "aria-label": `Giờ đón — ${ten}` }) as HTMLSelectElement;
      const hienTai = l.pickupSlotEnd ? `${l.pickupTime}–${l.pickupSlotEnd}` : (l.pickupTime ?? "");
      sel.append(h("option", { value: "" }, `Giữ nguyên (${hienTai})`), ...khung.map((k) => h("option", { value: nhanKhung(k) }, nhanKhung(k))));
      chonGio.set(l.id, sel);
      hangGio.append(h("label", { class: "cx-truong", for: `cx-gio-${l.id}` }, h("span", { class: "cx-nhan" }, `Giờ đón · ${ten}`), sel));
    }
  });
  const nutConVe = h("button", { type: "button", class: "btn btn-accent", "data-action": "quyet-dinh-con-ve" }, NHAN_KET_QUA.CON_VE);
  nutConVe.addEventListener("click", async () => {
    nutConVe.disabled = true;
    const than: Omit<Api.QuyetDinhXacNhanInput, "yeuCauId" | "updatedAt"> = { ketQua: "CON_VE" };
    if (ngayOng.value && ngayOng.value !== ngayHienTai) than.ngayDi = ngayOng.value;
    const gioDon: NonNullable<Api.QuyetDinhXacNhanInput["gioDon"]> = [];
    for (const [legId, sel] of chonGio) {
      if (!sel.value) continue;
      const [tu, den] = sel.value.split("–") as [string, string];
      gioDon.push({ legId, pickupTime: tu, pickupSlotEnd: den });
    }
    if (gioDon.length > 0) than.gioDon = gioDon;
    await guiQuyet(than, "Đã xác nhận đơn: còn vé.");
    nutConVe.disabled = false;
  });

  // ---- Hết vé ----
  const nutHetVe = h("button", { type: "button", class: "btn", "data-action": "quyet-dinh-het-ve" }, NHAN_KET_QUA.HET_VE);
  nutHetVe.addEventListener("click", async () => {
    if (!confirm("Báo hết vé? Đơn sẽ được huỷ với lý do «hết chỗ».")) return;
    nutHetVe.disabled = true;
    await guiQuyet({ ketQua: "HET_VE" }, "Đã huỷ đơn: hết vé.");
    nutHetVe.disabled = false;
  });

  // ---- Huỷ kèm lý do (cùng danh sách lý do với hộp Huỷ đơn) ----
  const hopHuy = h("div", { class: "cx-huy" });
  const nutMoHuy = h("button", { type: "button", class: "btn btn-danger", "data-action": "quyet-dinh-huy" }, NHAN_KET_QUA.HUY);
  nutMoHuy.addEventListener("click", () => {
    let chon: string | null = null;
    const ghiChu = h("input", { type: "text", maxlength: GHI_CHU_HUY_TOI_DA, autocomplete: "off", placeholder: "Ghi rõ lý do (không nhập số điện thoại)", "aria-label": "Lý do khác", hidden: true }) as HTMLInputElement;
    const xacNhan = h("button", { type: "submit", class: "btn btn-danger", disabled: true }, "Huỷ đơn");
    const khong = h("button", { type: "button", class: "btn" }, "Không huỷ");
    const capNhat = (): void => { xacNhan.disabled = chon === null || (chon === "OTHER" && ghiChu.value.trim() === ""); };
    const lua = luaChonLyDo({ coTheChonCongTy: can(c.staff, "order.cancel.classify") }).map((l) => {
      const input = h("input", { type: "radio", name: "cx-huy-ly-do", value: l.ma });
      input.addEventListener("change", () => {
        chon = l.ma;
        ghiChu.hidden = l.ma !== "OTHER";
        if (!ghiChu.hidden) ghiChu.focus();
        capNhat();
      });
      return h("label", { class: "pick" }, input, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, l.nhan, h("span", { class: "muted" }, ` · ${nhanNhomHuy(l.nhom)}`)));
    });
    ghiChu.addEventListener("input", capNhat);
    const form = h(
      "form", { class: "pay-form", "data-khoi": "huy-xac-nhan" },
      h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chọn lý do huỷ (bắt buộc)"), ...lua, ghiChu),
      h("div", { class: "handler-actions" }, xacNhan, khong),
    ) as HTMLFormElement;
    khong.addEventListener("click", () => replaceChildren(hopHuy, nutMoHuy));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (chon === null || (chon === "OTHER" && ghiChu.value.trim() === "")) return;
      xacNhan.disabled = true;
      await guiQuyet(chon === "OTHER" ? { ketQua: "HUY", lyDo: chon, ghiChu: ghiChu.value.trim() } : { ketQua: "HUY", lyDo: chon }, "Đã huỷ đơn.");
      capNhat();
    });
    replaceChildren(hopHuy, form);
  });
  hopHuy.append(nutMoHuy);

  goc.append(
    tieuDe,
    h("p", { class: "muted" }, `Đơn ${order.orderCode} · Tổng ${vnd(order.total)}. Kiểm vé rồi chọn một trong ba kết quả.`),
    h("div", { class: "cx-con-ve" },
      h("label", { class: "cx-truong", for: "cx-ngay" }, h("span", { class: "cx-nhan" }, "Ngày đi (đổi nếu cần)"), ngayOng),
      hangGio,
      nutConVe,
    ),
    h("div", { class: "cx-hang-nut" }, nutHetVe, hopHuy),
    h("p", { class: "muted cx-ghi-chu", "data-chu": "tien-khoa" }, CAU_TIEN_KHOA_KHI_CHO),
    loi,
  );
  return goc;
}
