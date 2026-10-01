// Mô hình thuần khối "Hành khách" (bản vẽ khoi-hanh-khach.dc.html — M2, M5) — src/shared/hanh-khach-form.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LUA_CHON_LOAI, cauHuyNguoi, dongTrong, dongTuDto, loiDanhSachKhach, loiDong, passengersNhap, thayDoiXacNhan, tomTatKhach, type DongKhach } from "./hanh-khach-form.ts";
import type { PassengerDto } from "./contracts.ts";

const HOM_NAY = "2026-10-01";
const d = (ten: string, nam: string, loai: DongKhach["loai"] = ""): DongKhach => ({ ...dongTrong(ten + nam), ten, nam, loai });
const p = (o: Partial<PassengerDto> = {}): PassengerDto => ({ personKey: "pk1", rowId: "r1", fullName: "Nguyễn Văn An", birthYear: 1985, paxCode: "adult", updatedAt: "t", ...o });

test("lựa chọn loại khách đúng bản vẽ", () => {
  assert.deepEqual(LUA_CHON_LOAI.map((o) => o.label), ["Chưa chọn", "Người lớn", "Trẻ em", "Người cao tuổi", "Em bé"]);
});

test("lỗi dòng đúng chữ bản vẽ (1906–2026 khi năm nay 2026)", () => {
  assert.equal(loiDong(d("Khôi", ""), 3, HOM_NAY, false), null, "thiếu năm chỉ báo sau khi bấm Lưu");
  assert.deepEqual(loiDong(d("Khôi", ""), 3, HOM_NAY, true), { cau: "Dòng 3: năm sinh là bắt buộc.", o: "nam" });
  assert.deepEqual(loiDong(d("Khôi", "2051"), 3, HOM_NAY, false), { cau: "Dòng 3: năm sinh phải từ 1906 đến 2026.", o: "nam" });
  assert.equal(loiDong(d("Khôi", "20"), 3, HOM_NAY, false), null, "đang gõ dở");
  assert.deepEqual(loiDong(d("", "1990"), 3, HOM_NAY, false), { cau: "Dòng 3: họ tên là bắt buộc.", o: "ten" });
  assert.equal(loiDong(d("", ""), 3, HOM_NAY, true), null, "dòng rỗng bỏ qua");
  assert.deepEqual(loiDanhSachKhach([d("A", "1985"), d("B", "")], HOM_NAY), ["Dòng 2: năm sinh là bắt buộc."]);
});

test("dòng đếm và câu nhắc: 3/4 thiếu; 5 người / 4 khách; trống", () => {
  const ba = [d("An", "1985"), d("Bình", "1988"), d("Khôi", "2015")];
  assert.deepEqual(tomTatKhach(ba, 4, HOM_NAY), { dem: "3/4", thieu: "Còn 1 khách chưa có tên — cần đủ trước khi xe chạy", qua: null });
  assert.deepEqual(tomTatKhach([...ba, d("Hồng", "1952"), d("Nam", "1990")], 4, HOM_NAY), { dem: "5/4", thieu: null, qua: "Danh sách có 5 người, đơn có 4 khách" });
  assert.deepEqual(tomTatKhach([], 4, HOM_NAY), { dem: "0/4", thieu: null, qua: null });
  assert.deepEqual(tomTatKhach([dongTrong("x")], 4, HOM_NAY), { dem: "0/4", thieu: null, qua: null }, "dòng mới trống không tính");
});

test("thân nháp: bỏ dòng rỗng, giữ id dòng đã lưu, loại '' → null", () => {
  const rows = [dongTuDto(p(), "a", false), d("Bình", "1988", "child"), dongTrong("z")];
  assert.deepEqual(passengersNhap(rows), [
    { id: "r1", fullName: "Nguyễn Văn An", birthYear: 1985, paxCode: "adult" },
    { fullName: "Bình", birthYear: 1988, paxCode: "child" },
  ]);
});

test("thân đã xác nhận: thêm dòng mới, sửa người có đổi, không gửi người y nguyên, huỷ theo khoá người", () => {
  const an = dongTuDto(p(), "a", true);
  const binh = dongTuDto(p({ personKey: "pk2", rowId: "r2", fullName: "Trần Thị Bình", birthYear: 1988 }), "b", true);
  const hong = dongTuDto(p({ personKey: "pk3", rowId: "r3", fullName: "Lê Hồng" }), "c", true);
  const r = thayDoiXacNhan([an, { ...binh, nam: "1989" }, hong, d("Mới", "2000"), dongTrong("e")], ["pk3"], "u1");
  assert.deepEqual(r, {
    expectedUpdatedAt: "u1",
    them: [{ fullName: "Mới", birthYear: 2000, paxCode: null }],
    sua: [{ personKey: "pk2", fullName: "Trần Thị Bình", birthYear: 1989, paxCode: "adult" }],
    huy: ["pk3"],
  });
  assert.equal(cauHuyNguoi(binh, 2), "Huỷ Trần Thị Bình khỏi danh sách? (dùng khi nhập nhầm)");
  assert.equal(cauHuyNguoi(dongTrong("x"), 4), "Huỷ khách 4 khỏi danh sách? (dùng khi nhập nhầm)");
});
