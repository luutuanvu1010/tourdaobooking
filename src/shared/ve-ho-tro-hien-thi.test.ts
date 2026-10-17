import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedbackTeamsResponse } from "./contracts.ts";
import {
  LAM_MOI_LUI_MS, LAM_MOI_TRAN, buocLamMoi, chuKyLamMoi, chuaAiNhan, dauPhieuDoi, duongHangDoi, gopTin, hienNhanViec, huyHieuUuTien, nguoiXuLyHienThi, nhanDonChon, nhomChuyenDuoc, nhomHangDoi, tabHoTro,
} from "./ve-ho-tro-hien-thi.ts";

const NHOM = [
  { id: "fbk-team-ky-thuat", code: "KY_THUAT", name: "Kỹ thuật", description: "", sensitive: false },
  { id: "fbk-team-ke-toan", code: "KE_TOAN", name: "Kế toán", description: "", sensitive: true },
];
const nguoiThuong: FeedbackTeamsResponse = { teams: NHOM, mine: [], isSuper: false };
const thanhVienKeToan: FeedbackTeamsResponse = { teams: NHOM, mine: [{ teamId: "fbk-team-ke-toan", role: "MEMBER" }], isSuper: false };
const toanQuyen: FeedbackTeamsResponse = { teams: NHOM, mine: [], isSuper: true };

test("tabHoTro: người thường chỉ «Yêu cầu của tôi»; thành viên thêm hàng đợi; Toàn quyền thêm quản lý nhóm", () => {
  assert.deepEqual(tabHoTro(nguoiThuong), ["mine"]);
  assert.deepEqual(tabHoTro(thanhVienKeToan), ["mine", "queue"]);
  assert.deepEqual(tabHoTro(toanQuyen), ["mine", "queue", "teams"]);
});

test("tabHoTro: thành viên của nhóm đã ngưng (không còn trong danh sách nhóm đang dùng) không có tab hàng đợi", () => {
  assert.deepEqual(tabHoTro({ teams: NHOM, mine: [{ teamId: "fbk-team-da-ngung", role: "LEAD" }], isSuper: false }), ["mine"]);
});

test("nhomHangDoi: thành viên chỉ thấy nhóm mình; Toàn quyền thấy mọi nhóm", () => {
  assert.deepEqual(nhomHangDoi(thanhVienKeToan), [{ id: "fbk-team-ke-toan", name: "Kế toán" }]);
  assert.deepEqual(nhomHangDoi(toanQuyen).map((x) => x.id), ["fbk-team-ky-thuat", "fbk-team-ke-toan"]);
  assert.deepEqual(nhomHangDoi(nguoiThuong), []);
});

test("chuaAiNhan / hienNhanViec: người giữ bị khoá coi như chưa ai nhận; người gửi không thấy nút nhận phiếu mình; phiếu đóng không nhận", () => {
  const p = { assigneeId: null, assigneeActive: false, submitterId: "a", status: "NEW" as const };
  assert.equal(chuaAiNhan(p), true);
  assert.equal(chuaAiNhan({ assigneeId: "x", assigneeActive: false }), true);
  assert.equal(chuaAiNhan({ assigneeId: "x", assigneeActive: true }), false);
  assert.equal(hienNhanViec(p, "b"), true);
  assert.equal(hienNhanViec(p, "a"), false, "người gửi");
  assert.equal(hienNhanViec({ ...p, status: "DONE" }, "b"), false);
  assert.equal(hienNhanViec({ ...p, status: "DECLINED" }, "b"), false);
  assert.equal(hienNhanViec({ ...p, assigneeId: "x", assigneeActive: true }, "b"), false);
});

test("duongHangDoi: không gửi status rỗng (máy chủ trả 400)", () => {
  assert.equal(duongHangDoi("fbk-team-ke-toan", "ALL", ""), "/api/feedback/queue?team=fbk-team-ke-toan&loc=ALL");
  assert.equal(duongHangDoi("fbk-team-ke-toan", "UNASSIGNED", "NEW"), "/api/feedback/queue?team=fbk-team-ke-toan&loc=UNASSIGNED&status=NEW");
});

test("nhomChuyenDuoc: bỏ nhóm đang giữ phiếu", () => {
  assert.deepEqual(nhomChuyenDuoc(toanQuyen, "fbk-team-ke-toan"), [{ id: "fbk-team-ky-thuat", name: "Kỹ thuật" }]);
});

// ---- Đợt 2a (ADR-0127): tự làm mới khung trò chuyện, đầu phiếu, mức ưu tiên, đơn liên quan --------------------------------------------
const tin = (id: string, createdAt: string) => ({ id, createdAt });
const ISO_SINCE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/; // đúng dạng parseSince của máy chủ nhận

test("gopTin: bỏ trùng theo id, giữ thứ tự máy chủ; tin ghi xong sau nhưng mang dấu giờ sớm hơn chen đúng chỗ", () => {
  const B = tin("b", "2026-10-17T03:00:10.000Z");
  const A = tin("a", "2026-10-17T03:00:05.000Z"); // ghi xong SAU B nhưng dấu giờ sớm hơn (ca lệch thứ tự Việc 4)
  const C = tin("c", "2026-10-17T03:00:20.000Z");
  assert.deepEqual(gopTin([B], [A, B]).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(gopTin([A, B], [B, C]).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(gopTin([A, B, C], []).map((x) => x.id), ["a", "b", "c"]);
  // Cùng dấu giờ: giữ thứ tự đã có, tin mới xếp sau.
  const D = tin("d", "2026-10-17T03:00:20.000Z");
  assert.deepEqual(gopTin([A, C], [D]).map((x) => x.id), ["a", "c", "d"]);
  // Bản mới của cùng id (vd tên người viết đổi) thay bản cũ, không nhân đôi.
  const B2 = { ...B, body: "mới" };
  const r = gopTin([{ ...B, body: "cũ" }], [B2]);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.body, "mới");
});

test("buocLamMoi: mốc = dấu giờ LỚN NHẤT trong mọi tin đã nhận, lùi 30 giây, đúng dạng máy chủ nhận", () => {
  const daCo = [tin("a", "2026-10-17T03:00:50.000Z"), tin("b", "2026-10-17T03:01:00.000Z")];
  const r = buocLamMoi(daCo, [tin("c", "2026-10-17T03:00:55.000Z")], "2026-10-17T02:00:00.000Z");
  assert.deepEqual(r.tin.map((x) => x.id), ["a", "c", "b"]);
  assert.deepEqual(r.moi.map((x) => x.id), ["c"]);
  assert.equal(r.since, "2026-10-17T03:00:30.000Z", "mốc là tin b (lớn nhất), không phải tin cuối của phản hồi");
  assert.equal(r.goiNgay, false);
  assert.match(r.since, ISO_SINCE);
});

test("buocLamMoi: phản hồi rỗng giữ mốc cũ; chưa có tin nào thì lấy giờ tạo phiếu lùi 30 giây; mốc thiếu phần nghìn giây vẫn ra đúng dạng", () => {
  const daCo = [tin("a", "2026-10-17T03:00:50.000Z")];
  const r = buocLamMoi(daCo, [], "2026-10-17T02:00:00.000Z");
  assert.equal(r.since, "2026-10-17T03:00:20.000Z");
  assert.deepEqual(r.moi, []);
  assert.equal(r.goiNgay, false);
  assert.equal(buocLamMoi([], [], "2026-10-17T02:00:00Z").since, "2026-10-17T01:59:30.000Z");
  assert.equal(buocLamMoi([tin("a", "2026-10-17T00:00:10Z")], [], "x").since, "2026-10-16T23:59:40.000Z");
});

test("buocLamMoi: nhận đủ trần trang (100 tin) thì gọi tiếp NGAY với mốc là tin cuối của phản hồi, KHÔNG lùi (tránh kẹt); 99 tin là vòng thường", () => {
  assert.equal(LAM_MOI_TRAN, 100);
  const day = Array.from({ length: LAM_MOI_TRAN }, (_, i) => tin(`m${i}`, new Date(Date.UTC(2026, 9, 17, 3, 0, 0, i * 10)).toISOString()));
  const r = buocLamMoi([], day, "2026-10-17T02:00:00.000Z");
  assert.equal(r.goiNgay, true);
  assert.equal(r.since, day[LAM_MOI_TRAN - 1]?.createdAt, "mốc = tin cuối, không lùi 30 giây");
  // Lần gọi ngay tiếp theo trả 100 tin trùng (vì mốc lùi) sẽ không kẹt: mốc vẫn tiến tới tin cuối của phản hồi.
  const r2 = buocLamMoi(r.tin, day, "2026-10-17T02:00:00.000Z");
  assert.equal(r2.goiNgay, true);
  assert.deepEqual(r2.moi, []);
  const thieu = buocLamMoi([], day.slice(0, LAM_MOI_TRAN - 1), "2026-10-17T02:00:00.000Z");
  assert.equal(thieu.goiNgay, false);
  assert.equal(thieu.since, new Date(Date.parse(day[LAM_MOI_TRAN - 2]!.createdAt) - LAM_MOI_LUI_MS).toISOString());
});

test("chuKyLamMoi: 5 giây khi phiếu còn mở, 30 giây khi đã đóng (Đã xong / Từ chối)", () => {
  assert.equal(chuKyLamMoi("NEW"), 5_000);
  assert.equal(chuKyLamMoi("IN_PROGRESS"), 5_000);
  assert.equal(chuKyLamMoi("DONE"), 30_000);
  assert.equal(chuKyLamMoi("DECLINED"), 30_000);
});

test("dauPhieuDoi: chỉ báo đổi khi trạng thái / người xử lý / mức ưu tiên / nhóm khác đi", () => {
  const h0 = { status: "NEW" as const, assigneeId: null, assigneeName: null, assigneeActive: false, priority: "NORMAL" as const, teamId: "t1" };
  assert.equal(dauPhieuDoi(h0, { ...h0 }), false);
  assert.equal(dauPhieuDoi(h0, { ...h0, status: "ACKNOWLEDGED" }), true);
  assert.equal(dauPhieuDoi(h0, { ...h0, assigneeId: "x" }), true);
  assert.equal(dauPhieuDoi(h0, { ...h0, assigneeName: "X" }), true);
  assert.equal(dauPhieuDoi(h0, { ...h0, assigneeActive: true }), true);
  assert.equal(dauPhieuDoi(h0, { ...h0, priority: "URGENT" }), true);
  assert.equal(dauPhieuDoi(h0, { ...h0, teamId: "t2" }), true);
});

test("nguoiXuLyHienThi: chưa ai giữ / người giữ không còn hợp lệ (tên mờ) / đang giữ", () => {
  assert.deepEqual(nguoiXuLyHienThi({ assigneeId: null, assigneeName: null, assigneeActive: false }), { kieu: "chua", ten: null });
  assert.deepEqual(nguoiXuLyHienThi({ assigneeId: "x", assigneeName: "Kế Toán", assigneeActive: false }), { kieu: "cu", ten: "Kế Toán" });
  assert.deepEqual(nguoiXuLyHienThi({ assigneeId: "x", assigneeName: null, assigneeActive: true }), { kieu: "co", ten: "?" });
});

test("huyHieuUuTien: Thường không gắn nhãn; Cao, Khẩn có nhãn tiếng Việt (không lộ mã HIGH / URGENT)", () => {
  assert.equal(huyHieuUuTien("NORMAL"), null);
  assert.deepEqual(huyHieuUuTien("HIGH"), { chu: "Cao", sac: "cao" });
  assert.deepEqual(huyHieuUuTien("URGENT"), { chu: "Khẩn", sac: "khan" });
});

test("nhanDonChon: mã đơn + trạng thái bằng chữ tiếng Việt, không lộ mã thô", () => {
  assert.equal(nhanDonChon({ orderCode: "TD-20261017-0001", status: "draft" }), "TD-20261017-0001 · Chờ xác nhận");
  assert.equal(nhanDonChon({ orderCode: "TD-20261017-0002", status: "confirmed" }), "TD-20261017-0002 · Đã xác nhận");
  assert.equal(nhanDonChon({ orderCode: "TD-20261017-0003", status: "cancelled" }), "TD-20261017-0003 · Đã huỷ");
  for (const s of ["draft", "confirmed", "cancelled"] as const) assert.doesNotMatch(nhanDonChon({ orderCode: "X", status: s }), /draft|confirmed|cancelled/);
});
