// Thanh lọc DÙNG CHUNG của màn Kho vé điện tử (kế hoạch 16 việc 21/11/2026, Việc 4): ô tìm + hàng nút nhóm dịch vụ, CÙNG dáng với bộ chọn dịch vụ của bước nhập lô
// (web/catalog-picker.ts: lớp .catalog-tim / .catalog-hang / .catalog-nut-nhom, radiogroup, roving tabindex, mép phải mờ + «›», nút ‹ › khi rê chuột ở máy tính).
// Khác bộ chọn: tìm KHÔNG phân biệt dấu (luật src/shared/loc-dich-vu-kho.ts) và không có danh sách — trang tự lọc ba khối «Số vé còn», «Lô trong kho», «Lô đã huỷ gần đây».
// Gõ chữ: báo trang sau một nhịp ngắn (không gọi máy chủ ở mỗi phím); chạm nhóm: báo ngay. Không `innerHTML`.
import { BO_LOC_TRONG, cacNutNhom, dangLoc, type BoLocDv } from "../src/shared/loc-dich-vu-kho";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface ThanhLocDv {
  root: HTMLElement;
  /** Nhóm của danh mục (thứ tự máy chủ) và có cần nút «Chưa phân loại» không. Nhóm đang chọn không còn thì về «Tất cả» và báo trang. */
  datNhom(groups: readonly { code: string; name: string }[], coChuaPhanLoai: boolean): void;
  giaTri(): BoLocDv;
  /** Nút «Xoá lọc» cho khối lọc ra rỗng: đưa thanh về «Tất cả», xoá chữ tìm, báo trang. */
  nutXoaLoc(): HTMLElement;
}

const NHIP_GO_MS = 300;

export function taoThanhLocDv(o: { onDoi: (loc: BoLocDv) => void }): ThanhLocDv {
  let loc: BoLocDv = BO_LOC_TRONG;
  let henGo = 0;
  let nut: HTMLButtonElement[] = [];
  let khoaHang = ""; // các nút đang vẽ: trang gọi datNhom sau mỗi lần tải lại kho, không đổi thì không dựng lại (giữ chỗ cuộn, tiêu điểm)
  const goiY = "Tìm theo tên dịch vụ, mã hoặc tên in trên vé";
  const q = h("input", { id: "vk-loc-tim", class: "catalog-q", type: "search", placeholder: goiY, "aria-label": goiY, autocomplete: "off" }) as HTMLInputElement;
  const xoa = h("button", { type: "button", class: "catalog-tim-xoa", "aria-label": "Xoá chữ tìm", hidden: true }, icon("close", 20));
  const tim = h("div", { class: "catalog-tim" }, h("span", { class: "catalog-tim-kinh" }, icon("search", 20)), q, xoa);
  const cuon = h("div", { class: "catalog-hang-cuon", role: "radiogroup", "aria-label": "Nhóm dịch vụ" });
  const con = h("span", { class: "catalog-hang-con", "aria-hidden": "true", hidden: true }, "›");
  const muiTruoc = h("button", { type: "button", class: "catalog-hang-mui", "data-huong": "truoc", "aria-label": "Xem nhóm phía trước", tabindex: "-1", hidden: true }, "‹");
  const muiSau = h("button", { type: "button", class: "catalog-hang-mui", "data-huong": "sau", "aria-label": "Xem nhóm phía sau", tabindex: "-1", hidden: true }, "›");
  const hang = h("div", { class: "catalog-hang", "data-cho": "nhom", hidden: true }, cuon, con, muiTruoc, muiSau);
  const root = h("div", { class: "catalog vk-thanh-loc", "data-khoi": "thanh-loc-dv" }, tim, hang);

  const bao = (): void => o.onDoi(loc);
  function capNhatMep(): void {
    const max = cuon.scrollWidth - cuon.clientWidth;
    const conSau = max > 1 && cuon.scrollLeft < max - 1;
    con.hidden = !conSau;
    hang.classList.toggle("is-con-sau", conSau);
    muiSau.hidden = !conSau;
    muiTruoc.hidden = !(cuon.scrollLeft > 1);
  }
  /** Cuộn hàng nhóm (KHÔNG cuộn trang) để nút đang chọn nằm trọn trong tầm nhìn. */
  function duaVaoTam(b: HTMLElement | undefined): void {
    if (!b || hang.hidden || cuon.clientWidth === 0) return;
    const c = cuon.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    if (r.left < c.left) cuon.scrollLeft -= c.left - r.left;
    else if (r.right > c.right - con.offsetWidth) cuon.scrollLeft += r.right - c.right + con.offsetWidth;
    capNhatMep();
  }
  function veChon(): void {
    for (const b of nut) {
      const dung = (b.dataset.nhom ?? "") === loc.nhom;
      b.setAttribute("aria-checked", String(dung));
      b.tabIndex = dung ? 0 : -1;
    }
  }
  function chonNhom(ma: string, tieuDiem: boolean): void {
    const b = nut.find((x) => x.dataset.nhom === ma);
    if (tieuDiem) b?.focus({ preventScroll: true });
    duaVaoTam(b);
    if (ma === loc.nhom) return;
    loc = { ...loc, nhom: ma };
    veChon();
    bao();
  }
  cuon.addEventListener("scroll", capNhatMep, { passive: true });
  window.addEventListener("resize", capNhatMep);
  void document.fonts?.ready.then(capNhatMep);
  muiTruoc.addEventListener("click", () => cuon.scrollBy({ left: -cuon.clientWidth * 0.8, behavior: "smooth" }));
  muiSau.addEventListener("click", () => cuon.scrollBy({ left: cuon.clientWidth * 0.8, behavior: "smooth" }));
  cuon.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || nut.length === 0) return;
    e.preventDefault();
    const dangO = nut.indexOf(document.activeElement as HTMLButtonElement);
    let k = dangO >= 0 ? dangO : Math.max(0, nut.findIndex((b) => b.dataset.nhom === loc.nhom));
    if (e.key === "Home") k = 0;
    else if (e.key === "End") k = nut.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") k = Math.min(nut.length - 1, k + 1);
    else k = Math.max(0, k - 1);
    chonNhom(nut[k]?.dataset.nhom ?? "", true);
  });

  const doiChu = (ngay: boolean): void => {
    xoa.hidden = q.value === "";
    window.clearTimeout(henGo);
    const lam = (): void => {
      if (q.value === loc.tim) return;
      loc = { ...loc, tim: q.value };
      bao();
    };
    if (ngay) lam();
    else henGo = window.setTimeout(lam, NHIP_GO_MS);
  };
  q.addEventListener("input", () => doiChu(false));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doiChu(true); }
    if (e.key === "Escape" && q.value !== "") { e.preventDefault(); q.value = ""; doiChu(true); }
  });
  xoa.addEventListener("click", () => { q.value = ""; doiChu(true); q.focus(); });

  return {
    root,
    datNhom(groups, coChuaPhanLoai) {
      const ds = cacNutNhom(groups, coChuaPhanLoai);
      const khoa = JSON.stringify(ds);
      if (khoa === khoaHang) return;
      khoaHang = khoa;
      hang.hidden = ds.length === 0;
      nut = ds.map(({ ma, ten }) => {
        const b = h("button", { type: "button", class: "catalog-nut-nhom", role: "radio", "data-nhom": ma }, ten) as HTMLButtonElement;
        b.addEventListener("click", () => chonNhom(ma, false));
        return b;
      });
      replaceChildren(cuon, ...nut);
      const conNhom = loc.nhom === "" || ds.some((n) => n.ma === loc.nhom);
      if (!conNhom) loc = { ...loc, nhom: "" };
      veChon();
      duaVaoTam(nut.find((b) => b.dataset.nhom === loc.nhom));
      capNhatMep();
      if (!conNhom) bao();
    },
    giaTri: () => loc,
    nutXoaLoc() {
      const b = h("button", { type: "button", class: "btn", "data-action": "xoa-loc" }, "Xoá lọc");
      b.addEventListener("click", () => {
        window.clearTimeout(henGo);
        const coLoc = dangLoc(loc) || q.value !== "";
        q.value = "";
        xoa.hidden = true;
        loc = BO_LOC_TRONG;
        veChon();
        cuon.scrollLeft = 0;
        capNhatMep();
        if (coLoc) bao(); // không đưa tiêu điểm lên ô tìm: trên điện thoại sẽ bật bàn phím ảo
      });
      return b;
    },
  };
}
