// Trạng thái hệ thống dùng chung (đặc tả đợt 0, mục 6.1): 403, 404, thiếu mã, mất mạng chưa nạp, lỗi máy chủ, rỗng, đang tải.
// Chữ ở src/shared/trang-thai-he-thong-chu.ts; kiểu dáng ở public/app.css ("Thành phần chung v2"). Không nhập từ shell/orders (gói trang Đơn hàng không chứa tệp này).
import { CAU_403, CAU_404, CAU_404_PHU, CAU_MAT_MANG_CHUA_NAP, CAU_MAT_MANG_TIEU_DE, CAU_MAT_MANG_TU_THU, NHAN_THU_LAI, NHAN_VE_TRANG_DAU, cauLoiMayChu, cauThieuMa } from "../src/shared/trang-thai-he-thong-chu.ts";
import { h, type Child } from "./dom.ts";
import { icon, type IconName } from "./icons.ts";

export type LoaiTrangThai = "403" | "404" | "thieu-ma" | "mat-mang-chua-nap" | "loi-may-chu" | "rong" | "dang-tai";
export type KhuonXuong = "danh-sach" | "chi-tiet" | "bieu-mau" | "bang-dieu-khien" | "thiet-lap";

export interface TuyChonTrangThai {
  trangDau?: string;
  doiTuong?: string;
  trangCha?: { nhan: string; href: string };
  cau?: string;
  nut?: { nhan: string; khiBam: () => void };
  khuon?: KhuonXuong;
  thuLai?: () => void;
  loi?: unknown;
  hetGio?: boolean;
}

const HINH: Record<Exclude<LoaiTrangThai, "dang-tai">, IconName> = {
  "403": "lock",
  "404": "alertCircle",
  "thieu-ma": "alertCircle",
  "mat-mang-chua-nap": "history",
  "loi-may-chu": "alertCircle",
  rong: "minus",
};

/** Số dòng xương theo khuôn (chỉ để giữ chỗ; chiều cao dòng do CSS `--skel-*`). */
const SO_DONG: Record<KhuonXuong, number> = { "danh-sach": 6, "chi-tiet": 5, "bieu-mau": 5, "bang-dieu-khien": 4, "thiet-lap": 4 };

function nutHoacLienKet(nhan: string, o: { href?: string; khiBam?: () => void }): HTMLElement {
  if (o.href) return h("a", { class: "nut", "data-cap": "chinh", href: o.href }, nhan);
  return h("button", { class: "nut", "data-cap": "chinh", type: "button", onclick: () => o.khiBam?.() }, nhan);
}

function vo(loai: LoaiTrangThai, hinh: IconName, tieuDe: string, cauPhu: string | null, nut: HTMLElement | null, them: Child[] = []): HTMLElement {
  return h(
    "section",
    { class: "trang-thai", "data-loai": loai },
    h("div", { class: "vong" }, icon(hinh, 28)),
    h("h2", { class: "trang-thai-tieu-de" }, tieuDe),
    cauPhu && h("p", { class: "trang-thai-phu" }, cauPhu),
    ...them,
    nut,
  );
}

export function trangThaiHeThong(loai: LoaiTrangThai, o: TuyChonTrangThai = {}): HTMLElement {
  if (loai === "dang-tai") {
    const khuon = o.khuon ?? "danh-sach";
    const dong: Child[] = [];
    for (let i = 0; i < SO_DONG[khuon]; i++) dong.push(h("span", { class: "xuong", "data-khuon": khuon }));
    return h("section", { class: "trang-thai-xuong", "data-loai": "dang-tai", "aria-busy": "true" }, ...dong);
  }
  const veTrangDau = () => nutHoacLienKet(NHAN_VE_TRANG_DAU, { href: o.trangDau ?? "/" });
  const thuLai = () => nutHoacLienKet(NHAN_THU_LAI, { khiBam: o.thuLai });
  switch (loai) {
    case "403":
      return vo(loai, HINH[loai], CAU_403, null, veTrangDau());
    case "404":
      return vo(loai, HINH[loai], CAU_404, CAU_404_PHU, veTrangDau());
    case "thieu-ma": {
      const cha = o.trangCha;
      return vo(loai, HINH[loai], cauThieuMa(o.doiTuong ?? "mục này"), null, cha ? nutHoacLienKet(`Về ${cha.nhan}`, { href: cha.href }) : null);
    }
    case "mat-mang-chua-nap":
      return vo(loai, HINH[loai], CAU_MAT_MANG_TIEU_DE, CAU_MAT_MANG_CHUA_NAP, thuLai(), [h("p", { class: "trang-thai-phu" }, CAU_MAT_MANG_TU_THU)]);
    case "loi-may-chu":
      return vo(loai, HINH[loai], cauLoiMayChu(o.loi, o.hetGio === true), null, o.thuLai ? thuLai() : null);
    default: {
      // rong
      const n = o.nut;
      return vo("rong", HINH.rong, o.cau ?? "", null, n ? nutHoacLienKet(n.nhan, { khiBam: n.khiBam }) : null);
    }
  }
}

/** Vẽ trạng thái vào `main`, giữ vỏ; 403/404 thì không sáng mục nào ở thanh tab / thanh bên và bỏ ô tìm của thanh trên. */
export function trangThaiToanTrang(loai: "403" | "404" | "thieu-ma" | "mat-mang-chua-nap", o: TuyChonTrangThai = {}): HTMLElement {
  document.body.dataset.trangThai = loai;
  if (loai === "403" || loai === "404") {
    for (const id of ["#tabbar", "#sidebar"]) {
      for (const el of Array.from(document.querySelector(id)?.querySelectorAll("[aria-current]") ?? [])) el.removeAttribute("aria-current");
    }
  }
  for (const el of Array.from(document.querySelectorAll(".topbar-search"))) el.remove();
  const phanTu = trangThaiHeThong(loai, o);
  const main = document.querySelector("main");
  if (main) {
    main.setAttribute("tabindex", "-1");
    main.replaceChildren(phanTu);
    main.focus();
  }
  return phanTu;
}
