import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedbackMessageDto, FeedbackQueueResponse, FeedbackTeamsResponse } from "./contracts.ts";
import { FEEDBACK_TRANSITIONS } from "./feedback-catalog.ts";
import {
  CAU_DA_CHUYEN_NHOM, CAU_KHONG_CON_TRONG_NHOM, CAU_MO_LAI, CAU_TU_CHOI_LOI_BUOC_2, NHAN_TAB, NHAN_TAI_LAI, buocChoPhep, cauSuKien, cauTuanNay, chenSuKien, demTuanNay, donDienSan, gomTin,
  LAM_MOI_LUI_MS, LAM_MOI_TRAN, buocLamMoi, chayTuChoi, chuKyLamMoi, chuaAiNhan, dauPhieuDoi, duongHangDoi, gopTin, hienNhanViec, huyHieuUuTien, nguoiXuLyHienThi, nhanDonChon, nhomChuyenDuoc, nhomHangDoi, tabHoTro,
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

test("duongHangDoi: danh sách trạng thái nối dấu phẩy, tìm q, danh sách rỗng bỏ tham số", () => {
  assert.equal(duongHangDoi("t", "ALL", ["NEW", "ACK"]), "/api/feedback/queue?team=t&loc=ALL&status=NEW%2CACK");
  assert.equal(duongHangDoi("t", "ALL", []), "/api/feedback/queue?team=t&loc=ALL");
  assert.equal(duongHangDoi("t", "MINE", "NEW", " YC-1 "), "/api/feedback/queue?team=t&loc=MINE&status=NEW&q=YC-1");
});

// ---- PR 3 đợt 1 -------------------------------------------------------------------------------------------------
const mkTin = (id: string, authorId: string, phut: number, o: Partial<FeedbackMessageDto> = {}): FeedbackMessageDto => ({
  id, authorId, authorName: authorId, body: id, internal: false, mine: false, createdAt: new Date(Date.UTC(2026, 9, 27, 3, phut)).toISOString(), ...o,
});

test("gomTin: ba tin cùng người 0'/3'/9' → hai cụm (khoảng cách tính giữa hai tin liền nhau)", () => {
  const c = gomTin([mkTin("a", "u1", 0), mkTin("b", "u1", 3), mkTin("c", "u1", 9)], "u9");
  assert.equal(c.length, 2);
  assert.deepEqual(c[0]?.tin.map((m) => m.id), ["a", "b"]);
  assert.deepEqual(c[1]?.tin.map((m) => m.id), ["c"]);
});

test("gomTin: công khai rồi ghi chú nội bộ cùng người cùng phút → hai cụm; cuaToi theo người xem", () => {
  const c = gomTin([mkTin("a", "u1", 0), mkTin("b", "u1", 0, { internal: true })], "u1");
  assert.equal(c.length, 2);
  assert.equal(c[0]?.noiBo, false);
  assert.equal(c[1]?.noiBo, true);
  assert.equal(c[0]?.cuaToi, true);
  assert.deepEqual(gomTin([], "u1"), []);
});

test("gomTin: khác tác giả thì tách cụm", () => {
  assert.equal(gomTin([mkTin("a", "u1", 0), mkTin("b", "u2", 1)], "u1").length, 2);
});

test("cauSuKien: ba loại", () => {
  const e = (loai: "CLAIMED" | "ASSIGNED" | "TEAM_CHANGED", tu: string | null, den: string | null) => ({ id: "e", loai, at: "2026-10-27T03:00:00Z", nguoi: "Lan", tu, den });
  assert.equal(cauSuKien(e("CLAIMED", null, null)), "Lan đã nhận việc");
  assert.equal(cauSuKien(e("ASSIGNED", null, "Minh")), "Lan giao cho Minh");
  assert.equal(cauSuKien(e("TEAM_CHANGED", "Kỹ thuật", "Kế toán")), "Chuyển sang nhóm Kế toán");
});

test("chenSuKien: chen theo thời gian, cụm giữ nguyên", () => {
  const cum = gomTin([mkTin("a", "u1", 0), mkTin("b", "u1", 30)], "u9");
  const ev = { id: "e", loai: "CLAIMED" as const, at: new Date(Date.UTC(2026, 9, 27, 3, 15)).toISOString(), nguoi: "Lan", tu: null, den: null };
  const r = chenSuKien(cum, [ev]);
  assert.equal(r.length, 3);
  assert.ok("tin" in r[0]! && "suKien" in r[1]! && "tin" in r[2]!);
  assert.equal((r[1] as { cau: string }).cau, "Lan đã nhận việc");
});

test("donDienSan", () => {
  assert.equal(donDienSan("/order?id=a&x=1", [{ id: "a" }]), "a");
  assert.equal(donDienSan("/order?x=1&id=a", [{ id: "a" }]), "a");
  assert.equal(donDienSan("/order?id=b", [{ id: "a" }]), null);
  assert.equal(donDienSan("/orders?id=a", [{ id: "a" }]), null);
  assert.equal(donDienSan(null, [{ id: "a" }]), null);
});

test("demTuanNay: tuần Hai–Chủ nhật giờ VN, cộng mọi loại/trạng thái, câu hiển thị", () => {
  // Thứ Ba 27/10/2026: tuần 26/10–01/11 (strftime %W = 43)
  const now = new Date("2026-10-27T05:00:00Z");
  const stats: FeedbackQueueResponse["stats"] = [
    { week: "2026-43", kind: "BUG", status: "NEW", count: 2 },
    { week: "2026-43", kind: "IDEA", status: "DONE", count: 1 },
    { week: "2026-42", kind: "BUG", status: "NEW", count: 9 },
  ];
  const v = demTuanNay(stats, now);
  assert.deepEqual(v, { tu: "26", den: "01/11", so: 3 });
  assert.equal(cauTuanNay(v), "Tuần này (26–01/11): 3 yêu cầu mới gửi tới nhóm");
  // Chủ nhật 01/11 23:30 VN vẫn là tuần đó; 00:10 VN thứ Hai 02/11 sang tuần mới
  assert.equal(demTuanNay(stats, new Date("2026-11-01T16:30:00Z")).tu, "26");
  assert.equal(demTuanNay(stats, new Date("2026-11-01T17:10:00Z")).tu, "02");
  assert.equal(demTuanNay([], now).so, 0);
});

test("buocChoPhep và các câu cố định", () => {
  assert.deepEqual(buocChoPhep("NEW"), [...FEEDBACK_TRANSITIONS.NEW]);
  assert.equal(CAU_MO_LAI, "Gửi sẽ mở lại yêu cầu này");
  assert.equal(CAU_KHONG_CON_TRONG_NHOM, "Yêu cầu này không còn trong nhóm của bạn.");
  assert.equal(CAU_DA_CHUYEN_NHOM, "Yêu cầu vừa được chuyển sang nhóm khác.");
  assert.equal(NHAN_TAI_LAI, "Tải lại yêu cầu");
  assert.equal(CAU_TU_CHOI_LOI_BUOC_2, "Đã gửi lý do nhưng chưa đổi được trạng thái. Bấm Từ chối lại.");
  assert.deepEqual(NHAN_TAB, { mine: "Yêu cầu của tôi", queue: "Việc của nhóm", teams: "Nhóm hỗ trợ" });
});

// ---- Từ chối hai bước (PR 3 Task 4; Review Focus 1) ----------------------------------------------------------------------------------
test("chayTuChoi: bước 2 lỗi rồi bấm lại ⇒ đúng MỘT tin lý do được gửi", async () => {
  const daGui = new Set<string>();
  let guiLyDo = 0;
  let doi = 0;
  const gui = async () => void guiLyDo++;
  const r1 = await chayTuChoi({ id: "a", lyDo: "Không làm được", daGui, guiLyDo: gui, doiTrangThai: async () => { doi++; throw new Error("mạng"); } });
  assert.deepEqual([r1.ok, r1.ok ? 0 : r1.buoc], [false, 2]);
  assert.equal(daGui.has("a"), true);
  const r2 = await chayTuChoi({ id: "a", lyDo: "", daGui, guiLyDo: gui, doiTrangThai: async () => void doi++ });
  assert.equal(r2.ok, true);
  assert.equal(guiLyDo, 1);
  assert.equal(doi, 2);
  assert.equal(daGui.has("a"), false, "xong thì quên, lần từ chối sau (sau khi mở lại) phải hỏi lý do mới");
});

test("chayTuChoi: bước 1 lỗi ⇒ không đổi trạng thái, chưa đánh dấu đã gửi", async () => {
  const daGui = new Set<string>();
  let doi = 0;
  const r = await chayTuChoi({ id: "b", lyDo: "x", daGui, guiLyDo: async () => { throw new Error("400"); }, doiTrangThai: async () => void doi++ });
  assert.deepEqual([r.ok, r.ok ? 0 : r.buoc], [false, 1]);
  assert.equal(doi, 0);
  assert.equal(daGui.has("b"), false);
});

test("chayTuChoi: lý do rỗng khi chưa gửi ⇒ không gọi gì", async () => {
  let n = 0;
  const r = await chayTuChoi({ id: "c", lyDo: "   ", daGui: new Set(), guiLyDo: async () => void n++, doiTrangThai: async () => void n++ });
  assert.equal(r.ok, false);
  assert.equal(n, 0);
});
