// Cuốc của tôi (/cuoc) — ADR-0049 V5 (route 19), trang mở đầu của tài xế công ty (Q5); bản vẽ docs/design/van-chuyen-dieu-phoi/project/04 Cuoc cua toi.dc.html
// (4a, 4b điện thoại; 4c máy tính); bản đối chiếu 2.5, H15; ruling R-P17.
// - Hôm nay + ngày mai + ngày kia (góp ý T3); mỗi chuyến: giờ xuất bến, trạng thái, mã, biển số, số khách, số điểm đón / trả; điều kiện còn thiếu "(văn phòng lo)".
// - KHÔNG tên, KHÔNG SĐT khách ở màn này (DTO không có). Chuyến đang chạy: "Mở chuyến đang chạy". Bấm thẻ → /cuoc-chuyen?id= (xuất bến / đang chạy).
// - HT-24: chuyến đang chạy vắt qua 0 giờ (hoặc xuất bến sớm) vẫn ở "Hôm nay", đứng đầu, dòng "Xuất bến dd/mm" (`nhomCuoc`).
// - Giờ kết thúc dự kiến (bản vẽ "06:40 – 08:25") chưa có trong DTO route 19 — chỉ hiện giờ xuất bến (ghi câu hỏi Q-B-12 ở nhật ký).
import { nhomCuoc } from "../src/shared/tien-do-man";
import type { CuocCuaToiResponse } from "../src/shared/contracts";
import { coCuocCuaToi } from "../src/shared/start-page";
import { addDays, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { chip } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";
import { taoBoLamMoi } from "./lam-moi-logic";

const errorEl = byId("error");
const dsEl = byId("cu-ds");

let daMo = false;

async function main(): Promise<void> {
  const staff = await initShell();
  if (!coCuocCuaToi(staff)) return showError(errorEl, "Tài khoản này không có cuốc xe.");
  daMo = true;
  await veDanhSach();
}

/** Ngày hôm nay + hai ngày sau, đọc lại từ máy chủ mỗi lần (mở trang, tin chuyến, nối lại Bảng tin). */
async function veDanhSach(): Promise<void> {
  const homNay = vnToday(new Date());
  const [y, m, d] = homNay.split("-");
  const thu = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(new Date());
  byId("cu-ngay").textContent = `${thu.charAt(0).toLocaleUpperCase("vi-VN")}${thu.slice(1)}, ${d}/${m}/${y}`;
  let r: CuocCuaToiResponse;
  try {
    r = await api<CuocCuaToiResponse>(`/api/van-chuyen/cuoc-cua-toi?tu=${homNay}&den=${addDays(homNay, 2)}`);
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  errorEl.hidden = true;
  replaceChildren(
    dsEl,
    ...nhomCuoc(r.chuyen, homNay).map((g) =>
      h(
        "section",
        { class: "dp-cuoc-day", "aria-labelledby": `cu-${g.iso}` },
        h("div", { class: "dp-cuoc-day-head" }, h("h2", { id: `cu-${g.iso}`, class: "dp-cuoc-day-title" }, g.tieuDe), h("span", { class: "dp-cuoc-date" }, g.ngay)),
        ...(g.the.length
          ? g.the.map((t) =>
              h(
                "a",
                { class: `vc-card dp-cuoc-the${t.moChay ? " is-chay" : ""}`, href: `/cuoc-chuyen?id=${encodeURIComponent(t.id)}`, "data-chuyen": t.id },
                h("span", { class: "dp-cuoc-top" }, h("span", { class: "dp-cuoc-gio" }, t.gio), h("span", { class: "dp-cuoc-ma" }, t.ma), chip(t.chip.nhan, t.chip.tone)),
                t.nhanNgay ? h("span", { class: "dp-cuoc-xb-ngay" }, t.nhanNgay) : null,
                h("span", { class: "dp-cuoc-dong" }, t.dong),
                ...t.canhBao.map((c) => h("span", { class: "dp-cuoc-canh-bao" }, icon("alert", 16, 2), h("span", null, c))),
                t.moChay ? h("span", { class: "vc-btn btn btn-primary dp-cuoc-mo" }, "Mở chuyến đang chạy") : null,
              ),
            )
          : [h("p", { class: "dp-cuoc-trong" }, "Không có cuốc nào.")]),
      ),
    ),
  );
}
await main();

// ADR-0052 D6.4: chuyến của tài xế đổi (được xếp, bị đổi ra, sửa, huỷ) → danh sách tự tải lại; nối lại Bảng tin → tải lại.
const lamMoi = taoBoLamMoi(async () => {
  if (daMo) await veDanhSach();
});
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
