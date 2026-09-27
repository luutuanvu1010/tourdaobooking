import { test } from "node:test";
import assert from "node:assert/strict";
import { THAY_DOI } from "./bang-tin.ts";
import type { PermissionHolder } from "./permissions.ts";
import type { DongDon, DongThuCong } from "./thong-bao.ts";
import {
  chiaLo, guiLo, hanhDongCuaThayDoi, imLang, khoaVapid, kiemDiaChi, nguoiNhanDay, taoJwtVapid, trongGioYenLang, type KhoaVapid,
} from "./web-push.ts";

test("kiemDiaChi: nhận địa chỉ thật của các dịch vụ đẩy", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com/fcm/send/abc123"), true);
  assert.equal(kiemDiaChi("https://web.push.apple.com/QAAAA"), true);
  assert.equal(kiemDiaChi("https://wns2-abc.notify.windows.com/w/?token=x"), true);
  assert.equal(kiemDiaChi("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
});

test("kiemDiaChi: từ chối giao thức không phải https", () => {
  assert.equal(kiemDiaChi("http://fcm.googleapis.com/fcm/send/abc"), false);
});

test("kiemDiaChi: từ chối host không thuộc danh sách dịch vụ đẩy", () => {
  assert.equal(kiemDiaChi("https://example.com/x"), false);
});

test("kiemDiaChi: từ chối host giả trang bằng subdomain lồng (evil.push.apple.com.example.com)", () => {
  assert.equal(kiemDiaChi("https://evil.push.apple.com.example.com/x"), false);
});

test("kiemDiaChi: từ chối mẹo userinfo (host thật nằm sau @)", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com@evil.com/x"), false);
});

test("kiemDiaChi: từ chối chuỗi dài hơn 1024 ký tự", () => {
  assert.equal(kiemDiaChi(`https://fcm.googleapis.com/${"a".repeat(1020)}`), false);
});

test("kiemDiaChi: từ chối đầu vào không phải chuỗi, không ném lỗi", () => {
  assert.equal(kiemDiaChi(undefined), false);
  assert.equal(kiemDiaChi(null), false);
  assert.equal(kiemDiaChi(123), false);
  assert.equal(kiemDiaChi({}), false);
});

test("kiemDiaChi: từ chối chuỗi không phải URL hợp lệ, không ném lỗi", () => {
  assert.equal(kiemDiaChi("không phải url"), false);
  assert.equal(kiemDiaChi(""), false);
});

// Sửa từ kiểm độc lập Task 1: cổng lạ và userinfo vẫn qua được vì chỉ đọc u.hostname; nhãn con rỗng trước hậu tố hợp lệ cũng qua.
test("kiemDiaChi: từ chối cổng khác mặc định dù host hợp lệ", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com:8443/x"), false);
  assert.equal(kiemDiaChi("https://web.push.apple.com:22/x"), false);
});

test("kiemDiaChi: chấp nhận cổng 443 tường minh (URL chuẩn hoá về mặc định, không phải cổng lạ)", () => {
  assert.equal(kiemDiaChi("https://fcm.googleapis.com:443/x"), true);
});

test("kiemDiaChi: từ chối userinfo dù host hợp lệ (user:pass@host)", () => {
  assert.equal(kiemDiaChi("https://u:p@fcm.googleapis.com/x"), false);
});

test("kiemDiaChi: từ chối nhãn con rỗng đứng trước hậu tố hợp lệ (không có máy con thật)", () => {
  assert.equal(kiemDiaChi("https://.push.apple.com/x"), false);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Task 2 — giờ yên lặng, chọn người nhận, chia lô, ký VAPID ES256, gửi một lô.
// ---------------------------------------------------------------------------------------------------------------------------------

// ADR-0039 (thay điều 4 của ADR-0036): giờ yên lặng KHÔNG còn chặn gửi cú gõ cửa — vẫn gửi như ban ngày, chỉ đổi có rung/kêu
// (`imLang`) hay không. Đổi CÓ CHỦ ĐÍCH từ bản trước ("nenGui: ngoài giờ yên lặng mà tin không quan trọng → không gửi").
test("trongGioYenLang: đúng biên 22:00–06:00 giờ VN (hai đầu)", () => {
  assert.equal(trongGioYenLang(new Date("2026-09-27T14:59:00Z")), false); // 21:59 VN → chưa yên lặng
  assert.equal(trongGioYenLang(new Date("2026-09-27T15:00:00Z")), true); // 22:00 VN → yên lặng
  assert.equal(trongGioYenLang(new Date("2026-09-27T22:59:00Z")), true); // 05:59 VN → còn yên lặng
  assert.equal(trongGioYenLang(new Date("2026-09-27T23:00:00Z")), false); // 06:00 VN → hết yên lặng
});

test("imLang (ADR-0039): tin thường im lặng trong giờ yên lặng, tin quan trọng không bao giờ im lặng", () => {
  assert.equal(imLang(false, new Date("2026-09-27T14:59:00Z")), false); // 21:59 VN, tin thường → không im lặng
  assert.equal(imLang(false, new Date("2026-09-27T15:00:00Z")), true); // 22:00 VN, tin thường → im lặng
  assert.equal(imLang(false, new Date("2026-09-27T22:59:00Z")), true); // 05:59 VN, tin thường → im lặng
  assert.equal(imLang(false, new Date("2026-09-27T23:00:00Z")), false); // 06:00 VN, tin thường → không im lặng
  assert.equal(imLang(true, new Date("2026-09-27T15:30:00Z")), false); // 22:30 VN, tin quan trọng → không bao giờ im lặng
});

test("hanhDongCuaThayDoi: đủ 9 giá trị THAY_DOI, ba giá trị (sua/chuyen/tien) trả null", () => {
  const kyVong: Record<string, string | null> = {
    tao: "created", tao_cho_nhan: "created", nhan: "order_claimed", giao: "order_handler_changed",
    xac_nhan: "confirmed", huy: "cancelled", sua: null, chuyen: null, tien: null,
  };
  assert.deepEqual([...THAY_DOI].sort(), Object.keys(kyVong).sort());
  for (const t of THAY_DOI) assert.equal(hanhDongCuaThayDoi(t), kyVong[t], t);
});

test("chiaLo: chia đều theo cỡ, phần dư ở lô cuối (81 phần tử, cỡ 40 → 40, 40, 1)", () => {
  const ds = Array.from({ length: 81 }, (_, i) => i);
  assert.deepEqual(chiaLo(ds, 40).map((x) => x.length), [40, 40, 1]);
  assert.equal(chiaLo(ds, 40).flat().length, 81);
});

const lap: PermissionHolder = { id: "lap", permissions: ["SALES"] };
const actor: PermissionHolder = { id: "actor", permissions: ["SALES"] };
const ketToan: PermissionHolder = { id: "kt", permissions: ["ACCOUNTING"] };

test("nguoiNhanDay: người lập nhận tin 'nhận đơn' của người khác; người làm (actor) không tự nhận", () => {
  const now = new Date().toISOString();
  const donNhan: DongDon = {
    id: "d1", orderId: "o1", maDon: "TD001", action: "order_claimed", actorId: actor.id, tenNguoiLam: "Actor",
    luc: now, ownerId: lap.id, phuTrach: { coNguoi: true, staffId: actor.id }, lapChuaCoNguoi: false, cungLoLap: false,
  };
  assert.deepEqual(nguoiNhanDay([lap, actor], { don: donNhan }, now), [lap.id]);
});

test("nguoiNhanDay: Kế toán chỉ có order.view (tin nằm ở 'Tất cả') không nhận cú gõ cửa", () => {
  const now = new Date().toISOString();
  const donNhan: DongDon = {
    id: "d1", orderId: "o1", maDon: "TD001", action: "order_claimed", actorId: actor.id, tenNguoiLam: "Actor",
    luc: now, ownerId: lap.id, phuTrach: { coNguoi: true, staffId: actor.id }, lapChuaCoNguoi: false, cungLoLap: false,
  };
  assert.deepEqual(nguoiNhanDay([ketToan], { don: donNhan }, now), []);
});

test("nguoiNhanDay: XÁC NHẬN đơn chưa có người phụ trách → người có dispatch.claim nhận, Kế toán không; lưu NHÁP → không ai (ADR-0045)", () => {
  const now = new Date().toISOString();
  const donChoNhan: DongDon = {
    id: "d2", orderId: "o2", maDon: "TD002", action: "confirmed", actorId: lap.id, tenNguoiLam: "Lập",
    luc: now, ownerId: lap.id, phuTrach: { coNguoi: false, staffId: null }, lapChuaCoNguoi: true, cungLoLap: false,
  };
  const nguoiCoClaim: PermissionHolder = { id: "claim1", permissions: ["ADMIN"] }; // ADMIN: dispatch.claim = any
  assert.deepEqual(nguoiNhanDay([nguoiCoClaim, ketToan], { don: donChoNhan }, now), [nguoiCoClaim.id]);
  assert.deepEqual(nguoiNhanDay([nguoiCoClaim, ketToan], { don: { ...donChoNhan, action: "created" } }, now), [], "lưu nháp không gõ cửa màn hình khoá của ai");
  // Nháp do NGƯỜI KHÁC lập hộ chủ đơn, đã chọn người phụ trách có tài khoản: cả chủ đơn lẫn người phụ trách đều KHÔNG bị gõ cửa (chỉ khi xác nhận)
  const chuDon: PermissionHolder = { id: "chu-don", permissions: ["SALES"] };
  const phuTrach: PermissionHolder = { id: "phu-trach", permissions: ["SALES"] };
  const nhapHo: DongDon = { ...donChoNhan, action: "created", ownerId: chuDon.id, actorId: "nguoi-khac", phuTrach: { coNguoi: true, staffId: phuTrach.id }, lapChuaCoNguoi: false };
  assert.deepEqual(nguoiNhanDay([chuDon, phuTrach, nguoiCoClaim], { don: nhapHo }, now), []);
  assert.deepEqual(nguoiNhanDay([chuDon, phuTrach, nguoiCoClaim], { don: { ...nhapHo, action: "confirmed" } }, now), [chuDon.id, phuTrach.id]);
});

test("nguoiNhanDay: tin thủ công nhóm quyen:PARTNER → chỉ Đối tác nhận, người gửi không tự nhận dù cùng nhóm", () => {
  const now = new Date().toISOString();
  const doiTac: PermissionHolder = { id: "doi-tac", permissions: ["PARTNER"] };
  const nguoiGui: PermissionHolder = { id: "nguoi-gui", permissions: ["PARTNER"] }; // biên: người gửi trùng nhóm nhận vẫn không tự nhận
  const tin: DongThuCong = {
    id: "t1", tieuDe: "Tin cho đối tác", noiDung: "Nội dung", quanTrong: false, nhan: ["quyen:PARTNER"],
    nguoiGuiId: nguoiGui.id, tenNguoiGui: "Người gửi", luc: now, thuHoi: false, daHieuLuc: null,
  };
  assert.deepEqual(nguoiNhanDay([doiTac, nguoiGui], { thuCong: tin }, now), [doiTac.id]);
});

test("nguoiNhanDay: tin đã thu hồi → không ai nhận", () => {
  const now = new Date().toISOString();
  const doiTac: PermissionHolder = { id: "doi-tac", permissions: ["PARTNER"] };
  const tin: DongThuCong = {
    id: "t2", tieuDe: "Tin", noiDung: "Nội dung", quanTrong: false, nhan: ["quyen:PARTNER"],
    nguoiGuiId: "ai-do", tenNguoiGui: "Ai đó", luc: now, thuHoi: true, daHieuLuc: null,
  };
  assert.deepEqual(nguoiNhanDay([doiTac], { thuCong: tin }, now), []);
});

async function sinhKhoaThu(): Promise<{ pair: CryptoKeyPair; jwkBiMat: string }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { pair, jwkBiMat: JSON.stringify(priv) };
}
const b64uDecode = (s: string): Uint8Array => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const decodeJson = (s: string): unknown => JSON.parse(new TextDecoder().decode(b64uDecode(s)));
const b64uEncode = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** Chuỗi "KHOA CONG KHAI" thật mà lệnh tạo khoá (Task 5) in ra cho một cặp khoá — dùng để test khoá KHỚP/LỆCH có thật, không giả lập. */
const congKhaiThat = async (pair: CryptoKeyPair) => b64uEncode(await crypto.subtle.exportKey("raw", pair.publicKey));

test("khoaVapid: khoá công khai KHỚP khoá bí mật → trả cặp; thiếu một trong hai → null", async () => {
  const { pair, jwkBiMat } = await sinhKhoaThu();
  const congKhai = await congKhaiThat(pair);
  assert.deepEqual(khoaVapid({ VAPID_PUBLIC_KEY: congKhai, VAPID_PRIVATE_KEY: jwkBiMat }), { congKhai, biMat: jwkBiMat });
  assert.equal(khoaVapid({}), null);
  assert.equal(khoaVapid({ VAPID_PUBLIC_KEY: congKhai }), null);
  assert.equal(khoaVapid({ VAPID_PRIVATE_KEY: jwkBiMat }), null);
});

test("khoaVapid: khoá công khai LỆCH khoá bí mật (hai cặp sinh riêng) → null, không ném (bẫy 45 — mọi lần gửi sau đó sẽ 403 nếu không bắt ở đây)", async () => {
  const a = await sinhKhoaThu();
  const b = await sinhKhoaThu();
  const congKhaiCuaB = await congKhaiThat(b.pair);
  assert.equal(khoaVapid({ VAPID_PUBLIC_KEY: congKhaiCuaB, VAPID_PRIVATE_KEY: a.jwkBiMat }), null);
});

test("khoaVapid: khoá bí mật hỏng (không phải JSON, thiếu x/y) → null, không ném", () => {
  assert.equal(khoaVapid({ VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "không phải json" }), null);
  assert.equal(khoaVapid({ VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "{}" }), null);
});

test("taoJwtVapid: 3 phần, header/claims đúng, chữ ký 64 byte, verify được bằng khoá công khai; sửa 1 ký tự → false", async () => {
  const { pair, jwkBiMat } = await sinhKhoaThu();
  const nowSec = Math.floor(Date.now() / 1000);
  const jwt = await taoJwtVapid(jwkBiMat, "https://fcm.googleapis.com", nowSec);
  const phan = jwt.split(".");
  assert.equal(phan.length, 3);
  const [h, c, s] = phan as [string, string, string];
  assert.deepEqual(decodeJson(h), { typ: "JWT", alg: "ES256" });
  assert.deepEqual(decodeJson(c), { aud: "https://fcm.googleapis.com", exp: nowSec + 12 * 3600, sub: "https://booking.tourdao.vn" });
  const chuKy = b64uDecode(s);
  assert.equal(chuKy.length, 64);
  const dungThat = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, chuKy, new TextEncoder().encode(`${h}.${c}`));
  assert.equal(dungThat, true);
  // Sửa một ký tự phần đầu (vẫn là ký tự base64url hợp lệ) → dữ liệu đã ký đổi → verify phải false.
  const hDoi = (h[0] === "e" ? "f" : "e") + h.slice(1);
  const saiChu = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, chuKy, new TextEncoder().encode(`${hDoi}.${c}`));
  assert.equal(saiChu, false);
});

test("guiLo: header vapid đúng dạng; 410 → trả về; 404/403/ném lỗi → bỏ qua không ném; ≤ 6 lời gọi cùng lúc", async () => {
  const { jwkBiMat } = await sinhKhoaThu();
  const khoa: KhoaVapid = { congKhai: "khoa-cong-khai-thu", biMat: jwkBiMat };
  const ds = Array.from({ length: 13 }, (_, i) => `https://fcm.googleapis.com/ep${i}`);
  let dangChay = 0, dinhCao = 0;
  const daGoi: { url: string; headers: Record<string, string> }[] = [];
  const goi = (async (url: string, init?: RequestInit) => {
    dangChay++; dinhCao = Math.max(dinhCao, dangChay);
    daGoi.push({ url, headers: init!.headers as Record<string, string> });
    await new Promise((r) => setTimeout(r, 5));
    dangChay--;
    if (url.endsWith("/ep3")) throw new Error("mạng lỗi");
    const ma = url.endsWith("/ep0") ? 410 : url.endsWith("/ep1") ? 404 : url.endsWith("/ep2") ? 403 : 201;
    return new Response(null, { status: ma });
  }) as unknown as typeof fetch;
  const logs: string[] = [];
  const goc = console.warn;
  console.warn = ((m: string) => { logs.push(String(m)); }) as typeof console.warn;
  let hetHieuLuc: string[];
  try {
    ({ hetHieuLuc } = await guiLo(ds, khoa, Date.now(), goi));
  } finally {
    console.warn = goc;
  }
  assert.deepEqual(hetHieuLuc, ["https://fcm.googleapis.com/ep0"]);
  assert.equal(logs.length, 3, "404, 403, ném lỗi → mỗi cái một dòng day_loi");
  for (const l of logs) assert.ok(!l.includes("fcm.googleapis.com") && !l.includes("/ep"), `log lộ địa chỉ: ${l}`);
  assert.ok(dinhCao <= 6, `đỉnh cao ${dinhCao} vượt trần 6`);
  assert.equal(daGoi.length, 13);
  for (const g of daGoi) {
    assert.ok(g.headers.Authorization?.startsWith("vapid t="), g.headers.Authorization);
    assert.ok(g.headers.Authorization?.includes("k=khoa-cong-khai-thu"));
    assert.equal(g.headers.TTL, "3600");
  }
});

test("guiLo: mỗi lời gọi có hạn giờ (signal); hết hạn → lỗi thường, không coi là 410", async () => {
  const { jwkBiMat } = await sinhKhoaThu();
  const khoa: KhoaVapid = { congKhai: "k", biMat: jwkBiMat };
  const signals: (AbortSignal | null | undefined)[] = [];
  const goi = (async (_url: string, init?: RequestInit) => {
    signals.push(init?.signal);
    throw new DOMException("hết giờ", "TimeoutError");
  }) as unknown as typeof fetch;
  const goc = console.warn;
  console.warn = () => {};
  try {
    const { hetHieuLuc } = await guiLo(["https://fcm.googleapis.com/a"], khoa, Date.now(), goi);
    assert.deepEqual(hetHieuLuc, []);
  } finally {
    console.warn = goc;
  }
  assert.ok(signals[0] instanceof AbortSignal, "fetch phải có signal hạn giờ");
});
