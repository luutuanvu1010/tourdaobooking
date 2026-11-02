// Giao diện bước xác nhận đơn (ADR-0136, Task 3.5): nút Gửi xác nhận / Rút lại / Gửi đơn, dải «Chờ xác nhận», bảng «Xác nhận đơn» (Còn vé / Hết vé / Huỷ).
// Chỉ ẩn/hiện theo cờ do MÁY CHỦ gửi (`xacNhan` của chi tiết đơn); mọi cổng thật ở máy chủ. Dựng bằng `h()`, không innerHTML. Không đụng tên / SĐT / email khách.
import { ApiError, api, type Api, type Order, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { vnd } from "./format";
import { LY_DO_DAT_GAP, type LyDoDatGap } from "../src/shared/chang-dua-don";
import { canhBaoChangForm } from "../src/shared/dat-gap-hien-thi";
import { KHUNG_MAC_DINH, type KhungGio } from "../src/shared/khung-gio-don";
import { GHI_CHU_HUY_TOI_DA, luaChonLyDo, nhanNhomHuy } from "../src/shared/ly-do-huy";
import { can } from "../src/shared/permissions";
import { CAU_NHO_DAT_GAP, CAU_THIEU_GIO_LUOT, CAU_TIEN_KHOA_KHI_CHO, NHAN_KET_QUA, NHAN_NUT_XAC_NHAN, dongChoXacNhan, dongGioConVe, nhanGhiChuDichVu, nhanGioLuot, nhanLyDoCanXacNhan, type DongGioConVe, type LuotGioConVe } from "../src/shared/xac-nhan-hien-thi";
import { taoKhungDatGap } from "./dat-gap-ui";

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
  /** Hạn chốt (phút trước giờ đón) máy chủ báo cho trang đơn; null = chưa có chính sách (không cảnh báo — máy chủ vẫn chặn lúc Còn vé). Bảng Còn vé xét «dưới hạn chốt» theo số này. */
  mocPhut: number | null;
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

const KHAC = "khac";

type DichVuDon = Order["services"][number];

/** Một lượt đưa đón trong bảng Còn vé: ô chọn giờ + (lượt bắt buộc) ô giờ gõ tay + vùng «dưới hạn chốt» + giấy đặt gấp giữ trong bảng cho tới khi bấm Còn vé. */
interface OLuot {
  leg: Api.LegDto;
  dichVu: DichVuDon;
  batBuoc: boolean;
  /** Giờ người xét chọn (null = không chọn / chưa đủ giờ). */
  giaTri(): { gio: string; cuoi?: string } | null;
  /** Ô đầu vào để đặt tiêu điểm khi báo thiếu giờ. */
  oDauVao(): HTMLElement;
  datLoi(cau: string | null): void;
  napKhung(khung: readonly KhungGio[]): void;
  /** Tính lại câu «dưới hạn chốt» theo ngày đón SAU lệnh (`ngayDon`) và giờ đang chọn / đang lưu. */
  capMoc(ngayDon: string): void;
  /** Phần tử `gioDon` của lượt này, hoặc null nếu không cần gửi (giờ không đổi và không giấy đặt gấp). */
  phanTuGioDon(): NonNullable<Api.QuyetDinhXacNhanInput["gioDon"]>[number] | null;
}

const nhanKhungGio = (k: KhungGio): string => `${k.tu}–${k.den}`;
const CAU_CHON_LY_DO_DAT_GAP = "Chọn lý do đặt gấp thì xác nhận và xếp xe được.";

/**
 * Khối của MỘT dịch vụ trong bảng Còn vé: ghi chú dịch vụ đứng TRÊN, rồi mọi lượt (`dongGioConVe` — lượt bắt buộc chỉ khi yêu cầu mang cờ «cần chốt giờ»). Mỗi lượt thêm vào `oLuot`. `capMocTatCa` chạy lại khi
 * người xét đổi giờ một lượt (câu «dưới hạn chốt» phụ thuộc ngày đón sau lệnh nên do bảng tính).
 */
function khoiDichVu(dv: DongGioConVe, s: DichVuDon, oLuot: OLuot[], capMocTatCa: () => void, mocPhut: number | null, duocDatGap: boolean): HTMLElement {
  const goc = h("div", { class: "cx-dich-vu", "data-dich-vu": dv.serviceId });
  if (dv.ghiChu !== null) goc.append(h("div", { class: "cx-truong", "data-khoi": "ghi-chu-dich-vu" }, h("span", { class: "cx-nhan" }, nhanGhiChuDichVu(s.name)), h("p", { class: "cx-ghi-chu-dv" }, dv.ghiChu)));
  for (const lx of dv.luot) {
    const o = taoOLuot(lx, s, capMocTatCa, mocPhut, duocDatGap);
    oLuot.push(o.luot);
    goc.append(o.el);
  }
  return goc;
}

function taoOLuot(lx: LuotGioConVe, s: DichVuDon, capMocTatCa: () => void, mocPhut: number | null, duocDatGap: boolean): { luot: OLuot; el: HTMLElement } {
  const { leg, batBuoc } = lx;
  const id = `cx-gio-${leg.id}`;
  const hienTai = leg.pickupSlotEnd ? `${leg.pickupTime}–${leg.pickupSlotEnd}` : (leg.pickupTime ?? "");
  const dauChon = batBuoc ? "Chọn giờ đón" : leg.pickupTime !== null ? `Giữ nguyên (${hienTai})` : "Chưa có giờ";
  const loi = h("p", { class: "cx-loi", id: `${id}-loi`, role: "alert", hidden: true });
  const sel = h("select", { class: "vc-input", id, "aria-describedby": loi.id }, h("option", { value: "" }, dauChon), ...(batBuoc ? [h("option", { value: KHAC }, "Giờ khác")] : [])) as HTMLSelectElement;
  // Lượt bắt buộc: chọn «Giờ khác» thì hiện ô giờ gõ tay (16px — `.vc-input`).
  const gioKhac = batBuoc ? (h("input", { type: "time", class: "vc-input", id: `${id}-khac`, "aria-label": `Giờ đón khác — ${lx.nhanChieu} · ${s.name}`, hidden: true }) as HTMLInputElement) : null;
  const giaTri = (): { gio: string; cuoi?: string } | null => {
    const v = sel.value;
    if (v === "") return null;
    if (v === KHAC) return gioKhac !== null && /^\d{2}:\d{2}$/.test(gioKhac.value) ? { gio: gioKhac.value } : null;
    const [gio, cuoi] = v.split("–") as [string, string];
    return { gio, cuoi };
  };
  let giay: { lyDo: LyDoDatGap; ghiChu: string | null } | null = null;
  let duoiHan = false;
  // Vùng «dưới hạn chốt»: dựng MỘT lần, chỉ đổi chữ / ẩn hiện (khung đặt gấp đang mở và chữ đã gõ trong khung giữ nguyên khi người xét đổi giờ).
  const tieuDe = h("div", { class: "banner-title" });
  const phu = h("div", { class: "dg-warn-sub" }, duocDatGap ? CAU_CHON_LY_DO_DAT_GAP : CAU_NHO_DAT_GAP);
  const dai = h("div", { class: "banner banner-warning dg-warn", "data-moc": "duoi" }, tieuDe, phu);
  const vungMoc = h("div", { class: "dg-block", hidden: true }, dai);
  if (duocDatGap) {
    const nutMo = h("button", { type: "button", class: "pill-btn dg-open", "data-action": "mo-dat-gap" }, "Đặt gấp");
    const khung = taoKhungDatGap({
      nutDuyetPhu: true,
      nutMo: () => nutMo,
      // Giữ giấy trong bảng (KHÔNG gọi máy chủ): đi kèm `gioDon[i].datGap` khi bấm Còn vé.
      onDuyet: async (than) => {
        giay = than;
        phu.textContent = `Đã chọn lý do đặt gấp: ${LY_DO_DAT_GAP[than.lyDo]}.`;
        khung.dong();
      },
    });
    nutMo.addEventListener("click", () => (khung.root.hidden ? khung.mo() : khung.dong()));
    dai.append(h("div", { class: "banner-actions" }, nutMo));
    vungMoc.append(khung.root);
  }
  const capMoc = (ngayDon: string): void => {
    const gio = giaTri()?.gio ?? leg.pickupTime ?? "";
    // Lượt đã đặt gấp rồi (dấu còn trên lượt) không cần lại; chưa có giờ nào thì chưa xét.
    const cau = leg.datGap !== null ? null : canhBaoChangForm({ ngayDon, gioDon: gio, datGap: false }, mocPhut, Date.now());
    duoiHan = cau !== null;
    vungMoc.hidden = cau === null;
    if (cau === null) {
      giay = null; // hết dưới hạn chốt thì giấy cũ không còn dùng (máy chủ trả 409 `short_notice_not_needed` nếu gửi thừa)
      phu.textContent = duocDatGap ? CAU_CHON_LY_DO_DAT_GAP : CAU_NHO_DAT_GAP;
      return;
    }
    tieuDe.textContent = cau;
  };
  sel.addEventListener("change", () => {
    if (gioKhac) {
      gioKhac.hidden = sel.value !== KHAC;
      if (!gioKhac.hidden) gioKhac.focus();
    }
    loi.hidden = true;
    capMocTatCa();
  });
  gioKhac?.addEventListener("input", () => {
    loi.hidden = true;
    capMocTatCa();
  });
  const luot: OLuot = {
    leg, dichVu: s, batBuoc, giaTri,
    oDauVao: () => (sel.value === KHAC && gioKhac !== null ? gioKhac : sel),
    datLoi: (cau) => {
      loi.hidden = cau === null;
      loi.textContent = cau ?? "";
      sel.setAttribute("aria-invalid", cau === null ? "false" : "true");
    },
    napKhung: (khung) => {
      const hau = sel.querySelector(`option[value="${KHAC}"]`); // lượt bắt buộc: các khung đứng trước «Giờ khác»
      for (const k of khung) sel.insertBefore(h("option", { value: nhanKhungGio(k) }, nhanKhungGio(k)), hau);
    },
    capMoc,
    phanTuGioDon: () => {
      const chon = giaTri();
      const giayDi = duocDatGap && duoiHan ? giay : null; // giấy chỉ đi kèm khi lượt đang dưới hạn chốt và người xét giữ ô order.leg.short_notice
      if (chon === null && giayDi === null) return null;
      const g = chon ?? { gio: leg.pickupTime ?? "", cuoi: leg.pickupSlotEnd ?? undefined };
      if (g.gio === "") return null; // chưa có giờ nào: không có gì để gửi (lượt bắt buộc đã bị chặn ở trên)
      return { legId: leg.id, pickupTime: g.gio, ...(g.cuoi ? { pickupSlotEnd: g.cuoi } : {}), ...(giayDi !== null ? { datGap: giayDi } : {}) };
    },
  };
  const el = h(
    "div",
    { class: "cx-luot", "data-leg-id": leg.id },
    h("label", { class: "cx-truong", for: id }, h("span", { class: "cx-nhan" }, nhanGioLuot(lx.nhanChieu, s.name, batBuoc)), sel),
    gioKhac,
    loi,
    vungMoc,
  );
  return { luot, el };
}

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
      // Hai câu 409 này nói người xét còn thiếu giờ / thiếu đặt gấp (ADR-0154 Đ1.3, Đ1.4), KHÔNG phải đơn vừa đổi: giữ bảng để không mất giờ vừa chọn. 409 / 404 khác: đơn đã đổi → tải lại.
      const thieuNhapLieu = err instanceof ApiError && (err.code === "pickup_time_required" || err.code === "short_notice_required");
      if (err instanceof ApiError && (err.status === 409 || err.status === 404) && !thieuNhapLieu) await c.lamMoi();
    }
  };

  // ---- Còn vé: ngày đi + giờ đón theo TỪNG LƯỢT (ADR-0154 Đ1.3, Đ1.4) ----
  const ngayOng = h("input", { type: "date", class: "vc-input", id: "cx-ngay", "aria-label": "Ngày đi" }) as HTMLInputElement;
  const ngayHienTai = order.services.map((s) => s.departDate).filter((d): d is string => !!d).sort()[0] ?? "";
  ngayOng.value = ngayHienTai;
  const duocDatGap = can(c.staff, "order.leg.short_notice");
  const oLuot: OLuot[] = [];
  /** Ngày đón của lượt SAU lệnh (cùng luật máy chủ: đổi ngày đi dời lượt đang đón đúng ngày đi cũ hoặc chưa có ngày; lượt khác giữ ngày của nó). */
  const ngayDonCuaLuot = (o: OLuot): string => {
    const moi = ngayOng.value;
    if (moi !== "" && moi !== ngayHienTai && (o.leg.pickupDate === null || o.leg.pickupDate === o.dichVu.departDate)) return moi;
    return o.leg.pickupDate ?? o.dichVu.departDate ?? "";
  };
  const capNhatMocMoi = (): void => {
    for (const o of oLuot) o.capMoc(ngayDonCuaLuot(o));
  };
  const hangGio = h("div", { class: "cx-gio" });
  for (const dv of dongGioConVe(order.services, y.vi.includes("CHOT_GIO"))) {
    const s = order.services.find((x) => x.id === dv.serviceId)!;
    hangGio.append(khoiDichVu(dv, s, oLuot, capNhatMocMoi, c.mocPhut, duocDatGap));
  }
  capNhatMocMoi(); // lượt đang lưu giờ mà đã dưới hạn chốt (chưa đặt gấp): hiện ngay, không đợi người xét đổi gì
  ngayOng.addEventListener("input", capNhatMocMoi);
  void layKhung().then((khung) => {
    for (const o of oLuot) o.napKhung(khung);
  });
  const nutConVe = h("button", { type: "button", class: "btn btn-accent", "data-action": "quyet-dinh-con-ve" }, NHAN_KET_QUA.CON_VE);
  nutConVe.addEventListener("click", async () => {
    // Lượt BẮT BUỘC chưa có giờ: báo tại chỗ, không gọi máy chủ (máy chủ vẫn từ chối 409 `pickup_time_required` nếu ai gửi thẳng).
    let dauTien: HTMLElement | null = null;
    for (const o of oLuot) {
      const thieu = o.batBuoc && o.giaTri() === null;
      o.datLoi(thieu ? CAU_THIEU_GIO_LUOT : null);
      if (thieu && dauTien === null) dauTien = o.oDauVao();
    }
    if (dauTien !== null) {
      dauTien.focus();
      return;
    }
    nutConVe.disabled = true;
    const than: Omit<Api.QuyetDinhXacNhanInput, "yeuCauId" | "updatedAt"> = { ketQua: "CON_VE" };
    if (ngayOng.value && ngayOng.value !== ngayHienTai) than.ngayDi = ngayOng.value;
    const gioDon: NonNullable<Api.QuyetDinhXacNhanInput["gioDon"]> = [];
    for (const o of oLuot) {
      const g = o.phanTuGioDon();
      if (g !== null) gioDon.push(g);
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
