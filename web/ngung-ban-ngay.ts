// «Ngừng bán theo ngày» (ADR-0220 Đ5): nút và nhãn ở dòng dịch vụ và ở nhóm của màn Dịch vụ & giá (cả màn hẹp của Quản lý bán hàng), bảng trượt đặt / kết thúc khoảng.
//   GET  /api/catalog/ngung-ban-ngay            → khoảng còn chặn
//   POST /api/catalog/ngung-ban-ngay            → đặt một khoảng (trả kèm số đơn đã xác nhận trong khoảng)
//   POST /api/catalog/ngung-ban-ngay/:id/ket-thuc
// Giao diện chỉ ẩn / hiện theo ô `catalog.hidden.write`; máy chủ kiểm lại. Khoảng đã đặt không sửa được: kết thúc rồi đặt khoảng mới.
import { ApiError, api, type Api } from "./api";
import { h } from "./dom";
import { icon } from "./icons";
import { moBangTruot } from "./bang-truot";
import { hienBaoNgan } from "./toast";
import { ngayDayDu, ngayNgan, vnToday } from "../src/shared/vn-date";

type Khoang = Api.CatalogNgungBanNgayDto;
export interface NgungBanNgay {
  /** Tải khoảng còn chặn; lỗi thì ném (nơi gọi hiện lỗi). */
  tai(): Promise<void>;
  /** Nhãn «Ngừng bán dd/mm – dd/mm» của một dịch vụ: khoảng đặt riêng cho mã và khoảng của nhóm hiện hành. Không có thì mảng rỗng. */
  nhanDichVu(ma: string, maNhom: string | null): HTMLElement[];
  nhanNhom(maNhom: string): HTMLElement[];
  /** Nút «Ngừng bán theo ngày» mở bảng trượt cho một dịch vụ hoặc một nhóm. */
  nut(phamVi: Khoang["phamVi"], ma: string, ten: string, lop: string): HTMLButtonElement;
}

const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ. Hãy thử lại.");
const khoangChu = (k: { tuNgay: string; denNgay: string }, homNay: string): string => (k.tuNgay === k.denNgay ? ngayNgan(k.tuNgay, homNay) : `${ngayNgan(k.tuNgay, homNay)}\u00a0–\u00a0${ngayNgan(k.denNgay, homNay)}`); // khoảng ngày không gãy giữa chừng khi cột hẹp

export function taoNgungBanNgay(duoc: boolean, sauKhiDoi: () => void): NgungBanNgay {
  let ds: Khoang[] = [];
  const homNay = (): string => vnToday(new Date());
  const cua = (phamVi: Khoang["phamVi"], ma: string): Khoang[] => ds.filter((k) => k.phamVi === phamVi && k.ma === ma);
  const nhan = (k: Khoang, theoNhom: boolean): HTMLElement =>
    h("span", { class: "huy-hieu", "data-tong": "xam", "data-ngung-ngay": k.id, title: k.ghiChu ?? "" }, icon("ban", 14), `Ngừng bán ${khoangChu(k, homNay())}${theoNhom ? " (theo nhóm)" : ""}`);

  function mo(phamVi: Khoang["phamVi"], ma: string, ten: string, opener: HTMLButtonElement): void {
    const hn = homNay();
    const loi = h("div", { class: "alert", role: "alert", hidden: true });
    const tuNgay = h("input", { type: "date", class: "o", id: "nbn-tu", min: hn, value: hn, required: true }) as HTMLInputElement;
    const denNgay = h("input", { type: "date", class: "o", id: "nbn-den", min: hn, value: hn, required: true }) as HTMLInputElement;
    const ghiChu = h("input", { type: "text", class: "o", id: "nbn-ghi-chu", maxlength: 200, placeholder: "Ví dụ: tàu bảo dưỡng" }) as HTMLInputElement;
    const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "ngung-ban-ngay-luu" }, "Ngừng bán theo ngày") as HTMLButtonElement;
    const dangCo = h("ul", { class: "nbn-ds" });
    const bao = (cau: string): void => {
      loi.textContent = cau;
      loi.hidden = false;
    };
    const veDangCo = (): void => {
      const cuaToi = cua(phamVi, ma);
      dangCo.replaceChildren(
        ...(cuaToi.length === 0
          ? [h("li", { class: "muted" }, "Chưa có khoảng ngừng bán nào.")]
          : cuaToi.map((k) => {
              const nutKt = h("button", { type: "button", class: "btn btn-link danger", "data-action": "ngung-ban-ngay-ket-thuc" }, "Kết thúc") as HTMLButtonElement;
              nutKt.addEventListener("click", async () => {
                loi.hidden = true;
                nutKt.disabled = true;
                try {
                  await api(`/api/catalog/ngung-ban-ngay/${encodeURIComponent(k.id)}/ket-thuc`, { method: "POST", body: {} });
                  ds = ds.filter((x) => x.id !== k.id);
                  hienBaoNgan(`${ten}: bán lại cho ${khoangChu(k, hn)}.`);
                  veDangCo();
                  sauKhiDoi();
                } catch (err) {
                  bao(lyDo(err));
                  nutKt.disabled = false;
                }
              });
              return h("li", { "data-khoang": k.id }, h("span", null, `${ngayDayDu(k.tuNgay)} – ${ngayDayDu(k.denNgay)}${k.ghiChu ? ` · ${k.ghiChu}` : ""}`), " ", nutKt);
            })),
      );
    };
    veDangCo();
    const bang = moBangTruot({
      title: `Ngừng bán theo ngày: ${ten}`,
      opener,
      body: [
        h("p", { class: "muted" }, phamVi === "GROUP"
          ? "Mọi dịch vụ đang thuộc nhóm này không lập được đơn có ngày khởi hành trong khoảng. Các ngày khác vẫn bán. Đơn đã xác nhận giữ nguyên."
          : "Dịch vụ này không lập được đơn có ngày khởi hành trong khoảng. Các ngày khác vẫn bán. Đơn đã xác nhận giữ nguyên."),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "nbn-tu" }, "Từ ngày"), tuNgay),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "nbn-den" }, "Đến hết ngày"), denNgay),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "nbn-ghi-chu" }, "Ghi chú (không bắt buộc)"), ghiChu),
        loi,
        h("h3", null, "Khoảng đang ngừng bán"),
        dangCo,
        h("p", { class: "muted" }, "Khoảng đã đặt không sửa được. Đặt nhầm thì bấm Kết thúc rồi đặt khoảng mới."),
      ],
      foot: [luu],
    });
    if (!bang) return;
    tuNgay.addEventListener("change", () => {
      denNgay.min = tuNgay.value || hn;
      if (denNgay.value < tuNgay.value) denNgay.value = tuNgay.value;
    });
    luu.addEventListener("click", async () => {
      loi.hidden = true;
      if (!tuNgay.value || !denNgay.value) return bao("Chọn ngày đầu và ngày cuối.");
      luu.disabled = true;
      bang.setBusy(true);
      try {
        const r = await api<Api.CatalogNgungBanNgayResponse>("/api/catalog/ngung-ban-ngay", {
          method: "POST",
          body: { phamVi, ma, tuNgay: tuNgay.value, denNgay: denNgay.value, ghiChu: ghiChu.value } satisfies Api.CatalogNgungBanNgayInput,
        });
        ds = [...ds, r.khoang];
        bang.setBusy(false);
        bang.close(false);
        const coDon = (r.soDonDaXacNhan ?? 0) > 0;
        hienBaoNgan(`${ten}: ngừng bán ${khoangChu(r.khoang, hn)}.${coDon ? ` Đang có ${r.soDonDaXacNhan} đơn đã xác nhận trong khoảng này.` : ""}`, coDon ? { tong: "cat" } : {});
        sauKhiDoi();
      } catch (err) {
        bang.setBusy(false);
        bao(lyDo(err));
        luu.disabled = false;
      }
    });
  }

  return {
    async tai() {
      if (!duoc) return;
      ds = (await api<Api.CatalogNgungBanNgayListResponse>("/api/catalog/ngung-ban-ngay")).khoang;
    },
    nhanDichVu: (ma, maNhom) => [...cua("SERVICE", ma).map((k) => nhan(k, false)), ...(maNhom === null ? [] : cua("GROUP", maNhom).map((k) => nhan(k, true)))],
    nhanNhom: (maNhom) => cua("GROUP", maNhom).map((k) => nhan(k, false)),
    nut(phamVi, ma, ten, lop) {
      const b = h("button", { type: "button", class: lop, "data-action": "ngung-ban-ngay", hidden: !duoc, "aria-label": `Ngừng bán theo ngày: ${ten}` }, "Ngừng bán theo ngày") as HTMLButtonElement;
      b.addEventListener("click", () => mo(phamVi, ma, ten, b));
      return b;
    },
  };
}
