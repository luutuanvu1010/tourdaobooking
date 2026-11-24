// «Giá mùa vụ» (ADR-0229 Đ9): nút và nhãn ở dòng dịch vụ và ở nhóm của màn Dịch vụ & giá (cả màn hẹp của Quản lý bán hàng), bảng trượt đặt / duyệt / kết thúc
// quy tắc tăng giá theo ngày đi, và phần tóm tắt «Giá theo mùa» ở Chi tiết dịch vụ. Khuôn: web/ngung-ban-ngay.ts (ADR-0220).
//   GET  /api/catalog/gia-mua-vu                 → quy tắc chờ duyệt + đang áp dụng, trần %
//   POST /api/catalog/gia-mua-vu                 → đặt (chờ người khác duyệt)
//   POST /api/catalog/gia-mua-vu/:id/duyet | /:id/ket-thuc
//   POST /api/catalog/gia-mua-vu/tran            → mức tăng tối đa (chỉ Toàn quyền)
// Giao diện chỉ ẩn / hiện theo ô quyền (nơi gọi hỏi `can()`); máy chủ kiểm lại và báo lỗi nguyên câu tiếng Việt.
import { ApiError, api, type Api } from "./api";
import { h } from "./dom";
import { icon } from "./icons";
import { moBangTruot } from "./bang-truot";
import { hienBaoNgan } from "./toast";
import { grouped, parseMoney } from "./format";
import { chuMucTang } from "../src/shared/service-form";
import { ngayDayDu, ngayNgan, vnToday } from "../src/shared/vn-date";

type QuyTac = Api.CatalogGiaMuaVuDto;
/** Ô quyền của người xem — nơi gọi tính bằng `can()` (cùng bảng với máy chủ). */
export interface QuyenGiaMuaVu {
  /** `catalog.seasonal.write` && văn phòng && không giữ quyền Đối tác: xem, đặt, kết thúc. */
  dat: boolean;
  /** `catalog.seasonal.approve`: duyệt quy tắc người khác đặt. */
  duyet: boolean;
  /** `catalog.seasonal.cap`: mức tăng tối đa (chỉ Toàn quyền). */
  tran: boolean;
}
export interface GiaMuaVu {
  /** Tải quy tắc; không có ô `dat` thì không gọi. Lỗi thì ném (nơi gọi hiện lỗi). */
  tai(): Promise<void>;
  nhanDichVu(ma: string, maNhom: string | null): HTMLElement[];
  nhanNhom(maNhom: string): HTMLElement[];
  /** Nút «Giá mùa vụ» mở bảng trượt cho một dịch vụ hoặc một nhóm (ẩn khi thiếu ô `dat`). */
  nut(phamVi: QuyTac["phamVi"], ma: string, ten: string, lop: string): HTMLButtonElement;
  /** Mục «Giá theo mùa» của Chi tiết dịch vụ: quy tắc đang áp dụng / chờ duyệt của dịch vụ và của nhóm hiện hành; null khi thiếu ô `dat`. */
  tomTat(ma: string, maNhom: string | null): HTMLElement | null;
}

const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ. Hãy thử lại.");
const khoangChu = (q: { tuNgay: string; denNgay: string }, homNay: string): string => (q.tuNgay === q.denNgay ? ngayNgan(q.tuNgay, homNay) : `${ngayNgan(q.tuNgay, homNay)} – ${ngayNgan(q.denNgay, homNay)}`);
const mucChu = (q: QuyTac): string => chuMucTang(q, grouped);
const trangThaiChu = (q: QuyTac): string => (q.daDuyet ? "đang áp dụng" : "chờ duyệt");

export function taoGiaMuaVu(quyen: QuyenGiaMuaVu, sauKhiDoi: () => void): GiaMuaVu {
  let ds: QuyTac[] = [];
  let tranPhanTram = 0;
  const homNay = (): string => vnToday(new Date());
  const cua = (phamVi: QuyTac["phamVi"], ma: string): QuyTac[] => ds.filter((q) => q.phamVi === phamVi && q.ma === ma).sort((a, b) => a.tuNgay.localeCompare(b.tuNgay));
  const nhan = (q: QuyTac, theoNhom: boolean): HTMLElement =>
    h("span", { class: "huy-hieu", "data-tong": q.daDuyet ? "bien" : "cat", "data-gia-mua-vu": q.id, title: q.ghiChu ?? "" }, icon("money", 14),
      `Giá mùa vụ ${mucChu(q)} · ${khoangChu(q, homNay())} (${trangThaiChu(q)}${theoNhom ? ", theo nhóm" : ""})`);

  function mo(phamVi: QuyTac["phamVi"], ma: string, ten: string, opener: HTMLButtonElement): void {
    const hn = homNay();
    const loi = h("div", { class: "alert", role: "alert", hidden: true });
    const tuNgay = h("input", { type: "date", class: "o", id: "gmv-tu", min: hn, value: hn, required: true }) as HTMLInputElement;
    const denNgay = h("input", { type: "date", class: "o", id: "gmv-den", min: hn, value: hn, required: true }) as HTMLInputElement;
    const phanTram = h("input", { type: "text", inputmode: "numeric", class: "o", id: "gmv-phan-tram", autocomplete: "off", placeholder: "Ví dụ: 10" }) as HTMLInputElement;
    const soTien = h("input", { type: "text", inputmode: "numeric", class: "o", id: "gmv-so-tien", autocomplete: "off", placeholder: "Ví dụ: 20.000" }) as HTMLInputElement;
    const ghiChu = h("input", { type: "text", class: "o", id: "gmv-ghi-chu", maxlength: 200, placeholder: "Ví dụ: Tết Nguyên đán" }) as HTMLInputElement;
    const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "gia-mua-vu-luu" }, "Giá mùa vụ") as HTMLButtonElement;
    const dangCo = h("div", { class: "gmv-ds" });
    const bao = (cau: string): void => {
      loi.textContent = cau;
      loi.hidden = false;
    };
    soTien.addEventListener("blur", () => {
      const n = parseMoney(soTien.value);
      if (soTien.value.trim() !== "" && Number.isFinite(n)) soTien.value = grouped(n);
    });

    const nutLenh = (chu: string, action: string, lop: string, duong: string, xong: (r: unknown) => void): HTMLButtonElement => {
      const b = h("button", { type: "button", class: lop, "data-action": action }, chu) as HTMLButtonElement;
      b.addEventListener("click", async () => {
        loi.hidden = true;
        b.disabled = true;
        try {
          xong(await api(duong, { method: "POST", body: {} }));
          veDangCo();
          sauKhiDoi();
        } catch (err) {
          bao(lyDo(err));
          b.disabled = false;
        }
      });
      return b;
    };
    const dong = (q: QuyTac): HTMLElement => {
      const duong = `/api/catalog/gia-mua-vu/${encodeURIComponent(q.id)}`;
      const nutDuyet = !q.daDuyet && quyen.duyet && !q.cuaToi
        ? nutLenh("Duyệt", "gia-mua-vu-duyet", "btn btn-link", `${duong}/duyet`, (r) => {
            const moi = (r as Api.CatalogGiaMuaVuResponse).quyTac;
            ds = ds.map((x) => (x.id === moi.id ? moi : x));
            hienBaoNgan(`${ten}: giá mùa vụ ${khoangChu(moi, hn)} đã duyệt, áp từ bây giờ.`);
          })
        : null;
      const nutKt = nutLenh("Kết thúc", "gia-mua-vu-ket-thuc", "btn btn-link danger", `${duong}/ket-thuc`, () => {
        ds = ds.filter((x) => x.id !== q.id);
        hienBaoNgan(`${ten}: đã kết thúc giá mùa vụ ${khoangChu(q, hn)}. Đơn đã lập giữ nguyên giá.`);
      });
      return h("li", { "data-quy-tac": q.id },
        h("span", null, `${ngayDayDu(q.tuNgay)} – ${ngayDayDu(q.denNgay)} · ${mucChu(q)}${q.ghiChu ? ` · ${q.ghiChu}` : ""}`),
        !q.daDuyet && q.cuaToi && h("span", { class: "hint" }, " Bạn đặt — cần người khác duyệt."),
        h("div", { class: "actions" }, nutDuyet, nutKt)); // hai nút một hàng riêng — người đánh giá giao diện 23/11 (S8: «Kết thúc» rớt dòng ở 390)
    };
    const nhomDs = (tieuDe: string, cac: QuyTac[], rong: string): HTMLElement[] => [
      h("h3", null, tieuDe),
      h("ul", { class: "nbn-ds" }, ...(cac.length === 0 ? [h("li", { class: "muted" }, rong)] : cac.map(dong))),
    ];
    const veDangCo = (): void => {
      const cac = cua(phamVi, ma);
      dangCo.replaceChildren(
        ...nhomDs("Chờ duyệt", cac.filter((q) => !q.daDuyet), "Không có quy tắc chờ duyệt."),
        ...nhomDs("Đang áp dụng", cac.filter((q) => q.daDuyet), "Chưa có giá mùa vụ đang áp dụng."),
        h("p", { class: "muted" }, "Quy tắc đã kết thúc hoặc đã qua ngày cuối xem ở Nhật ký. Quy tắc đã đặt không sửa được: đặt nhầm thì bấm Kết thúc rồi đặt lại."),
      );
    };
    veDangCo();

    const khoiTran = (): HTMLElement | null => {
      if (!quyen.tran) return null;
      const o = h("input", { type: "text", inputmode: "numeric", class: "o", id: "gmv-tran", autocomplete: "off", value: String(tranPhanTram) }) as HTMLInputElement;
      const b = h("button", { type: "button", class: "btn", "data-action": "gia-mua-vu-tran" }, "Lưu mức tăng tối đa") as HTMLButtonElement;
      b.addEventListener("click", async () => {
        loi.hidden = true;
        const v = Number(o.value.trim());
        if (o.value.trim() === "" || !Number.isInteger(v)) return bao("Mức tăng tối đa là số nguyên từ 0 đến 100.");
        b.disabled = true;
        try {
          tranPhanTram = (await api<Api.CatalogGiaMuaVuTranResponse>("/api/catalog/gia-mua-vu/tran", { method: "POST", body: { tranPhanTram: v } })).tranPhanTram;
          hienBaoNgan(`Mức tăng tối đa của giá mùa vụ: ${tranPhanTram} %.`);
        } catch (err) {
          bao(lyDo(err));
        }
        b.disabled = false;
      });
      return h("section", { "data-khoi": "gmv-tran" },
        h("h3", null, "Mức tăng tối đa"),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-tran" }, "Phần trăm tăng tối đa (áp cho mọi dịch vụ)"), o),
        h("p", { class: "muted" }, "Hạ mức này không đổi quy tắc đã duyệt; quy tắc mới và lần duyệt sau phải không vượt mức."),
        b);
    };

    const bang = moBangTruot({
      title: `Giá mùa vụ: ${ten}`,
      opener,
      body: [
        h("p", { class: "muted" }, phamVi === "GROUP"
          ? "Tăng giá theo ngày đi cho mọi dịch vụ đang thuộc nhóm này (dịch vụ có giá mùa vụ riêng thì dùng giá riêng)."
          : "Tăng giá theo ngày đi cho dịch vụ này (thắng giá mùa vụ của nhóm)."),
        h("p", { class: "muted" }, "Giá mới = giá hiện tại cộng phần trăm, rồi cộng số tiền, làm tròn lên 1.000 đ. Đơn đã xác nhận giữ nguyên giá. Phí đưa đón không tăng."),
        h("p", { class: "alert warn", "data-khoi": "gmv-can-duyet" }, "Giá chỉ áp sau khi người khác duyệt."),
        dangCo, // quy tắc chờ duyệt / đang áp dụng đứng TRÊN form đặt mới — người vào để duyệt thấy ngay (người đánh giá giao diện 23/11, S9)
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-tu" }, "Từ ngày đi"), tuNgay),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-den" }, "Đến hết ngày đi"), denNgay),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-phan-tram" }, `Tăng phần trăm (tối đa ${tranPhanTram} %)`), phanTram),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-so-tien" }, "Tăng thêm số tiền (đồng)"), soTien),
        h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "gmv-ghi-chu" }, "Ghi chú (không bắt buộc)"), ghiChu),
        loi,
        khoiTran(),
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
      if (!tuNgay.value || !denNgay.value) return bao("Chọn ngày đầu và ngày cuối; ngày cuối không được trước ngày đầu.");
      // Ô trống = 0; chữ không phải số gửi nguyên để máy chủ trả đúng câu (`phan_tram`, `so_tien`).
      const pt = phanTram.value.trim() === "" ? 0 : Number(phanTram.value.trim());
      const st = soTien.value.trim() === "" ? 0 : parseMoney(soTien.value);
      luu.disabled = true;
      bang.setBusy(true);
      try {
        const r = await api<Api.CatalogGiaMuaVuResponse>("/api/catalog/gia-mua-vu", {
          method: "POST",
          body: { phamVi, ma, tuNgay: tuNgay.value, denNgay: denNgay.value, phanTram: pt, soTien: st, ghiChu: ghiChu.value } satisfies Api.CatalogGiaMuaVuInput,
        });
        ds = [...ds, r.quyTac];
        bang.setBusy(false);
        bang.close(false);
        hienBaoNgan(`${ten}: đã đặt giá mùa vụ ${mucChu(r.quyTac)} cho ${khoangChu(r.quyTac, hn)}. Giá chỉ áp sau khi người khác duyệt.`, { tong: "cat" });
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
      if (!quyen.dat) return;
      const r = await api<Api.CatalogGiaMuaVuListResponse>("/api/catalog/gia-mua-vu");
      ds = r.quyTac;
      tranPhanTram = r.tranPhanTram;
    },
    nhanDichVu: (ma, maNhom) => [...cua("SERVICE", ma).map((q) => nhan(q, false)), ...(maNhom === null ? [] : cua("GROUP", maNhom).map((q) => nhan(q, true)))],
    nhanNhom: (maNhom) => cua("GROUP", maNhom).map((q) => nhan(q, false)),
    nut(phamVi, ma, ten, lop) {
      const b = h("button", { type: "button", class: lop, "data-action": "gia-mua-vu", hidden: !quyen.dat, "aria-label": `Giá mùa vụ: ${ten}` }, "Giá mùa vụ") as HTMLButtonElement;
      b.addEventListener("click", () => mo(phamVi, ma, ten, b));
      return b;
    },
    tomTat(ma, maNhom) {
      if (!quyen.dat) return null;
      const hn = homNay();
      const cac = [...cua("SERVICE", ma).map((q) => ({ q, nhom: false })), ...(maNhom === null ? [] : cua("GROUP", maNhom).map((q) => ({ q, nhom: true })))];
      return h("section", { "data-khoi": "ct-gia-mua-vu" },
        h("h3", null, "Giá theo mùa"),
        cac.length === 0
          ? h("p", { class: "muted" }, "Chưa có giá mùa vụ đang áp dụng hoặc chờ duyệt.")
          : h("ul", null, ...cac.map(({ q, nhom }) => h("li", null, `${khoangChu(q, hn)}: ${mucChu(q)} (${trangThaiChu(q)}${nhom ? ", theo nhóm" : ""})`))),
        h("p", { class: "muted" }, "Đặt, duyệt, kết thúc bằng nút «Giá mùa vụ» ở dòng dịch vụ hoặc dòng nhóm. Giá mùa vụ riêng của dịch vụ thắng giá của nhóm."));
    },
  };
}
