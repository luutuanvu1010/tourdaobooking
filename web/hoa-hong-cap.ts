// Thẻ «Các cấp đại lý» của trang «Hoa hồng đối tác» (đặc tả hoa-hong-cap-dai-ly §3, §3.1, §3.2, §4.3, §5.2–§5.4, Q-4, Q-6, Q-11; ADR-0161 Đ1).
// Khổ ≥ 900: BẢNG NHẬP cấp × dịch vụ (mọi nhóm, mọi dịch vụ, giá bán lẻ; khung cuộn hai chiều riêng, đầu cột dính; ô tìm, nhóm, «Còn thiếu mức»), bấm ô để thêm / đổi / sửa / ngừng, bấm tên cấp ở đầu cột để mở chi tiết.
// Khổ < 900: chọn cấp bằng `.tab-phu[data-kieu="vien"]`, chi tiết cấp chính là danh sách mức của cấp đó. Ô ma trận chỉ là dòng có thật của đúng phạm vi (`maTranCap`), không có thì «—»; trang không chọn mức, không suy con số.
// Nút ghi chỉ dựng cho người có `partner.commission.write` (Sửa: `coQuyenSua`); máy chủ kiểm lại. Việc của dòng theo `viecDongMuc` / `viecLanGan` (cấp đang khoá: dòng mức chỉ còn Ngừng).
import {
  CAU_CAP_CHUA_AP_LOAI,
  CAU_CHUA_CO_GIA,
  CAU_CON_THIEU_CHUA_KIEM,
  CAU_DA_KHOA_CAP,
  CAU_DA_MO_LAI_CAP,
  CAU_KHONG_CO_MUC,
  CAU_KHONG_CO_MUC_TA,
  CAU_KHONG_KHOP_LOC,
  CAU_O_TRONG,
  CAU_THU_TU_AP_MUC,
  NHAN_AP_CHO,
  NHAN_CAP_DA_KHOA,
  NHAN_CAP_KHOA_NGAN,
  NHAN_CON_THIEU,
  NHAN_GIA_BAN_LE,
  NHAN_LOC_NHOM,
  NHAN_TAT_CA_NHOM,
  NHAN_TIM_HANG,
  NHAN_TINH_BANG,
  NHAN_TRANG_THAI,
  cachGhiTienCuaDong,
  cauDemCap,
  cauDemHangMaTran,
  cauNhacCap,
  chiaLanGan,
  conApHoacSap,
  coQuyenSua,
  cotMucCap,
  demTheoCap,
  hopKhoaCap,
  locHangMaTran,
  maTranCap,
  nhanGiaBanLe,
  nhanHieuLuc,
  nhanMucTheoDonVi,
  nhanMucTa,
  nhanPhamVi,
  nhanSapAp,
  nhanViec,
  oTrongKeTiep,
  thuTuMenu,
  trangThaiDong,
  viecDongMuc,
  viecLanGan,
  type HangMaTran,
  type OMaTran,
  type Viec,
} from "../src/shared/hoa-hong-hien-thi";
import { dichVuThieuCuaCap, phuMucCap } from "../src/shared/hoa-hong-phu-muc";
import { can } from "../src/shared/permissions";
import type { Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { urlNgung } from "./hoa-hong-bang";
import { dongMa, thamSuaCap, type MoHop } from "./hoa-hong-hop";
import { huyHieuTrangThai, khoiLichSuGan } from "./hoa-hong-lich-su";
import { moViecKhac, nutViecKhac } from "./hoa-hong-menu";
import { icon } from "./icons";
import { chuanTim } from "./so-dai-ly-ui";

/** Bố cục điện thoại của trang (Q-11: dưới 900, gồm 641–899). Đọc lúc bấm, không lúc vẽ. */
const DIEN_THOAI = "(max-width: 899px)";
/** Hơn 5 cấp thì ma trận cuộn ngang trong khung riêng (Q-11). */
const CAP_TOI_DA_KHONG_CUON = 5;

// Giữ qua các lần vẽ lại (ghi xong trang nạp lại và vẽ lại; cấp đang mở phải còn).
let capChon: string | null = null;
/** Bộ lọc của bảng nhập (ô tìm, nhóm, «Còn thiếu mức») giữ qua các lần vẽ lại: Kế toán nhập liên tiếp nhiều ô mà không phải lọc lại. Lọc chạy trên máy, không gọi máy chủ. */
const locBang: { tim: string; nhom: string | null; chiThieu: boolean } = { tim: "", nhom: null, chiThieu: false };
/** Khoá ô (`cấp|phạm vi|mã`) vừa bấm: hộp đóng thì `document.activeElement` đã mất, nên sau khi ghi xong và trang vẽ lại, tiêu điểm trả về đúng ô này. */
let oVuaBam: string | null = null;
let hienTai: { goc: HTMLElement; d: DuLieuHoaHong; mo: MoHop } | null = null;

/** Id của chip chọn cấp (khổ điện thoại) — khung chi tiết là tabpanel của chip đang chọn. */
const idChip = (code: string): string => `hh-cap-chip-${code}`;

const huyHieu = (tong: "la" | "cat", ten: "checkCircle" | "lock", chu: string): HTMLElement => h("span", { class: "huy-hieu", "data-tong": tong }, icon(ten, 14), chu);

/**
 * Ô việc của một dòng: máy tính thấy sẵn nút «Đổi» / «Đổi cấp» (CSS ẩn dưới 900) và «⋯» cho các việc còn lại; điện thoại chỉ «⋯», trong đó «Đổi» đứng đầu (`thuTuMenu`).
 * «⋯» không còn việc nào ở khổ máy tính thì mang `data-chi-dien-thoai` (CSS ẩn từ 900).
 */
export function oViec(tenDong: string, viec: readonly Viec[], loai: "dong" | "gan", chay: Partial<Record<Viec, () => void>>): HTMLElement | null {
  if (viec.length === 0) return null;
  const o = h("div", { class: "hh-viec" });
  const conLai = viec.filter((v) => v !== "DOI");
  if (viec.includes("DOI")) {
    const nhan = nhanViec("DOI", loai);
    const doi = h("button", { type: "button", class: "nut hh-viec-doi", "data-cap": "phu", "aria-label": `${nhan}: ${tenDong}` }, nhan);
    doi.addEventListener("click", () => chay.DOI?.());
    o.append(doi);
  }
  const khac: HTMLButtonElement = nutViecKhac(tenDong, () => {
    const ds = window.matchMedia(DIEN_THOAI).matches ? thuTuMenu(viec, true) : conLai;
    moViecKhac({ tenDong, opener: khac, viec: ds.map((v) => ({ nhan: nhanViec(v, loai), chay: () => chay[v]?.() })) });
  });
  if (conLai.length === 0) khac.setAttribute("data-chi-dien-thoai", "");
  o.append(khac);
  return o;
}

const khoaO = (cap: string, x: HangMaTran): string => `${cap}|${x.phamVi}|${x.code ?? ""}`;
/** Chữ của ô ngắt được SAU dấu «/» («50.000đ/» rồi «khách») bằng `<wbr>` — không đổi chữ đọc ra (innerText, đọc màn hình); cột cấp hẹp nên «50.000đ/khách» không bị cắt giữa chữ «khách». */
const ngatSauGach = (chu: string): Child[] => chu.split("/").flatMap((phan, i, ds): Child[] => (i < ds.length - 1 ? [`${phan}/`, h("wbr", null)] : [phan]));

/**
 * Bảng NHẬP (khổ ≥ 900; ADR-0161 Đ1): hàng = «Mọi dịch vụ», nhóm, MỌI dịch vụ kèm giá bán lẻ; cột = từng cấp. Ô trống của cấp đang bật là nút «—» mở hộp «Thêm hoa hồng» đã điền sẵn cấp và hàng; ô có mức là
 * nút mở các việc Đổi, Sửa, Ngừng của đúng các dòng trong ô (`viecDongMuc`, nên cấp khoá chỉ còn Ngừng). Người chỉ xem (Bán hàng), ô trống của cấp khoá, ô không còn việc nào: chữ thường. Đầu cột là nút chọn cấp
 * (`aria-pressed`) để xem chi tiết bên dưới. Lọc chỉ vẽ lại phần thân bảng (ô tìm giữ tiêu điểm khi gõ). Máy chủ kiểm lại mọi thứ.
 */
function veMaTran(mt: ReturnType<typeof maTranCap>, d: DuLieuHoaHong, mo: MoHop, chon: (code: string) => void): HTMLElement {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const sua = coQuyenSua(d.nguoiDung);
  // «Còn thiếu mức»: dịch vụ chưa được phủ ở ÍT NHẤT MỘT cấp đang bật — cùng luật với câu nhắc của từng cấp (`dichVuThieuCuaCap`). Không có danh mục thì không biết, nên ô lọc khoá.
  const thieu = new Set<string>();
  if (d.dichVuPhu !== null) for (const m of d.mucTa.muc) if (m.dangBat) for (const sv of dichVuThieuCuaCap({ cap: m, dichVu: d.dichVuPhu, homNay: d.homNay })) thieu.add(sv.code);

  const tim = h("input", { id: "hh-mt-tim", type: "search", autocomplete: "off", placeholder: "Gõ tên hoặc mã dịch vụ", "aria-label": NHAN_TIM_HANG, value: locBang.tim });
  const chonNhom = h("select", { id: "hh-mt-nhom", "aria-label": NHAN_LOC_NHOM }, h("option", { value: "" }, NHAN_TAT_CA_NHOM), ...d.dm.nhom.map((g) => h("option", { value: g.code }, g.name)));
  chonNhom.value = locBang.nhom ?? "";
  locBang.nhom = chonNhom.value === "" ? null : chonNhom.value; // nhóm đã tắt khỏi danh mục: về «Tất cả nhóm»
  const khongKiem = d.dichVuPhu === null;
  const oThieu = h("input", { id: "hh-mt-thieu", type: "checkbox", class: "o-tick", disabled: khongKiem, "aria-describedby": khongKiem ? "hh-mt-thieu-chu-thich" : null });
  oThieu.checked = locBang.chiThieu && !khongKiem;
  locBang.chiThieu = oThieu.checked;
  const dem = h("p", { class: "hint", role: "status", "aria-live": "polite" });

  const tenO = (c: { ten: string }, x: HangMaTran): string => `${c.ten} · ${x.ten}`;
  const oBang = (x: HangMaTran, o: OMaTran, c: ReturnType<typeof maTranCap>["cot"][number]): HTMLElement => {
    const khoa = khoaO(c.code, x);
    if (o.nhan === null) {
      if (!ghi || !c.dangBat) return h("td", { class: "hh-o-trong" }, "—");
      const nut = h("button", { type: "button", class: "hh-o-nut hh-o-them", "data-o": khoa, "aria-label": `Thêm hoa hồng: ${tenO(c, x)}` }, "—");
      nut.addEventListener("click", () => {
        oVuaBam = khoa;
        mo.themMuc({ ai: { loai: "MUC", code: c.code }, phamVi: { phamVi: x.phamVi, code: x.code, ten: x.ten, unit: x.unit, gia: x.gia } });
      });
      return h("td", { class: "hh-o-trong" }, nut);
    }
    const viec = o.dong.flatMap((r, i) => viecDongMuc(r, { homNay: d.homNay, capDangBat: c.dangBat, ghi, sua }).map((v) => ({ r, v, nhan: o.nhan![i]! })));
    const noiDung = o.nhan.map((n) => h("div", null, ...ngatSauGach(n)));
    if (viec.length === 0) return h("td", null, ...noiDung);
    const nut = h("button", { type: "button", class: "hh-o-nut", "data-o": khoa, "aria-haspopup": "dialog", "aria-label": `Đổi, sửa hoặc ngừng hoa hồng: ${tenO(c, x)} · ${o.nhan.join(" · ")}` }, ...noiDung);
    const nhieuDong = o.dong.length > 1;
    nut.addEventListener("click", () => {
      oVuaBam = khoa;
      moViecKhac({
        tenDong: `${tenO(c, x)} · ${o.nhan!.join(" · ")}`,
        opener: nut,
        viec: viec.map(({ r, v, nhan }) => ({
          nhan: nhieuDong ? `${nhanViec(v, "dong")}: ${nhan}` : nhanViec(v, "dong"),
          chay: () => (v === "DOI" ? mo.doi(r) : v === "SUA" ? mo.sua(r) : mo.ngung(r, urlNgung(r))),
        })),
      });
    });
    return h("td", null, nut);
  };
  const dongBang = (x: HangMaTran): HTMLElement => {
    const tenNhom = x.phamVi === "SERVICE" && x.groupCode !== null ? d.ten.nhom(x.groupCode) : undefined;
    const gia = nhanGiaBanLe(x.gia, x.unit);
    const oGia = x.phamVi !== "SERVICE" ? h("td", { class: "hh-gia hh-o-trong" }, "—") : h("td", { class: "hh-gia" }, ...(gia.length > 0 ? gia.map((g) => h("div", null, g)) : [h("span", { class: "hh-o-trong" }, CAU_CHUA_CO_GIA)]));
    return h("tr", { "data-pham-vi": x.phamVi }, h("th", { scope: "row" }, x.ten, tenNhom !== undefined && h("span", { class: "hh-ma-tran-nhom" }, tenNhom)), oGia, ...x.o.map((o, i) => oBang(x, o, mt.cot[i]!)));
  };
  const than = h("tbody", null);
  const ve = (): void => {
    const hien = locHangMaTran(mt.hang, locBang, { thieu, chuan: chuanTim });
    replaceChildren(than, ...(hien.length === 0 ? [h("tr", null, h("td", { colspan: String(mt.cot.length + 2), class: "hh-o-trong" }, CAU_KHONG_KHOP_LOC))] : hien.map(dongBang)));
    dem.textContent = cauDemHangMaTran(hien.length, mt.hang.length);
  };
  tim.addEventListener("input", () => {
    locBang.tim = tim.value;
    ve();
  });
  tim.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  chonNhom.addEventListener("change", () => {
    locBang.nhom = chonNhom.value === "" ? null : chonNhom.value;
    ve();
  });
  oThieu.addEventListener("change", () => {
    locBang.chiThieu = oThieu.checked;
    ve();
  });

  const bang = h(
    "table",
    { class: "bang hh-ma-tran" },
    h("caption", { class: "visually-hidden" }, "Hoa hồng theo dịch vụ và cấp độ đại lý"),
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", { scope: "col" }, "Dịch vụ"),
        h("th", { scope: "col" }, NHAN_GIA_BAN_LE),
        ...mt.cot.map((c) => {
          const nut = h("button", { type: "button", class: "hh-cot-cap", "data-chon-cap": c.code, "aria-pressed": String(c.code === capChon) }, c.ten, !c.dangBat && huyHieu("cat", "lock", NHAN_CAP_KHOA_NGAN));
          nut.addEventListener("click", () => chon(c.code));
          return h("th", { scope: "col" }, nut);
        }),
      ),
    ),
    than,
  );
  ve();
  return h(
    "div",
    { class: "hh-ma-tran-bang" },
    h("div", { class: "hh-loc hh-ma-tran-loc" }, h("label", null, "Tìm", tim), h("label", null, "Nhóm", chonNhom), h("label", { class: "check" }, oThieu, NHAN_CON_THIEU)),
    khongKiem && h("p", { class: "hint", id: "hh-mt-thieu-chu-thich" }, CAU_CON_THIEU_CHUA_KIEM),
    dem,
    h("div", { class: "hh-ma-tran-khung" }, bang),
  );
}

/** Chọn cấp ở khổ điện thoại: `.tab-phu[data-kieu="vien"]`, phím mũi tên / Home / End như các thẻ của trang. */
function veChonCap(mt: ReturnType<typeof maTranCap>, chon: (code: string, lay?: boolean) => void): HTMLElement {
  const ds = mt.cot.map((c) => {
    const on = c.code === capChon;
    return h("button", { type: "button", role: "tab", "data-chon-cap": c.code, id: idChip(c.code), "aria-selected": String(on), "aria-controls": "hh-cap-ct", tabindex: on ? 0 : -1 }, c.ten, !c.dangBat && ` · ${NHAN_CAP_KHOA_NGAN}`);
  });
  ds.forEach((b, i) => {
    b.addEventListener("click", () => chon(mt.cot[i]!.code));
    b.addEventListener("keydown", (e) => {
      const n = ds.length;
      const toi = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
      if (toi < 0) return;
      e.preventDefault();
      chon(mt.cot[toi]!.code, true);
    });
  });
  return h("div", { class: "tab-phu hh-cap-chon", "data-kieu": "vien", role: "tablist", "aria-label": "Chọn cấp độ đại lý" }, ...ds);
}

/**
 * Bảng dòng mức (cấp, hoặc loại ở thẻ «Loại đối tác»): dịch vụ · tính bằng · áp cho · mức (người lớn) · trẻ em · người cao tuổi (chỉ khi có dòng theo loại khách) · hiệu lực của DÒNG · trạng thái · việc.
 * `capDangBat` là cờ của cấp chứa các dòng (false ⇒ chỉ còn «Ngừng»); dòng của loại truyền null. `chiConHieuLuc` (mặc định true): chỉ dòng đang và sắp áp; false = cả dòng đã ngừng, đã huỷ (trạng thái ở cột Trạng thái).
 */
export function bangDongMuc(tatCa: readonly Api.CommissionRuleDto[], capDangBat: boolean | null, d: DuLieuHoaHong, ghi: boolean, mo: MoHop, chiConHieuLuc = true): HTMLElement | null {
  const dong = chiConHieuLuc ? tatCa.filter((r) => conApHoacSap(r, d.homNay)) : [...tatCa];
  if (dong.length === 0) return null;
  const coTheoLoai = dong.some((r) => r.theoLoai !== null);
  const sua = coQuyenSua(d.nguoiDung);
  return h(
    "table",
    { class: "bang hh-muc-cap" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", { scope: "col" }, "Dịch vụ"),
        h("th", { scope: "col" }, NHAN_TINH_BANG),
        h("th", { scope: "col" }, NHAN_AP_CHO),
        h("th", { scope: "col", "data-so": "" }, coTheoLoai ? "Người lớn" : "Mức"),
        coTheoLoai && h("th", { scope: "col", "data-so": "" }, "Trẻ em"),
        coTheoLoai && h("th", { scope: "col", "data-so": "" }, "Người cao tuổi"),
        h("th", { scope: "col" }, "Thời gian áp dụng"),
        h("th", { scope: "col" }, "Trạng thái"),
        h("th", { scope: "col" }, h("span", { class: "visually-hidden" }, "Thao tác")),
      ),
    ),
    h(
      "tbody",
      null,
      ...dong.map((r) => {
        const pv = nhanPhamVi(r, d.ten);
        const cot = cotMucCap(r);
        const viec = viecDongMuc(r, { homNay: d.homNay, capDangBat, ghi, sua });
        const o = oViec(`${pv} · ${nhanMucTheoDonVi(r, cachGhiTienCuaDong(r, d.dm.dichVu).donVi)}`, viec, "dong", { DOI: () => mo.doi(r), SUA: () => mo.sua(r), NGUNG: () => mo.ngung(r, urlNgung(r)) });
        return h(
          "tr",
          { "data-dong-id": r.id },
          h("td", { class: "hh-mc-dv" }, h("strong", null, pv)),
          h("td", { class: "hh-mc-phu" }, cot.tinhBang),
          h("td", { class: "hh-mc-phu" }, cot.apCho),
          h("td", { "data-so": "" }, h("span", { class: "hh-nhan-dt" }, coTheoLoai ? "Người lớn " : ""), cot.nguoiLon),
          coTheoLoai && h("td", { "data-so": "" }, h("span", { class: "hh-nhan-dt" }, "Trẻ em "), cot.treEm),
          coTheoLoai && h("td", { "data-so": "" }, h("span", { class: "hh-nhan-dt" }, "Người cao tuổi "), cot.nguoiCaoTuoi),
          h("td", { class: "hh-mc-phu" }, nhanHieuLuc(r)),
          h("td", null, huyHieuTrangThai(trangThaiDong(r, d.homNay))),
          h("td", { class: "hh-mc-viec" }, o),
        );
      }),
    ),
  );
}

const bangMucCap = (m: Api.MucTaDto, d: DuLieuHoaHong, ghi: boolean, mo: MoHop): HTMLElement | null => bangDongMuc(m.dong, m.dangBat, d, ghi, mo);

/** Các lần xếp loại vào cấp: đang áp, sắp áp (việc theo `viecLanGan`, «Đổi cấp» giữ cả khi cấp đang khoá), rồi «Xem lịch sử (n)». */
function lanXepLoai(m: Api.MucTaDto, d: DuLieuHoaHong, ghi: boolean, mo: MoHop): HTMLElement[] {
  const k = chiaLanGan(m.gan, d.homNay);
  const sua = coQuyenSua(d.nguoiDung);
  const dong = (g: Api.GanLoaiMucDto, sap: boolean): HTMLElement =>
    h(
      "li",
      { "data-gan-id": g.id, "data-sap-ap": sap ? "" : null },
      h("span", null, h("strong", null, g.loai.ten), " · ", sap ? h("span", { class: "badge badge-draft" }, nhanSapAp(g)) : h("span", { class: "muted" }, nhanHieuLuc(g))),
      oViec(g.loai.ten, viecLanGan(g, { homNay: d.homNay, ghi, sua, coDoi: true }), "gan", { DOI: () => mo.doiChinhSach(g), SUA: () => mo.suaApDung(g), NGUNG: () => mo.ngungApDung(g) }),
    );
  const ds = [...k.dangAp.map((g) => dong(g, false)), ...k.sapAp.map((g) => dong(g, true))];
  const lichSu = khoiLichSuGan(k.lichSu, d.homNay, (g) => g.loai.ten, `hh-ls-gan-${m.code}`);
  return [ds.length > 0 ? h("ul", { class: "hh-tl-gan" }, ...ds) : h("p", { class: "muted" }, CAU_CAP_CHUA_AP_LOAI), ...(lichSu ? [lichSu] : [])];
}

/** Nút «Khoá cấp» (hỏi lại bằng `hopKhoaCap`) / «Mở lại cấp» (không hỏi). Lỗi máy chủ hiện nguyên câu dưới hàng nút. */
function nutKhoaCap(m: Api.MucTaDto, mo: MoHop, loiEl: HTMLElement): HTMLElement {
  const nhan = nhanMucTa(m).nut;
  const n = h("button", { type: "button", class: "nut", "data-cap": "phu", "aria-label": nhan.ariaLabel }, nhan.nhan);
  n.addEventListener("click", async () => {
    if (n.disabled) return;
    if (nhan.hanhDong === "tat" && !(await hoiXacNhan({ ...hopKhoaCap(m.ten), opener: n }))) return;
    n.disabled = true;
    loiEl.hidden = true;
    const loi = await mo.guiNhanh(`/api/pricing/muc-ta/${encodeURIComponent(m.code)}/${nhan.hanhDong}`, nhan.hanhDong === "tat" ? CAU_DA_KHOA_CAP : CAU_DA_MO_LAI_CAP);
    if (loi !== null) {
      n.disabled = false;
      loiEl.textContent = loi;
      loiEl.hidden = false;
    }
  });
  return n;
}

/** Chi tiết một cấp (§3 bảng vùng): tên, huy hiệu, câu nhắc phủ mức §4.3, số loại và đối tác, nút của cấp, bảng «Mức của cấp», các lần xếp loại. */
function chiTietCap(m: Api.MucTaDto, d: DuLieuHoaHong, mo: MoHop): HTMLElement {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const nhac = cauNhacCap(phuMucCap({ cap: m, dichVu: d.dichVuPhu, homNay: d.homNay }));
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });
  const nut = h("div", { class: "hh-cap-nut" });
  if (ghi) {
    const sua = h("button", { type: "button", class: "nut", "data-cap": "phu", "aria-label": `Sửa: ${m.ten}` }, "Sửa");
    sua.addEventListener("click", () => mo.suaDanhMuc(thamSuaCap(m)));
    nut.append(sua);
    if (m.dangBat) {
      const ad = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Thêm vai trò vào cấp này");
      ad.addEventListener("click", () => mo.apDungChinhSach(m));
      const them = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "＋ Thêm hoa hồng cho dịch vụ");
      them.addEventListener("click", () => mo.themMuc({ ai: { loai: "MUC", code: m.code } }));
      nut.append(ad, them);
    }
    nut.append(nutKhoaCap(m, mo, loiEl));
  }
  const bang = bangMucCap(m, d, ghi, mo);
  return h(
    "section",
    { class: "the hh-cap-ct", id: "hh-cap-ct", role: "tabpanel", "data-cap": m.code, "aria-labelledby": idChip(m.code) },
    h(
      "div",
      { class: "hh-cap-ct-dau" },
      h("h3", { id: "hh-cap-ct-ten" }, m.ten),
      m.dangBat ? huyHieu("la", "checkCircle", NHAN_TRANG_THAI.DANG_AP) : huyHieu("cat", "lock", NHAN_CAP_DA_KHOA),
    ),
    dongMa(m.code, false),
    nhac !== null && h("p", { class: "hh-cap-nhac" }, nhac),
    h("p", { class: "muted" }, cauDemCap(demTheoCap(m, d.mucTa.ganRieng, d.homNay))),
    ghi && nut,
    loiEl,
    h("h4", null, "Hoa hồng của cấp theo dịch vụ"),
    bang ? h("div", { class: "hh-muc-cap-khung" }, bang) : h("p", { class: "muted" }, CAU_KHONG_CO_MUC),
    h("h4", null, "Vai người dùng đang theo cấp này"),
    ...lanXepLoai(m, d, ghi, mo),
  );
}

/** Vị trí cần giữ qua lần vẽ lại: cuộn cả trang, cuộn trong khung bảng, ô đang gõ (id, vùng chọn). Chỉ có khi thẻ đã vẽ ít nhất một lần. */
interface ViTri { y: number; top: number; left: number; dangGo: { id: string; dau: number | null; cuoi: number | null } | null; oCu: string[] }
function chupViTri(goc: HTMLElement): ViTri | null {
  if (goc.childElementCount === 0) return null;
  const khung = goc.querySelector<HTMLElement>(".hh-ma-tran-khung");
  const dang = document.activeElement;
  const dangGo = dang instanceof HTMLInputElement && dang.id !== "" && goc.contains(dang) ? { id: dang.id, dau: dang.selectionStart, cuoi: dang.selectionEnd } : null;
  const oCu = [...goc.querySelectorAll<HTMLElement>("[data-o]")].map((e) => e.dataset.o ?? "");
  return { y: window.scrollY, top: khung?.scrollTop ?? 0, left: khung?.scrollLeft ?? 0, dangGo, oCu };
}
function traViTri(goc: HTMLElement, v: ViTri | null): void {
  if (v !== null) {
    const khung = goc.querySelector<HTMLElement>(".hh-ma-tran-khung");
    if (khung) {
      khung.scrollTop = v.top;
      khung.scrollLeft = v.left;
    }
    window.scrollTo(0, v.y);
  }
  let dich: HTMLElement | null = null;
  if (v?.dangGo) dich = [...goc.querySelectorAll<HTMLElement>("input")].find((e) => e.id === v.dangGo!.id) ?? null;
  else if (oVuaBam !== null) {
    const cacO = [...goc.querySelectorAll<HTMLElement>("[data-o]")];
    dich = cacO.find((e) => e.dataset.o === oVuaBam) ?? null;
    if (dich === null && v !== null) {
      // Ô vừa bấm đã biến khỏi bảng (hàng vừa đủ mức khi bộ lọc «Còn thiếu mức» bật): sang ô trống kế tiếp, hết thì về ô Tìm — không để tiêu điểm rơi về đầu trang.
      const tiep = oTrongKeTiep(v.oCu, oVuaBam, new Set(cacO.filter((e) => e.classList.contains("hh-o-them")).map((e) => e.dataset.o ?? "")));
      const oTiep = tiep === null ? undefined : cacO.find((e) => e.dataset.o === tiep);
      dich = oTiep ?? goc.querySelector<HTMLElement>("#hh-mt-tim");
    }
  }
  oVuaBam = null;
  if (!dich) return;
  dich.focus({ preventScroll: true });
  if (v?.dangGo && dich instanceof HTMLInputElement && v.dangGo.dau !== null && v.dangGo.cuoi !== null) dich.setSelectionRange(v.dangGo.dau, v.dangGo.cuoi);
}

/**
 * Vẽ thẻ «Các cấp đại lý». Vẽ lại sau mỗi lần ghi (trang nạp lại dữ liệu) nên GIỮ vị trí: cuộn trang, cuộn trong khung bảng, ô đang gõ, và ô vừa bấm lấy lại tiêu điểm; bộ lọc ở `locBang`.
 */
export function veTheCap(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  hienTai = { goc, d, mo };
  const viTri = chupViTri(goc);
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const mt = maTranCap({ muc: d.mucTa.muc, dichVu: d.dm.dichVu, nhom: d.dm.nhom, homNay: d.homNay });
  if (capChon === null || !mt.cot.some((c) => c.code === capChon)) capChon = mt.cot[0]?.code ?? null;

  const dau = h("div", { class: "hh-cap-dau" }, h("h2", { class: "hh-muc-ten" }, "Cấp độ đại lý"));
  if (ghi) {
    const them = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "＋ Thêm cấp độ đại lý");
    them.addEventListener("click", () => mo.themChinhSach());
    dau.append(them);
  }
  const m = d.mucTa.muc.find((x) => x.code === capChon);
  if (!m) {
    replaceChildren(goc, h("section", { class: "hh-cap" }, dau, h("p", { class: "muted" }, CAU_KHONG_CO_MUC_TA)));
    traViTri(goc, viTri);
    return;
  }
  const khung = h("div", null, chiTietCap(m, d, mo));
  const chon = (code: string, lay = false): void => {
    const moi = d.mucTa.muc.find((x) => x.code === code);
    if (!moi) return;
    capChon = code;
    for (const b of goc.querySelectorAll<HTMLElement>("[data-chon-cap]")) {
      const on = b.dataset.chonCap === code;
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", String(on));
      else {
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && lay) b.focus();
      }
    }
    replaceChildren(khung, chiTietCap(moi, d, mo));
  };
  replaceChildren(
    goc,
    h(
      "section",
      { class: "hh-cap" },
      dau,
      // Vùng ma trận (chỉ khổ ≥ 900): bảng + câu ô «—». Câu thứ tự áp mức là luật chung nên hiện ở mọi khổ; dưới 900 nó đứng trước dải chọn cấp.
      h("div", { class: "hh-ma-tran-vung" }, veMaTran(mt, d, mo, chon), h("p", { class: "hint hh-cap-cau" }, CAU_O_TRONG)),
      h("p", { class: "hint hh-cap-cau" }, CAU_THU_TU_AP_MUC),
      veChonCap(mt, chon),
      khung,
    ),
  );
  traViTri(goc, viTri);
}

/** Mở chi tiết cấp `code` (Task 11: «Xem dòng ↓» bậc 7–12). Trả khung chi tiết, hoặc null khi thẻ chưa vẽ hay không có cấp đó. */
export function moChiTietCap(code: string): HTMLElement | null {
  if (!hienTai || !hienTai.d.mucTa.muc.some((x) => x.code === code)) return null;
  capChon = code;
  veTheCap(hienTai.goc, hienTai.d, hienTai.mo);
  return hienTai.goc.querySelector<HTMLElement>("#hh-cap-ct");
}
