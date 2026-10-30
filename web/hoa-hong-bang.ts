// Bảng «ai hưởng gì» (tạm, còn phần thẻ «Riêng từng đối tác»; phần loại đã sang web/hoa-hong-loai.ts): hàng lọc, mục «Đối tác có mức riêng hoặc chính sách riêng» (mỗi đối tác một dòng mở được). Trang không tính tiền, không chọn mức: số và lời đến từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts.
// Nút ghi (Đổi, Ngừng, Sửa, Thêm mức riêng, Đổi chính sách) chỉ hiện cho người có `partner.commission.write` (Sửa: thêm điều kiện không mang quyền Đối tác — ADR-0148; máy chủ
// kiểm lại). Điện thoại: không nút nhỏ trong dòng — chạm dòng mở hộp các việc của dòng.
import {
  CAU_KHONG_CO_MUC,
  CAU_KHONG_KHOP_LOC,
  coQuyenSua,
  conApHoacSap,
  dongRiengDoiTac,
  ghepDoiTacRieng,
  nhanHieuLuc,
  nhanMucDto,
  nhanPhamVi,
  nutDoiNgung,
  nutSua,
  tomTatMuc,
  trangThaiDong,
  type BoLoc,
} from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { ngayDayDu } from "../src/shared/vn-date";
import type { Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import type { MoHop } from "./hoa-hong-hop";
import { huyHieuTrangThai } from "./hoa-hong-lich-su";

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

// Trạng thái giữ qua các lần vẽ lại (sau khi ghi xong trang vẽ lại, bộ lọc và các loại đang mở phải còn nguyên).
let loc: BoLoc = { chiConHieuLuc: true, tim: "" };
const moSanDt = new Set<string>();
/** Tạm: bảng cũ chỉ còn phần đối tác (phần loại đã sang web/hoa-hong-loai.ts, Task 9); Task 10 thay nốt. */
type Phan = "doi-tac";
const cac = new Map<Phan, { goc: HTMLElement; veLai: () => void }>();
let duHienTai: DuLieuHoaHong | null = null;

export const urlNgung = (r: Api.CommissionRuleDto): string => `/api/pricing/hoa-hong/${encodeURIComponent(r.id)}/dong`;

/** «Đổi, Ngừng hoặc Sửa» / «Sửa» — tên các việc của một dòng cho nhãn đọc màn hình của vùng chạm (điện thoại). */
const noiViec = (viec: readonly string[]): string => (viec.length <= 1 ? (viec[0] ?? "") : `${viec.slice(0, -1).join(", ")} hoặc ${viec.at(-1)}`);

/** Một dòng mức: Dịch vụ · Mức · Hiệu lực · Trạng thái · (Đổi/Ngừng/Sửa). `hanhDong` false = dòng chỉ xem (mức của chính sách). */
export function dongMuc(r: Api.CommissionRuleDto, d: DuLieuHoaHong, mo: MoHop, hanhDong: boolean): HTMLElement {
  const phamVi = nhanPhamVi(r, d.ten);
  const nut = hanhDong ? nutDoiNgung(r, d.homNay) : ({ hien: false, ghiChu: "" } as const);
  // ADR-0148: «Sửa» có cả ở dòng chưa tới ngày và dòng đã hẹn ngày ngừng (ví dụ 2027 → 2028 của chủ) — luật riêng, không theo `nutDoiNgung`.
  const sua = hanhDong && coQuyenSua(d.nguoiDung) && nutSua(r, d.homNay);
  const act = h("div", { class: "hh-m-act" });
  if (hanhDong && nut.hien) {
    const doi = h("button", { type: "button", class: "btn", "aria-label": `Đổi: ${phamVi}` }, "Đổi");
    const ngung = h("button", { type: "button", class: "btn", "aria-label": `Ngừng: ${phamVi}` }, "Ngừng");
    doi.addEventListener("click", () => mo.doi(r));
    ngung.addEventListener("click", () => mo.ngung(r, urlNgung(r)));
    act.append(doi, ngung);
  } else if (!nut.hien && nut.ghiChu !== "") act.append(h("span", { class: "muted" }, nut.ghiChu));
  if (sua) {
    const nutS = h("button", { type: "button", class: "btn", "aria-label": `Sửa: ${phamVi}` }, "Sửa");
    nutS.addEventListener("click", () => mo.sua(r));
    act.append(nutS);
  }
  const li = h(
    "li",
    { class: "hh-m", "data-dong-id": r.id },
    h("div", { class: "hh-m-dv" }, h("strong", null, phamVi)),
    h("div", { class: "hh-m-muc" }, h("strong", null, nhanMucDto(r))),
    h("div", { class: "hh-m-hl muted" }, nhanHieuLuc(r)),
    h("div", { class: "hh-m-tt" }, huyHieuTrangThai(trangThaiDong(r, d.homNay))),
    act,
  );
  const viec = [...(hanhDong && nut.hien ? ["Đổi", "Ngừng"] : []), ...(sua ? ["Sửa"] : [])];
  if (viec.length > 0) {
    // Điện thoại: chạm dòng mở hộp các việc của dòng (Đổi, Ngừng, Sửa — có việc nào thì hiện việc đó); nút nhỏ trong dòng bị CSS ẩn.
    li.classList.add("hh-m-cham");
    // Điện thoại: một nút thật phủ cả dòng (CSS chỉ hiện nó ở ≤ 640px, nơi nút trong dòng bị ẩn). Dòng vẫn là mục danh sách; ở máy tính không có vai nút nào chứa nút.
    const vung = h("button", { type: "button", class: "hh-m-vung", "aria-label": `${phamVi} · ${nhanMucDto(r)}: ${noiViec(viec)}` });
    li.append(vung);
    const mot = (): void => {
      if (!window.matchMedia("(max-width: 640px)").matches) return;
      const viecNut: [string, () => void][] = [
        ...(nut.hien ? ([["Ngừng", () => mo.ngung(r, urlNgung(r))], ["Đổi", () => mo.doi(r)]] as [string, () => void][]) : []),
        ...(sua ? ([["Sửa", () => mo.sua(r)]] as [string, () => void][]) : []),
      ];
      const chinh = nut.hien ? "Đổi" : "Sửa";
      const cacNut = viecNut.map(([ten]) => h("button", { type: "button", class: ten === chinh ? "btn btn-primary" : "btn" }, ten));
      const sheet = moBangTruot({
        title: phamVi,
        body: [h("p", null, h("strong", null, nhanMucDto(r))), h("p", { class: "muted" }, nhanHieuLuc(r)), ...(nut.hien || nut.ghiChu === "" ? [] : [h("p", { class: "muted" }, nut.ghiChu)])],
        foot: cacNut,
        footClass: "loc-foot",
        opener: vung,
      });
      if (!sheet) return;
      cacNut.forEach((b, i) =>
        b.addEventListener("click", () => {
          sheet.close(false);
          viecNut[i]![1]();
        }),
      );
    };
    vung.addEventListener("click", mot);
  }
  return li;
}

export const dauBang = (): HTMLElement =>
  h("div", { class: "hh-m hh-m-dau", "aria-hidden": "true" }, h("div", null, "Dịch vụ"), h("div", null, "Mức"), h("div", null, "Hiệu lực"), h("div", null, "Trạng thái"), h("div", null));

/** Một đối tác của mục «Đối tác có mức riêng hoặc chính sách riêng»: dòng tóm tắt (nút ▾), mở ra bảng mức riêng, chính sách riêng (chỉ xem) và liên kết hồ sơ ở Danh bạ. */
function cumDoiTac(x: ReturnType<typeof ghepDoiTacRieng>[number], d: DuLieuHoaHong, mo: MoHop, ghi: boolean): HTMLElement {
  const dangMo = moSanDt.has(x.partyId);
  const tatCa = d.dong.filter((r) => r.doiTuong.loai === "DOI_TAC" && r.doiTuong.partyId === x.partyId);
  const dong = dongRiengDoiTac(d.dong, x.partyId, loc, d.homNay, d.ten);
  const tom = tomTatMuc(tatCa, d.ten);
  const ct = h("div", { class: "hh-lo-ct", hidden: !dangMo });
  const nut = h(
    "button",
    { type: "button", class: "hh-loai-nut", "aria-expanded": String(dangMo), "aria-label": `${x.ten}${x.mucRieng ? ", mức riêng" : ""}${x.chinhSach !== null ? `, chính sách riêng ${x.chinhSach}` : ""}` },
    h("span", { class: "hh-lo-ten" }, h("strong", null, x.ten), x.mucRieng && h("span", { class: "badge badge-confirmed" }, "Mức riêng"), x.chinhSach !== null && h("span", { class: "badge badge-delivered" }, `Chính sách riêng: ${x.chinhSach}`)),
    tom !== "" && h("span", { class: "hh-tom-tat muted" }, tom),
  );
  nut.addEventListener("click", () => {
    const moRoi = nut.getAttribute("aria-expanded") !== "true";
    nut.setAttribute("aria-expanded", String(moRoi));
    ct.hidden = !moRoi;
    if (moRoi) moSanDt.add(x.partyId);
    else moSanDt.delete(x.partyId);
  });
  if (x.mucRieng) {
    ct.append(h("h3", null, "Mức riêng của đối tác này"));
    if (dong.length > 0) ct.append(dauBang(), h("ul", { class: "hh-mrows" }, ...dong.map((r) => dongMuc(r, d, mo, ghi))));
    else ct.append(h("p", { class: "muted" }, CAU_KHONG_KHOP_LOC));
  }
  const gan = d.mucTa.ganRieng.find((g) => g.partyId === x.partyId);
  if (gan) {
    ct.append(h("h3", null, `Chính sách riêng ${gan.tenMuc} · áp dụng từ ${ngayDayDu(gan.tuNgay)}`));
    const mt = d.mucTa.muc.find((m) => m.code === gan.muc);
    const dongCs = (mt?.dong ?? []).filter((r) => (loc.chiConHieuLuc ? conApHoacSap(r, d.homNay) : true));
    ct.append(dongCs.length > 0 ? h("ul", { class: "hh-mrows" }, ...dongCs.map((r) => dongMuc(r, d, mo, false))) : h("p", { class: "muted" }, CAU_KHONG_CO_MUC));
  }
  ct.append(h("p", { class: "hint" }, h("a", { href: `/parties?id=${encodeURIComponent(x.partyId)}` }, "Mở hồ sơ ở Danh bạ ›")));
  return h("article", { class: "hh-lo hh-dt", "data-party": x.partyId }, nut, ct);
}

function veNoiDung(noi: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const tim = chuanTim(loc.tim);
  const doiTac = ghepDoiTacRieng(d.dong, d.mucTa.ganRieng, d.homNay).filter((x) => tim === "" || chuanTim(x.ten).includes(tim) || chuanTim(x.chinhSach ?? "").includes(tim));

  const muc2 = h("section", { class: "hh-muc" }, h("h2", { class: "hh-muc-ten" }, "Đối tác có mức riêng hoặc chính sách riêng"));
  if (doiTac.length === 0) muc2.append(h("p", { class: "muted" }, tim === "" ? "Chưa có đối tác nào có mức riêng hoặc chính sách riêng." : CAU_KHONG_KHOP_LOC));
  else muc2.append(...doiTac.map((x) => cumDoiTac(x, d, mo, ghi)));
  replaceChildren(noi, muc2);
}

/** Vẽ hàng lọc + một phần của bảng vào `g` (`phan`: theo loại, hoặc đối tác có mức riêng). `chuyenThe` (nếu có) chuyển sang thẻ «Các cấp đại lý» cho liên kết «sửa ở Các cấp đại lý ›». */
export function veBangApDung(g: HTMLElement, d: DuLieuHoaHong, mo: MoHop, phan: Phan, chuyenThe?: () => void): void {
  duHienTai = d;
  const o = h("input", { id: `hh-loc-tim-${phan}`, type: "search", autocomplete: "off", placeholder: "Tìm loại, đối tác hoặc dịch vụ", "aria-label": "Tìm loại, đối tác hoặc dịch vụ", value: loc.tim });
  const tt = h("select", { id: `hh-loc-tt-${phan}`, "aria-label": "Trạng thái" }, h("option", { value: "ap" }, "Đang và sắp áp dụng"), h("option", { value: "tat-ca" }, "Tất cả"));
  tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
  const noi = h("div", { class: "hh-bang" });
  const ve = (): void => veNoiDung(noi, d, mo);
  const veCa = (): void => {
    for (const x of cac.values()) x.veLai();
  };
  cac.set(phan, {
    goc: g,
    veLai: () => {
      o.value = loc.tim;
      tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
      ve();
    },
  });
  o.addEventListener("input", () => {
    loc = { ...loc, tim: o.value };
    veCa();
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  tt.addEventListener("change", () => {
    loc = { ...loc, chiConHieuLuc: tt.value !== "tat-ca" };
    veCa();
  });
  replaceChildren(g, h("div", { class: "hh-loc" }, h("label", null, "Tìm", o), h("label", null, "Trạng thái", tt)), noi);
  ve();
}

/** «Xem dòng ↓» của Tra nhanh: cuộn tới dòng mức, mở cụm chứa nó. Bộ lọc đang giấu dòng đó thì trả về mặc định rồi thử lại. */
export function cuonToiDong(dongId: string, loai?: string): void {
  if (cac.size === 0 || !duHienTai) return;
  const dt = duHienTai.dong.find((r) => r.id === dongId)?.doiTuong;
  // Ưu tiên dòng nằm trong loại đang tra (cùng một dòng chính sách hiện ở nhiều loại).
  const goc = [...cac.values()][0]!.goc;
  const chon = (): HTMLElement | null => {
    if (dt?.loai === "DOI_TAC") return goc.querySelector(`.hh-dt[data-party="${CSS.escape(dt.partyId)}"] [data-dong-id="${CSS.escape(dongId)}"]`) ?? goc.querySelector(`.hh-dt[data-party="${CSS.escape(dt.partyId)}"]`);
    const sel = `[data-dong-id="${CSS.escape(dongId)}"]`;
    return (loai ? goc.querySelector<HTMLElement>(`.hh-lo[data-loai="${CSS.escape(loai)}"] ${sel}`) : null) ?? goc.querySelector(sel);
  };
  let el = chon();
  if (!el) {
    loc = { chiConHieuLuc: true, tim: "" };
    for (const x of cac.values()) x.veLai();
    el = chon();
  }
  if (!el) return;
  const lo = el.closest(".hh-lo"); // cả loại lẫn đối tác (.hh-dt) dùng chung vỏ này
  const nut = lo?.querySelector<HTMLButtonElement>(".hh-loai-nut");
  if (nut && nut.getAttribute("aria-expanded") !== "true") nut.click();
  el.scrollIntoView({ block: "center" });
  el.classList.add("hh-nhay");
  window.setTimeout(() => el.classList.remove("hh-nhay"), 2400);
}
