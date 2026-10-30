// Thẻ «Loại đối tác» của trang «Hoa hồng đối tác» (đặc tả hoa-hong-cap-dai-ly §3 bảng vùng, §3.1, §4.2, §5.2). Mỗi loại một cụm `article[data-loai]`: tên, «Có sẵn», huy hiệu phủ mức (§4.2),
// phụ chú sắp áp, cấp đang theo (+ «Áp dụng từ») với Đổi cấp / Ngừng áp dụng / Sửa hoặc «Áp dụng cấp cho loại», mức riêng của loại (dòng mức mang `data-dong-id`), «Tắt» (hỏi lại) / «Bật».
// Trang không tính tiền, không chọn mức: trạng thái phủ do `phuMucLoai`, chữ và nhãn từ src/shared/hoa-hong-hien-thi.ts. Nút ghi chỉ dựng cho người có `partner.commission.write` (máy chủ kiểm lại).
import {
  CAU_CHUA_CO_MUC_LOAI,
  CAU_KHONG_CO_LOAI,
  CAU_KHONG_KHOP_LOC,
  CAU_LOAI_CHUA_CO_MUC_RIENG,
  CAU_LOAI_CHUA_THEO_CAP,
  CAU_LOAI_CO_SAN,
  CAU_NHAC_UU_TIEN,
  CAU_XEP_LOAI,
  NHAN_CAP_DA_KHOA,
  cauLoaiTheoCap,
  cauSapApLoai,
  chiaLanGan,
  chinhSachCuaLoai,
  coQuyenSua,
  hopTatLoai,
  huyHieuPhu,
  locBangLoai,
  nhanLoaiDoiTac,
  nhanViec,
  viecLanGan,
  type BoLoc,
} from "../src/shared/hoa-hong-hien-thi";
import { phuMucLoai, xepTheoPhu } from "../src/shared/hoa-hong-phu-muc";
import { can } from "../src/shared/permissions";
import type { Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { bangDongMuc, oViec } from "./hoa-hong-cap";
import type { MoHop } from "./hoa-hong-hop";
import { khoiLichSuGan } from "./hoa-hong-lich-su";
import { moViecKhac } from "./hoa-hong-menu";
import { icon } from "./icons";

const HINH = { xam: "ban", la: "checkCircle", do: "alertCircle", cat: "alertCircle" } as const;

/** Nút «Tắt» (hỏi lại bằng `hopTatLoai`) / «Bật» (không hỏi). Lỗi máy chủ hiện nguyên câu dưới cụm. */
function nutBatTat(nut: NonNullable<ReturnType<typeof nhanLoaiDoiTac>["nut"]>, ten: string, code: string, mo: MoHop, loiEl: HTMLElement): HTMLElement {
  const n = h("button", { type: "button", class: "nut", "data-cap": "phu", "aria-label": nut.ariaLabel }, nut.nhan);
  n.addEventListener("click", async () => {
    if (n.disabled) return;
    if (nut.hanhDong === "tat" && !(await hoiXacNhan({ ...hopTatLoai(ten), opener: n }))) return;
    n.disabled = true;
    loiEl.hidden = true;
    const loi = await mo.guiNhanh(`/api/pricing/loai-doi-tac/${encodeURIComponent(code)}/${nut.hanhDong}`, nut.hanhDong === "tat" ? "Đã tắt loại." : "Đã bật loại.");
    if (loi !== null) {
      n.disabled = false;
      loiEl.textContent = loi;
      loiEl.hidden = false;
    }
  });
  return n;
}

// Bộ lọc giữ qua các lần vẽ lại (ghi xong trang vẽ lại; ô tìm và trạng thái phải còn).
let loc: BoLoc = { chiConHieuLuc: true, tim: "" };
let hienTai: { noi: HTMLElement; ve: () => void; o: HTMLInputElement; tt: HTMLSelectElement } | null = null;

function cumLoai(it: { loai: DuLieuHoaHong["loai"][number]; dong: Api.CommissionRuleDto[]; ketQua: ReturnType<typeof phuMucLoai>["ketQua"]; sapApTu: string | null }, d: DuLieuHoaHong, mo: MoHop, ghi: boolean): HTMLElement {
  const { loai, ketQua, sapApTu, dong: dongLoai } = it;
  const nhan = nhanLoaiDoiTac(loai);
  const hh = huyHieuPhu(ketQua);
  const cs = chinhSachCuaLoai(d.mucTa, loai.code);
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });

  const dau = h("div", { class: "hh-loai-dau" }, h("h3", null, loai.ten), nhan.nguon !== "" && h("span", { class: "badge badge-draft" }, nhan.nguon), hh && h("span", { class: "huy-hieu", "data-tong": hh.tong }, icon(HINH[hh.tong], 14), hh.chu));
  if (ghi && nhan.nut) dau.append(nutBatTat(nhan.nut, loai.ten, loai.code, mo, loiEl));

  // Cấp đang theo.
  const dongCap = h("div", { class: "hh-loai-cap" });
  if (cs) {
    const sua = coQuyenSua(d.nguoiDung);
    const viec = oViec(loai.ten, viecLanGan(cs.gan, { homNay: d.homNay, ghi, sua, coDoi: true }), "gan", { DOI: () => mo.doiChinhSach(cs.gan), SUA: () => mo.suaApDung(cs.gan), NGUNG: () => mo.ngungApDung(cs.gan) });
    dongCap.append(h("span", null, cauLoaiTheoCap(cs.muc.ten, cs.gan.tuNgay)));
    if (!cs.muc.dangBat) dongCap.append(h("span", { class: "huy-hieu", "data-tong": "cat" }, icon("lock", 14), NHAN_CAP_DA_KHOA));
    if (viec) dongCap.append(viec);
  } else {
    dongCap.append(h("span", { class: "muted" }, CAU_LOAI_CHUA_THEO_CAP));
    const capMo = d.mucTa.muc.filter((m) => m.dangBat);
    if (ghi && capMo.length > 0) {
      const ad = h("button", { type: "button", class: "nut", "data-cap": "phu", "aria-label": `Chọn cấp cho loại này: ${loai.ten}` }, "Chọn cấp cho loại này");
      ad.addEventListener("click", () => moViecKhac({ tenDong: `Chọn cấp cho loại ${loai.ten}`, opener: ad, viec: capMo.map((m) => ({ nhan: m.ten, chay: () => mo.apDungChinhSach(m, loai.code) })) }));
      dongCap.append(ad);
    }
  }

  const lanGan = d.mucTa.muc.flatMap((m) => m.gan.filter((g) => g.loai.code === loai.code));
  const lichSu = khoiLichSuGan(chiaLanGan(lanGan, d.homNay).lichSu, d.homNay, (g) => g.muc.ten, `hh-ls-loai-${loai.code}`);
  const bang = bangDongMuc(dongLoai, null, d, ghi, mo, false);
  const them = ghi ? h("button", { type: "button", class: "nut", "data-cap": "phu" }, "＋ Thêm mức riêng cho loại này") : null;
  them?.addEventListener("click", () => mo.themMuc({ ai: { loai: "VAI", code: loai.code } }));

  return h(
    "article",
    { class: "the hh-loai-the", "data-loai": loai.code, "data-phu": ketQua.kieu },
    dau,
    sapApTu !== null && h("p", { class: "muted hh-loai-sap" }, cauSapApLoai(sapApTu)),
    ketQua.kieu === "KHONG_CO" && h("p", { class: "hh-cap-nhac" }, CAU_CHUA_CO_MUC_LOAI),
    dongCap,
    lichSu,
    h("h4", null, "Hoa hồng riêng của loại"),
    bang ? h("div", { class: "hh-muc-cap-khung" }, bang) : h("p", { class: "muted" }, CAU_LOAI_CHUA_CO_MUC_RIENG),
    them && h("div", { class: "hh-cap-nut" }, them),
    loiEl,
  );
}

/** Vẽ thẻ «Loại đối tác» vào `goc`. Thứ tự `xepTheoPhu`; loại tắt không còn dòng riêng vẫn hiện (trạng thái «Đã tắt»). */
export function veTheLoai(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const dau = h("div", { class: "hh-cap-dau" }, h("h2", { class: "hh-muc-ten" }, "Loại đối tác"));
  if (ghi) {
    const them = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "＋ Thêm loại");
    them.addEventListener("click", () => mo.themLoai());
    dau.append(them);
  }
  const tatCa = xepTheoPhu(d.loai.map((loai) => ({ loai, ten: loai.ten, ...phuMucLoai({ loai, dong: d.dong, muc: d.mucTa.muc, dichVu: d.dichVuPhu, homNay: d.homNay }) })));
  const o = h("input", { id: "hh-loc-tim-loai", type: "search", autocomplete: "off", placeholder: "Tìm loại hoặc dịch vụ", "aria-label": "Tìm loại hoặc dịch vụ", value: loc.tim });
  const tt = h("select", { id: "hh-loc-tt-loai", "aria-label": "Trạng thái" }, h("option", { value: "ap" }, "Đang và sắp áp dụng"), h("option", { value: "tat-ca" }, "Tất cả"));
  tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
  const noi = h("div", null);
  const ve = (): void => {
    o.value = loc.tim;
    tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
    const hien = locBangLoai(d.loai, d.dong, loc, d.homNay, d.ten);
    const ds = tatCa.flatMap((it) => {
      const x = hien.find((k) => k.loai.code === it.loai.code);
      return x ? [{ ...it, dong: x.dong }] : [];
    });
    replaceChildren(noi, d.loai.length === 0 ? h("p", { class: "muted" }, CAU_KHONG_CO_LOAI) : ds.length === 0 ? h("p", { class: "muted" }, CAU_KHONG_KHOP_LOC) : h("div", { class: "hh-loai-ds" }, ...ds.map((it) => cumLoai(it, d, mo, ghi))));
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
  hienTai = { noi, ve, o, tt };
  replaceChildren(
    goc,
    h(
      "section",
      { class: "hh-loai-vung" },
      dau,
      h("div", { class: "hh-loc" }, h("label", null, "Tìm", o), h("label", null, "Trạng thái", tt)),
      noi,
      h("p", { class: "hint" }, CAU_NHAC_UU_TIEN),
      ...(d.loai.some((l) => l.coSan) ? [h("p", { class: "hint" }, CAU_LOAI_CO_SAN)] : []),
      h("p", { class: "hint" }, CAU_XEP_LOAI),
    ),
  );
  ve();
}

/** Đưa bộ lọc của thẻ về mặc định («Đang và sắp áp dụng», ô tìm rỗng) và vẽ lại — `nhayToiDong` (web/hoa-hong.ts) gọi khi «Xem dòng ↓» không thấy dòng. */
export function datLaiLocLoai(): void {
  loc = { chiConHieuLuc: true, tim: "" };
  hienTai?.ve();
}
