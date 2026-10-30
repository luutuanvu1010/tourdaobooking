// Phần còn lại của bảng cũ (thẻ loại đã sang web/hoa-hong-loai.ts ở Task 9, thẻ đối tác sang web/hoa-hong-doi-tac.ts ở Task 10): `urlNgung`, dòng mức kiểu cũ `dongMuc` / `dauBang`
// và `cuonToiDong` — Task 11 dọn phần không còn dùng. Trang không tính tiền, không chọn mức: số và lời đến từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts.
// Nút ghi (Đổi, Ngừng, Sửa) chỉ hiện cho người có `partner.commission.write` (Sửa: thêm điều kiện không mang quyền Đối tác — ADR-0148; máy chủ kiểm lại).
import { coQuyenSua, nhanHieuLuc, nhanMucDto, nhanPhamVi, nutDoiNgung, nutSua, trangThaiDong, type BoLoc } from "../src/shared/hoa-hong-hien-thi";
import type { Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import type { MoHop } from "./hoa-hong-hop";
import { huyHieuTrangThai } from "./hoa-hong-lich-su";

// Trạng thái của `cuonToiDong` cũ. Từ Task 10 không khối nào ghi vào `cac` nữa (thẻ đối tác dùng `moDoiTac` / `cuonToiDongDoiTac` ở web/hoa-hong-doi-tac.ts), nên hàm thoát ngay; Task 11 xoá.
let loc: BoLoc = { chiConHieuLuc: true, tim: "" };
const cac = new Map<string, { goc: HTMLElement; veLai: () => void }>();
let duHienTai: DuLieuHoaHong | null = null;

export const urlNgung = (r: Api.CommissionRuleDto): string => `/api/pricing/hoa-hong/${encodeURIComponent(r.id)}/dong`;

/** «Đổi, Ngừng hoặc Sửa» / «Sửa» — tên các việc của một dòng cho nhãn đọc màn hình của vùng chạm (điện thoại). */
const noiViec = (viec: readonly string[]): string => (viec.length <= 1 ? (viec[0] ?? "") : `${viec.slice(0, -1).join(", ")} hoặc ${viec.at(-1)}`);

/** Một dòng mức: Dịch vụ · Mức · Hiệu lực · Trạng thái · (Đổi/Ngừng/Sửa). `hanhDong` false = dòng chỉ xem (mức của cấp). */
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
