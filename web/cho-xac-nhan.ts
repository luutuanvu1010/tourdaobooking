// Trang «Đơn chờ xác nhận» (ADR-0136 Đ6, Đ9; Task 3.5). Gọi `GET /api/orders/cho-xac-nhan` (DonChoXacNhanResponse): KHÔNG tên khách / SĐT / email — DTO không có chỗ chứa.
// Ẩn/hiện hỏi bảng quyền: ô `order.confirm.review` (cùng cổng route); máy chủ vẫn kiểm lại. Quá hạn chỉ là cảnh báo (không tự huỷ). Hạn do máy chủ gửi — ở đây chỉ đổi ra chữ.
// Khuôn Danh sách của khung gốc (ADR-0222; đợt A chủ duyệt 24/11/2026): một khối «Danh sách chờ», mỗi đơn một dòng của `.ds-dong` (chữ trái, nút «Kiểm vé» phải — nút
// phụ, ADR-0234: một màn tối đa một nút nền đặc). Đang tải / rỗng / lỗi: khuôn trạng thái chung TRONG khối; không có quyền: cả trang là khuôn «không có quyền».
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { NHAN_CAN_DAT_GAP, dongChoXacNhan } from "../src/shared/xac-nhan-hien-thi";
import { homeRedirect } from "../src/shared/start-page";
import { ngayDayDu } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { initShell } from "./shell";
import { trangThaiHeThong, trangThaiToanTrang } from "./trang-thai-he-thong";

const dsEl = byId("cx-danh-sach");
const trangThaiEl = byId("cx-trang-thai");

const staff = await initShell();

function dong(d: Api.DonChoXacNhanDto, nowMs: number): HTMLElement {
  const han = dongChoXacNhan({ hanLuc: d.hanLuc, nowMs });
  const duong = `/order?id=${encodeURIComponent(d.orderId)}`;
  const meta = [d.ngayDi ? `Đi ngày ${ngayDayDu(d.ngayDi)}` : "Chưa có ngày đi", `${d.soKhach} khách`, d.gioDon ? `Đón ${d.gioDon}` : "Chưa có giờ đón"].join(" · ");
  return h(
    "li",
    { class: "dong cx-the", "data-order-id": d.orderId },
    h(
      "div",
      { class: "dong-chu" },
      h(
        "span",
        { class: "cx-the-dau" },
        h("a", { class: "cx-the-ma", href: duong }, d.orderCode),
        d.quaHan ? h("span", { class: "huy-hieu", "data-tong": "do" }, icon("alertCircle", 14), "Quá hạn") : null,
        d.canDatGap ? h("span", { class: "huy-hieu", "data-tong": "cat" }, icon("clock", 14), NHAN_CAN_DAT_GAP) : null,
      ),
      h("span", null, d.dichVu.join(", ")),
      h("span", { class: "o-phu" }, `${meta} · Tổng `, h("span", { class: "money-due" }, vnd(d.tong))),
      h("span", { class: "o-phu", "data-chu": "han" }, han.text),
    ),
    h("a", { class: "nut", "data-cap": "phu", href: duong, "data-action": "kiem-ve" }, "Kiểm vé"),
  );
}

async function tai(): Promise<void> {
  try {
    const r = await api<Api.DonChoXacNhanResponse>("/api/orders/cho-xac-nhan");
    const now = Date.now();
    dsEl.hidden = r.don.length === 0;
    replaceChildren(dsEl, ...r.don.map((d) => dong(d, now)));
    replaceChildren(trangThaiEl, r.don.length === 0 ? trangThaiHeThong("rong", { cau: "Không có đơn nào đang chờ xác nhận." }) : null);
  } catch (err) {
    dsEl.hidden = true;
    replaceChildren(trangThaiEl, trangThaiHeThong("loi-may-chu", { loi: err instanceof ApiError ? err : null, thuLai: () => void tai() }));
  }
}

if (!can(staff, "order.confirm.review")) {
  trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" });
} else {
  replaceChildren(trangThaiEl, trangThaiHeThong("dang-tai", { khuon: "danh-sach" }));
  await tai();
  window.addEventListener("don-thay-doi", () => void tai());
  window.addEventListener("can-tai-lai", () => void tai());
}
