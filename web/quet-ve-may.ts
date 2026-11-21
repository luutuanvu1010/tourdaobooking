// Máy trạng thái của trang Quét vé (ADR-0175 Đ3; đặc tả §2.5) — tách khỏi web/quet-ve.ts (2026-11-21, Việc 9 «quét vé đã dùng thì Nền tảng treo») để kiểm được
// bằng DOM giả và đồng hồ giả (src/quet-ve-may-web.test.ts). Trang chỉ nối camera, ảnh, ô số sê-ri và danh sách lượt gần đây vào đây.
//   rảnh ──(mã mới, hoặc hết mốc 3 giây)──▶ đang gửi ──▶ đang hiện kết quả xanh / vàng / đỏ ──«Quét tiếp»──▶ rảnh (mốc 3 giây CỐ ĐỊNH cho mã vừa gửi)
//                 │ cùng mã trong mốc: dòng nhắc + «Quét lại vé này»      │ lỗi mạng / 5xx: tự gửi lại có giãn cách, tối đa 3 lần trong ~14 giây
//                 ▼                                                      ▼ hết lượt, hoặc máy chủ từ chối rõ (4xx): «Không gửi được» + «Thử lại» / «Quét tiếp»
// Mã vé chỉ nằm trong bộ nhớ trang và thân yêu cầu (không vào địa chỉ, nhật ký, câu báo). Không innerHTML.
import { CHONG_LAP_MS, batDauDong, xetDocLap, type DauDocCuoi } from "../src/shared/chong-doc-lap.ts";
import { h, replaceChildren } from "./dom.ts";

export type Mau = "XANH" | "VANG" | "DO";
export interface KetQuaQuet { mau: Mau; ma: string; ghi: "DA_TINH" | "CHI_XEM" | "TU_CHOI" | null; cau: string; dichVu: string; nhomKhach: string; ngayDi: string | null; soCuoi: string; soSeri?: string; maDon?: string; lanQuetId?: string }
export type XacNhanGui = { lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean; nhapTay?: boolean };

/** Chữ lớn đi cùng màu: người mù màu vẫn đọc được kết quả. `LOI` = chưa kiểm được vé (không phải phán quyết về vé). */
const CHU_LON: Record<Mau | "LOI", { dau: string; chu: string }> = { XANH: { dau: "✓", chu: "Hợp lệ" }, VANG: { dau: "!", chu: "Cần xác nhận" }, DO: { dau: "✕", chu: "Không dùng được" }, LOI: { dau: "↻", chu: "Không gửi được" } };
/** Mã kết quả vàng → cờ xác nhận gửi lại (khớp `XacNhanQuet` của máy chủ). */
const CO_XAC_NHAN: Record<string, "lechNgay" | "chuaThu" | "vuotKhach" | "nhapTay"> = { LECH_NGAY: "lechNgay", CHUA_THU_DU: "chuaThu", VUOT_KHACH: "vuotKhach", NHAP_TAY: "nhapTay" };

/** Hạn chờ MỘT lần gửi lượt quét (thay 45 giây mặc định của `api()`): người quét đang đứng trước khách, máy chủ im lặng thì báo sớm. */
export const HEN_GIO_QUET_MS = 6000;
/** Chờ trước lần tự gửi lại thứ nhất, thứ hai khi lỗi mạng / hết giờ / máy chủ lỗi (5xx). Hết danh sách thì thôi tự gửi, hiện «Thử lại». */
export const CHO_GUI_LAI_MS: readonly number[] = [1000, 2000];
/** Trần từ lần gửi đầu tới lúc hiện «Không gửi được» (kế hoạch 21/11 Việc 9: ≤ 15 giây). Không tự gửi lại khi lần kế tiếp có thể vượt trần. */
export const TRAN_GUI_MS = 14_000;

/** Sau lần lỗi thứ `soLanLoi` (đếm từ 1), đã trôi `msDaTroi` kể từ lần gửi đầu: chờ bao lâu rồi tự gửi lại, hoặc null = thôi, hiện «Thử lại». */
export function choTruocLanGuiLai(soLanLoi: number, msDaTroi: number): number | null {
  const cho = CHO_GUI_LAI_MS[soLanLoi - 1];
  if (cho === undefined) return null;
  return msDaTroi + cho + HEN_GIO_QUET_MS <= TRAN_GUI_MS ? cho : null;
}

/** Lỗi đáng tự gửi lại: không có mã HTTP (mất mạng, hết giờ) hoặc máy chủ lỗi 5xx. Máy chủ từ chối rõ (4xx, có `status`) thì không. */
function thuLaiDuoc(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status >= 500;
}

export interface MayQuet {
  /** Mã đọc từ camera: cùng mã vừa gửi trong 3 giây kể từ lúc gửi / lúc «Quét tiếp» thì không gửi (hiện dòng nhắc); hết mốc thì gửi lại. */
  nhanMa(ma: string): void;
  /** Mã do người quét chủ động đưa (ảnh chụp, số sê-ri gõ tay, «Quét lại vé này»): gửi ngay, không xét mốc 3 giây. */
  guiNgay(ma: string): void;
  /** Đang gửi hoặc đang hiện kết quả: trang không cần đọc khung camera. */
  dangBan(): boolean;
}

export function taoMayQuet(o: {
  ketQuaEl: HTMLElement;
  trangThaiEl: HTMLElement;
  nhacEl: HTMLElement;
  /** Gửi một lượt quét (trang bọc `api("/api/ve/quet", …, henGioMs)`): trả kết quả, hoặc ném như `api()` (ApiError có `status`; mất mạng / hết giờ thì lỗi khác). */
  goi: (ma: string, xn: XacNhanGui, henGioMs: number) => Promise<KetQuaQuet>;
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
    o.ketQuaEl.hidden = true;
    replaceChildren(o.ketQuaEl);
  }

  /** «Quét tiếp»: mốc 3 giây cho mã vừa gửi tính từ lúc này — vé còn trước ống kính không bị đọc lại ngay, hết mốc thì được gửi lại. */
  function quetTiep(): void {
    dongKhung();
    cuoi = batDauDong(cuoi, bay());
  }

  function khung(mau: Mau | "LOI", tieuDe: string, dong: Array<string | null>, nut: HTMLElement[]): void {
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
    if (kq.mau === "VANG" && co) {
      const nutXn = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Xác nhận cho đi");
      nutXn.addEventListener("click", () => { nutXn.disabled = true; void gui(ma, { ...xn, [co]: true }); });
      nut.push(nutXn);
    }
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": co && kq.mau === "VANG" ? "phu" : "chinh", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", quetTiep);
    nut.push(nutTiep);
    khung(kq.mau, CHU_LON[kq.mau].chu, [kq.cau, kq.dichVu, kq.nhomKhach, ngVe(kq), kq.soSeri ? `Số sê-ri ${kq.soSeri}` : kq.soCuoi ? `Số cuối ${kq.soCuoi}` : "", kq.maDon ? `Đơn ${kq.maDon}` : ""], nut);
    nutTiep.focus();
  }

  /** Chưa kiểm được vé. Không nói «vé chưa được ghi»: lần gửi hết giờ có thể đã tới máy chủ (máy chủ vẫn chỉ tính một vé một lần). */
  function hienLoi(err: unknown, ma: string, xn: XacNhanGui): void {
    const mang = thuLaiDuoc(err);
    const nutThu = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Thử lại");
    nutThu.addEventListener("click", () => { dongKhung(); void gui(ma, xn); });
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", quetTiep);
    khung("LOI", mang ? CHU_LON.LOI.chu : "Không kiểm được vé", [o.lyDoLoi(err), mang ? "Kiểm tra mạng (Wi-Fi hoặc 4G) rồi bấm «Thử lại»." : null], [nutThu, nutTiep]);
    nutThu.focus();
  }

  async function gui(ma: string, xn: XacNhanGui = {}): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    anNhac();
    cuoi = { ma, luc: bay() };
    const batDau = bay();
    baoTrangThai("Đang kiểm tra vé…");
    try {
      for (let soLanLoi = 0; ;) {
        try {
          const kq = await o.goi(ma, xn, HEN_GIO_QUET_MS);
          o.khiCoKetQua(kq);
          hienKetQua(kq, ma, xn);
          baoTrangThai(o.dangDocCamera() ? "Camera đang đọc." : "");
          return;
        } catch (err) {
          soLanLoi++;
          const cho = thuLaiDuoc(err) ? choTruocLanGuiLai(soLanLoi, bay() - batDau) : null;
          if (cho === null) {
            hienLoi(err, ma, xn);
            baoTrangThai(o.lyDoLoi(err));
            return;
          }
          baoTrangThai(`Chưa gửi được, đang thử gửi lại (lần ${soLanLoi + 1}/${CHO_GUI_LAI_MS.length + 1})…`);
          await new Promise((xong) => setTimeout(xong, cho));
        }
      }
    } finally {
      dangGui = false;
    }
  }

  function guiNgay(ma: string): void {
    if (dangGui || dangHien) return;
    void gui(ma);
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
