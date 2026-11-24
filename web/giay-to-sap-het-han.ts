// Giấy tờ sắp hết hạn (/giay-to-sap-het-han — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/06 Sap het han.dc.html). Giấy xe và giấy tài xế chung MỘT
// danh sách, xếp theo ngày hết hạn gần nhất (máy chủ xếp; giấy đã hết hạn tự nổi lên đầu), biểu tượng xe / người đầu dòng; bấm dòng mở chi tiết xe hoặc hồ sơ ở
// Danh bạ. Bố cục: khuôn Danh sách của khung gốc (ADR-0222) — bảng từ 800, danh sách dòng hẹp hơn. KHÔNG có số giấy tờ (máy chủ không trả). Toàn quyền (ô `settings.ops`) đổi mốc bằng nút "Đổi mốc nhắc" (khuôn kế hoạch B6 của 1a: nút chữ cạnh dòng tiêu đề,
// bảng trượt một ô số) — R23 đã hết điều kiện vì giấy tờ người nay đọc mốc từ API (Task 4).
// ADR-0048 D1 (Task B4, khuôn dòng phụ sẵn có): dòng có `ownerLabel` (xe của nhà xe; tài xế đối tác — tên nhà xe) thêm nhãn phụ "Nhà xe: <tên>" — chỉ TÊN.
import { can } from "../src/shared/permissions";
import { chipHan, duongDanDong, ngayVN, tenGiayTo } from "../src/shared/giay-to-hien-thi";
import { api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { chipEl, datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { truong } from "./khung";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";
import { layDanhSachSapHet } from "./vc-dem";

const errorEl = byId("error");
const subEl = byId("due-sub");
const khoiEl = byId("due-khoi");
const emptyEl = byId("due-empty");
const listEl = byId("due-list");
const tableEl = byId("due-table");
const rowsEl = byId("due-rows");

/** Nhãn phụ "Nhà xe: <tên>" (ADR-0048 D1); null = của công ty chủ hiện tại / tài xế công ty. */
const nhanNhaXe = (it: Api.ExpiringItemDto): HTMLElement | null => (it.ownerLabel ? h("span", { class: "o-phu" }, `Nhà xe: ${it.ownerLabel}`) : null);

/** Biểu tượng xe / người đầu dòng (vòng tròn của phân hệ Vận chuyển). */
const vong = (it: Api.ExpiringItemDto, size: number): HTMLElement =>
  h("span", { class: "vc-ring", role: "img", "aria-label": it.kind === "vehicle" ? "Xe" : "Người" }, icon(it.kind === "vehicle" ? "truck" : "me", size));

function ve(r: Api.ExpiringListResponse): void {
  const cau = h("p", { class: "doan-dan" }, `Trong ${r.warnDays} ngày tới · gồm cả giấy đã hết hạn · ${r.count} giấy`);
  let doiMoc: HTMLButtonElement | null = null;
  if (can(staff, "settings.ops")) {
    doiMoc = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "doi-moc" }, "Đổi mốc nhắc");
    const nut = doiMoc;
    nut.addEventListener("click", () => moDoiMoc(nut, r.warnDays));
  }
  replaceChildren(subEl, cau, doiMoc);
  khoiEl.hidden = false;
  emptyEl.hidden = r.items.length > 0;
  replaceChildren(
    listEl,
    ...r.items.map((it) =>
      h(
        "a",
        { class: "dong", href: duongDanDong(it) },
        vong(it, 22),
        h(
          "span",
          { class: "dong-chu" },
          h("span", null, it.label), // chữ thường: huy hiệu hạn bên dưới đã là điểm nhấn của dòng (ADR-0234 nguyên tắc 1)
          nhanNhaXe(it),
          h("span", { class: "o-phu" }, `${tenGiayTo(it)} · ${ngayVN(it.expiryDate)}`),
          h("span", null, chipEl(chipHan(it.daysLeft, r.warnDays))),
        ),
        icon("next", 20),
      ),
    ),
  );
  listEl.hidden = r.items.length === 0;
  replaceChildren(
    rowsEl,
    ...r.items.map((it) =>
      h(
        "tr",
        null,
        h("td", null, h("span", { class: "hang" }, vong(it, 20), h("span", null, h("a", { href: duongDanDong(it) }, h("strong", null, it.label)), nhanNhaXe(it)))),
        h("td", null, tenGiayTo(it)),
        h("td", { "data-gon": "" }, ngayVN(it.expiryDate)),
        h("td", null, chipEl(chipHan(it.daysLeft, r.warnDays))),
        h("td", null, icon("next", 18)),
      ),
    ),
  );
  tableEl.hidden = r.items.length === 0;
  // Huy hiệu ở thanh bên khớp đúng danh sách vừa vẽ (cùng một lần đọc với web/vc-dem.ts; ẩn khi 0). Từ menu theo việc (15/10) huy hiệu này nằm ở mục gộp
  // "Xe & giấy tờ" (liên kết /xe, web/shell.ts trinhBay) — không còn mục riêng /giay-to-sap-het-han ở thanh bên. Bài src/huy-hieu-sap-het-han-dong-bo.test.ts ghim selector.
  const huyHieu = document.querySelector('#sidebar a[href="/xe"] .sidebar-item-badge');
  if (huyHieu) {
    if (r.count > 0) huyHieu.textContent = String(r.count);
    else huyHieu.remove();
  }
}

const staff = await initShell();
ganDaiTrangAnhEm("/giay-to-sap-het-han", staff);
datCrumb("Vận chuyển", "Sắp hết hạn");
try {
  ve(await layDanhSachSapHet());
} catch (err) {
  showError(errorEl, loiCua(err));
}

/** Đổi mốc "sắp hết hạn" (ADR-0040 D1) — chỉ Toàn quyền; máy chủ kiểm 1–365 và quyền, màn chỉ hiện câu của máy chủ. Lưu xong đọc lại danh sách. */
function moDoiMoc(opener: HTMLElement, hienTai: number): void {
  const o = h("input", { id: "moc-nhac", class: "o", type: "text", inputmode: "numeric", value: String(hienTai), autocomplete: "off", "aria-describedby": "moc-nhac-loi" }) as HTMLInputElement;
  const loi = h("div", { id: "moc-nhac-loi", class: "truong-loi", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "loi" }, "Huỷ");
  const luu = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "doi-moc-luu" }, "Lưu");
  const bang = moBangTruot({
    title: "Mốc nhắc giấy tờ sắp hết hạn",
    body: [truong("Nhắc trước (ngày)", o, { loi, goiY: "Áp cho giấy tờ xe và giấy tờ cá nhân, có hiệu lực ngay." })],
    foot: [huy, luu],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    bang.setBusy(true);
    try {
      await api<Api.VanChuyenMetaResponse>("/api/van-chuyen/nguong-het-han", { method: "POST", body: { warnDays: Number(o.value.trim()) } });
      bang.close(false);
      ve(await api<Api.ExpiringListResponse>("/api/van-chuyen/sap-het-han"));
    } catch (err) {
      bang.setBusy(false);
      replaceChildren(loi, loiCua(err));
      loi.hidden = false;
    }
  });
}
