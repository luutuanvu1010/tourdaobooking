// Trang «Đơn chờ xác nhận» (ADR-0136 Đ6, Đ9; Task 3.5). Gọi `GET /api/orders/cho-xac-nhan` (DonChoXacNhanResponse): KHÔNG tên khách / SĐT / email — DTO không có chỗ chứa.
// Ẩn/hiện hỏi bảng quyền: ô `order.confirm.review` (cùng cổng route); máy chủ vẫn kiểm lại. Quá hạn chỉ là cảnh báo (không tự huỷ). Hạn do máy chủ gửi — ở đây chỉ đổi ra chữ.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { NHAN_CAN_DAT_GAP, dongChoXacNhan } from "../src/shared/xac-nhan-hien-thi";
import { ngayDayDu } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const noiDungEl = byId("cx-noi-dung");
const dsEl = byId("cx-danh-sach");
const trongEl = byId("cx-trong");

const staff = await initShell();

function the(d: Api.DonChoXacNhanDto, nowMs: number): HTMLElement {
  const han = dongChoXacNhan({ hanLuc: d.hanLuc, nowMs });
  const dong = [
    d.dichVu.join(", "),
    [d.ngayDi ? `Đi ngày ${ngayDayDu(d.ngayDi)}` : "Chưa có ngày đi", `${d.soKhach} khách`, d.gioDon ? `Đón ${d.gioDon}` : "Chưa có giờ đón"].join(" · "),
    `Tổng ${vnd(d.tong)}`,
  ];
  return h(
    "li",
    { class: "cx-the", "data-order-id": d.orderId },
    h(
      "div",
      { class: "cx-the-dau" },
      h("a", { class: "cx-the-ma", href: `/order?id=${encodeURIComponent(d.orderId)}` }, d.orderCode),
      h("span", { class: "cx-the-nhan" }, d.quaHan ? h("span", { class: "cx-nhan-qua-han" }, "Quá hạn") : null, d.canDatGap ? h("span", { class: "cx-nhan-gap" }, NHAN_CAN_DAT_GAP) : null),
    ),
    ...dong.map((t) => h("p", { class: "cx-the-dong" }, t)),
    h("p", { class: "cx-the-dong", "data-chu": "han" }, han.text),
    h("a", { class: "btn btn-accent cx-ds-nut", href: `/order?id=${encodeURIComponent(d.orderId)}`, "data-action": "kiem-ve" }, "Kiểm vé"),
  );
}

async function tai(): Promise<void> {
  try {
    const r = await api<Api.DonChoXacNhanResponse>("/api/orders/cho-xac-nhan");
    const now = Date.now();
    trongEl.hidden = r.don.length > 0;
    replaceChildren(dsEl, ...r.don.map((d) => the(d, now)));
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
}

if (!can(staff, "order.confirm.review")) {
  showError(errorEl, "Tài khoản này không xét duyệt xác nhận đơn.");
} else {
  noiDungEl.hidden = false;
  await tai();
  window.addEventListener("don-thay-doi", () => void tai());
  window.addEventListener("can-tai-lai", () => void tai());
}
