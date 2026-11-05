// Công tắc «Cần kiểm vé» của màn Dịch vụ & giá (ADR-0169 Đ4, thay trang riêng của ADR-0136 Đ1, Đ5). Gọi:
//   GET  /api/cai-dat/xac-nhan-don → cờ theo dịch vụ / nhóm + công tắc tự kiểm;
//   POST /api/cai-dat/xac-nhan-don { pham, ma, canXacNhan } | { tuXacNhanNoiBo };
//   GET  /api/catalog/quan-ly-ban, PUT /api/catalog/:code/ngung-ban → màn hẹp của Quản lý bán hàng.
// Ẩn/hiện hỏi `can()`; máy chủ kiểm lại. Luật ở src/shared/dich-vu-kiem-ve.ts. Không innerHTML.
import { TEN_CHUA_PHAN_LOAI, demKiemVe, locNhomKiemVe, nhanNguonKiemVe, xepNhomKiemVe, type DongDichVuKiemVe, type NhomKiemVe } from "../src/shared/dich-vu-kiem-ve";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { showError } from "./shell";
import { hienBaoNgan } from "./toast";

const URL_CAI_DAT = "/api/cai-dat/xac-nhan-don";
const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

export interface KiemVe {
  dongCo(): Api.CaiDatXacNhanResponse["dongCo"];
  tuKiem(): boolean;
  tai(): Promise<void>;
  /** Một công tắc: gạt xong tải lại cờ rồi gọi `sauKhiDoi`. */
  congTac(nhan: string, bat: boolean, duLieu: Record<string, string>, khiBam: (nut: HTMLButtonElement) => void): HTMLButtonElement;
  luu(nut: HTMLButtonElement, than: Api.CaiDatXacNhanInput, cauBao: string): Promise<void>;
  /** Công tắc của một vé. */
  congTacVe(ma: string, ten: string, can: boolean): HTMLButtonElement;
  /** Công tắc cả nhóm, có hộp hỏi lại. */
  congTacNhom(ma: string, ten: string, can: boolean): HTMLButtonElement;
  /** Khối công tắc tự kiểm vé (chỉ Toàn quyền vẽ). */
  khoiTuKiem(): HTMLElement;
}

export function taoKiemVe(errorEl: HTMLElement, sauKhiDoi: () => void): KiemVe {
  let caiDat: Api.CaiDatXacNhanResponse = { dongCo: [], tuXacNhanNoiBo: true };

  const congTac: KiemVe["congTac"] = (nhan, bat, duLieu, khiBam) => {
    const nut = h("button", { type: "button", role: "switch", class: "dp-switch", "aria-checked": String(bat), "aria-label": nhan, ...duLieu }, h("span", { class: "dp-switch-knob", "aria-hidden": "true" })) as HTMLButtonElement;
    nut.addEventListener("click", () => khiBam(nut));
    return nut;
  };

  const luu: KiemVe["luu"] = async (nut, than, cauBao) => {
    errorEl.hidden = true;
    nut.disabled = true;
    try {
      caiDat = await api<Api.CaiDatXacNhanResponse>(URL_CAI_DAT, { method: "POST", body: than });
      hienBaoNgan(cauBao);
      sauKhiDoi();
    } catch (err) {
      showError(errorEl, lyDo(err));
      errorEl.scrollIntoView({ block: "nearest" });
      nut.disabled = false;
    }
  };

  const doiCaNhom = async (ma: string, ten: string, canMoi: boolean, nut: HTMLButtonElement): Promise<void> => {
    const dongY = await hoiXacNhan({
      tieuDe: canMoi ? `Bật kiểm vé cho cả nhóm ${ten}?` : `Tắt kiểm vé cả nhóm ${ten}?`,
      hauQua: canMoi
        ? "Đơn mới có vé thuộc nhóm này phải chờ người kiểm vé. Vé đã đặt riêng giữ nguyên. Đơn đã xác nhận không đổi."
        : "Vé của nhóm này xác nhận như thường, trừ vé đã đặt riêng. Đơn đang chờ kiểm vé vẫn phải được quyết.",
      nhanNguyHiem: canMoi ? "Bật cả nhóm" : "Tắt cả nhóm",
      opener: nut,
    });
    if (dongY) await luu(nut, { pham: "GROUP", ma, canXacNhan: canMoi }, canMoi ? `Nhóm ${ten}: cần kiểm vé.` : `Nhóm ${ten}: không cần kiểm vé.`);
  };

  return {
    dongCo: () => caiDat.dongCo,
    tuKiem: () => caiDat.tuXacNhanNoiBo,
    tai: async () => {
      caiDat = await api<Api.CaiDatXacNhanResponse>(URL_CAI_DAT);
    },
    congTac,
    luu,
    congTacVe: (ma, ten, can) =>
      congTac(`Cần kiểm vé: ${ten}`, can, { "data-action": "kiem-ve" }, (nut) => void luu(nut, { pham: "SERVICE", ma, canXacNhan: !can }, can ? `${ten}: không cần kiểm vé.` : `${ten}: cần kiểm vé.`)),
    congTacNhom: (ma, ten, can) => congTac(`Cả nhóm cần kiểm vé: ${ten}`, can, { "data-action": "ca-nhom" }, (nut) => void doiCaNhom(ma, ten, !can, nut)),
    khoiTuKiem: () => {
      const bat = caiDat.tuXacNhanNoiBo;
      return h(
        "div",
        { class: "kv-dong" },
        h(
          "div",
          { class: "kv-chu" },
          h("span", { class: "kv-ten" }, "Nhân viên tự kiểm vé đơn mình lập"),
          h("span", { class: "hint" }, bat ? "Đang bật: người kiểm vé tự quyết được đơn do chính mình lập. Đối tác và Thực tập luôn chờ người khác." : "Đang tắt: mọi đơn cần kiểm vé phải do người khác với người lập quyết."),
        ),
        congTac("Nhân viên tự kiểm vé đơn mình lập", bat, { "data-action": "tu-kiem" }, (nut) => void luu(nut, { tuXacNhanNoiBo: !bat }, bat ? "Đã tắt nhân viên tự kiểm vé." : "Đã bật nhân viên tự kiểm vé.")),
      );
    },
  };
}

/** Màn hẹp của Quản lý bán hàng (ADR-0169 Đ4): tên vé theo nhóm, ô tìm, công tắc kiểm vé, Ngừng bán / Mở bán lại. Không giá, không đồng bộ, không sửa nhóm. */
export async function veManHep(noiDungEl: HTMLElement, errorEl: HTMLElement): Promise<void> {
  let dm: Api.CatalogQuanLyBanResponse | null = null;
  let tuKhoa = "";
  const nhomMo = new Set<string>();
  const dsEl = h("div", { class: "kv-ds" });
  const veDs = (): void => {
    if (!dm) return;
    const ds = locNhomKiemVe(xepNhomKiemVe(dm.dichVu, dm.nhom, kv.dongCo(), true), tuKhoa);
    if (ds.length === 0) {
      replaceChildren(dsEl, h("p", { class: "rong" }, tuKhoa.trim() === "" ? "Danh mục chưa có dịch vụ." : "Không có vé khớp từ đang tìm."));
      return;
    }
    replaceChildren(dsEl, ...ds.map((n) => theNhom(n, tuKhoa.trim() !== "")));
  };
  const kv = taoKiemVe(errorEl, veDs);

  const doiBan = async (d: DongDichVuKiemVe, nut: HTMLButtonElement): Promise<void> => {
    errorEl.hidden = true;
    nut.disabled = true;
    try {
      const r = await api<Api.CatalogNgungBanResponse>(`/api/catalog/${encodeURIComponent(d.ma)}/ngung-ban`, { method: "PUT", body: { ngungBan: d.dangBan } satisfies Api.CatalogNgungBanInput });
      dm = dm && { ...dm, dichVu: dm.dichVu.map((x) => (x.code === r.code ? { ...x, dangBan: !r.ngungBan } : x)) };
      hienBaoNgan(r.ngungBan ? `${d.ten}: đã ngừng bán.` : `${d.ten}: đã mở bán lại.`);
      veDs();
    } catch (err) {
      showError(errorEl, lyDo(err));
      errorEl.scrollIntoView({ block: "nearest" });
      nut.disabled = false;
    }
  };

  const dongVe = (d: DongDichVuKiemVe): HTMLElement => {
    const nutBan = h("button", { type: "button", class: "pill-btn", "data-action": "ngung-ban" }, d.dangBan ? "Ngừng bán" : "Mở bán lại") as HTMLButtonElement;
    nutBan.addEventListener("click", () => void doiBan(d, nutBan));
    return h(
      "div",
      { class: d.dangBan ? "kv-dong" : "kv-dong row-off", "data-ma": d.ma },
      h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, d.ten), !d.dangBan && h("span", { class: "badge badge-cancelled" }, "Đã ngừng bán"), h("span", { class: "hint" }, nhanNguonKiemVe(d))),
      h("div", { class: "kv-viec" }, nutBan, kv.congTacVe(d.ma, d.ten, d.can)),
    );
  };

  const theNhom = (n: NhomKiemVe, moSan: boolean): HTMLElement => {
    const khoa = n.ma ?? TEN_CHUA_PHAN_LOAI;
    const the = h(
      "details",
      { class: "card kv-nhom", "data-nhom": khoa, open: moSan || nhomMo.has(khoa) || n.soCan > 0 },
      h("summary", { class: "kv-dau" }, h("h2", {}, n.ten), h("span", { class: "hint" }, demKiemVe(n))),
      n.ma === null
        ? null
        : h(
            "div",
            { class: "kv-dong kv-ca-nhom" },
            h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, "Cả nhóm cần kiểm vé"), h("span", { class: "hint" }, "Vé đã đặt riêng không đổi theo nhóm.")),
            kv.congTacNhom(n.ma, n.ten, n.caNhomCan),
          ),
      ...n.dichVu.map(dongVe),
    ) as HTMLDetailsElement;
    the.addEventListener("toggle", () => (the.open ? nhomMo.add(khoa) : nhomMo.delete(khoa)));
    return the;
  };

  try {
    const [, ds] = await Promise.all([kv.tai(), api<Api.CatalogQuanLyBanResponse>("/api/catalog/quan-ly-ban")]);
    dm = ds;
    const oTim = h("input", { type: "search", class: "o", id: "kv-tim", placeholder: "Ví dụ: buffet" }) as HTMLInputElement;
    oTim.addEventListener("input", () => {
      tuKhoa = oTim.value;
      veDs();
    });
    replaceChildren(noiDungEl, h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "kv-tim" }, "Tìm vé"), oTim), dsEl);
    veDs();
    noiDungEl.hidden = false;
  } catch (err) {
    showError(errorEl, lyDo(err));
  }
}
