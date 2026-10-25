import { test } from "node:test";
import assert from "node:assert/strict";
import { cauSoDu, khopTen, nhanDonTrongSo, qua, xepBen } from "./so-cong-no-hien-thi.ts";

const vnd = (n: number) => `${n} ₫`;

test("nhãn đơn trong sổ: huỷ + bên đang giữ ⇒ «Đã huỷ — cọc còn giữ»; huỷ + công ty nợ ⇒ «Đã huỷ»; không đơn ⇒ «Không gắn đơn»; mốc Đã giao / Hoàn thành theo trangThaiHienThi", () => {
  assert.equal(nhanDonTrongSo({ status: "cancelled", deliveredAt: null, completedAt: null }, true), "Đã huỷ — cọc còn giữ");
  assert.equal(nhanDonTrongSo({ status: "cancelled", deliveredAt: null, completedAt: null }, false), "Đã huỷ");
  assert.equal(nhanDonTrongSo(null, true), "Không gắn đơn");
  assert.equal(nhanDonTrongSo({ status: "confirmed", deliveredAt: "x", completedAt: null }, true), "Đã giao – đã thu đủ");
  assert.equal(nhanDonTrongSo({ status: "confirmed", deliveredAt: "x", completedAt: "y" }, false), "Hoàn thành");
});

test("câu số dư nói bằng lời, không dấu âm", () => {
  assert.equal(cauSoDu(1_750_000, vnd), "Đang giữ 1750000 ₫");
  assert.equal(cauSoDu(-90_000, vnd), "Công ty nợ 90000 ₫");
  assert.equal(cauSoDu(0, vnd), "Không còn số dư");
});

test("lọc, xếp, tìm không dấu", () => {
  assert.deepEqual([qua("dang_giu", 1), qua("dang_giu", -1), qua("cong_ty_no", -1), qua("tat_ca", -1)], [true, false, true, true]);
  const ds = [{ ten: "Bình", dangGiu: 10 }, { ten: "An", dangGiu: -50 }, { ten: "Đại Lý A", dangGiu: 30 }];
  assert.deepEqual(xepBen(ds, "so_tien").map((b) => b.ten), ["An", "Đại Lý A", "Bình"]);
  assert.deepEqual(xepBen(ds, "ten").map((b) => b.ten)[0], "An");
  assert.ok(khopTen("Đại Lý A", "dai ly"));
  assert.ok(!khopTen("Nam HDV", "dai"));
});
