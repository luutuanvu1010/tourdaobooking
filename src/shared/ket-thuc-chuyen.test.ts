// C57 (đánh giá ERP 7/10): "Kết thúc chuyến" ở màn tài xế phải KHỚP máy chủ — MỘT hàm thuần `xetKetThuc` cho cả hai bên. Bài này ép: (1) bảng ca cho
// ra cùng kết quả ở `kiemKetThuc` (máy chủ, LC-16) và `xetKetThuc` (màn); (2) ca cả đoàn vắng mà điểm trả còn PENDING: máy chủ từ chối, màn cũng phải khoá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { xetKetThuc } from "./ket-thuc-chuyen.ts";
import { kiemKetThuc } from "./dieu-phoi-kiem.ts";
import { ketThucDuoc } from "./tien-do-man.ts";
import type { DiemVao as DiemMayChu, SuatVao as SuatMayChu } from "./dieu-phoi-kieu.ts";

type TTSuat = SuatMayChu["trangThai"];
type TTDiem = DiemMayChu["trangThai"];
const suat = (id: string, trangThai: TTSuat, mo = true): SuatMayChu => ({ id, tripId: "t", loai: "PASSENGER", legId: null, personKey: null, crewPartyId: null, boardStopId: "d1", alightStopId: "d2", trangThai, mo, moTuMs: 0 });
const diem = (id: string, trangThai: TTDiem, loai: "PICKUP" | "DROPOFF" = "PICKUP"): DiemMayChu => ({ id, tripId: "t", seq: 1, loai, trangThai, placeKey: `L:${id}`, gioXeToiMs: null });

const CA: { ten: string; suat: SuatMayChu[]; diem: DiemMayChu[]; duoc: boolean; conSuat: number; conDiem: number }[] = [
  { ten: "mọi suất đã trả, mọi điểm xong", suat: [suat("a", "DROPPED"), suat("b", "DROPPED")], diem: [diem("d1", "DONE"), diem("d2", "DONE", "DROPOFF")], duoc: true, conSuat: 0, conDiem: 0 },
  { ten: "CẢ ĐOÀN VẮNG: điểm đón xong nhưng điểm trả còn PENDING (C57) → chưa kết thúc thường được", suat: [suat("a", "NO_SHOW"), suat("b", "NO_SHOW")], diem: [diem("d1", "DONE"), diem("d2", "PENDING", "DROPOFF")], duoc: false, conSuat: 0, conDiem: 1 },
  { ten: "cả đoàn vắng, điểm trả đã ghi 'đã tới' rồi tự xong → được", suat: [suat("a", "NO_SHOW")], diem: [diem("d1", "DONE"), diem("d2", "DONE", "DROPOFF")], duoc: true, conSuat: 0, conDiem: 0 },
  { ten: "điểm trả đã tới (ARRIVED) nhưng chưa xong", suat: [suat("a", "DROPPED")], diem: [diem("d1", "DONE"), diem("d2", "ARRIVED", "DROPOFF")], duoc: false, conSuat: 0, conDiem: 1 },
  { ten: "còn khách chờ đón và khách trên xe", suat: [suat("a", "WAITING"), suat("b", "BOARDED"), suat("c", "DROPPED")], diem: [diem("d1", "ARRIVED"), diem("d2", "PENDING", "DROPOFF")], duoc: false, conSuat: 2, conDiem: 2 },
  { ten: "điểm bỏ qua / đã chuyển không tính", suat: [suat("a", "CANCELLED_AT_STOP")], diem: [diem("d1", "SKIPPED"), diem("d2", "MOVED", "DROPOFF")], duoc: true, conSuat: 0, conDiem: 0 },
  { ten: "suất đã đóng (mo = false) không tính", suat: [suat("a", "WAITING", false), suat("b", "DROPPED")], diem: [diem("d1", "DONE")], duoc: true, conSuat: 0, conDiem: 0 },
];

test("C57: xetKetThuc (màn) và kiemKetThuc (máy chủ, LC-16) cho CÙNG kết quả trên bảng ca", () => {
  for (const c of CA) {
    const may = kiemKetThuc({ suat: c.suat, diem: c.diem });
    const man = xetKetThuc({ suat: c.suat.filter((s) => s.mo), diem: c.diem }); // DTO tài xế chỉ có suất đang mở
    assert.deepEqual(man, may, c.ten);
    assert.equal(man.duoc, c.duoc, c.ten);
    if (!man.duoc) assert.deepEqual([man.conSuat, man.conDiem, man.goiY], [c.conSuat, c.conDiem, "KET_THUC_GIAN_DOAN"], c.ten);
  }
});

test("C57: hàm cũ ketThucDuoc chỉ nhìn khách nên SAI ở ca cả đoàn vắng (ghi lại lỗi để màn không dùng nó cho nút Kết thúc nữa)", () => {
  const ca = CA[1]!;
  assert.equal(ketThucDuoc(ca.suat), true, "hàm cũ: sáng nút");
  assert.equal(xetKetThuc({ suat: ca.suat, diem: ca.diem }).duoc, false, "hàm chung: khoá, khớp máy chủ");
});

test("xetKetThuc nhận kiểu hẹp (chỉ trangThai) — đúng hình DTO tài xế", () => {
  assert.deepEqual(xetKetThuc({ suat: [{ trangThai: "DROPPED" }], diem: [{ trangThai: "DONE" }] }), { duoc: true });
  assert.deepEqual(xetKetThuc({ suat: [{ trangThai: "BOARDED" }], diem: [] }), { duoc: false, goiY: "KET_THUC_GIAN_DOAN", conSuat: 1, conDiem: 0 });
});
