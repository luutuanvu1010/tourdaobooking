// HÀNG RÀO HẠNG DỮ LIỆU CÁ NHÂN (Hiến chương 5.20; lát H-0 Gói 2): MỌI cột của MỌI bảng và view trong schema thật (dựng từ migrations/*.sql bằng node:sqlite)
// có ĐÚNG một hạng N0–N4 ở docs/data-dictionary.json (khoá `hangDuLieu`) và ngược lại — cột mới chưa có hạng ⇒ đỏ.
// Hai lưới chống "gắn đại N1": (1) cột có tên mang dạng dữ liệu người (SĐT, email, tên, địa chỉ, ngày sinh, IP, số giấy tờ, bí mật) phải ≥ N2, trừ NGOAI_LE_TEN có
// lý do; (2) tập N3 và tập N4 ghim nguyên văn — hạ hạng một cột giấy tờ / bí mật ⇒ đỏ; thêm cột N3/N4 ⇒ sửa bài có chủ đích (và Task 2: COT_N3_NHAT_KY, PHU_TRACH).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const HANG = ["N0", "N1", "N2", "N3", "N4"] as const;
type Hang = (typeof HANG)[number];
const THU_BAC: Record<Hang, number> = { N0: 0, N1: 1, N2: 2, N3: 3, N4: 4 };
const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { hangDuLieu?: Record<string, Record<string, string>> };

function schema(): Map<string, string[]> {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const out = new Map<string, string[]>();
  const ten = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  for (const { name } of ten) out.set(name, (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name));
  return out;
}
const SCHEMA = schema();
function hangCua(): Map<string, Hang> {
  const m = new Map<string, Hang>();
  for (const [obj, cot] of Object.entries(dict.hangDuLieu ?? {})) for (const [c, h] of Object.entries(cot)) m.set(`${obj}.${c}`, h as Hang);
  return m;
}

/** Tên cột mang dạng dữ liệu người. Không gồm `token` (tl_luot_hoi.token_vao… là số đếm token của trợ lý, không phải bí mật). */
const MAU_TEN_NGUOI = /(^|_)(phone|phones|email|ip|user_agent|birth|full_name|family_name|middle_name|given_name|display_name|address|document_number|number_key|pin|secret|hash)($|_)|^customer_/;
/** Cột khớp mẫu nhưng KHÔNG phải dữ liệu về con người — mỗi mục một lý do. Thêm mục = quyết định có chủ đích. */
const NGOAI_LE_TEN: Record<string, string> = {
  "company_profile.address": "cột chết của bảng công ty cũ — dữ liệu công ty, không phải người",
  "company_profile.email": "cột chết của bảng công ty cũ — dữ liệu công ty, không phải người",
  "loc_location.address": "địa chỉ NƠI CHỐN (văn phòng, bến, khách sạn) — ADR-0105",
  "v_loc_location_dia_chi.address": "view chiếu lại loc_location.address — địa chỉ nơi chốn",
  "vc_dispatch_policy.office_phone": "số điện thoại văn phòng công ty",
  "vc_vehicle_document.document_number": "số giấy tờ XE — ADR-0040 D2 chỉ coi giấy tờ của người là dữ liệu cá nhân",
};
const N3_GHIM = [
  "pty_attachment.content_hash", "pty_attachment.storage_key",
  "pty_organization_document.document_number", "pty_organization_document.issued_place", "pty_organization_document.number_key",
  "pty_person_document.document_number", "pty_person_document.issued_place", "pty_person_document.number_key",
  "pty_self_submission.document_number", "pty_self_submission.issued_place", "pty_self_submission.number_key",
];
const N4_GHIM = ["aut_mfa_email_code.code_hash", "aut_mfa_factor.secret_enc", "aut_mfa_recovery_code.code_hash", "aut_trusted_device.token_hash", "staff.pin_hash"];

test("5.20: mọi cột của mọi bảng và view có đúng một hạng N0–N4; sổ không thừa đối tượng / cột đã mất", () => {
  assert.ok(dict.hangDuLieu, "docs/data-dictionary.json thiếu khoá hangDuLieu (Hiến chương 5.20)");
  const h = hangCua();
  const thieu: string[] = [];
  for (const [obj, cols] of SCHEMA) for (const c of cols) if (!h.has(`${obj}.${c}`)) thieu.push(`${obj}.${c}`);
  assert.deepEqual(thieu, [], "cột chưa có hạng — thêm vào hangDuLieu (công thức z19 của docs/CHANGE-GUIDE.md)");
  const thua = [...h.keys()].filter((k) => {
    const [obj, c] = k.split(".");
    return !SCHEMA.get(obj!)?.includes(c!);
  });
  assert.deepEqual(thua, [], "hạng của cột / đối tượng không còn trong schema");
  const sai = [...h.entries()].filter(([, x]) => !(HANG as readonly string[]).includes(x)).map(([k, x]) => `${k}=${x}`);
  assert.deepEqual(sai, [], "hạng chỉ nhận N0, N1, N2, N3, N4");
});

test("5.20: cột có tên mang dạng dữ liệu người không dưới N2 (trừ ngoại lệ có lý do); ngoại lệ không thừa", () => {
  const h = hangCua();
  const khop = [...h.keys()].filter((k) => MAU_TEN_NGUOI.test(k.split(".")[1]!));
  const thap = khop.filter((k) => !(k in NGOAI_LE_TEN) && THU_BAC[h.get(k)!] < 2);
  assert.deepEqual(thap, [], "cột mang tên dữ liệu người đang dưới N2");
  assert.deepEqual(Object.keys(NGOAI_LE_TEN).filter((k) => !khop.includes(k)), [], "ngoại lệ thừa (cột đã đổi tên hoặc mất)");
  for (const [k, lyDo] of Object.entries(NGOAI_LE_TEN)) assert.ok(lyDo.trim().length > 10, `${k}: thiếu lý do`);
});

test("5.20: tập N3 (định danh) và N4 (bí mật xác thực) ghim nguyên văn", () => {
  const h = hangCua();
  const theo = (x: Hang) => [...h.entries()].filter(([, v]) => v === x).map(([k]) => k).sort();
  assert.deepEqual(theo("N3"), N3_GHIM);
  assert.deepEqual(theo("N4"), N4_GHIM);
});
