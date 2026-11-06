// Mục «Trả sau của tôi» ở trang Tôi (ADR-0173 Đ3 mục 3): đại lý xem hạn mức, số đang nợ, còn được dùng và từng đơn còn nợ của CHÍNH hồ sơ mình.
// Gọi: GET /api/tra-sau/cua-toi (máy chủ lấy hồ sơ từ phiên, ô credit.own.view phạm vi own). Chỉ hiện khi đang bật Trả sau hoặc còn nợ; lỗi ⇒ mục giữ ẩn (không chặn trang).
// Giờ theo giờ Việt Nam (`cauDonNo`). Không innerHTML; dựng bằng h().
import { api, type Api, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { cauDonNo, cauHanMuc } from "../src/shared/han-muc-tra-sau-hien-thi";
import { can } from "../src/shared/permissions";
import { dongTien } from "../src/shared/tra-sau";

export async function initTraSauCuaToi(staff: Staff, el: HTMLElement): Promise<void> {
  if (!can(staff, "credit.own.view", { ownerId: staff.id })) return;
  let r: Api.TraSauCuaToiResponse;
  try {
    r = await api<Api.TraSauCuaToiResponse>("/api/tra-sau/cua-toi");
  } catch {
    return;
  }
  if (!r.coHanMuc && r.dangNo <= 0) return;
  replaceChildren(
    el,
    h("h2", { id: "ts-cua-toi-heading" }, "Trả sau của tôi"),
    h("p", null, cauHanMuc(r)),
    h("p", null, `Đang nợ ${dongTien(r.dangNo)}`, r.conDuocDung === null ? "" : ` · Còn được dùng ${dongTien(r.conDuocDung)}`),
    r.don.length === 0
      ? h("p", { class: "muted" }, "Không có đơn nào còn nợ.")
      : h("ul", null, ...r.don.map((d) => h("li", { "data-trang-thai": d.trangThai }, h("a", { href: `/order?id=${encodeURIComponent(d.orderId)}` }, d.maDon), ` · ${cauDonNo(d)}`))),
  );
  el.hidden = false;
}
