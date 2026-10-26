// Bảng «ai hưởng gì» của thẻ «Mức đang áp dụng»: hàng lọc, mục «Theo loại đối tác» (mỗi loại một dòng gập, mở ra hai cụm: mức riêng của loại và chính sách đang theo),
// mục «Đối tác có mức riêng hoặc chính sách riêng». Trang không tính tiền, không chọn mức: số và lời đến từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts.
// Nút ghi (Đổi, Ngừng, Thêm mức riêng, Đổi chính sách) chỉ hiện cho người có `partner.commission.write` (máy chủ kiểm lại). Điện thoại: không nút nhỏ trong dòng — chạm dòng mở hộp hai việc.
import {
  CAU_CHUA_CO_MUC_LOAI,
  CAU_KHONG_CO_LOAI,
  CAU_KHONG_CO_MUC,
  CAU_KHONG_KHOP_LOC,
  CAU_NHAC_UU_TIEN,
  NHAN_CHUA_CO_MUC,
  NHAN_TRANG_THAI,
  chinhSachCuaLoai,
  ghepDoiTacRieng,
  locBangLoai,
  nhanHieuLuc,
  nhanMucDto,
  nhanPhamVi,
  nutDoiNgung,
  tomTatMuc,
  trangThaiDong,
  xepLoai,
  type BoLoc,
} from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { ngayDayDu } from "../src/shared/vn-date";
import type { Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import type { MoHop } from "./hoa-hong-hop";

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

// Trạng thái giữ qua các lần vẽ lại (sau khi ghi xong trang vẽ lại, bộ lọc và các loại đang mở phải còn nguyên).
let loc: BoLoc = { chiConHieuLuc: true, tim: "" };
const moSan = new Set<string>();
let goc: HTMLElement | null = null;
let duHienTai: DuLieuHoaHong | null = null;
let veLai: (() => void) | null = null;

const huyHieuTrangThai = (tt: ReturnType<typeof trangThaiDong>): HTMLElement =>
  h("span", { class: tt === "DANG_AP" ? "badge badge-confirmed" : tt === "SAP_AP" ? "badge badge-draft" : "badge badge-cancelled" }, NHAN_TRANG_THAI[tt]);

export const urlNgung = (r: Api.CommissionRuleDto): string => `/api/pricing/hoa-hong/${encodeURIComponent(r.id)}/dong`;

/** Một dòng mức: Dịch vụ · Mức · Hiệu lực · Trạng thái · (Đổi/Ngừng). `hanhDong` false = dòng chỉ xem (mức của chính sách). */
export function dongMuc(r: Api.CommissionRuleDto, d: DuLieuHoaHong, mo: MoHop, hanhDong: boolean): HTMLElement {
  const phamVi = nhanPhamVi(r, d.ten);
  const nut = hanhDong ? nutDoiNgung(r, d.homNay) : ({ hien: false, ghiChu: "" } as const);
  const act = h("div", { class: "hh-m-act" });
  if (hanhDong && nut.hien) {
    const doi = h("button", { type: "button", class: "btn", "aria-label": `Đổi: ${phamVi}` }, "Đổi");
    const ngung = h("button", { type: "button", class: "btn", "aria-label": `Ngừng: ${phamVi}` }, "Ngừng");
    doi.addEventListener("click", () => mo.doi(r));
    ngung.addEventListener("click", () => mo.ngung(r, urlNgung(r)));
    act.append(doi, ngung);
  } else if (!nut.hien && nut.ghiChu !== "") act.append(h("span", { class: "muted" }, nut.ghiChu));
  const li = h(
    "li",
    { class: "hh-m", "data-dong-id": r.id },
    h("div", { class: "hh-m-dv" }, h("strong", null, phamVi)),
    h("div", { class: "hh-m-muc" }, h("strong", null, nhanMucDto(r))),
    h("div", { class: "hh-m-hl muted" }, nhanHieuLuc(r)),
    h("div", { class: "hh-m-tt" }, huyHieuTrangThai(trangThaiDong(r, d.homNay))),
    act,
  );
  if (hanhDong && nut.hien) {
    // Điện thoại: chạm dòng mở hộp hai việc (Đổi, Ngừng); nút nhỏ trong dòng bị CSS ẩn.
    li.classList.add("hh-m-cham");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", `${phamVi} · ${nhanMucDto(r)}: Đổi hoặc Ngừng`);
    const mot = (): void => {
      if (!window.matchMedia("(max-width: 640px)").matches) return;
      const doi = h("button", { type: "button", class: "btn btn-primary" }, "Đổi");
      const ngung = h("button", { type: "button", class: "btn" }, "Ngừng");
      const sheet = moBangTruot({
        title: phamVi,
        body: [h("p", null, h("strong", null, nhanMucDto(r))), h("p", { class: "muted" }, nhanHieuLuc(r))],
        foot: [ngung, doi],
        footClass: "loc-foot",
        opener: li,
      });
      if (!sheet) return;
      doi.addEventListener("click", () => {
        sheet.close(false);
        mo.doi(r);
      });
      ngung.addEventListener("click", () => {
        sheet.close(false);
        mo.ngung(r, urlNgung(r));
      });
    };
    li.addEventListener("click", (e) => {
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      mot();
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        mot();
      }
    });
  }
  return li;
}

export const dauBang = (): HTMLElement =>
  h("div", { class: "hh-m hh-m-dau", "aria-hidden": "true" }, h("div", null, "Dịch vụ"), h("div", null, "Mức"), h("div", null, "Hiệu lực"), h("div", null, "Trạng thái"), h("div", null));

function cumLoai(item: { loai: Api.LoaiDoiTacDto; dong: Api.CommissionRuleDto[]; tatCa: Api.CommissionRuleDto[]; cs: ReturnType<typeof chinhSachCuaLoai>; coMuc: boolean }, d: DuLieuHoaHong, mo: MoHop, ghi: boolean, chuyenThe?: () => void): HTMLElement {
  const { loai, cs } = item;
  const dangMo = moSan.has(loai.code);
  const ct = h("div", { class: "hh-lo-ct", hidden: !dangMo });
  const tom = tomTatMuc(item.tatCa, d.ten);
  const nut = h(
    "button",
    { type: "button", class: "hh-loai-nut", "aria-expanded": String(dangMo), "aria-label": `${loai.ten}${cs ? `, chính sách ${cs.muc.ten}` : ""}${item.coMuc ? "" : `, ${NHAN_CHUA_CO_MUC.toLowerCase()}`}` },
    h("span", { class: "hh-lo-ten" }, h("strong", null, loai.ten), cs && h("span", { class: "badge badge-delivered" }, `Chính sách: ${cs.muc.ten}`), !item.coMuc && h("span", { class: "badge badge-draft" }, NHAN_CHUA_CO_MUC)),
    tom !== "" && h("span", { class: "hh-tom-tat muted" }, tom),
    !item.coMuc && h("span", { class: "hh-lo-thieu muted" }, CAU_CHUA_CO_MUC_LOAI),
  );
  nut.addEventListener("click", () => {
    const moRoi = nut.getAttribute("aria-expanded") !== "true";
    nut.setAttribute("aria-expanded", String(moRoi));
    ct.hidden = !moRoi;
    if (moRoi) moSan.add(loai.code);
    else moSan.delete(loai.code);
  });

  ct.append(h("h3", null, "Mức riêng của loại này"));
  if (item.dong.length > 0) ct.append(dauBang(), h("ul", { class: "hh-mrows" }, ...item.dong.map((r) => dongMuc(r, d, mo, ghi))));
  else ct.append(h("p", { class: "muted" }, item.tatCa.length > 0 ? CAU_KHONG_KHOP_LOC : CAU_KHONG_CO_MUC));
  if (cs) {
    const dongCs = cs.muc.dong.filter((r) => loc.chiConHieuLuc ? trangThaiDong(r, d.homNay) !== "DA_DONG" : true);
    const sua = chuyenThe ? h("button", { type: "button", class: "btn btn-link" }, "sửa ở Thiết lập ›") : null;
    sua?.addEventListener("click", chuyenThe!);
    ct.append(h("h3", null, `Theo chính sách ${cs.muc.ten} · áp dụng từ ${ngayDayDu(cs.gan.tuNgay)}`, " ", sua));
    ct.append(dongCs.length > 0 ? h("ul", { class: "hh-mrows" }, ...dongCs.map((r) => dongMuc(r, d, mo, false))) : h("p", { class: "muted" }, CAU_KHONG_CO_MUC));
  }
  ct.append(h("p", { class: "hint" }, CAU_NHAC_UU_TIEN));
  if (ghi) {
    const them = h("button", { type: "button", class: "btn" }, "＋ Thêm mức riêng cho loại này");
    them.addEventListener("click", () => mo.themMuc({ ai: { loai: "VAI", code: loai.code } }));
    const hang = h("div", { class: "actions" }, them);
    if (cs) {
      const doiCs = h("button", { type: "button", class: "btn" }, "Đổi chính sách");
      doiCs.addEventListener("click", () => mo.doiChinhSach(cs.gan));
      const ngungCs = h("button", { type: "button", class: "btn" }, "Ngừng áp dụng");
      ngungCs.addEventListener("click", () => mo.ngungApDung(cs.gan));
      hang.append(doiCs, ngungCs);
    }
    ct.append(hang);
  }
  return h("article", { class: "hh-lo", "data-loai": loai.code }, nut, ct);
}

function veNoiDung(noi: HTMLElement, d: DuLieuHoaHong, mo: MoHop, chuyenThe?: () => void): void {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const coDongRieng = (code: string): boolean => d.dong.some((r) => r.doiTuong.loai === "VAI" && r.doiTuong.code === code && r.conHieuLuc);
  const loaiHien = d.loai.filter((l) => l.dangBat || coDongRieng(l.code));
  const hang = locBangLoai(loaiHien, d.dong, loc, d.homNay, d.ten);
  const items = xepLoai(
    hang.map((x) => {
      const cs = chinhSachCuaLoai(d.mucTa, x.loai.code);
      return { ten: x.loai.ten, coMuc: coDongRieng(x.loai.code) || cs !== null, loai: x.loai, dong: x.dong, tatCa: d.dong.filter((r) => r.doiTuong.loai === "VAI" && r.doiTuong.code === x.loai.code), cs };
    }),
  );
  const tim = chuanTim(loc.tim);
  const doiTac = ghepDoiTacRieng(d.dong, d.mucTa.ganRieng, d.homNay).filter((x) => tim === "" || chuanTim(x.ten).includes(tim) || chuanTim(x.chinhSach ?? "").includes(tim));

  const muc1 = h("section", { class: "hh-muc" }, h("h2", { class: "hh-muc-ten" }, "Theo loại đối tác"));
  if (d.loai.length === 0) muc1.append(h("p", { class: "muted" }, CAU_KHONG_CO_LOAI));
  else if (items.length === 0) muc1.append(h("p", { class: "muted" }, CAU_KHONG_KHOP_LOC));
  else muc1.append(...items.map((it) => cumLoai(it, d, mo, ghi, chuyenThe)));

  const muc2 = h("section", { class: "hh-muc" }, h("h2", { class: "hh-muc-ten" }, "Đối tác có mức riêng hoặc chính sách riêng"));
  if (doiTac.length === 0) muc2.append(h("p", { class: "muted" }, tim === "" ? "Chưa có đối tác nào có mức riêng hoặc chính sách riêng." : CAU_KHONG_KHOP_LOC));
  else
    muc2.append(
      h(
        "ul",
        { class: "hh-doi-tac" },
        ...doiTac.map((x) =>
          h(
            "li",
            { "data-party": x.partyId },
            h("a", { href: `/parties?id=${encodeURIComponent(x.partyId)}` }, x.ten),
            x.mucRieng && h("span", { class: "badge badge-confirmed" }, "Mức riêng"),
            x.chinhSach !== null && h("span", { class: "badge badge-delivered" }, `Chính sách riêng: ${x.chinhSach}`),
          ),
        ),
      ),
    );
  replaceChildren(noi, muc1, muc2);
}

/** Vẽ hàng lọc + bảng vào `g`. `chuyenThe` (nếu có) chuyển sang thẻ «Thiết lập» cho liên kết «sửa ở Thiết lập ›». */
export function veBangApDung(g: HTMLElement, d: DuLieuHoaHong, mo: MoHop, chuyenThe?: () => void): void {
  goc = g;
  duHienTai = d;
  const o = h("input", { id: "hh-loc-tim", type: "search", autocomplete: "off", placeholder: "Tìm loại, đối tác hoặc dịch vụ", "aria-label": "Tìm loại, đối tác hoặc dịch vụ", value: loc.tim });
  const tt = h("select", { id: "hh-loc-tt", "aria-label": "Trạng thái" }, h("option", { value: "ap" }, "Đang và sắp áp dụng"), h("option", { value: "tat-ca" }, "Tất cả"));
  tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
  const noi = h("div", { class: "hh-bang" });
  const ve = (): void => veNoiDung(noi, d, mo, chuyenThe);
  veLai = () => {
    o.value = loc.tim;
    tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
    ve();
  };
  o.addEventListener("input", () => {
    loc = { ...loc, tim: o.value };
    ve();
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  tt.addEventListener("change", () => {
    loc = { ...loc, chiConHieuLuc: tt.value !== "tat-ca" };
    ve();
  });
  replaceChildren(g, h("div", { class: "hh-loc" }, h("label", null, "Tìm", o), h("label", null, "Trạng thái", tt)), noi);
  ve();
}

/** «Xem dòng ↓» của Tra nhanh: cuộn tới dòng mức, mở cụm chứa nó. Bộ lọc đang giấu dòng đó thì trả về mặc định rồi thử lại. */
export function cuonToiDong(dongId: string): void {
  if (!goc || !duHienTai) return;
  const dt = duHienTai.dong.find((r) => r.id === dongId)?.doiTuong;
  const chon = (): HTMLElement | null => (dt?.loai === "DOI_TAC" ? goc!.querySelector(`[data-party="${CSS.escape(dt.partyId)}"]`) : goc!.querySelector(`[data-dong-id="${CSS.escape(dongId)}"]`));
  let el = chon();
  if (!el && veLai) {
    loc = { chiConHieuLuc: true, tim: "" };
    veLai();
    el = chon();
  }
  if (!el) return;
  const lo = el.closest(".hh-lo");
  const nut = lo?.querySelector<HTMLButtonElement>(".hh-loai-nut");
  if (nut && nut.getAttribute("aria-expanded") !== "true") nut.click();
  el.scrollIntoView({ block: "center" });
  el.classList.add("hh-nhay");
  window.setTimeout(() => el.classList.remove("hh-nhay"), 2400);
}
