// Khối danh mục giấy tờ DÙNG CHUNG của hai trang (tách 2026-09-28 theo quyết định của chủ dự án "Tách theo chủ dữ liệu"):
//  - "Loại giấy tờ xe" (/loai-giay-to-xe, web/loai-giay-to-xe.ts) — thuộc phân hệ Vận chuyển (mục con dưới "Vận chuyển" / nhóm VẬN CHUYỂN ở trang Tôi);
//  - "Loại giấy tờ cá nhân" (/loai-giay-to-nguoi, web/loai-giay-to-nguoi.ts) — loại giấy tờ của người + hạng giấy phép lái xe: danh mục chung của Danh bạ
//    ("giấy tờ thuộc về người"), mục trong nhóm Thiết lập ngay sau "Địa điểm".
// Trước đó là MỘT trang /danh-muc-giay-to gộp ba khối (ADR-0040 D1, D2; Task A19 — khuôn sẵn của trang Địa điểm, web/locations.ts); đường dẫn cũ nay chỉ
// còn chuyển hướng (public/danh-muc-giay-to.html, khuôn public/home.html). Sửa có khoá lạc quan (expectedUpdatedAt); không xoá — chỉ ngưng dùng. Chỉ người giữ
// ô admin.manage (Quản trị, Toàn quyền); máy chủ luôn kiểm lại (route danh mục KHÔNG đổi).
// Bố cục (đợt D3 khung gốc, ADR-0222, 26/11/2026): khuôn Thiết lập như trang Địa điểm — mỗi danh mục một khối kiểu bảng, nút «+ Thêm» ở đầu khối, «Sửa» cuối
// dòng; biểu mẫu thêm và sửa mở trong bảng trượt (web/bang-truot.ts), lỗi của thao tác hiện ngay trong bảng. Khối rộng từ 800 hiện bảng, hẹp hơn hiện danh sách dòng.
import { can } from "../src/shared/permissions";
import { ApiError, api } from "./api";
import { moBangTruot, type BangTruot } from "./bang-truot";
import { byId, h } from "./dom";
import { khoi as dungKhoi, truong } from "./khung";
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
 * Mỗi khối thay chỗ phần tử giữ chỗ cùng id trong HTML (`<section id="dm-…" hidden>`); vẽ lại thì thay chính khối đó.
 */
export async function moTrangDanhMuc(khoi: readonly Khoi[], tai: () => Promise<ReadonlyArray<readonly Dong[]>>, sauKhung?: () => void): Promise<void> {
  const errorEl = byId("error");
  /** Nơi hiện lỗi: dải lỗi của trang, hoặc dải lỗi của bảng trượt đang mở (dải của trang nằm sau bảng, không ai thấy). */
  let noiLoi: HTMLElement = errorEl;
  const baoLoi = (cau: string | null): void => showError(noiLoi, cau);
  const fail = (err: unknown): void => baoLoi(err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

  async function nap(): Promise<void> {
    try {
      const duLieu = await tai();
      khoi.forEach((k, i) => veKhoi(k, duLieu[i] ?? []));
    } catch (err) {
      fail(err);
    }
  }

  /** Chạy một thao tác ghi: khoá nút lúc gửi; 409 stale → `onStale` (đóng bảng, nạp lại) rồi báo ở trang (khuôn act() của web/locations.ts). */
  async function act(fn: () => Promise<void>, btn: HTMLButtonElement, onStale: () => Promise<void>): Promise<void> {
    if (btn.disabled) return;
    baoLoi(null);
    btn.disabled = true;
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError && err.code === "stale") {
        await onStale();
        if (noiLoi.hidden) baoLoi(STALE_NOTICE);
      } else fail(err);
    } finally {
      btn.disabled = false;
    }
  }

  let demBang = 0;
  /** Bảng trượt chứa một biểu mẫu (khuôn moBieuMau của web/locations.ts): dải lỗi riêng ở đầu bảng, chân bảng «Đóng» và nút ghi. */
  function moBieuMau(o: { tieuDe: string; than: (HTMLElement | null)[]; nutGhi: HTMLButtonElement; opener: HTMLElement | null; gui: (bang: BangTruot) => Promise<void> }): void {
    const id = `dm-bieu-mau-${++demBang}`;
    const loi = h("div", { class: "alert", role: "alert", hidden: true });
    const bieuMau = h("form", { id, class: "luoi", autocomplete: "off" }, ...o.than);
    const dong = h("button", { type: "button", class: "nut", "data-co": "lon" }, "Đóng");
    o.nutGhi.setAttribute("form", id);
    const bang = moBangTruot({ title: o.tieuDe, body: [loi, bieuMau], foot: [dong, o.nutGhi], footClass: "vc-foot-2", opener: o.opener, onClosed: () => (noiLoi = errorEl) });
    if (!bang) return;
    noiLoi = loi;
    dong.addEventListener("click", () => bang.close());
    bieuMau.addEventListener("submit", async (e) => {
      e.preventDefault();
      bang.setBusy(true);
      try {
        await o.gui(bang);
      } finally {
        bang.setBusy(false);
      }
    });
  }

  /** Sau khi vẽ lại, nút đã mở bảng không còn: đưa tiêu điểm về nút tương ứng của bản mới. */
  const veNut = (sel: string): void => document.querySelector<HTMLElement>(sel)?.focus();
  const tenNho = (k: Khoi): string => `${k.tieuDe.charAt(0).toLocaleLowerCase("vi-VN")}${k.tieuDe.slice(1)}`;
  const oTich = (id: string, dangBat: boolean): HTMLInputElement => h("input", { id, type: "checkbox", class: "o-tick", checked: dangBat });

  function moSua(k: Khoi, d: Dong, opener: HTMLElement): void {
    const ten = h("input", { id: `${k.id}-sua-ten`, class: "o", type: "text", value: d.name, maxLength: k.coHan ? 100 : 60 });
    const coHan = oTich(`${k.id}-sua-co-han`, d.hasExpiry ?? false);
    const thuTu = h("input", { id: `${k.id}-sua-thu-tu`, class: "o", type: "number", value: String(d.sortOrder), min: 0, max: 9999 });
    const dung = oTich(`${k.id}-sua-dang-dung`, d.active);
    const luu = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Lưu");
    const veLai = (): void => veNut(`#${k.id} [data-code="${d.code}"] [data-action="sua"]`);
    moBieuMau({
      tieuDe: `Sửa: ${d.code}`,
      than: [
        truong("Tên", ten),
        k.coHan ? h("label", { class: "check" }, coHan, "Có ngày hết hạn") : null,
        truong("Thứ tự", thuTu),
        h("label", { class: "check" }, dung, "Đang dùng"),
        h("p", { class: "khoi-mo-ta" }, "Mã là định danh, không đổi được. Không xoá — chỉ ngưng dùng."),
      ],
      nutGhi: luu,
      opener,
      gui: async (bang) => {
        const body = { name: ten.value, ...(k.coHan ? { hasExpiry: coHan.checked } : {}), sortOrder: Number(thuTu.value || 0), active: dung.checked, expectedUpdatedAt: d.updatedAt };
        await act(
          async () => {
            await k.sua(d.code, body);
            bang.close(false); // danh sách sắp được vẽ lại: nút «Sửa» đã mở bảng không còn
            await nap();
            veLai();
          },
          luu,
          async () => {
            bang.close(false);
            await nap();
            veLai();
          },
        );
      },
    });
  }

  function moThem(k: Khoi, opener: HTMLElement): void {
    const ma = h("input", { id: `${k.id}-them-ma`, class: "o", type: "text", maxLength: 30, placeholder: k.goiY, autocapitalize: "characters" });
    const ten = h("input", { id: `${k.id}-them-ten`, class: "o", type: "text", maxLength: k.coHan ? 100 : 60 });
    const coHan = oTich(`${k.id}-them-co-han`, true);
    const thuTu = h("input", { id: `${k.id}-them-thu-tu`, class: "o", type: "number", value: "0", min: 0, max: 9999 });
    const them = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Thêm");
    moBieuMau({
      tieuDe: `Thêm ${tenNho(k)}`,
      than: [truong("Mã (chữ HOA, số, gạch dưới)", ma), truong("Tên", ten), k.coHan ? h("label", { class: "check" }, coHan, "Có ngày hết hạn") : null, truong("Thứ tự", thuTu)],
      nutGhi: them,
      opener,
      gui: async (bang) => {
        await act(
          async () => {
            await k.them({ code: ma.value.trim(), name: ten.value, ...(k.coHan ? { hasExpiry: coHan.checked } : {}), sortOrder: Number(thuTu.value || 0) });
            bang.close(false);
            await nap();
            veNut(`#${k.id}-them`);
          },
          them,
          async () => {
            bang.close(false);
            await nap();
          },
        );
      },
    });
  }

  const huyHieuNgung = (): HTMLElement => h("span", { class: "huy-hieu", "data-tong": "xam" }, "Ngưng dùng");

  function veKhoi(k: Khoi, dong: readonly Dong[]): void {
    const nutSua = (d: Dong): HTMLButtonElement => {
      const b = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "sua", "aria-label": `Sửa ${d.name}` }, "Sửa");
      b.addEventListener("click", () => moSua(k, d, b));
      return b;
    };
    const bang = h(
      "table",
      { class: "bang" },
      h("thead", null, h("tr", null, h("th", null, "Mã"), h("th", null, "Tên"), k.coHan ? h("th", null, "Có hạn") : null, h("th", { "data-so": "" }, "Thứ tự"), h("th", null, "Trạng thái"), h("th", null, ""))),
      h(
        "tbody",
        null,
        ...dong.map((d) =>
          h(
            "tr",
            { "data-ngung": d.active ? undefined : "", "data-code": d.code },
            h("td", { "data-gon": "" }, d.code),
            h("td", null, d.name),
            k.coHan ? h("td", null, d.hasExpiry ? "Có" : "Không") : null,
            h("td", { "data-so": "" }, String(d.sortOrder)),
            h("td", { "data-gon": "" }, d.active ? "Đang dùng" : huyHieuNgung()),
            h("td", null, nutSua(d)),
          ),
        ),
      ),
    );
    const ds = h(
      "div",
      { class: "ds-dong", "data-thay-bang": "" },
      ...dong.map((d) =>
        h(
          "div",
          { class: "dong", "data-ngung": d.active ? undefined : "", "data-code": d.code },
          h(
            "div",
            { class: "dong-chu" },
            h("span", null, d.name),
            h("span", { class: "o-phu" }, d.code, k.coHan ? ` · ${d.hasExpiry ? "có hạn" : "không hạn"}` : "", ` · thứ tự ${d.sortOrder}`),
            !d.active && h("div", null, huyHieuNgung()),
          ),
          nutSua(d),
        ),
      ),
    );
    const nutThem = h("button", { type: "button", id: `${k.id}-them`, class: "nut", "data-cap": "phu", "aria-label": `Thêm ${tenNho(k)}` }, "+ Thêm");
    nutThem.addEventListener("click", () => moThem(k, nutThem));
    const moi = dungKhoi({ tieuDe: k.tieuDe, idTieuDe: `${k.id}-ten`, viec: [nutThem], viecODau: true, kieu: "bang", thuoc: { id: k.id } }, bang, ds);
    document.getElementById(k.id)?.replaceWith(moi);
  }

  const staff = await initShell();
  sauKhung?.();
  if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.");
  else await nap();
}
