// Khối «Loại đối tác được hưởng hoa hồng» (tạm, Task 8 → Task 9 thay bằng thẻ «Loại đối tác» mới): mỗi loại kèm cấp đại lý đang theo, nút Tắt / Bật loại, Đổi cấp, Ngừng áp dụng,
// Sửa, và «＋ Thêm loại». Phần các cấp đại lý đã chuyển sang thẻ «Các cấp đại lý» (web/hoa-hong-cap.ts).
// Trang không tính tiền, không chọn mức: số và lời đến từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts. Mọi nút ghi chỉ dựng cho người có `partner.commission.write` (máy chủ kiểm lại).
import { CAU_KHONG_CO_LOAI, CAU_LOAI_CO_SAN, chinhSachCuaLoai, coQuyenSua, nhanLoaiDoiTac, nutSua } from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { ngayDayDu } from "../src/shared/vn-date";
import type { Api } from "./api";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import type { MoHop } from "./hoa-hong-hop";

const CAU_XEP_LOAI = "Xếp một đối tác vào loại: làm ở hồ sơ của đối tác trong Danh bạ (Quản trị, Toàn quyền).";
const CAU_CHUA_AP_DUNG = "Chưa áp dụng cấp đại lý nào";

/** Nút Tắt / Bật: gửi lệnh một bước; lỗi của máy chủ hiện nguyên câu ngay dưới nút. */
function nutBatTat(nhan: string, ariaLabel: string, path: string, ok: string, mo: MoHop, loiEl: HTMLElement): HTMLElement {
  const n = h("button", { type: "button", class: "btn", "aria-label": ariaLabel }, nhan);
  n.addEventListener("click", async () => {
    if (n.disabled) return;
    n.disabled = true;
    loiEl.hidden = true;
    const loi = await mo.guiNhanh(path, ok);
    if (loi !== null) {
      n.disabled = false;
      loiEl.textContent = loi;
      loiEl.hidden = false;
    }
  });
  return n;
}

/** Nút «Sửa» một lần áp dụng cấp đại lý cho loại (ADR-0148 Đ1). Nơi gọi đã hỏi `coQuyenSua` + `nutSua`. */
function nutSuaGan(g: Api.GanLoaiMucDto, mo: MoHop): HTMLElement {
  const n = h("button", { type: "button", class: "btn", "aria-label": `Sửa áp dụng cấp: ${g.loai.ten}` }, "Sửa");
  n.addEventListener("click", () => mo.suaApDung(g));
  return n;
}

function mucLoai(d: DuLieuHoaHong, mo: MoHop, ghi: boolean): HTMLElement {
  const muc = h("section", { class: "hh-muc" }, h("h2", { class: "hh-muc-ten" }, "Loại đối tác được hưởng hoa hồng"));
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });
  if (d.loai.length === 0) muc.append(h("p", { class: "muted" }, CAU_KHONG_CO_LOAI));
  else {
    muc.append(
      h(
        "ul",
        { class: "hh-tl-loai" },
        ...d.loai.map((l) => {
          const nhan = nhanLoaiDoiTac(l);
          const cs = chinhSachCuaLoai(d.mucTa, l.code);
          const act = h("div", { class: "hh-m-act hh-tl-act" });
          if (ghi) {
            if (nhan.nut) act.append(nutBatTat(nhan.nut.nhan, nhan.nut.ariaLabel, `/api/pricing/loai-doi-tac/${encodeURIComponent(l.code)}/${nhan.nut.hanhDong}`, nhan.nut.hanhDong === "tat" ? "Đã tắt loại." : "Đã bật loại.", mo, loiEl));
            if (cs) {
              const doi = h("button", { type: "button", class: "btn", "aria-label": `Đổi cấp: ${l.ten}` }, "Đổi cấp");
              doi.addEventListener("click", () => mo.doiChinhSach(cs.gan));
              const ngung = h("button", { type: "button", class: "btn", "aria-label": `Ngừng áp dụng: ${l.ten}` }, "Ngừng áp dụng");
              ngung.addEventListener("click", () => mo.ngungApDung(cs.gan));
              act.append(doi, ngung);
              if (coQuyenSua(d.nguoiDung) && nutSua(cs.gan, d.homNay)) act.append(nutSuaGan(cs.gan, mo));
            }
          }
          return h(
            "li",
            { class: "hh-tl-dong", "data-loai": l.code },
            h("div", { class: "hh-tl-ten" }, h("strong", null, l.ten), nhan.nguon !== "" && h("span", { class: "badge badge-draft" }, nhan.nguon), nhan.trangThai !== "" && h("span", { class: "badge badge-cancelled" }, nhan.trangThai)),
            h("div", { class: "muted" }, cs ? `Cấp ${cs.muc.ten} · áp dụng từ ${ngayDayDu(cs.gan.tuNgay)}` : CAU_CHUA_AP_DUNG),
            act,
          );
        }),
      ),
    );
  }
  muc.append(loiEl, ...(d.loai.some((l) => l.coSan) ? [h("p", { class: "hint" }, CAU_LOAI_CO_SAN)] : []), h("p", { class: "hint" }, CAU_XEP_LOAI));
  if (ghi) {
    const them = h("button", { type: "button", class: "btn" }, "＋ Thêm loại");
    them.addEventListener("click", () => mo.themLoai());
    muc.append(h("div", { class: "actions" }, them));
  }
  return muc;
}

/** Vẽ khối «Loại đối tác được hưởng hoa hồng» vào `goc` (tạm đứng trong thẻ «Loại đối tác», dưới bảng; Task 9 thay). */
export function veThietLap(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  replaceChildren(goc, mucLoai(d, mo, can(d.nguoiDung, "partner.commission.write")));
}
