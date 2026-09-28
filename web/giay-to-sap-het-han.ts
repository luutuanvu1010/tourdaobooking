// Giấy tờ sắp hết hạn (/giay-to-sap-het-han — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/06 Sap het han.dc.html). Giấy xe và giấy tài xế chung MỘT
// danh sách, xếp theo ngày hết hạn gần nhất (máy chủ xếp; giấy đã hết hạn tự nổi lên đầu), biểu tượng xe / người đầu dòng; bấm dòng mở chi tiết xe hoặc hồ sơ ở
// Danh bạ. KHÔNG có số giấy tờ (máy chủ không trả). Mốc (mặc định 30 ngày) KHÔNG đổi ở màn này — Ruling R23 (điều phối 2026-09-28): bản vẽ và danh sách màn chủ
// duyệt không có ô đổi mốc, chip giấy tờ người còn cố định 30 ngày nên đổi ở giao diện làm hai nơi lệch nhau; route máy chủ giữ nguyên, lượt 1b làm lại.
import { chipHan, duongDanDong, ngayVN, tenGiayTo } from "../src/shared/giay-to-hien-thi";
import type { Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { chipEl, datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";
import { layDanhSachSapHet } from "./vc-dem";

const errorEl = byId("error");
const subEl = byId("due-sub");
const titleEl = byId("due-title");
const emptyEl = byId("due-empty");
const listEl = byId("due-list");
const tableEl = byId("due-table");
emptyEl.prepend(icon("checkCircle", 44, 1.5));

const vong = (it: Api.ExpiringItemDto, size: number): HTMLElement =>
  h("span", { class: "vc-ring", role: "img", "aria-label": it.kind === "vehicle" ? "Xe" : "Người" }, icon(it.kind === "vehicle" ? "truck" : "me", size));

function ve(r: Api.ExpiringListResponse): void {
  replaceChildren(titleEl, h("span", { class: "vc-desk" }, "Giấy tờ sắp hết hạn"), h("span", { class: "vc-phone" }, `Trong ${r.warnDays} ngày tới`));
  replaceChildren(
    subEl,
    h("strong", { class: "vc-desk" }, `Trong ${r.warnDays} ngày tới`),
    h("span", { class: "vc-desk" }, " · gồm cả giấy đã hết hạn"),
    h("span", { class: "vc-phone" }, "Gồm cả giấy đã hết hạn"),
    ` · ${r.count} giấy`,
  );
  emptyEl.hidden = r.items.length > 0;
  replaceChildren(
    listEl,
    ...r.items.map((it) =>
      h(
        "a",
        { class: "vc-due-row", href: duongDanDong(it) },
        vong(it, 22),
        h("span", { class: "vc-due-text" }, h("span", { class: "vc-due-who" }, it.label), h("span", { class: "vc-due-doc" }, `${tenGiayTo(it)} · ${ngayVN(it.expiryDate)}`), chipEl(chipHan(it.daysLeft, r.warnDays))),
        h("span", { class: "vc-due-chevron" }, icon("next", 20)),
      ),
    ),
  );
  listEl.hidden = r.items.length === 0;
  replaceChildren(
    tableEl,
    h("div", { class: "vc-due-grid vc-th vc-due-head", "aria-hidden": "true" }, h("span", null, ""), h("span", null, "XE / NGƯỜI"), h("span", null, "LOẠI GIẤY"), h("span", null, "HẾT HẠN"), h("span", null, "CÒN"), h("span", null, "")),
    ...r.items.map((it) =>
      h(
        "a",
        { class: "vc-due-grid vc-due-trow", href: duongDanDong(it) },
        vong(it, 20),
        h("span", { class: "vc-due-who" }, it.label),
        h("span", { class: "vc-due-doc" }, tenGiayTo(it)),
        h("span", { class: "vc-due-exp" }, ngayVN(it.expiryDate)),
        h("span", null, chipEl(chipHan(it.daysLeft, r.warnDays))),
        h("span", { class: "vc-due-chevron" }, icon("next", 18)),
      ),
    ),
  );
  tableEl.hidden = r.items.length === 0;
  // Huy hiệu "Sắp hết hạn" ở thanh bên khớp đúng danh sách vừa vẽ (cùng một lần đọc với web/vc-dem.ts; ẩn khi 0).
  const huyHieu = document.querySelector('#sidebar a[href="/giay-to-sap-het-han"] .sidebar-item-badge');
  if (huyHieu) {
    if (r.count > 0) huyHieu.textContent = String(r.count);
    else huyHieu.remove();
  }
}

await initShell();
datCrumb("Vận chuyển", "Sắp hết hạn");
try {
  ve(await layDanhSachSapHet());
} catch (err) {
  showError(errorEl, loiCua(err));
}
