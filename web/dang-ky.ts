// Trang CÔNG KHAI «Đăng ký làm đối tác» (ADR-0206 Đ5, Đ6, Đ9, Đ14; ADR-0207 Đ3, Đ7; ADR-0208 Đ2, Đ3, Đ9; đợt 1 Task 12). Người chưa có tài khoản:
//   email → mã 6 số (Turnstile ở bước xin mã) → phiếu (vai, thông tin, hai ảnh căn cước, đồng ý chính sách riêng tư) → gửi; trang trạng thái; phiếu đã duyệt ⇒ xin mã MỚI rồi tự đặt PIN.
// Không khung chung. Mọi lời gọi đi qua `api()` (web/api.ts) bọc trong `goiDk()` (đổi lỗi sang `Loi`); 401 của người đăng ký mang mã riêng nên không bị đưa về /login.
// Cổng là cookie đăng ký (HttpOnly, máy chủ tự kiểm); trang không giữ dữ liệu khai ở đâu ngoài các ô đang mở (không localStorage). Ảnh thu nhỏ trên máy trước khi gửi (bỏ toạ độ chụp);
// HEIC trình duyệt không mở được và PDF gửi nguyên (ADR-0208 Đ9). Trang KHÔNG xem lại được ảnh đã gửi (Đ3) — chỉ «Đã gửi» / «Chưa tải xong» theo ô. Chỉ dựng DOM bằng h().
import type { PhieuDangKyDto } from "../src/shared/contracts";
import { nhanLoaiTep } from "../src/shared/tep-dinh-kem";
import { maBase64 } from "../src/shared/tep-hien-thi";
import { KHU_TO_CHUC, NHOM_TO_CHUC, dungThanGui, giaTriTruoc, giaTriTruocToChuc, goiYTruoc, goiYTruocToChuc, oCuaKhu, type KhuO, type ODung } from "../src/shared/dang-ky-truong";
import { CAU_DONG_DANG_KY, CHU_DANG_KY, NHAN_O_TEP, NHAN_O_TEP_TO_CHUC, O_TEP_CUA_KHU, TIEU_DE_KHU_TO_CHUC, anhToChucConLai } from "../src/shared/dang-ky-giao-dien";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { ACCEPT_ANH_PDF, thuNhoAnh } from "./thu-nho-anh";

type CauHinh = {
  nhanDangKy: boolean; loaiMo: { ma: string; ten: string; phan: string }[]; mucBatBuoc: { ma: string; nhan: string }[]; chinhSachRiengTu: number | null;
  /** Phần tổ chức mở được (chính sách riêng tư đang hiệu lực có dấu thu thông tin tổ chức); loại giấy phép thêm chọn được. */
  phanToChucMo: boolean; giayPhepThem: { ma: string; ten: string; coHan: boolean }[];
};
class Loi extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const CAU_MANG = "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";

/** Mọi lời gọi qua `api()` (web/api.ts — vé chống ghi trùng; route công khai bỏ qua vé, máy chủ tự chống bấm hai lần). 401 của người đăng ký mang mã `registration_session_required`
 *  (không phải `unauthenticated`) nên api() KHÔNG đưa về /login của nhân viên; lỗi đổi sang `Loi` để trang xử lý. Thân là chuỗi JSON nên trình duyệt luôn gửi Content-Length (411). */
async function goiDk<T>(duong: string, method = "GET", than?: unknown, henGioMs?: number): Promise<T> {
  try {
    return await api<T>(duong, { method, body: than, henGioMs });
  } catch (e) {
    if (e instanceof ApiError) throw new Loi(e.status, e.code, e.message);
    throw new Loi(0, "mang", CAU_MANG);
  }
}

const loiEl = byId("dk-loi");
const baoEl = byId("dk-bao");
const goc = byId("dk-goc");
const hienLoi = (m: string | null) => { loiEl.hidden = m === null; loiEl.textContent = m ?? ""; };
const hienBao = (m: string | null) => { baoEl.hidden = m === null; baoEl.textContent = m ?? ""; };
const cauCua = (e: unknown) => (e instanceof Loi ? e.message : CAU_MANG);

let cauHinh: CauHinh = { nhanDangKy: false, loaiMo: [], mucBatBuoc: [], chinhSachRiengTu: null, phanToChucMo: false, giayPhepThem: [] };
let siteKey: string | null = null;
let emailDaNhap = "";

// ---- Turnstile (khuôn web/login.ts; bẫy ở web/CLAUDE.md: id khung không là «turnstile», không gọi ready(), theme sáng, hỏi lại cấu hình sau 403/503) ----
interface TurnstileApi { render(el: HTMLElement, o: Record<string, unknown>): string | undefined; reset(id?: string): void }
const tsWin = window as unknown as { turnstile?: TurnstileApi };
let tsTai: Promise<TurnstileApi> | null = null;
function taiTurnstile(): Promise<TurnstileApi> {
  if (tsWin.turnstile) return Promise.resolve(tsWin.turnstile);
  tsTai ??= new Promise<TurnstileApi>((ok, hong) => {
    const s = h("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" });
    const thua = () => { tsTai = null; s.remove(); hong(new Error("turnstile")); };
    const hen = setTimeout(thua, 15_000);
    s.addEventListener("load", () => { clearTimeout(hen); if (tsWin.turnstile) ok(tsWin.turnstile); else thua(); });
    s.addEventListener("error", () => { clearTimeout(hen); thua(); });
    document.head.append(s);
  });
  return tsTai;
}
async function hoiCauHinhDangNhap(): Promise<void> {
  try {
    siteKey = (await goiDk<{ turnstileSiteKey: string | null }>("/api/auth/config")).turnstileSiteKey ?? null;
  } catch {
    siteKey = null;
  }
}
/** Bẫy web/CLAUDE.md: `siteKey` từng kẹt null khi lần hỏi lúc mở trang lỗi. Sau 403/503 Turnstile: hỏi lại; có khoá mà trước đó chưa có ⇒ dựng lại bước đang mở để widget hiện. */
let buocLai: (() => void) | null = null;
async function hoiLaiTurnstile(loi: string): Promise<void> {
  const truoc = siteKey;
  await hoiCauHinhDangNhap();
  if (siteKey !== null && truoc === null && buocLai) { buocLai(); hienLoi(loi); }
}
/** Khung xác minh người thật + hàm lấy token hiện có (null khi máy chủ không bật Turnstile hoặc chưa xong). */
function khungTurnstile(): { el: HTMLElement; token: () => string | null; datLai: () => void } {
  const el = h("div", { class: "dk-ts", id: "dk-xac-minh-nguoi" });
  let token: string | null = null;
  let id: string | null = null;
  void (async () => {
    if (siteKey === null) return;
    replaceChildren(el, h("p", { class: "muted", role: "status" }, "Đang tải xác minh…"));
    try {
      const ts = await taiTurnstile();
      replaceChildren(el);
      id = ts.render(el, {
        sitekey: siteKey, theme: "light", language: "vi-vn", size: el.clientWidth >= 300 ? "flexible" : "compact",
        callback: (t: string) => { token = t; }, "expired-callback": () => { token = null; }, "error-callback": () => { token = null; return true; },
      }) ?? null;
    } catch {
      replaceChildren(el, h("p", { class: "o-loi" }, "Chưa tải được bước xác minh người thật. Kiểm tra kết nối mạng rồi tải lại trang."));
    }
  })();
  return { el, token: () => token, datLai: () => { token = null; if (id !== null) tsWin.turnstile?.reset(id); } };
}

// ---- Ô nhập dùng chung ----
function o(nhan: string, input: HTMLInputElement | HTMLSelectElement, goiY?: string): HTMLElement {
  return h("label", { class: "dk-o" }, h("span", { class: "nhan" }, nhan), input, goiY ? h("span", { class: "muted dk-goi-y" }, goiY) : null);
}
const oGo = (id: string, type: string, extra: Record<string, unknown> = {}) => h("input", { id, type, class: "o", ...extra }) as HTMLInputElement;
/** Gắn việc bấm cho một nút đã dựng (chữ nút viết thẳng ở chỗ dựng để bảng tham chiếu đối chiếu được). */
const nut = (el: HTMLButtonElement, onclick: () => void): HTMLButtonElement => { el.addEventListener("click", onclick); return el; };
const B = (cap: "chinh" | "phu" | "loi", attrs: Record<string, unknown> = {}) => ({ type: "button", class: "nut", "data-cap": cap, ...attrs });
async function bamNutDk(n: HTMLButtonElement, viec: () => Promise<void>): Promise<void> {
  if (n.disabled) return;
  n.disabled = true;
  hienLoi(null);
  try {
    await viec();
  } catch (e) {
    if (e instanceof Loi && e.status === 401 && e.code === "registration_session_required") { buocEmail(e.message); return; }
    if (e instanceof Loi && (e.code === "turnstile_failed" || e.code === "turnstile_unavailable")) void hoiLaiTurnstile(cauCua(e));
    hienLoi(cauCua(e));
  } finally {
    n.disabled = false;
  }
}

// ---- Bước 1: email ----
function buocEmail(loiTruoc: string | null = null): void {
  buocLai = () => buocEmail();
  hienLoi(loiTruoc);
  hienBao(null);
  const dong = !cauHinh.nhanDangKy || cauHinh.loaiMo.length === 0;
  const email = oGo("dk-email", "email", { autocomplete: "email", inputmode: "email", value: emailDaNhap, required: true });
  const ts = khungTurnstile();
  const gui = nut(h("button", B("chinh", { id: "dk-gui-ma", "data-co": "lon" }), "Gửi mã") as HTMLButtonElement, () => void bamNutDk(gui, async () => {
    const e = email.value.trim();
    if (!e) { hienLoi("Hãy nhập email."); return; }
    if (siteKey !== null && !ts.token()) { hienLoi("Hãy chờ bước xác minh người thật xong rồi bấm lại."); return; }
    try {
      await goiDk("/api/dang-ky/ma", "POST", { email: e, turnstileToken: ts.token() ?? undefined });
    } finally {
      ts.datLai(); // token đã bị máy chủ đốt (đạt hay không)
    }
    emailDaNhap = e;
    buocMa();
  }));
  replaceChildren(goc,
    dong ? h("div", { class: "alert warn", id: "dk-dong", role: "status" }, h("p", null, CAU_DONG_DANG_KY), h("p", null, CHU_DANG_KY.dongVaoLai)) : null,
    h("section", { class: "the dk-buoc" },
      h("h2", null, dong ? CHU_DANG_KY.tieuDeVaoLai : CHU_DANG_KY.tieuDeEmail),
      h("p", { class: "muted" }, CHU_DANG_KY.giaiThichEmail),
      o("Email", email), ts.el, gui));
}

// ---- Bước 2: mã ----
function buocMa(): void {
  hienBao(CHU_DANG_KY.daGuiMa);
  const ma = oGo("dk-ma", "text", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: 6, pattern: "[0-9]{6}" });
  const xn = nut(h("button", B("chinh", { id: "dk-xac-nhan-ma", "data-co": "lon" }), "Xác nhận") as HTMLButtonElement, () => void bamNutDk(xn, async () => {
    await goiDk<{ trangThai: string }>("/api/dang-ky/xac-nhan", "POST", { email: emailDaNhap, ma: ma.value.trim() });
    hienBao(null);
    await taiPhieu();
  }));
  replaceChildren(goc, h("section", { class: "the dk-buoc" },
    h("h2", null, CHU_DANG_KY.tieuDeMa), h("p", { class: "muted" }, `Mã đã gửi tới ${emailDaNhap}.`),
    o("Mã 6 số", ma), h("div", { class: "dk-hang-nut" }, xn, nut(h("button", B("loi"), "Quay lại") as HTMLButtonElement, () => buocEmail()))));
}

// ---- Phiếu ----
async function taiPhieu(): Promise<void> {
  const p = await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu");
  vePhieu(p);
}
const ngayGio = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

function dauPhieu(p: PhieuDangKyDto): HTMLElement {
  return h("section", { class: "the dk-tom-tat", id: "dk-trang-thai" },
    h("p", null, h("span", { class: "muted" }, "Mã phiếu: "), h("strong", null, p.maPhieu)),
    h("p", null, h("span", { class: "muted" }, "Trạng thái: "), h("span", { class: "huy-hieu", "data-tong": p.trangThai === "DA_DUYET" ? "la" : p.trangThai === "TU_CHOI" || p.trangThai === "HET_HAN" ? "do" : p.trangThai === "CAN_BO_SUNG" ? "cat" : "bien", id: "dk-nhan-trang-thai" }, p.nhanTrangThai)),
    p.loai ? h("p", null, h("span", { class: "muted" }, "Vai người dùng xin đăng ký: "), p.loai.ten) : null,
    p.guiLuc ? h("p", null, h("span", { class: "muted" }, "Gửi lúc: "), ngayGio(p.guiLuc)) : null,
    p.lyDo ? h("p", { class: "dk-ly-do", id: "dk-ly-do" }, h("span", { class: "muted" }, "Lý do: "), p.lyDo.cau) : null,
    p.hanLuc && (p.trangThai === "DANG_DIEN" || p.trangThai === "CAN_BO_SUNG") ? h("p", { class: "muted" }, `Phiếu được giữ tới ${ngayGio(p.hanLuc)} nếu không có thao tác nào.`) : null);
}

function vePhieu(p: PhieuDangKyDto): void {
  if (p.trangThai === "DANG_DIEN" || p.trangThai === "CAN_BO_SUNG") { veBieuMau(p); return; }
  if (p.trangThai === "DA_DUYET") { veDatPin(p); return; }
  const rut = p.trangThai === "CHO_XAC_MINH" || p.trangThai === "CHO_DUYET" ? nutRut() : null;
  replaceChildren(goc, dauPhieu(p),
    h("section", { class: "the" }, h("h2", null, "Ảnh căn cước"), ...dongTep(p)),
    p.trangThai === "CHO_XAC_MINH" || p.trangThai === "CHO_DUYET" ? h("p", { class: "muted" }, CHU_DANG_KY.choXuLy) : null,
    rut);
}
const dongTep = (p: PhieuDangKyDto) => [...Object.entries(NHAN_O_TEP), ...Object.entries(NHAN_O_TEP_TO_CHUC).filter(([ma]) => p.tep.some((x) => x.o === ma))].map(([ma, nhan]) => {
  const t = p.tep.find((x) => x.o === ma);
  return h("p", { "data-o-tep": ma }, h("span", { class: "muted" }, `${nhan}: `), t ? (t.trangThai === "DA_GUI" ? "Đã gửi" : "Chưa tải xong, hãy gửi lại") : "Chưa gửi");
});
function nutRut(): HTMLElement {
  const xacNhan = h("div", { class: "dk-hoi", hidden: true });
  const r = nut(h("button", B("phu", { id: "dk-rut" }), "Rút phiếu") as HTMLButtonElement, () => { xacNhan.hidden = false; });
  const co = nut(h("button", B("chinh", { "data-tong": "nguy-hiem", id: "dk-rut-chac" }), "Rút phiếu") as HTMLButtonElement, () => void bamNutDk(co, async () => { vePhieu(await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu/rut", "POST", {})); hienBao(CHU_DANG_KY.daRut); }));
  replaceChildren(xacNhan, h("p", null, CHU_DANG_KY.hoiRut), h("div", { class: "dk-hang-nut" }, co, nut(h("button", B("loi"), "Thôi") as HTMLButtonElement, () => { xacNhan.hidden = true; })));
  return h("div", { class: "dk-rut-khoi" }, r, xacNhan);
}

type VaiMo = { ma: string; ten: string };
/** Tuỳ chọn một ô chọn vai: các vai đang mở, cộng vai đã lưu của phiếu (kể cả khi vai đó đã tắt sau đó). */
const tuyChonVai = (ds: readonly VaiMo[], hienTai: VaiMo | null): VaiMo[] => [...ds.filter((l) => l.ma !== hienTai?.ma), ...(hienTai ? [hienTai] : [])];
const giaTriO = (el: HTMLInputElement | HTMLSelectElement): string => (el instanceof HTMLInputElement && el.type === "checkbox" ? (el.checked ? "1" : "") : el.value);

function veBieuMau(p: PhieuDangKyDto): void {
  const bk = p.banKhaiTruoc;
  const khoaVai = p.phienBan > 0; // vai khoá sau lần gửi đầu (cả vai của tổ chức)
  const chonVai = h("select", { id: "dk-vai", class: "o", disabled: khoaVai },
    h("option", { value: "" }, "Chọn vai người dùng"),
    // Tên vai do máy chủ trả (ADR-0212 Đ1 mục 5): loại đang mở lấy từ cấu hình, loại của phiếu lấy từ phiếu (kể cả khi đã tắt sau đó). Vai «chỉ tổ chức» không đứng ở phần cá nhân (Đ2).
    ...tuyChonVai(cauHinh.loaiMo.filter((l) => l.phan !== "CHI_TO_CHUC"), p.loai).map((l) => h("option", { value: l.ma, selected: p.loai?.ma === l.ma }, l.ten))) as HTMLSelectElement;
  const chonVaiTc = h("select", { id: "dk-vai-to-chuc", class: "o", disabled: khoaVai },
    h("option", { value: "" }, CHU_DANG_KY.chonVaiToChuc),
    ...tuyChonVai(cauHinh.loaiMo.filter((l) => l.phan !== "CA_NHAN"), p.loaiToChuc).map((l) => h("option", { value: l.ma, selected: p.loaiToChuc?.ma === l.ma }, l.ten))) as HTMLSelectElement;
  // Công tắc phần tổ chức: ẩn hẳn khi chính sách chưa mở phần này; sau lần gửi đầu chỉ còn khi phiếu ĐÃ có phần tổ chức (khoá bật — máy chủ không cho bỏ).
  const coCongTac = cauHinh.phanToChucMo && (!khoaVai || p.loaiToChuc !== null);
  const oCongTac = h("input", { type: "checkbox", id: "dk-cong-tac-to-chuc", class: "o-tick", disabled: khoaVai, checked: p.loaiToChuc !== null || p.tep.some((t) => t.o in NHAN_O_TEP_TO_CHUC) }) as HTMLInputElement;
  const congTac = coCongTac ? oCongTac : null;
  const toChucBat = (): boolean => congTac !== null && congTac.checked;
  // Lưu nháp vai (ADR-0212 Đ4): vai cá nhân bắt buộc, TRỪ phiếu «chỉ tổ chức» (công tắc bật + vai của tổ chức đã chọn — Task 13); tắt công tắc ⇒ xoá vai tổ chức đã lưu. Chỉ gọi khi có đổi.
  const daLuu = { loai: p.loai?.ma ?? "", tc: p.loaiToChuc?.ma ?? "" };
  const luuVai = async (): Promise<void> => {
    const tc = toChucBat() ? chonVaiTc.value : "";
    if (khoaVai || (!chonVai.value && !tc)) return;
    if (chonVai.value === daLuu.loai && tc === daLuu.tc) return;
    await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu", "PUT", { loai: chonVai.value, loaiToChuc: tc || null });
    daLuu.loai = chonVai.value;
    daLuu.tc = tc;
  };
  const luuVaiBaoLoi = () => void (async () => { hienLoi(null); try { await luuVai(); } catch (e) { hienLoi(cauCua(e)); } })();
  chonVai.addEventListener("change", luuVaiBaoLoi);
  chonVaiTc.addEventListener("change", luuVaiBaoLoi);
  // Ô của biểu mẫu dựng từ tệp ánh xạ trường (ADR-0212 Đ9): không khai ô tay ở đây.
  const oVao = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const phuThuoc: { wrap: HTMLElement; khi: "co-loai" | "co-han"; el: HTMLInputElement | HTMLSelectElement }[] = [];
  let oLoaiGiayPhep: HTMLSelectElement | null = null;
  const capNhatHien = () => {
    const ma = oLoaiGiayPhep?.value ?? "";
    const coHan = cauHinh.giayPhepThem.find((x) => x.ma === ma)?.coHan ?? false;
    for (const d of phuThuoc) {
      d.wrap.hidden = d.khi === "co-loai" ? ma === "" : !coHan;
      if (d.wrap.hidden) d.el.value = ""; // ô ẩn không mang giá trị cũ vào thân gửi
    }
  };
  const dungO = (m: ODung): HTMLElement => {
    const laToChuc = m.khoa.startsWith(`${NHOM_TO_CHUC}.`);
    const dau = laToChuc ? giaTriTruocToChuc(m.khoa, p.toChuc) : giaTriTruoc(m.khoa, bk);
    const goiY = laToChuc ? goiYTruocToChuc(m.khoa, p.toChuc) : goiYTruoc(m.khoa, bk);
    if (m.kieu === "tich") {
      const tick = h("input", { type: "checkbox", id: m.id, class: "o-tick" }) as HTMLInputElement;
      oVao.set(m.khoa, tick);
      return h("label", { class: "check dk-o" }, tick, h("span", null, m.nhan));
    }
    const tuyChon = m.nguonTuyChon === "giayPhepThem" ? cauHinh.giayPhepThem.map((t) => ({ value: t.ma, label: t.ten })) : (m.tuyChon ?? []);
    const el = m.kieu === "chon"
      ? h("select", { id: m.id, class: "o" }, h("option", { value: "" }, "(để trống)"), ...tuyChon.map((t) => h("option", { value: t.value, selected: t.value === dau }, t.label))) as HTMLSelectElement
      : oGo(m.id, m.kieu, { ...m.thuocTinh, value: dau });
    oVao.set(m.khoa, el);
    const wrap = o(m.nhan, el, goiY);
    if (m.nguonTuyChon === "giayPhepThem") { oLoaiGiayPhep = el as HTMLSelectElement; el.addEventListener("change", capNhatHien); }
    if (m.hienKhi) phuThuoc.push({ wrap, khi: m.hienKhi, el });
    return wrap;
  };
  const khuO = (khu: KhuO): HTMLElement[] => oCuaKhu("CA_NHAN", khu).map(dungO);
  const dongY = h("input", { type: "checkbox", id: "dk-dong-y", class: "o-tick" }) as HTMLInputElement;
  const chinhSach = h("div", { class: "dk-chinh-sach", hidden: true, id: "dk-chinh-sach-than" });
  const xemChinhSach = nut(h("button", B("loi", { id: "dk-doc-chinh-sach" }), "Đọc chính sách riêng tư") as HTMLButtonElement, () => void (async () => {
    chinhSach.hidden = !chinhSach.hidden;
    if (chinhSach.hidden || chinhSach.childElementCount) return;
    try {
      const cs = await goiDk<{ noiDung?: string; dangCapNhat?: boolean }>("/api/chinh-sach-rieng-tu");
      replaceChildren(chinhSach, ...(cs.noiDung ? cs.noiDung.split(/\n+/).map((d) => h("p", null, d)) : [h("p", { class: "muted" }, "Chính sách riêng tư đang cập nhật.")]));
    } catch (e) { replaceChildren(chinhSach, h("p", { class: "o-loi" }, cauCua(e))); }
  })());

  const tepKhoi = h("div", { class: "dk-tep" }, ...Object.entries(NHAN_O_TEP).map(([ma, nhan]) => oTep(ma, nhan, p).el));
  // Phần tổ chức (ADR-0212 Đ4): mọi khu dựng từ tệp ánh xạ; ô ảnh nằm ở khu của nó.
  const anhToChuc: OTep[] = [];
  const khuToChuc: HTMLElement[] = [];
  for (const khu of KHU_TO_CHUC) { const dsO = oCuaKhu("TO_CHUC", khu).map(dungO);
    const maAnh = O_TEP_CUA_KHU[khu];
    const anh = maAnh ? oTep(maAnh, NHAN_O_TEP_TO_CHUC[maAnh] ?? maAnh, p, true) : null;
    if (anh) anhToChuc.push(anh);
    khuToChuc.push(h("section", { class: "the dk-buoc", "data-khu": khu }, h("h2", null, TIEU_DE_KHU_TO_CHUC[khu]), ...dsO, maAnh === "GPKD" ? h("p", { class: "muted" }, CHU_DANG_KY.giaiThichAnhToChuc) : null, anh?.el ?? null));
  }
  capNhatHien();
  const phanToChuc = h("div", { id: "dk-phan-to-chuc", hidden: !(congTac?.checked ?? false) },
    h("section", { class: "the dk-buoc" }, o(CHU_DANG_KY.nhanVaiToChuc, chonVaiTc)), ...khuToChuc);
  // Tắt công tắc khi còn ảnh tổ chức: hỏi một lần rồi gỡ ảnh (nếu không, máy chủ không cho gửi — `org_photo_without_org`).
  const hoiBo = h("div", { class: "dk-hoi", id: "dk-hoi-bo-to-chuc", hidden: true });
  const tatToChuc = () => { phanToChuc.hidden = true; hoiBo.hidden = true; luuVaiBaoLoi(); };
  const goAnhVaBo = nut(h("button", B("chinh", { "data-tong": "nguy-hiem", id: "dk-go-anh-bo-to-chuc" }), "Bỏ ảnh và phần tổ chức") as HTMLButtonElement, () => void bamNutDk(goAnhVaBo, async () => {
    for (const a of anhToChuc) await a.go();
    if (congTac) congTac.checked = false;
    tatToChuc();
  }));
  replaceChildren(hoiBo, h("p", null, CHU_DANG_KY.hoiBoToChuc), h("div", { class: "dk-hang-nut" }, goAnhVaBo,
    nut(h("button", B("loi"), CHU_DANG_KY.khoiPhucToChuc) as HTMLButtonElement, () => { hoiBo.hidden = true; })));
  congTac?.addEventListener("change", () => {
    hienLoi(null);
    if (congTac.checked) { phanToChuc.hidden = false; luuVaiBaoLoi(); return; }
    if (anhToChuc.some((a) => a.coTep())) { congTac.checked = true; hoiBo.hidden = false; return; }
    tatToChuc();
  });

  const gui = nut(p.phienBan > 0 ? h("button", B("chinh", { id: "dk-gui-phieu", "data-co": "lon" }), "Gửi lại") as HTMLButtonElement : h("button", B("chinh", { id: "dk-gui-phieu", "data-co": "lon" }), "Gửi phiếu") as HTMLButtonElement, () => void bamNutDk(gui, async () => {
    if (!chonVai.value) { hienLoi("Hãy chọn vai người dùng xin đăng ký."); return; }
    if (toChucBat() && !chonVaiTc.value) { hienLoi(CHU_DANG_KY.hayChonVaiToChuc); return; }
    if (cauHinh.chinhSachRiengTu === null) { hienLoi("Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau."); return; }
    if (!dongY.checked) { hienLoi("Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi."); return; }
    await luuVai();
    const ketQua = await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu/gui", "POST", dungThanGui(Object.fromEntries([...oVao].map(([k, el]) => [k, giaTriO(el)])), cauHinh.chinhSachRiengTu, toChucBat()));
    hienBao(CHU_DANG_KY.daGui);
    vePhieu(ketQua);
    window.scrollTo(0, 0);
  }));

  replaceChildren(goc, dauPhieu(p),
    h("section", { class: "the dk-buoc" },
      h("h2", null, CHU_DANG_KY.tieuDeThongTin),
      p.trangThai === "CAN_BO_SUNG" ? h("p", { class: "muted" }, CHU_DANG_KY.nhapLaiSo) : null,
      o("Vai người dùng xin đăng ký", chonVai, khoaVai ? "Phiếu đã gửi một lần nên không đổi vai được." : undefined),
      ...khuO("thongTin")),
    h("section", { class: "the dk-buoc" },
      h("h2", null, "Căn cước công dân"),
      ...khuO("canCuoc"),
      h("p", { class: "muted" }, CHU_DANG_KY.giaiThichAnh), tepKhoi),
    congTac
      ? h("section", { class: "the dk-buoc" }, h("label", { class: "check" }, oCongTac, h("span", null, CHU_DANG_KY.congTacToChuc)), h("p", { class: "muted" }, CHU_DANG_KY.giaiThichToChuc), hoiBo)
      : (p.loaiToChuc !== null || anhToChucConLai(p.tep).length > 0
        // Công tắc ẩn (chính sách đã mất dấu tổ chức) mà phiếu còn ảnh tổ chức: vẫn cho bỏ ảnh, nếu không phiếu kẹt ở `org_photo_without_org`.
        ? h("section", { class: "the dk-buoc", id: "dk-to-chuc-dong" }, h("p", { class: "alert warn", role: "status" }, CHU_DANG_KY.toChucDangDong),
          ...anhToChucConLai(p.tep).map((ma) => oTep(ma, NHAN_O_TEP_TO_CHUC[ma] ?? ma, p, true).el))
        : null),
    phanToChuc,
    h("section", { class: "the dk-buoc" },
      h("h2", null, "Người giới thiệu"), ...khuO("gioiThieu")),
    h("section", { class: "the dk-buoc" },
      h("label", { class: "check" }, dongY, h("span", null, CHU_DANG_KY.dongY)), xemChinhSach, chinhSach,
      h("div", { class: "dk-hang-nut" }, gui)),
    p.phienBan > 0 || p.trangThai === "DANG_DIEN" ? nutRut() : null);
}

type OTep = { el: HTMLElement; coTep: () => boolean; go: () => Promise<void> };
/** Một ô ảnh: chọn tệp → thu nhỏ (ảnh mở được) → gửi base64. Trạng thái do máy chủ trả theo ô. `goDuoc`: có nút «Gỡ ảnh» (ô của phần tổ chức — lối thoát khi bỏ phần tổ chức). */
function oTep(ma: string, nhan: string, p: PhieuDangKyDto, goDuoc = false): OTep {
  const t = p.tep.find((x) => x.o === ma);
  let co = t !== undefined;
  const trangThai = h("span", { class: "muted", "data-trang-thai-tep": ma }, t ? (t.trangThai === "DA_GUI" ? "Đã gửi" : "Chưa tải xong, hãy gửi lại") : "Chưa gửi");
  const chon = h("input", { type: "file", accept: ACCEPT_ANH_PDF, id: `dk-tep-${ma}`, class: "o" }) as HTMLInputElement;
  const goNut = goDuoc ? h("button", { ...B("loi", { id: `dk-go-tep-${ma}`, hidden: !co }) }, "Bỏ ảnh này") as HTMLButtonElement : null;
  const go = async (): Promise<void> => {
    if (!co) return;
    await goiDk<{ tep: { o: string }[] }>("/api/dang-ky/phieu/tep", "POST", { o: ma, go: true }); // cùng route tải tệp, nhánh gỡ (không thêm route: gói Đơn hàng hết khoảng dư)
    co = false;
    trangThai.textContent = "Chưa gửi";
    if (goNut) goNut.hidden = true;
  };
  if (goNut) nut(goNut, () => void bamNutDk(goNut, async () => { await go(); hienBao(CHU_DANG_KY.daGoAnh); }));
  chon.addEventListener("change", () => void (async () => {
    const f = chon.files?.[0];
    if (!f) return;
    hienLoi(null);
    trangThai.textContent = "Đang gửi…";
    try {
      const dau = new Uint8Array(await f.slice(0, 16).arrayBuffer());
      const loai = nhanLoaiTep(dau);
      if (!loai) throw new Loi(415, "loai", "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.");
      const nho = loai === "pdf" ? null : await thuNhoAnh(f);
      const bytes = nho ?? new Uint8Array(await f.arrayBuffer());
      const r = await goiDk<{ tep: { o: string; trangThai: "DA_GUI" | "CHUA_TAI_XONG" }[] }>("/api/dang-ky/phieu/tep", "POST", { o: ma, noiDung: maBase64(bytes) }, 120_000); // ảnh gửi nguyên (HEIC, PDF) tới 5 MB ⇒ thân ~6,7 MB: hạn chờ dài như tệp kèm hỗ trợ (ADR-0144 đ7)
      const moi = r.tep.find((x) => x.o === ma);
      co = moi !== undefined;
      if (goNut) goNut.hidden = !co;
      trangThai.textContent = moi?.trangThai === "DA_GUI" ? "Đã gửi" : "Chưa tải xong, hãy gửi lại";
    } catch (e) {
      trangThai.textContent = co ? "Đã gửi" : "Chưa gửi";
      if (e instanceof Loi && e.status === 401 && e.code === "registration_session_required") { buocEmail(e.message); return; }
      hienLoi(cauCua(e)); // 413 nói rõ trần MB theo chính sách; 415 sai loại; 409 phần tổ chức đóng
    } finally {
      chon.value = "";
    }
  })());
  return { el: h("label", { class: "dk-o-tep" }, h("span", { class: "nhan" }, nhan), trangThai, chon, goNut), coTep: () => co, go };
}

// ---- Phiếu đã duyệt: xin mã MỚI rồi đặt PIN (ADR-0207 Đ7) ----
function veDatPin(p: PhieuDangKyDto): void {
  buocLai = () => veDatPin(p);
  const email = oGo("dk-email-pin", "email", { autocomplete: "email", value: emailDaNhap });
  const ts = khungTurnstile();
  const ma = oGo("dk-ma-pin", "text", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: 6 });
  const pin = oGo("dk-pin", "password", { inputmode: "numeric", maxlength: 6, autocomplete: "new-password" });
  const pin2 = oGo("dk-pin-2", "password", { inputmode: "numeric", maxlength: 6, autocomplete: "new-password" });
  const buoc2 = h("div", { class: "dk-buoc-con", hidden: true });
  const xinMa = nut(h("button", B("phu", { id: "dk-gui-ma-pin" }), "Gửi mã") as HTMLButtonElement, () => void bamNutDk(xinMa, async () => {
    const e = email.value.trim();
    if (!e) { hienLoi("Hãy nhập email."); return; }
    if (siteKey !== null && !ts.token()) { hienLoi("Hãy chờ bước xác minh người thật xong rồi bấm lại."); return; }
    try { await goiDk("/api/dang-ky/ma", "POST", { email: e, turnstileToken: ts.token() ?? undefined }); } finally { ts.datLai(); }
    emailDaNhap = e;
    hienBao(CHU_DANG_KY.daGuiMa);
    buoc2.hidden = false;
  }));
  const dat = nut(h("button", B("chinh", { id: "dk-dat-pin", "data-co": "lon" }), "Đặt PIN") as HTMLButtonElement, () => void bamNutDk(dat, async () => {
    if (pin.value !== pin2.value) { hienLoi("Hai lần nhập mã PIN chưa khớp."); return; }
    await goiDk("/api/dang-ky/phieu/dat-pin", "POST", { ma: ma.value.trim(), pin: pin.value });
    hienBao(null);
    replaceChildren(goc, h("section", { class: "the dk-buoc", id: "dk-da-kich-hoat" },
      h("h2", null, CHU_DANG_KY.daKichHoat), h("p", null, CHU_DANG_KY.moiDangNhap),
      h("a", { class: "nut", "data-cap": "chinh", "data-co": "lon", href: "/login", id: "dk-sang-dang-nhap" }, "Đăng nhập")));
  }));
  replaceChildren(buoc2, o("Mã 6 số", ma), o("Mã PIN 6 số", pin), o("Nhập lại mã PIN", pin2), dat);
  replaceChildren(goc, dauPhieu(p),
    h("section", { class: "the dk-buoc" },
      h("h2", null, CHU_DANG_KY.tieuDeDatPin), h("p", { class: "muted" }, CHU_DANG_KY.giaiThichDatPin),
      p.hanLuc ? h("p", { class: "muted" }, `Hạn đặt mã PIN: ${ngayGio(p.hanLuc)}.`) : null,
      o("Email", email), ts.el, xinMa, buoc2));
}

// ---- Mở trang ----
void (async () => {
  try {
    [cauHinh] = await Promise.all([goiDk<CauHinh>("/api/dang-ky/cau-hinh"), hoiCauHinhDangNhap()]);
  } catch (e) {
    replaceChildren(goc);
    hienLoi(cauCua(e));
    return;
  }
  try {
    await taiPhieu(); // phiên đăng ký còn hạn (vừa tải lại trang): vào thẳng phiếu
  } catch (e) {
    if (e instanceof Loi && (e.status === 401 || e.status === 404)) buocEmail();
    else { buocEmail(); hienLoi(cauCua(e)); }
  }
})();
