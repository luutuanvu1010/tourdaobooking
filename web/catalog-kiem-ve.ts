// Công tắc «Cần kiểm vé» của màn Dịch vụ & giá (ADR-0169 Đ4, thay trang riêng của ADR-0136 Đ1, Đ5). Gọi:
//   GET  /api/cai-dat/xac-nhan-don → cờ theo dịch vụ / nhóm + công tắc tự kiểm;
//   POST /api/cai-dat/xac-nhan-don { pham, ma, canXacNhan } | { tuXacNhanNoiBo };
//   GET  /api/catalog/quan-ly-ban, PUT /api/catalog/:code/ngung-ban → màn hẹp của Quản lý bán hàng;
//   POST /api/catalog/sync → «Đồng bộ ngay từ Google Sheet» (ADR-0186 Đ5), một hàm cho cả màn của Quản trị và màn hẹp.
// Ẩn/hiện hỏi `can()`; máy chủ kiểm lại. Luật ở src/shared/dich-vu-kiem-ve.ts. Không innerHTML.
import { TEN_CHUA_PHAN_LOAI, cauHoiNgungBan, demKiemVe, locNhomKiemVe, moSanNhomKiemVe, nhanNguonKiemVe, xepNhomKiemVe, type DongDichVuKiemVe, type NhomKiemVe } from "../src/shared/dich-vu-kiem-ve";
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
  /** Khối một vé: chữ nhìn thấy «Cần kiểm vé» + chữ nguồn (`nhanNguon`) cạnh công tắc; tên công tắc đọc từ hai chữ đó (aria-labelledby) kèm tên vé ẩn. */
  oKiemVe(ma: string, ten: string, can: boolean, nhanNguon: string): HTMLElement;
  /** Công tắc cả nhóm, có hộp hỏi lại. */
  congTacNhom(ma: string, ten: string, can: boolean): HTMLButtonElement;
  /** Khối công tắc tự kiểm vé (chỉ Toàn quyền vẽ). */
  khoiTuKiem(): HTMLElement;
}

let demNhan = 0;

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
    oKiemVe: (ma, ten, can, nhanNguon) => {
      const id = `kv-nhan-${++demNhan}`;
      const nut = congTac("", can, { "data-action": "kiem-ve" }, (n) => void luu(n, { pham: "SERVICE", ma, canXacNhan: !can }, can ? `${ten}: không cần kiểm vé.` : `${ten}: cần kiểm vé.`));
      nut.removeAttribute("aria-label");
      nut.setAttribute("aria-labelledby", `${id}-ten ${id}-nhan ${id}-nguon`);
      return h(
        "div",
        { class: "kv-o" },
        h("div", { class: "kv-chu" }, h("span", { class: "visually-hidden", id: `${id}-ten` }, ten), h("span", { class: "kv-ten", id: `${id}-nhan` }, "Cần kiểm vé"), h("span", { class: "hint", id: `${id}-nguon` }, nhanNguon)),
        nut,
      );
    },
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

/**
 * «Đồng bộ ngay từ Google Sheet» (ADR-0186 Đ5): MỘT hàm cho màn của Quản trị và màn hẹp của Quản lý bán hàng — cùng câu báo kết quả, cùng hộp hỏi của trình
 * duyệt khi máy chủ dừng vì Sheet sắp làm ẩn nhiều dịch vụ (`sync_guard`). Máy chủ hỏi ô `catalog.sync`; trang chỉ vẽ nút khi `can(staff, "catalog.sync")`.
 */
export async function dongBoTuSheet(o: { nut: HTMLButtonElement; thongBaoEl: HTMLElement; errorEl: HTMLElement; sauKhi: () => Promise<void>; force?: boolean }): Promise<void> {
  o.nut.disabled = true;
  o.thongBaoEl.hidden = true;
  showError(o.errorEl, null);
  try {
    const r = await api<Api.CatalogSyncResponse>("/api/catalog/sync", { method: "POST", body: { force: o.force === true } });
    o.thongBaoEl.textContent = `Đã đồng bộ xong: thêm ${r.added}, đổi ${r.changed}, ẩn ${r.hidden}, giữ nguyên ${r.unchanged}.${r.problems.length ? ` ${r.problems.length} dòng bị bỏ qua.` : ""}${r.warnings.length ? ` Cảnh báo: ${r.warnings.map((w) => w.message).join("; ")}.` : ""}`;
    o.thongBaoEl.hidden = false;
  } catch (err) {
    if (err instanceof ApiError && err.code === "sync_guard" && (await hoiXacNhan({ tieuDe: "Đồng bộ ngay từ Google Sheet", hauQua: `${err.message}\n\nChỉ tiếp tục nếu bạn chắc chắn Sheet đúng. Vẫn đồng bộ và ẩn các dịch vụ đó?`, nhanNguyHiem: "Vẫn đồng bộ", opener: o.nut }))) {
      o.nut.disabled = false;
      return dongBoTuSheet({ ...o, force: true });
    }
    showError(o.errorEl, lyDo(err));
  }
  o.nut.disabled = false;
  await o.sauKhi();
}

/**
 * Màn hẹp của Quản lý bán hàng (ADR-0169 Đ4): tên vé theo nhóm, ô tìm, công tắc kiểm vé, Ngừng bán / Mở bán lại. Không giá, không sửa nhóm.
 * `thongBaoEl` khác null (người xem giữ ô `catalog.sync`) ⇒ có thêm nút «Đồng bộ ngay từ Google Sheet» ở đầu màn (ADR-0186 Đ5, lời chủ 8/11).
 */
export async function veManHep(noiDungEl: HTMLElement, errorEl: HTMLElement, thongBaoEl: HTMLElement | null): Promise<void> {
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
    replaceChildren(dsEl, ...ds.map((n) => theNhom(n, moSanNhomKiemVe(ds, n, tuKhoa.trim() !== ""))));
  };
  const kv = taoKiemVe(errorEl, veDs);

  const doiBan = async (d: DongDichVuKiemVe, nut: HTMLButtonElement): Promise<void> => {
    if (d.dangBan && !(await hoiXacNhan({ ...cauHoiNgungBan(d.ten), opener: nut }))) return;
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
      { class: d.dangBan ? "kv-dong kv-dong-ve" : "kv-dong kv-dong-ve row-off", "data-ma": d.ma },
      h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, d.ten), !d.dangBan && h("span", { class: "badge badge-cancelled" }, "Đã ngừng bán")),
      nutBan,
      kv.oKiemVe(d.ma, d.ten, d.can, nhanNguonKiemVe(d)),
    );
  };

  const theNhom = (n: NhomKiemVe, moSan: boolean): HTMLElement => {
    const khoa = n.ma ?? TEN_CHUA_PHAN_LOAI;
    const the = h(
      "details",
      { class: "card kv-nhom", "data-nhom": khoa, open: moSan || nhomMo.has(khoa) },
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

  const khoiDongBo = (): HTMLElement | null => {
    if (!thongBaoEl) return null;
    const nut = h("button", { type: "button", class: "btn btn-primary", "data-action": "dong-bo" }, "Đồng bộ ngay từ Google Sheet") as HTMLButtonElement;
    const taiLai = async (): Promise<void> => {
      try {
        dm = await api<Api.CatalogQuanLyBanResponse>("/api/catalog/quan-ly-ban");
        veDs();
      } catch (err) {
        showError(errorEl, lyDo(err));
      }
    };
    nut.addEventListener("click", () => void dongBoTuSheet({ nut, thongBaoEl, errorEl, sauKhi: taiLai }));
    return h("section", { class: "card" }, h("p", { class: "hint" }, "Nguồn chính là Google Sheet. Nền tảng tự đồng bộ mỗi 15 phút; cần lấy giá mới ngay thì bấm nút dưới."), nut);
  };

  try {
    const [, ds] = await Promise.all([kv.tai(), api<Api.CatalogQuanLyBanResponse>("/api/catalog/quan-ly-ban")]);
    dm = ds;
    const oTim = h("input", { type: "search", class: "o", id: "kv-tim", placeholder: "Ví dụ: buffet" }) as HTMLInputElement;
    oTim.addEventListener("input", () => {
      tuKhoa = oTim.value;
      veDs();
    });
    replaceChildren(noiDungEl, khoiDongBo(), h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "kv-tim" }, "Tìm vé"), oTim), dsEl);
    veDs();
    noiDungEl.hidden = false;
  } catch (err) {
    showError(errorEl, lyDo(err));
  }
}
