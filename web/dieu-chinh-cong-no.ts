// Trang "Điều chỉnh công nợ" (ADR-0115 đợt 1): khối «Chờ duyệt» (ô ledger.adjust.approve), «Gửi yêu cầu mới» và «Yêu cầu của tôi» (ô ledger.write). Gọi:
//   GET  /api/ledger/adjustment-requests                         → YeuCauDieuChinhListResponse (trạng thái, nút được bấm do MÁY CHỦ tính: coTheDuyet / coTheTuChoi / coTheRut);
//   POST /api/ledger/adjustments { loai: "dieu_chinh", … }        → 201 yêu cầu CHỜ DUYỆT (số dư KHÔNG đổi);
//   POST /api/ledger/adjustment-requests/:id/{approve|reject|withdraw}.
// Ẩn/hiện hỏi bảng quyền (`can`) — cùng ô máy chủ hỏi; máy chủ kiểm lại mọi thứ. Trang không cộng trừ tiền, không tự tính hạn / trần: chỉ hiện điều máy chủ trả.
// Chữ ở src/shared/dieu-chinh-hien-thi.ts (có bài kiểm).
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import {
  CAU_GIAI_THICH, CAU_LY_DO_TU_CHOI, CAU_RONG_CHO_DUYET, CAU_RONG_CUA_TOI, LOAI_DONG_CHON, LOP_TRANG_THAI, NHAN_TRANG_THAI,
  choDuyetTruoc, cuaToiTruoc, dongPhu, huongNhan, cauNoiDung,
} from "../src/shared/dieu-chinh-hien-thi";
import { byId, h, replaceChildren } from "./dom";
import { dateTime, vnd } from "./format";
import { regroupMoney } from "./money-input";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const staff = await initShell();

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
function hienOk(text: string | null): void {
  okEl.textContent = text ?? "";
  okEl.hidden = !text;
}

const duocTao = can(staff, "ledger.write");
const duocDuyet = can(staff, "ledger.adjust.approve");

if (!duocTao && !duocDuyet) {
  showError(errorEl, "Trang Điều chỉnh công nợ chỉ Kế toán, Quản trị và Toàn quyền dùng được.");
} else {
  byId("dc-giai-thich").textContent = CAU_GIAI_THICH;
  byId("dc-noi-dung").hidden = false;
  byId("dc-khoi-duyet").hidden = !duocDuyet;
  byId("dc-khoi-gui").hidden = !duocTao;
  byId("dc-khoi-cua-toi").hidden = !duocTao;
  let ds: Api.YeuCauDieuChinhDto[] = [];

  async function load(giuLoi = false): Promise<void> {
    try {
      ds = (await api<Api.YeuCauDieuChinhListResponse>("/api/ledger/adjustment-requests")).yeuCau;
    } catch (err) {
      if (!giuLoi) showError(errorEl, reasonOf(err));
    }
    render();
  }

  /** Chạy một lệnh quyết định; 409/403 hiện đúng câu của máy chủ rồi tải lại cho khỏi nhìn số cũ. */
  async function chay(viec: () => Promise<unknown>, cauXong: string, tat: (t: boolean) => void): Promise<void> {
    showError(errorEl, null);
    hienOk(null);
    tat(true);
    try {
      await viec();
      hienOk(cauXong);
      await load();
    } catch (err) {
      showError(errorEl, reasonOf(err));
      errorEl.scrollIntoView({ block: "nearest" });
      if (err instanceof ApiError && err.status === 409) await load(true);
    } finally {
      // Mở lại nút ở MỌI nhánh: thẻ yêu cầu được vẽ lại sau `load` (nút cũ không còn trên trang, gọi ở đây vô hại), còn nút «Gửi yêu cầu chờ duyệt» của biểu mẫu
      // KHÔNG được vẽ lại — nếu không mở thì người dùng sửa số tiền sau câu «vượt trần» (409) hoặc gửi yêu cầu thứ hai mà phải tải lại trang.
      tat(false);
    }
  }

  function theYeuCau(y: Api.YeuCauDieuChinhDto): HTMLElement {
    const nut: HTMLElement[] = [];
    const khuTuChoi = h("div", { class: "dc-tu-choi", hidden: true });
    const tat = (t: boolean): void => { for (const n of nut) (n as HTMLButtonElement).disabled = t; };
    if (y.coTheDuyet) {
      const duyet = h("button", { type: "button", class: "btn btn-primary", "data-act": "duyet" }, "Duyệt");
      duyet.addEventListener("click", () => void chay(() => api(`/api/ledger/adjustment-requests/${y.id}/approve`, { method: "POST" }), "Đã duyệt — số dư đã đổi.", tat));
      nut.push(duyet);
    }
    if (y.coTheTuChoi) {
      const tc = h("button", { type: "button", class: "btn", "data-act": "tu-choi" }, "Từ chối");
      const lyDo = h("textarea", { rows: 2, maxlength: 300, autocomplete: "off", "aria-label": CAU_LY_DO_TU_CHOI, placeholder: CAU_LY_DO_TU_CHOI });
      const chot = h("button", { type: "button", class: "btn btn-primary", "data-act": "chot-tu-choi" }, "Xác nhận từ chối");
      chot.addEventListener("click", () => void chay(() => api(`/api/ledger/adjustment-requests/${y.id}/reject`, { method: "POST", body: { lyDo: lyDo.value.trim() } }), "Đã từ chối yêu cầu.", tat));
      khuTuChoi.append(lyDo, chot);
      tc.addEventListener("click", () => { khuTuChoi.hidden = !khuTuChoi.hidden; if (!khuTuChoi.hidden) lyDo.focus({ preventScroll: true }); });
      nut.push(tc);
    }
    if (y.coTheRut) {
      const rut = h("button", { type: "button", class: "btn", "data-act": "rut" }, "Rút yêu cầu");
      rut.addEventListener("click", () => void chay(() => api(`/api/ledger/adjustment-requests/${y.id}/withdraw`, { method: "POST" }), "Đã rút yêu cầu.", tat));
      nut.push(rut);
    }
    return h(
      "li",
      { class: "dc-the", "data-id": y.id, "data-trang-thai": y.trangThai },
      h("div", { class: "dc-dau" }, h("strong", null, y.maDon ?? "—"), h("span", { class: LOP_TRANG_THAI[y.trangThai] }, NHAN_TRANG_THAI[y.trangThai]), h("span", { class: "muted" }, huongNhan(y.huong))),
      h("p", { class: "dc-tien" }, `${cauNoiDung(y, vnd(y.soTien))} · ${y.loaiDongNhan}`),
      h("p", { class: "muted" }, `Ngày phát sinh ${y.ngayPhatSinh} · ${y.lyDo}`),
      h("p", { class: "muted" }, dongPhu(y, dateTime(y.hetHanLuc))),
      nut.length > 0 && h("div", { class: "dc-nut" }, ...nut),
      khuTuChoi,
    );
  }

  function veKhoi(dsId: string, rongId: string, rows: Api.YeuCauDieuChinhDto[], cauRong: string): void {
    replaceChildren(byId(dsId), ...rows.map(theYeuCau));
    const rong = byId(rongId);
    rong.hidden = rows.length > 0;
    rong.textContent = rows.length > 0 ? "" : cauRong;
  }

  function render(): void {
    if (duocDuyet) veKhoi("dc-duyet-ds", "dc-duyet-rong", choDuyetTruoc(ds), CAU_RONG_CHO_DUYET);
    if (duocTao) veKhoi("dc-cua-toi-ds", "dc-cua-toi-rong", cuaToiTruoc(ds), CAU_RONG_CUA_TOI);
  }

  // ---- Form «Gửi yêu cầu mới» (chỉ ô ledger.write) ----
  if (duocTao) {
    const chon: { orderId: string | null; maDon: string; benNo: { id: string; ten: string } | null; benDuocNo: { id: string; ten: string } | null } = { orderId: null, maDon: "", benNo: null, benDuocNo: null };
    const loaiEl = byId<HTMLSelectElement>("dc-loai");
    for (const o of LOAI_DONG_CHON) loaiEl.append(h("option", { value: o.ma }, o.nhan));
    const tienEl = byId<HTMLInputElement>("dc-so-tien");
    tienEl.addEventListener("input", () => regroupMoney(tienEl));
    const daChonEl = byId("dc-da-chon");
    const capNhatDaChon = (): void => {
      daChonEl.textContent = [
        chon.maDon ? `Đơn: ${chon.maDon}` : "Chưa chọn đơn",
        chon.benNo ? `Bên nợ: ${chon.benNo.ten}` : "Chưa chọn bên nợ",
        chon.benDuocNo ? `Bên được nợ: ${chon.benDuocNo.ten}` : "Chưa chọn bên được nợ",
      ].join(" · ");
    };
    capNhatDaChon();

    /** Ô «gõ rồi chọn»: gõ ≥ 2 ký tự thì tìm (chậm 250ms), bấm một kết quả để chọn. `tim` trả [{id, nhan}]. */
    function oTim(qId: string, kqId: string, tim: (q: string) => Promise<{ id: string; nhan: string }[]>, khiChon: (x: { id: string; nhan: string }) => void): void {
      const q = byId<HTMLInputElement>(qId);
      const kq = byId(kqId);
      let hen = 0;
      q.addEventListener("input", () => {
        window.clearTimeout(hen);
        const t = q.value.trim();
        if (t.length < 2) { kq.hidden = true; return; }
        hen = window.setTimeout(() => void (async () => {
          try {
            const rows = await tim(t);
            replaceChildren(kq, ...rows.map((r) => {
              const b = h("button", { type: "button", class: "btn dc-kq-nut" }, r.nhan);
              b.addEventListener("click", () => { khiChon(r); q.value = r.nhan; kq.hidden = true; capNhatDaChon(); });
              return h("li", null, b);
            }));
            kq.hidden = rows.length === 0;
          } catch (err) {
            showError(errorEl, reasonOf(err));
          }
        })(), 250);
      });
    }
    oTim("dc-don-q", "dc-don-kq",
      async (q) => (await api<Api.OrderListResponse>(`/api/orders?limit=8&q=${encodeURIComponent(q)}`)).orders.map((o) => ({ id: o.id, nhan: `${o.orderCode} · ${o.customerName}` })),
      (x) => { chon.orderId = x.id; chon.maDon = x.nhan.split(" · ")[0] ?? x.nhan; });
    const timBen = async (q: string) => (await api<Api.PartyListResponse>(`/api/parties?limit=8&q=${encodeURIComponent(q)}`)).parties.map((p) => ({ id: p.id, nhan: p.displayName }));
    oTim("dc-no-q", "dc-no-kq", timBen, (x) => { chon.benNo = { id: x.id, ten: x.nhan }; });
    oTim("dc-duoc-q", "dc-duoc-kq", timBen, (x) => { chon.benDuocNo = { id: x.id, ten: x.nhan }; });

    byId<HTMLFormElement>("dc-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!chon.orderId || !chon.benNo || !chon.benDuocNo) { showError(errorEl, "Chọn đơn, bên nợ và bên được nợ từ danh sách gợi ý."); return; }
      const soTien = regroupMoney(tienEl);
      const lyDo = byId<HTMLTextAreaElement>("dc-ly-do");
      const nutGui = byId<HTMLButtonElement>("dc-gui-btn");
      void chay(
        () => api("/api/ledger/adjustments", {
          method: "POST",
          body: { loai: "dieu_chinh", orderId: chon.orderId, benNo: chon.benNo!.id, benDuocNo: chon.benDuocNo!.id, loaiDong: loaiEl.value, soTien, lyDo: lyDo.value.trim() },
        }),
        "Đã gửi yêu cầu — chờ người khác duyệt. Số dư chưa đổi.",
        (t) => { nutGui.disabled = t; },
      ).then(() => { if (!errorEl.hidden) return; lyDo.value = ""; tienEl.value = ""; });
    });
  }

  await load();
}
