import { ApiError, api, safeNext, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { registerServiceWorker } from "./pwa";
import { showError } from "./shell";
import { APP_RELEASE_DATE, APP_VERSION } from "./phien-ban";
import { chanTrangCongTy } from "../src/shared/cong-ty-chu";
import { MAINTENANCE_CODE } from "../src/shared/maintenance";
import { SESSION_ENDED_KEY, parseSessionEnded, sessionEndedMessage } from "../src/shared/session-ended";
import { endsAtFrom, renderMaintenanceMessage } from "./maintenance-screen";
import { icon } from "./icons";
import { xoaKhungNho } from "./khung-nho";
import { KHOA_GAN_PHIEN_THONG_BAO } from "./push-ui";
import { datCoTuMo } from "./tro-ly-co";
import { enableFlow, getAssertion, passkeyErrorMessage, passkeySupported, platformAuthenticatorAvailable } from "./passkey";

registerServiceWorker();
// ADR-0035: màn đăng nhập = có thể là người KHÁC sắp dùng máy này → bỏ bản nhớ khung của phiên trước (không để thoáng hiện chữ cái tên/menu của họ).
xoaKhungNho();

// ---- Cloudflare Turnstile ----
// Trang KHÔNG nhúng script của Cloudflare trong HTML: chỉ tải (`api.js?render=explicit`) khi máy chủ báo có khoá site (`GET /api/auth/config`), để lúc Turnstile tắt trang không chạm tới bên thứ ba nào.
// Phần dùng của `window.turnstile` (Cloudflare tự gắn sau khi `api.js` tải xong).
interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string | undefined;
  reset(widgetId?: string): void;
}
interface TurnstileOptions {
  sitekey: string;
  /** App chỉ có giao diện sáng (không có chế độ tối) nên widget luôn sáng — "auto" cho ra widget tối trên thẻ trắng khi điện thoại bật chế độ tối. */
  theme: "light";
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
/**
 * Hỏi lại cấu hình khi lần hỏi lúc mở trang LỖI (mạng chập chờn): cách nhau từng ấy mili giây, có hạn, chạy NỀN (không giữ nút Đăng nhập). Không có việc này thì `siteKey` kẹt ở null và — khi máy chủ đã bật
 * Turnstile — mọi lần đăng nhập đều 403 mãi; PWA trên iPhone lại không có nút tải lại của trình duyệt.
 */
const OPEN_RETRY_DELAYS_MS = [1_500, 4_000] as const;
/** Sau một lần đăng nhập bị máy chủ từ chối vì thiếu/không xác minh được token mà trang chưa có khoá site: hỏi lại ngay rồi giãn cách, có hạn. */
const AFTER_REJECT_RETRY_DELAYS_MS = [0, 2_000, 4_000] as const;
/** Mã lỗi máy chủ trả khi đòi Turnstile mà trang không gửi token hợp lệ (src/modules/auth/turnstile.ts). */
const TURNSTILE_REJECT_CODES: ReadonlySet<string> = new Set(["turnstile_failed", "turnstile_unavailable"]);

const form = byId<HTMLFormElement>("login-form");
const errorEl = byId("error");
const submit = byId<HTMLButtonElement>("submit");
// Id KHÔNG được là "turnstile": phần tử có id trở thành thuộc tính `window.<id>`, che mất `window.turnstile` của Cloudflare (và làm `if (window.turnstile)` đúng khi script chưa tải).
const widgetBox = byId("turnstile-widget");
const retryBtn = byId<HTMLButtonElement>("turnstile-retry");
// Tuỳ chọn có chủ ý: service worker làm mới HTML và JS riêng rẽ, HTML cũ trong cache đi với login.js mới không được làm chết trang đăng nhập (byId ném lỗi khi thiếu).
const maintenanceEl = document.getElementById("maintenance-banner");
const maintenanceText = document.getElementById("maintenance-text");
// Đăng nhập bằng Face ID (ADR-0016): tuỳ chọn cùng lý do trên — HTML cũ trong cache có thể chưa có các phần tử này.
const passkeyBtn = document.getElementById("passkey-login") as HTMLButtonElement | null;
const hintEl = document.getElementById("passkey-hint");
// Bản "Đăng nhập v2": dòng "Quên PIN?", nút Hiện/Ẩn PIN, ô email ở chân trang — đều tuỳ chọn cùng lý do trên. `passkey-block` chỉ có ở HTML v2 đời đầu (nút Face ID đứng riêng trên form): còn trong cache thì vẫn phải ẩn khi hiện lời mời.
const passkeyBlock = document.getElementById("passkey-block");
const forgotEl = document.getElementById("forgot");
const pinToggle = document.getElementById("pin-toggle") as HTMLButtonElement | null;
// Bản thiết kế "Đăng nhập.dc.html" (chủ dự án yêu cầu tuân thủ 100%, 2026-09-24): bộ đếm PIN "n/6" và nhãn nút lúc đang gửi — tuỳ chọn cùng lý do trên.
const pinCount = document.getElementById("pin-count");
const submitLabel = document.getElementById("submit-label");
const phoneInput = byId<HTMLInputElement>("phone");
const pinInput = byId<HTMLInputElement>("pin");

// Biểu tượng (aria-hidden trong icon()): khuôn mặt là nội dung DUY NHẤT của nút Face ID đặt cạnh nút Đăng nhập (tên nút ở aria-label trong HTML).
passkeyBtn?.prepend(icon("face", 26));

// ---- Ô gõ theo bản thiết kế: SĐT chỉ nhận chữ số và dấu cách (tối đa 13 ký tự), PIN chỉ chữ số (tối đa 6); bộ đếm "n/6";
// nút Đăng nhập chỉ bấm được khi đủ (SĐT ≥ 10 chữ số, PIN đủ 6 số); sửa ô thì ẩn lỗi đăng nhập cũ. Máy chủ vẫn kiểm lại (normalizePhone, isValidPin).
function filterInput(el: HTMLInputElement, allowed: RegExp, max: number): void {
  const clean = el.value.replace(allowed, "").slice(0, max);
  if (clean !== el.value) el.value = clean;
}
const inputsValid = (): boolean => phoneInput.value.replace(/\D/g, "").length >= 10 && /^\d{6}$/.test(pinInput.value);
function onFieldsChanged(): void {
  if (pinCount) pinCount.textContent = `${pinInput.value.length}/6`;
  syncSubmit();
}
for (const [el, allowed, max] of [[phoneInput, /[^\d\s]/g, 13], [pinInput, /\D/g, 6]] as const) {
  // `change` cũng nghe: trình điền mật khẩu (iOS/Chrome) có thể đặt giá trị mà không phát `input`.
  for (const type of ["input", "change"]) {
    el.addEventListener(type, () => {
      filterInput(el, allowed, max);
      if (!widgetProblem && !busy) showError(errorEl, null);
      onFieldsChanged();
    });
  }
}

// ---- Nút Hiện/Ẩn mã PIN (chỉ đổi kiểu ô gõ; không đụng giá trị) ----
pinToggle?.addEventListener("click", () => {
  const pin = byId<HTMLInputElement>("pin");
  const show = pin.type === "password";
  pin.type = show ? "text" : "password";
  pinToggle.textContent = show ? "Ẩn" : "Hiện";
  pinToggle.setAttribute("aria-pressed", String(show));
  pinToggle.setAttribute("aria-label", show ? "Ẩn mã PIN" : "Hiện mã PIN");
});

// ADR-0075 điều 6b: mở trang đăng nhập = phiên sắp đổi → xoá cờ để trang đầu tiên sau đăng nhập gắn lại đăng ký thông báo của máy này với phiên mới
// (một chỗ duy nhất, không phải mỗi nhánh thành công — PIN, Face ID, bật Face ID…). sessionStorage bị chặn → bỏ qua.
try {
  sessionStorage.removeItem(KHOA_GAN_PHIEN_THONG_BAO);
} catch {
  // bỏ qua
}

// ---- Lời báo "vì sao vừa bị đăng xuất" (ADR-0075) ----
// web/api.ts lưu lý do vào sessionStorage trước khi đưa về đây (chỉ khi máy chủ nhận ra phiên cũ). Đọc MỘT lần rồi xoá để tải lại trang không báo lại. Mọi lỗi (sessionStorage bị chặn) bị nuốt.
(function hienLyDoDangXuat(): void {
  try {
    const raw = sessionStorage.getItem(SESSION_ENDED_KEY);
    if (raw === null) return;
    sessionStorage.removeItem(SESSION_ENDED_KEY);
    const notice = parseSessionEnded(JSON.parse(raw));
    const box = document.getElementById("session-ended-banner");
    const text = document.getElementById("session-ended-text");
    if (!notice || !box || !text) return;
    text.textContent = sessionEndedMessage(notice);
    box.hidden = false;
  } catch {
    // bỏ qua
  }
})();

// ---- Banner chế độ bảo trì ----
// Chỉ HIỂN THỊ (máy chủ mới là nơi chặn): thông điệp + đồng hồ đếm ngược sống, dùng chung với lớp phủ ở web/maintenance-screen.ts. Không che form vì chủ dự án vẫn phải đăng nhập được.
let stopMaintenance: (() => void) | null = null;
function setMaintenance(on: boolean, endsAt: string | null): void {
  stopMaintenance?.();
  // Đồng hồ về 0 = máy chủ đã tự tắt chế độ bảo trì (stateFromRow) → ẩn banner, mọi người đăng nhập lại được mà không phải tải lại trang.
  stopMaintenance = on && maintenanceText ? renderMaintenanceMessage(maintenanceText, endsAt, () => setMaintenance(false, null)) : null;
  if (maintenanceEl) maintenanceEl.hidden = !on;
}
/** Dùng CHUNG cho lỗi bảo trì của cả nút Đăng nhập (PIN) và nút Face ID: cập nhật banner, không hiện lỗi chung ở #error. */
function showMaintenanceBanner(err: ApiError): void {
  showError(errorEl, null);
  setMaintenance(true, endsAtFrom(err.details));
  maintenanceEl?.scrollIntoView({ block: "nearest" });
}

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

// ---- Đăng nhập bằng Face ID (ADR-0016) ----
let passkeyEnabled = false; // true ⇔ máy chủ báo passkey = true (đọc trong fetchConfig, chỉ bật một lần — B-15)
let prefetched: { opts: Api.PasskeyRequestOptionsResponse["publicKey"]; at: number } | null = null;
const PREFETCH_TTL_MS = 4 * 60_000; // thách thức có hạn ở máy chủ; lấy lại nếu để quá lâu không chạm nút

/** Lấy sẵn thách thức Face ID để chạm nút là gọi navigator.credentials.get NGAY (đặc tả §2.7), không phải chờ một lượt fetch trước. */
async function prefetchPasskey(): Promise<void> {
  try {
    const r = await api<Api.PasskeyRequestOptionsResponse>("/api/auth/passkey/options", { method: "POST", body: {} });
    prefetched = { opts: r.publicKey, at: Date.now() };
  } catch {
    prefetched = null;
  }
}

passkeyBtn?.addEventListener("click", async () => {
  showError(errorEl, null);
  if (hintEl) hintEl.hidden = true;
  const p = prefetched;
  if (!p || Date.now() - p.at > PREFETCH_TTL_MS) {
    await prefetchPasskey();
    if (hintEl) {
      hintEl.textContent = "Bấm lại nút Face ID.";
      hintEl.hidden = false;
    }
    return;
  }
  prefetched = null;
  try {
    const credential = await getAssertion(p.opts); // KHÔNG có await nào trước dòng này trong lần chạm
    const me = await api<Api.MeResponse>("/api/auth/passkey/login", { method: "POST", body: { credential } });
    datCoTuMo(); // ADR-0066 điều 9: khung Hỗ trợ tự mở MỘT lần ở trang đầu tiên sau đăng nhập
    if (await shouldInvite(me.staff.id)) return showInvite(me.staff.id);
    location.replace(next);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === MAINTENANCE_CODE) showMaintenanceBanner(err);
      else showError(errorEl, err.message);
    } else {
      const msg = passkeyErrorMessage(err);
      if (msg) showError(errorEl, msg);
    }
    void prefetchPasskey();
  }
});

// ---- Lời mời bật Face ID sau khi đăng nhập bằng PIN thành công ----
const INVITE_OFF = (id: string) => `td_passkey_invite_off:${id}`;
async function shouldInvite(staffId: string): Promise<boolean> {
  if (!passkeyEnabled || !(await platformAuthenticatorAvailable())) return false;
  try {
    if (localStorage.getItem(INVITE_OFF(staffId))) return false;
  } catch {
    // không có bộ nhớ (chế độ riêng tư…): vẫn mời, không chặn vì thiếu tiện ích này
  }
  try {
    return (await api<Api.PasskeyListResponse>("/api/account/passkeys")).passkeys.length === 0;
  } catch {
    return false;
  }
}
function showInvite(staffId: string): void {
  const later = h("button", { class: "btn", type: "button" }, "Để sau");
  later.addEventListener("click", () => {
    try {
      localStorage.setItem(INVITE_OFF(staffId), "1");
    } catch {
      // bỏ qua: chỉ là tiện ích nhớ lựa chọn, không chặn tiếp tục
    }
    location.replace(next);
  });
  const flow = enableFlow({ onDone: () => location.replace(next), extra: [later] });
  const box = document.getElementById("passkey-invite");
  if (!box) return location.replace(next); // HTML cũ trong cache chưa có khối này (Tuỳ chọn có chủ ý, xem khai báo passkeyBtn ở trên)
  form.hidden = true;
  if (passkeyBlock) passkeyBlock.hidden = true; // (HTML v2 đời đầu trong cache: nút Face ID nằm NGOÀI form, không được đứng trên lời mời)
  if (forgotEl) forgotEl.hidden = true;
  replaceChildren(box, h("h2", null, "Bật đăng nhập bằng Face ID?"), h("p", null, "Lần sau chỉ cần nhìn vào máy là vào được app, không phải gõ PIN."), flow);
  box.hidden = false;
}

function syncSubmit(): void {
  submit.disabled = busy || !ready || (siteKey !== null && token === null) || !inputsValid();
  // Đang gửi: vòng quay + "Đang đăng nhập…" (bản thiết kế); CSS hiện vòng quay theo class.
  submit.classList.toggle("is-loading", busy);
  if (submitLabel) submitLabel.textContent = busy ? "Đang đăng nhập…" : "Đăng nhập";
}
onFieldsChanged(); // giá trị trình duyệt điền sẵn trước khi JS chạy

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

/** Chữ trong khung giữ chỗ lúc chờ nạp script (tới 15 giây): không có nó, khung trống và nút Đăng nhập khoá mà không ai biết vì sao. Một đoạn `<p>` (không phải `<div>`: widget của Cloudflare là `<div>` con của khung). */
function showWidgetWaiting(): void {
  replaceChildren(widgetBox, h("p", { class: "login-turnstile-wait", role: "status" }, "Đang tải xác minh…"));
}
const clearWidgetWaiting = (): void => widgetBox.querySelector(".login-turnstile-wait")?.remove();

async function mountWidget(): Promise<void> {
  if (siteKey === null) return;
  const key = siteKey;
  widgetBox.hidden = false; // giữ chỗ ngay (chiều cao cố định) để widget dựng xong không đẩy nút Đăng nhập xuống
  if (widgetId === null) showWidgetWaiting(); // (lần "Thử lại" khi widget đã có thì chỉ reset, không có gì để chờ)
  try {
    const turnstile = await loadTurnstile(); // `render` được gọi SAU sự kiện load của script, nên không dùng `turnstile.ready()` (nó ném lỗi khi script tải với async/defer)
    if (widgetId !== null) {
      turnstile.reset(widgetId);
      return;
    }
    clearWidgetWaiting(); // trước `render`: widget dựng vào khung này
    const id = turnstile.render(widgetBox, {
      sitekey: key,
      theme: "light",
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
      "error-callback": (code) => {
        token = null;
        // Trả `true` = "đã xử lý" thì Cloudflare KHÔNG ghi lỗi ra console → mã lỗi (vd 110200 khoá sai tên miền) mất, khó chẩn đoán lần deploy khoá thật đầu tiên. Tự ghi lại (chỉ mã, không có bí mật).
        console.warn("Turnstile báo lỗi, mã:", typeof code === "string" ? code.slice(0, 32) : "không rõ");
        showWidgetProblem("Bước xác minh người thật gặp sự cố. Bấm “Thử lại”; nếu vẫn lỗi, hãy tải lại trang.");
        return true; // đã xử lý
      },
    });
    if (!id) throw new Error("turnstile_render_failed");
    widgetId = id;
  } catch (err) {
    console.warn("Không dựng được widget Turnstile:", err); // nguyên nhân thật (script bị chặn, render ném lỗi…) không bị nuốt mất
    clearWidgetWaiting();
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

// ---- Cấu hình (GET /api/auth/config) ----
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ADR-0024 6.2: tên + MST ở chân trang lấy từ cấu hình (hồ sơ công ty chủ); thiếu/sai → GIỮ chữ tĩnh của public/login.html (dự phòng khi chưa tải xong, lỗi
 * mạng, bản máy chủ cũ). Không ném lỗi: `login.html` cũ trong bộ nhớ đệm có thể chưa có #company-name/#company-tax (không dùng byId — nó ném lỗi khi thiếu).
 */
function apDungChanTrang(config: unknown): void {
  const c = chanTrangCongTy(config);
  const ten = document.getElementById("company-name");
  const mst = document.getElementById("company-tax");
  if (!c || !ten || !mst) return;
  ten.textContent = c.ten;
  mst.textContent = c.mst;
}

/** Hỏi cấu hình một lần: true = đã có câu trả lời của máy chủ (có khoá hoặc `null`); false = lỗi (mất mạng, 5xx…). */
async function fetchConfig(): Promise<boolean> {
  try {
    const config = await api<Api.AuthConfigResponse>("/api/auth/config");
    siteKey = config.turnstileSiteKey;
    setMaintenance(config.maintenance?.on === true, config.maintenance?.endsAt ?? null); // (`?.`: bản máy chủ cũ hơn chưa có trường này)
    // B-15: fetchConfig chạy NHIỀU LẦN (start, recoverConfig) — chỉ bật nút/prefetch một lần duy nhất bằng cờ passkeyEnabled.
    if (config.passkey === true && !passkeyEnabled) {
      passkeyEnabled = true;
      if (passkeyBtn && passkeySupported()) {
        passkeyBtn.hidden = false;
        void prefetchPasskey();
      }
    }
    apDungChanTrang(config); // CUỐI khối: chân trang không bao giờ được làm hỏng cấu hình đăng nhập (Ruling T4 của nhật ký thi công T2b)
    return true;
  } catch {
    return false; // `siteKey` giữ nguyên (null nếu chưa từng biết)
  }
}

let recovering: Promise<void> | null = null;
/**
 * Hỏi lại cấu hình theo `delays` (mili giây chờ trước mỗi lần) tới khi máy chủ trả lời; có khoá thì khoá nút tới khi có token và dựng widget. Chạy NỀN, tối đa `delays.length` lần, và chỉ một vòng
 * cùng lúc (đang chạy thì các lời gọi khác bỏ qua): cấu hình hỏng liên tục không tạo ra vòng lặp vô hạn hay bão yêu cầu. Không đụng tới nút Đăng nhập trong lúc chờ.
 */
function recoverConfig(delays: readonly number[]): Promise<void> {
  recovering ??= (async () => {
    for (const wait of delays) {
      if (wait > 0) await sleep(wait);
      if (!(await fetchConfig())) continue;
      ready = true;
      syncSubmit(); // có khoá site → nút khoá tới khi widget có token
      if (siteKey !== null) await mountWidget();
      return;
    }
  })().finally(() => {
    recovering = null;
  });
  return recovering;
}

async function start(): Promise<void> {
  const failsafe = setTimeout(() => {
    ready = true;
    syncSubmit();
  }, CONFIG_WAIT_MS);
  const answered = await fetchConfig(); // lỗi: coi như không có widget để nút không bị giữ (nếu máy chủ vẫn đòi token thì lỗi của máy chủ hiện ra khi đăng nhập) — rồi hỏi lại ở nền
  clearTimeout(failsafe);
  ready = true;
  syncSubmit();
  if (siteKey !== null) await mountWidget();
  else if (!answered) void recoverConfig(OPEN_RETRY_DELAYS_MS);
}
void start();

// ---- Dòng phiên bản theo bản thiết kế: "Phiên bản V1.5 · ngày 24/9/2026" — số và ngày lấy từ nhật ký thay đổi (không viết tay). ----
// Chân trang giữ hình thức bản thiết kế: tên · MST đọc từ GET /api/auth/config (apDungChanTrang — hồ sơ công ty chủ, ADR-0024 6.2), địa chỉ là chữ tĩnh;
// trang vẫn KHÔNG gọi GET /api/company (không thêm yêu cầu mạng).
function releaseText(version: string, isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `Phiên bản V${version} · ngày ${d}/${m}/${y}`;
}
byId("release").textContent = releaseText(APP_VERSION, APP_RELEASE_DATE);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submit.disabled) return; // Enter trong ô gõ: không gửi khi đang chờ token hoặc đang gửi
  clearWidgetProblem();
  showError(errorEl, null);
  busy = true;
  syncSubmit();
  try {
    const me = await api<Api.MeResponse>("/api/auth/login", {
      method: "POST",
      body: { phone: phoneInput.value.trim(), pin: pinInput.value, turnstileToken: token ?? undefined },
    });
    datCoTuMo(); // ADR-0066 điều 9: khung Hỗ trợ tự mở MỘT lần ở trang đầu tiên sau đăng nhập
    if (await shouldInvite(me.staff.id)) return showInvite(me.staff.id);
    location.replace(next);
  } catch (err) {
    // Đang bảo trì và SĐT này không được phép: cập nhật banner (không hiện lỗi chung). Mã này KHÁC `turnstile_unavailable` (cũng 503) nên không đi vào nhánh hỏi lại cấu hình bên dưới.
    if (err instanceof ApiError && err.code === MAINTENANCE_CODE) showMaintenanceBanner(err);
    else showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    busy = false;
    // Sai SĐT/PIN (401): xoá PIN để gõ lại (bản thiết kế). Lỗi khác (bảo trì, xác minh, mạng) giữ nguyên để bấm lại.
    if (err instanceof ApiError && err.status === 401) {
      pinInput.value = "";
      onFieldsChanged();
    }
    resetWidget(); // MỌI lần thất bại (kể cả sai PIN): máy chủ đã kiểm và đốt token ở bước Turnstile trước khi kiểm PIN, token cũ không dùng lại được
    syncSubmit();
    // Máy chủ đòi xác minh mà trang chưa có khoá site (lần hỏi cấu hình lúc mở trang lỗi): lấy lại cấu hình rồi dựng widget, thay vì để người dùng bị 403 mãi.
    if (err instanceof ApiError && siteKey === null && TURNSTILE_REJECT_CODES.has(err.code)) void recoverConfig(AFTER_REJECT_RETRY_DELAYS_MS);
  }
});
