// Luật hiển thị THUẦN của các màn tiến độ chuyến (bấm thay của văn phòng ở Chi tiết chuyến, Cuốc của tôi, Chuyến đang chạy, Xuất bến của tài xế) —
// src/shared/tien-do-man.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buocDiem, cauConKhach, cauTuChoiKhaiGio, giuTenKhach, goiYKhaiGio, ketThucDuoc, nhomCuoc, soHieuTaiDiemDon, tenNguoiDiKemCuaChuyen, sdtNguoiDiKemCuaChuyen, dichVuTaiDiemDon, chiSuatKhach, viecNguoiDiKem, thanDoiThuTu, doiThuTuDuoc, xayRaLucTu, type DiemVao, type SuatVao,
} from "./tien-do-man.ts";
import { vnLocalToMs } from "./vn-date.ts";

const ms = (ngay: string, gio: string) => vnLocalToMs(ngay, gio)!;

test("xayRaLucTu: 'HH:MM' → ISO có múi giờ; ngày = hôm qua / hôm nay / ngày mai, chọn cái GẦN lúc bấm nhất (giờ gõ nhầm hơi sau lúc bấm vẫn là hôm nay → máy chủ báo 'chưa tới' như bản vẽ 6d); sai khuôn → null", () => {
  const bay = ms("2026-09-30", "08:00");
  assert.equal(xayRaLucTu("07:31", bay), new Date(ms("2026-09-30", "07:31")).toISOString());
  assert.equal(xayRaLucTu("08:00", bay), new Date(bay).toISOString());
  assert.equal(xayRaLucTu("23:50", bay), new Date(ms("2026-09-29", "23:50")).toISOString(), "qua nửa đêm: chuyến chạy từ tối hôm qua");
  assert.equal(xayRaLucTu("08:20", bay), new Date(ms("2026-09-30", "08:20")).toISOString(), "20 phút SAU lúc bấm → hôm nay (tương lai — máy chủ từ chối TUONG_LAI)");
  assert.equal(xayRaLucTu("23:50", ms("2026-10-01", "00:10")), new Date(ms("2026-09-30", "23:50")).toISOString(), "00:10 khai 23:50 → hôm qua");
  assert.equal(xayRaLucTu("00:04", ms("2026-09-29", "23:59")), new Date(ms("2026-09-30", "00:04")).toISOString(), "23:59 gõ nhầm 00:04 → ngày mai (tương lai, máy chủ báo chưa tới) — không thành lùi gần một ngày");
  assert.equal(xayRaLucTu("7:31", bay), null);
  assert.equal(xayRaLucTu("", bay), null);
  assert.match(xayRaLucTu("07:31", bay)!, /Z$/);
});

test("goiYKhaiGio: 'Để nguyên là lúc bấm (HH:MM).' + 'Sớm nhất: HH:MM.' từ gioSomNhatKhai của máy chủ (không tự tính)", () => {
  const bay = ms("2026-09-30", "09:04");
  assert.equal(goiYKhaiGio({ ngay: "2026-09-30", gio: "08:25" }, bay, "2026-09-30"), "Để nguyên là lúc bấm (09:04). Sớm nhất: 08:25.");
  assert.equal(goiYKhaiGio(null, bay, "2026-09-30"), "Để nguyên là lúc bấm (09:04).");
  assert.equal(goiYKhaiGio({ ngay: "2026-09-29", gio: "23:40" }, bay, "2026-09-30"), "Để nguyên là lúc bấm (09:04). Sớm nhất: 23:40 29/09.");
});

test("cauTuChoiKhaiGio: câu từ chối theo mã + mốc gây chặn (bản vẽ 6d) — không tên người", () => {
  const bay = ms("2026-09-30", "09:04");
  const N = "2026-09-30";
  assert.equal(cauTuChoiKhaiGio({ maGio: ["TUONG_LAI"], somNhat: null, mocChan: null }, bay, N), "Giờ này chưa tới — bây giờ là 09:04.");
  assert.equal(
    cauTuChoiKhaiGio({ maGio: ["CHONG_CHUYEN_TRUOC"], somNhat: { ngay: N, gio: "08:25" }, mocChan: { loai: "CHUYEN_TRUOC", nhan: "Chuyến trước kết thúc", maChuyen: "CX-3009-02", gio: { ngay: N, gio: "08:25" } } }, bay, N),
    "Chuyến trước của xe hoặc tài xế (CX-3009-02) kết thúc lúc 08:25 — chọn từ 08:25 trở đi.",
  );
  assert.equal(
    cauTuChoiKhaiGio({ maGio: ["DAO_THU_TU"], somNhat: { ngay: N, gio: "07:31" }, mocChan: { loai: "SU_KIEN", nhan: "Đã tới điểm", maChuyen: null, gio: { ngay: N, gio: "07:31" } } }, bay, N),
    "Sai thứ tự: không thể sớm hơn “Đã tới điểm” (07:31) — chọn từ 07:31 trở đi.",
  );
  assert.equal(
    cauTuChoiKhaiGio({ maGio: ["LUI_QUA_KEP"], somNhat: { ngay: N, gio: "06:04" }, mocChan: { loai: "KEP", nhan: "Giới hạn khai lùi", maChuyen: null, gio: { ngay: N, gio: "06:04" } } }, bay, N),
    "Giờ khai lùi quá khoảng cho phép — chọn từ 06:04 trở đi.",
  );
  assert.equal(
    cauTuChoiKhaiGio({ maGio: ["TRUOC_MO_SUAT"], somNhat: { ngay: N, gio: "07:00" }, mocChan: { loai: "MO_SUAT", nhan: "Lúc xếp khách lên xe", maChuyen: null, gio: { ngay: N, gio: "07:00" } } }, bay, N),
    "Sớm hơn lúc xếp khách lên xe (07:00) — chọn từ 07:00 trở đi.",
  );
  assert.equal(cauTuChoiKhaiGio({ maGio: ["TRUOC_SUA_KE_HOACH"], somNhat: null, mocChan: null }, bay, N), "Giờ xe chạy sớm hơn lần sửa kế hoạch cuối của chuyến.");
  assert.equal(cauTuChoiKhaiGio({ maGio: ["MA_LA"], somNhat: null, mocChan: null }, bay, N), "Giờ khai không hợp lệ.", "mã lạ không lộ ra");
});

const d = (thuTu: number, loai: "PICKUP" | "DROPOFF", trangThai: DiemVao["trangThai"] = "PENDING"): DiemVao => ({
  id: `d${thuTu}`, thuTu, loai, tenNoi: `Nơi ${thuTu}`, gioHen: loai === "PICKUP" ? { ngay: "2026-09-30", gio: "07:30" } : null, gioXeToi: null, trangThai, soNguoi: 2, daToi: null,
});
const s = (id: string, diemLen: string, diemXuong: string, trangThai: SuatVao["trangThai"], ten?: string): SuatVao => ({
  id, loai: "PASSENGER", maDon: "TD-1", diemLen, diemXuong, trangThai, ...(ten ? { hoTen: ten, namSinh: 1990 } : {}), daDon: null, daTra: null,
});

test("buocDiem: nhãn điểm đón có giờ hẹn; giờ xe tới hiện thêm khi khác giờ hẹn (góp ý T5) — điểm trả giữ 'TRẢ'", () => {
  const g = (gio: string) => ({ ngay: "2026-09-30", gio });
  const diem: DiemVao[] = [
    { ...d(1, "PICKUP"), gioXeToi: g("07:20") },
    { ...d(2, "PICKUP"), gioXeToi: g("07:30") },
    { ...d(3, "PICKUP"), gioHen: null, gioXeToi: g("08:00") },
    { ...d(4, "PICKUP"), gioXeToi: { ngay: "2026-10-01", gio: "06:50" } },
    { ...d(5, "DROPOFF"), gioXeToi: g("09:00") },
  ];
  assert.deepEqual(buocDiem(diem, [], "PLANNED", "2026-09-30").map((x) => x.nhanLoai), [
    "ĐÓN · HẸN 07:30 · XE TỚI 07:20", "ĐÓN · HẸN 07:30", "ĐÓN · XE TỚI 08:00", "ĐÓN · HẸN 07:30 · XE TỚI 06:50 01/10", "TRẢ",
  ]);
});

test("buocDiem: điểm đón chưa tới → nút 'Đã tới', chưa có nút khách; đã tới → khách chờ có Đã đón / Vắng / Khách đã huỷ, khách vắng còn 'Đã đón'; điểm trả → 'Đã trả' khi còn khách trên xe", () => {
  // Khách e lên ở điểm 2 (chưa tới) xuống ở điểm 4 — điểm trả 3 không có khách chờ lên ở điểm chưa tới (ca đó: bài HT-16 bên dưới).
  const diem = [d(1, "PICKUP", "ARRIVED"), d(2, "PICKUP"), d(3, "DROPOFF"), d(4, "DROPOFF")];
  const suat = [s("a", "d1", "d3", "BOARDED", "Nguyễn Thị Lan"), s("b", "d1", "d3", "WAITING", "Lê Hoàng Yến"), s("c", "d1", "d3", "NO_SHOW"), s("e", "d2", "d4", "WAITING")];
  const b = buocDiem(diem, suat, "RUNNING", "2026-09-30");
  assert.deepEqual(b.map((x) => [x.so, x.nhanLoai, x.nut?.nhan ?? null, x.khach.length]), [["1", "ĐÓN · HẸN 07:30", null, 3], ["2", "ĐÓN · HẸN 07:30", "Đã tới", 1], ["3", "TRẢ", "Đã trả", 0], ["4", "TRẢ", null, 0]]);
  assert.equal(b[2]!.choDon, null, "khách b chờ ở điểm ĐÃ TỚI — không chặn (đánh dấu Vắng / Đã đón ở đó trước)");
  assert.deepEqual(b[0]!.khach.map((k) => [k.ten, k.ketQua, k.nut]), [["Nguyễn Thị Lan", "Đã đón", []], ["Lê Hoàng Yến", null, ["don", "vang", "khach-huy"]], ["Khách 3", "Vắng", ["don"]]]);
  assert.deepEqual(b[1]!.khach.map((k) => k.nut), [[]], "điểm chưa tới: chưa đánh dấu khách");
  assert.equal(b[1]!.nut!.goiY, "Bấm khi xe tới nơi, rồi đánh dấu từng khách.");
  assert.deepEqual([b[2]!.nut!.lenh, b[2]!.nut!.goiY, b[2]!.traCho], ["tra-het", "Trả hết khách đang trên xe ở điểm này.", ["a"]]);
  assert.equal(b[0]!.trangThaiHien, "dang", "điểm đã tới còn khách chờ = điểm đang làm");
  assert.equal(b[1]!.trangThaiHien, "sau");
  // Chuyến chưa chạy / đã xong: không nút nào.
  assert.ok(buocDiem(diem, suat, "PLANNED", "2026-09-30").every((x) => x.nut === null && x.khach.every((k) => k.nut.length === 0)));
});

test("buocDiem: điểm trả đã tới, còn khách trên xe → vẫn 'Đã trả' (trả nốt); hết khách → không nút; điểm bỏ qua → không nút", () => {
  const diem = [d(1, "PICKUP", "DONE"), d(2, "DROPOFF", "ARRIVED"), d(3, "DROPOFF", "SKIPPED")];
  const b = buocDiem(diem, [s("a", "d1", "d2", "BOARDED"), s("b", "d1", "d2", "DROPPED")], "RUNNING", "2026-09-30");
  assert.deepEqual(b[1]!.nut && [b[1]!.nut.lenh, b[1]!.traCho], ["tra-het", ["a"]]);
  assert.equal(buocDiem(diem, [s("b", "d1", "d2", "DROPPED")], "RUNNING", "2026-09-30")[1]!.nut, null);
  assert.equal(b[2]!.nut, null);
  assert.equal(b[2]!.so, "–");
});

test("giuTenKhach (GA-55): phản hồi lệnh không có tên → giữ tên đã có theo id suất; suất mới / đã có tên giữ nguyên; không có dữ liệu cũ → nguyên phản hồi", () => {
  const cu = { suat: [s("a", "d1", "d2", "WAITING", "Nguyễn Thị Lan"), s("b", "d1", "d2", "WAITING", "Lê Hoàng Yến")] };
  const moi = { x: 1, suat: [s("a", "d1", "d2", "BOARDED"), s("c", "d1", "d2", "WAITING"), s("b", "d1", "d2", "WAITING", "Tên Mới")] };
  const r = giuTenKhach(moi, cu);
  assert.deepEqual(r.suat.map((x) => [x.id, x.trangThai, x.hoTen ?? null, x.namSinh ?? null]), [["a", "BOARDED", "Nguyễn Thị Lan", 1990], ["c", "WAITING", null, null], ["b", "WAITING", "Tên Mới", 1990]]);
  assert.equal(r.x, 1);
  assert.equal(giuTenKhach(moi, null), moi);
});

test("ketThucDuoc: được bấm 'Kết thúc chuyến' khi không còn khách chờ đón / đang trên xe", () => {
  assert.equal(ketThucDuoc([s("a", "d1", "d2", "DROPPED"), s("b", "d1", "d2", "NO_SHOW"), s("c", "d1", "d2", "CANCELLED_AT_STOP")]), true);
  assert.equal(ketThucDuoc([s("a", "d1", "d2", "BOARDED")]), false);
  assert.equal(ketThucDuoc([s("a", "d1", "d2", "WAITING")]), false);
});

test("cauConKhach: 409 con_khach_chua_xong → câu có số + gợi ý 'Kết thúc gián đoạn'", () => {
  assert.equal(cauConKhach({ conSuat: 3, conDiem: 2, goiY: "KET_THUC_GIAN_DOAN" }), "Còn 3 khách chưa xong ở 2 điểm. Nếu xe không đi tiếp được, dùng “Kết thúc gián đoạn”.");
  assert.equal(cauConKhach({ conSuat: 1, conDiem: 1 }), "Còn 1 khách chưa xong ở 1 điểm.");
});

test("nhomCuoc: 'Hôm nay' + 'Ngày mai' + 'Ngày kia' (luôn có ba nhóm, trống vẫn hiện — góp ý T3), theo giờ xuất bến; thẻ: số điểm đón / trả, trạng thái, điều kiện còn thiếu '(văn phòng lo)'", () => {
  const it = (id: string, ngay: string, gio: string, x: Partial<{ trangThai: string; dieuKienConThieu: { ma: string; loiNhan: string; aiXuLy: "VAN_PHONG" }[] }> = {}) => ({
    id, ma: `CX-${id}`, gioXuatBen: { ngay, gio }, trangThai: (x.trangThai ?? "PLANNED") as "PLANNED", trangThaiNhan: "Đã lên kế hoạch", bienSo: "79B-123.45", soKhach: 9, soDiemDon: 2, soDiemTra: 1,
    dieuKienConThieu: x.dieuKienConThieu ?? [],
  });
  const g = nhomCuoc([it("b", "2026-09-30", "09:00", { dieuKienConThieu: [{ ma: "THIEU_TEN", loiNhan: "Chưa đủ tên khách: TD-1 thiếu 2 tên", aiXuLy: "VAN_PHONG" }] }), it("a", "2026-09-30", "06:40", { trangThai: "RUNNING" })], "2026-09-30");
  assert.deepEqual(g.map((x) => [x.tieuDe, x.ngay, x.the.length]), [["Hôm nay", "Thứ Tư 30/09", 2], ["Ngày mai", "Thứ Năm 01/10", 0], ["Ngày kia", "Thứ Sáu 02/10", 0]]);
  const ba = nhomCuoc([it("c", "2026-10-02", "07:00"), it("d", "2026-10-03", "07:00")], "2026-09-30");
  assert.deepEqual(ba.map((x) => x.the.map((t) => t.ma)), [[], [], ["CX-c"]], "ngày kia vào nhóm thứ ba; ngày sau nữa không hiện");
  assert.deepEqual(g[0]!.the.map((t) => [t.gio, t.ma, t.chip.nhan, t.dong, t.canhBao, t.moChay]), [
    ["06:40", "CX-a", "Đang chạy", "79B-123.45 · 9 khách · 2 điểm đón · 1 điểm trả", [], true],
    ["09:00", "CX-b", "Bị giữ", "79B-123.45 · 9 khách · 2 điểm đón · 1 điểm trả", ["Chưa đủ tên khách: TD-1 thiếu 2 tên (văn phòng lo)"], false],
  ]);
  // Đợt 5 A-1b (chủ duyệt 5/10, chỉ tài xế công ty): tự bổ sung tên được ⇒ thẻ HÔM NAY chỉ chỗ tự làm; thẻ ngày khác vẫn "(văn phòng lo)" (khối chỉ có trong ngày chạy).
  const thieuTen = { dieuKienConThieu: [{ ma: "THIEU_TEN", loiNhan: "Chưa đủ tên khách: TD-1 thiếu 2 tên", aiXuLy: "VAN_PHONG" as const }] };
  const tu = nhomCuoc([it("b", "2026-09-30", "09:00", thieuTen), it("e", "2026-10-01", "09:00", thieuTen)], "2026-09-30", { tuBoSungTen: true });
  assert.deepEqual(tu.map((x) => x.the.map((t) => t.canhBao)), [
    [["Chưa đủ tên khách: TD-1 thiếu 2 tên (bấm Bổ sung tên ở khối Suất của khách, hoặc văn phòng lo)"]],
    [["Chưa đủ tên khách: TD-1 thiếu 2 tên (văn phòng lo)"]],
    [],
  ]);
});

test("nhomCuoc HT-24 (kiểm theo vai 2/10): chuyến ĐANG CHẠY có ngày xuất bến khác ba ngày đang xem (qua nửa đêm, hoặc xuất bến sớm) vẫn vào 'Hôm nay', đứng ĐẦU, kèm nhãn 'Xuất bến dd/mm'", () => {
  const it = (id: string, ngay: string, gio: string, trangThai = "PLANNED") => ({
    id, ma: `CX-${id}`, gioXuatBen: { ngay, gio }, trangThai: trangThai as "PLANNED", trangThaiNhan: "Đã lên kế hoạch", bienSo: "79B-123.45", soKhach: 2, soDiemDon: 1, soDiemTra: 1,
    dieuKienConThieu: [],
  });
  // Tái hiện của báo cáo: CX-0210-03 ngày chạy 02/10 23:40, đang chạy; mở /cuoc lúc 00:01 ngày 03/10.
  const g = nhomCuoc([it("x", "2026-10-02", "23:40", "RUNNING")], "2026-10-03");
  assert.deepEqual(g.map((x) => x.the.map((t) => t.ma)), [["CX-x"], [], []], "trước đây trả [[],[],[]] — chuyến đang chở khách biến mất");
  assert.deepEqual([g[0]!.the[0]!.moChay, g[0]!.the[0]!.chip.nhan, g[0]!.the[0]!.nhanNgay], [true, "Đang chạy", "Xe chạy 02/10"]);
  // Đứng đầu nhóm, trước chuyến hôm nay giờ sớm hơn; chuyến đã KẾT THÚC của hôm qua vẫn không hiện.
  const h2 = nhomCuoc([it("sang", "2026-10-03", "05:00"), it("dem", "2026-10-02", "23:40", "RUNNING"), it("cu", "2026-10-02", "20:00", "ENDED")], "2026-10-03");
  assert.deepEqual(h2[0]!.the.map((t) => [t.ma, t.nhanNgay ?? null]), [["CX-dem", "Xe chạy 02/10"], ["CX-sang", null]]);
  // Chuyến đang chạy CÙNG ngày không có nhãn ngày (giữ nguyên thẻ cũ).
  assert.equal(nhomCuoc([it("a", "2026-10-03", "06:40", "RUNNING")], "2026-10-03")[0]!.the[0]!.nhanNgay, undefined);
  // Xuất bến sớm chuyến 5 ngày sau (HT-03): vẫn thấy ở 'Hôm nay' để còn bấm tiếp / kết thúc — không trốn khỏi danh sách.
  assert.deepEqual(nhomCuoc([it("som", "2026-10-08", "07:00", "RUNNING")], "2026-10-03").map((x) => x.the.map((t) => t.nhanNgay)), [["Xe chạy 08/10"], [], []]);
  // Chuyến đang chạy thuộc ngày mai / ngày kia vẫn ở đúng nhóm của nó (không đếm hai lần).
  assert.deepEqual(nhomCuoc([it("m", "2026-10-04", "07:00", "RUNNING")], "2026-10-03").map((x) => x.the.length), [0, 1, 0]);
});

test("soHieuTaiDiemDon (nợ nhỏ 2026-10-01, ADR-0055 C3): số hiệu chuyến bay của các suất LÊN xe ở điểm — không trùng, theo thứ tự suất; bỏ null, bỏ suất lên điểm khác", () => {
  const s = (id: string, diemLen: string | null, soHieuChuyenBay: string | null) => ({ id, maDon: "TD1", diemLen, diemXuong: "D9", trangThai: "WAITING" as const, daDon: null, daTra: null, soHieuChuyenBay });
  const ds = [s("1", "P1", "VN1553"), s("2", "P1", null), s("3", "P1", "VN1553"), s("4", "P2", "QH201"), s("5", "P1", "VJ778")];
  assert.deepEqual(soHieuTaiDiemDon(ds, "P1"), ["VN1553", "VJ778"]);
  assert.deepEqual(soHieuTaiDiemDon(ds, "P2"), ["QH201"]);
  assert.deepEqual(soHieuTaiDiemDon(ds, "D9"), []);
  assert.deepEqual(soHieuTaiDiemDon([], "P1"), []);
});

test("thanDoiThuTu (route 29 / 39): đổi chỗ với điểm CHƯA TỚI liền kề, giữ tập số thứ tự cũ; điểm đã tới bị bỏ qua; đầu / cuối / điểm không chờ → null", () => {
  const d = [
    { id: "a", thuTu: 1, trangThai: "ARRIVED" as const },
    { id: "b", thuTu: 2, trangThai: "PENDING" as const },
    { id: "c", thuTu: 4, trangThai: "PENDING" as const },
    { id: "e", thuTu: 3, trangThai: "SKIPPED" as const },
    { id: "f", thuTu: 5, trangThai: "PENDING" as const },
  ];
  assert.deepEqual(thanDoiThuTu(d, "c", 1), { diem: [{ id: "b", thuTu: 2 }, { id: "f", thuTu: 4 }, { id: "c", thuTu: 5 }] });
  assert.deepEqual(thanDoiThuTu(d, "c", -1), { diem: [{ id: "c", thuTu: 2 }, { id: "b", thuTu: 4 }, { id: "f", thuTu: 5 }] });
  assert.equal(thanDoiThuTu(d, "b", -1), null, "đầu danh sách chờ");
  assert.equal(thanDoiThuTu(d, "f", 1), null, "cuối danh sách chờ");
  assert.equal(thanDoiThuTu(d, "a", 1), null, "điểm đã tới — Review Focus 4: tài xế vừa bấm Đã tới");
});

test("buocDiem HT-16 (ADR-0096 Đ1.4 — CÙNG luật diemDonChuaToiCuaDiemTra của máy chủ): điểm trả CHƯA TỚI còn khách chờ lên ở điểm đón chưa tới → không nút 'Đã trả', câu chỉ đường; điểm đón đã tới → hiện nút", () => {
  const suat = [s("a", "d1", "d3", "BOARDED"), s("e", "d2", "d3", "WAITING")];
  const truoc = buocDiem([d(1, "PICKUP", "DONE"), d(2, "PICKUP"), d(3, "DROPOFF")], suat, "RUNNING", "2026-09-30");
  assert.equal(truoc[2]!.nut, null, "máy chủ sẽ 409 'Đã tới' điểm trả này — ẩn nút");
  assert.equal(truoc[2]!.choDon, "Còn khách chưa đón ở điểm 2 — bấm “Đã tới” ở điểm đón trước.");
  assert.deepEqual(truoc[2]!.traCho, ["a"], "vẫn biết khách sẽ trả ở đây");
  const sau = buocDiem([d(1, "PICKUP", "DONE"), d(2, "PICKUP", "ARRIVED"), d(3, "DROPOFF")], suat, "RUNNING", "2026-09-30");
  assert.equal(sau[2]!.nut?.lenh, "tra-het");
  assert.equal(sau[2]!.choDon, null);
  assert.equal(buocDiem([d(1, "PICKUP", "DONE"), d(2, "PICKUP"), d(3, "DROPOFF")], suat, "PLANNED", "2026-09-30")[2]!.choDon, null, "chuyến chưa chạy: không câu");
});

test("doiThuTuDuoc (C30 — ADR-0096 Đ1.3c, CÙNG luật daoMoiSauDoi của máy chủ): ↑ / ↓ làm khách CHỜ LÊN bị đảo MỚI → daoMoi (giao diện khoá nút); đảo cũ không khoá; khách đã đón không tính", () => {
  const diem = [
    { id: "p1", thuTu: 1, trangThai: "PENDING" as const },
    { id: "p2", thuTu: 2, trangThai: "PENDING" as const },
    { id: "t3", thuTu: 3, trangThai: "PENDING" as const },
  ];
  const cho = [{ diemLen: "p2", diemXuong: "t3", trangThai: "WAITING" as const }];
  assert.deepEqual(doiThuTuDuoc(diem, cho, "t3", -1), { than: { diem: [{ id: "p1", thuTu: 1 }, { id: "t3", thuTu: 2 }, { id: "p2", thuTu: 3 }] }, daoMoi: true }, "đưa điểm trả lên trước điểm đón");
  assert.deepEqual(doiThuTuDuoc(diem, cho, "p1", 1).daoMoi, false, "đổi hai điểm đón");
  assert.deepEqual(doiThuTuDuoc(diem, [{ ...cho[0]!, trangThai: "BOARDED" as const }], "t3", -1).daoMoi, false, "khách đã lên xe không bị đảo");
  assert.deepEqual(doiThuTuDuoc(diem, cho, "t3", 1), { than: null, daoMoi: false }, "cuối danh sách");
  const daoCu = [{ id: "t1", thuTu: 1, trangThai: "PENDING" as const }, { id: "p2", thuTu: 2, trangThai: "PENDING" as const }, { id: "p3", thuTu: 3, trangThai: "PENDING" as const }];
  assert.equal(doiThuTuDuoc(daoCu, [{ diemLen: "p2", diemXuong: "t1", trangThai: "WAITING" as const }], "t1", 1).daoMoi, false, "sửa dần đảo cũ — không khoá");
});

test("tenNguoiDiKemCuaChuyen: chỉ tên các suất người đi kèm, bỏ trống, không trùng; chuyến không có thì rỗng", () => {
  assert.deepEqual(tenNguoiDiKemCuaChuyen([]), []);
  assert.deepEqual(tenNguoiDiKemCuaChuyen([{ tenNguoiDiKem: "Lan" }, {}, { tenNguoiDiKem: "" }, { tenNguoiDiKem: "Hùng" }, { tenNguoiDiKem: "Lan" }]), ["Lan", "Hùng"]);
});

test("chiSuatKhach: bỏ suất người đi kèm (theo `loai`) — chỉ để ĐẾM khách; không dùng để xét kết thúc", () => {
  const suat = [{ id: "k1", loai: "PASSENGER" as const }, { id: "c1", loai: "CREW" as const }, { id: "k2" }];
  assert.deepEqual(chiSuatKhach(suat).map((x) => x.id), ["k1", "k2"]);
});

test("ketThucDuoc khớp kiemKetThuc của máy chủ: người đi kèm (CREW) còn WAITING / BOARDED thì CHƯA kết thúc thường được; xuống xe (DROPPED) rồi mới được", () => {
  const khach = { id: "k1", loai: "PASSENGER" as const, trangThai: "DROPPED" as const };
  assert.equal(ketThucDuoc([khach, { id: "c1", loai: "CREW" as const, trangThai: "WAITING" as const }]), false, "CREW chưa lên xe");
  assert.equal(ketThucDuoc([khach, { id: "c1", loai: "CREW" as const, trangThai: "BOARDED" as const }]), false, "CREW đang trên xe");
  assert.equal(ketThucDuoc([khach, { id: "c1", loai: "CREW" as const, trangThai: "DROPPED" as const }]), true, "CREW đã xuống");
});

test("viecNguoiDiKem: WAITING → 'Đã lên xe' (don); BOARDED → 'Đã xuống' (tra); xong → không nút; bỏ suất khách", () => {
  const r = viecNguoiDiKem([
    { id: "k", loai: "PASSENGER", trangThai: "WAITING" },
    { id: "a", loai: "CREW", trangThai: "WAITING", tenNguoiDiKem: "Lan" },
    { id: "b", loai: "CREW", trangThai: "BOARDED", tenNguoiDiKem: "Hùng" },
    { id: "c", loai: "CREW", trangThai: "DROPPED", tenNguoiDiKem: "Mai" },
  ]);
  assert.deepEqual(r, [
    { id: "a", ten: "Lan", lenh: "don", nhan: "Đã lên xe", trangThai: "WAITING" },
    { id: "b", ten: "Hùng", lenh: "tra", nhan: "Đã xuống", trangThai: "BOARDED" },
    { id: "c", ten: "Mai", lenh: null, nhan: null, trangThai: "DROPPED" },
  ]);
});

// ADR-0139: màn tài xế công ty trong ngày chạy — số gọi người đi kèm và tên dịch vụ dưới điểm đón. Máy chủ quyết có khoá hay không; hai hàm chỉ gom.
test("sdtNguoiDiKemCuaChuyen: người đi kèm CÓ số (theo thứ tự suất, không trùng tên); không số thì bỏ; suất khách bỏ", () => {
  assert.deepEqual(sdtNguoiDiKemCuaChuyen([
    { tenNguoiDiKem: "Hướng Dẫn", sdtNguoiDiKem: "0913 555 666" },
    { tenNguoiDiKem: "Không Số" },
    { tenNguoiDiKem: "Hướng Dẫn", sdtNguoiDiKem: "0913 555 666" },
    { sdtNguoiDiKem: "0999" },
  ]), [{ ten: "Hướng Dẫn", sdt: "0913 555 666" }]);
  assert.deepEqual(sdtNguoiDiKemCuaChuyen([]), []);
});
test("dichVuTaiDiemDon: tên dịch vụ của các suất LÊN xe ở điểm — không trùng, theo thứ tự suất; bỏ suất không có tên dịch vụ, bỏ suất lên điểm khác", () => {
  assert.deepEqual(dichVuTaiDiemDon([
    { diemLen: "d1", tenDichVu: "Tour đảo" }, { diemLen: "d1", tenDichVu: "Vinwonders" }, { diemLen: "d1", tenDichVu: "Tour đảo" },
    { diemLen: "d1" }, { diemLen: "d2", tenDichVu: "Lặn biển" },
  ], "d1"), ["Tour đảo", "Vinwonders"]);
});
