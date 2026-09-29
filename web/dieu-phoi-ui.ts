// Khối giao diện dùng chung của ba màn văn phòng Bảng điều phối (B1 Điều phối xe, B2 Chi tiết chuyến, B3 Tạo / sửa chuyến — ADR-0049, ADR-0050; bản vẽ
// docs/design/van-chuyen-dieu-phoi/). Luật chữ ở src/shared/dieu-phoi-man.ts; ở đây chỉ dựng DOM (h(), không innerHTML) và gửi lệnh.
//  - `taoLenh`: mọi lệnh ghi đi qua đây — requestId mới mỗi ý định; mất mạng thì bấm lại CÙNG thân dùng lại requestId (không tạo hai chuyến — LC-11).
//  - `docLoiLenh`: 409 / 400 của lệnh chuyến → câu lời thường (câu máy chủ + từng lý do), cờ "cần phá lệ" và `canQuyen` của máy chủ (không đoán theo vai).
//  - `moPhaLe`: hộp "Phá lệ" (khuôn 1f của bản vẽ 01 — chọn lý do nhóm Phá lệ; KHÔNG ô ghi chú: chủ trả lời Q1); `moHuyChuyen`: hộp "Huỷ chuyến" (bản vẽ 2f).
import { idChoLenh, type Tone } from "../src/shared/dieu-phoi-man";
import type { LyDoDangDungDto, LyDoGiuDto } from "../src/shared/contracts";
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import { icon } from "./icons";

export const LOI_MANG = "Chưa gửi được — kiểm tra mạng rồi bấm lại.";

/** Chip nhãn (tone của src/shared/dieu-phoi-man.ts). */
export function chip(nhan: string, tone: Tone | "navy"): HTMLElement {
  return h("span", { class: `chip dp-chip-${tone}` }, nhan);
}

/** Một lệnh ghi (một ý định của người dùng). */
export function taoLenh(): { gui<T>(url: string, method: string, than: Record<string, unknown>): Promise<T> } {
  let dangCho: { id: string; khoa: string } | null = null;
  return {
    async gui<T>(url: string, method: string, than: Record<string, unknown>): Promise<T> {
      const khoa = `${method} ${url} ${JSON.stringify(than)}`;
      const lenh = idChoLenh(dangCho, khoa, () => crypto.randomUUID());
      try {
        const r = await api<T>(url, { method, body: { ...than, requestId: lenh.id } });
        dangCho = null;
        return r;
      } catch (e) {
        dangCho = e instanceof ApiError ? null : lenh; // mất mạng / hết giờ: giữ để bấm lại dùng cùng requestId
        throw e;
      }
    },
  };
}

export interface LoiLenh {
  tieuDe: string;
  dong: string[];
  lyDo: LyDoGiuDto[];
  /** 409 `stale` — chuyến vừa bị người khác sửa (H10: câu chung, không tên người). */
  cu: boolean;
  /** 409 `can_pha_le` / `chua_du_nghi` — lệnh cần phá lệ luật cấu hình. */
  canPhaLe: boolean;
  /** Máy chủ nói người gọi có ô phá lệ (`canQuyen`). */
  duocPhaLe: boolean;
  mang: boolean;
}
export function docLoiLenh(e: unknown): LoiLenh {
  if (!(e instanceof ApiError)) return { tieuDe: LOI_MANG, dong: [], lyDo: [], cu: false, canPhaLe: false, duocPhaLe: false, mang: true };
  const d = (e.details ?? {}) as { lyDo?: LyDoGiuDto[]; canQuyen?: boolean };
  const lyDo = Array.isArray(d.lyDo) ? d.lyDo : [];
  const canPhaLe = e.status === 409 && (e.code === "can_pha_le" || e.code === "chua_du_nghi");
  const duocPhaLe = canPhaLe && d.canQuyen === true;
  const dong = lyDo.map((l) => `${l.loiNhan} · Ai xử lý: ${l.aiXuLyNhan}`);
  if (canPhaLe && !duocPhaLe) dong.push("Cần Quản trị phá lệ.");
  return { tieuDe: e.message, dong, lyDo, cu: e.status === 409 && e.code === "stale", canPhaLe, duocPhaLe, mang: false };
}

/** Dải báo (khuôn `.banner` sẵn có). `taiLai` → nút "Tải lại". */
export function dai(tone: "danger" | "warning" | "info" | "ok", tieuDe: string, dong: readonly string[] = [], taiLai?: () => void, them: Child[] = []): HTMLElement {
  const nut = taiLai ? h("button", { type: "button", class: "btn", "data-action": "tai-lai" }, "Tải lại") : null;
  nut?.addEventListener("click", taiLai!);
  return h(
    "div",
    { class: `banner banner-${tone === "ok" ? "ok dp-banner-ok" : tone}`, role: tone === "danger" || tone === "warning" ? "alert" : "status" },
    h("div", { class: "banner-title" }, tieuDe),
    dong.length ? h("ul", { class: "banner-lines" }, ...dong.map((x) => h("li", null, x))) : null,
    ...them,
    nut ? h("div", { class: "banner-actions" }, nut) : null,
  );
}

/** Nhóm nút chọn một (khuôn "Sửa sai" của lượt 1a — `.vc-reasons`), có phím mũi tên. Trả phần tử + đọc giá trị. */
export function nhomChon(id: string, nhanNhom: string, ds: readonly { code: string; nhan: string }[], onDoi: (code: string) => void): HTMLElement {
  const nut = ds.map((l) => {
    const b = h("button", { type: "button", class: "vc-reason", role: "radio", "aria-checked": "false", tabindex: -1, "data-code": l.code }, h("span", { class: "vc-radio-dot", "aria-hidden": "true" }), l.nhan);
    b.addEventListener("click", () => chon(b));
    b.addEventListener("keydown", (e) => {
      const i = nut.indexOf(b);
      const toi = e.key === "ArrowDown" || e.key === "ArrowRight" ? nut[(i + 1) % nut.length] : e.key === "ArrowUp" || e.key === "ArrowLeft" ? nut[(i - 1 + nut.length) % nut.length] : null;
      if (toi) {
        e.preventDefault();
        chon(toi);
        toi.focus();
      }
    });
    return b;
  });
  if (nut[0]) nut[0].tabIndex = 0;
  function chon(b: HTMLButtonElement): void {
    for (const x of nut) {
      x.setAttribute("aria-checked", String(x === b));
      x.tabIndex = x === b ? 0 : -1;
    }
    onDoi(b.dataset.code!);
  }
  return h("div", { class: "vc-field" }, h("div", { id, class: "vc-label" }, nhanNhom), h("div", { class: "vc-reasons", role: "radiogroup", "aria-labelledby": id }, ...nut));
}

/**
 * Hộp "Phá lệ" (khuôn 1f, bản vẽ 01): tóm tắt lệnh, chọn lý do (danh mục nhóm Phá lệ đang dùng), nút chính khoá tới khi chọn. `onXacNhan(code)` gửi lại
 * CHÍNH lệnh kèm phá lệ; lỗi thì hộp giữ nguyên và hiện câu. Không có ô ghi chú (chủ trả lời Q1: phá lệ chỉ chọn lý do).
 */
export function moPhaLe(o: { lyDo: readonly LyDoDangDungDto[]; tomTat: Child[]; nutChinh: string; opener?: HTMLElement | null; onXacNhan: (code: string) => Promise<void> }): void {
  let code: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: true, "data-action": "pha-le-gui" }, o.nutChinh);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const goiY = h("div", { class: "dp-note" }, "Chọn một lý do để tiếp tục.");
  const nhom = nhomChon("dp-pha-le-label", "Lý do phá lệ", o.lyDo.filter((l) => l.nhom === "PHA_LE").map((l) => ({ code: l.code, nhan: l.nhan })), (c) => {
    code = c;
    chinh.disabled = false;
    goiY.hidden = true;
  });
  const bang = moBangTruot({
    title: "Phá lệ",
    body: [h("div", { class: "dp-sheet-sum" }, ...o.tomTat), nhom, h("div", { class: "dp-note" }, "Việc phá lệ ghi vào nhật ký chuyến kèm tên bạn."), goiY, loi],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener: o.opener,
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-pha-le");
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!code) return;
    bang.setBusy(true);
    chinh.disabled = true;
    replaceChildren(loi);
    loi.hidden = true;
    try {
      await o.onXacNhan(code);
      bang.close(false);
    } catch (e) {
      const l = docLoiLenh(e);
      replaceChildren(loi, icon("alert", 16, 2), [l.tieuDe, ...l.dong].join(" "));
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Hộp "Huỷ chuyến" (bản vẽ 2f): khách trở về cột Chưa xếp (đối chiếu 2.12); chọn lý do nhóm Huỷ chuyến. `onXacNhan` ném lỗi thì hộp giữ nguyên, hiện câu. */
export function moHuyChuyen(o: { ma: string; soKhach: number; lyDo: readonly LyDoDangDungDto[]; opener?: HTMLElement | null; onXacNhan: (code: string) => Promise<void> }): void {
  let code: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "huy-gui" }, "Huỷ chuyến");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const nhom = nhomChon("dp-huy-label", "Lý do huỷ", o.lyDo.filter((l) => l.nhom === "HUY_CHUYEN").map((l) => ({ code: l.code, nhan: l.nhan })), (c) => {
    code = c;
    chinh.disabled = false;
  });
  const bang = moBangTruot({
    title: `Huỷ chuyến ${o.ma}`,
    body: [
      h("p", { class: "dp-sheet-text" }, o.soKhach > 0 ? `${o.soKhach} khách trong chuyến sẽ trở về cột “Chưa xếp”. Chuyến không bị xoá, vẫn xem được trong nhật ký.` : "Chuyến không bị xoá, vẫn xem được trong nhật ký."),
      nhom,
      loi,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener: o.opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!code) return;
    bang.setBusy(true);
    chinh.disabled = true;
    loi.hidden = true;
    try {
      await o.onXacNhan(code);
      bang.close(false);
    } catch (e) {
      const l = docLoiLenh(e);
      replaceChildren(loi, icon("alert", 16, 2), [l.tieuDe, ...l.dong].join(" "));
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** "Thứ Tư 30/09" của một ngày "YYYY-MM-DD" (lịch dân sự — không phụ thuộc múi giờ máy). */
export function thuNgay(ngay: string): string {
  const [y, m, d] = ngay.split("-").map(Number) as [number, number, number];
  const thu = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${thu} ${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
}
