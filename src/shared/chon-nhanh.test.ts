// «Chọn nhanh» nơi đưa đón + bỏ chặng khi nhóm tắt đưa đón (ADR-0118 Đ4, Đ5; kế hoạch N-17…N-19) — src/shared/chon-nhanh.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { apChonNhanh, boChangKhiTatDuaDon, cauBoChangNhomTat, chonDonTheoNhom, diemChonNhanh, docChonNhanh, oChonNhanhCuaChang } from "./chon-nhanh.ts";
import { themChangDi, themChieuVe, type ChangNhap } from "./chang-form.ts";

const d = (id: string, name: string, quickPickOrder: number | null, active = true) => ({ id, name, active, quickPickOrder });
let n = 0;
const k = () => `c${++n}`;

test("N-17: diemChonNhanh — chỉ điểm ĐANG DÙNG có số; xếp theo số rồi theo tên (tiếng Việt); số trùng giữ đủ cả hai", () => {
  const r = diemChonNhanh([
    d("a", "Bến tàu du lịch Nha Trang", 2),
    d("b", "Bến cảng Vinpearl", 1),
    d("c", "Quầy vé 01", null),
    d("d", "Điểm ngưng", 1, false),
    d("e", "Ga Nha Trang", 2),
    d("f", "Âu Lạc", 2),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["b", "f", "a", "e"], "số 1 trước; số 2: Âu Lạc < Bến tàu < Ga");
  assert.deepEqual(r.map((x) => x.thuTu), [1, 2, 2, 2]);
  assert.ok(!r.some((x) => x.id === "d"), "điểm ngưng dùng không hiện");
  assert.ok(!r.some((x) => x.id === "c"), "điểm không có số không hiện");
  assert.deepEqual(diemChonNhanh([]), []);
  assert.deepEqual(diemChonNhanh([d("x", "Chỉ ngưng", 3, false)]), []);
});

test("N-17: diemChonNhanh không đổi mảng đầu vào", () => {
  const vao = [d("a", "B", 2), d("b", "A", 1)];
  const sao = JSON.stringify(vao);
  diemChonNhanh(vao);
  assert.equal(JSON.stringify(vao), sao);
});

test("N-18: ô điền của nút chọn nhanh — chiều đi → Nơi trả; chiều về → Nơi đón", () => {
  assert.equal(oChonNhanhCuaChang({ direction: "OUT" }), "tra");
  assert.equal(oChonNhanhCuaChang({ direction: "RETURN" }), "don");
});

test("N-18: apChonNhanh chiều đi điền Nơi trả, KHÔNG đụng Nơi đón; bỏ chữ gợi ý ô trả; chiều về đang đi theo chiều đi nhận Nơi đón mới", () => {
  const di = themChangDi(null, "2026-10-20", k());
  const ve = themChieuVe([di], null, "2026-10-20", k());
  const legs: ChangNhap[] = [{ ...di, don: "ks-1", goiYTra: true }, { ...ve, don: "", tra: "ks-1" }];
  const r = apChonNhanh(legs, 0, "cang-vp");
  assert.equal(r[0]!.tra, "cang-vp");
  assert.equal(r[0]!.don, "ks-1", "ô đón không đổi");
  assert.equal(r[0]!.goiYTra, false);
  assert.equal(r[1]!.don, "cang-vp", "chiều về theo chiều đi: nơi đón về = nơi trả đi");
  assert.equal(legs[0]!.tra, "", "không sửa mảng cũ");
});

test("N-18: apChonNhanh chiều về điền Nơi đón của CHÍNH chặng đó và thôi đi theo chiều đi ở ô đó", () => {
  const di = { ...themChangDi(null, "2026-10-20", k()), don: "ks-1", tra: "ga-1" };
  const ve = { ...themChieuVe([di], null, "2026-10-20", k()), tra: "ks-1" };
  const r = apChonNhanh([di, ve], 1, "cang-vp");
  assert.equal(r[1]!.don, "cang-vp");
  assert.equal(r[1]!.theoDon, false);
  assert.equal(r[1]!.tra, "ks-1", "ô trả của chiều về không đổi");
  assert.equal(r[0]!.tra, "ga-1", "chiều đi không đổi");
});

test("N-18: apChonNhanh chỉ số ngoài khoảng → bản sao nguyên", () => {
  const di = themChangDi(null, "2026-10-20", k());
  const r = apChonNhanh([di], 5, "x");
  assert.deepEqual(r, [di]);
  assert.notEqual(r[0], di);
});

test("N-19: boChangKhiTatDuaDon — nhóm tắt → bỏ hết chặng và nói số bỏ; nhóm bật → giữ nguyên; không chặng → 0", () => {
  const legs = [themChangDi(null, "2026-10-20", k()), themChangDi(null, "2026-10-20", k())];
  assert.deepEqual(boChangKhiTatDuaDon(legs, false), { legs: [], soBo: 2 });
  const giu = boChangKhiTatDuaDon(legs, true);
  assert.equal(giu.soBo, 0);
  assert.deepEqual(giu.legs, legs);
  assert.deepEqual(boChangKhiTatDuaDon([], false), { legs: [], soBo: 0 });
});

test("N-19: câu báo bỏ chặng — tiếng Việt có dấu, nêu tên dịch vụ và số chặng, không lộ mã", () => {
  const c = cauBoChangNhomTat("Tour 4 đảo", 2);
  assert.match(c, /Tour 4 đảo/);
  assert.match(c, /2 lượt/);
  assert.match(c, /không có đưa đón/);
  assert.doesNotMatch(c, /transfer|disabled|true|false/i);
});

test("N-20: docChonNhanh — trống → null (bỏ); 1–99 (cả '07', có khoảng trắng) → số; 0, 100, 1.5, chữ, số âm → lỗi nêu «chọn nhanh»", () => {
  assert.deepEqual(docChonNhanh(""), { ok: true, value: null });
  assert.deepEqual(docChonNhanh("   "), { ok: true, value: null });
  assert.deepEqual(docChonNhanh("1"), { ok: true, value: 1 });
  assert.deepEqual(docChonNhanh(" 07 "), { ok: true, value: 7 });
  assert.deepEqual(docChonNhanh("99"), { ok: true, value: 99 });
  for (const sai of ["0", "00", "100", "1.5", "1,5", "abc", "-3", "3a", "٣"]) {
    const r = docChonNhanh(sai);
    assert.equal(r.ok, false, sai);
    if (!r.ok) assert.match(r.message, /chọn nhanh/i);
  }
});

test("Ruling R-K (ADR-0118 × ADR-0134): nhóm tắt đưa đón → «Không đón» (khối bị ẩn, không có nút để bấm); nhóm bật → giữ đúng lựa chọn đang có", () => {
  assert.equal(chonDonTheoNhom(false, null), "KHONG_DON");
  assert.equal(chonDonTheoNhom(false, "DON"), "KHONG_DON");
  assert.equal(chonDonTheoNhom(false, "KHONG_DON"), "KHONG_DON");
  assert.equal(chonDonTheoNhom(true, null), null, "nhóm bật: chưa chọn vẫn là chưa chọn — không mặc định «Không đón» (ADR-0134 Đ7)");
  assert.equal(chonDonTheoNhom(true, "DON"), "DON");
  assert.equal(chonDonTheoNhom(true, "KHONG_DON"), "KHONG_DON");
});
