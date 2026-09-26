// Bộ lắng nghe chung của Bảng tin (ADR-0022, TD-1/TD-2/TD-4): MỘT kết nối WebSocket mỗi trang đã đăng nhập (initShell() gọi batDauBangTin cuối hàm;
// trang không gọi initShell — vd. đăng nhập — thì không bao giờ mở). Tin đến → phát `don-thay-doi` (gộp trong 1 giây) trên window; nối lại thành
// công → `can-tai-lai`; Task 9 cho các trang nghe hai sự kiện này. Toàn bộ quyết định (nối lại, ping, gộp) nằm ở ./bangtin-logic (thuần, có test);
// ở đây chỉ nối vào WebSocket/window/document thật.
import type { StaffProfile } from "../src/shared/contracts";
import type { SuKienDon } from "../src/shared/bang-tin";
import { vuaLamBoiTabNay } from "./api";
import { taoBoDieuKhien, taoBoThongBao, type OSocket } from "./bangtin-logic";
import { chuanBiVungThongBao, hienThongBao } from "./toast";

/** Cờ module: mỗi trang chỉ một kết nối dù initShell() bị gọi lại. */
let daBatDau = false;

export function batDauBangTin(staff: StaffProfile): void {
  if (daBatDau) return;
  daBatDau = true;
  chuanBiVungThongBao(); // vùng aria-live phải có sẵn (rỗng) TRƯỚC khi chèn thông báo, không thì nhiều trình đọc màn hình không đọc
  const thongBao = taoBoThongBao(staff, vuaLamBoiTabNay, hienThongBao, (fn, ms) => setTimeout(fn, ms));
  const bo = taoBoDieuKhien({
    moSocket: () => new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/bang-tin`) as unknown as OSocket,
    hen: (fn, ms) => setTimeout(fn, ms),
    huyHen: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    ngauNhien: () => Math.random(),
    khiSuKien: thongBao,
    khiDot: (ds) => window.dispatchEvent(new CustomEvent<SuKienDon[]>("don-thay-doi", { detail: ds })),
    khiCanTaiLai: () => window.dispatchEvent(new CustomEvent("can-tai-lai")),
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") bo.noiNgay();
  });
  window.addEventListener("online", () => bo.noiNgay());
  window.addEventListener("pagehide", () => bo.dung());
  // Trang quay lại từ bộ nhớ đệm chuyển trang (Safari): `pagehide` đã đóng kết nối, mở lại.
  window.addEventListener("pageshow", (ev) => {
    if (ev.persisted) bo.tiepTuc();
  });
  bo.batDau();
}
