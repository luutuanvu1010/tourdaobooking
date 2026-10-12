// C54 + C53 (đánh giá ERP 7/10): màn tài xế đang chạy chia điểm thành "Điểm kế tiếp" / "Các điểm sau" / "Đã xong" và chọn MỘT nút chính dính đáy.
// Hàm thuần — giao diện chỉ vẽ. Dữ liệu dựng bằng `buocDiem` thật (cùng luật HT-16 như máy chủ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buocDiem, type DiemVao, type SuatVao } from "./tien-do-man.ts";
import { nhomDiemChay, viecChinh } from "./diem-ke-tiep.ts";

const diem = (id: string, thuTu: number, loai: "PICKUP" | "DROPOFF", trangThai: DiemVao["trangThai"], tenNoi = `Nơi ${id}`): DiemVao =>
  ({ id, thuTu, loai, tenNoi, gioHen: loai === "PICKUP" ? { ngay: "2026-10-12", gio: "07:30" } : null, gioXeToi: null, trangThai, soNguoi: 2, daToi: null });
const suat = (id: string, diemLen: string, diemXuong: string, trangThai: SuatVao["trangThai"]): SuatVao => ({ id, loai: "PASSENGER", maDon: "TD1", diemLen, diemXuong, trangThai, daDon: null, daTra: null });
const buoc = (d: DiemVao[], s: SuatVao[]) => buocDiem(d, s, "RUNNING", "2026-10-12");

test("nhomDiemChay: điểm đang làm dở (đã tới, còn khách) đứng trước điểm chưa tới; điểm xong / bỏ qua gom vào 'xong'", () => {
  const b = buoc(
    [diem("p1", 1, "PICKUP", "DONE"), diem("p2", 2, "PICKUP", "PENDING"), diem("p3", 3, "PICKUP", "ARRIVED"), diem("p4", 4, "PICKUP", "SKIPPED"), diem("t", 5, "DROPOFF", "PENDING")],
    [suat("a", "p1", "t", "BOARDED"), suat("b", "p2", "t", "WAITING"), suat("c", "p3", "t", "WAITING")],
  );
  const n = nhomDiemChay(b);
  assert.equal(n.keTiep?.diem.id, "p3", "đang đứng ở p3");
  assert.deepEqual(n.sau.map((x) => x.diem.id), ["p2", "t"]);
  assert.deepEqual(n.xong.map((x) => x.diem.id), ["p1", "p4"]);
});

test("nhomDiemChay: không điểm nào đang làm dở → điểm chưa tới đầu tiên theo thứ tự; hết việc → keTiep null", () => {
  const b = buoc([diem("p1", 1, "PICKUP", "PENDING"), diem("t", 2, "DROPOFF", "PENDING")], [suat("a", "p1", "t", "WAITING")]);
  assert.equal(nhomDiemChay(b).keTiep?.diem.id, "p1");
  const het = nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "DONE"), diem("t", 2, "DROPOFF", "DONE")], [suat("a", "p1", "t", "DROPPED")]));
  assert.equal(het.keTiep, null);
  assert.equal(het.sau.length, 0);
  assert.equal(het.xong.length, 2);
});

test("viecChinh: điểm đón chưa tới → 'Đã tới'; đã tới còn khách chờ → 'Đã đón N khách' (chỉ khách đang CHỜ, không khách Vắng)", () => {
  const chua = viecChinh(nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "PENDING"), diem("t", 2, "DROPOFF", "PENDING")], [suat("a", "p1", "t", "WAITING")])), false);
  assert.deepEqual(chua && [chua.loai, chua.nhan], ["da-toi", "Đã tới"]);
  const toi = viecChinh(
    nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "ARRIVED"), diem("t", 2, "DROPOFF", "PENDING")], [suat("a", "p1", "t", "WAITING"), suat("b", "p1", "t", "WAITING"), suat("c", "p1", "t", "NO_SHOW"), suat("d", "p1", "t", "BOARDED")])),
    false,
  );
  assert.equal(toi?.loai, "don-tat-ca");
  if (toi?.loai === "don-tat-ca") {
    assert.deepEqual(toi.suatIds, ["a", "b"]);
    assert.equal(toi.nhan, "Đã đón 2 khách");
  }
});

test("viecChinh: điểm trả còn khách trên xe → 'Đã trả'; điểm trả không còn ai (cả đoàn vắng) vẫn 'Đã trả' (lối ra HT-02)", () => {
  const tra = viecChinh(nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "DONE"), diem("t", 2, "DROPOFF", "PENDING")], [suat("a", "p1", "t", "BOARDED")])), false);
  assert.deepEqual(tra && [tra.loai, tra.nhan], ["tra-het", "Đã trả"]);
  const vang = viecChinh(nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "DONE"), diem("t", 2, "DROPOFF", "PENDING")], [suat("a", "p1", "t", "NO_SHOW")])), false);
  assert.equal(vang?.loai, "tra-het");
});

test("viecChinh: HT-16 — điểm trả chưa tới mà còn khách chờ ở điểm đón chưa tới: nút chính là 'Đã tới' ở điểm đón, không phải 'Đã trả'", () => {
  const b = buoc([diem("t", 1, "DROPOFF", "PENDING"), diem("p1", 2, "PICKUP", "PENDING")], [suat("a", "p1", "t", "WAITING")]);
  const n = nhomDiemChay(b);
  assert.equal(n.keTiep?.diem.id, "t", "theo thứ tự điểm trả đứng trước");
  assert.equal(n.keTiep?.nut, null, "HT-16: không có nút 'Đã trả'");
  const v = viecChinh(n, false);
  assert.equal(v?.loai, "da-toi", "nút chính chuyển sang điểm đón còn khách");
  if (v?.loai === "da-toi") assert.equal(v.buoc.diem.id, "p1");
});

test("viecChinh: hết điểm và máy chủ cho kết thúc → 'Kết thúc chuyến'; hết điểm mà chưa được (còn khách) → không nút chính; còn điểm thì nút điểm thắng", () => {
  const xong = nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "DONE"), diem("t", 2, "DROPOFF", "DONE")], [suat("a", "p1", "t", "DROPPED")]));
  assert.deepEqual(viecChinh(xong, true), { loai: "ket-thuc", nhan: "Kết thúc chuyến" });
  assert.equal(viecChinh(xong, false), null);
  const con = nhomDiemChay(buoc([diem("p1", 1, "PICKUP", "PENDING")], [suat("a", "p1", "t", "WAITING")]));
  assert.equal(viecChinh(con, true)?.loai, "da-toi");
});
