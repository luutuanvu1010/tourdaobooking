// «Tra nhanh» ở đầu trang, đứng trên ba thẻ: chọn một đối tác (hoặc một loại đối tác) + một dịch vụ + một ngày, máy chủ trả mức nào áp và lý do (GET /api/pricing/thu-tra).
// Trang không tính tiền, không chọn mức: số to là `nhanMucDto` của dòng máy chủ trả, câu nguồn là `cauThuTra` (12 bậc). Máy tính: khối nằm sẵn trong thẻ; điện thoại (< 641px): nút mở hộp trượt.
import {
  CAU_TRA_THEO_LOAI,
  cauThuTra,
  coTheTimDoiTac,
  nhanMucDto,
  thuTraThieuMuc,
} from "../src/shared/hoa-hong-hien-thi";
import { api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { lyDoLoi, taoChonDichVu } from "./so-dai-ly-ui";

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

type Chon = { kieu: "loai"; code: string; ten: string } | { kieu: "doi-tac"; partyId: string; ten: string };
let dem = 0;

function dungForm(d: DuLieuHoaHong, cuonToi: (dongId: string, loai?: string) => void, truocKhiCuon: () => void): HTMLElement {
  const id = `hh-tn${++dem}`;
  const duocTimTen = coTheTimDoiTac(d.nguoiDung);
  let chon: Chon | null = null;
  let hen: number | undefined;
  let stt = 0;

  const o = h("input", { id: `${id}-ai`, type: "search", autocomplete: "off", placeholder: duocTimTen ? "Gõ tên đối tác hoặc chọn loại" : "Chọn loại đối tác", "aria-label": "Đối tác hoặc loại đối tác" });
  const goiY = h("div", { class: "hh-tim-ket-qua", "aria-live": "polite" });
  const daChon = h("p", { class: "hh-da-chon", hidden: true });
  const loiAi = h("p", { class: "field-error", role: "alert", hidden: true });
  const dv = taoChonDichVu(d.dm, `${id}-dv`);
  const loiDv = h("p", { class: "field-error", role: "alert", hidden: true });
  const ngay = h("input", { id: `${id}-ngay`, type: "date", value: d.homNay });
  const loiNgay = h("p", { class: "field-error", role: "alert", hidden: true });
  const tra = h("button", { type: "submit", class: "btn btn-primary" }, "Tra");
  const ketQua = h("div", { class: "hh-tn-ket-qua", "aria-live": "polite" });

  const loaiBat = d.loai.filter((l) => l.dangBat);
  function veGoiY(timDoiTac: Api.NguoiHuongTimResponse["ketQua"] | string | null): void {
    const q = chuanTim(o.value);
    const loai = loaiBat.filter((l) => q === "" || chuanTim(l.ten).includes(q));
    const nut = (nhan: string, c: Chon): HTMLElement => {
      const b = h("button", { type: "button", class: "btn", "data-goi-y": c.kieu }, nhan);
      b.addEventListener("click", () => datChon(c));
      return b;
    };
    replaceChildren(
      goiY,
      ...loai.map((l) => nut(`Loại: ${l.ten}`, { kieu: "loai", code: l.code, ten: l.ten })),
      ...(Array.isArray(timDoiTac) ? timDoiTac.map((k) => nut(`${k.ten} · ${k.loai === "PERSON" ? "Cá nhân" : "Tổ chức"}`, { kieu: "doi-tac", partyId: k.partyId, ten: k.ten })) : []),
      typeof timDoiTac === "string" && h("p", { class: "field-error" }, timDoiTac),
      Array.isArray(timDoiTac) && timDoiTac.length === 0 && loai.length === 0 && h("p", { class: "muted" }, "Không thấy đối tác hay loại nào."),
    );
  }
  function veDaChon(): void {
    o.hidden = chon !== null;
    goiY.hidden = chon !== null;
    daChon.hidden = chon === null;
    if (chon === null) {
      replaceChildren(daChon);
      return;
    }
    const bo = h("button", { type: "button", class: "btn btn-link" }, "Bỏ chọn");
    bo.addEventListener("click", () => {
      chon = null;
      o.value = "";
      veDaChon();
      veGoiY(null);
      o.focus();
    });
    replaceChildren(daChon, chon.kieu === "loai" ? "Loại đối tác: " : "Đối tác: ", h("strong", null, chon.ten), " · ", bo);
  }
  function datChon(c: Chon): void {
    chon = c;
    loiAi.hidden = true;
    veDaChon();
  }
  async function timTen(): Promise<void> {
    const mine = ++stt;
    const q = o.value.trim();
    if (q === "") return veGoiY(null);
    try {
      const r = await api<Api.NguoiHuongTimResponse>(`/api/pricing/nguoi-huong?q=${encodeURIComponent(q)}`);
      if (mine === stt) veGoiY(r.ketQua);
    } catch (err) {
      if (mine === stt) veGoiY(lyDoLoi(err));
    }
  }
  o.addEventListener("input", () => {
    veGoiY(null);
    if (!duocTimTen) return;
    window.clearTimeout(hen);
    hen = window.setTimeout(() => void timTen(), 300);
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  // Gợi ý loại chỉ hiện khi ô được chạm hoặc gõ (không dựng sẵn cả cột lúc trang mở).
  o.addEventListener("focus", () => veGoiY(null));
  veDaChon();

  const form = h(
    "form",
    { class: "hh-tn-form", novalidate: true },
    h("div", { class: "hh-truong" }, h("span", { class: "hh-truong-nhan" }, "Đối tác hoặc loại đối tác"), o, goiY, daChon, loiAi),
    h("div", { class: "hh-truong" }, h("span", { class: "hh-truong-nhan" }, "Dịch vụ"), dv.root, loiDv),
    h("div", null, h("label", null, "Ngày", ngay), loiNgay),
    h("div", { class: "actions" }, tra),
    ketQua,
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (tra.disabled) return;
    loiAi.textContent = "Chọn một đối tác hoặc một loại đối tác.";
    loiAi.hidden = chon !== null;
    loiDv.textContent = "Chọn một dịch vụ.";
    loiDv.hidden = dv.ma() !== "";
    loiNgay.textContent = "Chọn ngày.";
    loiNgay.hidden = ngay.value !== "";
    if (chon === null || dv.ma() === "" || ngay.value === "") return;
    const q = new URLSearchParams({ dichVu: dv.ma(), ngay: ngay.value });
    if (chon.kieu === "loai") q.set("loai", chon.code);
    else q.set("doiTac", chon.partyId);
    tra.disabled = true;
    replaceChildren(ketQua, h("p", { class: "muted" }, "Đang tra…"));
    try {
      const r = await api<Api.ThuTraResponse>(`/api/pricing/thu-tra?${q.toString()}`);
      const k = r.ketQua;
      const xem = k.trangThai === "SET" ? h("button", { type: "button", class: "btn btn-link", "data-xem-dong": k.muc.id }, "Xem dòng ↓") : null;
      const dongId = k.trangThai === "SET" ? k.muc.id : "";
      const loaiDangTra = chon.kieu === "loai" ? chon.code : undefined;
      xem?.addEventListener("click", () => {
        truocKhiCuon();
        cuonToi(dongId, loaiDangTra);
      });
      replaceChildren(
        ketQua,
        h(
          "div",
          { class: thuTraThieuMuc(r) ? "hh-tn-kq is-thieu" : "hh-tn-kq" },
          k.trangThai === "SET" && h("div", { class: "hh-tn-so" }, nhanMucDto(k.muc)),
          h("div", null, h("p", { class: "hh-ket-qua" }, cauThuTra(r)), r.theoLoai && h("p", { class: "muted" }, CAU_TRA_THEO_LOAI), xem),
        ),
      );
    } catch (err) {
      replaceChildren(ketQua, h("p", { class: "field-error" }, lyDoLoi(err)));
    } finally {
      tra.disabled = false;
    }
  });
  return form;
}

/** Vẽ «Tra nhanh» vào `goc`: khối nằm sẵn (máy tính) hoặc nút mở hộp trượt (điện thoại). `cuonToi(dongId)` cuộn tới dòng mức trong bảng và mở cụm chứa nó. */
export function veTraNhanh(goc: HTMLElement, d: DuLieuHoaHong, cuonToi: (dongId: string, loai?: string) => void): void {
  if (window.matchMedia("(max-width: 640px)").matches) {
    const nut = h("button", { type: "button", class: "btn hh-tn-nut", id: "hh-tra-nhanh-nut" }, "Tra nhanh");
    nut.addEventListener("click", () => {
      let dong: (() => void) | null = null;
      const form = dungForm(d, cuonToi, () => dong?.());
      const dongNut = h("button", { type: "button", class: "btn" }, "Đóng");
      const sheet = moBangTruot({ title: "Tra nhanh", body: [form], foot: [dongNut], opener: nut });
      if (!sheet) return;
      dong = () => sheet.close(false);
      dongNut.addEventListener("click", () => sheet.close());
    });
    replaceChildren(goc, nut);
    return;
  }
  replaceChildren(goc, h("section", { class: "card hh-tra-nhanh", "aria-label": "Tra nhanh" }, h("h2", null, "Tra nhanh"), dungForm(d, cuonToi, () => undefined)));
}
