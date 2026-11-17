// Nút của nháp THÀNH VIÊN tổ chức ở trang đơn (ADR-0213 Đ8; mốc B2 Task 17): «Gửi người quản lý xác nhận», «Rút lại» (rút lần gửi người quản lý), «Trả lại» (người quản lý, kèm lý do
// trong danh sách đóng). Chỉ ẩn / hiện theo khối `thanhVien` do MÁY CHỦ gửi kèm chi tiết đơn; mọi cổng thật ở máy chủ (thanh-vien-route.ts). Dựng bằng `h()`, không innerHTML.
// Câu «Tổ chức chưa có người quản lý, hãy liên hệ Tour Đảo» (Đ8.7) là câu 409 của máy chủ — trang chỉ hiện lại nguyên văn.
import { api, type Api } from "./api";
import { h } from "./dom";
import { hoiXacNhan, moBangTruot } from "./bang-truot";
import { MA_LY_DO_TRA_LAI, NHAN_CHE_DO_THANH_VIEN, NHAN_LY_DO_TRA_LAI } from "../src/shared/to-chuc";
import type { BoiCanhXacNhan } from "./xac-nhan-don-ui";

function nut(nhan: string, cls: string, action: string, chay: () => Promise<void>): HTMLButtonElement {
  const n = h("button", { type: "button", class: cls, "data-action": action }, nhan) as HTMLButtonElement;
  n.addEventListener("click", async () => {
    n.disabled = true;
    try { await chay(); } finally { n.disabled = false; }
  });
  return n;
}

const goi = async (c: BoiCanhXacNhan, duong: string, than: unknown, cau: string): Promise<void> => {
  c.xoaBao();
  try {
    await api(`/api/orders/${encodeURIComponent(c.orderId)}/${duong}`, { method: "POST", body: than });
    await c.lamMoi({ tone: "success", text: cau });
  } catch (err) {
    c.baoLoi(err);
  }
};

/** Nút và câu cho người lập là thành viên (không phải người quản lý đang thay nháp). */
export function nutThanhVien(c: BoiCanhXacNhan, tv: Api.ThanhVienTrenDonDto, chan: string | null): HTMLElement[] {
  if (tv.choVanPhong) return [h("p", { class: "muted", "data-thanh-vien": "cho-van-phong" }, "Người quản lý đã gửi đơn lên Tour Đảo. Đơn đang chờ kiểm vé.")];
  if (tv.dangCho) {
    return [
      h("p", { class: "muted", "data-thanh-vien": "dang-cho" }, "Đơn đang chờ người quản lý của tổ chức xác nhận. Muốn sửa, bấm «Rút lại»."),
      nut("Rút lại", "btn", "rut-gui-quan-ly", async () => {
        if (!(await hoiXacNhan({ tieuDe: "Rút lại", hauQua: "Rút lại yêu cầu gửi người quản lý? Đơn trở về nháp để bạn sửa tiếp.", nhanNguyHiem: "Rút lại" }))) return;
        await goi(c, "rut-gui-quan-ly", {}, "Đã rút lại. Đơn trở về nháp.");
      }),
    ];
  }
  // Kiểm toàn mốc B2 (I-B): lý do lần trả lại gần nhất (máy chủ chỉ gửi cho người lập, nhãn tiếng Việt).
  const traLai: HTMLElement | null = tv.lyDoTraLai ? h("p", { class: "dd-canh-xn", "data-thanh-vien": "tra-lai" }, `Người quản lý đã trả lại đơn. Lý do: ${tv.lyDoTraLai}.`) : null;
  const chiSoan: HTMLElement = h("p", { class: "muted", "data-thanh-vien": "chi-soan" }, `Tổ chức đang ở chế độ «${NHAN_CHE_DO_THANH_VIEN.CHI_SOAN}»: người quản lý tự xem nháp này và gửi lên Tour Đảo.`);
  if (tv.cheDo === "CHI_SOAN") return traLai ? [traLai, chiSoan] : [chiSoan];
  const g = nut("Gửi người quản lý xác nhận", "btn btn-accent", "gui-quan-ly", () => goi(c, "gui-quan-ly", {}, "Đã gửi người quản lý. Đơn đang chờ người quản lý xác nhận."));
  if (chan) g.disabled = true;
  return traLai ? [traLai, g] : [g];
}

/** «Trả lại» (người quản lý, nháp đang chờ): bảng trượt chọn một lý do trong danh sách đóng. */
export function nutTraLai(c: BoiCanhXacNhan): HTMLButtonElement {
  const n = h("button", { type: "button", class: "btn", "data-action": "tra-lai" }, "Trả lại") as HTMLButtonElement;
  n.addEventListener("click", () => {
    const o = h("select", { class: "o", id: "tra-lai-ly-do", "aria-label": "Lý do trả lại" },
      h("option", { value: "" }, "Chọn lý do"), ...MA_LY_DO_TRA_LAI.map((m) => h("option", { value: m }, NHAN_LY_DO_TRA_LAI[m]))) as HTMLSelectElement;
    const loi = h("p", { class: "o-loi", hidden: true }, "Hãy chọn một lý do.");
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi") as HTMLButtonElement;
    const tra = h("button", { type: "button", class: "btn btn-danger", "data-action": "tra-lai-gui" }, "Trả lại") as HTMLButtonElement;
    const bang = moBangTruot({
      title: "Trả lại cho thành viên",
      body: [h("p", null, "Đơn về lại thành viên để sửa; bạn thôi thấy đơn tới khi thành viên gửi lại."), h("label", { class: "dk-o" }, h("span", { class: "nhan" }, "Lý do"), o), loi],
      foot: [thoi, tra],
      opener: n,
    });
    if (!bang) return;
    thoi.addEventListener("click", () => bang.close());
    tra.addEventListener("click", () => void (async () => {
      if (!o.value) { loi.hidden = false; o.focus(); return; }
      tra.disabled = true;
      bang.close();
      await goi(c, "tra-lai", { lyDo: o.value }, "Đã trả lại đơn cho thành viên.");
    })());
  });
  return n;
}
