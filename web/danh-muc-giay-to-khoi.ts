// Khối danh mục giấy tờ DÙNG CHUNG của hai trang (tách 2026-09-28 theo quyết định của chủ dự án "Tách theo chủ dữ liệu"):
//  - "Loại giấy tờ xe" (/loai-giay-to-xe, web/loai-giay-to-xe.ts) — thuộc phân hệ Vận chuyển (mục con dưới "Vận chuyển" / nhóm VẬN CHUYỂN ở trang Tôi);
//  - "Loại giấy tờ cá nhân" (/loai-giay-to-nguoi, web/loai-giay-to-nguoi.ts) — loại giấy tờ của người + hạng giấy phép lái xe: danh mục chung của Danh bạ
//    ("giấy tờ thuộc về người"), mục trong nhóm QUẢN TRỊ ngay sau "Địa điểm".
// Trước đó là MỘT trang /danh-muc-giay-to gộp ba khối (ADR-0040 D1, D2; Task A19 — khuôn sẵn của trang Địa điểm, web/locations.ts); đường dẫn cũ nay chỉ
// còn chuyển hướng (public/danh-muc-giay-to.html, khuôn public/home.html). Sửa có khoá lạc quan (expectedUpdatedAt); không xoá — chỉ ngưng dùng. Chỉ người giữ
// ô admin.manage (Quản trị, Toàn quyền); máy chủ luôn kiểm lại (route danh mục KHÔNG đổi).
import { can } from "../src/shared/permissions";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const STALE_NOTICE = "Danh mục vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";

export type Dong = { code: string; name: string; hasExpiry?: boolean; sortOrder: number; active: boolean; updatedAt: string };
export interface Khoi {
  id: string;
  tieuDe: string;
  goiY: string;
  coHan: boolean;
  /** PUT một dòng; POST thêm mới. */
  sua: (code: string, body: Record<string, unknown>) => Promise<unknown>;
  them: (body: Record<string, unknown>) => Promise<unknown>;
}

export const KHOI_XE: Khoi = {
  id: "dm-xe", tieuDe: "Loại giấy tờ xe", goiY: "GIAY_PHEP_KD", coHan: true,
  sua: (code, body) => api(`/api/van-chuyen/loai-giay-to-xe/${encodeURIComponent(code)}`, { method: "PUT", body }),
  them: (body) => api("/api/van-chuyen/loai-giay-to-xe", { method: "POST", body }),
};
export const KHOI_NGUOI: Khoi = {
  id: "dm-nguoi", tieuDe: "Loại giấy tờ của người", goiY: "THE_HDV", coHan: true,
  sua: (code, body) => api(`/api/parties/document-types/${encodeURIComponent(code)}`, { method: "PUT", body }),
  them: (body) => api("/api/parties/document-types", { method: "POST", body }),
};
export const KHOI_HANG: Khoi = {
  id: "dm-hang", tieuDe: "Hạng giấy phép lái xe", goiY: "C1", coHan: false,
  sua: (code, body) => api(`/api/parties/license-classes/${encodeURIComponent(code)}`, { method: "PUT", body }),
  them: (body) => api("/api/parties/license-classes", { method: "POST", body }),
};

/**
 * Dựng một trang danh mục: khung (`initShell`), hỏi ô admin.manage, rồi nạp và vẽ từng khối. `tai` trả dữ liệu từng khối ĐÚNG thứ tự `khoi`.
 * `sauKhung` chạy ngay sau khi khung dựng xong (vd breadcrumb "Vận chuyển › …").
 * Trang MỘT khối (Loại giấy tờ xe): tên trang (h1) đã là tên khối nên khối không có h2 riêng và "Sửa… / Thêm…" là h2 (khuôn trang Địa điểm); trang nhiều
 * khối: mỗi khối một h2, "Sửa… / Thêm…" là h3 — thứ tự tiêu đề không nhảy bậc.
 */
export async function moTrangDanhMuc(khoi: readonly Khoi[], tai: () => Promise<ReadonlyArray<readonly Dong[]>>, sauKhung?: () => void): Promise<void> {
  const errorEl = byId("error");
  const motKhoi = khoi.length === 1;
  const capCon = motKhoi ? "h2" : "h3";

  async function nap(): Promise<void> {
    try {
      const duLieu = await tai();
      khoi.forEach((k, i) => veKhoi(k, duLieu[i] ?? []));
    } catch (err) {
      showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    }
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

  function veKhoi(k: Khoi, dong: readonly Dong[]): void {
    const sec = byId(k.id);
    const sua = h("div", { class: "card dm-sua", hidden: true });
    const moSua = (d: Dong): void => {
      const ten = h("input", { type: "text", value: d.name, maxLength: k.coHan ? 100 : 60 });
      const coHan = h("input", { type: "checkbox", checked: d.hasExpiry ?? false, class: "vc-check-inline" });
      const thuTu = h("input", { type: "number", value: String(d.sortOrder), min: 0, max: 9999 });
      const dung = h("input", { type: "checkbox", checked: d.active, class: "vc-check-inline" });
      const luu = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Lưu");
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
        h(capCon, null, `Sửa: ${d.code}`),
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
    const them = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Thêm");
    them.addEventListener("click", () =>
      void act(async () => {
        await k.them({ code: ma.value.trim(), name: ten.value, ...(k.coHan ? { hasExpiry: coHan.checked } : {}), sortOrder: Number(thuTu.value || 0) });
        await nap();
      }, them),
    );
    replaceChildren(
      sec,
      motKhoi ? null : h("h2", { class: "dm-title" }, k.tieuDe),
      bang,
      the,
      sua,
      h(
        "div",
        { class: "card" },
        h(capCon, null, `Thêm ${k.tieuDe.charAt(0).toLocaleLowerCase("vi-VN")}${k.tieuDe.slice(1)}`),
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

  const staff = await initShell();
  sauKhung?.();
  if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.");
  else await nap();
}
