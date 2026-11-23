// Công tắc «Có vé» của màn Dịch vụ & giá (ADR-0174 Đ4), cạnh «Cần kiểm vé». Gọi GET, POST /api/catalog/co-ve { pham, ma, coVe }.
// Ẩn/hiện hỏi `can()`; máy chủ kiểm lại. Luật xét ở src/shared/co-ve.ts (máy chủ tính sẵn `nguon`). Không innerHTML.
// Ô «Vé do ai phát» (ADR-0175 Đ1.2; theo nhóm ADR-0230 Đ3): GET, POST /api/catalog/nguon-ve { ma, nguon } hoặc { nhom, nguon }, cùng ô quyền. Ở dịch vụ chỉ hiện dưới
// dịch vụ đang «Có vé» (kèm «Đặt riêng / Theo nhóm / Chưa đặt»); ở nhóm luôn hiện, vì dịch vụ đặt riêng «Có vé» trong nhóm vẫn theo ô này của nhóm.
// Ô «Hotline trên vé» (ADR-0231): GET, POST /api/catalog/so-ho-tro { ma, so }, cùng ô quyền; chỉ hiện dưới dịch vụ đang «Vé Tour Đảo». Trống = vé in hotline công ty.
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h } from "./dom";
import { showError } from "./shell";
import { hienBaoNgan } from "./toast";
import { chuanHoaSoHoTro, inSoHoTro } from "../src/shared/so-ho-tro";

const URL_CO_VE = "/api/catalog/co-ve";
const URL_NGUON_VE = "/api/catalog/nguon-ve";
const URL_SO_HO_TRO = "/api/catalog/so-ho-tro";
const NHAN_NGUON_VE = { HANG_NGOAI: "Vé hãng ngoài", TOUR_DAO: "Vé Tour Đảo" } as const;
const NHAN_NGUON = { SERVICE: "Đặt riêng", GROUP: "Theo nhóm", CHUA_KHAI: "Chưa đặt" } as const;

export interface CoVe {
  tai(): Promise<void>;
  /** Ô của một dòng dịch vụ; không có quyền thì null. */
  oDichVu(ma: string, ten: string): HTMLElement | null;
  /** Công tắc cả nhóm, có hộp hỏi lại; không có quyền thì null. */
  oNhom(ma: string, ten: string): HTMLElement | null;
  /** ADR-0230 Đ3: «Vé do ai phát» của cả nhóm; không có quyền thì null. */
  oNguonVeNhom(ma: string, ten: string): HTMLElement | null;
}

export function taoCoVe(errorEl: HTMLElement, coQuyen: boolean, sauKhiDoi: () => void): CoVe {
  let duLieu: Api.CatalogCoVeResponse = { dichVu: [], nhom: [] };
  let nguonVe: Api.CatalogNguonVeResponse = { dichVu: [], nhom: [] };
  let soHoTro: Api.CatalogSoHoTroResponse = { dichVu: [] };
  let demO = 0; // mỗi lần dựng ô một id riêng: cùng dịch vụ được dựng hai lần (bảng và danh sách thẻ), id trùng làm nhãn gắn nhầm ô ẩn (người chấm giao diện M3, 22/11/2026)

  const luuCoVe = async (nut: HTMLButtonElement, than: Api.CatalogCoVeInput, cauBao: string): Promise<void> => {
    errorEl.hidden = true;
    nut.disabled = true;
    try {
      duLieu = await api<Api.CatalogCoVeResponse>(URL_CO_VE, { method: "POST", body: than });
      hienBaoNgan(cauBao);
      sauKhiDoi();
    } catch (err) {
      showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      errorEl.scrollIntoView({ block: "nearest" });
      nut.disabled = false;
    }
  };
  const luuNguonVe = async (nut: HTMLButtonElement, than: Api.CatalogNguonVeInput, cauBao: string): Promise<void> => {
    errorEl.hidden = true;
    nut.disabled = true;
    try {
      nguonVe = await api<Api.CatalogNguonVeResponse>(URL_NGUON_VE, { method: "POST", body: than });
      hienBaoNgan(cauBao);
      sauKhiDoi();
    } catch (err) {
      showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      errorEl.scrollIntoView({ block: "nearest" });
      nut.disabled = false;
    }
  };
  /** Ô «Hotline trên vé» của một dịch vụ vé Tour Đảo: gõ số rồi bấm «Lưu hotline»; để trống rồi lưu = dùng hotline công ty. Lô vé đã tạo không đổi. */
  const oHotline = (ma: string, ten: string): HTMLElement => {
    const dang = soHoTro.dichVu.find((x) => x.ma === ma)?.so ?? null;
    const id = `kv-hotline-${++demO}`;
    const o = h("input", { type: "tel", class: "o", id, inputMode: "tel", autocomplete: "off", maxLength: 20, value: dang ? inSoHoTro(dang) : "", placeholder: "Trống = hotline công ty" }) as HTMLInputElement;
    const nut = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "luu-hotline-ve" }, "Lưu hotline") as HTMLButtonElement;
    nut.addEventListener("click", async () => {
      errorEl.hidden = true;
      const go = o.value.trim();
      if (go !== "") {
        const c = chuanHoaSoHoTro(go);
        if (!c.ok) { showError(errorEl, c.cau); errorEl.scrollIntoView({ block: "nearest" }); o.focus(); return; }
      }
      nut.disabled = true;
      try {
        soHoTro = await api<Api.CatalogSoHoTroResponse>(URL_SO_HO_TRO, { method: "POST", body: { ma, so: go === "" ? null : go } satisfies Api.CatalogSoHoTroInput });
        hienBaoNgan(go === "" ? `${ten}: vé in hotline công ty.` : `${ten}: đã lưu hotline trên vé.`);
        sauKhiDoi();
      } catch (err) {
        showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
        errorEl.scrollIntoView({ block: "nearest" });
        nut.disabled = false;
      }
    });
    // Dùng lại khối của «Vé do ai phát» và cùng khuôn nhãn (.kv-ten + chữ phụ) với ba nhãn vé kia: không thêm luật bố cục riêng (ADR-0222 Đ7a).
    // Chữ phụ để aria-hidden: tên ô cho trình đọc màn hình vẫn là «Hotline trên vé».
    return h(
      "div",
      { class: "kv-nguon-ve" },
      h("label", { class: "kv-chu", for: id }, h("span", { class: "kv-ten" }, "Hotline trên vé"), h("span", { class: "hint", "aria-hidden": "true" }, dang ? NHAN_NGUON.SERVICE : "Hotline công ty")),
      o,
      nut,
    );
  };
  /**
   * Hai lựa chọn «Vé hãng ngoài» / «Vé Tour Đảo» (radiogroup, phím ← → dời tiêu điểm) của một dịch vụ hoặc một nhóm. `dang` = giá trị đang hiệu lực.
   * Chọn «Vé Tour Đảo» đổi cách máy giữ vé, nên phải hỏi trước (rà soát độc lập Đợt 1, 9/11/2026); chọn «Vé hãng ngoài» không hỏi.
   */
  const chonNguonVe = (dang: Api.CatalogNguonVeInput["nguon"], action: string, khiChon: (nut: HTMLButtonElement, v: Api.CatalogNguonVeInput["nguon"]) => void, hoiTourDao: { tieuDe: string; hauQua: string }): HTMLElement[] => {
    const lua = (["HANG_NGOAI", "TOUR_DAO"] as const).map((v) => {
      const nut = h("button", { type: "button", role: "radio", "aria-checked": String(dang === v), tabindex: dang === v ? 0 : -1, "data-action": action }, NHAN_NGUON_VE[v]) as HTMLButtonElement;
      nut.addEventListener("click", () => {
        if (v === dang) return;
        if (v !== "TOUR_DAO") return khiChon(nut, v);
        void hoiXacNhan({ ...hoiTourDao, nhanNguyHiem: "Chuyển sang Vé Tour Đảo", opener: nut }).then((dongY) => (dongY ? khiChon(nut, v) : undefined));
      });
      nut.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const khac = lua.find((x) => x !== nut);
        khac?.focus(); // chỉ dời tiêu điểm; đổi lựa chọn phải bấm (Enter/Space), vì chọn Vé Tour Đảo có hộp xác nhận
      });
      return nut;
    });
    return lua;
  };
  /** Ô «Vé do ai phát» của một dịch vụ. Chưa đặt là vé hãng ngoài; dịch vụ chưa đặt riêng thì đi theo nhóm hiện tại. */
  const oNguonVe = (ma: string, ten: string): HTMLElement => {
    const d = nguonVe.dichVu.find((x) => x.ma === ma);
    const dang = d?.nguon ?? "HANG_NGOAI";
    const lua = chonNguonVe(dang, "nguon-ve", (nut, v) => void luuNguonVe(nut, { ma, nguon: v }, v === "TOUR_DAO" ? `${ten}: Vé Tour Đảo.` : `${ten}: Vé hãng ngoài.`), {
      tieuDe: `Chuyển «${ten}» sang Vé Tour Đảo?`,
      hauQua: "Đơn mới của dịch vụ này chỉ được giữ vé từ lô do Tour Đảo tạo, không lấy vé hãng ngoài nữa; tin thiếu vé chuyển sang Kế toán. Vé đơn đã giữ vẫn còn. Chỉ bật khi đã có lô vé Tour Đảo và đã có cách quét vé.",
    });
    return h(
      "div",
      { class: "kv-nguon-ve" },
      // ba nhãn «Cần kiểm vé», «Có vé», «Vé do ai phát» cùng một cỡ (.kv-ten), nguồn đặt ở chữ phụ bên dưới
      h("div", { class: "kv-chu", "aria-hidden": "true" }, h("span", { class: "kv-ten" }, "Vé do ai phát"), h("span", { class: "hint" }, NHAN_NGUON[d?.theo ?? "CHUA_KHAI"])),
      h("div", { class: "vc-seg", role: "radiogroup", "aria-label": `Vé do ai phát: ${ten}` }, ...lua),
    );
  };
  const congTac = (nhan: string, bat: boolean, action: string, khiBam: (nut: HTMLButtonElement) => void): HTMLButtonElement => {
    const nut = h("button", { type: "button", role: "switch", class: "dp-switch", "aria-checked": String(bat), "aria-label": nhan, "data-action": action }, h("span", { class: "dp-switch-knob", "aria-hidden": "true" })) as HTMLButtonElement;
    nut.addEventListener("click", () => khiBam(nut));
    return nut;
  };

  return {
    tai: async () => {
      if (coQuyen) [duLieu, nguonVe, soHoTro] = await Promise.all([api<Api.CatalogCoVeResponse>(URL_CO_VE), api<Api.CatalogNguonVeResponse>(URL_NGUON_VE), api<Api.CatalogSoHoTroResponse>(URL_SO_HO_TRO)]);
    },
    oDichVu: (ma, ten) => {
      if (!coQuyen) return null;
      const d = duLieu.dichVu.find((x) => x.code === ma);
      const bat = d?.coVe === true;
      return h(
        "div",
        { class: "kv-o" },
        h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, "Có vé"), h("span", { class: "hint" }, NHAN_NGUON[d?.nguon ?? "CHUA_KHAI"])),
        congTac(`Có vé: ${ten}`, bat, "co-ve", (nut) => void luuCoVe(nut, { pham: "SERVICE", ma, coVe: !bat }, bat ? `${ten}: không vé.` : `${ten}: có vé.`)),
        bat && oNguonVe(ma, ten), // ADR-0175 Đ1.2: dịch vụ «Không vé» thì ô này vô nghĩa nên ẩn
        bat && nguonVe.dichVu.find((x) => x.ma === ma)?.nguon === "TOUR_DAO" && oHotline(ma, ten), // ADR-0231: chỉ vé Tour Đảo in số lên vé
      );
    },
    oNhom: (ma, ten) => {
      if (!coQuyen) return null;
      const bat = duLieu.nhom.find((x) => x.code === ma)?.coVe === true;
      const batMoi = !bat;
      const doiCaNhomCoVe = async (nut: HTMLButtonElement): Promise<void> => {
        const dongY = await hoiXacNhan({
          tieuDe: batMoi ? `Bật «Có vé» cho cả nhóm ${ten}?` : `Tắt «Có vé» cả nhóm ${ten}?`,
          hauQua: batMoi
            ? "Đơn đã xác nhận và chưa tới ngày đi của nhóm này sẽ báo thiếu vé nếu chưa đủ vé. Dịch vụ đã đặt riêng không đổi."
            : "Máy ngừng giữ vé và ngừng báo thiếu vé cho dịch vụ của nhóm này, trừ dịch vụ đã đặt riêng. Vé đơn đã giữ vẫn còn.",
          nhanNguyHiem: batMoi ? "Bật cả nhóm" : "Tắt cả nhóm",
          opener: nut,
        });
        if (dongY) await luuCoVe(nut, { pham: "GROUP", ma, coVe: batMoi }, batMoi ? `Nhóm ${ten}: có vé.` : `Nhóm ${ten}: không vé.`);
      };
      return h(
        "div",
        { class: "nhom-dua-don" },
        h("span", { class: "nhom-so" }, "Có vé"),
        congTac(`Cả nhóm có vé: ${ten}`, bat, "co-ve-nhom", (nut) => void doiCaNhomCoVe(nut)),
        h("span", { class: "nhom-so", "aria-hidden": "true" }, bat ? "Bật" : "Tắt"),
      );
    },
    oNguonVeNhom: (ma, ten) => {
      if (!coQuyen) return null;
      const dang = nguonVe.nhom.find((x) => x.ma === ma)?.nguon ?? "HANG_NGOAI";
      const lua = chonNguonVe(dang, "nguon-ve-nhom", (nut, v) => void luuNguonVe(nut, { nhom: ma, nguon: v }, v === "TOUR_DAO" ? `Nhóm ${ten}: Vé Tour Đảo.` : `Nhóm ${ten}: Vé hãng ngoài.`), {
        tieuDe: `Chuyển cả nhóm ${ten} sang Vé Tour Đảo?`,
        hauQua: "Đơn mới của mọi dịch vụ trong nhóm này, trừ dịch vụ đã đặt riêng, chỉ được giữ vé từ lô do Tour Đảo tạo, không lấy vé hãng ngoài nữa; tin thiếu vé chuyển sang Kế toán. Dịch vụ thêm vào nhóm sau này cũng theo. Vé đơn đã giữ vẫn còn.",
      });
      return h("div", { class: "nhom-dua-don" }, h("span", { class: "nhom-so", "aria-hidden": "true" }, "Vé do ai phát"), h("div", { class: "vc-seg", role: "radiogroup", "aria-label": `Vé do ai phát của cả nhóm: ${ten}` }, ...lua));
    },
  };
}
