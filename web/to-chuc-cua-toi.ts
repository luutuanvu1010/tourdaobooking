// Mục «Hồ sơ tổ chức» ở trang Tôi (ADR-0213 Đ6; mốc B1 Task 14): lối vào màn của người quản lý — mỗi tổ chức bạn đang quản lý một dòng. Danh sách do máy chủ trả
// (`GET /api/to-chuc/cua-toi`, chỉ tư cách tổ chức); không có tổ chức nào ⇒ mục giữ ẩn; lỗi ⇒ mục giữ ẩn (không chặn trang). Không innerHTML.
import { api, type Api, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { holdsPartner } from "../src/shared/permissions";

export async function initToChucCuaToi(staff: Staff, el: HTMLElement): Promise<void> {
  if (!holdsPartner(staff)) return;
  let ds: Api.TuCachCuaToiResponse["tuCach"];
  try {
    ds = (await api<Api.TuCachCuaToiResponse>("/api/to-chuc/cua-toi")).tuCach.filter((t) => t.laToChuc);
  } catch {
    return;
  }
  if (ds.length === 0) return;
  replaceChildren(
    el,
    h("h2", { id: "tc-cua-toi-heading" }, "Hồ sơ tổ chức"),
    h("ul", null, ...ds.map((t) => h("li", null, h("a", { href: `/to-chuc?id=${encodeURIComponent(t.partyId)}` }, t.ten), " · Người quản lý tổ chức"))),
  );
  el.hidden = false;
}
