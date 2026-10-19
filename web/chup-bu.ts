// Trang "Chụp bù mức" (sổ đại lý đợt 2, Task 12; Task 6 — ADR-0079 điều 7 b2, Ruling R-52, R-53, R-P13, R-P19). Gọi hai route của module orders:
//   GET  /api/orders/cho-chup-bu       → ChoChupBuResponse: đơn đã xác nhận, chưa giao, CHƯA có bản chụp nào (mã đơn, ngày xác nhận, bên đặt, lý do — không tên / SĐT khách, không tiền);
//   POST /api/orders/:id/chup-bu       → 200 ChupBuResponse; 409 nêu dịch vụ còn thiếu mức (không ghi gì) / đơn đã có bản chụp / đã giao.
// «Chụp bù cả danh sách» gọi TỪNG đơn lần lượt (R-53: không có route hàng loạt); đơn chụp được thì xong, đơn còn thiếu mức hiện đúng câu máy chủ ngay dưới đơn đó.
// Ẩn/hiện hỏi bảng quyền: ô `order.terms.override` VÀ không giữ quyền Đối tác (cùng cổng route). Máy chủ vẫn kiểm lại. Nhãn lý do ở src/shared/ben-kia-hien-thi.ts (có bài).
import { ApiError, api, type Api } from "./api";
import { can, holdsPartner } from "../src/shared/permissions";
import { nhanLyDoChupBu } from "../src/shared/ben-kia-hien-thi";
import { ngayDayDu } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("cb-noi-dung");
const caDsEl = byId("cb-ca-danh-sach");
const dsEl = byId("cb-danh-sach");

const staff = await initShell();
const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

function hienOk(text: string | null): void {
  okEl.textContent = text ?? "";
  okEl.hidden = !text;
}

if (!can(staff, "order.terms.override") || holdsPartner(staff)) {
  showError(errorEl, "Trang Chụp bù mức chỉ Kế toán, Quản trị và Toàn quyền dùng được.");
} else {
  noiDungEl.hidden = false;
  replaceChildren(dsEl, h("p", { class: "muted" }, "Đang tải…"));

  /** Một đơn: chụp bù; trả câu lỗi (409 của máy chủ) hoặc null khi xong. Nút + dòng trạng thái của đơn do nơi gọi vẽ. */
  const chupMot = async (d: Api.ChoChupBuDto): Promise<string | null> => {
    try {
      await api<Api.ChupBuResponse>(`/api/orders/${encodeURIComponent(d.orderId)}/chup-bu`, { method: "POST", body: {} });
      return null;
    } catch (err) {
      return reasonOf(err);
    }
  };

  const dongDon = (d: Api.ChoChupBuDto): { li: HTMLElement; chay: () => Promise<boolean> } => {
    const nut = h("button", { type: "button", class: "btn", "data-action": "chup-bu-don", "data-order-id": d.orderId }, "Chụp bù");
    const trangThai = h("p", { class: "muted", role: "status", hidden: true });
    const li = h(
      "li",
      { "data-order-id": d.orderId },
      h("a", { href: `/order?id=${encodeURIComponent(d.orderId)}` }, d.maDon),
      ` · xác nhận ${ngayDayDu(d.ngayXacNhan)} · ${d.benDat ? `bên đặt ${d.benDat}` : "khách lẻ"}`,
      h("p", { class: "muted" }, nhanLyDoChupBu(d.lyDo)),
      h("div", { class: "handler-actions" }, nut),
      trangThai,
    );
    const chay = async (): Promise<boolean> => {
      nut.disabled = true;
      const loi = await chupMot(d);
      trangThai.hidden = false;
      if (loi === null) {
        trangThai.className = "muted";
        trangThai.textContent = d.lyDo === "nhap_tay" ? "Đã chụp bù. Mở đơn để ghi mức tay cho dịch vụ nhập tay." : "Đã chụp bù.";
        nut.remove();
        return true;
      }
      trangThai.className = "alert";
      trangThai.textContent = loi;
      nut.disabled = false;
      return false;
    };
    nut.addEventListener("click", () => void chay());
    return { li, chay };
  };

  async function tai(): Promise<void> {
    let res: Api.ChoChupBuResponse;
    try {
      res = await api<Api.ChoChupBuResponse>("/api/orders/cho-chup-bu");
    } catch (err) {
      replaceChildren(caDsEl);
      replaceChildren(dsEl, h("p", { class: "alert", role: "alert" }, reasonOf(err)));
      return;
    }
    if (res.don.length === 0) {
      replaceChildren(caDsEl);
      replaceChildren(dsEl, h("p", { class: "muted" }, "Không còn đơn nào chờ chụp bù."));
      return;
    }
    const dong = res.don.map(dongDon);
    const caDs = h("button", { type: "button", class: "btn btn-primary", "data-action": "chup-bu-ca-danh-sach" }, `Chụp bù cả danh sách (${res.don.length} đơn)`);
    caDs.addEventListener("click", async () => {
      caDs.disabled = true;
      hienOk(null);
      let xong = 0;
      for (const d of dong) if (await d.chay()) xong++;
      const con = dong.length - xong;
      hienOk(con === 0 ? `Đã chụp bù ${xong} đơn.` : `Đã chụp bù ${xong} đơn; ${con} đơn còn thiếu mức — xem câu dưới từng đơn.`);
      caDs.disabled = con === 0;
    });
    replaceChildren(caDsEl, h("div", { class: "handler-actions" }, caDs));
    replaceChildren(dsEl, h("ul", { class: "pay-list cb-list", "data-khoi": "cho-chup-bu" }, ...dong.map((d) => d.li)));
  }
  await tai();
}
