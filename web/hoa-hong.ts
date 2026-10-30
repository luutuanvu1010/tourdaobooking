// Trang «Hoa hồng đối tác» (thiết kế lại, PR 2) — KHUNG: nạp dữ liệu, vẽ dải cảnh báo, chuyển ba thẻ «Các cấp đại lý» / «Loại đối tác» / «Riêng từng đối tác», truyền dữ liệu cho các khối nội dung.
// Gọi (chỉ đọc, ở đây): GET /api/pricing/hoa-hong (CommissionRuleListResponse), /api/pricing/muc-ta (MucTaListResponse), /api/pricing/loai-doi-tac (LoaiDoiTacListResponse), /api/catalog.
// Thẻ «Riêng từng đối tác» gọi thêm GET /api/pricing/ho-so/:id/hoa-hong khi mở một đối tác; hộp cấp riêng gọi GET /api/pricing/nguoi-huong (tìm đối tác) và ba route ghi cấp riêng.
// Ẩn/hiện hỏi bảng quyền (`can`): xem = partner.commission.view, thêm mức = partner.commission.write; máy chủ kiểm lại (403 ⇒ «Bạn không có quyền xem trang này.»).
// Trang không tính tiền, không chọn mức: số và lời từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts. Tra nhanh (đứng trên ba thẻ): web/hoa-hong-tra-nhanh.ts; dải: -dai.ts; hộp: -hop.ts. Thẻ «Các cấp đại lý» = -cap.ts (menu «⋯»: -menu.ts). Thẻ «Loại đối tác» = -loai.ts. Thẻ «Riêng từng đối tác» = -doi-tac.ts.
import { CAU_CAP_RIENG_DANG_TRA, CAU_KHONG_THAY_DONG, docThe, theChoKetQua, type TenDanhMuc, type TheHoaHong } from "../src/shared/hoa-hong-hien-thi";
import type { DichVuPhu } from "../src/shared/hoa-hong-phu-muc";
import { can, type PermissionHolder } from "../src/shared/permissions";
import { homeRedirect } from "../src/shared/start-page";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { moChiTietCap, veTheCap } from "./hoa-hong-cap";
import { veDai } from "./hoa-hong-dai";
import { datLaiLocDoiTac, moDoiTac, nhanHoSoMoi, veTheDoiTac } from "./hoa-hong-doi-tac";
import { taoMoHop } from "./hoa-hong-hop";
import { datLaiLocLoai, veTheLoai } from "./hoa-hong-loai";
import { veTraNhanh } from "./hoa-hong-tra-nhanh";
import { initShell, showError } from "./shell";
import { hienBaoNgan } from "./toast";
import { trangThaiToanTrang } from "./trang-thai-he-thong";
import { lyDoLoi, taiDanhMuc, type DanhMuc } from "./so-dai-ly-ui";

/** Dữ liệu một lần nạp, truyền cho mọi khối. Ghi xong gọi `napLai` để nạp lại và vẽ lại cả ba thẻ. */
export interface DuLieuHoaHong {
  homNay: string;
  dong: Api.CommissionRuleDto[];
  vai: { code: string; ten: string }[];
  mucTa: Api.MucTaListResponse;
  loai: Api.LoaiDoiTacDto[];
  ten: TenDanhMuc;
  /** Danh sách dịch vụ và nhóm để chọn trong ô «Dịch vụ» (Tra nhanh, hộp Thêm mức). */
  dm: DanhMuc;
  /** Dịch vụ cho luật phủ mức; null khi danh mục lỗi (`dm.loi !== null`) ⇒ dải chỉ ghi «chưa kiểm được». */
  dichVuPhu: DichVuPhu[] | null;
  nguoiDung: PermissionHolder;
}

type The = TheHoaHong;
const THE: readonly The[] = ["cap", "loai", "doi-tac"];
const KHOA_THE = "hh-the";

const errorEl = byId("error");
const noiDungEl = byId("hh-noi-dung");
const nutThemEl = byId<HTMLButtonElement>("hh-them-muc");
const thanhCuoiEl = byId("hh-thanh-cuoi");
const daiEl = byId("hh-dai");
const traNhanhEl = byId("hh-tra-nhanh");
const panelEl: Record<The, HTMLElement> = { cap: byId("hh-the-cap"), loai: byId("hh-the-loai"), "doi-tac": byId("hh-the-doi-tac") };
const tabEl: Record<The, HTMLElement> = { cap: byId("hh-tab-cap"), loai: byId("hh-tab-loai"), "doi-tac": byId("hh-tab-doi-tac") };

const staff = await initShell();

let du: DuLieuHoaHong | null = null;

const okEl = byId("ok");
/** Khung vàng giữ sau khi đóng hộp (cảnh báo mức riêng thắng cấp đại lý); nằm ngoài ba thẻ nên không mất khi vẽ lại. */
const canhBaoEl = h("div", { hidden: true });
noiDungEl.prepend(canhBaoEl);
const moHop = taoMoHop({
  lay: () => du!,
  napLai: () => napLai(),
  nguoiDung: staff,
  baoOk(text) {
    okEl.textContent = text ?? "";
    okEl.hidden = !text;
  },
  canhBao(node) {
    replaceChildren(canhBaoEl, node);
    canhBaoEl.hidden = node === null;
  },
  hoSoMoi: nhanHoSoMoi,
});

/** Hiện câu lỗi ở đầu trang và cuộn tới nó. */
function baoLoi(err: unknown): void {
  if (err instanceof ApiError && err.status === 403) {
    trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" });
    return;
  }
  showError(errorEl, lyDoLoi(err));
  errorEl.scrollIntoView({ block: "nearest" });
}

function docTheNho(): The {
  try {
    return docThe(sessionStorage.getItem(KHOA_THE));
  } catch {
    return "cap";
  }
}
function ghiTheNho(t: The): void {
  try {
    sessionStorage.setItem(KHOA_THE, t);
  } catch {
    /* trình duyệt chặn lưu tạm: bỏ qua */
  }
}

function chonThe(t: The, lay = false): void {
  ghiTheNho(t);
  for (const k of THE) {
    const on = k === t;
    tabEl[k].setAttribute("aria-selected", String(on));
    tabEl[k].tabIndex = on ? 0 : -1;
    panelEl[k].hidden = !on;
  }
  if (lay) tabEl[t].focus();
}

// ---- Các khối nội dung (hoa-hong-dai / -tra-nhanh / -cap / -loai / -doi-tac / -hop) ----------------------------------------------
// Thẻ «cap» = veTheCap (Task 8), «loai» = veTheLoai (Task 9), «doi-tac» = veTheDoiTac (Task 10).
/** Đưa mắt tới một dòng: cuộn, tô sáng một lúc, đặt tiêu điểm (dòng không phải ô nhập nên cho nhận tiêu điểm bằng tabindex -1). */
function nhinDong(el: HTMLElement): void {
  el.scrollIntoView({ block: "center" });
  if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
  el.focus({ preventScroll: true });
  el.classList.add("hh-nhay");
  window.setTimeout(() => el.classList.remove("hh-nhay"), 2400);
}
/**
 * «Xem dòng ↓» của Tra nhanh (đặc tả §3.3): chuyển đúng thẻ (ghi `sessionStorage` như bấm thẻ), mở cụm / chi tiết chứa dòng, đặt tiêu điểm vào dòng.
 * Bộ lọc đang giấu dòng thì đưa về mặc định rồi thử lại; vẫn không thấy thì toast tông `bien`. Thẻ «Các cấp đại lý» không có bộ lọc dòng.
 */
export async function nhayToiDong(k: Api.ThuTraResponse["ketQua"]): Promise<void> {
  const t = theChoKetQua(k);
  if (!t) return;
  chonThe(t.the);
  const sel = `[data-dong-id="${CSS.escape(t.dongId)}"]`;
  let el: HTMLElement | null = null;
  if (t.doiTuong.loai === "DOI_TAC") {
    const tim = (): HTMLElement | null => panelEl["doi-tac"].querySelector<HTMLElement>(`.hh-dt[data-party="${CSS.escape(t.doiTuong.loai === "DOI_TAC" ? t.doiTuong.partyId : "")}"] ${sel}`);
    await moDoiTac(t.doiTuong.partyId);
    el = tim();
    if (!el) {
      datLaiLocDoiTac();
      await moDoiTac(t.doiTuong.partyId);
      el = tim();
    }
  } else if (t.doiTuong.loai === "VAI") {
    const tim = (): HTMLElement | null => panelEl.loai.querySelector<HTMLElement>(`[data-loai="${CSS.escape(t.doiTuong.loai === "VAI" ? t.doiTuong.code : "")}"] ${sel}`);
    el = tim();
    if (!el) {
      datLaiLocLoai();
      el = tim();
    }
  } else {
    const khung = moChiTietCap(t.doiTuong.code);
    el = khung?.querySelector<HTMLElement>(sel) ?? null;
    if (el && t.capRieng) khung!.prepend(h("p", { class: "hint hh-cap-rieng-tra" }, h("strong", null, t.doiTuong.ten), ` ${CAU_CAP_RIENG_DANG_TRA}`));
  }
  if (!el) {
    hienBaoNgan(CAU_KHONG_THAY_DONG, { tong: "bien" });
    return;
  }
  nhinDong(el);
}
function veTraNhanhVaDai(d: DuLieuHoaHong): void {
  veDai(daiEl, d);
  veTraNhanh(traNhanhEl, d, (k) => void nhayToiDong(k));
}
/** Mở hộp «Thêm mức» (nút đầu trang và thanh dính đáy). */
function moThemMuc(): void {
  moHop.themMuc();
}

function veTatCa(d: DuLieuHoaHong): void {
  veTraNhanhVaDai(d);
  veTheCap(panelEl.cap, d, moHop);
  veTheLoai(panelEl.loai, d, moHop);
  veTheDoiTac(panelEl["doi-tac"], d, moHop);
}

/** Nạp lại dữ liệu có thể đổi sau khi ghi, rồi vẽ lại cả ba thẻ. */
export async function napLai(): Promise<void> {
  if (!du) return;
  try {
    const [ds, mucTa, loai] = await Promise.all([
      api<Api.CommissionRuleListResponse>("/api/pricing/hoa-hong"),
      api<Api.MucTaListResponse>("/api/pricing/muc-ta"),
      api<Api.LoaiDoiTacListResponse>("/api/pricing/loai-doi-tac"),
    ]);
    du = { ...du, homNay: ds.homNay, dong: ds.dong, vai: ds.vai, mucTa, loai: loai.loai };
    veTatCa(du);
  } catch (err) {
    baoLoi(err);
  }
}

async function main(): Promise<void> {
  const dangTai = h("p", { class: "muted", role: "status" }, "Đang tải…");
  noiDungEl.before(dangTai);
  try {
    const [ds, dm, loai, mucTa] = await Promise.all([
      api<Api.CommissionRuleListResponse>("/api/pricing/hoa-hong"),
      taiDanhMuc(),
      api<Api.LoaiDoiTacListResponse>("/api/pricing/loai-doi-tac"),
      api<Api.MucTaListResponse>("/api/pricing/muc-ta"),
    ]);
    du = { homNay: ds.homNay, dong: ds.dong, vai: ds.vai, mucTa, loai: loai.loai, ten: dm.ten, dm, dichVuPhu: dm.loi === null ? dm.dichVu.map((s) => ({ code: s.code, groupCode: s.groupCode, ten: s.name })) : null, nguoiDung: staff };
    if (dm.loi) showError(errorEl, dm.loi);
  } catch (err) {
    dangTai.remove();
    baoLoi(err);
    return;
  }
  dangTai.remove();
  noiDungEl.hidden = false;

  THE.forEach((k, i) => {
    tabEl[k].addEventListener("click", () => chonThe(k));
    tabEl[k].addEventListener("keydown", (e) => {
      const toi = e.key === "ArrowRight" ? (i + 1) % THE.length : e.key === "ArrowLeft" ? (i - 1 + THE.length) % THE.length : e.key === "Home" ? 0 : e.key === "End" ? THE.length - 1 : -1;
      if (toi < 0) return;
      e.preventDefault();
      chonThe(THE[toi]!, true);
    });
  });

  // Nút «＋ Thêm mức»: chỉ người có quyền ghi (máy chủ kiểm lại). Điện thoại: thanh dính đáy; máy tính: nút ở đầu trang.
  if (can(staff, "partner.commission.write")) {
    nutThemEl.hidden = false;
    nutThemEl.addEventListener("click", moThemMuc);
    const nutDay = h("button", { type: "button", class: "btn btn-primary btn-chinh vc-btn", id: "hh-them-muc-day" }, "＋ Thêm mức");
    nutDay.addEventListener("click", moThemMuc);
    thanhCuoiEl.append(nutDay);
    thanhCuoiEl.hidden = false;
    // Nút nổi Trợ lý chỉ đo lại thanh đáy khi cuộn/đổi khổ (web/tro-ly.ts): thanh vừa hiện nên báo một lần để nút được nâng, không che «＋ Thêm mức».
    window.dispatchEvent(new Event("resize"));
  }

  chonThe(docTheNho());
  veTatCa(du);
}

await main();
