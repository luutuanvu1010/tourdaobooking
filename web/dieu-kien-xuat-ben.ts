// Điều kiện xuất bến (/dieu-kien-xuat-ben — ADR-0049 D2; ADR-0050 VK1-C). Chỉ Toàn quyền (ô settings.ops — máy chủ hỏi lại). Bản vẽ KHÔNG vẽ trang này: khuôn
// sẵn của trang danh mục ([MH] "Dùng khuôn sẵn"), lối vào là liên kết "Điều kiện theo cỡ xe, hạng bằng ›" ở trang Chính sách điều phối (bản vẽ 8a).
// Hai khối: (1) điều kiện theo cỡ xe — thêm, đóng một lần (không sửa, không mở lại); Kiểm định + Bảo hiểm gieo sẵn cho mọi xe; (2) số khách tối đa theo hạng bằng
// (không kể tài xế) — đổi = một dòng mới. Không lộ mã loại / mã hạng: tên từ danh mục (GET /api/van-chuyen/meta, /api/parties/documents/meta).
import { docDieuKienMoi, docSoKhachHang, nhanDieuKien, nhanSoKhachHang } from "../src/shared/chinh-sach-hien-thi";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { msToVnLocal } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("dk-ok");
const dkEl = byId("dk-dieu-kien");
const hbEl = byId("dk-hang-bang");

const staff = await initShell();
datCrumb("Vận chuyển › Chính sách điều phối", "Điều kiện cho xe chạy");

let rules: Api.DepartureRuleDto[] = [];
let capacity: Api.LicenseCapacityResponse = { current: [], history: [] };
let loaiXe: Api.DocumentTypeDto[] = [];
let loaiNguoi: Api.DocumentTypeDto[] = [];
let hang: Api.LicenseClassDto[] = [];
let dangSuaHang: string | null = null;
let dangGui = false;

const ngayTuIso = (iso: string): string => ngayVN(msToVnLocal(Date.parse(iso)).date);

async function nap(): Promise<void> {
  const [r, c, mx, mn] = await Promise.all([
    api<Api.DepartureRuleListResponse>("/api/van-chuyen/dieu-kien"),
    api<Api.LicenseCapacityResponse>("/api/van-chuyen/hang-bang"),
    api<Api.VanChuyenMetaResponse>("/api/van-chuyen/meta"),
    api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta"),
  ]);
  rules = r.rules;
  capacity = c;
  loaiXe = mx.documentTypes;
  loaiNguoi = mn.types;
  hang = mn.classes;
}

function bao(ok: string | null, loi: string | null): void {
  showError(okEl, ok);
  showError(errorEl, loi);
  (loi ? errorEl : ok ? okEl : null)?.scrollIntoView({ block: "nearest" });
}
async function ghi(fn: () => Promise<string>): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  bao(null, null);
  try {
    const cau = await fn();
    dangSuaHang = null;
    ve();
    bao(cau, null);
  } catch (err) {
    if (err instanceof ApiError && (err.code === "stale" || err.code === "rule_closed")) {
      await nap().catch(() => undefined);
      dangSuaHang = null;
      ve();
    }
    bao(null, loiCua(err));
  } finally {
    dangGui = false;
  }
}

const tenNguoi = (code: string): string | undefined => loaiNguoi.find((t) => t.code === code)?.name;

// ---- khối 1: điều kiện theo cỡ xe ---------------------------------------------------------------------------------------------------------------------------
function veDieuKien(): void {
  const dangAp = rules.filter((r) => r.active);
  const daDong = rules.filter((r) => !r.active);
  const dong = (r: Api.DepartureRuleDto): HTMLElement => {
    const nhan = nhanDieuKien(r, tenNguoi);
    const nut = r.active ? h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": "dong-dieu-kien", "aria-label": `Đóng điều kiện ${nhan}` }, "Đóng") : null;
    nut?.addEventListener("click", () => {
      if (!confirm(`Đóng điều kiện “${nhan}”? Từ lúc này xe không còn phải có giấy này mới được chạy. Không mở lại được — muốn áp lại thì thêm điều kiện mới.`)) return;
      void ghi(async () => {
        rules = (await api<Api.DepartureRuleListResponse>(`/api/van-chuyen/dieu-kien/${encodeURIComponent(r.id)}/dong`, { method: "POST" })).rules;
        return `Đã đóng điều kiện “${nhan}”.`;
      });
    });
    return h(
      "div",
      { class: r.active ? "dp-reason" : "dp-reason is-off", "data-rule": r.id },
      h("span", { class: "dp-reason-label" }, nhan, h("span", { class: "dp-reason-sub" }, r.active ? `Áp từ ${ngayTuIso(r.validFrom)}` : `Đã đóng ${ngayTuIso(r.validTo ?? r.validFrom)}`)),
      r.active ? h("span", { class: "chip chip-unit" }, "Đang áp") : h("span", { class: "chip chip-muted" }, "Đã đóng"),
      nut,
    );
  };

  const coXe = h("input", { id: "dk-co-xe", class: "vc-input", type: "text", inputmode: "numeric", value: "1", autocomplete: "off", "aria-describedby": "dk-co-xe-hint" });
  const doiTuong = h("select", { id: "dk-doi-tuong", class: "vc-input" }, h("option", { value: "VEHICLE" }, "Giấy tờ của xe"), h("option", { value: "DRIVER" }, "Giấy tờ của tài xế"));
  const loai = h("select", { id: "dk-loai", class: "vc-input" });
  const napLoai = (): void => {
    const ds = (doiTuong.value === "DRIVER" ? loaiNguoi : loaiXe).filter((t) => t.active);
    replaceChildren(loai, h("option", { value: "" }, "Chọn loại giấy tờ"), ...ds.map((t) => h("option", { value: t.code }, t.name)));
  };
  doiTuong.addEventListener("change", napLoai);
  napLoai();
  const them = h("button", { type: "button", class: "vc-btn btn btn-primary btn-chinh", "data-action": "them-dieu-kien" }, "Thêm điều kiện");
  them.addEventListener("click", () => {
    const r = docDieuKienMoi({ coXe: coXe.value, doiTuong: doiTuong.value as "VEHICLE" | "DRIVER", loai: loai.value });
    if (!r.ok) return bao(null, r.loi);
    void ghi(async () => {
      rules = (await api<Api.DepartureRuleListResponse>("/api/van-chuyen/dieu-kien", { method: "POST", body: r.value })).rules;
      return "Đã thêm điều kiện cho xe chạy — áp ngay từ bây giờ.";
    });
  });
  const truong = (id: string, nhan: string, el: HTMLElement, goiY?: string): HTMLElement =>
    h("div", { class: "vc-field" }, h("label", { for: id }, nhan), el, goiY ? h("div", { id: `${id}-hint`, class: "vc-hint" }, goiY) : null);

  replaceChildren(
    dkEl,
    h("div", { class: "dp-group-head" }, h("h2", { id: "dk-dieu-kien-title", class: "dp-group-title" }, "Điều kiện theo cỡ xe"), h("span", { class: "dp-count" }, String(dangAp.length))),
    ...(dangAp.length ? dangAp.map(dong) : [h("div", { class: "dp-reason dp-reason-empty" }, "Chưa có điều kiện nào đang áp.")]),
    ...daDong.map(dong),
    h(
      "div",
      { class: "dp-panel" },
      h("h3", { class: "dp-panel-title" }, "Thêm điều kiện"),
      h("div", { class: "dp-dk-grid" }, truong("dk-co-xe", "Áp cho xe chở từ (người)", coXe, "1 = mọi xe."), truong("dk-doi-tuong", "Giấy tờ của", doiTuong), truong("dk-loai", "Loại giấy tờ", loai)),
      h("div", { class: "dp-panel-actions" }, them),
    ),
  );
  dkEl.hidden = false;
}

// ---- khối 2: số khách theo hạng bằng ------------------------------------------------------------------------------------------------------------------------
function veHangBang(): void {
  const hienHanh = new Map(capacity.current.map((c) => [c.classCode, c]));
  const dsHang = [...hang.filter((x) => x.active || hienHanh.has(x.code))];
  const dong = (x: Api.LicenseClassDto): HTMLElement[] => {
    const c = hienHanh.get(x.code);
    const doi = h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": "doi-hang", "aria-label": `Đổi số khách hạng ${x.name}` }, "Đổi");
    doi.addEventListener("click", () => {
      dangSuaHang = x.code;
      bao(null, null);
      ve();
      document.getElementById("dk-hang-o")?.focus();
    });
    const out: HTMLElement[] = [
      h(
        "div",
        { class: c ? "dp-reason" : "dp-reason is-off", "data-hang": x.code },
        h("span", { class: "dp-reason-label" }, x.name, h("span", { class: "dp-reason-sub" }, c ? `${nhanSoKhachHang(c.maxPassengers)} · áp từ ${ngayTuIso(c.validFrom)}` : nhanSoKhachHang(undefined))),
        doi,
      ),
    ];
    if (dangSuaHang === x.code) {
      const o = h("input", { id: "dk-hang-o", class: "vc-input", type: "text", inputmode: "numeric", value: c?.maxPassengers == null ? "" : String(c.maxPassengers), autocomplete: "off", "aria-describedby": "dk-hang-o-hint" });
      const luu = h("button", { type: "button", class: "vc-btn btn btn-primary btn-chinh", "data-action": "luu-hang" }, "Lưu");
      const dongNut = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
      luu.addEventListener("click", () => {
        const r = docSoKhachHang(x.code, o.value);
        if (!r.ok) return bao(null, r.loi);
        void ghi(async () => {
          capacity = await api<Api.LicenseCapacityResponse>("/api/van-chuyen/hang-bang", { method: "POST", body: r.value });
          return `Đã lưu hạng ${x.name}: ${nhanSoKhachHang(r.value.maxPassengers).toLocaleLowerCase("vi-VN")}.`;
        });
      });
      dongNut.addEventListener("click", () => {
        dangSuaHang = null;
        ve();
        hbEl.querySelector<HTMLElement>(`[data-hang="${x.code}"] [data-action="doi-hang"]`)?.focus();
      });
      out.push(
        h(
          "div",
          { class: "dp-panel" },
          h("div", { class: "vc-field" }, h("label", { for: "dk-hang-o" }, `Số khách tối đa — hạng ${x.name}`), o, h("div", { id: "dk-hang-o-hint", class: "vc-hint" }, "Không kể tài xế. Để trống = không giới hạn.")),
          h("div", { class: "dp-panel-actions" }, luu, dongNut),
        ),
      );
    }
    return out;
  };
  replaceChildren(
    hbEl,
    h("div", { class: "dp-group-head" }, h("h2", { id: "dk-hang-bang-title", class: "dp-group-title" }, "Số khách theo hạng bằng"), h("span", { class: "dp-count" }, String(dsHang.length))),
    ...dsHang.flatMap(dong),
  );
  hbEl.hidden = false;
}

function ve(): void {
  veDieuKien();
  veHangBang();
}

async function main(): Promise<void> {
  if (!can(staff, "settings.ops")) return showError(errorEl, "Chỉ Toàn quyền xem và đổi được điều kiện cho xe chạy.");
  try {
    await nap();
  } catch (err) {
    return showError(errorEl, loiCua(err));
  }
  ve();
}
await main();
