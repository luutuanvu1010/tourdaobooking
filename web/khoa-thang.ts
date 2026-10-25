// Trang "Khoá sổ tháng" — Kế toán, Toàn quyền (ADR-0080 phần D1; đặc tả sổ đại lý đợt 1 §8, §13; Task 12). Gọi hai route của module billing:
//   GET  /api/ledger/ky                  → KySoResponse: các tháng đã khoá, tháng khoá được kế tiếp, bảng kiểm của tháng đó, `coTheKhoa`;
//   POST /api/ledger/ky/:period/khoa     → thân tuỳ chọn { ghiChu }; 201 trả lại KySoResponse mới (trang vẽ lại theo đó, không tự tính gì).
// Ẩn/hiện hỏi bảng quyền (`can`) — cùng ô máy chủ hỏi: xem trang = `ledger.view` (không ngữ cảnh, tức Kế toán + Toàn quyền); nút khoá = `ledger.period.close` VÀ máy chủ báo
// `coTheKhoa`. Máy chủ vẫn kiểm lại mọi thứ. Bảng kiểm KHÔNG chặn việc khoá (Kế toán quyết). Khoá không mở lại được — hộp xác nhận trong trang (không dùng hộp thoại của
// trình duyệt) nói rõ điều đó. Số tiền chỉ định dạng để hiện, trang không cộng trừ gì (tiền dẫn xuất tính ở máy chủ). Chữ ở `src/shared/khoa-thang-hien-thi.ts` (có bài kiểm).
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { GHI_CHU_KHOA_TOI_DA, nhanThang } from "../src/shared/ky-khoa";
import {
  CAU_BANG_KIEM_KHONG_CHAN,
  CAU_CHUA_KHOA_THANG_NAO,
  CAU_HET_THANG_KHOA,
  CAU_KHONG_CO,
  GOI_Y_GHI_CHU_KHOA,
  cauDaKhoaXong,
  cauXacNhanKhoa,
  demKhoan,
  nhanNutKhoa,
  nhanNutXacNhanKhoa,
  thangDaKhoaMoiTruoc,
  tieuDeKeTiep,
} from "../src/shared/khoa-thang-hien-thi";
import { ngayDayDu } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("ky-noi-dung");
const daKhoaEl = byId("ky-da-khoa");
const tieuDeKeTiepEl = byId("ky-ke-tiep-tieu-de");
const bangKiemEl = byId("ky-bang-kiem");
const khuKhoaEl = byId("ky-khoa-khu");

const staff = await initShell();
ganDaiTrangAnhEm("/khoa-thang", staff); // mục gộp «Sổ công nợ & khoá sổ» (25/10): dải chuyển nhanh hai trang

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

function hienOk(text: string | null): void {
  okEl.textContent = text ?? "";
  okEl.hidden = !text;
}

if (!can(staff, "ledger.view")) {
  showError(errorEl, "Trang Khoá sổ tháng chỉ Kế toán và Toàn quyền xem được.");
} else {
  /** Có ô khoá thật (hỏi bảng quyền) — cộng với `coTheKhoa` máy chủ báo (còn tháng để khoá). */
  const duocKhoa = can(staff, "ledger.period.close");
  let ky: Api.KySoResponse | null = null;
  /** Hộp xác nhận đang mở (chỉ cho tháng `ky.keTiep`). */
  let xacNhan = false;

  noiDungEl.hidden = false;
  const dangTai = (): HTMLElement => h("p", { class: "muted" }, "Đang tải…");
  replaceChildren(daKhoaEl, dangTai());
  replaceChildren(bangKiemEl, dangTai());

  /** Tải (hoặc tải lại) trạng thái kỳ sổ. `giuLoi`: sau một lỗi 409 vừa hiện, đừng để lỗi tải lại đè câu của máy chủ. */
  async function load(giuLoi = false): Promise<void> {
    try {
      ky = await api<Api.KySoResponse>("/api/ledger/ky");
    } catch (err) {
      if (!giuLoi) showError(errorEl, reasonOf(err));
    }
    render();
  }

  /** Khoá tháng `period`; 201 vẽ lại theo thân phản hồi. 409 (tháng vừa được khoá, không liền kề…) và 400 `period_not_past` hiện đúng câu của máy chủ rồi tải lại cho khỏi nhìn số cũ;
   *  400 `invalid_input` (ghi chú bị từ chối) hiện câu của máy chủ và GIỮ hộp cùng chữ đã gõ. */
  async function khoa(period: string, ghiChu: string, tatDieuKhien: (tat: boolean) => void): Promise<void> {
    showError(errorEl, null);
    hienOk(null);
    tatDieuKhien(true);
    try {
      ky = await api<Api.KySoResponse>(`/api/ledger/ky/${encodeURIComponent(period)}/khoa`, { method: "POST", body: ghiChu ? { ghiChu } : {} });
      xacNhan = false;
      render();
      hienOk(cauDaKhoaXong(period));
      okEl.scrollIntoView({ block: "nearest" });
    } catch (err) {
      showError(errorEl, reasonOf(err));
      // `#error` ở đầu trang còn hộp xác nhận ở đáy: không cuộn thì (nhất là trên điện thoại) người dùng không thấy câu từ chối (khuôn các trang chính sách điều phối).
      errorEl.scrollIntoView({ block: "nearest" });
      if (err instanceof ApiError && (err.status === 409 || err.code === "period_not_past")) {
        // Tháng vừa được khoá / không còn là tháng khoá được: số liệu trên màn đã cũ, đóng hộp và tải lại.
        xacNhan = false;
        await load(true);
      } else {
        // Mọi lỗi khác, nhất là 400 `invalid_input` của ghi chú (máy chủ không nhận dãy ≥ 8 chữ số, kể cả ngày viết «30.09.2026»): GIỮ hộp và chữ đã gõ để người dùng sửa
        // ghi chú rồi bấm lại. Luật ghi chú chỉ ở máy chủ (`docGhiChuKy`); trang không chép lại.
        tatDieuKhien(false);
        if (err instanceof ApiError && err.code === "invalid_input") document.getElementById("ky-ghi-chu")?.focus({ preventScroll: true });
      }
    }
  }

  const dongKhoan = (k: { orderCode: string | null; amount: number; ngay: string }): HTMLElement =>
    h("li", { class: "ky-dong" }, h("strong", null, k.orderCode ?? "—"), h("span", { class: "ky-dong-tien" }, vnd(k.amount)), h("span", { class: "muted" }, ngayDayDu(k.ngay)));

  /** Khối khoản (mã đơn, số tiền, ngày): số khoản ở đầu (`demKhoan`: rỗng ghi "Không có"). Chỉ đếm bằng `length`, không cộng tiền. */
  function khoiKhoan(tieuDe: HTMLElement, ds: readonly { orderCode: string | null; amount: number; ngay: string }[], dau: string): HTMLElement {
    return h(
      "div",
      { class: "ky-khoi", "data-khoi": dau },
      tieuDe,
      h("p", { class: "muted" }, demKhoan(ds.length)),
      ds.length > 0 && h("ul", { class: "ky-dong-ds" }, ...ds.map(dongKhoan)),
    );
  }

  function veBangKiem(k: Api.KySoResponse): void {
    const b = k.bangKiem;
    if (k.keTiep === null || b === null) {
      replaceChildren(bangKiemEl, h("p", { class: "muted" }, CAU_HET_THANG_KHOA));
      return;
    }
    replaceChildren(
      bangKiemEl,
      h("p", { class: "muted" }, CAU_BANG_KIEM_KHONG_CHAN),
      khoiKhoan(h("h3", null, "Khoản thu chờ đối chiếu"), b.choXacNhanCongTy, "cho-xac-nhan"),
      khoiKhoan(h("h3", null, "Khoản thu chưa rõ người thu tiền"), b.chuaRoNguoiThu, "chua-ro"),
      h(
        "div",
        { class: "ky-khoi", "data-khoi": "so-du" },
        h("h3", null, "Số dư từng bên cuối tháng"),
        b.soDuCuoiThang.length === 0
          ? h("p", { class: "muted" }, CAU_KHONG_CO)
          : h("ul", { class: "ky-dong-ds" }, ...b.soDuCuoiThang.map((s) => h("li", { class: "ky-dong" }, h("strong", null, s.ten), h("span", { class: "ky-dong-tien" }, vnd(s.soDu))))),
      ),
    );
  }

  /** Nút "Khoá tháng MM/YYYY" (chỉ khi được khoá) hoặc hộp xác nhận thay chỗ nút. */
  function veKhu(k: Api.KySoResponse): void {
    const period = k.keTiep;
    if (period === null || !k.coTheKhoa || !duocKhoa) {
      replaceChildren(khuKhoaEl);
      return;
    }
    if (!xacNhan) {
      const nut = h("button", { type: "button", id: "ky-khoa-btn", class: "btn btn-primary btn-chinh" }, nhanNutKhoa(period));
      nut.addEventListener("click", () => {
        xacNhan = true;
        veKhu(k);
        byId("ky-xac-nhan").focus(); // đưa người dùng tới hộp (không focus ô gõ: bàn phím điện thoại sẽ bật lên che câu cảnh báo)
        byId("ky-xac-nhan").scrollIntoView({ block: "nearest" });
      });
      replaceChildren(khuKhoaEl, h("div", { class: "actions" }, nut));
      return;
    }
    const ghiChuEl = h("textarea", { id: "ky-ghi-chu", rows: 2, maxlength: GHI_CHU_KHOA_TOI_DA, autocomplete: "off", "aria-describedby": "ky-ghi-chu-goi-y" });
    const nutXacNhan = h("button", { type: "button", id: "ky-xac-nhan-btn", class: "btn btn-primary btn-chinh" }, nhanNutXacNhanKhoa(period));
    const nutThoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const tat = (t: boolean): void => {
      nutXacNhan.disabled = t;
      nutThoi.disabled = t;
      ghiChuEl.disabled = t;
    };
    nutXacNhan.addEventListener("click", () => void khoa(period, ghiChuEl.value.trim(), tat));
    nutThoi.addEventListener("click", () => {
      xacNhan = false;
      veKhu(k);
      byId("ky-khoa-btn").focus();
    });
    replaceChildren(
      khuKhoaEl,
      h(
        "div",
        { id: "ky-xac-nhan", class: "maint-confirm", role: "group", "aria-label": "Xác nhận khoá sổ tháng", tabindex: -1 },
        h("p", null, h("strong", null, cauXacNhanKhoa(period))),
        h("label", null, "Ghi chú (không bắt buộc)", ghiChuEl),
        h("span", { class: "hint", id: "ky-ghi-chu-goi-y" }, GOI_Y_GHI_CHU_KHOA), // ngoài nhãn để đọc màn hình không đọc hai lần (đã nối bằng aria-describedby)
        h("div", { class: "maint-actions" }, nutXacNhan, nutThoi),
      ),
    );
  }

  function render(): void {
    if (ky === null) {
      replaceChildren(daKhoaEl);
      replaceChildren(bangKiemEl);
      replaceChildren(khuKhoaEl);
      return;
    }
    const ds = thangDaKhoaMoiTruoc(ky.daKhoa);
    replaceChildren(
      daKhoaEl,
      ds.length === 0
        ? h("p", { class: "muted" }, CAU_CHUA_KHOA_THANG_NAO)
        : h("ul", { class: "ky-thang" }, ...ds.map((p) => h("li", { "data-thang": p }, h("span", { class: "badge badge-confirmed" }, nhanThang(p))))),
    );
    tieuDeKeTiepEl.textContent = tieuDeKeTiep(ky.keTiep);
    veBangKiem(ky);
    veKhu(ky);
  }

  await load();
}
