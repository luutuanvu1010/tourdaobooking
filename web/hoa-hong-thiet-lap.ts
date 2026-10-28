// Thẻ «Thiết lập» của trang «Hoa hồng đối tác»: (a) loại đối tác được hưởng hoa hồng và chính sách mỗi loại đang theo, (b) các chính sách hoa hồng dùng chung (bảng mức, áp dụng cho loại, tắt/bật).
// Trang không tính tiền, không chọn mức: số và lời đến từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts. Mọi nút ghi chỉ dựng cho người có `partner.commission.write` (máy chủ kiểm lại).
import { CAU_KHONG_CO_LOAI, CAU_KHONG_CO_MUC, CAU_KHONG_CO_MUC_TA, CAU_LOAI_CO_SAN, NHAN_LOAI_DA_TAT, chinhSachCuaLoai, nhanLoaiDoiTac, trangThaiDong } from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { ngayDayDu } from "../src/shared/vn-date";
import type { Api } from "./api";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { dauBang, dongMuc } from "./hoa-hong-bang";
import type { MoHop } from "./hoa-hong-hop";

const CAU_XEP_LOAI = "Xếp một đối tác vào loại: làm ở hồ sơ của đối tác trong Danh bạ (Quản trị, Toàn quyền).";
const CAU_CHUA_AP_DUNG = "Chưa áp dụng chính sách nào";

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
              const doi = h("button", { type: "button", class: "btn", "aria-label": `Đổi chính sách: ${l.ten}` }, "Đổi chính sách");
              doi.addEventListener("click", () => mo.doiChinhSach(cs.gan));
              const ngung = h("button", { type: "button", class: "btn", "aria-label": `Ngừng áp dụng: ${l.ten}` }, "Ngừng áp dụng");
              ngung.addEventListener("click", () => mo.ngungApDung(cs.gan));
              act.append(doi, ngung);
            }
          }
          return h(
            "li",
            { class: "hh-tl-dong", "data-loai": l.code },
            h("div", { class: "hh-tl-ten" }, h("strong", null, l.ten), nhan.nguon !== "" && h("span", { class: "badge badge-draft" }, nhan.nguon), nhan.trangThai !== "" && h("span", { class: "badge badge-cancelled" }, nhan.trangThai)),
            h("div", { class: "muted" }, cs ? `Chính sách ${cs.muc.ten} · áp dụng từ ${ngayDayDu(cs.gan.tuNgay)}` : CAU_CHUA_AP_DUNG),
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

function theChinhSach(m: Api.MucTaDto, d: DuLieuHoaHong, mo: MoHop, ghi: boolean): HTMLElement {
  const dangAp = m.gan.filter((g) => g.conHieuLuc);
  const riengN = d.mucTa.ganRieng.filter((g) => g.muc === m.code).length;
  const dongHien = m.dong.filter((r) => trangThaiDong(r, d.homNay) !== "DA_DONG");
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });
  const dau = h(
    "div",
    { class: "hh-tl-cs-dau" },
    h("h3", null, m.ten, " ", !m.dangBat && h("span", { class: "badge badge-cancelled" }, NHAN_LOAI_DA_TAT)),
    h("p", { class: "muted" }, dangAp.length > 0 ? `Đang áp dụng cho ${dangAp.length} loại: ${dangAp.map((g) => g.loai.ten).join(", ")}` : `Chưa áp dụng cho loại nào · ${riengN} đối tác dùng riêng`),
  );
  const the = h("article", { class: "hh-tl-cs", "data-muc": m.code }, dau);
  if (dongHien.length === 0) the.append(h("p", { class: "muted" }, CAU_KHONG_CO_MUC));
  else the.append(dauBang(), h("ul", { class: "hh-mrows" }, ...dongHien.map((r) => dongMuc(r, d, mo, ghi))));
  the.append(loiEl);
  if (ghi) {
    const act = h("div", { class: "actions" });
    if (m.dangBat) {
      const them = h("button", { type: "button", class: "btn" }, "＋ Thêm mức vào chính sách");
      them.addEventListener("click", () => mo.themMuc({ ai: { loai: "MUC", code: m.code } }));
      const adCs = h("button", { type: "button", class: "btn" }, "Áp dụng cho loại…");
      adCs.addEventListener("click", () => mo.apDungChinhSach(m));
      act.append(them, adCs);
    }
    const bt = m.dangBat ? { nhan: "Tắt", hd: "tat", ok: "Đã tắt chính sách." } : { nhan: "Bật", hd: "bat", ok: "Đã bật chính sách." };
    act.append(nutBatTat(bt.nhan, `${bt.nhan} chính sách: ${m.ten}`, `/api/pricing/muc-ta/${encodeURIComponent(m.code)}/${bt.hd}`, bt.ok, mo, loiEl));
    the.append(act);
    // Các lần áp dụng đang có: ngừng từng lần.
    if (dangAp.length > 0) {
      the.append(
        h(
          "ul",
          { class: "hh-tl-gan" },
          ...dangAp.map((g) => {
            const n = h("button", { type: "button", class: "btn", "aria-label": `Ngừng áp dụng: ${g.loai.ten}` }, "Ngừng áp dụng");
            n.addEventListener("click", () => mo.ngungApDung(g));
            return h("li", null, h("span", null, `${g.loai.ten} · từ ${ngayDayDu(g.tuNgay)}`), n);
          }),
        ),
      );
    }
  }
  return the;
}

function mucChinhSach(d: DuLieuHoaHong, mo: MoHop, ghi: boolean): HTMLElement {
  const muc = h("section", { class: "hh-muc" }, h("h2", { class: "hh-muc-ten" }, "Chính sách hoa hồng dùng chung"));
  if (d.mucTa.muc.length === 0) muc.append(h("p", { class: "muted" }, CAU_KHONG_CO_MUC_TA));
  else muc.append(...d.mucTa.muc.map((m) => theChinhSach(m, d, mo, ghi)));
  if (ghi) {
    const them = h("button", { type: "button", class: "btn" }, "＋ Thêm chính sách");
    them.addEventListener("click", () => mo.themChinhSach());
    muc.append(h("div", { class: "actions" }, them));
  }
  return muc;
}

/** Vẽ thẻ «Thiết lập» vào `goc`. */
export function veThietLap(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  replaceChildren(goc, mucLoai(d, mo, ghi), mucChinhSach(d, mo, ghi));
}
