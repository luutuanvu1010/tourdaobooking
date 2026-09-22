import { ApiError, api, type Api } from "./api";
import { PERMISSION_LABEL, hasPermission, isOffice } from "../src/shared/permissions";
import { PAX_LABEL, type PaxCode } from "../src/shared/order-lines";
import { vnDateTimeText, vnLocalToIso } from "../src/shared/vn-date";
import { counter } from "./counter";
import { byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { icon } from "./icons";
import { renderMaintenanceMessage } from "./maintenance-screen";
import { feedbackBadge, initShell, logout, setMaintenanceStrip, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const form = byId<HTMLFormElement>("pin-form");

const staff = await initShell();
replaceChildren(
  byId("me"),
  h(
    "div",
    { class: "profile" },
    h("span", { class: "avatar", "aria-hidden": "true" }, initials(staff.fullName)),
    h("div", null, h("div", { class: "profile-name" }, staff.fullName), h("div", { class: "muted" }, `${staff.phone} · ${staff.permissions.map((p) => PERMISSION_LABEL[p]).join(", ") || "chưa có quyền"}`)),
  ),
);
const logoutBtn = h("button", { class: "row-link danger", type: "button" }, "Đăng xuất");
logoutBtn.addEventListener("click", () => void logout());
const feedbackBadgeEl = h("span", { class: "badge badge-cancelled", hidden: true });
void feedbackBadge().then((n) => {
  if (n > 0) {
    feedbackBadgeEl.textContent = String(n);
    feedbackBadgeEl.hidden = false;
  }
});
replaceChildren(
  byId("links"),
  isOffice(staff) && h("a", { class: "row-link", href: "/parties" }, "Hồ sơ", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/locations" }, "Địa điểm", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/audit" }, "Nhật ký", icon("next", 20)),
  h("a", { class: "row-link", href: "/feedback" }, "Góp ý / Báo lỗi", feedbackBadgeEl, icon("next", 20)),
  logoutBtn,
);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  okEl.hidden = true;
  const currentPin = byId<HTMLInputElement>("current").value;
  const newPin = byId<HTMLInputElement>("new").value;
  if (newPin !== byId<HTMLInputElement>("confirm").value) return showError(errorEl, "Hai lần nhập PIN mới không khớp.");
  try {
    await api("/api/account/change-pin", { method: "POST", body: { currentPin, newPin } });
    form.reset();
    okEl.hidden = false;
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
});

// ---- Chế độ bảo trì (chỉ chủ dự án: GET /api/maintenance trả canToggle = true) ----
// Bật = mọi tài khoản khác bị chặn NGAY (kể cả phiên đang mở) — nên bật phải qua bước xác nhận thứ hai ngay trong trang (không dùng confirm() của trình duyệt). Máy chủ mới là nơi kiểm quyền và giờ hợp lệ.
const maintenanceEl = byId("maintenance");
const QUICK_MINUTES = [30, 60, 120] as const;
let stopPreview: (() => void) | null = null;

/** Chọn giờ dự kiến hoàn tất: ba nút nhanh (từ lúc bấm) hoặc ô chọn giờ (hiểu là giờ Việt Nam). `iso()` trả mốc ISO UTC đã chọn, hoặc null nếu chưa chọn/nhập sai. */
function etaPicker(): { el: HTMLElement; iso: () => string | null } {
  let minutes: number | null = null;
  const input = h("input", { id: "maint-eta", type: "datetime-local" });
  const quick = QUICK_MINUTES.map((m) => {
    const b = h("button", { class: "btn", type: "button", "aria-pressed": "false" }, `${m} phút`);
    b.addEventListener("click", () => {
      minutes = m;
      input.value = "";
      quick.forEach((other, i) => other.setAttribute("aria-pressed", String(QUICK_MINUTES[i] === m)));
    });
    return b;
  });
  input.addEventListener("input", () => {
    minutes = null;
    for (const b of quick) b.setAttribute("aria-pressed", "false");
  });
  const el = h(
    "div",
    null,
    h("div", { class: "maint-quick", role: "group", "aria-label": "Chọn nhanh thời gian bảo trì" }, ...quick),
    h("label", { class: "maint-eta" }, "Hoặc chọn giờ dự kiến hoàn tất (giờ Việt Nam)", input),
  );
  return { el, iso: () => (minutes !== null ? new Date(Date.now() + minutes * 60_000).toISOString() : vnLocalToIso(input.value)) };
}

function renderMaintenance(status: Api.MaintenanceResponse): void {
  stopPreview?.();
  stopPreview = null;
  setMaintenanceStrip(status.on); // dải "Đang ở chế độ bảo trì" theo trạng thái mới, khỏi tải lại trang
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const lock = (locked: boolean): void => maintenanceEl.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => (el.disabled = locked));
  const send = async (body: Api.MaintenanceRequest): Promise<void> => {
    showError(errorBox, null);
    lock(true);
    try {
      renderMaintenance(await api<Api.MaintenanceResponse>("/api/maintenance", { method: "PUT", body }));
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      lock(false);
    }
  };
  const button = (label: string, cls: string, onclick: () => void): HTMLButtonElement => {
    const b = h("button", { class: cls, type: "button" }, label);
    b.addEventListener("click", onclick);
    return b;
  };

  const picker = etaPicker();
  const chosen = (): string | null => {
    const iso = picker.iso();
    if (iso === null) showError(errorBox, "Hãy chọn thời gian dự kiến hoàn tất (nút nhanh hoặc ô chọn giờ).");
    else showError(errorBox, null);
    return iso;
  };
  let body: HTMLElement;
  if (status.on) {
    body = h(
      "div",
      null,
      picker.el,
      h(
        "div",
        { class: "maint-actions" },
        button("Cập nhật giờ dự kiến", "btn", () => {
          const iso = chosen();
          if (iso) void send({ on: true, endsAt: iso });
        }),
        button("Tắt chế độ bảo trì", "btn btn-primary", () => void send({ on: false })),
      ),
    );
  } else {
    // Bước 1: chọn giờ; bước 2: xác nhận (thay khối chọn giờ bằng lời cảnh báo).
    const setup = h("div", null, picker.el);
    const confirmBox = h("div", { hidden: true });
    const startBtn = button("Bật chế độ bảo trì", "btn btn-primary btn-block", () => {
      const iso = chosen();
      if (!iso) return;
      const back = button("Quay lại", "btn", () => {
        confirmBox.hidden = true;
        setup.hidden = false;
        startBtn.focus();
      });
      const panel = h(
        "div",
        { class: "maint-confirm", role: "group", "aria-label": "Xác nhận bật chế độ bảo trì", tabindex: -1 },
        h("p", null, h("strong", null, "Mọi nhân viên khác sẽ bị chặn ngay, kể cả người đang mở app. Chỉ bạn dùng được.")),
        h("p", null, `Dự kiến hoàn tất lúc ${vnDateTimeText(iso)}.`),
        h("div", { class: "maint-actions" }, button("Xác nhận bật", "btn btn-primary", () => void send({ on: true, endsAt: iso })), back),
      );
      replaceChildren(confirmBox, panel);
      setup.hidden = true;
      confirmBox.hidden = false;
      panel.focus();
    });
    setup.append(startBtn);
    body = h("div", null, setup, confirmBox);
  }

  const preview = status.on ? h("span", { id: "maint-preview" }) : null;
  if (preview) stopPreview = renderMaintenanceMessage(preview, status.endsAt);
  replaceChildren(
    maintenanceEl,
    h("h2", { id: "maintenance-heading" }, "Chế độ bảo trì"),
    h("p", { class: "muted" }, "Khi bật, mọi nhân viên khác bị chặn ngay (kể cả đang mở app); chỉ bạn dùng được."),
    h(
      "p",
      { class: "maint-state" },
      h("span", { class: status.on ? "badge badge-draft" : "badge badge-cancelled" }, status.on ? "Đang bật" : "Đang tắt"),
      status.on && status.endsAt && h("span", null, `Dự kiến hoàn tất lúc ${vnDateTimeText(status.endsAt)}`),
    ),
    preview && h("p", { class: "muted" }, "Nhân viên đang thấy: ", preview),
    errorBox,
    body,
  );
  maintenanceEl.hidden = false;
}

async function initMaintenance(): Promise<void> {
  if (!hasPermission(staff, "ADMIN")) return;
  try {
    const status = await api<Api.MaintenanceResponse>("/api/maintenance");
    if (status.canToggle) renderMaintenance(status);
  } catch {
    // không phải chủ, hoặc lỗi mạng: mục này ẩn (không ảnh hưởng phần còn lại của trang)
  }
}
void initMaintenance();

// ---- Việc của tôi (FIELD đang phụ trách — ADR-0014 điều 6/11) ------------------------------------------------------
// Route hẹp, đã có: POST /api/orders/:id/handler-money-edit (sửa số khách), POST /api/orders/:id/handler-cancel (huỷ, lý do đóng hai lựa chọn).
// KHÔNG hiện giá/tổng tiền ở bất kỳ đâu trong khối này (ADR-0007 điều 3) — GET /api/dispatch/mine vốn đã không trả trường tiền nào.
const CANCEL_REASONS: { code: string; label: string }[] = [
  { code: "not_reachable", label: "Không liên hệ được với khách" },
  { code: "customer_requested", label: "Khách yêu cầu huỷ" },
];

function myServiceCard(orderId: string, s: Api.MyAssignmentServiceDto, onSaved: () => void): HTMLElement {
  const trip = [s.departDate, s.departTime].filter(Boolean).join(" ");
  const pickup = [s.pickupTime, s.pickupPlace].filter(Boolean).join(" — ");
  const editable = s.editablePaxCodes.length > 0;
  const draft = new Map<PaxCode, number>(s.editablePaxCodes.map((code) => [code, s.pax[code]]));
  const counters = s.editablePaxCodes.map((code) => counter({ label: PAX_LABEL[code], value: s.pax[code], onChange: (n) => draft.set(code, n) }));
  const reasonInput = h("input", { type: "text", placeholder: "Lý do sửa (bắt buộc)", maxlength: 300 });
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const saveBtn = h("button", { class: "btn btn-primary", type: "button" }, "Lưu số khách mới");
  saveBtn.addEventListener("click", async () => {
    showError(errorBox, null);
    const reason = reasonInput.value.trim();
    if (!reason) return showError(errorBox, "Cần nhập lý do sửa.");
    saveBtn.disabled = true;
    try {
      const pax = { adult: 0, child: 0, senior: 0, infant: 0, ...Object.fromEntries(draft) };
      await api(`/api/orders/${orderId}/handler-money-edit`, { method: "POST", body: { reason, services: [{ id: s.id, pax }] } });
      onSaved();
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      saveBtn.disabled = false;
    }
  });
  return h(
    "div",
    { class: "myjob-service" },
    h("div", { class: "myjob-service-name" }, s.name, !editable && h("span", { class: "muted" }, " (nhập tay — không sửa được ở đây)")),
    trip && h("div", { class: "muted" }, `Khởi hành: ${trip}`),
    pickup && h("div", { class: "muted" }, `Đón: ${pickup}`),
    s.note && h("div", { class: "muted" }, s.note),
    editable && h("div", { class: "myjob-counters" }, ...counters.map((c) => c.root)),
    editable && reasonInput,
    editable && errorBox,
    editable && saveBtn,
  );
}

function myAssignmentCard(a: Api.MyAssignmentDto, onChanged: () => void): HTMLElement {
  const cancelBtn = h("button", { class: "btn btn-danger", type: "button" }, "Huỷ đơn này");
  const cancelBox = h("div", { hidden: true });
  cancelBtn.addEventListener("click", () => {
    cancelBtn.hidden = true;
    const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
    let sending = false;
    const doCancel = async (reasonCode: string) => {
      if (sending) return;
      sending = true;
      showError(errorBox, null);
      try {
        await api(`/api/orders/${a.orderId}/handler-cancel`, { method: "POST", body: { reason: reasonCode } });
        onChanged();
      } catch (err) {
        showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
        sending = false;
      }
    };
    replaceChildren(
      cancelBox,
      h("p", null, "Chọn lý do huỷ:"),
      ...CANCEL_REASONS.map((r) => {
        const b = h("button", { class: "btn", type: "button" }, r.label);
        b.addEventListener("click", () => void doCancel(r.code));
        return b;
      }),
      errorBox,
    );
    cancelBox.hidden = false;
  });
  return h(
    "section",
    { class: "card myjob-card" },
    h("h3", null, a.customerName, h("span", { class: "muted" }, ` · ${a.customerPhone}`)),
    h("div", { class: "muted" }, `Mã đơn: ${a.orderCode}`),
    ...a.services.map((s) => myServiceCard(a.orderId, s, onChanged)),
    cancelBtn,
    cancelBox,
  );
}

async function initMyAssignments(): Promise<void> {
  if (!hasPermission(staff, "FIELD")) return;
  const el = byId("myjobs");
  const load = async (): Promise<void> => {
    try {
      const { assignments } = await api<Api.MyAssignmentsResponse>("/api/dispatch/mine");
      if (assignments.length === 0) replaceChildren(el, h("h2", null, "Việc của tôi"), h("p", { class: "muted" }, "Bạn chưa được giao phụ trách đơn nào."));
      else replaceChildren(el, h("h2", null, "Việc của tôi"), ...assignments.map((a) => myAssignmentCard(a, () => void load())));
      el.hidden = false;
    } catch {
      // lỗi mạng: khối ẩn, không ảnh hưởng phần còn lại trang (cùng khuôn initMaintenance)
    }
  };
  await load();
}
void initMyAssignments();
