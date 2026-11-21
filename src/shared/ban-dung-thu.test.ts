// ADR-0223 (bản dùng thử): luật thuần — bật/tắt, mốc làm mới theo giờ VN, hai khoá an toàn, dựng lô làm mới, kiểm bản mẫu.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANG_DAU, CHU_DAI, GIA_TRI_DAU, SDT_DUNG_THU, SDT_TOAN_QUYEN_DEMO, VAI_DUNG_THU, choPhepLamMoi, docBanMau, laBanDungThu, laMocLamMoi, loXoaHet, mocLamMoiKeTiep,
} from "./ban-dung-thu.ts";

test("bật chỉ khi BAN_DUNG_THU đúng chữ «bat»; MOI_TRUONG (bản Development) không bật", () => {
  assert.equal(laBanDungThu({ BAN_DUNG_THU: "bat" }), true);
  for (const v of [undefined, null, "", "1", "true", "BAT", " bat"]) assert.equal(laBanDungThu({ BAN_DUNG_THU: v }), false, String(v));
  assert.equal(laBanDungThu({ MOI_TRUONG: "development" } as Record<string, unknown>), false);
});

test("mốc làm mới: phút 0–14 của giờ chẵn giờ Việt Nam (= giờ lẻ UTC)", () => {
  assert.equal(laMocLamMoi(Date.parse("2026-11-22T01:00:00Z")), true); // 08:00 VN
  assert.equal(laMocLamMoi(Date.parse("2026-11-22T17:00:00Z")), true); // 00:00 VN hôm sau
  assert.equal(laMocLamMoi(Date.parse("2026-11-22T00:00:00Z")), false); // 07:00 VN
  assert.equal(laMocLamMoi(Date.parse("2026-11-22T01:15:00Z")), false);
  assert.equal(laMocLamMoi(Date.parse("2026-11-22T01:14:59Z")), true);
});

test("giờ làm mới kế tiếp: mốc chẵn VN sau thời điểm đang xét, đúng lúc mốc thì lấy mốc sau", () => {
  assert.equal(mocLamMoiKeTiep(Date.parse("2026-11-22T01:30:00Z")), "2026-11-22T03:00:00.000Z"); // 08:30 VN → 10:00 VN
  assert.equal(mocLamMoiKeTiep(Date.parse("2026-11-22T01:00:00Z")), "2026-11-22T03:00:00.000Z");
  assert.equal(mocLamMoiKeTiep(Date.parse("2026-11-22T16:59:00Z")), "2026-11-22T17:00:00.000Z"); // 23:59 VN → 00:00 VN
});

test("hai khoá an toàn: thiếu biến bật HOẶC thiếu bảng dấu đúng giá trị thì từ chối", () => {
  assert.deepEqual(choPhepLamMoi({ bat: true, dau: GIA_TRI_DAU, coBangKhoa: true }), { ok: true });
  assert.equal(choPhepLamMoi({ bat: false, dau: GIA_TRI_DAU, coBangKhoa: true }).ok, false);
  assert.equal(choPhepLamMoi({ bat: true, dau: null, coBangKhoa: true }).ok, false);
  assert.equal(choPhepLamMoi({ bat: true, dau: "khac", coBangKhoa: true }).ok, false);
  assert.equal(choPhepLamMoi({ bat: true, dau: GIA_TRI_DAU, coBangKhoa: false }).ok, false);
});

test("lô xoá: hoãn kiểm khoá ngoại trước, view trước bảng, bỏ qua đối tượng nội bộ, từ chối tên lạ", () => {
  const lo = loXoaHet([
    { type: "table", name: "orders" }, { type: "view", name: "v_ord_x" }, { type: "index", name: "i1" }, { type: "trigger", name: "t1" },
    { type: "table", name: "sqlite_sequence" }, { type: "table", name: "_cf_METADATA" }, { type: "table", name: BANG_DAU },
  ]);
  assert.deepEqual(lo, ["PRAGMA defer_foreign_keys = ON", 'DROP VIEW IF EXISTS "v_ord_x"', 'DROP TABLE IF EXISTS "orders"', `DROP TABLE IF EXISTS "${BANG_DAU}"`]);
  assert.throws(() => loXoaHet([{ type: "table", name: 'x"; DROP' }]), /tên lạ/);
});

test("bản mẫu: đúng dạng mới nhận; có câu tạo bảng dấu; số migration khớp", () => {
  const tot = { phienBan: 1, commit: "a".repeat(40), soMigration: 3, cau: ["CREATE TABLE a (x)", `CREATE TABLE ${BANG_DAU} (gia_tri TEXT)`, `INSERT INTO ${BANG_DAU} (gia_tri) VALUES ('demo')`] };
  assert.deepEqual(docBanMau(tot, 3), tot);
  assert.equal(docBanMau(tot, 4), null, "bản mẫu cũ hơn migration của mã ⇒ không dùng");
  assert.equal(docBanMau({ ...tot, cau: ["CREATE TABLE a (x)"] }, 3), null, "thiếu bảng dấu");
  assert.equal(docBanMau({ ...tot, cau: [1] }, 3), null);
  assert.equal(docBanMau(null, 3), null);
});

test("vai chọn được: mọi quyền trừ Toàn quyền; hai SĐT không trùng nhau", () => {
  assert.ok(!VAI_DUNG_THU.includes("SUPER_ADMIN"));
  assert.ok(VAI_DUNG_THU.includes("PARTNER") && VAI_DUNG_THU.includes("SALES"));
  assert.notEqual(SDT_DUNG_THU, SDT_TOAN_QUYEN_DEMO);
  assert.match(CHU_DAI, /BẢN DÙNG THỬ/);
  assert.match(CHU_DAI, /giờ chẵn/);
});

test("chốt cứng: bản dùng thử không dựng bộ gửi thư (kể cả có danh sách cho phép) và không dựng khoá thông báo đẩy", async () => {
  const { cauHinhThu } = await import("./gui-thu.ts");
  const { khoaVapid } = await import("./web-push.ts");
  const thu = { send: async () => {} };
  assert.equal(cauHinhThu({ EMAIL: thu, FEEDBACK_MAIL_FROM: "a@b.vn", BAN_DUNG_THU: "bat", MOI_TRUONG: "demo", THU_CHO_PHEP: "x@y.vn" } as Parameters<typeof cauHinhThu>[0]).mailer, undefined);
  assert.notEqual(cauHinhThu({ EMAIL: thu, FEEDBACK_MAIL_FROM: "a@b.vn" }).mailer, undefined, "bản chính thức vẫn có bộ gửi");
  assert.equal(khoaVapid({ VAPID_PUBLIC_KEY: "k", VAPID_PRIVATE_KEY: "k", BAN_DUNG_THU: "bat" } as Parameters<typeof khoaVapid>[0]), null);
});
