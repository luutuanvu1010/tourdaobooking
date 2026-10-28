// Dải trên trang — MỘT chủ sở hữu (đặc tả đợt 0, §5.6): bảo trì › ngoài mạng › thông báo › bảo mật, mỗi lúc chỉ hiện một dải trong `#strips`.
// Shell, Thông báo và (sau này) lớp mạng chỉ gọi `datDai`; luật chọn và chữ ở src/shared/dai-chu.ts. Mã này đi vào gói mọi trang: giữ gọn.
import { CAU_NGOAI_MANG, KHOA_DAI_BAO_MAT_DA_DONG, TONG_DAI, chonDai, type LoaiDai } from "../src/shared/dai-chu";
import { CAU_MAT_MANG_CHUA_NAP, CAU_MAT_MANG_TIEU_DE, CAU_MAT_MANG_TU_THU, NHAN_THU_LAI } from "../src/shared/trang-thai-he-thong-chu";
import { h } from "./dom";
import { icon } from "./icons";

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

/** Nghe tín hiệu mạng: `"ngoai-mang"` (lớp mạng phát) → dải; `"online"` → gỡ dải và phát `"co-mang"` cho trang tự tải lại dữ liệu. */
export function ganNgoaiMang(): void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  window.addEventListener("ngoai-mang", () => datDai("ngoai-mang", { cau: CAU_NGOAI_MANG, nut: { nhan: NHAN_THU_LAI, khiBam: () => location.reload() } }));
  window.addEventListener("online", () => {
    datDai("ngoai-mang", null);
    window.dispatchEvent(new Event("co-mang"));
  });
}

/** Khối "chưa có dữ liệu để hiện khi ngoài mạng" — chữ của Task 4, dựng riêng để không kéo `trang-thai-he-thong.ts` vào gói mọi trang. */
export function thanNgoaiMang(thuLai: () => void): HTMLElement {
  const nut = h("button", { class: "btn btn-primary", type: "button" }, NHAN_THU_LAI);
  nut.addEventListener("click", thuLai);
  return h(
    "section",
    { class: "trang-thai", "data-loai": "mat-mang-chua-nap" },
    icon("clock", 40),
    h("h2", null, CAU_MAT_MANG_TIEU_DE),
    h("p", null, CAU_MAT_MANG_CHUA_NAP),
    h("p", { class: "trang-thai-phu" }, CAU_MAT_MANG_TU_THU),
    nut,
  );
}
