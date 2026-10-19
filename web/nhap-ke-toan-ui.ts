// Khối "Phần mềm kế toán" trên trang đơn (ADR-0060): dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập". Người xem được (ô accounting.entry.view) thấy
// trạng thái hiện tại; Kế toán / Toàn quyền (ô accounting.entry.mark) thấy nút đánh dấu / sửa số / bỏ dấu (lý do bắt buộc) và các lần trước (A-7).
// Giao diện chỉ ẩn/hiện; máy chủ kiểm lại mọi lệnh. Hộp xác nhận dùng CHUNG khuôn `hangXacNhan` của web/order.ts (truyền vào — không chép).
import { api, type Api } from "./api";
import { h } from "./dom";
import { dateTime } from "./format";
import { LY_DO_TOI_DA, SO_HOA_DON_TOI_DA, moTaDauNhap } from "../src/shared/nhap-ke-toan";

export type HangXacNhan = (opts: {
  nhan: string;
  action: string;
  cau: string;
  nutGhi: string;
  o?: HTMLElement[];
  ghi: () => Promise<unknown>;
  bao: string;
  kiem?: () => string | null;
}) => HTMLElement;

const dongPhu = (d: Api.NhapKeToanDongDto): string =>
  `${d.daNhap ? "Đánh dấu" : "Bỏ đánh dấu"} ${dateTime(d.luc)} · ${d.nguoiBam ?? "—"}`;

export function khoiNhapKeToan(orderId: string, d: Api.NhapKeToanResponse, hang: HangXacNhan): HTMLElement {
  const ht = d.hienTai;
  const url = `/api/orders/${encodeURIComponent(orderId)}/nhap-ke-toan`;
  const gui = (than: Api.NhapKeToanInput) => api(url, { method: "POST", body: than });
  const oSo = (giaTri: string): HTMLInputElement =>
    h("input", { type: "text", autocomplete: "off", maxlength: String(SO_HOA_DON_TOI_DA), value: giaTri, placeholder: "Ví dụ HD-000123 (không bắt buộc)" }) as HTMLInputElement;

  const nut: HTMLElement[] = [];
  if (d.coTheGhi) {
    if (!ht?.daNhap) {
      if (d.donDaXacNhan) {
        const so = oSo("");
        nut.push(hang({
          nhan: "Đánh dấu đã nhập", action: "nhap-kt-danh-dau", nutGhi: "Đánh dấu",
          cau: "Đánh dấu đơn này đã nhập phần mềm kế toán?",
          o: [h("label", null, "Số hoá đơn đã nhập", so)],
          ghi: () => gui({ daNhap: true, soHoaDon: so.value.trim() || null, truocDo: ht?.id ?? null }),
          bao: "Đã đánh dấu đã nhập phần mềm kế toán.",
        }));
      } else {
        nut.push(h("p", { class: "muted" }, "Đánh dấu được khi đơn đã xác nhận."));
      }
    } else {
      // Sửa số = đánh dấu lại (máy chủ chỉ nhận khi đơn đã xác nhận — A-3): đơn nháp / đã huỷ chỉ còn "Bỏ đánh dấu" (kiểm độc lập 30/9).
      const so = oSo(ht.soHoaDon ?? "");
      if (d.donDaXacNhan) nut.push(hang({
        nhan: "Sửa số hoá đơn", action: "nhap-kt-sua-so", nutGhi: "Lưu số",
        cau: "Sửa số hoá đơn đã nhập (lần cũ vẫn được giữ lại):",
        o: [h("label", null, "Số hoá đơn đã nhập", so)],
        ghi: () => gui({ daNhap: true, soHoaDon: so.value.trim() || null, truocDo: ht.id }),
        bao: "Đã lưu số hoá đơn đã nhập.",
      }));
      const lyDo = h("input", { type: "text", autocomplete: "off", maxlength: String(LY_DO_TOI_DA), placeholder: "Vì sao bỏ dấu (bắt buộc)" }) as HTMLInputElement;
      nut.push(hang({
        nhan: "Bỏ đánh dấu", action: "nhap-kt-bo-dau", nutGhi: "Bỏ đánh dấu",
        cau: "Bỏ đánh dấu đã nhập phần mềm kế toán của đơn này? Lần đánh dấu cũ vẫn được giữ lại.",
        o: [h("label", null, "Lý do", lyDo)],
        kiem: () => (lyDo.value.trim() ? null : "Nhập lý do bỏ dấu."),
        ghi: () => gui({ daNhap: false, lyDo: lyDo.value.trim(), truocDo: ht.id }),
        bao: "Đã bỏ dấu đã nhập phần mềm kế toán.",
      }));
    }
  }

  const truocDo = d.truocDo && d.truocDo.length
    ? h(
        "details",
        { "data-khoi": "nhap-kt-truoc-do" },
        h("summary", null, `Các lần trước (${d.truocDo.length})`),
        h("ul", { class: "history" }, ...d.truocDo.map((x) => h("li", null, h("span", { class: "muted" }, dongPhu(x)), h("div", null, moTaDauNhap(x))))),
      )
    : null;

  return h(
    "section",
    { class: "card", "data-khoi": "nhap-ke-toan" },
    h("h2", null, "Phần mềm kế toán"),
    ht?.daNhap
      ? h("p", { class: "money-ok", "data-khoi": "nhap-kt-trang-thai" }, moTaDauNhap(ht))
      : h("p", { class: "muted", "data-khoi": "nhap-kt-trang-thai" }, "Chưa nhập phần mềm kế toán"),
    ht ? h("p", { class: "muted" }, dongPhu(ht), !ht.daNhap && ht.lyDo ? ` · lý do: ${ht.lyDo}` : null) : null,
    nut.length ? h("div", { class: "kt-actions" }, ...nut) : null,
    truocDo,
  );
}
