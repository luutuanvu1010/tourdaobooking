// Luật thuần của hộp thông báo (ADR-0034, đặc tả 2026-09-27-thong-bao-he-thong-design.md §4–§5). Một hàm lọc cho cả số đỏ lẫn danh sách.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaMocGio, kiemTinThuCong, laNoiBo, locHopThongBao, loaiTinDon, nhanNguoiNhan, nhanNhomNhan, nhanThayTinThuCong, type DongDon, type DongThuCong } from "./thong-bao.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-09-27T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const LAN = ai("lan", "SALES"), HUNG = ai("hung", "SALES"), MAI = ai("mai", "ACCOUNTING"), VU = ai("vu", "SUPER_ADMIN");
const TAM = ai("tam", "FIELD"), BX = ai("bx", "PARTNER"), NGAN = ai("ngan", "INTERN"), LAI = ai("lai", "PARTNER", "SALES");
const don = (o: Partial<DongDon>): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20260927-0001", action: "created", actorId: "hung",
  tenNguoiLam: "Hùng", luc: "2026-09-27T02:00:00.000Z", ownerId: "hung", phuTrach: { coNguoi: true, staffId: "hung" }, lapChuaCoNguoi: false, cungLoLap: false, ...o });
const tin = (o: Partial<DongThuCong>): DongThuCong => ({ id: "n" + Math.random(), tieuDe: "Tiêu đề", noiDung: "Nội dung", quanTrong: false, nhan: ["noi-bo"],
  nguoiGuiId: "vu", tenNguoiGui: "Vũ", luc: "2026-09-27T01:30:00.000Z", thuHoi: false, daHieuLuc: null, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[], t: DongThuCong[] = [], ngan: "cua-toi" | "tat-ca" = "tat-ca", docDenLuc = "2026-09-26T00:00:00.000Z") =>
  locHopThongBao(staff, { don: d, thuCong: t, docDenLuc, now: NOW, ngan });

test("loaiTinDon: map hành động nhật ký → loại tin", () => {
  assert.equal(loaiTinDon(don({ action: "created" })), "lap");
  assert.equal(loaiTinDon(don({ action: "created", lapChuaCoNguoi: true, phuTrach: { coNguoi: false, staffId: null } })), "lap"); // ADR-0045: nháp không "chờ nhận"
  assert.equal(loaiTinDon(don({ action: "order_claimed" })), "nhan");
  assert.equal(loaiTinDon(don({ action: "order_handler_changed" })), "giao");
  // Chọn người phụ trách ngay lúc lập (kể cả tự chọn mình): lô lập ghi created + order_handler_changed CÙNG mốc → chỉ một tin "lap" (đặc tả §4.1)
  assert.equal(loaiTinDon(don({ action: "order_handler_changed", cungLoLap: true })), null);
  assert.equal(loaiTinDon(don({ action: "confirmed" })), "xac_nhan");
  assert.equal(loaiTinDon(don({ action: "confirmed", phuTrach: { coNguoi: false, staffId: null } })), "cho_nhan"); // ADR-0045: xác nhận mà chưa ai phụ trách
  assert.equal(loaiTinDon(don({ action: "cancelled" })), "huy");
  assert.equal(loaiTinDon(don({ action: "order_cancelled_by_field" })), "huy");
  assert.equal(loaiTinDon(don({ action: "updated" })), null);
});

test("K1: tên chỉ có khi người xem được xem lịch sử đơn; không lọt ở trường nào", () => {
  const d = [don({ ownerId: "hung", phuTrach: { coNguoi: true, staffId: "hung" } })];
  assert.match(hop(MAI, d).tin[0]!.cau, /^Hùng vừa lập đơn mới TD-20260927-0001$/);   // Kế toán: history any
  const lan = hop(LAN, d);                                                            // Bán hàng, không lập/không phụ trách
  assert.equal(lan.tin[0]!.cau, "Có đơn mới TD-20260927-0001");
  assert.ok(!JSON.stringify(lan).includes("Hùng"), "JSON không được chứa tên");
  // HDV Tâm đang phụ trách chính đơn này (không chỉ "không thấy tin nào" — phải THẤY tin rồi mới khoá được là tin không mang tên, K4).
  const dTam = [don({ action: "confirmed", ownerId: "hung", phuTrach: { coNguoi: true, staffId: "tam" } })];
  const tam = hop(TAM, dTam);
  assert.equal(tam.tin.length, 1, "HDV đang phụ trách phải THẤY tin — nếu rỗng thì khẳng định dưới vô nghĩa");
  assert.ok(!JSON.stringify(tam).includes("Hùng"), "HDV (history none) không thấy tên dù đang phụ trách");
  const cuaLan = [don({ ownerId: "lan", actorId: "tri", tenNguoiLam: "Trị", action: "confirmed", phuTrach: { coNguoi: true, staffId: "lan" } })];
  assert.equal(hop(LAN, cuaLan).tin[0]!.cau, "Trị vừa xác nhận đơn TD-20260927-0001");  // đơn của Lan → có tên
  assert.equal(hop(LAN, [don({ actorId: null, tenNguoiLam: null, ownerId: "lan" })]).tin[0]!.cau, "Có đơn mới TD-20260927-0001"); // hệ thống → không tên
});

test("E3: không thấy tin do chính mình làm hoặc gửi (K6)", () => {
  assert.equal(hop(HUNG, [don({})]).tin.length, 0);
  assert.equal(hop(VU, [], [tin({ nguoiGuiId: "vu" })]).tin.length, 0);
});

test("Đối tác/Thực tập không có tin về đơn; HDV chỉ thấy tin chờ nhận khi có dispatch.claim", () => {
  const d = [don({ action: "confirmed", ownerId: "bx", actorId: "bx", phuTrach: { coNguoi: false, staffId: null } })];
  assert.equal(hop(BX, [don({ ownerId: "bx" })]).tin.length, 0);
  assert.equal(hop(NGAN, d).tin.length, 0);
  assert.equal(hop(TAM, d).tin.length, 0);
  const lan = hop(LAN, d, [], "cua-toi");
  assert.equal(lan.tin[0]!.loai, "cho_nhan");
  assert.equal(lan.tin[0]!.cuaToi, true);
  assert.equal(hop(MAI, d, [], "cua-toi").tin.length, 0);
  assert.equal(hop(MAI, d, [], "tat-ca").tin.length, 0);           // Kế toán không có dispatch.claim → không thấy tin chờ nhận ở ngăn nào (đặc tả §4.2(2))
});

test("ADR-0045: lưu NHÁP không vào 'Của tôi' của ai (kể cả chủ đơn, người phụ trách, người nhận được đơn); XÁC NHẬN khi chưa ai phụ trách → tin chờ nhận", () => {
  const chuaAi = { coNguoi: false, staffId: null };
  const nhapChuaAi = don({ action: "created", lapChuaCoNguoi: true, ownerId: "bx", actorId: "bx", phuTrach: chuaAi });
  const nhapCoTam = don({ action: "created", ownerId: "lan", actorId: "hung", phuTrach: { coNguoi: true, staffId: "tam" } });
  for (const nguoi of [LAN, VU, TAM]) assert.equal(hop(nguoi, [nhapChuaAi, nhapCoTam], [], "cua-toi").tin.length, 0, `${nguoi.id}: nháp không vào 'Của tôi'`);
  assert.equal(hop(LAN, [nhapChuaAi], [], "tat-ca").tin[0]!.loai, "lap", "nháp vẫn còn ở ngăn 'Tất cả' cho người xem mọi đơn");
  const xn = don({ action: "confirmed", ownerId: "bx", actorId: "bx", tenNguoiLam: "Bảo", phuTrach: chuaAi });
  const r = hop(VU, [nhapChuaAi, xn], [], "cua-toi");
  assert.equal(r.tin.length, 1);
  assert.equal(r.tin[0]!.loai, "cho_nhan");
  assert.equal(r.tin[0]!.cau, "Bảo vừa xác nhận đơn TD-20260927-0001, chưa có người phụ trách");
  // Có người nhận rồi → dòng xác nhận thành tin "xác nhận" thường, rời "Của tôi" của người không liên quan
  assert.equal(hop(LAN, [don({ ...xn, phuTrach: { coNguoi: true, staffId: "hung" } })], [], "cua-toi").tin.length, 0);
});

test("Hai ngăn + số chưa đọc chỉ đếm 'Của tôi', luôn bằng số tin cuaToi&&chuaDoc", () => {
  const d = [
    don({ action: "order_claimed", ownerId: "lan", actorId: "hung", luc: "2026-09-27T02:10:00.000Z" }),   // của Lan
    don({ action: "created", ownerId: "hung", actorId: "hung", luc: "2026-09-27T02:20:00.000Z" }),        // đơn khác
    don({ action: "created", ownerId: "lan", actorId: "lan" }),                                            // của chính Lan
  ];
  const t = [
    tin({ luc: "2026-09-27T01:00:00.000Z" }),
    tin({ thuHoi: true }),
    tin({ nhan: ["quyen:ACCOUNTING"] }),
    tin({ luc: "2026-08-01T00:00:00.000Z", quanTrong: true, daHieuLuc: null }), // Review Focus 5: quan trọng quá 30 ngày, chưa "Đã hiểu" — vẫn giữ (X4)
    tin({ nguoiGuiId: "lan" }),                                                  // Review Focus 5: chính người xem gửi — không được thấy tin của mình (K6)
  ];
  const cua = hop(LAN, d, t, "cua-toi", "2026-09-27T00:00:00.000Z");
  const tat = hop(LAN, d, t, "tat-ca", "2026-09-27T00:00:00.000Z");
  assert.equal(cua.tin.length, 3, "thêm 1 tin quan trọng cũ giữ lại; tin tự gửi bị loại (K6)");
  assert.equal(tat.tin.length, 4);
  assert.ok(cua.tin.some((x) => x.quanTrong && x.daHieuLuc === null), "tin quan trọng quá 30 ngày chưa 'Đã hiểu' vẫn có mặt");
  for (const r of [cua, tat]) assert.equal(r.soChuaDoc, cua.tin.filter((x) => x.cuaToi && x.chuaDoc).length);
  assert.equal(hop(LAN, d, t, "cua-toi", NOW).soChuaDoc, 0, "mở hộp = đọc hết");
  assert.deepEqual(cua.tin.map((x) => x.luc), [...cua.tin.map((x) => x.luc)].sort().reverse(), "mới nhất trên cùng");
});

test("K3: 'Toàn công ty' = nội bộ; Đối tác thuần không nhận, Đối tác + Bán hàng nhận", () => {
  assert.deepEqual(nhanNguoiNhan("noi-bo"), ["noi-bo"]);
  assert.deepEqual(nhanNguoiNhan(["SALES", "PARTNER"]), ["quyen:PARTNER", "quyen:SALES"]);
  assert.equal(laNoiBo(BX), false);
  assert.equal(laNoiBo(NGAN), true);
  assert.equal(laNoiBo(LAI), true);
  assert.equal(nhanThayTinThuCong(BX, ["noi-bo"]), false);
  assert.equal(nhanThayTinThuCong(BX, ["quyen:PARTNER"]), true);
  assert.equal(nhanThayTinThuCong(LAI, ["noi-bo"]), true);
  assert.equal(nhanThayTinThuCong(MAI, ["quyen:SALES"]), false);
});

// 5b (rà soát độc lập lượt 2): dòng người gửi ở hộp đọc cần "· Toàn công ty" / "· <nhóm>" đúng bản mẫu — TinDto.nhomNhan.
test("nhomNhan: nhãn 'Gửi cho' của tin thủ công đúng bản mẫu; null cho tin về đơn", () => {
  assert.equal(nhanNhomNhan(["noi-bo"]), "Toàn công ty");
  assert.equal(nhanNhomNhan(["quyen:SALES"]), "Bán hàng");
  assert.equal(nhanNhomNhan(["quyen:SALES", "quyen:ACCOUNTING"]), "Bán hàng, Kế toán");
  assert.equal(hop(MAI, [], [tin({ nhan: ["noi-bo"] })], "cua-toi").tin[0]!.nhomNhan, "Toàn công ty");
  assert.equal(hop(LAN, [], [tin({ nhan: ["quyen:SALES"] })], "cua-toi").tin[0]!.nhomNhan, "Bán hàng");
  assert.equal(hop(LAN, [don({ ownerId: "lan", action: "confirmed" })], [], "cua-toi").tin[0]!.nhomNhan, null);
});

test("X4: 30 ngày; tin quan trọng chưa Đã hiểu giữ quá 30 ngày; tối đa 100", () => {
  const cu = "2026-08-20T00:00:00.000Z";
  assert.equal(hop(LAN, [don({ ownerId: "lan", luc: cu })]).tin.length, 0);
  assert.equal(hop(LAN, [], [tin({ luc: cu })]).tin.length, 0);
  assert.equal(hop(LAN, [], [tin({ luc: cu, quanTrong: true })]).tin.length, 1);
  assert.equal(hop(LAN, [], [tin({ luc: cu, quanTrong: true, daHieuLuc: "2026-08-21T00:00:00.000Z" })]).tin.length, 0);
  const nhieu = Array.from({ length: 150 }, (_, i) => don({ ownerId: "lan", luc: new Date(Date.parse(NOW) - i * 60000).toISOString() }));
  assert.equal(hop(LAN, nhieu).tin.length, 100);
});

// R2 (rà soát trước thi công 2026-09-27): 150 tin "Của tôi" CHƯA ĐỌC → số đỏ đúng 100 (trần TOI_DA_TIN), và luôn bằng số tin
// chuaDoc thật sự có trong danh sách ngăn "Của tôi" trả về — số đỏ không được lệch danh sách dù dữ liệu vượt trần (Review Focus 5).
test("R2: 150 tin 'Của tôi' chưa đọc → soChuaDoc đúng 100, bằng số tin chuaDoc của ngăn 'Của tôi'", () => {
  const nhieu = Array.from({ length: 150 }, (_, i) =>
    don({ ownerId: "lan", actorId: "hung", action: "confirmed", luc: new Date(Date.parse(NOW) - i * 60000).toISOString() }));
  const cua = hop(LAN, nhieu, [], "cua-toi", "2026-01-01T00:00:00.000Z");
  assert.equal(cua.tin.length, 100);
  assert.equal(cua.soChuaDoc, 100);
  assert.equal(cua.soChuaDoc, cua.tin.filter((x) => x.cuaToi && x.chuaDoc).length);
});

// Sửa vòng kiểm Task 5→6 (mục 1, người kiểm độc lập): quanTrongChuaHieu (dùng ở dải chuông tom-tat) KHÔNG được ghim vào trần TOI_DA_TIN.
// Trước sửa: route tom-tat lọc quanTrongChuaHieu từ `h.tin` đã bị cắt 100 → người có > 100 tin "Của tôi" mới hơn mất tin quan trọng chưa
// hiểu khỏi dải (trái X4). Nay locHopThongBao trả riêng trường này, tính TRƯỚC khi cắt.
test("quanTrongChuaHieu không bị cắt bởi trần TOI_DA_TIN dù danh sách 'tin' đã bị cắt (X4 đứng trên trần)", () => {
  const moiHon = Array.from({ length: 120 }, (_, i) =>
    don({ ownerId: "lan", actorId: "hung", action: "confirmed", luc: new Date(Date.parse(NOW) - i * 60000).toISOString() }));
  const quanTrongCu = tin({ luc: new Date(Date.parse(NOW) - 5 * 86400000).toISOString(), quanTrong: true, tieuDe: "Tin quan trọng cũ" });
  const h = hop(LAN, moiHon, [quanTrongCu], "cua-toi", "2026-01-01T00:00:00.000Z");
  assert.equal(h.tin.length, 100, "danh sách 'tin' vẫn bị cắt ở 100 — không đổi hành vi cũ");
  assert.ok(!h.tin.some((x) => x.id === quanTrongCu.id), "tin quan trọng cũ bị cắt khỏi 'tin' (đứng ngoài 100 dòng mới nhất)");
  assert.ok(h.quanTrongChuaHieu.some((x) => x.id === quanTrongCu.id), "nhưng vẫn có trong quanTrongChuaHieu — không bị ghim vào trần 100");
});

test("kiemTinThuCong: bắt lỗi bằng câu tiếng Việt; cắt khoảng trắng; giữ xuống dòng", () => {
  const ok = kiemTinThuCong({ tieuDe: "  Lịch nghỉ  ", noiDung: "Dòng 1\nDòng 2", nguoiNhan: "noi-bo", quanTrong: true, clientRequestId: "11111111-1111-4111-8111-111111111111" });
  assert.ok(ok.ok && ok.value.tieuDe === "Lịch nghỉ" && ok.value.noiDung === "Dòng 1\nDòng 2");
  const sai = (o: object) => { const r = kiemTinThuCong({ tieuDe: "A", noiDung: "B", nguoiNhan: "noi-bo", quanTrong: false, clientRequestId: "11111111-1111-4111-8111-111111111111", ...o }); return r.ok ? "" : r.message; };
  assert.match(sai({ tieuDe: " " }), /tiêu đề/i);
  assert.match(sai({ tieuDe: "x".repeat(121) }), /120/);
  assert.match(sai({ noiDung: "" }), /nội dung/i);
  assert.match(sai({ noiDung: "x".repeat(2001) }), /2000/);
  assert.match(sai({ nguoiNhan: [] }), /nhóm/i);
  assert.match(sai({ nguoiNhan: ["BOSS"] }), /nhóm/i);
  assert.match(sai({ quanTrong: "có" }), /quan trọng/i);
  assert.match(sai({ clientRequestId: "abc" }), /mã yêu cầu/i);
});

// BẮT BUỘC (rà soát trước thi công): locHopThongBao so mốc giờ BẰNG CHUỖI (không parse lại) — mọi giá trị đưa vào (luc, docDenLuc, now)
// phải cùng dạng ISO có mili-giây. Mốc đọc mặc định lấy từ staff.createdAt, không đảm bảo luôn ở dạng này → phải chuẩn hoá bằng chuanHoaMocGio.
test("chuanHoaMocGio: chuẩn hoá mốc thiếu mili-giây; minh hoạ vì sao thiếu chuẩn hoá làm so chuỗi SAI thứ tự thời gian thật", () => {
  const thieuMs = "2026-09-27T02:40:00Z"; // dạng staff.createdAt có thể có (không có .SSS)
  const ngaySau = "2026-09-27T02:40:00.150Z"; // 150ms SAU, cùng giây — thời gian thật ngaySau > thieuMs
  // Minh hoạ lỗi: so chuỗi trực tiếp (không chuẩn hoá) cho kết quả NGƯỢC — "Z" (0x5A) > "." (0x2E) nên mốc thiếu mili-giây trông "sau" mốc thật ra đứng sau nó.
  assert.ok(thieuMs > ngaySau, "minh hoạ lỗi: chuỗi thiếu mili-giây so LỚN HƠN mốc thật ra đứng sau — đây là lỗi chuanHoaMocGio phải tránh");
  assert.equal(chuanHoaMocGio(thieuMs), "2026-09-27T02:40:00.000Z");
  assert.ok(chuanHoaMocGio(thieuMs) < ngaySau, "sau khi chuẩn hoá, so sánh chuỗi khớp đúng thứ tự thời gian thật");
  assert.equal(chuanHoaMocGio("2026-09-27T02:40:00.000Z"), "2026-09-27T02:40:00.000Z", "mốc đã chuẩn giữ nguyên (idempotent)");
});

test("nhanNhomNhan (ADR-0042): không liệt kê nhóm Toàn quyền trong \"Gửi cho\" — vai ẩn", () => {
  assert.equal(nhanNhomNhan(["quyen:ADMIN", "quyen:SUPER_ADMIN"]), "Quản trị");
  assert.equal(nhanNhomNhan(["quyen:SUPER_ADMIN"]), "");
  assert.equal(nhanNhomNhan(["quyen:SALES", "quyen:ADMIN"]), "Bán hàng, Quản trị");
});
