// Trang "Gửi thông báo" — chỉ Toàn quyền (ADR-0034 điều 5–9, đúng bản mẫu docs/design/thong-bao-mockup/ban-mau-thong-bao.html).
// Soạn tin (Toàn công ty nội bộ hoặc theo nhóm quyền), đánh dấu quan trọng, xem "Đã gửi" (tiến độ Đã hiểu, xem danh sách, thu hồi có xác nhận ngay trên trang).
// Khuôn Biểu mẫu của khung gốc (ADR-0222; đợt D1): ô nhập bằng `truong()` trên `luoi()`, nút gửi ở thanh nút cuối biểu mẫu (#thanh-nut từ 560, #thanh-day hẹp hơn).
import type { DaGuiResponse, GuiThongBaoRequest, NguoiDaHieuResponse, NguoiNhanTin, PermissionCode, TinDaGuiDto } from "../src/shared/contracts";
import { PERMISSION_CODES, PERMISSION_LABEL, can } from "../src/shared/permissions";
import { vnDateTimeText } from "../src/shared/vn-date";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { luoi, thanhNut, truong } from "./khung";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const staff = await initShell();

/** Thao tác GHI: khoá nút từ lúc bấm đến khi xong (bấm đúp không gửi hai lần) — cùng khuôn `act()` của web/feedback.ts:24-36. */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function nguoiNhanText(n: NguoiNhanTin): string {
  return n === "noi-bo" ? "Toàn công ty (nội bộ)" : n.map((p) => PERMISSION_LABEL[p]).join(", ");
}

/** Danh sách "Đã gửi": tải một lần, vẽ lại tại chỗ sau mỗi lần gửi/thu hồi/mở "ai đã hiểu" — không đụng vào form đang soạn. */
function sentList(): { root: HTMLElement; reload: () => Promise<void> } {
  const root = h("div", null);
  let items: TinDaGuiDto[] = [];
  const openAcks = new Set<string>();
  const confirmRevoke = new Set<string>();
  const acksCache = new Map<string, NguoiDaHieuResponse>();

  function ackLine(p: { ten: string; quyen: string }, luc?: string): HTMLElement {
    return h("li", null, h("span", null, `${p.ten} · ${p.quyen}`), luc ? h("time", null, vnDateTimeText(luc)) : null);
  }

  function acksPanel(id: string): HTMLElement | null {
    if (!openAcks.has(id)) return null;
    const data = acksCache.get(id);
    if (!data) return h("p", { class: "muted" }, "Đang tải…");
    return h(
      "div",
      { class: "ntf-acks" },
      h("div", null, h("h5", null, `Đã hiểu (${data.daHieu.length})`), h("ul", null, ...(data.daHieu.length ? data.daHieu.map((p) => ackLine(p, p.luc)) : [h("li", null, "Chưa ai")]))),
      h("div", null, h("h5", null, `Chưa hiểu (${data.chuaHieu.length})`), h("ul", null, ...(data.chuaHieu.length ? data.chuaHieu.map((p) => ackLine(p)) : [h("li", null, "Không còn ai")]))),
    );
  }

  function revokeConfirm(t: TinDaGuiDto): HTMLElement | null {
    if (!confirmRevoke.has(t.id)) return null;
    const yes = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem" }, "Thu hồi");
    const no = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Giữ lại");
    no.addEventListener("click", () => {
      confirmRevoke.delete(t.id);
      render();
    });
    yes.addEventListener("click", () =>
      void act(async () => {
        await api(`/api/thong-bao/${encodeURIComponent(t.id)}/thu-hoi`, { method: "POST" });
        confirmRevoke.delete(t.id);
        await load();
      }, yes),
    );
    return h("div", { class: "ntf-confirm" }, h("p", null, "Thu hồi tin này? Tin sẽ biến khỏi hộp thông báo và dải nhắc của mọi người. Không hoàn tác được."), thanhNut(null, yes, no));
  }

  function itemEl(t: TinDaGuiDto): HTMLElement {
    const pct = t.quanTrong && t.soNguoiNhan > 0 ? Math.round((t.soDaHieu / t.soNguoiNhan) * 100) : 0;
    const acksBtn = h("button", { type: "button", class: "nut", "data-cap": "phu" }, openAcks.has(t.id) ? "Ẩn danh sách" : "Xem ai đã hiểu");
    acksBtn.addEventListener("click", () => {
      if (openAcks.has(t.id)) {
        openAcks.delete(t.id);
        render();
        return;
      }
      openAcks.add(t.id);
      render();
      if (!acksCache.has(t.id)) {
        void act(async () => {
          const r = await api<NguoiDaHieuResponse>(`/api/thong-bao/${encodeURIComponent(t.id)}/nguoi-da-hieu`);
          acksCache.set(t.id, r);
          t.soDaHieu = r.daHieu.length; // m2: con số "x/y đã bấm" + thanh tiến độ vẽ từ bản chụp lúc tải danh sách — cập nhật lại theo dữ liệu vừa tải, không để lệch
          render();
        });
      }
    });
    const revokeBtn = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem" }, "Thu hồi");
    revokeBtn.addEventListener("click", () => {
      confirmRevoke.add(t.id);
      render();
    });
    return h(
      "div",
      { class: t.thuHoiLuc ? "ntf-sent-item ntf-sent-revoked" : "ntf-sent-item" },
      h("strong", null, t.tieuDe),
      h(
        "div",
        { class: "ntf-sent-meta" },
        t.quanTrong && h("span", { class: "huy-hieu", "data-tong": "cat" }, "Quan trọng"),
        t.thuHoiLuc && h("span", { class: "huy-hieu", "data-tong": "xam" }, "Đã thu hồi"),
        h("span", null, `${nguoiNhanText(t.nguoiNhan)} · ${vnDateTimeText(t.luc)}`),
      ),
      t.quanTrong && h("div", { class: "ntf-sent-meta" }, h("span", null, `${t.soDaHieu}/${t.soNguoiNhan} người đã bấm Đã hiểu`)),
      t.quanTrong && h("div", { class: "ntf-bar" }, h("i", { style: `width:${pct}%` })),
      acksPanel(t.id),
      revokeConfirm(t),
      !t.thuHoiLuc && thanhNut(null, t.quanTrong && !confirmRevoke.has(t.id) && acksBtn, !confirmRevoke.has(t.id) && revokeBtn),
    );
  }

  function render(): void {
    replaceChildren(root, items.length === 0 ? h("p", { class: "muted" }, "Chưa gửi tin nào.") : h("div", { class: "ntf-sent-list" }, ...items.map(itemEl)));
  }
  async function load(): Promise<void> {
    const r = await act(() => api<DaGuiResponse>("/api/thong-bao/da-gui"));
    if (r) {
      items = r.tin;
      render();
    }
  }
  return { root, reload: load };
}

/** Ô "Tiêu đề"/"Nội dung" của khung (`truong()`): nhãn trên ô, bộ đếm n/tối đa ở dòng gợi ý dưới ô. */
function counterField(label: string, kind: "input" | "textarea", max: number, placeholder: string, id: string): { root: HTMLElement; el: HTMLInputElement | HTMLTextAreaElement } {
  const count = h("span", { id: `${id}-dem` }, `0/${max}`);
  const el = h(kind === "input" ? "input" : "textarea", {
    id, class: "o", type: kind === "input" ? "text" : undefined, maxlength: max, placeholder, "aria-describedby": `${id}-dem`,
    "data-loai": kind === "textarea" ? "nhieu-dong" : undefined, rows: kind === "textarea" ? 6 : undefined,
  }) as HTMLInputElement | HTMLTextAreaElement;
  el.addEventListener("input", () => (count.textContent = `${el.value.length}/${max}`));
  return { root: truong(label, el, { goiY: count }), el };
}

function setupForm(sent: { reload: () => Promise<void> }): void {
  let clientRequestId = crypto.randomUUID(); // một lần mỗi bản nháp; giữ nguyên khi bấm lại sau lỗi mạng
  const title = counterField("Tiêu đề", "input", 120, "Ví dụ: Lịch nghỉ lễ 2/9", "tb-tieu-de");
  const body = counterField("Nội dung", "textarea", 2000, "Viết như tin nhắn bình thường. Xuống dòng được giữ nguyên.", "tb-noi-dung");
  (title.el as HTMLInputElement).required = true;
  body.el.required = true;

  const whoNoibo = h("input", { type: "radio", name: "who", checked: true });
  const whoGroups = h("input", { type: "radio", name: "who" });
  const groupBoxes = PERMISSION_CODES.map((code) => {
    const cb = h("input", { type: "checkbox" });
    const label = h("label", null, cb, PERMISSION_LABEL[code]);
    return { code, cb, label };
  });
  const groupsWrap = h("div", { class: "ntf-groups ntf-groups-off" }, ...groupBoxes.map((g) => g.label));
  const syncGroupsEnabled = (): void => {
    const on = whoGroups.checked;
    groupsWrap.classList.toggle("ntf-groups-off", !on);
  };
  whoNoibo.addEventListener("change", syncGroupsEnabled);
  whoGroups.addEventListener("change", syncGroupsEnabled);

  const important = h("input", { type: "checkbox" });
  const err = h("div", { class: "truong-loi", role: "alert", hidden: true });
  const submitBtn = h("button", { type: "submit", class: "nut", "data-cap": "chinh" }, icon("megaphone", 16), " Gửi thông báo") as HTMLButtonElement;
  submitBtn.setAttribute("form", "form"); // nút đứng ở thanh nút của trang (ngoài <form>) vẫn gửi biểu mẫu, Enter trong ô Tiêu đề vẫn gửi

  const form = byId<HTMLFormElement>("form");
  replaceChildren(
    form,
    h("header", { class: "khoi-dau" }, h("h2", { id: "tb-soan-ten" }, "Soạn tin")),
    luoi(null, title.root, body.root),
    h(
      "fieldset",
      { class: "nhom-chon" },
      h("legend", null, "Gửi cho"),
      h("label", null, whoNoibo, h("span", null, "Toàn công ty", h("span", { class: "o-phu" }, "Nhân viên nội bộ, không gồm Đối tác"))),
      h("label", null, whoGroups, h("span", null, "Chọn nhóm")),
      groupsWrap,
    ),
    h("label", { class: "ntf-important" }, important, h("span", null, h("b", null, "Tin quan trọng"), h("small", null, 'Hiện dải nhắc ở đầu mọi trang tới khi người nhận bấm "Đã hiểu". Bạn xem được ai đã/chưa hiểu.'))),
  );
  form.hidden = false;

  // Thanh nút cuối biểu mẫu (khuôn Biểu mẫu, như Tạo đơn): tệp kiểu quyết thanh nào hiện; câu lỗi và MỘT nút gửi đi theo thanh đang hiện.
  const thanhNutEl = byId("thanh-nut");
  const thanhDayEl = byId("thanh-day");
  thanhNutEl.hidden = false;
  thanhDayEl.hidden = false;
  const datChoNutGui = (): void => {
    const hep = thanhDayEl.getClientRects().length > 0;
    thanhDayEl.classList.toggle("dang-an", !hep);
    const dich = hep ? thanhDayEl : thanhNutEl;
    if (submitBtn.parentElement === dich) return;
    const coTieuDiem = submitBtn === document.activeElement;
    submitBtn.classList.toggle("day-phai", !hep);
    dich.append(err, submitBtn);
    if (coTieuDiem) submitBtn.focus();
  };
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(datChoNutGui).observe(thanhDayEl);
  datChoNutGui();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    err.hidden = true;
    const tieuDe = (title.el as HTMLInputElement).value.trim();
    const noiDung = body.el.value.trim();
    if (!tieuDe) return showError(err, "Chưa có tiêu đề. Viết một câu ngắn nói tin này về việc gì.");
    if (!noiDung) return showError(err, "Chưa có nội dung.");
    const chosenGroups = groupBoxes.filter((g) => g.cb.checked).map((g) => g.code) as PermissionCode[];
    if (whoGroups.checked && chosenGroups.length === 0) return showError(err, "Chưa chọn nhóm nào. Tick ít nhất một nhóm hoặc chọn Toàn công ty.");
    const nguoiNhan: NguoiNhanTin = whoGroups.checked ? chosenGroups : "noi-bo";
    const req: GuiThongBaoRequest = { tieuDe, noiDung, nguoiNhan, quanTrong: important.checked, clientRequestId };
    void act(async () => {
      await api("/api/thong-bao", { method: "POST", body: req });
      (title.el as HTMLInputElement).value = "";
      title.el.dispatchEvent(new Event("input"));
      body.el.value = "";
      body.el.dispatchEvent(new Event("input"));
      whoNoibo.checked = true;
      for (const g of groupBoxes) g.cb.checked = false;
      syncGroupsEnabled();
      important.checked = false;
      clientRequestId = crypto.randomUUID();
      showError(errorEl, null);
      await sent.reload();
    }, submitBtn);
  });
}

if (!can(staff, "notice.send")) showError(errorEl, "Chỉ người phụ trách hệ thống dùng được trang này.");
else {
  const sent = sentList();
  replaceChildren(byId("sent"), sent.root);
  byId("tb-da-gui").hidden = false;
  setupForm(sent);
  void sent.reload();
}
