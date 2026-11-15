// Ba bất biến dữ liệu của kho vé (R-VDT-1..3 ở scripts/audit-checks.mjs; ADR-0153): bài dựng dữ liệu SAI cố ý rồi đòi mỗi kiểm bắt được đúng một vi phạm.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { AT, taoCsdl, themLo, themVe } from "../../khung-thu-ve.test.ts";

const kiem = (d: ReturnType<typeof taoCsdl>, ma: string): number => {
  const c = CHECKS.find((x: { code: string }) => x.code === ma)!;
  return Number(Object.values(d.prepare(c.sql).get() as Record<string, unknown>)[0]);
};

test("R-VDT-4: hai vé còn hiệu lực trùng 12 số cuối của chuỗi QR ⇒ bắt; vé đã rút hoặc VOID, mã khác dạng không tính", () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const chen = (id: string, ma: string) => d.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at)
     VALUES (?, ?, ?, '2026-10-01', '2026-11-30', ?, 'image/jpeg', 1000, ?, 'AVAILABLE', ?, ?, ?)`,
  ).run(id, lo, ma, `vdt/${id}`, `bam-${id}`, AT, AT, AT);
  const sn = "900000000001";
  chen("a", `${"1".repeat(24)}${sn}`);
  assert.equal(kiem(d, "R-VDT-4"), 0, "một vé");
  chen("b", `${"2".repeat(24)}${sn}`);
  assert.equal(kiem(d, "R-VDT-4"), 1, "cùng S/N, phần đầu chuỗi QR khác");
  d.prepare("UPDATE vdt_ticket SET status = 'VOID', withdrawn_at = ?, updated_at = ? WHERE id = 'b'").run(AT, AT);
  assert.equal(kiem(d, "R-VDT-4"), 0, "vé đã rút không tính");
  chen("c", `TA.${sn}`);
  chen("d", `TB.${sn}`);
  assert.equal(kiem(d, "R-VDT-4"), 0, "mã không phải dạng 36 chữ số không tính");
  // Vé VOID mà không mang dấu rút có thể đã tới tay khách: cùng S/N mà còn trong kho là nguy cơ bán trùng.
  chen("e", `${"3".repeat(24)}900000000002`);
  chen("f", `${"4".repeat(24)}900000000002`);
  d.prepare("UPDATE vdt_ticket SET status = 'VOID', updated_at = ? WHERE id = 'e'").run(AT);
  assert.equal(kiem(d, "R-VDT-4"), 1, "vé VOID không mang dấu rút vẫn tính");
});

test("R-VDT-6: vé đang bán trùng mã, tệp hoặc S/N với vé đã mở ảnh khi lô bị huỷ ⇒ không đạt", () => {
  const d = taoCsdl();
  const lo = themLo(d);
  assert.equal(kiem(d, "R-VDT-6"), 0);
  // Dấu mở chỉ đặt được khi không còn bản đang bán nên muốn dựng vi phạm phải gỡ hai trigger giữ khoá, tức là giả lập dữ liệu đã hỏng.
  d.exec("DROP TRIGGER vdt_ticket_opened_guard; DROP TRIGGER vdt_ticket_opened_no_reimport");
  const v = themVe(d, lo);
  const [t] = d.prepare("SELECT ticket_code, content_hash FROM vdt_ticket WHERE id = ?").all(v) as { ticket_code: string; content_hash: string }[];
  d.prepare("UPDATE vdt_ticket SET withdrawn_at = ?, status = 'VOID', opened_at = ? WHERE id = ?").run(AT, AT, v);
  assert.equal(kiem(d, "R-VDT-6"), 0, "chưa có bản đang bán");
  d.prepare("INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at) VALUES ('sao-chep', ?, ?, '2026-10-24', '2026-11-23', 'khoa-sao-chep', 'image/png', 40, 'bam-khac', 'AVAILABLE', ?, ?)").run(lo, t.ticket_code, AT, AT);
  assert.equal(kiem(d, "R-VDT-6"), 1, "trùng mã");
  d.exec("DROP TRIGGER vdt_ticket_no_delete; DELETE FROM vdt_ticket WHERE id = 'sao-chep'");
  assert.equal(kiem(d, "R-VDT-6"), 0, "gỡ dòng trùng thì hết báo");
  const chenKhac = (ma: string, bam: string) => d.prepare("INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at) VALUES ('sao-chep', ?, ?, '2026-10-24', '2026-11-23', 'khoa-sao-chep', 'image/png', 40, ?, 'AVAILABLE', ?, ?)").run(lo, ma, bam, AT, AT);
  chenKhac("ma-khac-han", t.content_hash);
  assert.equal(kiem(d, "R-VDT-6"), 1, "trùng tệp");
  d.exec("DELETE FROM vdt_ticket WHERE id = 'sao-chep'");
  // Dựng cặp 36 số cùng 12 số cuối: dòng đã mở được đổi mã qua dòng mới vì trigger giữ khoá đã gỡ ở trên.
  d.exec("DROP TRIGGER vdt_ticket_keep_key");
  d.prepare("UPDATE vdt_ticket SET ticket_code = ? WHERE id = ?").run("1".repeat(24) + "123456789012", v);
  chenKhac("2".repeat(24) + "123456789012", "bam-khac-3");
  assert.equal(kiem(d, "R-VDT-6"), 1, "trùng số S/N");
  // Mã không đúng 36 chữ số thì không có số S/N, trùng đuôi không tính.
  const DUOI = "123456789012";
  for (const [daMo, dangBan] of [["A".repeat(24) + DUOI, "2".repeat(24) + DUOI], ["1".repeat(24) + DUOI, "B".repeat(24) + DUOI], [DUOI, "2".repeat(24) + DUOI], ["1".repeat(24) + DUOI, DUOI]]) {
    d.exec("DELETE FROM vdt_ticket WHERE id = 'sao-chep'");
    d.prepare("UPDATE vdt_ticket SET ticket_code = ? WHERE id = ?").run(daMo, v);
    chenKhac(dangBan, "bam-khac-4");
    assert.equal(kiem(d, "R-VDT-6"), 0, `${daMo.length} và ${dangBan.length} ký tự`);
  }
});

test("R-VDT-5: ảnh còn trong hạn lưu ⇒ không báo; quá hạn mà kho chưa xoá ⇒ thấy được", () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const trongHan = themVe(d, lo);
  const v = themVe(d, lo);
  assert.equal(kiem(d, "R-VDT-5"), 0);
  const luc = (ngay: number) => new Date(Date.now() - ngay * 864e5).toISOString();
  d.prepare("UPDATE vdt_ticket SET purged_at = ?, status = 'VOID', updated_at = ? WHERE id = ?").run(luc(2), AT, trongHan);
  assert.equal(kiem(d, "R-VDT-5"), 0, "đang trong 3 ngày lưu");
  d.prepare("UPDATE vdt_ticket SET purged_at = ?, status = 'VOID', updated_at = ? WHERE id = ?").run(luc(5), AT, v);
  assert.equal(kiem(d, "R-VDT-5"), 1);
  d.prepare("UPDATE vdt_ticket SET r2_deleted_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, v);
  assert.equal(kiem(d, "R-VDT-5"), 0);
});

test("R-VDT-1..3: dữ liệu sạch ⇒ 0; vé ALLOCATED không phân bổ ⇒ R-VDT-1 bắt; phân bổ mở trỏ vé AVAILABLE ⇒ R-VDT-2 bắt; vé đã lộ về kho ⇒ R-VDT-3 bắt", () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const v1 = themVe(d, lo);
  for (const m of ["R-VDT-1", "R-VDT-2", "R-VDT-3"]) assert.equal(kiem(d, m), 0, `${m} sạch`);
  d.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED', updated_at = ? WHERE id = ?").run(AT, v1);
  assert.equal(kiem(d, "R-VDT-1"), 1, "ALLOCATED không có phân bổ mở");
  d.prepare("INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('a1', ?, 'o', 's', 'ADULT', 1, ?, ?, ?)").run(v1, AT, AT, AT);
  assert.equal(kiem(d, "R-VDT-1"), 0);
  d.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE id = 'a1'").run(AT, AT);
  // đưa vé về AVAILABLE bằng SQL thô: trigger một chiều chặn đường này, nên chỉ kiểm khi tắt tạm trigger (mô phỏng SQL chạy tay)
  d.exec("DROP TRIGGER vdt_ticket_one_way");
  d.prepare("UPDATE vdt_ticket SET status = 'AVAILABLE', updated_at = ? WHERE id = ?").run(AT, v1);
  assert.equal(kiem(d, "R-VDT-2"), 1, "phân bổ mở trỏ vé AVAILABLE");
  assert.equal(kiem(d, "R-VDT-3"), 1, "vé đã lộ nằm AVAILABLE");
});

test("R-VDT-7, R-VDT-8 (ADR-0175): DA_TINH chỉ trên vé TOUR_DAO đã lộ; vé đã dùng không nằm AVAILABLE", () => {
  const d = taoCsdl();
  const quet = (id: string, ve: string, kq = "DA_TINH") => d.prepare(
    "INSERT INTO vdt_scan (id, ticket_id, ket_qua, scanned_at, scanned_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'u', ?, ?)",
  ).run(id, ve, kq, AT, AT, AT);
  const phanBo = (id: string, ve: string, lo: boolean) => {
    d.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED', updated_at = ? WHERE id = ?").run(AT, ve);
    d.prepare("INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, revealed_at, created_at, updated_at) VALUES (?, ?, 'o', ?, 'ADULT', 1, ?, ?, ?, ?)").run(id, ve, `s-${id}`, AT, lo ? AT : null, AT, AT);
  };
  for (const m of ["R-VDT-7", "R-VDT-8"]) assert.equal(kiem(d, m), 0, `${m} sạch`);
  // vé Tour Đảo đã lộ: hợp lệ
  const tdLo = themVe(d, themLo(d, { nguon: "TOUR_DAO" }));
  phanBo("a1", tdLo, true);
  quet("q1", tdLo);
  assert.equal(kiem(d, "R-VDT-7"), 0, "vé Tour Đảo đã lộ");
  // CHI_XEM trên vé hãng ngoài không tính (chỉ DA_TINH)
  const hn = themVe(d, themLo(d));
  phanBo("a2", hn, true);
  quet("q2", hn, "CHI_XEM");
  assert.equal(kiem(d, "R-VDT-7"), 0, "CHI_XEM không tính");
  quet("q3", hn);
  assert.equal(kiem(d, "R-VDT-7"), 1, "DA_TINH trên vé hãng ngoài");
  d.prepare("UPDATE vdt_scan SET voided_at = ?, voided_by = 'u', void_reason = 'sửa', updated_at = ? WHERE id = 'q3'").run(AT, AT);
  assert.equal(kiem(d, "R-VDT-7"), 0, "lượt đã bỏ không tính");
  // vé Tour Đảo chưa lộ
  const chuaLo = themVe(d, themLo(d, { nguon: "TOUR_DAO" }));
  phanBo("a4", chuaLo, false);
  quet("q4", chuaLo);
  assert.equal(kiem(d, "R-VDT-7"), 1, "vé Tour Đảo chưa lộ");
  // R-VDT-8: ép vé đã dùng về AVAILABLE bằng SQL thô (tắt trigger một chiều)
  assert.equal(kiem(d, "R-VDT-8"), 0);
  d.exec("DROP TRIGGER vdt_ticket_one_way");
  d.prepare("UPDATE vdt_ticket SET status = 'AVAILABLE', updated_at = ? WHERE id = ?").run(AT, tdLo);
  assert.equal(kiem(d, "R-VDT-8"), 1, "vé đã dùng về kho");
});
