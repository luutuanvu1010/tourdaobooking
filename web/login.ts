import { ApiError, api, safeNext } from "./api";
import { byId } from "./dom";
import { registerServiceWorker } from "./pwa";
import { showError } from "./shell";

registerServiceWorker();

const form = byId<HTMLFormElement>("login-form");
const errorEl = byId("error");
const submit = byId<HTMLButtonElement>("submit");

// Đã có phiên hợp lệ thì vào thẳng, khỏi đăng nhập lại.
const next = safeNext(new URLSearchParams(location.search).get("next"));
api("/api/auth/me").then(
  () => location.replace(next),
  () => undefined,
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  submit.disabled = true;
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: { phone: byId<HTMLInputElement>("phone").value.trim(), pin: byId<HTMLInputElement>("pin").value },
    });
    location.replace(next);
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    submit.disabled = false;
  }
});
