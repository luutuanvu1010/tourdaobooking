import { ApiError, api, safeNext, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { registerServiceWorker } from "./pwa";
import { showError } from "./shell";
import { formatReleaseLine } from "../src/shared/app-info";

registerServiceWorker();

// ---- Cloudflare Turnstile ----
// Trang KHÔNG nhúng script của Cloudflare trong HTML: chỉ tải (`api.js?render=explicit`) khi máy chủ báo có khoá site (`GET /api/auth/config`), để lúc Turnstile tắt trang không chạm tới bên thứ ba nào.
// Phần dùng của `window.turnstile` (Cloudflare tự gắn sau khi `api.js` tải xong).
interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string | undefined;
  reset(widgetId?: string): void;
}
interface TurnstileOptions {
  sitekey: string;
  theme: "auto";
  language: string;
  size: "flexible" | "compact";
  callback(token: string): void;
  "expired-callback"(): void;
  "error-callback"(code: string): boolean | void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_LOAD_TIMEOUT_MS = 15_000;
/** Chờ cấu hình tối đa từng ấy rồi cho đăng nhập như không có widget: API cấu hình chậm không được giữ khoá nút Đăng nhập. Cấu hình về muộn hơn thì widget vẫn được dựng (và khoá nút) lúc đó. */
const CONFIG_WAIT_MS = 3_000;
/** Bề rộng tối thiểu của widget cỡ "flexible" (theo Cloudflare); hẹp hơn thì dùng cỡ "compact" để không tràn ngang. */
const FLEXIBLE_MIN_WIDTH = 300;

const form = byId<HTMLFormElement>("login-form");
const errorEl = byId("error");
const submit = byId<HTMLButtonElement>("submit");
// Id KHÔNG được là "turnstile": phần tử có id trở thành thuộc tính `window.<id>`, che mất `window.turnstile` của Cloudflare (và làm `if (window.turnstile)` đúng khi script chưa tải).
const widgetBox = byId("turnstile-widget");
const retryBtn = byId<HTMLButtonElement>("turnstile-retry");
const companyEl = byId("company");

// Đã có phiên hợp lệ thì vào thẳng, khỏi đăng nhập lại.
const next = safeNext(new URLSearchParams(location.search).get("next"));
api("/api/auth/me").then(
  () => location.replace(next),
  () => undefined,
);

// ---- Nút Đăng nhập: khoá khi chưa biết cấu hình, khi đang gửi, và (khi widget bật) tới khi widget có token ----
let ready = false; // đã biết máy chủ có bật Turnstile hay không (hoặc đã quá hạn chờ)
let busy = false; // đang gửi yêu cầu đăng nhập
let siteKey: string | null = null; // khác null ⇔ máy chủ bật Turnstile
let widgetId: string | null = null;
let token: string | null = null; // token của widget; dùng MỘT lần (mỗi lần đăng nhập thất bại phải reset để lấy token mới)
let widgetProblem = false; // #error đang hiện lỗi CỦA WIDGET (không phải lỗi đăng nhập của máy chủ)

function syncSubmit(): void {
  submit.disabled = busy || !ready || (siteKey !== null && token === null);
}
syncSubmit();

function showWidgetProblem(message: string): void {
  widgetProblem = true;
  showError(errorEl, message);
  retryBtn.hidden = false;
  syncSubmit();
}
function clearWidgetProblem(): void {
  if (!widgetProblem) return;
  widgetProblem = false;
  showError(errorEl, null);
  retryBtn.hidden = true;
}

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = h("script", { src: TURNSTILE_SRC });
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = null; // lần "Thử lại" sau tải lại từ đầu
      reject(new Error("turnstile_load_failed"));
    };
    const timer = setTimeout(fail, TURNSTILE_LOAD_TIMEOUT_MS);
    script.addEventListener("load", () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    });
    script.addEventListener("error", fail);
    document.head.append(script);
  });
  return loading;
}

async function mountWidget(): Promise<void> {
  if (siteKey === null) return;
  const key = siteKey;
  widgetBox.hidden = false; // giữ chỗ ngay (chiều cao cố định) để widget dựng xong không đẩy nút Đăng nhập xuống
  try {
    const turnstile = await loadTurnstile(); // `render` được gọi SAU sự kiện load của script, nên không dùng `turnstile.ready()` (nó ném lỗi khi script tải với async/defer)
    if (widgetId !== null) {
      turnstile.reset(widgetId);
      return;
    }
    const id = turnstile.render(widgetBox, {
      sitekey: key,
      theme: "auto", // theo hệ thống
      language: "vi-vn", // chữ trong widget bằng tiếng Việt, không theo ngôn ngữ trình duyệt
      size: widgetBox.clientWidth >= FLEXIBLE_MIN_WIDTH ? "flexible" : "compact",
      callback: (t) => {
        token = t;
        clearWidgetProblem();
        syncSubmit();
      },
      "expired-callback": () => {
        token = null; // hết hạn (300 giây không dùng): widget tự lấy token mới rồi gọi lại `callback`
        syncSubmit();
      },
      "error-callback": () => {
        token = null;
        showWidgetProblem("Bước xác minh người thật gặp sự cố. Bấm “Thử lại”; nếu vẫn lỗi, hãy tải lại trang.");
        return true; // đã xử lý: Cloudflare khỏi ghi lỗi ra console
      },
    });
    if (!id) throw new Error("turnstile_render_failed");
    widgetId = id;
  } catch (err) {
    console.warn("Không dựng được widget Turnstile:", err); // nguyên nhân thật (script bị chặn, render ném lỗi…) không bị nuốt mất
    if (widgetId === null) widgetBox.hidden = true; // chưa có widget nào: trả lại khoảng giữ chỗ (bấm "Thử lại" sẽ hiện lại)
    showWidgetProblem("Chưa tải được bước xác minh người thật. Kiểm tra kết nối mạng rồi bấm “Thử lại”.");
  }
}

/** Token đã dùng hoặc hết tác dụng: bỏ và xin widget một token mới. */
function resetWidget(): void {
  token = null;
  if (widgetId !== null) window.turnstile?.reset(widgetId);
}

retryBtn.addEventListener("click", () => {
  clearWidgetProblem();
  token = null;
  void mountWidget();
});

async function start(): Promise<void> {
  const failsafe = setTimeout(() => {
    ready = true;
    syncSubmit();
  }, CONFIG_WAIT_MS);
  try {
    siteKey = (await api<Api.AuthConfigResponse>("/api/auth/config")).turnstileSiteKey;
  } catch {
    siteKey = null; // không lấy được cấu hình: coi như không có widget (nếu máy chủ vẫn đòi token thì thông báo lỗi của máy chủ hiện ra khi đăng nhập)
  }
  clearTimeout(failsafe);
  ready = true;
  syncSubmit();
  if (siteKey !== null) await mountWidget();
}
void start();

// ---- Chân trang: dòng phiên bản (hằng trong mã) và thông tin công ty (GET /api/company; lỗi/chậm thì khối ẩn, KHÔNG chặn đăng nhập) ----
byId("release").textContent = formatReleaseLine();
async function showCompany(): Promise<void> {
  try {
    const { company } = await api<Api.CompanyResponse>("/api/company");
    if (!company.name) return;
    replaceChildren(
      companyEl,
      h("p", { class: "login-company-name" }, company.name),
      company.address && h("p", null, `Địa chỉ: ${company.address}`),
      company.email && h("p", null, `Email: ${company.email}`),
      company.taxCode && h("p", null, `MST: ${company.taxCode}`),
    );
    companyEl.hidden = false;
  } catch {
    // giữ khối ẩn
  }
}
void showCompany();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submit.disabled) return; // Enter trong ô gõ: không gửi khi đang chờ token hoặc đang gửi
  clearWidgetProblem();
  showError(errorEl, null);
  busy = true;
  syncSubmit();
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: { phone: byId<HTMLInputElement>("phone").value.trim(), pin: byId<HTMLInputElement>("pin").value, turnstileToken: token ?? undefined },
    });
    location.replace(next);
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    busy = false;
    resetWidget(); // MỌI lần thất bại (kể cả sai PIN): máy chủ đã kiểm và đốt token ở bước Turnstile trước khi kiểm PIN, token cũ không dùng lại được
    syncSubmit();
  }
});
