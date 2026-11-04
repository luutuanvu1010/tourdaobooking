// Trang «Dịch vụ cần kiểm vé» (ADR-0136 Đ1, Đ5). Gọi:
//   GET  /api/cai-dat/xac-nhan-don → cờ theo dịch vụ / nhóm + công tắc tự kiểm (đường gọi chính; settings.ops);
//   POST /api/cai-dat/xac-nhan-don { pham, ma, canXacNhan } | { tuXacNhanNoiBo };
//   GET  /api/catalog/dac-diem → danh sách dịch vụ và nhóm (không giữ quyền Đối tác).
// Ẩn/hiện hỏi `moTrang` (một nguồn với bảng mục); máy chủ kiểm lại. Luật ở src/shared/dich-vu-kiem-ve.ts. Không innerHTML.
import { TEN_CHUA_PHAN_LOAI, demKiemVe, locNhomKiemVe, nhanNguonKiemVe, xepNhomKiemVe, type DongDichVuKiemVe, type NhomKiemVe } from "../src/shared/dich-vu-kiem-ve";
import { moTrang } from "../src/shared/muc-giao-dien";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { hienBaoNgan } from "./toast";

const URL_CAI_DAT = "/api/cai-dat/xac-nhan-don";
const errorEl = byId("error");
const noiDungEl = byId("kv-noi-dung");
const staff = await initShell();
const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

let caiDat: Api.CaiDatXacNhanResponse = { dongCo: [], tuXacNhanNoiBo: true };
let dm: Api.CatalogDacDiemResponse | null = null;
let tuKhoa = "";
const nhomMo = new Set<string>();
const dsNhomEl = h("div", { class: "kv-ds" });
const congTacEl = h("section", { class: "card" });

function congTac(nhan: string, bat: boolean, duLieu: Record<string, string>, khiBam: (nut: HTMLButtonElement) => void): HTMLButtonElement {
  const nut = h("button", { type: "button", role: "switch", class: "dp-switch", "aria-checked": String(bat), "aria-label": nhan, ...duLieu }, h("span", { class: "dp-switch-knob", "aria-hidden": "true" })) as HTMLButtonElement;
  nut.addEventListener("click", () => khiBam(nut));
  return nut;
}

async function luu(nut: HTMLButtonElement, than: Api.CaiDatXacNhanInput, cauBao: string): Promise<void> {
  errorEl.hidden = true;
  nut.disabled = true;
  try {
    caiDat = await api<Api.CaiDatXacNhanResponse>(URL_CAI_DAT, { method: "POST", body: than });
    hienBaoNgan(cauBao);
    ve();
  } catch (err) {
    showError(errorEl, lyDo(err));
    errorEl.scrollIntoView({ block: "nearest" });
    nut.disabled = false;
  }
}

function dongDichVu(d: DongDichVuKiemVe): HTMLElement {
  return h(
    "div",
    { class: "kv-dong", "data-ma": d.ma },
    h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, d.ten), h("span", { class: "hint" }, nhanNguonKiemVe(d))),
    congTac(`Cần kiểm vé: ${d.ten}`, d.can, { "data-action": "dich-vu" }, (nut) => void luu(nut, { pham: "SERVICE", ma: d.ma, canXacNhan: !d.can }, d.can ? `${d.ten}: không cần kiểm vé.` : `${d.ten}: cần kiểm vé.`)),
  );
}

async function doiCaNhom(n: NhomKiemVe, nut: HTMLButtonElement): Promise<void> {
  const can = !n.caNhomCan;
  const dongY = await hoiXacNhan({
    tieuDe: can ? `Bật kiểm vé cho cả nhóm ${n.ten}?` : `Tắt kiểm vé cả nhóm ${n.ten}?`,
    hauQua: can
      ? `Đơn mới có vé thuộc nhóm này phải chờ người kiểm vé. Vé đã đặt riêng giữ nguyên. Đơn đã xác nhận không đổi.`
      : `Vé của nhóm này xác nhận như thường, trừ vé đã đặt riêng. Đơn đang chờ kiểm vé vẫn phải được quyết.`,
    nhanNguyHiem: can ? "Bật cả nhóm" : "Tắt cả nhóm",
    opener: nut,
  });
  if (dongY) await luu(nut, { pham: "GROUP", ma: n.ma as string, canXacNhan: can }, can ? `Nhóm ${n.ten}: cần kiểm vé.` : `Nhóm ${n.ten}: không cần kiểm vé.`);
}

function theNhom(n: NhomKiemVe, moSan: boolean): HTMLElement {
  const khoa = n.ma ?? TEN_CHUA_PHAN_LOAI;
  const the = h(
    "details",
    { class: "card kv-nhom", "data-nhom": khoa, open: moSan || nhomMo.has(khoa) || n.soCan > 0 },
    h("summary", { class: "kv-dau" }, h("h2", {}, n.ten), h("span", { class: "hint" }, demKiemVe(n))),
    n.ma === null
      ? null
      : h(
          "div",
          { class: "kv-dong kv-ca-nhom" },
          h("div", { class: "kv-chu" }, h("span", { class: "kv-ten" }, "Cả nhóm cần kiểm vé"), h("span", { class: "hint" }, "Vé đã đặt riêng không đổi theo nhóm.")),
          congTac(`Cả nhóm cần kiểm vé: ${n.ten}`, n.caNhomCan, { "data-action": "ca-nhom" }, (nut) => void doiCaNhom(n, nut)),
        ),
    ...n.dichVu.map(dongDichVu),
  ) as HTMLDetailsElement;
  the.addEventListener("toggle", () => (the.open ? nhomMo.add(khoa) : nhomMo.delete(khoa)));
  return the;
}

function veDs(): void {
  if (!dm) return;
  const ds = locNhomKiemVe(xepNhomKiemVe(dm.dichVu, dm.nhom, caiDat.dongCo), tuKhoa);
  if (ds.length === 0) {
    replaceChildren(dsNhomEl, h("p", { class: "rong" }, tuKhoa.trim() === "" ? "Danh mục chưa có dịch vụ đang bán." : "Không có vé khớp từ đang tìm."));
    return;
  }
  replaceChildren(dsNhomEl, ...ds.map((n) => theNhom(n, tuKhoa.trim() !== "")));
}

function ve(): void {
  const bat = caiDat.tuXacNhanNoiBo;
  replaceChildren(
    congTacEl,
    h(
      "div",
      { class: "kv-dong" },
      h(
        "div",
        { class: "kv-chu" },
        h("span", { class: "kv-ten" }, "Nhân viên tự kiểm vé đơn mình lập"),
        h("span", { class: "hint" }, bat ? "Đang bật: người kiểm vé tự quyết được đơn do chính mình lập. Đối tác và Thực tập luôn chờ người khác." : "Đang tắt: mọi đơn cần kiểm vé phải do người khác với người lập quyết."),
      ),
      congTac("Nhân viên tự kiểm vé đơn mình lập", bat, { "data-action": "tu-kiem" }, (nut) => void luu(nut, { tuXacNhanNoiBo: !bat }, bat ? "Đã tắt nhân viên tự kiểm vé." : "Đã bật nhân viên tự kiểm vé.")),
    ),
  );
  veDs();
}

if (!moTrang("dichVuKiemVe", staff)) {
  showError(errorEl, "Trang này chỉ Toàn quyền dùng được.");
} else {
  try {
    [caiDat, dm] = await Promise.all([api<Api.CaiDatXacNhanResponse>(URL_CAI_DAT), api<Api.CatalogDacDiemResponse>("/api/catalog/dac-diem")]);
    const oTim = h("input", { type: "search", class: "o", id: "kv-tim", placeholder: "Ví dụ: buffet" }) as HTMLInputElement;
    oTim.addEventListener("input", () => {
      tuKhoa = oTim.value;
      veDs();
    });
    replaceChildren(noiDungEl, congTacEl, h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "kv-tim" }, "Tìm vé"), oTim), dsNhomEl);
    ve();
    noiDungEl.hidden = false;
  } catch (err) {
    showError(errorEl, lyDo(err));
  }
}
