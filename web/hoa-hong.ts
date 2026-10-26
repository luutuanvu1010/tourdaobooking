// Trang «Hoa hồng đối tác» (thiết kế lại, PR 2) — KHUNG: nạp dữ liệu, chuyển hai thẻ «Mức đang áp dụng» / «Thiết lập», truyền dữ liệu cho các khối nội dung.
// Gọi (chỉ đọc, ở đây): GET /api/pricing/hoa-hong (CommissionRuleListResponse), /api/pricing/muc-ta (MucTaListResponse), /api/pricing/loai-doi-tac (LoaiDoiTacListResponse), /api/catalog.
// Ẩn/hiện hỏi bảng quyền (`can`): xem = partner.commission.view, thêm mức = partner.commission.write; máy chủ kiểm lại (403 ⇒ «Bạn không có quyền xem trang này.»).
// Trang không tính tiền, không chọn mức: số và lời từ máy chủ / luật thuần ở src/shared/hoa-hong-hien-thi.ts. Thẻ «Mức đang áp dụng»: web/hoa-hong-tra-nhanh.ts, -bang.ts, -hop.ts; thẻ «Thiết lập» vào đợt sau.
import { CAU_KHONG_CO_QUYEN_XEM, type TenDanhMuc } from "../src/shared/hoa-hong-hien-thi";
import { can, type PermissionHolder } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { cuonToiDong, veBangApDung } from "./hoa-hong-bang";
import { taoMoHop } from "./hoa-hong-hop";
import { veThietLap } from "./hoa-hong-thiet-lap";
import { veTraNhanh } from "./hoa-hong-tra-nhanh";
import { initShell, showError } from "./shell";
import { lyDoLoi, taiDanhMuc, type DanhMuc } from "./so-dai-ly-ui";

/** Dữ liệu một lần nạp, truyền cho mọi khối. Ghi xong gọi `napLai` để nạp lại và vẽ lại cả hai thẻ. */
export interface DuLieuHoaHong {
  homNay: string;
  dong: Api.CommissionRuleDto[];
  vai: { code: string; ten: string }[];
  mucTa: Api.MucTaListResponse;
  loai: Api.LoaiDoiTacDto[];
  ten: TenDanhMuc;
  /** Danh sách dịch vụ và nhóm để chọn trong ô «Dịch vụ» (Tra nhanh, hộp Thêm mức). */
  dm: DanhMuc;
  nguoiDung: PermissionHolder;
}

type The = "ap-dung" | "thiet-lap";
const THE: readonly The[] = ["ap-dung", "thiet-lap"];
const KHOA_THE = "hh-the";

const errorEl = byId("error");
const noiDungEl = byId("hh-noi-dung");
const nutThemEl = byId<HTMLButtonElement>("hh-them-muc");
const thanhCuoiEl = byId("hh-thanh-cuoi");
const panelEl: Record<The, HTMLElement> = { "ap-dung": byId("hh-the-ap-dung"), "thiet-lap": byId("hh-the-thiet-lap") };
const tabEl: Record<The, HTMLElement> = { "ap-dung": byId("hh-tab-ap-dung"), "thiet-lap": byId("hh-tab-thiet-lap") };

const staff = await initShell();

let du: DuLieuHoaHong | null = null;

const okEl = byId("ok");
/** Khung vàng giữ sau khi đóng hộp (cảnh báo mức riêng thắng chính sách); nằm ngoài hai thẻ nên không mất khi vẽ lại. */
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
});

/** Hiện câu lỗi ở đầu trang và cuộn tới nó. */
function baoLoi(err: unknown): void {
  showError(errorEl, err instanceof ApiError && err.status === 403 ? CAU_KHONG_CO_QUYEN_XEM : lyDoLoi(err));
  errorEl.scrollIntoView({ block: "nearest" });
}

function docTheNho(): The {
  try {
    return sessionStorage.getItem(KHOA_THE) === "thiet-lap" ? "thiet-lap" : "ap-dung";
  } catch {
    return "ap-dung";
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

// ---- Chỗ giữ cho các khối nội dung (đợt sau thay bằng hoa-hong-tra-nhanh / -bang / -hop / -thiet-lap) --------------------------------------------------
function veTheApDung(d: DuLieuHoaHong): void {
  const traNhanh = h("div", null);
  const bang = h("div", null);
  replaceChildren(panelEl["ap-dung"], traNhanh, bang);
  veTraNhanh(traNhanh, d, cuonToiDong);
  veBangApDung(bang, d, moHop, () => chonThe("thiet-lap", true));
}
function veTheThietLap(d: DuLieuHoaHong): void {
  veThietLap(panelEl["thiet-lap"], d, moHop);
}
/** Mở hộp «Thêm mức» (nút đầu trang và thanh dính đáy). */
function moThemMuc(): void {
  moHop.themMuc();
}

function veTatCa(d: DuLieuHoaHong): void {
  veTheApDung(d);
  veTheThietLap(d);
}

/** Nạp lại dữ liệu có thể đổi sau khi ghi, rồi vẽ lại cả hai thẻ. */
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
    du = { homNay: ds.homNay, dong: ds.dong, vai: ds.vai, mucTa, loai: loai.loai, ten: dm.ten, dm, nguoiDung: staff };
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
