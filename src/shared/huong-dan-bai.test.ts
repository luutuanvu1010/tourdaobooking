import { test } from "node:test";
import assert from "node:assert/strict";
import { chonDoan } from "./tro-ly.ts";
import { BAI_VIEC, danhSach, khucTo, loiVao, moiBai, tachTuTim, thayBaiViec, timBai, trongDanhSach, vaiDung, vuaDoi } from "./huong-dan-bai.ts";
import { HUONG_DAN } from "./huong-dan.ts";
import { XEP } from "./huong-dan-xep.ts";
import { PERMISSION_CODES } from "./permissions.ts";
import { TRAN_LO_MAC_DINH } from "./ve-nhap-lo.ts";

const khoVe = BAI_VIEC.find((b) => b.id === "kho-ve")!;

const chuDoan = (d: { doan: readonly { t: string }[] }): string => d.doan.map((x) => x.t).join("").toLowerCase();

test("máy điền: con số giới hạn đến từ hằng của mã, không gõ tay", () => {
  assert.ok(khoVe.gioiHan[0]!.includes(`tối đa ${TRAN_LO_MAC_DINH} vé`));
});

test("máy điền: «Ai dùng được» đọc từ bản đồ quyền, ô có phạm vi vẫn tính là dùng được", () => {
  assert.deepEqual(vaiDung(khoVe.o), ["SALES", "ADMIN", "SUPER_ADMIN"]);
  assert.equal(thayBaiViec(khoVe, ["SALES"]), true);
  assert.equal(thayBaiViec(khoVe, ["DRIVER"]), false);
  assert.equal(thayBaiViec(khoVe, ["PARTNER"]), false);
});

test("máy điền: lối vào tính từ bảng menu", () => {
  assert.equal(loiVao("veKho"), "Máy tính: thanh bên › Thiết lập › Vé điện tử. Điện thoại: Tôi › Vé điện tử.");
});

test("mỗi mục hướng dẫn được xếp đúng một lần, không có tên xếp thừa (thêm mục mà quên xếp ⇒ đỏ)", () => {
  for (const n of HUONG_DAN) {
    const xep = Object.values(XEP[n.id] ?? {}).flat().map(([t]) => t);
    assert.deepEqual([...xep].sort(), n.muc.map((m) => m.tieuDe).sort(), n.id);
  }
});

test("mỗi bài có id riêng để mở bằng đường dẫn", () => {
  const id = moiBai().map((b) => b.id);
  assert.equal(new Set(id).size, id.length);
});

test("danh sách theo quyền: Tài xế không thấy bài Kho vé, Bán hàng thấy; mọi bộ quyền đều có Phần chung", () => {
  assert.equal(trongDanhSach(danhSach(["DRIVER"]), "viec/kho-ve"), false);
  assert.equal(trongDanhSach(danhSach(["SALES"]), "viec/kho-ve"), true);
  assert.equal(trongDanhSach(danhSach(["SUPER_ADMIN"]), "viec/giao-dien"), true);
  assert.equal(trongDanhSach(danhSach(["ADMIN"]), "viec/giao-dien"), false, "Giao diện chỉ Toàn quyền");
  for (const q of PERMISSION_CODES) assert.ok(danhSach([q]).chung.nhom.length > 0, q);
  assert.deepEqual(danhSach(["SALES"]).vai.map((p) => p.id), ["ban-hang"]);
});

test("danh sách: nhóm việc có sẵn nhận bài theo việc; nhóm mới đứng trước «Khi vướng»", () => {
  const ten = danhSach(["SUPER_ADMIN"]).vai[0]!.nhom.map((g) => g.ten);
  assert.ok(ten.includes("Cài đặt"));
  assert.equal(ten[ten.length - 1], "Khi vướng");
  const banHang = danhSach(["SALES"]).vai[0]!.nhom.find((g) => g.ten === "Gửi cho khách")!;
  assert.ok(banHang.bai.some((b) => b.id === "viec/kho-ve"));
});

test("tìm: bỏ dấu khi so, mọi từ phải có trong một đoạn, chỉ trong bài người xem thấy", () => {
  const d = danhSach(["SALES"]);
  const kq = timBai(d, "huy lo");
  assert.ok(kq.some((r) => r.bai.id === "viec/kho-ve" && r.doan.length > 0));
  assert.deepEqual(timBai(danhSach(["DRIVER"]), "nhập lô vé").filter((r) => r.bai.id === "viec/kho-ve"), []);
  // Bài có đúng cụm từ gõ đứng trên bài chỉ có rải rác từng từ («Đã huỷ» … «lọc»).
  assert.equal(kq[0]!.bai.id, "viec/kho-ve");
  assert.ok(chuDoan(kq[0]!.doan[0]!).includes("huỷ lô"));
  assert.deepEqual(timBai(d, "xuất hoá đơn đỏ zzz"), []);
  assert.deepEqual(timBai(d, "   "), []);
});

test("tìm: tô đúng chữ gốc có dấu", () => {
  assert.deepEqual(khucTo("Bấm Huỷ lô ngay", tachTuTim("huy lo")), [{ t: "Bấm ", khop: false }, { t: "Huỷ", khop: true }, { t: " ", khop: false }, { t: "lô", khop: true }, { t: " ngay", khop: false }]);
});

test("dải «vừa đổi» chỉ hiện ở đúng bản đang chạy", () => {
  assert.equal(vuaDoi({ doi: { ban: "2.58", cau: "x" } }, "2.58"), true);
  assert.equal(vuaDoi({ doi: { ban: "2.57", cau: "x" } }, "2.58"), false);
  assert.equal(vuaDoi({ doi: null }, "2.58"), false);
});

test("Trợ lý: câu hỏi nhập lô vé đưa đoạn của bài Kho vé lên đầu, người không dùng được thì xếp sau", () => {
  const ten = (q: "SALES" | "DRIVER") => chonDoan("nhập lô vé thế nào", [q]).map((d) => d.ten);
  assert.ok(ten("SALES").slice(0, 2).some((t) => t.startsWith("Bài theo việc › Kho vé điện tử")), JSON.stringify(ten("SALES").slice(0, 4)));
  assert.ok(ten("SALES").includes("Bài theo việc › Kho vé điện tử › Các bước"));
});
