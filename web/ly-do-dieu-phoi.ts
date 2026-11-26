// Danh mục lý do điều phối (/ly-do-dieu-phoi — ADR-0049 D2 CH-06; bản vẽ docs/design/van-chuyen-dieu-phoi/project/08 …, khung 8c / 8d).
// Quản trị, Toàn quyền (ô admin.manage — máy chủ hỏi lại ở cả route đọc). Theo nhóm (nhãn nhóm từ NHAN_NHOM_LY_DO — một nguồn với nhật ký); thêm, sửa tên,
// ngưng / dùng lại — không xoá (khuôn loc_location). Màn hình KHÔNG có ô mã (bản vẽ 8d chỉ "Lý do mới"): mã sinh từ nhãn (`maLyDoMoi`), trùng mã → thử hậu tố.
// Bố cục (đợt D3 khung gốc, ADR-0222, 26/11/2026): khuôn Thiết lập — mỗi nhóm một khối kiểu bảng, «+ Thêm lý do» ở đầu khối, «Sửa» và «Ngưng»/«Dùng lại» cuối dòng;
// ô thêm và sửa mở trong bảng trượt (web/bang-truot.ts), lỗi của thao tác hiện ngay trong bảng. Đóng bảng thì trả tiêu điểm về nút đã mở.
import { maLyDoMoi, nhomLyDoHien, nutBatTatLyDo, thuTuLyDoMoi, type NhomHien } from "../src/shared/chinh-sach-hien-thi";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { moBangTruot, type BangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { dsDong, khoi, truong } from "./khung";
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
let dangGui = false;

const nap = async (): Promise<void> => {
  reasons = (await api<Api.TripReasonListResponse>("/api/van-chuyen/ly-do")).reasons;
};

function bao(ok: string | null, loi: string | null): void {
  showError(okEl, ok);
  showError(errorEl, loi);
  (loi ? errorEl : ok ? okEl : null)?.scrollIntoView({ block: "nearest" });
}

/** Sau khi vẽ lại, nút cũ không còn: đưa tiêu điểm về nút tương ứng của bản mới (không cuộn — câu báo tự đưa vào tầm nhìn). */
const veNut = (sel: string): void => nhomEl.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
const selThem = (nhom: string): string => `.khoi[data-nhom="${nhom}"] [data-action="them"]`;
const selSua = (nhom: string, code: string): string => `.khoi[data-nhom="${nhom}"] .dong[data-code="${code}"] [data-action="sua"]`;

/** Chạy một lệnh ghi ở dòng (Ngưng / Dùng lại): khoá lúc gửi; 409 stale → nạp lại rồi báo; lỗi khác → câu máy chủ. */
async function ghi(fn: () => Promise<string>): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  bao(null, null);
  for (const b of nhomEl.querySelectorAll<HTMLButtonElement>("button")) b.disabled = true;
  try {
    const cau = await fn();
    ve();
    bao(cau, null);
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") {
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

/** Chạy lệnh ghi của bảng trượt: lỗi (kể cả lỗi máy chủ) hiện trong bảng; xong hoặc 409 stale thì đóng bảng, vẽ lại, báo ở trang, tiêu điểm về `sel`. */
async function ghiBang(bang: BangTruot, loiEl: HTMLElement, btn: HTMLButtonElement, sel: string, fn: () => Promise<string>): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  showError(loiEl, null);
  btn.disabled = true;
  bang.setBusy(true);
  try {
    const cau = await fn();
    bang.setBusy(false);
    bang.close(false);
    ve();
    veNut(sel);
    bao(cau, null);
  } catch (err) {
    bang.setBusy(false);
    if (err instanceof ApiError && err.code === "stale") {
      bang.close(false);
      await nap().catch(() => undefined);
      ve();
      veNut(sel);
      bao(null, STALE);
    } else showError(loiEl, loiCua(err));
  } finally {
    btn.disabled = false;
    dangGui = false;
  }
}

/** Ô tên kèm bộ đếm ký tự (x/80) dưới ô. */
function oTen(id: string, nhan: string, giaTri: string): { root: HTMLElement; input: HTMLInputElement } {
  const dem = h("span", { "aria-hidden": "true" }, `${giaTri.length}/${TEN_TOI_DA}`);
  const input = h("input", { id, class: "o", type: "text", value: giaTri, maxLength: TEN_TOI_DA, autocomplete: "off" });
  input.addEventListener("input", () => (dem.textContent = `${input.value.length}/${TEN_TOI_DA}`));
  return { root: truong(nhan, input, { goiY: dem }), input };
}

let demBang = 0;
/** Bảng trượt chứa ô tên: dải lỗi riêng ở đầu bảng, chân bảng «Đóng» và nút ghi; Enter trong ô cũng gửi. */
function moBieuMau(o: { tieuDe: string; o: HTMLElement; input: HTMLInputElement; nutGhi: HTMLButtonElement; opener: HTMLElement; gui: (bang: BangTruot, loi: HTMLElement) => void }): void {
  const id = `ld-bieu-mau-${++demBang}`;
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const bieuMau = h("form", { id, class: "luoi", autocomplete: "off" }, o.o);
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-action": "dong" }, "Đóng");
  o.nutGhi.setAttribute("form", id);
  bao(null, null);
  const bang = moBangTruot({ title: o.tieuDe, body: [loi, bieuMau], foot: [dong, o.nutGhi], footClass: "vc-foot-2", opener: o.opener });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  bieuMau.addEventListener("submit", (e) => {
    e.preventDefault();
    o.gui(bang, loi);
  });
  o.input.focus();
}

function moThem(n: NhomHien, opener: HTMLElement): void {
  const { root, input } = oTen(`ld-moi-${n.nhom}`, "Lý do mới", "");
  const them = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "luu-them" }, "Thêm");
  moBieuMau({
    tieuDe: `Thêm lý do vào nhóm ${n.tieuDe}`, o: root, input, nutGhi: them, opener,
    gui: (bang, loi) => {
      const nhan = input.value.trim().replace(/\s+/g, " ");
      if (!nhan) return showError(loi, "Nhập lý do mới.");
      void ghiBang(bang, loi, them, selThem(n.nhom), async () => {
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
    },
  });
}

function moSua(n: NhomHien, l: Api.TripReasonDto, opener: HTMLElement): void {
  const { root, input } = oTen(`ld-sua-${l.code}`, "Tên lý do", l.label);
  const luu = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "luu-sua" }, "Lưu");
  moBieuMau({
    tieuDe: `Sửa lý do ${l.label}`, o: root, input, nutGhi: luu, opener,
    gui: (bang, loi) => {
      const nhan = input.value.trim().replace(/\s+/g, " ");
      if (!nhan) return showError(loi, "Nhập tên lý do.");
      void ghiBang(bang, loi, luu, selSua(n.nhom, l.code), async () => {
        reasons = (await api<Api.TripReasonListResponse>(`/api/van-chuyen/ly-do/${encodeURIComponent(l.code)}`, {
          method: "PUT", body: { label: nhan, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt },
        })).reasons;
        return `Đã sửa lý do “${nhan}”.`;
      });
    },
  });
}

function dongLyDo(n: NhomHien, l: Api.TripReasonDto): HTMLElement {
  const sua = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "sua", "aria-label": `Sửa lý do ${l.label}` }, "Sửa");
  sua.addEventListener("click", () => moSua(n, l, sua));
  // R-P22 (Q-B-3): lý do HỆ THỐNG đang dùng không có nút "Ngưng" — chỉ ghi chú; máy chủ vẫn chặn (409 `ly_do_he_thong`, câu của máy chủ hiện ở dải lỗi).
  const nb = nutBatTatLyDo(l);
  const bat = nb.nut
    ? h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": l.active ? "ngung" : "dung-lai", "aria-label": `${nb.nut} lý do ${l.label}` }, nb.nut)
    : null;
  bat?.addEventListener("click", () =>
    void ghi(async () => {
      reasons = (await api<Api.TripReasonListResponse>(`/api/van-chuyen/ly-do/${encodeURIComponent(l.code)}`, {
        method: "PUT", body: { label: l.label, sortOrder: l.sortOrder, active: !l.active, expectedUpdatedAt: l.updatedAt },
      })).reasons;
      return l.active ? `Đã ngưng lý do “${l.label}” — không còn hiện trong hộp chọn.` : `Đã dùng lại lý do “${l.label}”.`;
    }),
  );
  return h(
    "div",
    { class: "dong", "data-code": l.code, "data-ngung": l.active ? undefined : "" },
    h("div", { class: "dong-chu" }, h("span", null, l.label), nb.ghiChu ? h("span", { class: "o-phu", "data-he-thong": "1" }, nb.ghiChu) : null),
    l.active ? null : h("span", { class: "huy-hieu", "data-tong": "xam" }, "Đã ngưng"),
    sua,
    bat,
  );
}

function veNhom(n: NhomHien): HTMLElement {
  const them = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "them", "aria-label": `Thêm lý do vào nhóm ${n.tieuDe}` }, "+ Thêm lý do");
  them.addEventListener("click", () => moThem(n, them));
  return khoi(
    {
      tieuDe: h("span", null, n.tieuDe, " ", h("span", { class: "huy-hieu", "data-tong": "xam" }, String(n.lyDo.length))),
      idTieuDe: `ld-nhom-${n.nhom}`,
      viec: [them],
      viecODau: true,
      kieu: "bang",
      moTa: n.lyDo.length === 0 ? "Chưa có lý do nào." : undefined,
      thuoc: { "data-nhom": n.nhom },
    },
    n.lyDo.length ? dsDong(null, ...n.lyDo.map((l) => dongLyDo(n, l))) : null,
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
