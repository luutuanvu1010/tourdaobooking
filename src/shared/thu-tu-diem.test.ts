// Bài của luật thứ tự điểm dừng (HT-01, kiểm theo vai 2/10 — lộ trình 3/10 V1.2): sắp lại điểm CHƯA TỚI để mọi điểm đón của một suất đứng trước điểm trả
// của suất đó, giữ thứ tự tương đối còn lại; phát hiện suất còn "trả trước đón" (ADR-0096 Đ1: cổng xuất bến giữ — LC-19), suất bị đảo mới do lệnh đổi thứ tự,
// điểm đón chưa tới của điểm trả (Đ1.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { daoMoiSauDoi, diemDonChuaToiCuaDiemTra, sapDonTruocTra, suatTraTruocDon, type DiemThuTu } from "./thu-tu-diem.ts";

const d = (id: string, seq: number, dangCho = true): DiemThuTu => ({ id, seq, dangCho });
const s = (lenId: string | null, xuongId: string | null) => ({ diemLen: lenId, diemXuong: xuongId });
const theoSeq = (ds: readonly DiemThuTu[], doi: ReadonlyMap<string, number>) =>
  ds.map((x) => ({ id: x.id, seq: doi.get(x.id) ?? x.seq })).sort((a, b) => a.seq - b.seq).map((x) => x.id);

test("sapDonTruocTra: tái hiện HT-01 — [ĐÓN A, TRẢ Bến tàu, ĐÓN B] với hai đoàn cùng xuống Bến tàu → [ĐÓN A, ĐÓN B, TRẢ]", () => {
  const diem = [d("donA", 1), d("tra", 2), d("donB", 3)];
  const doi = sapDonTruocTra(diem, [s("donA", "tra"), s("donB", "tra")]);
  assert.deepEqual(theoSeq(diem, doi), ["donA", "donB", "tra"]);
  assert.deepEqual([...doi.entries()].sort(), [["donB", 2], ["tra", 3]], "chỉ trả điểm ĐỔI số; dùng lại tập số thứ tự cũ {1,2,3}");
});

test("sapDonTruocTra: đã đúng thứ tự → không đổi gì; giữ thứ tự tương đối của điểm không ràng buộc", () => {
  assert.equal(sapDonTruocTra([d("a", 1), d("b", 2), d("t", 3)], [s("a", "t"), s("b", "t")]).size, 0);
  // Hai tuyến đan xen hợp lệ: không động vào.
  assert.equal(sapDonTruocTra([d("a", 1), d("ta", 2), d("b", 3), d("tb", 4)], [s("a", "ta"), s("b", "tb")]).size, 0);
  // Điểm không có suất (đứng giữa) giữ vị trí tương đối với các điểm quanh nó.
  const diem = [d("a", 1), d("t", 2), d("x", 3), d("b", 4)];
  assert.deepEqual(theoSeq(diem, sapDonTruocTra(diem, [s("a", "t"), s("b", "t")])), ["a", "x", "b", "t"]);
});

test("sapDonTruocTra: chỉ đổi điểm CHƯA TỚI — điểm đã tới / bỏ qua giữ số; tập số của điểm chưa tới giữ nguyên (không chạm số của điểm khác)", () => {
  const diem = [d("bo", 1, false), d("donA", 4), d("tra", 7), d("donB", 9)];
  const doi = sapDonTruocTra(diem, [s("donA", "tra"), s("donB", "tra")]);
  assert.deepEqual([...doi.entries()].sort(), [["donB", 7], ["tra", 9]]);
  assert.equal(doi.has("bo"), false);
});

test("sapDonTruocTra: suất có điểm đã tới / thiếu điểm xuống / điểm lạ → bỏ qua ràng buộc đó (không ném, không đoán)", () => {
  const diem = [d("tra", 1), d("don", 2, false)];
  assert.equal(sapDonTruocTra(diem, [s("don", "tra"), s("don", null), s(null, "tra"), s("la", "tra")]).size, 0);
});

test("sapDonTruocTra: nhiều đoàn, nhiều nơi trả — mọi đón của suất đứng trước trả của suất", () => {
  const diem = [d("p1", 1), d("dBen", 2), d("p2", 3), d("dSb", 4), d("p3", 5)];
  const suat = [s("p1", "dBen"), s("p2", "dBen"), s("p2", "dSb"), s("p3", "dSb")];
  const sau = theoSeq(diem, sapDonTruocTra(diem, suat));
  assert.deepEqual(sau, ["p1", "p2", "dBen", "p3", "dSb"]);
  const vt = new Map(sau.map((id, i) => [id, i]));
  for (const x of suat) assert.ok(vt.get(x.diemLen!)! < vt.get(x.diemXuong!)!, `${x.diemLen} trước ${x.diemXuong}`);
});

test("suatTraTruocDon: đếm suất có điểm xuống đứng TRƯỚC điểm lên (theo số thứ tự hiện tại); suất thiếu điểm → không tính", () => {
  const diem = [d("donA", 1), d("tra", 2), d("donB", 3)];
  assert.deepEqual(suatTraTruocDon(diem, [s("donA", "tra"), s("donB", "tra"), s("donB", null)]), [1]);
  assert.deepEqual(suatTraTruocDon(diem, [s("donA", "tra")]), []);
});

// ---- ADR-0096 Đ1 (LC-19) — gói A1 (2026-10-08) -----------------------------------------------------------------------------------------------------------------
test("ADR-0096 Đ1.1: số thứ tự BẰNG nhau cũng là vi phạm (nghiêm ngặt seq(lên) < seq(xuống))", () => {
  assert.deepEqual(suatTraTruocDon([d("don", 2), d("tra", 2)], [s("don", "tra")]), [0]);
});

test("ADR-0096 Đ1.3c: daoMoiSauDoi — chỉ trả suất BỊ ĐẢO MỚI do lệnh đổi thứ tự (suất đảo từ trước không tính, để sửa dần từng bước ↑ ↓)", () => {
  const diem = [d("donA", 1), d("tra", 2), d("donB", 3)];
  const suat = [s("donA", "tra"), s("donB", "tra")];
  // Đưa TRẢ lên đầu: suất A (đang đúng) bị đảo mới → [0].
  assert.deepEqual(daoMoiSauDoi(diem, [{ id: "tra", seq: 1 }, { id: "donA", seq: 2 }], suat), [0]);
  // Đổi chỗ ĐÓN B với TRẢ: sửa được suất B, không đảo mới.
  assert.deepEqual(daoMoiSauDoi(diem, [{ id: "donB", seq: 2 }, { id: "tra", seq: 3 }], suat), []);
  // Đang đảo sẵn [TRẢ, ĐÓN A, ĐÓN B]: đưa ĐÓN B lên trước ĐÓN A (bước trung gian còn đảo) → không đảo MỚI → cho đi tiếp.
  const dao = [d("tra", 1), d("donA", 2), d("donB", 3)];
  assert.deepEqual(daoMoiSauDoi(dao, [{ id: "donB", seq: 2 }, { id: "donA", seq: 3 }], suat), []);
  // Lệnh rỗng → không đảo mới.
  assert.deepEqual(daoMoiSauDoi(diem, [], suat), []);
});

test("ADR-0096 Đ1.4 (HT-02): diemDonChuaToiCuaDiemTra — điểm đón CHƯA TỚI của suất CHỜ LÊN có điểm xuống ở điểm trả này; suất vắng / huỷ / đã lên / đã đóng không tính", () => {
  const diem = [{ id: "don", trangThai: "PENDING" }, { id: "don2", trangThai: "ARRIVED" }, { id: "tra", trangThai: "PENDING" }];
  const x = (len: string, trangThai: string, mo = true) => ({ diemLen: len, diemXuong: "tra", trangThai, mo });
  assert.deepEqual(diemDonChuaToiCuaDiemTra("tra", diem, [x("don", "WAITING")]), ["don"]);
  assert.deepEqual(diemDonChuaToiCuaDiemTra("tra", diem, [x("don2", "WAITING")]), [], "điểm đón đã tới (khách còn chờ đánh dấu) — không chặn");
  for (const tt of ["NO_SHOW", "CANCELLED_AT_STOP", "BOARDED", "DROPPED"]) assert.deepEqual(diemDonChuaToiCuaDiemTra("tra", diem, [x("don", tt)]), [], tt);
  assert.deepEqual(diemDonChuaToiCuaDiemTra("tra", diem, [x("don", "WAITING", false)]), [], "suất đã đóng");
  assert.deepEqual(diemDonChuaToiCuaDiemTra("tra", diem, [x("don", "WAITING"), x("don", "WAITING")]), ["don"], "không trùng");
});
