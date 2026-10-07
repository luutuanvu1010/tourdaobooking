// Bảng trượt "Sửa đưa đón" của đơn ĐÃ XÁC NHẬN (bản vẽ M4 — docs/design/2026-10-01-dua-don-hanh-khach/M4 Sua dua don.dc.html). Khuôn bảng trượt có sẵn
// (`web/bang-truot.ts`). Mỗi dịch vụ một khối "Đưa đón" (`che: "bang"` — bỏ chặng đã lưu phải chọn lý do). Lưu gửi lần lượt từng lệnh của route chặng
// (ADR-0047 A1): THAY trước (`POST …/legs/:id/replace`, mốc ĐƠN mới nhất — C14), rồi bỏ chặng (`POST …/legs/:id/close`, mốc CHẶNG), sửa (`PUT …/legs/:id`,
// mốc CHẶNG), thêm (`POST …/legs`, mốc ĐƠN mới nhất). "Thay": trong một dịch vụ, theo từng chiều, ĐÚNG một chặng đã lưu bỏ với lý do "Đổi sang chặng khác"
// hoặc "Nhập nhầm" + ĐÚNG một chặng mới cùng chiều (luật ghép `ghepThayChang`, src/shared/thay-chang.ts) → MỘT lệnh mang đúng lý do đó, máy chủ đóng + thêm
// cùng lô — dưới mốc 6 giờ thì cả lệnh bị chặn, chặng cũ còn nguyên (trước C14: bỏ được, thêm bị chặn ⇒ đơn mất chặng). Ca khác (bỏ hai thêm một, "Không cần
// nữa", khác chiều) vẫn gửi lệnh rời. Lệnh hỏng thì DỪNG, báo lỗi; lệnh trước đó đã lưu (nút "Tải lại đơn" để xem bản mới). 409 `short_notice_required` → Quản trị / Toàn quyền duyệt
// đặt gấp ngay trong bảng rồi gửi lại ĐÚNG lệnh đó (khuôn bảng "Sửa thông tin chuyến" — 07).
import { ApiError, api, type Api, type Order } from "./api";
import { moBangTruot } from "./bang-truot";
import { renderBanner } from "./banner";
import { taoKhungDatGap } from "./dat-gap-ui";
import { h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { taoKhoiDuaDon, type DiemChon, type KhoiDuaDon } from "./khoi-dua-don";
import { CHIEU_LABEL, type LyDoDatGap } from "../src/shared/chang-dua-don";
import { changDaDoi, changTuDto, legInput, loiDanhSachChang, type ChangNhap } from "../src/shared/chang-form";
import { tongKhach } from "../src/shared/so-nguoi-chang";
import { ghepThayChang } from "../src/shared/thay-chang";
import { NETWORK_BANNER, classifyOrderError, type Banner } from "../src/shared/order-errors";

export interface SheetDuaDonOptions {
  order: Order;
  diem: readonly DiemChon[];
  coDatGap: boolean;
  onSaved: () => void;
  onReload: () => void;
}

type Lenh = { ten: string; goi: (order: Order, datGap?: { lyDo: LyDoDatGap; ghiChu: string | null }) => Promise<Order> };

export function openSheetDuaDon(o: SheetDuaDonOptions, opener: HTMLElement): void {
  let seq = 0;
  const newKey = () => `m4-${++seq}`;
  const ngayDi = o.order.services[0]?.departDate ?? "";
  const khoi: { svc: Api.OrderServiceDto; legs: ChangNhap[]; ui: KhoiDuaDon }[] = o.order.services.map((svc) => {
    const entry = { svc, legs: svc.legs.map((l) => changTuDto(l, newKey())), ui: null as unknown as KhoiDuaDon };
    entry.ui = taoKhoiDuaDon({
      legs: entry.legs, taoSan: null, che: "bang", ma: `m4-${svc.id}`, ngayDi: () => svc.departDate ?? ngayDi, soKhach: () => tongKhach(svc.pax), mau: () => null,
      diem: () => o.diem, suaSoVe: true, newKey, onChange: (legs) => (entry.legs = legs),
    });
    return entry;
  });
  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const datGapEl = h("div", { class: "dg-sheet-slot", hidden: true });
  let cho: { lenh: Lenh; order: Order; conLai: Lenh[] } | null = null; // lệnh đang chờ duyệt đặt gấp
  const khungDatGap = o.coDatGap ? taoKhungDatGap({ onDuyet: async (than) => void (cho ? chay(cho.order, [cho.lenh, ...cho.conLai], than) : undefined) }) : null;
  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "luu-dua-don" }, "Lưu");
  const bt = moBangTruot({
    title: "Sửa đưa đón",
    opener,
    footClass: "dd-sheet-foot",
    body: [
      h("p", { class: "sheet-warn" }, icon("alert", 18), "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."),
      bannerEl,
      datGapEl,
      ...khoi.map((k) => h("section", { class: "sheet-svc", "data-service-id": k.svc.id }, h("h3", { class: "svc-name" }, k.svc.name), k.ui.root)),
    ],
    foot: [huy, luu],
  });
  if (!bt) return;
  huy.addEventListener("click", () => bt.close());

  const tenChang = (legId: string): string | null => {
    for (const s of o.order.services) {
      const l = s.legs.find((x) => x.id === legId);
      if (l) return `${CHIEU_LABEL[l.direction]} · ${s.name}`;
    }
    return null;
  };
  const loiBanner = (err: unknown, daLuu: number): Banner => {
    if (!(err instanceof ApiError)) return NETWORK_BANNER;
    const b = classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: o.order.services.map((s) => s.name), formatMoney: vnd, tenChang });
    return b.action === "none" && (daLuu > 0 || err.status === 409) ? { ...b, action: "reload_order" } : b.action === "lock_form" ? { ...b, action: "reload_order" } : b;
  };
  const ban = (busy: boolean) => {
    bt.setBusy(busy);
    luu.disabled = busy;
    luu.textContent = busy ? "Đang lưu…" : "Lưu";
  };

  /**
   * Lập danh sách lệnh từ bản nháp: THAY trước (mọi dịch vụ — bị chặn dưới mốc thì chưa có gì được lưu, nút Lưu không khoá), rồi theo từng dịch vụ bỏ, sửa,
   * thêm (chặng đã ghép vào lệnh thay không gửi lại lệnh rời).
   */
  function lapLenh(): Lenh[] {
    const thayDs: Lenh[] = [];
    const ds: Lenh[] = [];
    for (const k of khoi) {
      const ghep = ghepThayChang(k.ui.daBo(), k.legs.filter((l) => !l.goc));
      for (const { bo, moi } of ghep.thay) {
        const g = bo.leg.goc!;
        const leg = legInput(moi, true);
        thayDs.push({ ten: "thay", goi: async (order, datGap) => (await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(g.id)}/replace`, { method: "POST", body: { expectedUpdatedAt: order.updatedAt, reasonCode: bo.lyDo, leg, ...(datGap ? { datGap } : {}) } })).order });
      }
      const daGhep = new Set(ghep.thay.map((c) => c.moi));
      for (const b of ghep.boLe) {
        const g = b.leg.goc!;
        ds.push({ ten: "bo", goi: async (order) => (await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(g.id)}/close`, { method: "POST", body: { expectedUpdatedAt: g.updatedAt, reasonCode: b.lyDo } })).order });
      }
      for (const l of k.legs) {
        if (daGhep.has(l) || !changDaDoi(l, true)) continue;
        const { id: _id, direction: _d, ...leg } = legInput(l, true);
        if (l.goc) {
          const g = l.goc;
          ds.push({ ten: "sua", goi: async (order, datGap) => (await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(g.id)}`, { method: "PUT", body: { expectedUpdatedAt: g.updatedAt, leg, ...(datGap ? { datGap } : {}) } })).order });
        } else {
          const full = legInput(l, true);
          ds.push({ ten: "them", goi: async (order, datGap) => (await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/legs`, { method: "POST", body: { expectedUpdatedAt: order.updatedAt, serviceId: k.svc.id, leg: full, ...(datGap ? { datGap } : {}) } })).order });
        }
      }
    }
    return [...thayDs, ...ds];
  }

  let daLuuSo = 0;
  async function chay(order: Order, ds: Lenh[], datGap?: { lyDo: LyDoDatGap; ghiChu: string | null }): Promise<void> {
    ban(true);
    renderBanner(bannerEl, null);
    let cur = order;
    for (let i = 0; i < ds.length; i++) {
      try {
        cur = await ds[i]!.goi(cur, i === 0 ? datGap : undefined);
        daLuuSo++;
      } catch (err) {
        ban(false);
        // Đã lưu một phần mà không phải chờ duyệt đặt gấp: không cho Lưu lại từ bản nháp cũ (lệnh đã chạy sẽ hỏng) — phải "Tải lại đơn".
        if (daLuuSo > 0 && !(err instanceof ApiError && err.code === "short_notice_required" && khungDatGap)) luu.disabled = true;
        renderBanner(bannerEl, loiBanner(err, daLuuSo), { reloadOrder: () => { bt!.close(false); o.onReload(); }, reloadPage: () => location.reload() });
        bannerEl.scrollIntoView({ block: "nearest" });
        // Lệnh đầu của lần gửi lại đã mang dấu đặt gấp; lệnh SAU mà cũng dưới mốc (chặng khác) → mở lại khung cho đúng lệnh đó.
        if (khungDatGap && err instanceof ApiError && err.code === "short_notice_required" && (i > 0 || !datGap)) {
          cho = { lenh: ds[i]!, order: cur, conLai: ds.slice(i + 1) };
          replaceChildren(datGapEl, khungDatGap.root);
          datGapEl.hidden = false;
          khungDatGap.mo();
        }
        return;
      }
    }
    ban(false);
    bt!.close(false);
    o.onSaved();
  }

  luu.addEventListener("click", () => {
    for (const k of khoi) k.ui.showIssues(true);
    if (khoi.some((k) => loiDanhSachChang(k.legs, tongKhach(k.svc.pax)).length > 0)) return; // lỗi đã hiện dưới từng ô
    const ds = lapLenh();
    if (ds.length === 0) {
      bt.close();
      return;
    }
    void chay(o.order, ds);
  });
}
