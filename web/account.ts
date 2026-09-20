import { ApiError, api } from "./api";
import { PERMISSION_LABEL, hasPermission, isOffice } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { icon } from "./icons";
import { initShell, logout, showError } from "./shell";

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
replaceChildren(
  byId("links"),
  isOffice(staff) && h("a", { class: "row-link", href: "/parties" }, "Hồ sơ", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/locations" }, "Địa điểm", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/audit" }, "Nhật ký", icon("next", 20)),
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
