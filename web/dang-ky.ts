// Trang CÔNG KHAI «Đăng ký làm đối tác» (ADR-0206 Đ5, Đ6, Đ9, Đ14; ADR-0207 Đ3, Đ7; ADR-0208 Đ2, Đ3, Đ9; đợt 1 Task 12). Người chưa có tài khoản:
//   email → mã 6 số (Turnstile ở bước xin mã) → phiếu (vai, thông tin, hai ảnh căn cước, đồng ý chính sách riêng tư) → gửi; trang trạng thái; phiếu đã duyệt ⇒ xin mã MỚI rồi tự đặt PIN.
// Không khung chung. Mọi lời gọi đi qua `api()` (web/api.ts) bọc trong `goiDk()` (đổi lỗi sang `Loi`); 401 của người đăng ký mang mã riêng nên không bị đưa về /login.
// Cổng là cookie đăng ký (HttpOnly, máy chủ tự kiểm); trang không giữ dữ liệu khai ở đâu ngoài các ô đang mở (không localStorage). Ảnh thu nhỏ trên máy trước khi gửi (bỏ toạ độ chụp);
// HEIC trình duyệt không mở được và PDF gửi nguyên (ADR-0208 Đ9). Trang KHÔNG xem lại được ảnh đã gửi (Đ3) — chỉ «Đã gửi» / «Chưa tải xong» theo ô. Chỉ dựng DOM bằng h().
import type { PhieuDangKyDto } from "../src/shared/contracts";
import { ROLES, isRoleCode } from "../src/shared/roles";
import { nhanLoaiTep } from "../src/shared/tep-dinh-kem";
import { maBase64 } from "../src/shared/tep-hien-thi";
import { CAU_DONG_DANG_KY, CHU_DANG_KY, NHAN_O_TEP } from "../src/shared/dang-ky-giao-dien";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { ACCEPT_ANH_PDF, thuNhoAnh } from "./thu-nho-anh";

type CauHinh = { nhanDangKy: boolean; loaiMo: string[]; mucBatBuoc: { ma: string; nhan: string }[]; chinhSachRiengTu: number | null };
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

let cauHinh: CauHinh = { nhanDangKy: false, loaiMo: [], mucBatBuoc: [], chinhSachRiengTu: null };
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
const tenVai = (ma: string) => (isRoleCode(ma) ? ROLES[ma].name : ma);
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
const dongTep = (p: PhieuDangKyDto) => Object.entries(NHAN_O_TEP).map(([ma, nhan]) => {
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

function veBieuMau(p: PhieuDangKyDto): void {
  const bk = p.banKhaiTruoc;
  const chonVai = h("select", { id: "dk-vai", class: "o", disabled: p.phienBan > 0 },
    h("option", { value: "" }, "Chọn vai người dùng"),
    ...[...new Set([...cauHinh.loaiMo, ...(p.loai ? [p.loai.ma] : [])])].map((ma) => h("option", { value: ma, selected: p.loai?.ma === ma }, p.loai?.ma === ma ? p.loai.ten : tenVai(ma)))) as HTMLSelectElement;
  chonVai.addEventListener("change", () => {
    if (!chonVai.value) return;
    void (async () => {
      hienLoi(null);
      try { await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu", "PUT", { loai: chonVai.value }); } catch (e) { hienLoi(cauCua(e)); }
    })();
  });
  const hoTen = oGo("dk-ho-ten", "text", { autocomplete: "name", value: bk?.hoTen ?? "" });
  const ngaySinh = oGo("dk-ngay-sinh", "date", { value: bk?.ngaySinh ?? "" });
  const diaChi = oGo("dk-dia-chi", "text", { autocomplete: "street-address", value: bk?.diaChi ?? "" });
  const dienThoai = oGo("dk-dien-thoai", "tel", { autocomplete: "tel", inputmode: "tel" });
  const soCc = oGo("dk-so-cccd", "text", { inputmode: "numeric", autocomplete: "off" });
  const ngayCap = oGo("dk-ngay-cap", "date", { value: bk?.giayTo?.ngayCap ?? "" });
  const noiCap = oGo("dk-noi-cap", "text");
  const hetHan = oGo("dk-het-han", "date", { value: bk?.giayTo?.hetHan ?? "" });
  const gioiThieu = oGo("dk-gioi-thieu", "text", { maxlength: 200 });
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

  const tepKhoi = h("div", { class: "dk-tep" }, ...Object.entries(NHAN_O_TEP).map(([ma, nhan]) => oTep(ma, nhan, p)));
  const gui = nut(p.phienBan > 0 ? h("button", B("chinh", { id: "dk-gui-phieu", "data-co": "lon" }), "Gửi lại") as HTMLButtonElement : h("button", B("chinh", { id: "dk-gui-phieu", "data-co": "lon" }), "Gửi phiếu") as HTMLButtonElement, () => void bamNutDk(gui, async () => {
    if (!chonVai.value) { hienLoi("Hãy chọn vai người dùng xin đăng ký."); return; }
    if (cauHinh.chinhSachRiengTu === null) { hienLoi("Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau."); return; }
    if (!dongY.checked) { hienLoi("Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi."); return; }
    if (p.phienBan === 0 && chonVai.value !== p.loai?.ma) await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu", "PUT", { loai: chonVai.value });
    const rong = (x: HTMLInputElement) => (x.value.trim() === "" ? undefined : x.value.trim());
    const ketQua = await goiDk<PhieuDangKyDto>("/api/dang-ky/phieu/gui", "POST", {
      chinhSachPhienBan: cauHinh.chinhSachRiengTu, hoTen: hoTen.value, ngaySinh: rong(ngaySinh), diaChi: rong(diaChi), dienThoai: rong(dienThoai), nguoiGioiThieu: rong(gioiThieu),
      giayTo: rong(soCc) ? { typeCode: "CCCD", number: soCc.value.trim(), issuedDate: rong(ngayCap) ?? null, issuedPlace: rong(noiCap) ?? null, expiryDate: rong(hetHan) ?? null } : undefined,
    });
    hienBao(CHU_DANG_KY.daGui);
    vePhieu(ketQua);
    window.scrollTo(0, 0);
  }));

  replaceChildren(goc, dauPhieu(p),
    h("section", { class: "the dk-buoc" },
      h("h2", null, CHU_DANG_KY.tieuDeThongTin),
      p.trangThai === "CAN_BO_SUNG" ? h("p", { class: "muted" }, CHU_DANG_KY.nhapLaiSo) : null,
      o("Vai người dùng xin đăng ký", chonVai, p.phienBan > 0 ? "Phiếu đã gửi một lần nên không đổi vai được." : undefined),
      o("Họ tên", hoTen), o("Ngày sinh", ngaySinh), o("Số điện thoại", dienThoai, bk?.daKhaiDienThoai ? "Hãy nhập lại số điện thoại." : undefined), o("Địa chỉ", diaChi)),
    h("section", { class: "the dk-buoc" },
      h("h2", null, "Căn cước công dân"),
      o("Số căn cước", soCc, bk?.giayTo?.soChe ? `Số đã khai: ${bk.giayTo.soChe}. Hãy nhập lại đủ số.` : undefined), o("Ngày cấp", ngayCap), o("Nơi cấp", noiCap), o("Ngày hết hạn", hetHan),
      h("p", { class: "muted" }, CHU_DANG_KY.giaiThichAnh), tepKhoi),
    h("section", { class: "the dk-buoc" },
      h("h2", null, "Người giới thiệu"), o("Người giới thiệu (không bắt buộc)", gioiThieu)),
    h("section", { class: "the dk-buoc" },
      h("label", { class: "check" }, dongY, h("span", null, CHU_DANG_KY.dongY)), xemChinhSach, chinhSach,
      h("div", { class: "dk-hang-nut" }, gui)),
    p.phienBan > 0 || p.trangThai === "DANG_DIEN" ? nutRut() : null);
}

/** Một ô ảnh: chọn tệp → thu nhỏ (ảnh mở được) → gửi base64. Trạng thái do máy chủ trả theo ô. */
function oTep(ma: string, nhan: string, p: PhieuDangKyDto): HTMLElement {
  const t = p.tep.find((x) => x.o === ma);
  const trangThai = h("span", { class: "muted", "data-trang-thai-tep": ma }, t ? (t.trangThai === "DA_GUI" ? "Đã gửi" : "Chưa tải xong, hãy gửi lại") : "Chưa gửi");
  const chon = h("input", { type: "file", accept: ACCEPT_ANH_PDF, id: `dk-tep-${ma}`, class: "o" }) as HTMLInputElement;
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
      trangThai.textContent = moi?.trangThai === "DA_GUI" ? "Đã gửi" : "Chưa tải xong, hãy gửi lại";
    } catch (e) {
      trangThai.textContent = "Chưa gửi";
      if (e instanceof Loi && e.status === 401 && e.code === "registration_session_required") { buocEmail(e.message); return; }
      hienLoi(cauCua(e)); // 413 nói rõ trần MB theo chính sách; 415 sai loại
    } finally {
      chon.value = "";
    }
  })());
  return h("label", { class: "dk-o-tep" }, h("span", { class: "nhan" }, nhan), trangThai, chon);
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
