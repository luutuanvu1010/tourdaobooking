// Xe đang chạy (/xe-dang-chay) — Vận chuyển Đợt 5, ADR-0052 D5; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html, V11 bảng 11.1.
// - Ô trip.view (cùng mục "Điều phối xe" — `thayDieuPhoiXe`). Đọc GET /api/van-chuyen/lich của HÔM QUA, HÔM NAY, NGÀY MAI (chuyến chạy qua nửa đêm; xuất bến sớm chuyến ngày mai), lọc RUNNING.
// - Mỗi thẻ "mã · Đang chạy · biển số · x/y chỗ" mở Chi tiết chuyến (web/chuyen.ts) — nơi có "Việc của văn phòng", "Khách đang chờ".
// - Tin Bảng tin về chuyến / nối lại → tải lại danh sách.
import type { ChuyenTomTatDto, LichChungResponse } from "../src/shared/contracts";
import { thayDieuPhoiXe } from "../src/shared/dieu-phoi-man";
import { addDays, vnToday } from "../src/shared/vn-date";
import { chuyenDangChay, theXeDangChay } from "../src/shared/xe-dang-chay-man";
import { api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { chip } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { taoBoLamMoi } from "./lam-moi-logic";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const trangEl = byId("xdc-trang");
const staff = await initShell();

async function nap(): Promise<ChuyenTomTatDto[]> {
  const homNay = vnToday(new Date());
  const ngay = [addDays(homNay, -1), homNay, addDays(homNay, 1)];
  const lich = await Promise.all(ngay.map((d) => api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${d}`)));
  const theoId = new Map<string, ChuyenTomTatDto>();
  for (const l of lich) for (const c of l.chuyen) theoId.set(c.id, c);
  return chuyenDangChay({ chuyen: [...theoId.values()] });
}

function ve(ds: readonly ChuyenTomTatDto[]): void {
  const homNay = vnToday(new Date());
  replaceChildren(
    trangEl,
    h("div", { class: "xdc-head" }, h("h1", { class: "dp-ct-title" }, "Xe đang chạy"), h("span", { class: "dp-card-note" }, `${ds.length} xe`)),
    ds.length
      ? h("div", { class: "xdc-list" }, ...ds.map((c) => {
          const t = theXeDangChay(c, homNay);
          return h(
            "a",
            { class: "vc-card xdc-the", href: `/chuyen?id=${encodeURIComponent(c.id)}`, "data-chuyen": c.id },
            h("span", { class: "xdc-the-dau" }, h("strong", { class: "xdc-ma" }, t.tieuDe), chip("Đang chạy", "navy"), h("span", { class: "xdc-dong" }, t.dong)),
            h("span", { class: "dp-note" }, t.phu),
            icon("next", 20),
          );
        }))
      : h("div", { class: "vc-card xdc-rong" }, "Hiện không có xe nào đang chạy."),
  );
}

async function main(): Promise<void> {
  if (!thayDieuPhoiXe(staff)) return showError(errorEl, "Tài khoản này không xem được lịch xe.");
  datCrumb("Vận chuyển", "Xe đang chạy");
  try {
    ve(await nap());
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
}
await main();

const lamMoi = taoBoLamMoi(async () => {
  if (!thayDieuPhoiXe(staff)) return;
  try {
    const ds = await nap();
    showError(errorEl, null);
    ve(ds);
  } catch (e) {
    showError(errorEl, loiCua(e));
  }
});
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
