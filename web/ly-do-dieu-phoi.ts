// Danh mục lý do điều phối (/ly-do-dieu-phoi — ADR-0049 D2 CH-06; bản vẽ docs/design/van-chuyen-dieu-phoi/project/08 …, khung 8c / 8d).
// Quản trị, Toàn quyền (ô admin.manage — máy chủ hỏi lại ở cả route đọc). Theo nhóm (nhãn nhóm từ NHAN_NHOM_LY_DO — một nguồn với nhật ký); thêm, sửa tên,
// ngưng / dùng lại — không xoá (khuôn loc_location). Màn hình KHÔNG có ô mã (bản vẽ 8d chỉ "Lý do mới"): mã sinh từ nhãn (`maLyDoMoi`), trùng mã → thử hậu tố.
// Nút trong khung thêm / sửa đều `type="button"`; mở khung thì đặt focus vào ô, đóng thì trả focus về nút đã mở.
import { maLyDoMoi, nhomLyDoHien, thuTuLyDoMoi, type NhomHien } from "../src/shared/chinh-sach-hien-thi";
import type { NhomLyDo } from "../src/shared/dieu-phoi-kieu";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ld-ok");
const nhomEl = byId("ld-nhom");
const noteEl = byId("ld-note");
/** Tên lý do tối đa — đúng luật máy chủ (`kiemTenDanhMuc(label, 80)`). */
const TEN_TOI_DA = 80;
const STALE = "Danh mục lý do vừa được người khác sửa. Đã nạp bản mới — hãy kiểm tra rồi làm lại nếu vẫn cần.";

const staff = await initShell();
datCrumb("Vận chuyển", "Lý do điều phối");

let reasons: Api.TripReasonDto[] = [];
type Khung = { nhom: NhomLyDo; kieu: "them" } | { nhom: NhomLyDo; kieu: "sua"; code: string };
let khung: Khung | null = null;
let dangGui = false;

const nap = async (): Promise<void> => {
  reasons = (await api<Api.TripReasonListResponse>("/api/van-chuyen/ly-do")).reasons;
};

function bao(ok: string | null, loi: string | null): void {
  showError(okEl, ok);
  showError(errorEl, loi);
  (loi ? errorEl : ok ? okEl : null)?.scrollIntoView({ block: "nearest" });
}

/** Chạy một lệnh ghi: khoá lúc gửi; 409 stale → nạp lại rồi báo; lỗi khác → câu máy chủ. */
async function ghi(fn: () => Promise<string>): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  bao(null, null);
  for (const b of nhomEl.querySelectorAll<HTMLButtonElement>("button")) b.disabled = true;
  try {
    const cau = await fn();
    khung = null;
    ve();
    bao(cau, null);
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") {
      khung = null;
      await nap().catch(() => undefined);
      ve();
      bao(null, STALE);
    } else {
      for (const b of nhomEl.querySelectorAll<HTMLButtonElement>("button")) b.disabled = false;
      bao(null, loiCua(err));
    }
  } finally {
    dangGui = false;
  }
}

function oTen(id: string, nhan: string, giaTri: string): { root: HTMLElement; input: HTMLInputElement } {
  const dem = h("span", { class: "dp-count-text", "aria-hidden": "true" }, `${giaTri.length}/${TEN_TOI_DA}`);
  const input = h("input", { id, class: "vc-input", type: "text", value: giaTri, maxLength: TEN_TOI_DA, autocomplete: "off" });
  input.addEventListener("input", () => (dem.textContent = `${input.value.length}/${TEN_TOI_DA}`));
  return { root: h("div", { class: "vc-field" }, h("div", { class: "dp-field-head" }, h("label", { for: id }, nhan), dem), input), input };
}

function khungThem(n: NhomHien): HTMLElement {
  const { root, input } = oTen(`ld-moi-${n.nhom}`, "Lý do mới", "");
  const them = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "luu-them" }, "Thêm");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "dong" }, "Đóng");
  them.addEventListener("click", () => {
    const nhan = input.value.trim().replace(/\s+/g, " ");
    if (!nhan) return bao(null, "Nhập lý do mới.");
    void ghi(async () => {
      // Mã sinh từ nhãn; mã đã có (lý do cũ cùng tên, kể cả đã ngưng) → thử hậu tố _2, _3… (máy chủ báo 409 `code_taken`).
      for (let lan = 1; ; lan++) {
        try {
          reasons = (await api<Api.TripReasonListResponse>("/api/van-chuyen/ly-do", {
            method: "POST", body: { code: maLyDoMoi(n.nhom, nhan, lan), group: n.nhom, label: nhan, sortOrder: thuTuLyDoMoi(n.lyDo) },
          })).reasons;
          return `Đã thêm lý do “${nhan}” vào nhóm ${n.tieuDe}.`;
        } catch (err) {
          if (!(err instanceof ApiError && err.code === "code_taken") || lan >= 9) throw err;
        }
      }
    });
  });
  dong.addEventListener("click", () => dongKhung(n.nhom));
  return h("div", { class: "dp-panel", "data-khung": "them" }, root, h("div", { class: "dp-panel-actions" }, them, dong));
}

function khungSua(n: NhomHien, l: Api.TripReasonDto): HTMLElement {
  const { root, input } = oTen(`ld-sua-${l.code}`, "Tên lý do", l.label);
  const luu = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "luu-sua" }, "Lưu");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "dong" }, "Đóng");
  luu.addEventListener("click", () => {
    const nhan = input.value.trim().replace(/\s+/g, " ");
    if (!nhan) return bao(null, "Nhập tên lý do.");
    void ghi(async () => {
      reasons = (await api<Api.TripReasonListResponse>(`/api/van-chuyen/ly-do/${encodeURIComponent(l.code)}`, {
        method: "PUT", body: { label: nhan, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt },
      })).reasons;
      return `Đã sửa lý do “${nhan}”.`;
    });
  });
  dong.addEventListener("click", () => dongKhung(n.nhom, l.code));
  return h("div", { class: "dp-panel", "data-khung": "sua" }, root, h("div", { class: "dp-panel-actions" }, luu, dong));
}

function dongKhung(nhom: NhomLyDo, code?: string): void {
  khung = null;
  ve();
  const sel = code ? `.dp-group[data-nhom="${nhom}"] .dp-reason[data-code="${code}"] [data-action="sua"]` : `.dp-group[data-nhom="${nhom}"] [data-action="them"]`;
  nhomEl.querySelector<HTMLElement>(sel)?.focus();
}
function moKhung(k: Khung): void {
  khung = k;
  bao(null, null);
  ve();
  nhomEl.querySelector<HTMLInputElement>(`.dp-group[data-nhom="${k.nhom}"] .dp-panel input`)?.focus();
}

function dongLyDo(n: NhomHien, l: Api.TripReasonDto): HTMLElement {
  const sua = h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": "sua", "aria-label": `Sửa lý do ${l.label}` }, "Sửa");
  sua.addEventListener("click", () => moKhung({ nhom: n.nhom, kieu: "sua", code: l.code }));
  const bat = h("button", { type: "button", class: "vc-btn vc-btn-text", "data-action": l.active ? "ngung" : "dung-lai", "aria-label": `${l.active ? "Ngưng" : "Dùng lại"} lý do ${l.label}` }, l.active ? "Ngưng" : "Dùng lại");
  bat.addEventListener("click", () =>
    void ghi(async () => {
      reasons = (await api<Api.TripReasonListResponse>(`/api/van-chuyen/ly-do/${encodeURIComponent(l.code)}`, {
        method: "PUT", body: { label: l.label, sortOrder: l.sortOrder, active: !l.active, expectedUpdatedAt: l.updatedAt },
      })).reasons;
      return l.active ? `Đã ngưng lý do “${l.label}” — không còn hiện trong hộp chọn.` : `Đã dùng lại lý do “${l.label}”.`;
    }),
  );
  return h(
    "div",
    { class: l.active ? "dp-reason" : "dp-reason is-off", "data-code": l.code },
    h("span", { class: "dp-reason-label" }, l.label),
    l.active ? null : h("span", { class: "chip chip-muted" }, "Đã ngưng"),
    sua,
    bat,
  );
}

function veNhom(n: NhomHien): HTMLElement {
  const titleId = `ld-nhom-${n.nhom}`;
  const them = h("button", { type: "button", class: "pill-btn dp-group-add", "data-action": "them", "aria-label": `Thêm lý do vào nhóm ${n.tieuDe}` }, "+ Thêm lý do");
  them.addEventListener("click", () => moKhung({ nhom: n.nhom, kieu: "them" }));
  const rows: HTMLElement[] = [];
  for (const l of n.lyDo) {
    rows.push(dongLyDo(n, l));
    if (khung?.kieu === "sua" && khung.nhom === n.nhom && khung.code === l.code) rows.push(khungSua(n, l));
  }
  if (n.lyDo.length === 0) rows.push(h("div", { class: "dp-reason dp-reason-empty" }, "Chưa có lý do nào."));
  return h(
    "section",
    { class: "vc-card dp-group", "data-nhom": n.nhom, "aria-labelledby": titleId },
    h("div", { class: "dp-group-head" }, h("h2", { id: titleId, class: "dp-group-title" }, n.tieuDe), h("span", { class: "dp-count" }, String(n.lyDo.length)), them),
    ...rows,
    khung?.kieu === "them" && khung.nhom === n.nhom ? khungThem(n) : null,
  );
}

function ve(): void {
  replaceChildren(nhomEl, ...nhomLyDoHien(reasons).map(veNhom));
  noteEl.hidden = false;
}

async function main(): Promise<void> {
  if (!can(staff, "admin.manage")) return showError(errorEl, "Chỉ Quản trị, Toàn quyền xem và sửa được lý do điều phối.");
  try {
    await nap();
  } catch (err) {
    return showError(errorEl, loiCua(err));
  }
  ve();
}
await main();
