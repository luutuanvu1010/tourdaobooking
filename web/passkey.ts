// Gọi WebAuthn phía trình duyệt (ADR-0016). Đổi base64url ⇄ ArrayBuffer và dựng dạng JSON gửi máy chủ (không dùng toJSON() — Safari cũ không có).
import type { Api } from "./api";
import { ApiError, api } from "./api";
import { fromBase64Url, toBase64Url } from "../src/shared/encoding";
import { h } from "./dom";
// A-7: câu lỗi thuần dùng chung server/giao diện đặt ở src/shared/ để test được bằng node --test; tệp này chỉ re-export cho các trang gọi qua "./passkey".
import { passkeyErrorMessage } from "../src/shared/passkey-error";
export { passkeyErrorMessage } from "../src/shared/passkey-error";

const buf = (s: string): ArrayBuffer => fromBase64Url(s).slice().buffer;
const b64 = (b: ArrayBuffer | null): string | null => (b ? toBase64Url(new Uint8Array(b)) : null);

export const passkeySupported = (): boolean => typeof window.PublicKeyCredential === "function" && !!navigator.credentials;

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    return passkeySupported() && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Gọi NGAY trong lần chạm (không await fetch trước đó) — iPhone có thể chặn nếu không (đặc tả §2.7). */
export async function getAssertion(o: Api.PasskeyRequestOptionsResponse["publicKey"]): Promise<Api.PasskeyCredentialJson> {
  const cred = (await navigator.credentials.get({
    publicKey: { challenge: buf(o.challenge), rpId: o.rpId, timeout: o.timeout, userVerification: o.userVerification, allowCredentials: o.allowCredentials.map((c) => ({ type: c.type, id: buf(c.id) })) },
  })) as PublicKeyCredential;
  const r = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: b64(cred.rawId)!,
    type: "public-key",
    response: { clientDataJSON: b64(r.clientDataJSON)!, authenticatorData: b64(r.authenticatorData)!, signature: b64(r.signature)!, userHandle: b64(r.userHandle) },
  };
}

export async function createCredential(o: Api.PasskeyCreationOptionsResponse["publicKey"]): Promise<Api.PasskeyCredentialJson> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: buf(o.challenge),
      rp: o.rp,
      user: { id: buf(o.user.id), name: o.user.name, displayName: o.user.displayName },
      pubKeyCredParams: o.pubKeyCredParams,
      timeout: o.timeout,
      attestation: o.attestation,
      authenticatorSelection: o.authenticatorSelection,
      excludeCredentials: o.excludeCredentials.map((c) => ({ type: c.type, id: buf(c.id) })),
    },
  })) as PublicKeyCredential;
  const r = cred.response as AuthenticatorAttestationResponse;
  return { id: cred.id, rawId: b64(cred.rawId)!, type: "public-key", response: { clientDataJSON: b64(r.clientDataJSON)!, attestationObject: b64(r.attestationObject)! } };
}

// ---- D-1: luồng "bật Face ID trên máy này" hai bước, dùng chung ở lời mời sau đăng nhập PIN (login.ts) và ở trang Tôi (account.ts) ----
// Bước 1: xác nhận PIN hiện tại → xin thách thức đăng ký. Bước 2: một lần chạm RIÊNG, gọi navigator.credentials.create ngay (đặc tả §2.7).
export function enableFlow(opts: { onDone: () => void; extra?: HTMLElement[] }): HTMLElement {
  const pinInput = h("input", { id: "passkey-enable-pin", type: "password", inputmode: "numeric", pattern: "[0-9]{6}", maxlength: "6", autocomplete: "current-password" });
  const msg = h("p", { class: "muted", role: "status" });
  const go = h("button", { class: "btn btn-primary", type: "button" }, "Bật");
  const cont = h("button", { class: "btn btn-primary", type: "button", hidden: true }, "Tiếp tục với Face ID");
  let creation: Api.PasskeyCreationOptionsResponse["publicKey"] | null = null;
  go.addEventListener("click", async () => {
    msg.textContent = "";
    try {
      creation = (await api<Api.PasskeyCreationOptionsResponse>("/api/account/passkeys/options", { method: "POST", body: { pin: pinInput.value } })).publicKey;
      go.hidden = true;
      cont.hidden = false; // bước 2: lần chạm riêng gọi create ngay (đặc tả §2.7)
    } catch (err) {
      msg.textContent = err instanceof ApiError ? err.message : "Không kết nối được máy chủ.";
    }
  });
  cont.addEventListener("click", async () => {
    if (!creation) return;
    try {
      const credential = await createCredential(creation); // KHÔNG có await nào trước dòng này trong lần chạm
      await api("/api/account/passkeys", { method: "POST", body: { credential } });
      opts.onDone();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : passkeyErrorMessage(err);
      if (text) msg.textContent = text;
      cont.hidden = true;
      go.hidden = false;
    }
  });
  return h(
    "div",
    { class: "passkey-enable" },
    h("p", { class: "alert warn" }, h("strong", null, "Chỉ bật trên điện thoại riêng của bạn.")),
    h("label", null, "Nhập lại PIN để xác nhận", pinInput),
    msg,
    h("div", { class: "actions" }, go, cont, ...(opts.extra ?? [])),
  );
}
