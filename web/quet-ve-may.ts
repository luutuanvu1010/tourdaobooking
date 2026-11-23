// Máy trạng thái của trang Quét vé (ADR-0175 Đ3; đặc tả §2.5) — tách khỏi web/quet-ve.ts (2026-11-21, Việc 9 «quét vé đã dùng thì Nền tảng treo») để kiểm được
// bằng DOM giả và đồng hồ giả (src/quet-ve-may-web.test.ts). Trang chỉ nối camera, ảnh, ô số sê-ri và danh sách lượt gần đây vào đây.
//   rảnh ──(mã mới, hoặc hết mốc 3 giây)──▶ đang gửi ──▶ đang hiện kết quả xanh / vàng / đỏ ──«Quét tiếp»──▶ rảnh (mốc 3 giây CỐ ĐỊNH cho mã vừa gửi)
//                 │ cùng mã trong mốc: dòng nhắc + «Quét lại vé này»      │ lỗi mạng / 5xx: tự gửi lại có giãn cách, tối đa 3 lần trong ~14 giây
//                 ▼                                                      ▼ hết lượt / quá hạn chót 15 giây, hoặc máy chủ từ chối rõ (4xx): «Không gửi được» + «Thử lại» / «Quét tiếp»
//   máy chủ phát lại «lần trước đã ghi» (ADR-0094; mất phản hồi lần đầu rồi gửi lại cùng vé): màn trung tính «Lần quét trước đã được ghi» + «Quét tiếp» — KHÔNG tải lại trang
//   (ADR-0175 dòng lịch sử 2026-11-23, chủ «Đồng ý khuyến nghị việc 9»). Bản phát lại không mang kết quả của lần đó, nên màn không có màu xanh / vàng / đỏ.
// Mã vé chỉ nằm trong bộ nhớ trang và thân yêu cầu (không vào địa chỉ, nhật ký, câu báo). Không innerHTML.
import { CHONG_LAP_MS, batDauDong, xetDocLap, type DauDocCuoi } from "../src/shared/chong-doc-lap.ts";
import { h, replaceChildren } from "./dom.ts";

export type Mau = "XANH" | "VANG" | "DO";
export interface KetQuaQuet { mau: Mau; ma: string; ghi: "DA_TINH" | "CHI_XEM" | "TU_CHOI" | null; cau: string; dichVu: string; nhomKhach: string; ngayDi: string | null; soCuoi: string; soSeri?: string; maDon?: string; lanQuetId?: string }
export type XacNhanGui = { lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean; nhapTay?: boolean };
/** Dấu «máy chủ phát lại: lần gửi trước (cùng vé chống ghi trùng) đã được ghi» — trang truyền `khiDaGhi: () => DA_GHI_TRUOC_DO` cho `api()`. Không có kết quả của lần đó
 *  (máy chủ không lưu thân phản hồi — ADR-0094 đ6), nên không biết lần đó xanh, vàng hay đỏ. */
export interface DaGhiTruocDo { daGhiTruocDo: true }
export const DA_GHI_TRUOC_DO: DaGhiTruocDo = { daGhiTruocDo: true };
const laDaGhi = (x: KetQuaQuet | DaGhiTruocDo): x is DaGhiTruocDo => "daGhiTruocDo" in x;

/** Chữ lớn đi cùng màu: người mù màu vẫn đọc được kết quả. `LOI` = chưa kiểm được vé; `DA_GHI` = lần trước đã được ghi, không rõ kết quả (cả hai không phải phán quyết về vé). */
const CHU_LON: Record<Mau | "LOI" | "DA_GHI", { dau: string; chu: string }> = { XANH: { dau: "✓", chu: "Hợp lệ" }, VANG: { dau: "!", chu: "Cần xác nhận" }, DO: { dau: "✕", chu: "Không dùng được" }, LOI: { dau: "↻", chu: "Không gửi được" }, DA_GHI: { dau: "✎︎", chu: "Lần quét trước đã được ghi" } }; // ︎: ép kiểu chữ nét mảnh, không thành hình emoji
/** Mã kết quả vàng → cờ xác nhận gửi lại (khớp `XacNhanQuet` của máy chủ). */
const CO_XAC_NHAN: Record<string, "lechNgay" | "chuaThu" | "vuotKhach" | "nhapTay"> = { LECH_NGAY: "lechNgay", CHUA_THU_DU: "chuaThu", VUOT_KHACH: "vuotKhach", NHAP_TAY: "nhapTay" };

/** Hạn chờ MỘT lần gửi lượt quét (thay 45 giây mặc định của `api()`): người quét đang đứng trước khách, máy chủ im lặng thì báo sớm. */
export const HEN_GIO_QUET_MS = 6000;
/** Chờ trước lần tự gửi lại thứ nhất, thứ hai khi lỗi mạng / hết giờ / máy chủ lỗi (5xx). Hết danh sách thì thôi tự gửi, hiện «Thử lại». */
export const CHO_GUI_LAI_MS: readonly number[] = [1000, 2000];
/** Trần từ lần gửi đầu tới lúc hiện «Không gửi được» (kế hoạch 21/11 Việc 9: ≤ 15 giây). Không tự gửi lại khi lần kế tiếp có thể vượt trần. */
export const TRAN_GUI_MS = 14_000;
/** Hạn chót CỨNG của cả lượt gửi: `henGioMs` chỉ canh từng lần `fetch`, còn vòng chờ 409 «đang xử lý» bên trong `api()` có thể kéo dài hơn (kiểm độc lập 21/11, T1).
 *  Quá hạn thì hiện «Không gửi được»; kết quả tới muộn vẫn được ghi vào lượt gần đây và thay màn lỗi nếu người quét chưa rời màn đó. */
export const HAN_CHOT_MS = 15_000;

/** Sau lần lỗi thứ `soLanLoi` (đếm từ 1), đã trôi `msDaTroi` kể từ lần gửi đầu: chờ bao lâu rồi tự gửi lại, hoặc null = thôi, hiện «Thử lại». */
export function choTruocLanGuiLai(soLanLoi: number, msDaTroi: number): number | null {
  const cho = CHO_GUI_LAI_MS[soLanLoi - 1];
  if (cho === undefined) return null;
  return msDaTroi + cho + HEN_GIO_QUET_MS <= TRAN_GUI_MS ? cho : null;
}

/** Chờ `p` tối đa `ms`: quá hạn thì ném (lỗi không có mã HTTP ⇒ coi như mất mạng). `p` xong muộn mà thành công thì gọi `khiMuon`; muộn mà hỏng thì bỏ. */
function trongHan<T>(p: Promise<T>, ms: number, khiMuon: (v: T) => void): Promise<T> {
  return new Promise<T>((xong, hong) => {
    let qua = false;
    const hen = setTimeout(() => { qua = true; hong(new Error("het_han_chot")); }, Math.max(0, ms));
    p.then((v) => { if (qua) khiMuon(v); else { clearTimeout(hen); xong(v); } }, (e: unknown) => { if (!qua) { clearTimeout(hen); hong(e); } });
  });
}

/** Lỗi đáng tự gửi lại: không có mã HTTP (mất mạng, hết giờ) hoặc máy chủ lỗi 5xx. Máy chủ từ chối rõ (4xx, có `status`) thì không. */
function thuLaiDuoc(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status >= 500;
}

export interface MayQuet {
  /** Mã đọc từ camera: cùng mã vừa gửi trong 3 giây kể từ lúc gửi / lúc «Quét tiếp» thì không gửi (hiện dòng nhắc); hết mốc thì gửi lại. */
  nhanMa(ma: string): void;
  /** Mã do người quét chủ động đưa (ảnh chụp, số sê-ri gõ tay, «Quét lại vé này»): gửi ngay, không xét mốc 3 giây. false = đang bận, chưa gửi (trang báo cho người quét). */
  guiNgay(ma: string): boolean;
  /** Đang gửi hoặc đang hiện kết quả: trang không cần đọc khung camera. */
  dangBan(): boolean;
}

export function taoMayQuet(o: {
  ketQuaEl: HTMLElement;
  trangThaiEl: HTMLElement;
  nhacEl: HTMLElement;
  /** Gửi một lượt quét (trang bọc `api("/api/ve/quet", …, henGioMs, khiDaGhi)`): trả kết quả hoặc dấu `DA_GHI_TRUOC_DO`, hoặc ném như `api()` (ApiError có `status`; mất mạng / hết giờ thì lỗi khác). */
  goi: (ma: string, xn: XacNhanGui, henGioMs: number) => Promise<KetQuaQuet | DaGhiTruocDo>;
  lyDoLoi: (err: unknown) => string;
  khiCoKetQua: (kq: KetQuaQuet) => void;
  dangDocCamera: () => boolean;
  bay?: () => number;
}): MayQuet {
  const bay = o.bay ?? ((): number => Date.now());
  let dangGui = false;
  /** Đang hiện kết quả hoặc «Không gửi được»: tạm ngừng đọc để không quét thêm lượt khác. */
  let dangHien = false;
  let cuoi: DauDocCuoi = null;
  let henNhac: ReturnType<typeof setTimeout> | null = null;
  /** Số thứ tự lượt gửi, và lượt nào đang có màn «Không gửi được» — để kết quả tới muộn chỉ thay đúng màn lỗi của nó. */
  let soLuot = 0;
  let manLoiCua: number | null = null;

  const baoTrangThai = (chu: string): void => { o.trangThaiEl.textContent = chu; };
  const ngVe = (kq: KetQuaQuet): string => (kq.ngayDi ? `Ngày đi ${kq.ngayDi.split("-").reverse().join("/")}` : "");

  function anNhac(): void {
    if (henNhac !== null) { clearTimeout(henNhac); henNhac = null; }
    o.nhacEl.hidden = true;
    replaceChildren(o.nhacEl);
  }

  /** Cùng mã vừa gửi còn trong khung, chưa hết mốc: nói rõ thay vì im lặng; dòng nhắc tự ẩn khi hết mốc (vé còn trong khung thì lúc đó được gửi lại). */
  function hienNhac(ma: string): void {
    if (!o.nhacEl.hidden) return;
    const nutLai = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Quét lại vé này");
    nutLai.addEventListener("click", () => guiNgay(ma));
    replaceChildren(o.nhacEl, h("span", null, "Vé vừa quét vẫn ở trước camera. Đưa vé khác vào khung, hoặc bấm «Quét lại vé này»."), h("div", { class: "qv-nut" }, nutLai));
    o.nhacEl.hidden = false;
    henNhac = setTimeout(anNhac, cuoi === null ? 0 : Math.max(0, cuoi.luc + CHONG_LAP_MS - bay()));
  }

  function dongKhung(): void {
    dangHien = false;
    manLoiCua = null;
    o.ketQuaEl.hidden = true;
    replaceChildren(o.ketQuaEl);
  }

  /** «Quét tiếp»: mốc 3 giây cho mã vừa gửi tính từ lúc này — vé còn trước ống kính không bị đọc lại ngay, hết mốc thì được gửi lại. */
  function quetTiep(): void {
    dongKhung();
    cuoi = batDauDong(cuoi, bay());
  }

  function khung(mau: Mau | "LOI" | "DA_GHI", tieuDe: string, dong: Array<string | null>, nut: HTMLElement[]): void {
    manLoiCua = null;
    replaceChildren(o.ketQuaEl,
      h("div", { class: "qv-ket-than", "data-mau": mau },
        h("p", { class: "qv-ket-dau", "aria-hidden": "true" }, CHU_LON[mau].dau),
        h("h2", { class: "qv-ket-chu" }, tieuDe),
        ...dong.filter((c): c is string => !!c).map((c, i) => h("p", { class: i === 0 ? "qv-ket-cau" : "qv-ket-ct" }, c)),
        h("div", { class: "qv-ket-nut" }, ...nut)));
    o.ketQuaEl.hidden = false;
    dangHien = true;
  }

  function hienKetQua(kq: KetQuaQuet, ma: string, xn: XacNhanGui): void {
    const nut: HTMLElement[] = [];
    const co = CO_XAC_NHAN[kq.ma];
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": co && kq.mau === "VANG" ? "phu" : "chinh", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", quetTiep);
    if (kq.mau === "VANG" && co) {
      const nutXn = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Xác nhận cho đi");
      // Đang gửi lời xác nhận thì khoá cả «Quét tiếp»: khung không bị đóng rồi bật lại khi kết quả về.
      nutXn.addEventListener("click", () => { nutXn.disabled = true; nutTiep.disabled = true; void gui(ma, { ...xn, [co]: true }); });
      nut.push(nutXn);
    }
    nut.push(nutTiep);
    khung(kq.mau, CHU_LON[kq.mau].chu, [kq.cau, kq.dichVu, kq.nhomKhach, ngVe(kq), kq.soSeri ? `Số sê-ri ${kq.soSeri}` : kq.soCuoi ? `Số cuối ${kq.soCuoi}` : "", kq.maDon ? `Đơn ${kq.maDon}` : ""], nut);
    nutTiep.focus();
  }

  /** Chưa kiểm được vé. Không nói «vé chưa được ghi»: lần gửi hết giờ có thể đã tới máy chủ (máy chủ vẫn chỉ tính một vé một lần). */
  function hienLoi(err: unknown, ma: string, xn: XacNhanGui, luot: number): void {
    const mang = thuLaiDuoc(err);
    const nutThu = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Thử lại");
    nutThu.addEventListener("click", () => { dongKhung(); void gui(ma, xn); });
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", quetTiep);
    khung("LOI", mang ? CHU_LON.LOI.chu : "Không kiểm được vé", [o.lyDoLoi(err), mang ? "Kiểm tra mạng (Wi-Fi hoặc 4G) rồi bấm «Thử lại»." : null], [nutThu, nutTiep]);
    manLoiCua = luot;
    nutThu.focus();
  }

  /** Lần gửi trước đã được ghi (phát lại): báo và cho quét tiếp ngay. Không tự gửi lại: «Quét tiếp» đặt mốc 3 giây, vé còn trước camera thì sau đó được kiểm lại
   *  bằng vé chống ghi trùng MỚI (vé cũ đã đóng vì máy chủ trả 2xx) và hiện kết quả thật — đỏ «đã dùng» nếu lần trước đã tính, vàng lại nếu lần trước cần xác nhận. */
  function hienDaGhi(): void {
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", quetTiep);
    // Người soát vé đang đứng trước khách: nói trước rằng kiểm lại sẽ ra đỏ «đã dùng» nếu lần trước đã tính, và cách nhận ra đó là lượt của chính mình
    // (câu máy chủ «… lúc <giờ> bởi <người quét>»), để không từ chối nhầm khách hợp lệ (người chấm giao diện 23/11, S10).
    const kiemLai = o.dangDocCamera() ? "Bấm «Quét tiếp» để kiểm lại vé còn trước camera." : "Chụp ảnh hoặc gõ số sê-ri lần nữa để kiểm lại vé.";
    khung("DA_GHI", CHU_LON.DA_GHI.chu, ["Kết quả của lần quét đó không về tới máy này vì mạng chập chờn. Máy chủ chỉ tính mỗi vé một lần.", kiemLai, "Nếu báo đã dùng với giờ vừa rồi và tên của bạn, lần quét trước đã tính vé hợp lệ: cho khách đi."], [nutTiep]);
    nutTiep.focus();
  }

  /** Máy chủ đã trả lời rõ: ghi vào lượt gần đây (lỗi ở đó không được che kết quả, cũng không phải lỗi mạng), rồi hiện kết quả. Dấu «đã ghi» không vào lượt gần đây. */
  function nhanKetQua(kq: KetQuaQuet | DaGhiTruocDo, ma: string, xn: XacNhanGui): void {
    if (laDaGhi(kq)) {
      hienDaGhi();
      baoTrangThai(o.dangDocCamera() ? "Camera đang đọc." : "");
      return;
    }
    try {
      o.khiCoKetQua(kq);
    } catch {
      // danh sách lượt gần đây hỏng: vẫn phải hiện kết quả cho người quét
    }
    hienKetQua(kq, ma, xn);
    baoTrangThai(o.dangDocCamera() ? "Camera đang đọc." : "");
  }

  /** Kết quả về sau hạn chót của lượt `luot`: lượt quét đã được máy chủ ghi, nên luôn ghi vào lượt gần đây; chỉ thay màn nếu người quét vẫn đứng ở màn lỗi của đúng lượt đó. */
  function ketQuaMuon(luot: number, kq: KetQuaQuet | DaGhiTruocDo, ma: string, xn: XacNhanGui): void {
    if (manLoiCua === luot && !dangGui) nhanKetQua(kq, ma, xn);
    else if (!laDaGhi(kq)) {
      try { o.khiCoKetQua(kq); } catch { /* như trên */ }
    }
  }

  async function gui(ma: string, xn: XacNhanGui = {}): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    anNhac();
    cuoi = { ma, luc: bay() };
    const batDau = bay();
    const luot = ++soLuot;
    baoTrangThai("Đang kiểm tra vé…");
    // Chỉ lời gọi máy chủ nằm trong khối bắt lỗi: lỗi khi hiện kết quả không bao giờ bị coi là lỗi mạng rồi gửi lại.
    let kq: KetQuaQuet | DaGhiTruocDo | null = null;
    let loi: unknown = null;
    try {
      for (let soLanLoi = 0; ;) {
        const conLai = HAN_CHOT_MS - (bay() - batDau);
        try {
          kq = await trongHan(o.goi(ma, xn, Math.min(HEN_GIO_QUET_MS, Math.max(0, conLai))), conLai, (muon) => ketQuaMuon(luot, muon, ma, xn));
          break;
        } catch (err) {
          soLanLoi++;
          const cho = thuLaiDuoc(err) ? choTruocLanGuiLai(soLanLoi, bay() - batDau) : null;
          if (cho === null) { loi = err; break; }
          baoTrangThai(`Chưa gửi được, đang thử gửi lại (lần ${soLanLoi + 1}/${CHO_GUI_LAI_MS.length + 1})…`);
          await new Promise((xong) => setTimeout(xong, cho));
        }
      }
    } finally {
      dangGui = false;
    }
    if (kq !== null) nhanKetQua(kq, ma, xn);
    else {
      hienLoi(loi, ma, xn, luot);
      baoTrangThai(o.lyDoLoi(loi));
    }
  }

  function guiNgay(ma: string): boolean {
    if (dangGui || dangHien) return false;
    void gui(ma);
    return true;
  }

  return {
    nhanMa(ma: string): void {
      if (dangGui || dangHien) return;
      const x = xetDocLap(cuoi, ma, bay());
      cuoi = x.cuoi;
      if (x.gui) void gui(ma);
      else hienNhac(ma);
    },
    guiNgay,
    dangBan: () => dangGui || dangHien,
  };
}

/** Camera bị dừng ngoài ý trang (iOS thu hồi camera, cuộc gọi tới, máy khác chiếm: `ended`) hoặc tạm dừng (`mute` / `unmute`): báo cho trang biết thay vì để hình đứng im. */
export function theoDoiCamera(luong: Pick<MediaStream, "getVideoTracks">, o: { khiDung: () => void; khiTamDung: () => void; khiChayLai: () => void }): void {
  for (const t of luong.getVideoTracks()) {
    t.addEventListener("ended", o.khiDung);
    t.addEventListener("mute", o.khiTamDung);
    t.addEventListener("unmute", o.khiChayLai);
  }
}
