// Luật thuần HIỂN THỊ của giao diện Vận chuyển lượt 1a (ADR-0040; bản vẽ docs/design/van-chuyen-1a/) — src/shared/giay-to-hien-thi.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOC_XE, NGUONG_MAC_DINH, NHAN_TRANG_THAI_XE, canhBaoXe, chipHan, coMucGiayToCuaToi, demLocXe, duongDanDong, haiGiayGanHan, lichSuCua, loiChao, lyDoSuaSai, ngayVN,
  tenGiayTo, tenXe, thanDungLaiHoacSuaXe, thanNgungXe, thanSuaSai, thanXeMoi, thoiGianTuToken, tomTatGiayToXe, xepTheoHan,
} from "./giay-to-hien-thi.ts";
import { PERMISSION_CODES, can, holdsPartner, type PermissionCode } from "./permissions.ts";

test("ngayVN: YYYY-MM-DD → dd/mm/yyyy bằng thao tác chuỗi (không Date theo múi giờ máy); null → chuỗi rỗng", () => {
  assert.equal(ngayVN("2026-09-30"), "30/09/2026");
  assert.equal(ngayVN("2027-01-01"), "01/01/2027");
  assert.equal(ngayVN(null), "");
});

test("chipHan: đã hết / hết hạn hôm nay / trong ngưỡng / ngoài ngưỡng / hơn một năm / không hạn — đúng chữ bản vẽ, luôn có biểu tượng khi cần làm gì đó", () => {
  assert.deepEqual(chipHan(-8, 30), { tone: "danger", text: "Đã hết hạn 8 ngày", icon: true });
  assert.deepEqual(chipHan(-1, 30), { tone: "danger", text: "Đã hết hạn 1 ngày", icon: true });
  // Hôm nay vẫn còn hạn trong ngày (máy chủ: mucHan → "sap-het", gopSapHetHan → "soon") → tông CÁT như màn 06, không đỏ.
  assert.deepEqual(chipHan(0, 30), { tone: "warn", text: "Hết hạn hôm nay", icon: true });
  assert.deepEqual(chipHan(2, 30), { tone: "warn", text: "Còn 2 ngày", icon: true });
  assert.deepEqual(chipHan(30, 30), { tone: "warn", text: "Còn 30 ngày", icon: true }, "đúng mốc vẫn là sắp hết (≤ ngưỡng)");
  assert.deepEqual(chipHan(31, 30), { tone: "ok", text: "Còn 31 ngày", icon: false });
  assert.deepEqual(chipHan(38, 30), { tone: "ok", text: "Còn 38 ngày", icon: false });
  assert.deepEqual(chipHan(365, 30), { tone: "ok", text: "Còn 365 ngày", icon: false });
  assert.deepEqual(chipHan(366, 30), { tone: "ok", text: "Còn hạn", icon: false });
  assert.deepEqual(chipHan(null, 30), { tone: "muted", text: "Không hạn", icon: false });
  assert.deepEqual(chipHan(40, 45), { tone: "warn", text: "Còn 40 ngày", icon: true }, "ngưỡng đổi thì màu đổi theo");
  assert.equal(NGUONG_MAC_DINH, 30, "khớp dòng gieo của vc_expiry_policy (migration 0033)");
});

test("tenGiayTo: GPLX ghép hạng viết thường chữ “hạng” (Giấy phép lái xe hạng D2); loại khác giữ nguyên", () => {
  assert.equal(tenGiayTo({ typeName: "Giấy phép lái xe", className: "Hạng D2" }), "Giấy phép lái xe hạng D2");
  assert.equal(tenGiayTo({ typeName: "Giấy phép lái xe", className: "Hạng B2 (mẫu cũ)" }), "Giấy phép lái xe hạng B2 (mẫu cũ)");
  assert.equal(tenGiayTo({ typeName: "Khám sức khoẻ", className: null }), "Khám sức khoẻ");
});

test("xepTheoHan: đã hết hạn → sắp hết → còn hạn → không hạn (quyết định thiết kế 3); cùng hạn thì theo tên", () => {
  const docs = [
    { id: "a", typeName: "Đăng ký xe", daysLeft: null },
    { id: "b", typeName: "Kiểm định", daysLeft: 17 },
    { id: "c", typeName: "Bảo hiểm trách nhiệm dân sự", daysLeft: 4 },
    { id: "d", typeName: "Phù hiệu xe hợp đồng", daysLeft: -8 },
    { id: "e", typeName: "Giám sát hành trình", daysLeft: 94 },
    { id: "f", typeName: "Camera người lái", daysLeft: 94 },
  ];
  assert.deepEqual(xepTheoHan(docs).map((d) => d.id), ["d", "c", "b", "f", "e", "a"]);
  assert.deepEqual(docs.map((d) => d.id), ["a", "b", "c", "d", "e", "f"], "không sửa mảng gốc");
});

test("haiGiayGanHan: đúng hai giấy gần hạn nhất (khối tóm tắt trang đầu tài xế — điều phối chốt theo bản vẽ); ít hơn hai thì trả đủ số có", () => {
  const docs = [
    { id: "cccd", typeName: "Căn cước công dân (CCCD)", daysLeft: 3818 },
    { id: "gplx", typeName: "Giấy phép lái xe", daysLeft: 38 },
    { id: "ksk", typeName: "Khám sức khoẻ", daysLeft: 2 },
    { id: "th", typeName: "Tập huấn nghiệp vụ vận tải", daysLeft: 154 },
  ];
  assert.deepEqual(haiGiayGanHan(docs).map((d) => d.id), ["ksk", "gplx"]);
  assert.deepEqual(haiGiayGanHan(docs.slice(0, 1)).map((d) => d.id), ["cccd"]);
  assert.deepEqual(haiGiayGanHan([]), []);
});

test("lichSuCua: lần theo previousId về trước, mới trước cũ; bỏ dòng đã huỷ; không lặp vô hạn nếu dữ liệu vòng", () => {
  const all = [
    { id: "moi", previousId: "giua", voided: false },
    { id: "giua", previousId: "cu", voided: false },
    { id: "cu", previousId: null, voided: false },
    { id: "nham", previousId: "moi", voided: true },
    { id: "khac", previousId: null, voided: false },
  ];
  assert.deepEqual(lichSuCua(all[0]!, all).map((d) => d.id), ["giua", "cu"]);
  assert.deepEqual(lichSuCua(all[4]!, all), []);
  const vong = [{ id: "x", previousId: "y", voided: false }, { id: "y", previousId: "x", voided: false }];
  assert.deepEqual(lichSuCua(vong[0]!, vong).map((d) => d.id), ["y"]);
  const coHuy = [{ id: "m", previousId: "h", voided: false }, { id: "h", previousId: "c", voided: true }, { id: "c", previousId: null, voided: false }];
  assert.deepEqual(lichSuCua(coHuy[0]!, coHuy).map((d) => d.id), ["c"], "dòng đã huỷ không hiện là 'Đã thay' nhưng chuỗi vẫn đi qua nó");
});

test("tenXe: MỘT ô “Tên / đời xe” gắn với name (Phần B, chờ điều phối xác nhận); năm của máy chủ (nếu có) nối sau tên khi hiện", () => {
  assert.equal(tenXe({ name: "Ford Transit 2019", modelYear: null }), "Ford Transit 2019");
  assert.equal(tenXe({ name: "Ford Transit", modelYear: 2019 }), "Ford Transit 2019");
});

test("thanXeMoi / thanDungLaiHoacSuaXe / thanNgungXe: thân đúng hợp đồng; ô Tên/đời xe → name; modelYear: tạo mới null, sửa GIỮ nguyên giá trị đã lưu; Ngừng dùng gửi giá trị ĐÃ LƯU (không lẫn chỗ đang sửa dở)", () => {
  const form = { plateNumber: " 79B-123.45 ", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit 2019", passengerCapacity: 15, status: "active" as const };
  assert.deepEqual(thanXeMoi(form), { plateNumber: "79B-123.45", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit 2019", modelYear: null, passengerCapacity: 15, status: "active" });
  const daLuu = { plateNumber: "79B-123.45", chassisNumber: "KHUNG12345", name: "Ford Transit", modelYear: 2019, passengerCapacity: 15, status: "retired" as const, updatedAt: "2026-09-28T01:00:00.000Z" };
  assert.deepEqual(thanDungLaiHoacSuaXe({ ...form, status: "maintenance" }, daLuu), {
    plateNumber: "79B-123.45", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit 2019", modelYear: 2019, passengerCapacity: 15, status: "maintenance", expectedUpdatedAt: "2026-09-28T01:00:00.000Z",
  });
  assert.deepEqual(thanNgungXe({ ...daLuu, status: "active" }), {
    plateNumber: "79B-123.45", chassisNumber: "KHUNG12345", name: "Ford Transit", modelYear: 2019, passengerCapacity: 15, status: "retired", expectedUpdatedAt: "2026-09-28T01:00:00.000Z",
  });
});

// ADR-0048 D1 (Task B3): ô "Chủ xe" — rỗng = mặc định (thêm: công ty chủ; sửa: giữ chủ), KHÔNG gửi khoá; có giá trị thì gửi `ownerPartyId` (thêm và sửa — Q1 = (a)).
test("thanXeMoi / thanDungLaiHoacSuaXe (ADR-0048): ô Chủ xe rỗng → không gửi ownerPartyId; có chọn → gửi; Ngừng dùng không gửi chủ (giữ chủ)", () => {
  const form = { plateNumber: "79B-123.45", chassisNumber: "KHUNG12345", name: "Ford Transit", passengerCapacity: 15, status: "active" as const, ownerPartyId: "" };
  assert.equal("ownerPartyId" in thanXeMoi(form), false);
  const NX = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
  assert.equal(thanXeMoi({ ...form, ownerPartyId: NX }).ownerPartyId, NX);
  const daLuu = { plateNumber: "79B-123.45", chassisNumber: "KHUNG12345", name: "Ford Transit", modelYear: null, passengerCapacity: 15, status: "active" as const, updatedAt: "2026-09-28T01:00:00.000Z" };
  assert.equal(thanDungLaiHoacSuaXe({ ...form, ownerPartyId: NX }, daLuu).ownerPartyId, NX);
  assert.equal("ownerPartyId" in thanDungLaiHoacSuaXe(form, daLuu), false);
  assert.equal("ownerPartyId" in thanNgungXe(daLuu), false);
});

test("thanSuaSai: “Nhập nhầm cả dòng” KHÔNG có khoá value (máy chủ 400 nếu gửi, kể cả null); lý do khác gửi value (rỗng → null)", () => {
  assert.deepEqual(thanSuaSai("NHAP_NHAM_DONG", "bất kỳ", "t1"), { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: "t1" });
  assert.equal(Object.hasOwn(thanSuaSai("NHAP_NHAM_DONG", null, "t1"), "value"), false);
  assert.deepEqual(thanSuaSai("SAI_NGAY_HET_HAN", "2027-01-01", "t2"), { reason: "SAI_NGAY_HET_HAN", value: "2027-01-01", expectedUpdatedAt: "t2" });
  assert.deepEqual(thanSuaSai("SAI_NOI_CAP", "  ", "t3"), { reason: "SAI_NOI_CAP", value: null, expectedUpdatedAt: "t3" });
});

test("lyDoSuaSai: giấy tờ xe chỉ lý do dùng cho xe; giấy tờ người: “Nhập sai hạng” chỉ với giấy phép lái xe; nhãn từ LY_DO_SUA_SAI", () => {
  assert.deepEqual(lyDoSuaSai("xe").map((l) => l.code), ["SAI_SO", "SAI_NGAY_CAP", "SAI_NGAY_HET_HAN", "NHAP_NHAM_DONG"]);
  assert.deepEqual(lyDoSuaSai({ typeCode: "CCCD" }).map((l) => l.code), ["SAI_SO", "SAI_NGAY_CAP", "SAI_NGAY_HET_HAN", "SAI_NOI_CAP", "NHAP_NHAM_DONG"]);
  assert.deepEqual(lyDoSuaSai({ typeCode: "GPLX" }).map((l) => l.code), ["SAI_SO", "SAI_NGAY_CAP", "SAI_NGAY_HET_HAN", "SAI_NOI_CAP", "SAI_HANG", "NHAP_NHAM_DONG"]);
  assert.equal(lyDoSuaSai("xe")[0]!.nhan, "Nhập sai số");
});

test("canhBaoXe: dòng cảnh báo của thẻ xe (màn 01) — giấy gần hạn nhất + số giấy khác trong mốc; không có → null", () => {
  assert.deepEqual(canhBaoXe({ alert: "expired", alertTypeName: "Phù hiệu", alertDaysLeft: -8, alertCount: 3 }), { tone: "danger", text: "Phù hiệu đã hết hạn 8 ngày · 2 giấy sắp hết hạn" });
  assert.deepEqual(canhBaoXe({ alert: "soon", alertTypeName: "Kiểm định", alertDaysLeft: 21, alertCount: 1 }), { tone: "warn", text: "Kiểm định còn 21 ngày" });
  assert.deepEqual(canhBaoXe({ alert: "soon", alertTypeName: "Kiểm định", alertDaysLeft: 0, alertCount: 2 }), { tone: "warn", text: "Kiểm định hết hạn hôm nay · 1 giấy sắp hết hạn" });
  assert.equal(canhBaoXe({ alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 }), null);
});

test("tomTatGiayToXe: khối tóm tắt ở chi tiết xe (màn 03) — đếm dòng HIỆN HÀNH; chưa có giấy nào thì nói đúng như vậy (không nói “còn hạn”)", () => {
  const d = (daysLeft: number | null) => ({ daysLeft });
  assert.deepEqual(tomTatGiayToXe([d(-8), d(4), d(17), d(null), d(94)], 30), { tone: "danger", text: "1 giấy đã hết hạn · 2 giấy sắp hết hạn trong 30 ngày" });
  assert.deepEqual(tomTatGiayToXe([d(-8), d(94)], 30), { tone: "danger", text: "1 giấy đã hết hạn" });
  assert.deepEqual(tomTatGiayToXe([d(0), d(94)], 30), { tone: "warn", text: "1 giấy sắp hết hạn trong 30 ngày" });
  assert.deepEqual(tomTatGiayToXe([d(null), d(94)], 30), { tone: "ok", text: "Giấy tờ còn hạn" });
  assert.deepEqual(tomTatGiayToXe([], 30), { tone: "muted", text: "Chưa có giấy tờ nào." });
});

test("bộ lọc danh sách xe: bốn nút Tất cả / Đang dùng / Bảo dưỡng / Ngừng, số đếm theo trạng thái", () => {
  assert.deepEqual(LOC_XE.map((l) => l.label), ["Tất cả", "Đang dùng", "Bảo dưỡng", "Ngừng"]);
  const vs = [{ status: "active" as const }, { status: "active" as const }, { status: "maintenance" as const }, { status: "retired" as const }];
  assert.deepEqual(LOC_XE.map((l) => demLocXe(vs, l.key)), [4, 2, 1, 1]);
  assert.deepEqual(NHAN_TRANG_THAI_XE, { active: "Đang dùng", maintenance: "Bảo dưỡng", retired: "Ngừng" });
});

test("thoiGianTuToken: đọc token --t-reveal (10s / 10000ms) → mili-giây; giá trị hỏng → mặc định", () => {
  assert.equal(thoiGianTuToken("10s"), 10_000);
  assert.equal(thoiGianTuToken(" 10s "), 10_000);
  assert.equal(thoiGianTuToken("2500ms"), 2_500);
  assert.equal(thoiGianTuToken(""), 10_000);
  assert.equal(thoiGianTuToken("abc"), 10_000);
  assert.equal(thoiGianTuToken("-3s"), 10_000);
});

test("duongDanDong: dòng xe → chi tiết xe; dòng người → hồ sơ ở Danh bạ (mở thẳng theo id)", () => {
  assert.equal(duongDanDong({ kind: "vehicle", targetId: "11111111-1111-4111-8111-111111111111" }), "/xe-chi-tiet?id=11111111-1111-4111-8111-111111111111");
  assert.equal(duongDanDong({ kind: "person", targetId: "22222222-2222-4222-8222-222222222222" }), "/parties?id=22222222-2222-4222-8222-222222222222");
});

test("coMucGiayToCuaToi: mọi nhân viên nội bộ có mục (R5); tài khoản mang quyền Đối tác KHÔNG có, kể cả lai (Ruling R18) — giao diện không gọi rồi hiện lỗi", () => {
  const ai = (...permissions: PermissionCode[]) => ({ id: "s-1", permissions });
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "SUPER_ADMIN", "INTERN", "DRIVER"] as const) assert.equal(coMucGiayToCuaToi(ai(p)), true, p);
  assert.equal(coMucGiayToCuaToi(ai("PARTNER")), false);
  for (const p of ["SALES", "ADMIN", "FIELD", "DRIVER"] as const) assert.equal(coMucGiayToCuaToi(ai(p, "PARTNER")), false, `${p}+PARTNER (lai)`);
  assert.equal(coMucGiayToCuaToi(ai()), false, "không quyền nào");
  // ADR-0048 D2: tài khoản chỉ Tài xế đối tác CÓ mục (ô party.document.view = own; LC-1b cấm kèm PARTNER nên holdsPartner sai).
  assert.equal(coMucGiayToCuaToi(ai("DRIVER_PARTNER")), true, "DRIVER_PARTNER");
  // Cùng hai điều kiện route GET /api/parties/documents/mine hỏi, trên cả 512 tập con quyền.
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const w = ai(...PERMISSION_CODES.filter((_, i) => mask & (1 << i)));
    assert.equal(coMucGiayToCuaToi(w), can(w, "party.document.view", { ownerId: w.id }) && !holdsPartner(w), w.permissions.join("+"));
  }
});

test("loiChao: “Chào” + tên gọi (từ cuối của họ tên), như Trang chủ", () => {
  assert.equal(loiChao("Nguyễn Văn Hùng"), "Chào Hùng");
  assert.equal(loiChao("  Hùng "), "Chào Hùng");
});
