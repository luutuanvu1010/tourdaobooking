// Màn «Cấp độ đại lý» (đặc tả docs/superpowers/specs/2026-11-04-man-cap-dai-ly.md): mọi hồ sơ đang mang vai trò được hưởng, có hay chưa có tài khoản; bấm ô cấp mở đúng bảng đặt cấp của cột ở Quản lý tài khoản.
// Gọi: GET /api/pricing/cap-dai-ly (một lần cho cả danh sách). Trang không tự có lệnh ghi: đặt, đổi, ngừng cấp riêng đi qua bảng ở web/cot-cap-dai-ly.ts. Cấp do máy chủ trả; trang chỉ lọc và vẽ.
// Cột «Trả sau» và khối «Hạn mức trả sau» (ADR-0172 Đ1, Đ2): web/o-tra-sau.ts, nạp một lần cho cả màn (GET /api/tra-sau/han-muc, /api/tra-sau/goi-y); lỗi ⇒ ô hiện «—», bảng cấp vẫn dùng được.
// Máy chủ hỏi lại cổng ở mọi lời gọi; hỏi ở đây chỉ để không gọi và nói câu rõ ràng.
import { ApiError, api, type Api } from "./api";
import { datTieuDiemODongCap, oCapHoSo } from "./cot-cap-dai-ly";
import { byId, h, replaceChildren } from "./dom";
import { datTieuDiemOTraSau, khoiCaiDatTraSau, oTraSau, taiTraSau, type BoiCanhTraSau } from "./o-tra-sau";
import { initShell, showError } from "./shell";
import { CHU_MAN, SO_DONG_MOI_LAN, cauDem, locDong, nhanLoaiHoSo, nhanTaiKhoan, nhanVaiTro, suaDuocDong } from "../src/shared/cap-dai-ly-hien-thi";
import { coQuyenSua } from "../src/shared/hoa-hong-hien-thi";

const errorEl = byId("error");
const baoCapEl = byId("cdl-khong-cap");
const timEl = byId<HTMLInputElement>("cdl-tim");
const chuaCoEl = byId<HTMLButtonElement>("cdl-chua-co");
const demEl = byId("cdl-dem");
const bangWrapEl = byId("cdl-bang-wrap");
const bangEl = byId("cdl-bang");
const theEl = byId("cdl-the");
const rongEl = byId("cdl-rong");
const themEl = byId<HTMLButtonElement>("cdl-them");
const khungEl = byId("cdl-khung");
const traSauEl = byId("cdl-tra-sau");

let tatCa: Api.CapDaiLyDongDto[] = [];
let traSau: BoiCanhTraSau | null = null;
let coCapBat = true;
let soHien = SO_DONG_MOI_LAN;
let chiChuaCoCap = false;
let tre: ReturnType<typeof setTimeout> | undefined;

/** Mọi lỗi của trang đi qua đây: đưa #error vào tầm nhìn. Thanh trên dính không che nhờ `scroll-margin-top` của #error (public/app.css). */
function hienLoi(cau: string): void {
  showError(errorEl, cau);
  errorEl.scrollIntoView({ block: "nearest" });
}

/** Nạp lại cả danh sách; lỗi hiện ở đầu trang, dữ liệu đã vẽ giữ nguyên. Trả false khi không nạp được. */
async function nap(): Promise<boolean> {
  try {
    const [r, ts] = await Promise.all([api<Api.CapDaiLyResponse>("/api/pricing/cap-dai-ly"), taiTraSau()]);
    tatCa = r.hoSo;
    traSau = ts;
    coCapBat = !(r.soCapDangBat === 0);
    showError(errorEl, null);
    return true;
  } catch (err) {
    hienLoi(err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    return false;
  }
}

async function lamMoi(partyId: string): Promise<void> {
  // Nạp lại lỗi thì KHÔNG đặt tiêu điểm về ô: trình duyệt sẽ cuộn theo ô và đẩy câu lỗi ra khỏi tầm nhìn.
  if (!(await nap())) return;
  ve();
  datTieuDiemODongCap(partyId);
}

/** Sau khi lưu Trả sau: nạp lại, vẽ lại, đưa tiêu điểm về ô Trả sau của hồ sơ đó. */
async function lamMoiTraSau(partyId: string): Promise<void> {
  if (!(await nap())) return;
  ve();
  await veCaiDat();
  datTieuDiemOTraSau(partyId);
}

async function veCaiDat(): Promise<void> {
  const k = await khoiCaiDatTraSau(traSau, async () => {
    if (await nap()) {
      ve();
      await veCaiDat();
    }
  });
  replaceChildren(traSauEl, ...(k ? [k] : []));
}

const oTraSauCuaDong = (d: Api.CapDaiLyDongDto): HTMLElement =>
  oTraSau({ partyId: d.partyId, ten: d.ten, capCode: d.cap.cap?.code ?? null, tenCap: d.cap.cap?.ten ?? null }, traSau, lamMoiTraSau);

const oCuaDong = (d: Api.CapDaiLyDongDto): HTMLElement => oCapHoSo({ partyId: d.partyId, ten: d.ten, coTaiKhoan: d.coTaiKhoan }, d.cap, suaDuocDong(coCapBat, d), lamMoi);

const hang = (d: Api.CapDaiLyDongDto): HTMLElement =>
  h("tr", null,
    h("td", null, d.ten),
    h("td", null, nhanLoaiHoSo(d.loaiHoSo)),
    h("td", null, nhanVaiTro(d)),
    h("td", null, nhanTaiKhoan(d.coTaiKhoan)),
    h("td", null, oCuaDong(d)),
    h("td", null, oTraSauCuaDong(d)),
  );

const the = (d: Api.CapDaiLyDongDto): HTMLElement =>
  h("div", { class: "card card-col" },
    h("div", null, h("strong", null, d.ten)),
    h("div", { class: "muted" }, nhanLoaiHoSo(d.loaiHoSo), " · ", nhanTaiKhoan(d.coTaiKhoan)),
    h("div", { class: "muted" }, `${CHU_MAN.nhanVaiTro}: `, nhanVaiTro(d)),
    h("div", null, h("span", { class: "muted" }, `${CHU_MAN.tieuDe}: `), oCuaDong(d)),
    h("div", null, h("span", { class: "muted" }, "Trả sau: "), oTraSauCuaDong(d)),
  );

function ve(): void {
  baoCapEl.hidden = coCapBat;
  const khop = locDong(tatCa, { tim: timEl.value, chiChuaCoCap });
  const hien = khop.slice(0, soHien);
  replaceChildren(bangEl, ...hien.map(hang));
  replaceChildren(theEl, ...hien.map(the));
  bangWrapEl.hidden = hien.length === 0;
  demEl.textContent = cauDem(khop.length, tatCa.length);
  rongEl.textContent = tatCa.length === 0 ? CHU_MAN.rong : CHU_MAN.khongKhop;
  rongEl.hidden = hien.length > 0;
  themEl.hidden = khop.length <= soHien;
}

const staff = await initShell();
if (!coQuyenSua(staff)) {
  hienLoi(CHU_MAN.chiMoDuoc);
} else {
  replaceChildren(baoCapEl, CHU_MAN.khongCoCap, " ", h("a", { href: "/hoa-hong" }, CHU_MAN.trangHoaHong), ".");
  timEl.addEventListener("input", () => {
    if (tre !== undefined) clearTimeout(tre);
    tre = setTimeout(() => {
      soHien = SO_DONG_MOI_LAN;
      ve();
    }, 200);
  });
  chuaCoEl.addEventListener("click", () => {
    chiChuaCoCap = !chiChuaCoCap;
    chuaCoEl.setAttribute("aria-pressed", String(chiChuaCoCap));
    soHien = SO_DONG_MOI_LAN;
    ve();
  });
  themEl.addEventListener("click", () => {
    soHien += SO_DONG_MOI_LAN;
    ve();
  });
  if (await nap()) {
    khungEl.hidden = false;
    ve();
    await veCaiDat();
  }
}
