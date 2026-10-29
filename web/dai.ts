// Dải trên trang — MỘT chủ sở hữu (đặc tả đợt 0, §5.6): bảo trì › ngoài mạng › thông báo › bảo mật, mỗi lúc chỉ hiện một dải trong `#strips`.
// Shell, Thông báo và (sau này) lớp mạng chỉ gọi `datDai`; luật chọn và chữ ở src/shared/dai-chu.ts. Mã này đi vào gói mọi trang: giữ gọn.
import { CAU_NGOAI_MANG, CAU_NGOAI_MANG_NGAN, KHOA_DAI_BAO_MAT_DA_DONG, TONG_DAI, chonDai, type LoaiDai } from "../src/shared/dai-chu.ts";
import { CAU_MAT_MANG_CHUA_TAI, CAU_MAT_MANG_TIEU_DE, CAU_MAT_MANG_TU_THU, NHAN_THU_LAI } from "../src/shared/trang-thai-he-thong-chu.ts";
import { h } from "./dom.ts";
import { icon } from "./icons.ts";

export interface NoiDungDai {
  cau: string;
  nut?: { nhan: string; href: string } | { nhan: string; khiBam: () => void };
  dongDuoc?: boolean;
}

const so = new Map<LoaiDai, NoiDungDai>();

/** `#strips` — tạo lười sau `#topbar`, cái nào chạy trước tạo (ADR-0034 R7). */
export function stripsEl(): HTMLElement {
  let el = document.getElementById("strips");
  if (!el) {
    el = h("div", { id: "strips" });
    document.getElementById("topbar")?.after(el);
  }
  return el;
}

function ve(): void {
  const el = stripsEl();
  el.replaceChildren();
  const loai = chonDai([...so.keys()]);
  const nd = loai && so.get(loai);
  if (!loai || !nd) return;
  const kieu = TONG_DAI[loai];
  const dai = h("div", { class: "dai", "data-tong": kieu.tong, "data-loai": loai, role: "status" }, icon(kieu.hinh, 18), h("span", { class: "dai-cau" }, nd.cau));
  const nut = nd.nut;
  if (nut && "href" in nut) dai.append(h("a", { class: "nut", "data-cap": "phu", href: nut.href }, nut.nhan));
  else if (nut) dai.append(h("button", { class: "nut", "data-cap": "phu", type: "button", onclick: nut.khiBam }, nut.nhan));
  if (nd.dongDuoc) {
    dai.append(
      h("button", {
        class: "dai-dong",
        type: "button",
        "aria-label": "Đóng",
        onclick: () => {
          so.delete(loai);
          if (loai === "bao-mat") {
            try {
              sessionStorage.setItem(KHOA_DAI_BAO_MAT_DA_DONG, "1");
            } catch {
              // bỏ qua
            }
          }
          ve();
        },
      }, icon("close", 18)),
    );
  }
  el.append(dai);
}

/** Đặt (hoặc gỡ bằng `null`) dải của một loại; trang biểu mẫu (`data-khuon="bieu-mau"`) không nhận dải bảo mật. */
export function datDai(loai: LoaiDai, noiDung: NoiDungDai | null): void {
  if (noiDung && loai === "bao-mat" && typeof document.body?.dataset !== "undefined" && document.body.dataset.khuon === "bieu-mau") return;
  if (noiDung) so.set(loai, noiDung);
  else so.delete(loai);
  ve();
}

/** Hiện dải «ngoài mạng» (kèm nút Thử lại tải lại trang); thân đã là khối «chưa nạp» (có nút Thử lại riêng) thì chỉ câu ngắn, không nút. */
export function hienDaiNgoaiMang(): void {
  datDai("ngoai-mang", document.querySelector('[data-loai="mat-mang-chua-nap"]') ? { cau: CAU_NGOAI_MANG_NGAN } : { cau: CAU_NGOAI_MANG, nut: { nhan: NHAN_THU_LAI, khiBam: taiLai } });
}

/** Tải lại trang (nút Thử lại, có mạng lại ở nhánh mất mạng của shell) — một hàm dùng chung cho gọn gói. */
export const taiLai = (): void => location.reload();

/** Máy chủ vừa trả lời một lần gọi (web/api.ts) ⇒ đã có mạng: gỡ dải «ngoài mạng» nếu đang hiện (vd sau một lần hết giờ 45 giây). */
export function goDaiNgoaiMang(): void {
  if (so.delete("ngoai-mang")) ve();
}

/** Nghe tín hiệu mạng: `"ngoai-mang"` (lớp mạng phát) → dải; `"online"` → gỡ dải và phát `"co-mang"` cho trang tự tải lại dữ liệu. */
export function ganNgoaiMang(): void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  window.addEventListener("ngoai-mang", hienDaiNgoaiMang);
  window.addEventListener("online", () => {
    goDaiNgoaiMang();
    window.dispatchEvent(new Event("co-mang"));
  });
}

/** Khối "chưa có dữ liệu để hiện khi ngoài mạng" — chữ của Task 4, dựng riêng để không kéo `trang-thai-he-thong.ts` vào gói mọi trang. */
export function thanNgoaiMang(thuLai: () => void): HTMLElement {
  return h(
    "section",
    { class: "trang-thai", "data-loai": "mat-mang-chua-nap" },
    icon("clock", 40),
    h("h2", null, CAU_MAT_MANG_TIEU_DE),
    h("p", null, CAU_MAT_MANG_CHUA_TAI),
    h("p", { class: "trang-thai-phu" }, CAU_MAT_MANG_TU_THU),
    h("button", { class: "btn btn-primary", type: "button", onclick: thuLai }, NHAN_THU_LAI),
  );
}

/** Thay thân `<main>` bằng khối «chưa có dữ liệu» — trừ khi trang đã tự vẽ một khối trạng thái hệ thống (vd /ngoai-mang) hoặc khai `data-ve-truoc-shell`
 * (trang tự vẽ nội dung TRƯỚC initShell, vd /help đọc được nhật ký khi mất mạng). Chỉ gọi ở nhánh mất mạng của initShell (không bao giờ quay lại vẽ tiếp). */
export function veThanNgoaiMang(chinh: Element | null, thuLai: () => void): void {
  if (chinh && !chinh.hasAttribute("data-ve-truoc-shell") && !chinh.querySelector("[data-loai]")) chinh.replaceChildren(thanNgoaiMang(thuLai));
}
