// Giấy tờ sắp hết hạn (/giay-to-sap-het-han — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/06 Sap het han.dc.html). Giấy xe và giấy tài xế chung MỘT
// danh sách, xếp theo ngày hết hạn gần nhất (máy chủ xếp; giấy đã hết hạn tự nổi lên đầu), biểu tượng xe / người đầu dòng; bấm dòng mở chi tiết xe hoặc hồ sơ ở
// Danh bạ. KHÔNG có số giấy tờ (máy chủ không trả). Mốc (mặc định 30 ngày) chỉ Toàn quyền đổi được (ô settings.ops) — bản vẽ không vẽ ô này (kế hoạch B6): nút
// chữ "Đổi mốc" nhỏ cạnh dòng tiêu đề, bảng trượt một ô số.
import { chipHan, duongDanDong, ngayVN, tenGiayTo } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
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

let doiMoc: HTMLButtonElement | null = null;
let moc = 30; // mốc đang hiệu lực — cập nhật mỗi lần dựng (sau khi đổi mốc, bảng đổi mốc mở lại với số mới)

const vong = (it: Api.ExpiringItemDto, size: number): HTMLElement =>
  h("span", { class: "vc-ring", role: "img", "aria-label": it.kind === "vehicle" ? "Xe" : "Người" }, icon(it.kind === "vehicle" ? "truck" : "me", size));

function ve(r: Api.ExpiringListResponse): void {
  moc = r.warnDays;
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
  // Huy hiệu "Sắp hết hạn" ở thanh bên theo số mới (sau khi đổi mốc).
  const huyHieu = document.querySelector('#sidebar a[href="/giay-to-sap-het-han"] .sidebar-item-badge');
  if (huyHieu) {
    if (r.count > 0) huyHieu.textContent = String(r.count);
    else huyHieu.remove();
  }
}

function moDoiMoc(opener: HTMLElement, hienTai: number): void {
  const o = h("input", { id: "due-days", class: "vc-input", type: "number", inputMode: "numeric", min: "1", max: "365", step: "1", value: String(hienTai), "aria-describedby": "due-days-hint" });
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "vc-btn btn btn-primary" }, "Lưu mốc");
  const bang = moBangTruot({
    title: "Mốc nhắc giấy tờ sắp hết hạn",
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-field" }, h("label", { for: "due-days" }, "Số ngày nhắc trước"), o, h("div", { id: "due-days-hint", class: "vc-hint" }, "Giấy hết hạn trong số ngày này và giấy đã hết hạn hiện trong danh sách. Đổi có hiệu lực ngay, có ghi nhật ký.")),
        loi,
      ),
    ],
    foot: [luu],
    footClass: "vc-sheet-foot",
    opener,
  });
  if (!bang) return;
  luu.addEventListener("click", async () => {
    bang.setBusy(true);
    luu.disabled = true;
    try {
      await api<Api.VanChuyenMetaResponse>("/api/van-chuyen/nguong-het-han", { method: "POST", body: { warnDays: Number(o.value) } });
      ve(await api<Api.ExpiringListResponse>("/api/van-chuyen/sap-het-han"));
      bang.close(false);
      doiMoc?.focus();
    } catch (err) {
      replaceChildren(loi, icon("alert", 16, 2), loiCua(err));
      loi.hidden = false;
      luu.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

const staff = await initShell();
datCrumb("Vận chuyển", "Sắp hết hạn");
try {
  const r = await layDanhSachSapHet();
  if (can(staff, "settings.ops")) {
    doiMoc = h("button", { id: "due-threshold", type: "button", class: "vc-btn vc-btn-text vc-due-doi" }, "Đổi mốc");
    doiMoc.addEventListener("click", () => moDoiMoc(doiMoc!, moc));
    byId("due-subrow").append(doiMoc);
  }
  ve(r);
} catch (err) {
  showError(errorEl, loiCua(err));
}
