// Lịch xe bận (/lich-xe-ban — ADR-0055 VK2-A; kế hoạch Đợt 3 Task 10). Khuôn Danh sách của khung gốc (ADR-0222): khối rộng từ 800 là bảng
// hàng = xe, cột = 7 ngày; hẹp hơn là danh sách dòng theo xe (mỗi dòng liệt kê ngày bận); form "Thêm lịch bận" mở tại chỗ; ✕ trên thẻ = RÚT có hỏi + gửi version (ADR-0055 A1: chỉ-thêm, rút một lần — không xoá).
// Chỉ Quản trị + Toàn quyền (ô vehicle.manage — câu 3.4): máy chủ trả 403 cho người khác; màn hiện câu của máy chủ (khuôn trang Xe).
// Chuyến đã xếp (câu 3.1) chỉ mã CX-… + giờ, bấm mở Chi tiết chuyến, không ✕. Luật hiển thị thuần: src/shared/khung-ban-hien-thi.ts (tuần theo ngày VN).
import { can } from "../src/shared/permissions";
import { cauHoiRut, cauLoiChongChuyen, docFormKhungBan, luoiTuanXeBan, tuanXem, type FormKhungBan, type MucO } from "../src/shared/khung-ban-hien-thi";
import { vnToday } from "../src/shared/vn-date";
import { api, ApiError, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { chip, dai } from "./dieu-phoi-ui";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { luoi, thanhNut, truong } from "./khung";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const subEl = byId("xb-sub");
const navEl = byId("xb-nav");
const themBtn = byId<HTMLButtonElement>("xb-them");
const baoEl = byId("xb-bao");
const formEl = byId<HTMLFormElement>("xb-form");
const emptyEl = byId("xb-empty");
const theEl = byId("xb-the");
const bangEl = byId("xb-bang");
const dauEl = byId("xb-dau");
const luoiEl = byId("xb-luoi");
const dsEl = byId("xb-ds");
const chuThichEl = byId("xb-chu-thich");

const homNay = vnToday(new Date());
let tu = tuanXem(new URLSearchParams(location.search).get("tu"), homNay).tu;
let duLieu: Api.LichXeBanResponse | null = null;

const staff = await initShell();
ganDaiTrangAnhEm("/lich-xe-ban", staff);
datCrumb("Vận chuyển", "Lịch xe bận");
const quanLy = can(staff, "vehicle.manage");

function bao(el: HTMLElement | null): void {
  replaceChildren(baoEl, ...(el ? [el] : []));
  baoEl.hidden = !el;
}

async function nap(): Promise<void> {
  showError(errorEl, null);
  try {
    duLieu = await api<Api.LichXeBanResponse>(`/api/van-chuyen/ban-xe?tu=${encodeURIComponent(tu)}`);
    tu = duLieu.tu;
    history.replaceState(null, "", tu === tuanXem(null, homNay).tu ? "/lich-xe-ban" : `/lich-xe-ban?tu=${tu}`);
    ve();
  } catch (err) {
    // 403 (người không quản lý xe), lỗi tải: khối chặn + câu của máy chủ (khuôn trang Xe); ẩn lưới, ẩn nút.
    navEl.hidden = true;
    theEl.hidden = true;
    chuThichEl.hidden = true;
    formEl.hidden = true;
    showError(errorEl, loiCua(err));
  }
}

// ---- lưới tuần ------------------------------------------------------------------------------------------------------------------------------------------
function theMuc(m: MucO, ngay: string): HTMLElement {
  if (m.loai === "CHUYEN") {
    return h("a", { class: "xb-muc is-chuyen", href: m.href ?? "#", "aria-label": `Chuyến ${m.nhan} ${m.gio}` }, h("div", { class: "xb-muc-gio" }, m.gio), h("div", { class: "xb-muc-nhan" }, m.nhan));
  }
  const x = m.rutDuoc && quanLy ? h("button", { type: "button", class: "xb-x", "aria-label": `Rút lịch bận ${m.nhan} ${m.gio}`, "data-action": "rut" }, icon("close", 14, 2)) : null;
  x?.addEventListener("click", () => moRut(m, ngay, x));
  return h("div", { class: "xb-muc", "data-khung": m.id }, h("div", { class: "xb-muc-gio" }, m.gio), h("div", { class: "xb-muc-nhan" }, m.nhan), x);
}

/** Tên thứ viết thường chữ đầu («THỨ 2» → «Thứ 2»; «CN» giữ nguyên) — nhãn cột bảng chữ thường (ADR-0234). */
const thuThuong = (thu: string): string => (thu === "CN" ? thu : thu.charAt(0) + thu.slice(1).toLowerCase());

function ve(): void {
  const v = duLieu!;
  const g = luoiTuanXeBan(v, homNay, Date.now());
  replaceChildren(subEl, `${tuanXem(v.tu, homNay).nhan} · ${g.soLichBan} lịch bận`);
  navEl.hidden = false;
  theEl.hidden = false;
  themBtn.hidden = !quanLy || v.xe.length === 0;
  emptyEl.hidden = v.xe.length > 0;
  bangEl.hidden = v.xe.length === 0;
  dsEl.hidden = v.xe.length === 0;
  // Bảng (khối từ 800): hàng = xe, cột = bảy ngày; cột hôm nay có tên in đậm.
  replaceChildren(
    dauEl,
    h("th", null, "Xe"),
    ...g.ngay.map((n) => {
      const ten = [thuThuong(n.thu), h("span", { class: "o-phu" }, n.nhan)];
      return h("th", { "aria-current": n.homNay ? "date" : undefined }, n.homNay ? h("strong", null, ...ten) : ten[0]!, n.homNay ? null : ten[1]!);
    }),
    // Cột cuối trống: cột cuối của bảng khung canh phải và không xuống dòng — để cột Chủ nhật xuống dòng như các ngày khác.
    h("th", null, ""),
  );
  const oXe = (r: (typeof g.hang)[number]): HTMLElement[] =>
    [h("span", null, r.bienSo), h("span", { class: "o-phu" }, r.soChoNhan), r.trangThaiNhan ? h("span", null, chip(r.trangThaiNhan, "warn")) : null].filter((x): x is HTMLElement => x !== null);
  replaceChildren(
    luoiEl,
    ...g.hang.map((r) => h("tr", { "data-xe": r.xeId }, h("td", { "data-gon": "" }, ...oXe(r)), ...r.o.map((muc, i) => h("td", null, ...muc.map((m) => theMuc(m, g.ngay[i]!.k)))), h("td", null, ""))),
  );
  // Danh sách dòng (khối hẹp hơn 800): mỗi xe một dòng, liệt kê những ngày có lịch bận hoặc chuyến.
  replaceChildren(
    dsEl,
    ...g.hang.map((r) =>
      h(
        "div",
        { class: "dong", "data-xe": r.xeId },
        h(
          "div",
          { class: "dong-chu" },
          ...oXe(r),
          ...r.o.flatMap((muc, i) => (muc.length ? [h("div", { class: "hang" }, h("span", { class: "o-phu" }, `${thuThuong(g.ngay[i]!.thu)} ${g.ngay[i]!.nhan}`), ...muc.map((m) => theMuc(m, g.ngay[i]!.k)))] : [])),
        ),
      )),
  );
  replaceChildren(
    chuThichEl,
    h("span", { class: "xb-lg" }, h("span", { class: "xb-lg-o" }), "Xe bận · ô trống là xe rảnh"),
    " ",
    v.chuyen.length > 0 ? h("span", { class: "xb-lg" }, h("span", { class: "xb-lg-o is-chuyen" }), "Chuyến đã xếp") : null,
  );
  chuThichEl.hidden = v.xe.length === 0;
}

// ---- rút (✕) --------------------------------------------------------------------------------------------------------------------------------------------
function moRut(m: MucO, ngay: string, opener: HTMLElement): void {
  const loi = h("div", { class: "truong-loi", role: "alert", hidden: true });
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "phu" }, "Đóng");
  const rut = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "nguy-hiem", "data-action": "rut-xac-nhan" }, "Rút");
  const bang = moBangTruot({ title: "Rút lịch bận", body: [h("p", null, cauHoiRut(m, ngay, homNay)), loi], foot: [dong, rut], footClass: "vc-foot-2", opener });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  rut.addEventListener("click", async () => {
    bang.setBusy(true);
    const k = duLieu?.khung.find((x) => x.id === m.id);
    try {
      await api<Api.KhungBanXeListResponse>(`/api/van-chuyen/xe/${encodeURIComponent(k?.xeId ?? "")}/ban/${encodeURIComponent(m.id)}/rut`, { method: "POST", body: { version: m.version } });
      bang.close(false);
      bao(dai("ok", `Đã rút lịch bận ${m.nhan}`, ["Xe xếp chuyến được trong giờ này."]));
      await nap();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "khung_ban_vua_doi_route" || err.code === "khung_ban_da_qua" || err.code === "khung_ban_vua_doi")) {
        bang.close(false);
        bao(dai("warning", err.message, [], () => void nap()));
        await nap();
        return;
      }
      bang.setBusy(false);
      replaceChildren(loi, icon("alert", 16, 2), loiCua(err));
      loi.hidden = false;
    }
  });
}

// ---- form "Thêm lịch bận" ---------------------------------------------------------------------------------------------------------------------------------
function moForm(): void {
  const v = duLieu!;
  bao(null);
  const ngayMacDinh = tu <= homNay && homNay <= tuanXem(tu, homNay).den ? homNay : tu;
  const oTruong = (id: string, nhan: string, o: HTMLElement): { el: HTMLElement; loi: HTMLElement } => {
    const loi = h("div", { id: `${id}-loi`, class: "truong-loi", role: "alert", hidden: true });
    o.setAttribute("aria-describedby", `${id}-loi`);
    return { el: truong(nhan, o, { cot: 4, loi }), loi };
  };
  const selXe = h("select", { id: "xb-xe", class: "o" }, ...v.xe.map((x) => h("option", { value: x.id }, `${x.bienSo} · Xe ${x.soCho} chỗ`))) as HTMLSelectElement;
  const oNgay = h("input", { id: "xb-ngay", class: "o", type: "date", value: ngayMacDinh }) as HTMLInputElement;
  const oDenNgay = h("input", { id: "xb-den-ngay", class: "o", type: "date", value: ngayMacDinh }) as HTMLInputElement;
  const oTu = h("input", { id: "xb-tu", class: "o", type: "time", value: "07:00" }) as HTMLInputElement;
  const oDen = h("input", { id: "xb-den", class: "o", type: "time", value: "17:00" }) as HTMLInputElement;
  const selLyDo = h("select", { id: "xb-ly-do", class: "o" }, h("option", { value: "" }, "Chọn lý do"), ...v.lyDo.map((l) => h("option", { value: l.code }, l.label))) as HTMLSelectElement;
  // "Đến ngày" mặc định bằng "Ngày" (câu 3.3): đổi Ngày khi Đến ngày đang trùng Ngày cũ thì kéo theo.
  let ngayCu = oNgay.value;
  oNgay.addEventListener("change", () => {
    if (oDenNgay.value === ngayCu || oDenNgay.value < oNgay.value) oDenNgay.value = oNgay.value;
    ngayCu = oNgay.value;
  });
  const t = {
    xeId: oTruong("xb-xe", "Xe", selXe), ngay: oTruong("xb-ngay", "Ngày", oNgay), denNgay: oTruong("xb-den-ngay", "Đến ngày", oDenNgay),
    tuGio: oTruong("xb-tu", "Từ", oTu), denGio: oTruong("xb-den", "Đến", oDen), lyDo: oTruong("xb-ly-do", "Lý do", selLyDo),
  };
  const o: Record<keyof FormKhungBan, HTMLElement> = { xeId: selXe, ngay: oNgay, denNgay: oDenNgay, tuGio: oTu, denGio: oDen, lyDo: selLyDo };
  const luu = h("button", { type: "submit", class: "nut", "data-cap": "chinh", "data-action": "luu-khung" }, "Lưu");
  const dong = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Đóng");
  const loiChung = h("div", { class: "alert xb-form-loi", role: "alert", hidden: true });
  replaceChildren(formEl, luoi(null, t.xeId.el, t.ngay.el, t.denNgay.el, t.tuGio.el, t.denGio.el, t.lyDo.el), loiChung, thanhNut(null, luu, dong));
  formEl.hidden = false;
  themBtn.setAttribute("aria-expanded", "true");
  themBtn.setAttribute("data-cap", "phu"); // form mở: nút nền đặc là «Lưu» trong form (tối đa một nút nền đặc mỗi màn — ADR-0234 Đ4)
  selXe.focus();
  dong.addEventListener("click", dongForm);
  const xoaLoi = () => {
    for (const k of Object.keys(t) as (keyof FormKhungBan)[]) {
      t[k].loi.hidden = true;
      o[k].removeAttribute("aria-invalid");
    }
    loiChung.hidden = true;
  };
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    xoaLoi();
    const r = docFormKhungBan({ xeId: selXe.value, ngay: oNgay.value, denNgay: oDenNgay.value, tuGio: oTu.value, denGio: oDen.value, lyDo: selLyDo.value }, Date.now());
    if (!r.ok) {
      for (const [k, cau] of Object.entries(r.loi) as [keyof FormKhungBan, string][]) {
        replaceChildren(t[k].loi, cau);
        t[k].loi.hidden = false;
        o[k].setAttribute("aria-invalid", "true");
      }
      return;
    }
    luu.setAttribute("disabled", "");
    try {
      await api<Api.KhungBanXeListResponse>(`/api/van-chuyen/xe/${encodeURIComponent(r.xeId)}/ban`, { method: "POST", body: r.value });
      dongForm();
      const xe = v.xe.find((x) => x.id === r.xeId);
      bao(dai("ok", `Đã thêm lịch bận cho xe ${xe?.bienSo ?? ""}`, ["Trong giờ này máy không cho xếp chuyến cho xe."]));
      tu = tuanXem(r.value.batDau.ngay, homNay).tu;
      await nap();
    } catch (err) {
      luu.removeAttribute("disabled");
      if (err instanceof ApiError && err.code === "khung_ban_chong_chuyen") {
        const e2 = err.details as Api.KhungBanChongChuyenLoi["error"];
        replaceChildren(loiChung, cauLoiChongChuyen(e2), h("ul", null, ...e2.chuyen.map((c) => h("li", null, `${c.ma} — ${c.gio}`))));
      } else {
        replaceChildren(loiChung, loiCua(err));
        if (err instanceof ApiError && (err.code === "khung_ban_chong_chuyen_csdl" || err.code === "khung_ban_vua_doi")) void nap();
      }
      loiChung.hidden = false;
    }
  };
}
function dongForm(): void {
  formEl.hidden = true;
  formEl.onsubmit = null;
  replaceChildren(formEl);
  themBtn.setAttribute("aria-expanded", "false");
  themBtn.setAttribute("data-cap", "chinh");
  themBtn.focus();
}

themBtn.setAttribute("aria-controls", "xb-form");
themBtn.setAttribute("aria-expanded", "false");
themBtn.addEventListener("click", () => (formEl.hidden ? moForm() : dongForm()));
byId("xb-truoc").addEventListener("click", () => {
  tu = tuanXem(tu, homNay).truoc;
  void nap();
});
byId("xb-sau").addEventListener("click", () => {
  tu = tuanXem(tu, homNay).sau;
  void nap();
});
byId("xb-nay").addEventListener("click", () => {
  tu = tuanXem(null, homNay).tu;
  void nap();
});
await nap();
