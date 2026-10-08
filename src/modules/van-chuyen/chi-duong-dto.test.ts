// CHUỖI ĐÍCH "CHỈ ĐƯỜNG" của DTO tài xế (ADR-0105 mục 3, 5; bài kiểm 2; kế hoạch T4 — NT-4, NT-5, NT-6). Đồng hồ giả — tests/audit/dieu-phoi-khung.mjs.
// - GET /cuoc-cua-toi/:id TRONG ngày chạy: MỌI điểm có `diaChiChiDuong` (kể cả điểm đã xong); chữ tự do = ĐÚNG `tenNoi` (đã che dãy ≥ 8 số); điểm danh mục =
//   địa chỉ đã trim nếu có, không thì tên; không bao giờ là khoá nơi (`place_key`, `L:…` / `T:…`).
// - Phản hồi lệnh tiến độ (kể cả trong ngày — tự áp G18-B), route 19, chi tiết chuyến văn phòng, lịch chung, chuyến ngày mai: KHÔNG có khoá, không có chuỗi địa chỉ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, LOC, NGAY, NGAY_SAU, SALES, batDongHo, chuyenSan, denGio, setup, tienDo } from "../../../tests/audit/dieu-phoi-khung.mjs";

const SDT = "0905123456";
const DIA_CHI = "Số 1 Đường Dò Địa Chỉ";
const coKhoa = (j: any) => j.diem.length > 0 && j.diem.every((d: any) => "diaChiChiDuong" in d);
const khongKhoa = (j: any) => j.diem.every((d: any) => !("diaChiChiDuong" in d));

test("ADR-0105 (a)–(c): GET trong ngày — chữ tự do = tenNoi đã che, khác place_key; danh mục = địa chỉ đã trim, rỗng / NULL → tên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { noiDon: `Khách sạn Dò Đường ${SDT}` });
    const doc = async () => {
      const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
      assert.equal(r.status, 200, r.text);
      assert.equal(r.json.trongNgayChay, true);
      assert.ok(coKhoa(r.json), "mọi điểm có diaChiChiDuong");
      return { r, don: r.json.diem.find((d: any) => d.id === a.diemDon), tra: r.json.diem.find((d: any) => d.id === a.diemTra) };
    };
    // (a) chữ tự do
    const { r, don, tra } = await doc();
    assert.equal(don.diaChiChiDuong, don.tenNoi, "chữ tự do: ĐÚNG tên nơi tài xế đang thấy");
    assert.ok(!don.diaChiChiDuong.includes(SDT) && don.diaChiChiDuong.includes("•"), `đã che dãy số: ${don.diaChiChiDuong}`);
    for (const d of r.json.diem) {
      const pk = (w.sqlite.prepare("SELECT place_key FROM vc_trip_stop WHERE id = ?").get(d.id) as { place_key: string }).place_key;
      assert.notEqual(d.diaChiChiDuong, pk, "không bao giờ là khoá nơi");
      assert.doesNotMatch(d.diaChiChiDuong, /^[LT]:/);
    }
    assert.ok(!r.text.includes(SDT), "thân GET không có dãy số thô");
    // (c) danh mục chưa có địa chỉ → tên
    assert.equal(tra.diaChiChiDuong, "Bến tàu du lịch Nha Trang");
    // (b) danh mục có địa chỉ → địa chỉ đã trim; tenNoi vẫn là tên
    w.sqlite.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run(`  ${DIA_CHI}  `, LOC);
    const b = await doc();
    assert.equal(b.tra.diaChiChiDuong, DIA_CHI);
    assert.equal(b.tra.tenNoi, "Bến tàu du lịch Nha Trang");
    // (c) địa chỉ toàn khoảng trắng → tên
    w.sqlite.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run("   ", LOC);
    assert.equal((await doc()).tra.diaChiChiDuong, "Bến tàu du lịch Nha Trang");
  } finally {
    tat();
  }
});

test("ADR-0105 (d), (e): điểm đã xong VẪN có khoá ở GET; phản hồi lệnh tiến độ trong ngày (xuất bến, đã tới, đã đón) KHÔNG có khoá ở điểm nào", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    w.sqlite.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run(DIA_CHI, LOC);
    const a = await chuyenSan(w, { soNguoi: 1, ten: 1 });
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.trongNgayChay, true, "chống bài rỗng: phản hồi lệnh nói trong ngày chạy");
    assert.ok(khongKhoa(x.json) && !x.text.includes(DIA_CHI), "phản hồi xuất bến: không chuỗi đích");
    denGio("12:58");
    const t = await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`);
    assert.equal(t.status, 200, t.text);
    assert.ok(khongKhoa(t.json) && !t.text.includes(DIA_CHI), "phản hồi đã tới: không chuỗi đích");
    denGio("13:01");
    const d = await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`);
    assert.equal(d.status, 200, d.text);
    assert.ok(khongKhoa(d.json), "phản hồi đã đón: không chuỗi đích");
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    const diemDon = r.json.diem.find((x: any) => x.id === a.diemDon);
    assert.equal(diemDon.trangThai, "DONE", "chống bài rỗng: điểm đón đã xong");
    assert.ok(coKhoa(r.json), "GET: MỌI điểm (kể cả đã xong) có khoá — nút ẩn ở điểm đã xong là luật màn hình");
    assert.equal(r.json.diem.find((x: any) => x.id === a.diemTra).diaChiChiDuong, DIA_CHI);
  } finally {
    tat();
  }
});

test("ADR-0105 (f): địa chỉ đánh dấu KHÔNG ở route 19, chi tiết chuyến văn phòng, lịch chung; chuyến NGÀY MAI: GET tài xế không có khoá", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    w.sqlite.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run(DIA_CHI, LOC);
    const a = await chuyenSan(w);
    const mai = await chuyenSan(w, { ngay: NGAY_SAU });
    const coThat = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.ok(coThat.text.includes(DIA_CHI), "chống bài rỗng: GET trong ngày CÓ địa chỉ đánh dấu");
    const khac = [
      await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER }),
      await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES }),
      await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES }),
      await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${mai.id}`, { as: DRIVER }),
    ];
    for (const r of khac) {
      assert.equal(r.status, 200, r.text);
      assert.ok(!r.text.includes(DIA_CHI), `không địa chỉ: ${r.text.slice(0, 120)}`);
      assert.ok(!r.text.includes('"diaChiChiDuong"'), "không khoá diaChiChiDuong");
    }
    assert.equal(khac[3]!.json.trongNgayChay, false);
  } finally {
    tat();
  }
});
