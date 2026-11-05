// Công tắc «Có vé» của màn Dịch vụ & giá (ADR-0174 Đ4), cạnh «Cần kiểm vé». Gọi GET, POST /api/catalog/co-ve { pham, ma, coVe }.
// Ẩn/hiện hỏi `can()`; máy chủ kiểm lại. Luật xét ở src/shared/co-ve.ts (máy chủ tính sẵn `nguon`). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h } from "./dom";
import { showError } from "./shell";
import { hienBaoNgan } from "./toast";

const URL_CO_VE = "/api/catalog/co-ve";
const NHAN_NGUON = { SERVICE: "Đặt riêng", GROUP: "Theo nhóm", CHUA_KHAI: "Chưa đặt" } as const;

export interface CoVe {
  tai(): Promise<void>;
  /** Ô của một dòng dịch vụ; không có quyền thì null. */
  oDichVu(ma: string, ten: string): HTMLElement | null;
  /** Công tắc cả nhóm, có hộp hỏi lại; không có quyền thì null. */
  oNhom(ma: string, ten: string): HTMLElement | null;
}

export function taoCoVe(errorEl: HTMLElement, coQuyen: boolean, sauKhiDoi: () => void): CoVe {
  let duLieu: Api.CatalogCoVeResponse = { dichVu: [], nhom: [] };

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
  const congTac = (nhan: string, bat: boolean, action: string, khiBam: (nut: HTMLButtonElement) => void): HTMLButtonElement => {
    const nut = h("button", { type: "button", role: "switch", class: "dp-switch", "aria-checked": String(bat), "aria-label": nhan, "data-action": action }, h("span", { class: "dp-switch-knob", "aria-hidden": "true" })) as HTMLButtonElement;
    nut.addEventListener("click", () => khiBam(nut));
    return nut;
  };

  return {
    tai: async () => {
      if (coQuyen) duLieu = await api<Api.CatalogCoVeResponse>(URL_CO_VE);
    },
    oDichVu: (ma, ten) => {
      if (!coQuyen) return null;
      const d = duLieu.dichVu.find((x) => x.code === ma);
      const bat = d?.coVe === true;
      return h(
        "div",
        { class: "kv-o" },
        h("span", { class: "hint" }, `Có vé · ${NHAN_NGUON[d?.nguon ?? "CHUA_KHAI"]}`),
        congTac(`Có vé: ${ten}`, bat, "co-ve", (nut) => void luuCoVe(nut, { pham: "SERVICE", ma, coVe: !bat }, bat ? `${ten}: không vé.` : `${ten}: có vé.`)),
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
  };
}
