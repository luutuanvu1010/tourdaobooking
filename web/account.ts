import { ApiError, api, type Api } from "./api";
import { PERMISSION_LABEL, hasPermission, isOffice } from "../src/shared/permissions";
import { vnDateTimeText, vnLocalToIso } from "../src/shared/vn-date";
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
