// Dấu «Trả sau theo dịch vụ» ở màn Dịch vụ & giá (ADR-0178 Đ2 mục 1, Đ3; ADR-0230 Đ1 mục 1), cạnh «Có vé» / «Vé do ai phát» (`web/catalog-co-ve.ts`).
//   GET  /api/tra-sau/dich-vu      → dấu đang mở (ô `credit.service_rule.view`: Toàn quyền, Kế toán, Quản trị)
//   POST /api/tra-sau/dich-vu      { targetKind, targetCode, gioTra, gioAnHan } → đặt / đổi số giờ (ô `credit.service_rule.write`: chỉ Toàn quyền)
//   POST /api/tra-sau/dich-vu/go   { targetKind, targetCode } → gỡ (404 khi không còn dấu, 409 `stale`)
// Giao diện chỉ ẩn/hiện theo `can()`; máy chủ kiểm lại. Không có ô xem thì không gọi GET, không hiện gì. Câu tóm tắt và cách tra dấu ở src/shared/tra-sau-dich-vu-hien-thi.ts.
// Đặt dấu lần đầu (kể cả đặt riêng cho dịch vụ đang theo nhóm) hỏi lại bằng hộp nói hậu quả; đổi số giờ của dấu đã có thì lưu thẳng. Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan, moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { icon } from "./icons";
import { showError } from "./shell";
import { hienBaoNgan } from "./toast";
import { cauDauTraSau, dauHieuLucCuaDichVu, docOGio, hauQuaDatDau } from "../src/shared/tra-sau-dich-vu-hien-thi";

const URL_DAU = "/api/tra-sau/dich-vu";
const URL_GO = "/api/tra-sau/dich-vu/go";
const TEN = "Trả sau theo dịch vụ";
type Loai = Api.DauTraSauDichVuDto["targetKind"];
type Dau = Api.DauTraSauDichVuDto;

export interface TraSauDichVu {
  /** Tải dấu đang mở; không có ô xem thì không gọi. Lỗi thì hiện ở `errorEl`, trang vẫn dùng được. */
  tai(): Promise<void>;
  /** Huy hiệu dấu (riêng hoặc «theo nhóm») và cảnh báo của máy chủ cho một dịch vụ; không có dấu / không có ô xem thì mảng rỗng. */
  nhanDichVu(ma: string, maNhom: string | null): HTMLElement[];
  /** Huy hiệu dấu và cảnh báo của một nhóm. */
  nhanNhom(maNhom: string): HTMLElement[];
  /** Nút mở hộp đặt / sửa / gỡ; không có ô ghi thì null. */
  nut(loai: Loai, ma: string, ten: string, lop: string): HTMLButtonElement | null;
}

const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ. Hãy thử lại.");

export function taoTraSauDichVu(errorEl: HTMLElement, duocXem: boolean, duocSua: boolean, sauKhiDoi: () => void): TraSauDichVu {
  let ds: Dau[] = [];
  const cua = (loai: Loai, ma: string): Dau | undefined => ds.find((x) => x.targetKind === loai && x.targetCode === ma);

  const huyHieu = (d: Dau, theoNhom: boolean): HTMLElement[] => [
    h("span", { class: "huy-hieu", "data-tong": "bien", "data-tra-sau-dv": `${d.targetKind}:${d.targetCode}` }, icon("clock", 14), cauDauTraSau(d, theoNhom)),
    // cảnh báo chỉ hiện ở chỗ đặt dấu (máy chủ tính theo đích của dấu)
    !theoNhom && d.canhBao !== null ? h("span", { class: "huy-hieu", "data-tong": "cat", "data-tra-sau-dv-canh-bao": "" }, icon("alertCircle", 14), d.canhBao) : null,
  ].filter((x): x is HTMLElement => x !== null);

  const baoLoiTrang = (err: unknown): void => {
    showError(errorEl, lyDo(err));
    errorEl.scrollIntoView({ block: "nearest" });
  };
  /** 404 / 409: dấu đã đổi ở nơi khác — tải lại để màn khớp máy chủ. */
  const taiLaiNeuLech = async (err: unknown): Promise<void> => {
    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 409)) return;
    try {
      ds = (await api<Api.DauTraSauDichVuResponse>(URL_DAU)).dau;
      sauKhiDoi();
    } catch {
      /* giữ câu lỗi đầu */
    }
  };
  const gui = async (url: string, than: Record<string, unknown>): Promise<void> => {
    ds = (await api<Api.DauTraSauDichVuResponse>(url, { method: "POST", body: than })).dau;
  };

  async function go(loai: Loai, ma: string, ten: string, opener: HTMLButtonElement): Promise<void> {
    const dongY = await hoiXacNhan({
      tieuDe: `Gỡ ${TEN} của «${ten}»?`,
      hauQua: loai === "GROUP"
        ? "Đơn mới của đối tác có dịch vụ trong nhóm này (trừ dịch vụ đã đặt riêng) không còn được trả sau không cần hạn mức. Đơn đã xác nhận giữ nguyên hạn trả cũ."
        : "Đơn mới của đối tác có dịch vụ này không còn được trả sau không cần hạn mức (trừ khi nhóm của dịch vụ có dấu). Đơn đã xác nhận giữ nguyên hạn trả cũ.",
      nhanNguyHiem: "Gỡ Trả sau theo dịch vụ",
      opener,
    });
    if (!dongY) return;
    errorEl.hidden = true;
    try {
      await gui(URL_GO, { targetKind: loai, targetCode: ma });
      hienBaoNgan(`${ten}: đã gỡ ${TEN}.`);
      sauKhiDoi();
    } catch (err) {
      baoLoiTrang(err);
      await taiLaiNeuLech(err);
    }
  }

  function mo(loai: Loai, ma: string, ten: string, opener: HTMLButtonElement): void {
    const dang = cua(loai, ma);
    const loi = h("div", { class: "alert", role: "alert", hidden: true });
    const oSo = (id: string, giaTri: number | undefined): HTMLInputElement =>
      h("input", { type: "text", inputmode: "numeric", pattern: "[0-9]*", class: "o", id, maxlength: 4, autocomplete: "off", value: giaTri === undefined ? "" : String(giaTri) }) as HTMLInputElement;
    const oTra = oSo("tsdv-tra", dang?.gioTra);
    const oAnHan = oSo("tsdv-an-han", dang?.gioAnHan ?? 0);
    const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-action": "tra-sau-dv-luu" }, "Lưu Trả sau theo dịch vụ") as HTMLButtonElement;
    const nutGo = dang ? (h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "tra-sau-dv-go" }, "Gỡ Trả sau theo dịch vụ") as HTMLButtonElement) : null;
    const bao = (cau: string): void => {
      loi.textContent = cau;
      loi.hidden = false;
    };
    const bang = moBangTruot({
      title: `${TEN}: ${ten}`,
      opener,
      body: [
        h("p", { class: "muted" }, loai === "GROUP"
          ? "Đơn đối tác mà mọi vé đều là vé Tour Đảo của nhóm này được trả sau không cần hạn mức, vé hiện ngay. Áp cả cho dịch vụ thêm vào nhóm sau này. Không có trần số tiền."
          : "Đơn đối tác mà mọi vé đều là vé Tour Đảo có dấu được trả sau không cần hạn mức, vé hiện ngay. Đặt riêng ở dịch vụ thì thắng dấu của nhóm. Không có trần số tiền."),
        dang?.canhBao ? h("p", { class: "alert warn" }, dang.canhBao) : null,
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "tsdv-tra" }, "Thời hạn trả (giờ, tính từ lúc xác nhận)"), oTra),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "tsdv-an-han" }, "Ân hạn (giờ, 0 = không ân hạn)"), oAnHan),
        loi,
      ],
      foot: nutGo ? [nutGo, luu] : [luu],
    });
    if (!bang) return;
    nutGo?.addEventListener("click", () => {
      bang.close(false);
      void go(loai, ma, ten, opener);
    });
    luu.addEventListener("click", async () => {
      loi.hidden = true;
      const tra = docOGio(oTra.value, 1, "Thời hạn trả");
      if ("loi" in tra) return bao(tra.loi);
      const anHan = docOGio(oAnHan.value, 0, "Ân hạn");
      if ("loi" in anHan) return bao(anHan.loi);
      const than = { targetKind: loai, targetCode: ma, gioTra: tra.gio, gioAnHan: anHan.gio };
      const cauXong = `${ten}: ${cauDauTraSau(than, false)}.`;
      if (!dang) {
        // Đặt lần đầu: đóng hộp số giờ rồi hỏi lại bằng hộp hậu quả (không mở hai bảng chồng nhau); lỗi máy chủ hiện ở đầu trang.
        bang.close(false);
        const dongY = await hoiXacNhan({ tieuDe: `Đặt ${TEN} cho «${ten}»?`, hauQua: hauQuaDatDau(loai, than), nhanNguyHiem: "Đặt Trả sau theo dịch vụ", opener });
        if (!dongY) return;
        errorEl.hidden = true;
        try {
          await gui(URL_DAU, than);
          hienBaoNgan(cauXong);
          sauKhiDoi();
        } catch (err) {
          baoLoiTrang(err);
          await taiLaiNeuLech(err);
        }
        return;
      }
      luu.disabled = true;
      bang.setBusy(true);
      try {
        await gui(URL_DAU, than);
        bang.setBusy(false);
        bang.close(false);
        hienBaoNgan(cauXong);
        sauKhiDoi();
      } catch (err) {
        bang.setBusy(false);
        bao(lyDo(err));
        luu.disabled = false;
        await taiLaiNeuLech(err);
      }
    });
  }

  return {
    async tai() {
      if (!duocXem) return;
      try {
        ds = (await api<Api.DauTraSauDichVuResponse>(URL_DAU)).dau;
      } catch (err) {
        showError(errorEl, `Chưa tải được ${TEN}: ${lyDo(err)}`);
      }
    },
    nhanDichVu: (ma, maNhom) => {
      const x = dauHieuLucCuaDichVu(ma, maNhom, ds);
      return x ? huyHieu(x.dau, x.theoNhom) : [];
    },
    nhanNhom: (maNhom) => {
      const d = cua("GROUP", maNhom);
      return d ? huyHieu(d, false) : [];
    },
    nut(loai, ma, ten, lop) {
      if (!duocSua) return null;
      const b = h("button", { type: "button", class: lop, "data-action": "tra-sau-dv", "aria-label": `${TEN}: ${ten}` }, "Trả sau theo dịch vụ") as HTMLButtonElement;
      b.addEventListener("click", () => mo(loai, ma, ten, b));
      return b;
    },
  };
}
