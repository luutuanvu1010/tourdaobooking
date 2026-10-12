// Trang đầu của tài xế (/tai-xe — ADR-0040 D3; bản vẽ docs/design/van-chuyen-1a/project/07 Trang dau tai xe.dc.html). Lời chào, khối "Cuốc xe" = liên kết
// sang Cuốc của tôi (A4 T6: tài xế đối tác cũng có ô Cuốc — câu giữ chỗ cũ "sẽ hiện ở đây" đã bỏ ở A4 T9), "Giấy tờ của tôi" tóm tắt HAI giấy gần hạn nhất (điều phối chốt theo bản vẽ), "Xem tất cả" → trang Tôi (danh sách đủ).
// Chỉ gọi GET /api/parties/documents/mine (cổng "staff", số CHE) — không lời gọi đơn hàng nào. Tài khoản không phải "chỉ tài xế" → về Trang chủ "/".
import { chipHan, coMucGiayToCuaToi, haiGiayGanHan, loiChao, ngayVN, tenGiayTo } from "../src/shared/giay-to-hien-thi";
import { coCuocCuaToi, TRANG_CUOC } from "../src/shared/start-page";
import { moTrang } from "../src/shared/muc-giao-dien";
import { api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { chipEl, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

byId("tx-cuoc").prepend(icon("truck", 40, 1.5));

async function main(): Promise<void> {
  const staff = await initShell();
  // Trang này chỉ dành cho tài khoản "chỉ tài xế" (homeRedirect của "/" đưa họ tới đây); tài khoản khác gõ thẳng địa chỉ thì về Trang chủ của mình.
  // Chốt chặn khai ở bảng mục (`TRANG.trangTaiXe.moTrang` = chiTaiXe) — bảng và trang một nguồn.
  if (!moTrang("trangTaiXe", staff)) {
    location.replace("/");
    return;
  }
  // Q5 + A4 T9: tài xế (công ty và đối tác — ô trip.view `assigned`) có "Cuốc của tôi" — khối "Cuốc xe" thành liên kết sang đó; không có ô thì ẩn khối.
  if (coCuocCuaToi(staff)) {
    replaceChildren(byId("tx-cuoc"), h("a", { class: "vc-cuoc-link", href: TRANG_CUOC }, icon("truck", 40, 1.5), h("span", null, "Xem cuốc của tôi — hôm nay và ngày mai"), icon("next", 20)));
  } else byId("tx-cuoc").hidden = true;
  const now = new Date();
  const thu = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(now);
  const ngay = now.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  byId("tx-hello").textContent = loiChao(staff.fullName);
  byId("tx-date").textContent = `${thu.charAt(0).toLocaleUpperCase("vi-VN")}${thu.slice(1)}, ${ngay}`;

  const list = byId("tx-docs-list");
  // Ruling R18: tài khoản mang quyền Đối tác (kể cả lai) không có mục — không gọi route (máy chủ trả 403).
  if (!coMucGiayToCuaToi(staff)) {
    byId("tx-docs").hidden = true;
    return;
  }
  try {
    const { documents, warnDays } = await api<Api.PersonDocumentListResponse>("/api/parties/documents/mine");
    const hai = haiGiayGanHan(documents);
    if (hai.length === 0) {
      replaceChildren(list, h("p", { class: "vc-empty-line" }, "Chưa có giấy tờ nào. Báo văn phòng để cập nhật."));
      return;
    }
    replaceChildren(
      list,
      ...hai.map((d) =>
        h(
          "div",
          { class: "vc-txdoc" },
          h("span", { class: "vc-txdoc-text" }, h("span", { class: "vc-doc-title" }, tenGiayTo(d)), h("span", { class: "vc-txdoc-exp" }, d.expiryDate ? `Hết hạn ${ngayVN(d.expiryDate)}` : "Không hạn")),
          chipEl(chipHan(d.daysLeft, warnDays)),
        ),
      ),
    );
  } catch (err) {
    showError(byId("error"), loiCua(err));
  }
}
void main();
