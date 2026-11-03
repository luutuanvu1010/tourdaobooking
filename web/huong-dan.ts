// Thẻ Hướng dẫn của Hỗ trợ (bản vẽ Hỗ trợ › Hướng dẫn 3/11/2026; đặc tả docs/superpowers/specs/2026-11-03-huong-dan-muc-rieng/DAC-TA.md). Địa chỉ: /huong-dan (danh sách),
// ?bai=<id>[&doan=<khối>] (một bài), ?vai-tro=<mã quyền> (Quản trị xem bài của vai trò khác), ?the=1 (đừng tự chuyển sang «Yêu cầu của tôi»), ?from=<trang> (trang đi từ đâu, kèm vào yêu cầu).
// Chữ nằm trong gói trang nên đọc và tìm được khi mất mạng; tìm chạy trên máy, chỉ trong bài người xem thấy. Giao diện chỉ ẩn/hiện: chữ hướng dẫn không nhạy cảm (luật 30/9).
import { baiBatDau, danhSach, khucTo, moiBai, tachTuTim, timBai, trongDanhSach, vuaDoi, type BaiHien, type DanhSachHuongDan, type KetQuaBai, type NhomViec, type PhanVai } from "../src/shared/huong-dan-bai";
import type { DoanChu, Khoi } from "../src/shared/huong-dan";
import { can, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "../src/shared/permissions";
import { KHOA_GOI_Y_GUI, NHAN_TAB, NHAN_THE_HUONG_DAN, tabHoTro, type TabHoTro } from "../src/shared/ve-ho-tro-hien-thi";
import { api, type Api, type Staff } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { icon } from "./icons";
import { APP_VERSION } from "./phien-ban";
import { initShell } from "./shell";

const KHOA_QUYEN = "td_hd_quyen";
const params = new URLSearchParams(location.search);
const baiId = params.get("bai");
const theDangMo = location.pathname + location.search;
const tuTrang = params.get("from");

const ngayVn = (iso: string): string => { const [y, m, d] = iso.split("-"); return `${Number(d)}/${Number(m)}/${y}`; };

// ---------------------------------------------------------------- nhớ quyền để đọc được khi mất mạng

function docQuyenNho(): PermissionCode[] | null {
  try {
    const ds = JSON.parse(localStorage.getItem(KHOA_QUYEN) ?? "null") as unknown;
    return Array.isArray(ds) ? (ds as string[]).filter((q): q is PermissionCode => (PERMISSION_CODES as readonly string[]).includes(q)) : null;
  } catch {
    return null;
  }
}

function ghiQuyenNho(q: readonly PermissionCode[]): void {
  try {
    localStorage.setItem(KHOA_QUYEN, JSON.stringify(q));
  } catch {
    /* bị chặn: lần sau mất mạng chỉ thấy Phần chung */
  }
}

// ---------------------------------------------------------------- dựng chữ

/** `tu`: các từ đang tìm, để tô chữ khớp. */
function chu(ds: readonly DoanChu[], tu: readonly string[] = []): Child[] {
  const to = (s: string): Child[] => (tu.length ? khucTo(s, tu).map((k) => (k.khop ? h("mark", null, k.t) : k.t)) : [s]);
  return ds.map((d) => (d.k === "chu" ? h("span", null, ...to(d.t)) : d.k === "dam" ? h("strong", null, ...to(d.t)) : h("span", { class: "hd-nut" }, ...to(d.t))));
}

function khoi(k: Khoi, i: number): HTMLElement {
  const id = `d-${i}`;
  switch (k.k) {
    case "tieuDe": return h("h2", { id, class: "hd-muc-tieu-de" }, ...chu(k.t));
    case "doan": return h("p", { id }, ...chu(k.t));
    case "ghiChu": return h("p", { id, class: "hd-ghi-chu" }, ...chu(k.t));
    case "dsSo": return h("ol", { id, class: "hd-buoc" }, ...k.muc.map((m) => h("li", null, h("div", null, ...chu(m)))));
    case "dsCham": return h("ul", { id, class: "hd-ds" }, ...k.muc.map((m) => h("li", null, ...chu(m))));
    case "bang":
      return h("div", { id, class: "hd-bang-khung" }, h("table", { class: "hd-bang" },
        h("thead", null, h("tr", null, ...k.dau.map((o) => h("th", { scope: "col" }, ...chu(o))))),
        h("tbody", null, ...k.hang.map((r) => h("tr", null, ...r.map((o) => h("td", null, ...chu(o))))))));
  }
}

// ---------------------------------------------------------------- gửi yêu cầu

function nutGui(cap: "chinh" | "phu" | "loi", nhan: string, goiY: { tieuDe?: string; moTa?: string } | null): HTMLElement {
  const noi = tuTrang && tuTrang.startsWith("/") ? tuTrang : theDangMo;
  const href = `/feedback?new=1&from=${encodeURIComponent(noi)}`;
  const nut = h("a", { class: "nut", "data-cap": cap, href, "data-action": "gui-yeu-cau" }, cap !== "loi" && icon("plus", 18), nhan);
  nut.addEventListener("click", () => {
    if (!goiY) return;
    try {
      sessionStorage.setItem(KHOA_GOI_Y_GUI, JSON.stringify(goiY));
    } catch {
      /* bị chặn: hộp gửi để trống */
    }
  });
  return nut;
}

/** Mất mạng thì tắt lối gửi, kèm lý do; có mạng lại thì mở. */
function theoMang(nut: HTMLElement): HTMLElement {
  const lyDo = h("span", { class: "muted hd-ly-do", hidden: true }, "Cần có mạng để gửi yêu cầu");
  const cap = (): void => {
    const ngoai = navigator.onLine === false;
    nut.toggleAttribute("data-ban", ngoai);
    nut.dataset.ban = ngoai ? "true" : "false";
    if (ngoai) nut.setAttribute("aria-disabled", "true");
    else nut.removeAttribute("aria-disabled");
    lyDo.hidden = !ngoai;
  };
  nut.addEventListener("click", (e) => { if (navigator.onLine === false) e.preventDefault(); });
  window.addEventListener("online", cap);
  window.addEventListener("offline", cap);
  cap();
  return h("span", { class: "hd-gui-boc" }, nut, lyDo);
}

const camTrongDong = (nhan: string, goiY: { tieuDe?: string; moTa?: string } | null): HTMLElement =>
  h("div", { class: "hd-vuong-nho" }, h("span", null, nhan), theoMang(nutGui("loi", "Gửi yêu cầu", goiY)));

// ---------------------------------------------------------------- thanh thẻ

function veThanhThe(tabs: readonly TabHoTro[], demCuaToi: number): void {
  const the = (k: TabHoTro): HTMLElement => h("a", { role: "tab", class: "ht-tab", href: k === "mine" ? "/feedback" : `/feedback?the=${k}`, "aria-selected": "false" },
    NHAN_TAB[k], k === "mine" && demCuaToi > 0 && h("span", { class: "ht-dem", "aria-label": `${demCuaToi} yêu cầu có trả lời mới` }, String(demCuaToi)));
  replaceChildren(byId("hd-the"),
    h("a", { role: "tab", class: "ht-tab is-on", href: "/huong-dan?the=1", "aria-selected": "true", "aria-current": "page", id: "hd-the-huong-dan" }, NHAN_THE_HUONG_DAN),
    ...tabs.map(the));
}

// ---------------------------------------------------------------- danh sách

const hrefBai = (id: string): string => {
  const p = new URLSearchParams({ bai: id });
  const vai = params.get("vai-tro");
  if (vai) p.set("vai-tro", vai);
  if (tuTrang) p.set("from", tuTrang);
  return `/huong-dan?${p.toString()}`;
};

const dongBai = (b: BaiHien): HTMLElement => h("a", { class: "dong hd-dong", href: hrefBai(b.id), "data-bai": b.id },
  h("span", { class: "hd-dong-chu" }, h("span", { class: "hd-dong-ten" }, b.tieuDe), b.phu && h("span", { class: "muted hd-dong-phu" }, b.phu)),
  vuaDoi(b, APP_VERSION) && h("span", { class: "huy-hieu", "data-tong": "bien" }, icon("swap", 14), "Vừa đổi"),
  icon("next", 18));

const nhomViec = (g: NhomViec): HTMLElement => h("div", { class: "hd-nhom-viec" }, h("h3", { class: "hd-nhom-ten" }, g.ten), h("div", { class: "the hd-the-ds" }, ...g.bai.map(dongBai)));

function batDauNhanh(p: PhanVai): HTMLElement {
  const buoc = p.batDauNhanh.khoi.find((k) => k.k === "dsSo");
  const muc = buoc && buoc.k === "dsSo" ? buoc.muc : [];
  const conNua = muc.length > 3 || p.batDauNhanh.khoi.length > 1;
  return h("section", { class: "the hd-nhanh-the" },
    h("h2", null, p.batDauNhanh.tieuDe),
    h("p", { class: "muted" }, `Khoảng ${p.batDauNhanh.phut} phút · dành cho người mới vào`),
    h("ol", { class: "hd-buoc" }, ...muc.slice(0, 3).map((m) => h("li", null, h("div", null, ...chu(m))))),
    conNua && h("a", { class: "nut", "data-cap": "loi", href: hrefBai(p.batDauNhanh.id) }, "Đọc hết phần này"));
}

const phanVai = (p: PhanVai, tieuDe: string): HTMLElement => h("section", { class: "hd-phan" }, h("h2", { class: "hd-phan-ten" }, tieuDe), ...p.nhom.map(nhomViec));

const tenViec = (p: PhanVai): string => `Việc của ${p.tieuDe}`;

function ketQua(tim: string, d: DanhSachHuongDan): HTMLElement {
  const kq = timBai(d, tim);
  const tu = tachTuTim(tim);
  if (!kq.length) {
    return h("div", { class: "rong", "data-ket-qua": "rong" }, icon("search", 28),
      h("p", { class: "hd-rong-cau" }, `Chưa có bài nào nói về «${tim}»`),
      h("p", { class: "muted" }, "Gửi câu hỏi cho nhóm hỗ trợ, chữ bạn vừa gõ được điền sẵn vào yêu cầu. Hoặc thử gõ đúng tên nút trên màn hình."),
      theoMang(nutGui("chinh", "Gửi yêu cầu", { moTa: tim })));
  }
  const soDoan = kq.reduce((a, r) => a + r.doan.length, 0);
  const thuoc = [...new Set(kq.map((r) => r.bai.thuoc))].join(" và ");
  const moBai = (r: KetQuaBai): HTMLElement => h("section", { class: "the hd-the-ds hd-kq-bai" },
    h("a", { class: "hd-kq-dau", href: hrefBai(r.bai.id) }, h("span", { class: "hd-dong-ten" }, ...chu([{ k: "chu", t: r.bai.tieuDe }], tu)), h("span", { class: "muted hd-dong-phu" }, [r.bai.thuoc, r.bai.phu].filter(Boolean).join(" · "))),
    ...r.doan.slice(0, 5).map((dk) => h("a", { class: "dong hd-dong", href: `${hrefBai(r.bai.id)}&doan=${dk.khoi}` },
      h("span", { class: "hd-dong-chu" }, h("span", { class: "muted hd-dong-phu" }, dk.muc), h("span", null, ...chu(dk.doan, tu))), icon("next", 18))));
  return h("div", { class: "hd-kq", "data-ket-qua": "co" },
    h("p", { class: "muted", role: "status" }, `${soDoan} đoạn khớp trong ${kq.length} bài · bài của ${thuoc}`),
    ...kq.slice(0, 20).map(moBai),
    camTrongDong("Không phải điều bạn cần?", { moTa: tim }));
}

function veDanhSach(staff: Staff | null, perms: readonly PermissionCode[]): void {
  byId("hd-dau").hidden = false;
  const duocXemVaiKhac = staff ? can(staff, "admin.manage") : false;
  const vaiXem = duocXemVaiKhac ? (params.get("vai-tro") as PermissionCode | null) : null;
  const dangXem = vaiXem && (PERMISSION_CODES as readonly string[]).includes(vaiXem) ? vaiXem : null;
  const d = danhSach(dangXem ? [dangXem] : perms);
  const dau = d.vai[0];
  const nhanTim = dangXem ? `Tìm trong bài của ${PERMISSION_LABEL[dangXem]}` : "Tìm cách làm";
  const oTim = h("input", { id: "hd-tim", class: "o", type: "search", placeholder: "Gõ việc cần làm hoặc tên nút", autocomplete: "off", enterkeyhint: "search" });
  const xoa = h("button", { type: "button", class: "nut hd-xoa-tim", "data-cap": "loi", hidden: true, id: "hd-xoa-tim" }, "Xoá chữ tìm");
  const vung = h("div", { class: "hd-noi-dung-chinh" });

  const veMacDinh = (): void => {
    replaceChildren(vung,
      dau ? batDauNhanh(dau) : batDauNhanh(d.chung),
      h("div", { class: "hd-hai-cot" },
        ...d.vai.map((p) => phanVai(p, tenViec(p))),
        phanVai(d.chung, "Phần chung")),
      camTrongDong("Không thấy việc cần làm?", null));
  };
  let hen = 0;
  const capNhat = (): void => {
    const q = oTim.value.trim();
    xoa.hidden = q === "";
    if (q) replaceChildren(vung, ketQua(q, d));
    else veMacDinh();
  };
  oTim.addEventListener("input", () => { window.clearTimeout(hen); hen = window.setTimeout(capNhat, 150); });
  xoa.addEventListener("click", () => { oTim.value = ""; capNhat(); oTim.focus(); });

  const chonVai = duocXemVaiKhac ? h("label", { class: "hd-chon-vai" }, h("span", { class: "nhan" }, "Xem bài của vai trò"),
    h("select", { id: "hd-vai", class: "o", onchange: (e: Event) => {
      const v = (e.target as HTMLSelectElement).value;
      location.assign(v ? `/huong-dan?the=1&vai-tro=${v}` : "/huong-dan?the=1");
    } }, h("option", { value: "" }, "Vai trò của bạn"), ...PERMISSION_CODES.map((q) => h("option", { value: q, selected: q === dangXem }, PERMISSION_LABEL[q])))) : null;
  const daiVai = dangXem ? h("div", { class: "dai", "data-tong": "bien", role: "status" },
    h("span", { class: "hd-dai-chu" }, h("strong", null, `Đang xem bài của ${PERMISSION_LABEL[dangXem]}. `), `Người ${PERMISSION_LABEL[dangXem]} thấy đúng danh sách này. Mở một bài rồi gửi đường dẫn cho người mới để kèm.`),
    h("a", { class: "nut", "data-cap": "loi", href: "/huong-dan?the=1" }, "Về bài của tôi")) : null;

  replaceChildren(byId("hd-than"),
    chonVai, daiVai,
    h("div", { class: "hd-tim" }, h("label", { class: "nhan", for: "hd-tim" }, nhanTim), oTim, xoa),
    vung);
  veMacDinh();
  if (window.matchMedia("(min-width: 900px)").matches && !chonVai) oTim.focus();
}

// ---------------------------------------------------------------- một bài

function khoiMayDien(b: BaiHien): HTMLElement | null {
  const m = b.may;
  if (!m.man && !m.aiDung.length && !m.gioiHan.length && !m.nut.length) return null;
  const dong: Child[] = [];
  const hang = (ten: string, ...gt: Child[]): void => { dong.push(h("dt", null, ten), h("dd", null, ...gt)); };
  if (m.man) hang("Ở đâu", h("span", null, "Màn ", h("span", { class: "hd-nut" }, m.man)), m.loiVao && h("span", { class: "muted hd-loi-vao" }, m.loiVao));
  if (m.aiDung.length) hang("Ai dùng được", m.aiDung.join(" · "));
  if (m.gioiHan.length) hang("Giới hạn", h("ul", { class: "hd-ds" }, ...m.gioiHan.map((g) => h("li", null, g))));
  if (m.nut.length) hang("Nút trên màn", h("span", { class: "hd-nut-ds" }, ...m.nut.map((n) => h("span", { class: "hd-nut" }, n))));
  return h("section", { id: "hd-may", class: "hd-may" },
    h("div", { class: "hd-may-dau" }, icon("doc-check", 20), "Nền tảng tự điền — luôn đúng với bản đang chạy"),
    h("dl", { class: "hd-may-dl" }, ...dong),
    m.duong && h("a", { class: "nut", "data-cap": "phu", href: m.duong }, `Mở ${m.man}`, icon("next", 18)));
}

function veBai(b: BaiHien): void {
  byId("hd-dau").hidden = true;
  document.title = `${b.tieuDe} — Island Booking System`;
  const muc = b.khoi.flatMap((k, i) => (k.k === "tieuDe" ? [{ i, ten: k.t.map((x) => x.t).join("") }] : []));
  const may = khoiMayDien(b);
  const doi = vuaDoi(b, APP_VERSION) ? b.doi : null;
  const ve = hrefDanhSach();
  const toc = muc.length > 1 ? h("nav", { class: "hd-toc", "aria-label": "Trong bài này" },
    h("div", { class: "hd-toc-ten" }, "Trong bài này"),
    may && h("a", { href: "#hd-may", "data-muc": "hd-may" }, "Nền tảng tự điền"),
    ...muc.map((m) => h("a", { href: `#d-${m.i}`, "data-muc": `d-${m.i}` }, m.ten)),
    h("a", { href: "#hd-vuong", "data-muc": "hd-vuong" }, "Vẫn vướng")) : null;
  const bai = h("article", { class: "hd-bai" },
    h("a", { class: "hd-ve", href: ve }, icon("back", 18), NHAN_THE_HUONG_DAN),
    h("h1", { class: "hd-bai-ten" }, b.tieuDe),
    b.capNhat && h("p", { class: "muted hd-cap-nhat" }, `Cập nhật theo bản ${b.capNhat.ban} · ngày ${ngayVn(b.capNhat.ngay)}`, doi && " ", doi && h("span", { class: "huy-hieu", "data-tong": "bien" }, icon("swap", 14), `Vừa đổi ở bản ${doi.ban}`)),
    doi && h("div", { class: "dai", "data-tong": "bien", role: "status" }, h("span", { class: "hd-dai-chu" }, h("strong", null, `Bài này vừa đổi ở bản ${doi.ban}. `), doi.cau), h("a", { class: "nut", "data-cap": "loi", href: "/help" }, "Xem nhật ký thay đổi")),
    b.moDau && h("p", { class: "hd-mo-dau" }, b.moDau),
    may,
    ...b.khoi.map(khoi),
    h("section", { id: "hd-vuong", class: "the hd-vuong" },
      h("h2", null, "Làm theo rồi vẫn không được?"),
      h("p", { class: "muted" }, `Gửi yêu cầu cho nhóm hỗ trợ. Tên bài «${b.tieuDe}» và bản ${APP_VERSION} được kèm sẵn, bạn chỉ cần kể điều đang gặp.`),
      h("div", { class: "hd-vuong-nut" }, theoMang(nutGui("chinh", "Gửi yêu cầu", { tieuDe: `Bài «${b.tieuDe}», bản ${APP_VERSION}` })), h("a", { class: "nut", "data-cap": "loi", href: ve }, icon("back", 18), "Về danh sách hướng dẫn"))));
  replaceChildren(byId("hd-than"), h("div", { class: "hd-bai-khung" }, bai, toc));

  const doan = params.get("doan");
  if (doan) {
    const dich = document.getElementById(`d-${doan}`);
    dich?.classList.add("hd-doan-chon");
    dich?.scrollIntoView({ block: "center" });
  }
  if (toc && typeof IntersectionObserver !== "undefined") {
    const lien = [...toc.querySelectorAll<HTMLAnchorElement>("a[data-muc]")];
    const dat = (id: string): void => { for (const a of lien) a.toggleAttribute("aria-current", a.dataset.muc === id); };
    const quan = new IntersectionObserver((vao) => {
      const dang = vao.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (dang) dat(dang.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    for (const a of lien) {
      const el = document.getElementById(a.dataset.muc ?? "");
      if (el) quan.observe(el);
    }
    if (lien[0]?.dataset.muc) dat(lien[0].dataset.muc);
  }
}

function hrefDanhSach(): string {
  const p = new URLSearchParams({ the: "1" });
  const vai = params.get("vai-tro");
  if (vai) p.set("vai-tro", vai);
  if (tuTrang) p.set("from", tuTrang);
  return `/huong-dan?${p.toString()}`;
}

function veTrang(staff: Staff | null, perms: readonly PermissionCode[]): void {
  if (!baiId) { veDanhSach(staff, perms); return; }
  const duocXemVaiKhac = staff ? can(staff, "admin.manage") : false;
  const vai = duocXemVaiKhac ? (params.get("vai-tro") as PermissionCode | null) : null;
  const d = danhSach(vai ? [vai] : perms);
  const ca = [...d.vai, d.chung];
  const nhanh = ca.find((p) => p.batDauNhanh.id === baiId);
  const bai = nhanh ? baiBatDau(nhanh) : trongDanhSach(d, baiId) || duocXemVaiKhac ? moiBai().find((x) => x.id === baiId) : undefined;
  if (bai) { veBai(bai); return; }
  // Bài của vai khác hoặc đường dẫn cũ: nói thật, đưa về danh sách của mình.
  byId("hd-dau").hidden = false;
  replaceChildren(byId("hd-than"), h("div", { class: "rong" }, icon("search", 28),
    h("p", { class: "hd-rong-cau" }, "Bài này không có trong danh sách của bạn"),
    h("p", { class: "muted" }, "Bài có thể dành cho vai trò khác, hoặc đã đổi tên."),
    h("a", { class: "nut", "data-cap": "phu", href: hrefDanhSach() }, "Về danh sách hướng dẫn")));
}

// ---------------------------------------------------------------- khởi động

/** Có trả lời mới chưa đọc thì lối «Hỗ trợ» mở «Yêu cầu của tôi» (bản vẽ, mục G); bấm thẳng thẻ Hướng dẫn (`?the=1`) thì không. */
const lapTucVeBai = navigator.onLine === false || !!baiId || params.has("the");
const nho = docQuyenNho();
veThanhThe([], 0);
replaceChildren(byId("hd-gui-cho"), theoMang(nutGui("phu", "Gửi yêu cầu", null)));
// Vẽ TRƯỚC khung: mất mạng thì initShell không bao giờ xong (<main data-ve-truoc-shell>), chữ vẫn phải đọc được. Chưa có bản nhớ quyền thì chỉ có Phần chung.
if (lapTucVeBai) veTrang(null, nho ?? []);

const staff = await initShell();
ghiQuyenNho(staff.permissions);

let dem = 0;
try {
  const b = await api<Api.FeedbackBadgeResponse>("/api/feedback/badge");
  dem = b.mine;
} catch {
  /* không có số thì thôi */
}
if (dem > 0 && !lapTucVeBai) {
  location.replace("/feedback");
} else {
  veTrang(staff, staff.permissions);
  let cacThe: TabHoTro[] = ["mine"];
  try {
    cacThe = tabHoTro(await api<Api.FeedbackTeamsResponse>("/api/feedback/teams"));
  } catch {
    /* lỗi: chỉ thẻ của mình */
  }
  veThanhThe(cacThe, dem);
}
