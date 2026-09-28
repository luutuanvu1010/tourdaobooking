// Trang Danh mục giấy tờ (/danh-muc-giay-to — ADR-0040 D1, D2; Task A19 của kế hoạch, chuyển sang Phần B theo điều phối 2026-09-28). KHUÔN SẴN của trang
// Địa điểm (web/locations.ts) — bản vẽ Vận chuyển không vẽ màn này ("dùng khuôn sẵn, không cần vẽ, trừ khi chủ muốn"). Ba khối: "Loại giấy tờ xe"
// (GET /api/van-chuyen/meta), "Loại giấy tờ của người" và "Hạng giấy phép lái xe" (GET /api/parties/documents/meta). Sửa có khoá lạc quan
// (expectedUpdatedAt); không xoá — chỉ ngưng dùng. Chỉ người giữ ô admin.manage (Quản trị, Toàn quyền); máy chủ luôn kiểm lại.
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const STALE_NOTICE = "Danh mục vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";

type Dong = { code: string; name: string; hasExpiry?: boolean; sortOrder: number; active: boolean; updatedAt: string };
interface Khoi {
  id: string;
  tieuDe: string;
  goiY: string;
  coHan: boolean;
  /** PUT một dòng; POST thêm mới. */
  sua: (code: string, body: Record<string, unknown>) => Promise<unknown>;
  them: (body: Record<string, unknown>) => Promise<unknown>;
}

/** Chạy một thao tác ghi: khoá nút lúc gửi; 409 stale → nạp lại rồi báo (khuôn act() của web/locations.ts). */
async function act(fn: () => Promise<void>, btn: HTMLButtonElement): Promise<void> {
  if (btn.disabled) return;
  showError(errorEl, null);
  btn.disabled = true;
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") {
      await nap();
      if (errorEl.hidden) showError(errorEl, STALE_NOTICE);
    } else showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  } finally {
    btn.disabled = false;
  }
}

const KHOI: readonly Khoi[] = [
  {
    id: "dm-xe", tieuDe: "Loại giấy tờ xe", goiY: "GIAY_PHEP_KD", coHan: true,
    sua: (code, body) => api(`/api/van-chuyen/loai-giay-to-xe/${encodeURIComponent(code)}`, { method: "PUT", body }),
    them: (body) => api("/api/van-chuyen/loai-giay-to-xe", { method: "POST", body }),
  },
  {
    id: "dm-nguoi", tieuDe: "Loại giấy tờ của người", goiY: "THE_HDV", coHan: true,
    sua: (code, body) => api(`/api/parties/document-types/${encodeURIComponent(code)}`, { method: "PUT", body }),
    them: (body) => api("/api/parties/document-types", { method: "POST", body }),
  },
  {
    id: "dm-hang", tieuDe: "Hạng giấy phép lái xe", goiY: "C1", coHan: false,
    sua: (code, body) => api(`/api/parties/license-classes/${encodeURIComponent(code)}`, { method: "PUT", body }),
    them: (body) => api("/api/parties/license-classes", { method: "POST", body }),
  },
];

function veKhoi(k: Khoi, dong: readonly Dong[]): void {
  const sec = byId(k.id);
  const sua = h("div", { class: "card dm-sua", hidden: true });
  const moSua = (d: Dong): void => {
    const ten = h("input", { type: "text", value: d.name, maxLength: k.coHan ? 100 : 60 });
    const coHan = h("input", { type: "checkbox", checked: d.hasExpiry ?? false, class: "vc-check-inline" });
    const thuTu = h("input", { type: "number", value: String(d.sortOrder), min: 0, max: 9999 });
    const dung = h("input", { type: "checkbox", checked: d.active, class: "vc-check-inline" });
    const luu = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
    const dong2 = h("button", { type: "button", class: "btn" }, "Đóng");
    dong2.addEventListener("click", () => (sua.hidden = true));
    luu.addEventListener("click", () =>
      void act(async () => {
        const body = { name: ten.value, ...(k.coHan ? { hasExpiry: coHan.checked } : {}), sortOrder: Number(thuTu.value || 0), active: dung.checked, expectedUpdatedAt: d.updatedAt };
        await k.sua(d.code, body);
        await nap();
      }, luu),
    );
    replaceChildren(
      sua,
      h("h3", null, `Sửa: ${d.code}`),
      h("div", { class: "grid three" }, h("label", null, "Tên", ten), k.coHan ? h("label", { class: "check" }, coHan, "Có ngày hết hạn") : null, h("label", null, "Thứ tự", thuTu), h("label", { class: "check" }, dung, "Đang dùng")),
      h("p", { class: "muted" }, "Mã là định danh, không đổi được. Không xoá — chỉ ngưng dùng."),
      h("div", { class: "actions" }, luu, dong2),
    );
    sua.hidden = false;
    sua.scrollIntoView({ block: "nearest" });
  };
  const nutSua = (d: Dong, lop: string): HTMLButtonElement => {
    const b = h("button", { type: "button", class: lop }, "Sửa");
    b.addEventListener("click", () => moSua(d));
    return b;
  };
  const trangThai = (d: Dong) => (d.active ? "Đang dùng" : h("span", { class: "badge badge-cancelled" }, "Ngưng dùng"));
  const bang = h(
    "div",
    { class: "card table-wrap" },
    h(
      "table",
      { class: "items" },
      h("thead", null, h("tr", null, h("th", null, "Mã"), h("th", null, "Tên"), k.coHan ? h("th", null, "Có hạn") : null, h("th", null, "Thứ tự"), h("th", null, "Trạng thái"), h("th", null, ""))),
      h(
        "tbody",
        null,
        ...dong.map((d) =>
          h("tr", { class: d.active ? "" : "row-off", "data-code": d.code }, h("td", null, d.code), h("td", null, d.name), k.coHan ? h("td", null, d.hasExpiry ? "Có" : "Không") : null, h("td", null, String(d.sortOrder)), h("td", null, trangThai(d)), h("td", { class: "row-actions" }, nutSua(d, "btn btn-link"))),
        ),
      ),
    ),
  );
  const the = h(
    "div",
    { class: "card-list" },
    ...dong.map((d) =>
      h(
        "div",
        { class: d.active ? "card" : "card row-off", "data-code": d.code },
        h("div", { class: "vc-grow" }, h("strong", null, d.name), h("div", { class: "muted" }, d.code, k.coHan ? ` · ${d.hasExpiry ? "có hạn" : "không hạn"}` : "", ` · thứ tự ${d.sortOrder}`), !d.active && h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng dùng"))),
        nutSua(d, "pill-btn"),
      ),
    ),
  );
  const ma = h("input", { type: "text", maxLength: 30, placeholder: k.goiY, autocapitalize: "characters" });
  const ten = h("input", { type: "text", maxLength: k.coHan ? 100 : 60 });
  const coHan = h("input", { type: "checkbox", checked: true, class: "vc-check-inline" });
  const thuTu = h("input", { type: "number", value: "0", min: 0, max: 9999 });
  const them = h("button", { type: "button", class: "btn btn-primary" }, "Thêm");
  them.addEventListener("click", () =>
    void act(async () => {
      await k.them({ code: ma.value.trim(), name: ten.value, ...(k.coHan ? { hasExpiry: coHan.checked } : {}), sortOrder: Number(thuTu.value || 0) });
      await nap();
    }, them),
  );
  replaceChildren(
    sec,
    h("h2", { class: "dm-title" }, k.tieuDe),
    bang,
    the,
    sua,
    h(
      "div",
      { class: "card" },
      h("h3", null, `Thêm ${k.tieuDe.charAt(0).toLocaleLowerCase("vi-VN")}${k.tieuDe.slice(1)}`),
      h(
        "div",
        { class: "grid three dm-them" },
        h("label", null, "Mã (chữ HOA, số, gạch dưới)", ma),
        h("label", null, "Tên", ten),
        k.coHan ? h("label", { class: "check" }, coHan, "Có ngày hết hạn") : null,
        h("label", null, "Thứ tự", thuTu),
        h("div", null, them),
      ),
    ),
  );
  sec.hidden = false;
}

async function nap(): Promise<void> {
  try {
    const [xe, nguoi] = await Promise.all([api<Api.VanChuyenMetaResponse>("/api/van-chuyen/meta"), api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta")]);
    veKhoi(KHOI[0]!, xe.documentTypes);
    veKhoi(KHOI[1]!, nguoi.types);
    veKhoi(KHOI[2]!, nguoi.classes);
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
}

const staff = await initShell();
if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.");
else await nap();
