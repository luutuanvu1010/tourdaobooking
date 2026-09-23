const results = [];
const isStandalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const logEl = document.getElementById("log");
const log = (o) => {
  results.push({ at: new Date().toISOString(), standalone: isStandalone(), ...o });
  logEl.textContent = results.map((r) => JSON.stringify(r)).join("\n");
};
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const getChallenge = async () => fromB64u((await (await fetch("/challenge")).json()).challenge);
let pre = null;
const refill = async () => { pre = await getChallenge(); };
const flagsOf = (authData) => {
  const b = new Uint8Array(authData);
  return { up: !!(b[32] & 1), uv: !!(b[32] & 4), backupEligible: !!(b[32] & 8), backedUp: !!(b[32] & 16), signCount: new DataView(b.buffer, b.byteOffset).getUint32(33) };
};

async function create(mode) {
  try {
    const challenge = mode === "fetch" ? await getChallenge() : pre;
    const cred = await navigator.credentials.create({ publicKey: {
      challenge, rp: { id: location.hostname, name: "Thử Tour Đảo" },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "thu-nghiem", displayName: "Thử nghiệm" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
      attestation: "none", timeout: 120000,
    } });
    const r = cred.response;
    log({ action: "create", mode, ok: true, attachment: cred.authenticatorAttachment ?? null, hasGetPublicKey: typeof r.getPublicKey === "function",
      alg: r.getPublicKeyAlgorithm?.() ?? null, ...(r.getAuthenticatorData ? flagsOf(r.getAuthenticatorData()) : { authDataApi: false }) });
  } catch (e) { log({ action: "create", mode, ok: false, error: e.name, message: String(e.message).slice(0, 200) }); }
  finally { void refill(); }
}

async function get(mode) {
  try {
    const challenge = mode === "fetch" ? await getChallenge() : pre;
    const cred = await navigator.credentials.get({ publicKey: { challenge, rpId: location.hostname, userVerification: "required", allowCredentials: [], timeout: 120000 } });
    const r = cred.response;
    log({ action: "get", mode, ok: true, attachment: cred.authenticatorAttachment ?? null, userHandleBytes: r.userHandle ? r.userHandle.byteLength : null, ...flagsOf(r.authenticatorData) });
  } catch (e) { log({ action: "get", mode, ok: false, error: e.name, message: String(e.message).slice(0, 200) }); }
  finally { void refill(); }
}

const on = (id, fn) => document.getElementById(id).addEventListener("click", fn);
on("create-pre", () => create("prefetched"));
on("get-pre", () => get("prefetched"));
on("create-fetch", () => create("fetch"));
on("get-fetch", () => get("fetch"));
on("bounce", () => { location.href = "/bounce/start"; });
on("send", async () => {
  await fetch("/report", { method: "POST", body: JSON.stringify({ ua: navigator.userAgent, standalone: isStandalone(), results }) });
  log({ action: "send", ok: true });
});

const platform = await (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.() ?? Promise.resolve(false)).catch(() => false);
document.getElementById("where").textContent = `Đang ở: ${isStandalone() ? "CỬA SỔ APP CÀI" : "tab Safari"} · Face ID/Touch ID sẵn sàng: ${platform ? "có" : "không"}`;
await refill();
