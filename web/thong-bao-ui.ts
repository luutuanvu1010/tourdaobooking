// Chuông + ngăn thông báo hai ngăn + dải tin quan trọng (ADR-0034, Task 7) — đúng bản mẫu
// docs/design/thong-bao-mockup/ban-mau-thong-bao.html. Số đỏ/danh sách đến từ máy chủ (một hàm lọc, `locHopThongBao`
// ở src/shared/thong-bao.ts); ở đây chỉ vẽ và gọi 4 route đọc/ghi tự phục vụ. Không innerHTML — dựng bằng h().
import type { HopThongBaoResponse, LoaiTin, StaffProfile as Staff, TinDto, TomTatThongBaoResponse } from "../src/shared/contracts";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { icon, type IconName } from "./icons";
import { taoBoLamMoi } from "./lam-moi-logic";
import type { SuKienChuyen } from "../src/shared/bang-tin";
import { thayDoiCoTheCoTin } from "../src/shared/tin-chuyen";
import { coCuocCuaToi } from "../src/shared/start-page";
import { gioVN, nhanSo, nhomTheoNgay, thoiGian } from "./thong-bao-logic";

const KIND_ICON: Record<LoaiTin, IconName> = {
  thu_cong: "megaphone",
  lap: "filePlus",
  cho_nhan: "userPlus",
  nhan: "checkCircle",
  giao: "swap",
  xac_nhan: "checkCircle",
  huy: "ban",
  chuyen: "truck", // tin chuyến xe (ADR-0052 D6) — giữ màu mặc định `.ntf-badge`
  tai_khoan: "lock", // ngưng tài khoản giữ tiền — chỉ Toàn quyền nhận (ADR-0090 đ3)
  dieu_chinh: "checkCircle", // yêu cầu điều chỉnh công nợ (ADR-0115) — giữ màu mặc định `.ntf-badge`
  cho_xac_nhan: "clock", // ADR-0136 Đ10: đơn đang chờ người kiểm vé
  doi_sau_xac_nhan: "history", // đơn đã xác nhận đổi giờ / nơi đón / số khách (ADR-0062) — giữ màu mặc định `.ntf-badge`
};
/** Màu vòng biểu tượng theo loại (đúng bản mẫu: chờ nhận = cát, nhận/xác nhận = xanh lá, huỷ = nguy hiểm, tin công ty = primary/cát đậm nếu quan trọng; "lập"/"giao" giữ màu mặc định `.ntf-badge`). */
const KIND_BADGE_CLASS: Partial<Record<LoaiTin, string>> = {
  thu_cong: "ntf-badge-tin",
  cho_nhan: "ntf-badge-cho",
  cho_xac_nhan: "ntf-badge-cho",
  nhan: "ntf-badge-nhan",
  xac_nhan: "ntf-badge-nhan",
  huy: "ntf-badge-huy",
  tai_khoan: "ntf-badge-huy",
};
const MINE_NOTE = "Tin công ty gửi bạn, đơn bạn lập hoặc phụ trách, đơn chờ nhận, chuyến xe liên quan tới bạn.";
const ALL_NOTE = "Thêm tin về mọi đơn bạn được xem. Số đỏ trên chuông không đếm ngăn này.";

/** `#strips` (dải mảnh dưới thanh đầu trang, dùng chung với `.maint-strip`) — tạo lười, cái nào chạy trước tạo (R7). */
function strips(): HTMLElement {
  let el = document.getElementById("strips");
  if (!el) {
    el = h("div", { id: "strips" });
    byId("topbar").after(el);
  }
  return el;
}

function tinBadge(t: TinDto): HTMLElement {
  const qt = t.loai === "thu_cong" && t.quanTrong ? " ntf-badge-tin-qt" : "";
  return h("span", { class: `ntf-badge ${KIND_BADGE_CLASS[t.loai] ?? ""}${qt}` }, icon(KIND_ICON[t.loai], 18));
}

function tinMeta(t: TinDto, now: string): HTMLElement {
  let chip: HTMLElement | null = null;
  let cuoi = thoiGian(t.luc, now);
  if (t.loai === "thu_cong") {
    if (t.quanTrong) chip = h("span", { class: t.daHieuLuc ? "ntf-chip ntf-chip-ok" : "ntf-chip ntf-chip-qt" }, t.daHieuLuc ? "Đã hiểu" : "Quan trọng · chưa bấm Đã hiểu");
    cuoi = `Tin công ty · ${t.nguoiGui ?? ""} · ${cuoi}`;
  } else if (t.mo) {
    chip = h("span", { class: "ntf-chip ntf-chip-muted" }, "Đã có người nhận");
  }
  return h("span", { class: "ntf-meta" }, chip, h("span", null, cuoi));
}

function tinRow(t: TinDto, now: string, onOpenTin: (t: TinDto) => void): HTMLElement {
  const cls = ["ntf-item"];
  if (t.chuaDoc) cls.push("ntf-item-unread");
  if (t.mo) cls.push("ntf-item-faded");
  const row = h(
    "button",
    { type: "button", class: cls.join(" ") },
    tinBadge(t),
    h("span", { class: "ntf-item-body" }, h("span", { class: "ntf-txt" }, t.cau), tinMeta(t, now)),
  );
  row.addEventListener("click", () => {
    if (t.loai === "thu_cong") onOpenTin(t);
    else if (t.lienKet) location.href = t.lienKet;
  });
  return row;
}

function renderList(list: readonly TinDto[], onOpenTin: (t: TinDto) => void): HTMLElement {
  if (list.length === 0) return h("p", { class: "ntf-empty" }, "Chưa có thông báo nào.");
  const now = new Date().toISOString();
  const out: HTMLElement[] = [];
  for (const g of nhomTheoNgay(list as TinDto[], now)) {
    out.push(h("div", { class: "ntf-day" }, g.nhan));
    for (const t of g.tin) out.push(tinRow(t, now, onOpenTin));
  }
  return h("div", { class: "ntf-list" }, ...out);
}

/** Nhãn ngày cho dòng "gửi hôm nay/hôm qua/ngày dd/mm lúc HH:mm" của hộp đọc — suy từ nhóm ngày tin đang đứng. */
function ngayChu(nhan: string): string {
  if (nhan === "Hôm nay") return "hôm nay";
  if (nhan === "Hôm qua") return "hôm qua";
  return `ngày ${nhan}`;
}

/**
 * Hộp đọc tin thủ công (`.ntf-dialog`, khuôn `.sheet-root/.sheet` có sẵn — điện thoại: trượt từ đáy). Tin quan trọng
 * chưa "Đã hiểu": nút "Để sau" + "Đã hiểu"; đã hiểu (hoặc không quan trọng): chỉ "Đóng". `onAcked` gọi sau khi bấm
 * "Đã hiểu" THÀNH CÔNG (nơi gọi tự vẽ lại danh sách/số đỏ — hộp không tự biết đang mở từ đâu).
 */
function openTinDialog(t: TinDto, nhan: string, onAcked: () => void): void {
  if (document.querySelector(".ntf-dialog-root")) return; // bấm đúp không mở hai hộp
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const fromLine = h("p", { class: "muted" }, `${t.nguoiGui ?? ""} gửi ${ngayChu(nhan)} lúc ${gioVN(t.luc)}${t.nhomNhan ? ` · ${t.nhomNhan}` : ""}`);
  const ackedLine = h("p", { class: "muted" }, t.daHieuLuc ? `Bạn đã bấm “Đã hiểu” lúc ${gioVN(t.daHieuLuc)}.` : "");
  ackedLine.hidden = t.daHieuLuc === null;
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const laterBtn = h("button", { type: "button", class: "btn" }, "Để sau");
  const ackBtn = h("button", { type: "button", class: "btn btn-primary" }, "Đã hiểu");
  const closeOnlyBtn = h("button", { type: "button", class: "btn" }, "Đóng");
  const scrim = h("div", { class: "sheet-scrim" });
  const showAckActions = t.quanTrong && t.daHieuLuc === null;
  const dialog = h(
    "div",
    { class: "sheet ntf-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "ntf-dialog-title", tabindex: -1 },
    h(
      "div",
      { class: "sheet-head" },
      h("h2", { id: "ntf-dialog-title", class: "sheet-title" }, t.quanTrong ? h("span", { class: "ntf-chip ntf-chip-qt" }, "Tin quan trọng") : null, t.quanTrong ? h("br", null) : null, t.cau),
      closeBtn,
    ),
    h("div", { class: "sheet-body" }, fromLine, h("p", { class: "ntf-body" }, t.noiDung ?? ""), errorBox, ackedLine),
    h("div", { class: "sheet-foot ntf-dialog-actions" }, showAckActions ? laterBtn : null, showAckActions ? ackBtn : closeOnlyBtn),
  );
  const root = h("div", { class: "sheet-root ntf-dialog-root" }, scrim, dialog);

  const background = [...document.body.children];
  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  scrim.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  laterBtn.addEventListener("click", close);
  closeOnlyBtn.addEventListener("click", close);
  ackBtn.addEventListener("click", async () => {
    ackBtn.disabled = true;
    try {
      await api(`/api/account/thong-bao/${encodeURIComponent(t.id)}/da-hieu`, { method: "POST" });
      t.daHieuLuc = new Date().toISOString(); // gần đúng (mốc thật của máy chủ không trả về thân) — chỉ dùng để vẽ lại chip ngay, không lưu ở đâu khác
      close();
      onAcked();
    } catch (err) {
      ackBtn.disabled = false;
      errorBox.textContent = err instanceof ApiError ? err.message : "Không kết nối được máy chủ.";
      errorBox.hidden = false;
    }
  });
  document.addEventListener("keydown", onKey);
  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
}

/** Dải "Tin quan trọng" (`.ntf-strip`, cạnh `.maint-strip` trong `#strips`) — vẽ lại mỗi lần tóm tắt về; rỗng thì gỡ. */
function veDai(danh: TomTatThongBaoResponse["quanTrongChuaHieu"], moTheoId: (id: string) => void): void {
  document.getElementById("ntf-strip")?.remove();
  const n = danh[0];
  if (!n) return;
  const con = danh.slice(1);
  const btn = h("button", { type: "button" }, "Đọc và bấm Đã hiểu");
  btn.addEventListener("click", () => moTheoId(n.id));
  strips().append(
    h(
      "div",
      { class: "ntf-strip", id: "ntf-strip", role: "status" },
      h("span", { class: "ntf-strip-ico" }, icon("megaphone", 18)),
      h(
        "div",
        { class: "ntf-strip-text" },
        h("b", null, `Tin quan trọng: ${n.tieuDe}`),
        h("span", null, `${n.nguoiGui} gửi lúc ${gioVN(n.luc)}${con.length > 0 ? ` · còn ${con.length} tin quan trọng khác` : ""}`),
      ),
      btn,
    ),
  );
}

export function ganThongBao(topbar: HTMLElement, staff: Staff): void {
  // Người xem là ai do máy chủ quyết (locHopThongBao). `staff` chỉ dùng để máy KHÔNG có quyền Tài xế khỏi gọi lại chuông sau xếp / rút / dời (phiếu D1 CAO-3).
  const coTheLai = coCuocCuaToi(staff);
  const bell = h("button", { type: "button", class: "bell", "aria-expanded": "false", "aria-label": "Thông báo" }, icon("bell", 22));
  const count = h("span", { class: "bell-count", hidden: true });
  bell.append(count);
  const newBtn = topbar.querySelector(".topbar-new");
  if (newBtn) newBtn.after(bell); // thứ tự phải: ô tìm → Tạo đơn → chuông → Trợ lý (đợt 0 K1)
  else topbar.append(bell);

  let panelRoot: HTMLElement | null = null;
  const closePanel = (): void => {
    if (!panelRoot) return;
    document.removeEventListener("keydown", onDocKey);
    document.removeEventListener("click", onDocClick, true);
    panelRoot.remove();
    panelRoot = null;
    bell.setAttribute("aria-expanded", "false");
    bell.focus();
  };
  const onDocKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closePanel();
  };
  const onDocClick = (e: MouseEvent): void => {
    const target = e.target as Node;
    // m3: hộp đọc tin thủ công (.ntf-dialog-root) được chèn NGOÀI panelRoot (con riêng của document.body) — bấm trong hộp đó (kể
    // cả nút "Đã hiểu"/"Để sau"/"Đóng", hay chạm nền mờ của hộp) không được coi là "bấm ra ngoài ngăn" và đóng luôn ngăn bên dưới.
    if (target instanceof Element && target.closest(".ntf-dialog-root")) return;
    if (panelRoot && !panelRoot.contains(target) && target !== bell && !bell.contains(target)) closePanel();
  };

  const taiTomTat = async (): Promise<void> => {
    try {
      const t = await api<TomTatThongBaoResponse>("/api/thong-bao/tom-tat");
      count.textContent = nhanSo(t.soChuaDoc);
      count.hidden = t.soChuaDoc === 0;
      bell.setAttribute("aria-label", t.soChuaDoc > 0 ? `Thông báo, ${t.soChuaDoc} tin chưa đọc` : "Thông báo");
      veDai(t.quanTrongChuaHieu, (id) => void moTinTheoId(id));
    } catch {
      // mất mạng: giữ số cũ, không chặn trang
    }
  };
  const lamMoi = taoBoLamMoi(taiTomTat);
  window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
  // ADR-0052 D6: chỉ gọi lại khi đợt có loại thay đổi CÓ THỂ sinh tin (tạo, sửa, huỷ, gián đoạn, khách vắng) — tiến độ khác chỉ làm mới màn (vòng sửa 1, V1).
  // Xếp / rút / dời (ADR-0104 Đ1.6) chỉ sinh tin cho tài xế đang lái ⇒ chỉ máy có quyền Tài xế gọi lại (phiếu D1 CAO-3).
  window.addEventListener("chuyen-thay-doi", (ev) => {
    if ((ev as CustomEvent<SuKienChuyen[]>).detail.some((e) => thayDoiCoTheCoTin(e.thayDoi, coTheLai))) void lamMoi.yeuCau();
  });
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());

  /**
   * Mở đúng tin (từ dải nhắc) trong ngăn "Của tôi" và hiện hộp đọc — tin quan trọng chưa hiểu luôn thuộc ngăn này (K6/E3).
   * Tìm trong `quanTrongChuaHieu` TRƯỚC (nguồn tính trước khi cắt trần 100 tin — cùng lý do X4 ở `tom-tat`): tin có thể
   * đã rơi khỏi `tin` (đã cắt trần) nếu tài khoản có > 100 tin "Của tôi" mới hơn, nhưng vẫn còn quan trọng chưa hiểu.
   */
  async function moTinTheoId(id: string): Promise<void> {
    try {
      const r = await api<HopThongBaoResponse>("/api/thong-bao?ngan=cua-toi");
      const t = r.quanTrongChuaHieu.find((x) => x.id === id) ?? r.tin.find((x) => x.id === id);
      if (t) {
        const nhan = nhomTheoNgay([t], new Date().toISOString())[0]?.nhan ?? "Hôm nay";
        openTinDialog(t, nhan, () => void taiTomTat());
      }
    } catch {
      // mất mạng: bấm lại dải sau
    }
  }

  async function openPanel(): Promise<void> {
    if (panelRoot) return closePanel();
    bell.setAttribute("aria-expanded", "true");
    const cache = new Map<"cua-toi" | "tat-ca", TinDto[]>();
    let tab: "cua-toi" | "tat-ca" = "cua-toi";

    const tabMineLabel = h("span", null);
    const tabAllLabel = h("span", null, "Tất cả");
    const tabMine = h("button", { type: "button", class: "ntf-tab", role: "tab", "aria-selected": "true" }, "Của tôi", tabMineLabel);
    const tabAll = h("button", { type: "button", class: "ntf-tab", role: "tab", "aria-selected": "false" }, tabAllLabel);
    const note = h("p", { class: "ntf-tab-note" }, MINE_NOTE);
    const listSlot = h("div", { class: "ntf-list-slot" });
    const closeBtn = h("button", { type: "button", class: "icon-btn ntf-panel-close", "aria-label": "Đóng" }, icon("close", 20));
    const backBtn = h("button", { type: "button", class: "icon-btn ntf-panel-back", "aria-label": "Quay lại" }, icon("back", 22));
    backBtn.addEventListener("click", closePanel);
    closeBtn.addEventListener("click", closePanel);

    function onOpenTin(t: TinDto): void {
      const nhan = nhomTheoNgay(cache.get(tab) ?? [t], new Date().toISOString()).find((g) => g.tin.some((x) => x.id === t.id))?.nhan ?? "Hôm nay";
      openTinDialog(t, nhan, () => {
        void taiTomTat();
        replaceChildren(listSlot, renderList(cache.get(tab) ?? [], onOpenTin));
      });
    }

    async function ensureLoaded(t: "cua-toi" | "tat-ca"): Promise<TinDto[]> {
      const co = cache.get(t);
      if (co) return co;
      const r = await api<HopThongBaoResponse>(`/api/thong-bao?ngan=${t}`);
      cache.set(t, r.tin);
      if (t === "cua-toi") replaceChildren(tabMineLabel, r.tin.some((x) => x.chuaDoc) ? h("span", { class: "ntf-tab-n" }, String(r.tin.filter((x) => x.chuaDoc).length)) : null);
      else replaceChildren(tabAllLabel, `Tất cả (${r.tin.length})`);
      return r.tin;
    }

    async function selectTab(t: "cua-toi" | "tat-ca"): Promise<void> {
      tab = t;
      tabMine.setAttribute("aria-selected", String(t === "cua-toi"));
      tabAll.setAttribute("aria-selected", String(t === "tat-ca"));
      note.textContent = t === "cua-toi" ? MINE_NOTE : ALL_NOTE;
      const cached = cache.get(t);
      if (cached) {
        replaceChildren(listSlot, renderList(cached, onOpenTin));
        return;
      }
      replaceChildren(listSlot, h("p", { class: "ntf-empty" }, "Đang tải…"));
      try {
        const list = await ensureLoaded(t);
        if (tab === t) replaceChildren(listSlot, renderList(list, onOpenTin));
      } catch (err) {
        if (tab === t) replaceChildren(listSlot, h("p", { class: "ntf-empty" }, err instanceof ApiError ? err.message : "Không kết nối được máy chủ."));
      }
    }
    tabMine.addEventListener("click", () => void selectTab("cua-toi"));
    tabAll.addEventListener("click", () => void selectTab("tat-ca"));

    const wide = window.matchMedia("(min-width: 641px)").matches;
    panelRoot = h(
      "div",
      { class: "ntf-panel", role: "dialog", "aria-label": "Thông báo" },
      h("div", { class: "ntf-panel-head" }, wide ? null : backBtn, h("h3", null, "Thông báo"), wide ? closeBtn : null),
      h("div", { class: "ntf-tabs", role: "tablist" }, tabMine, tabAll),
      note,
      listSlot,
      h("div", { class: "ntf-panel-foot" }, "Giữ tin trong 30 ngày. Tin quan trọng chưa bấm “Đã hiểu” được giữ tới khi bấm."),
    );
    topbar.after(panelRoot);
    document.addEventListener("keydown", onDocKey);
    setTimeout(() => document.addEventListener("click", onDocClick, true), 0); // tránh nhận luôn cú bấm chuông vừa mở ngăn

    await selectTab("cua-toi");
    void ensureLoaded("tat-ca").catch(() => replaceChildren(tabAllLabel, "Tất cả")); // nạp số "Tất cả (n)" ở nền, không đổi ngăn đang xem
    try {
      await api("/api/account/thong-bao/da-doc", { method: "POST" });
    } catch {
      // mất mạng: số đỏ vẫn hiện, thử lại lần sau mở ngăn
    }
    void taiTomTat();
  }
  bell.addEventListener("click", () => void openPanel());

  void taiTomTat();
}
