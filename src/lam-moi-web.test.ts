// Bài kiểm LOGIC THUẦN của việc "trang làm mới khi có tin" (Bảng tin, ADR-0022, Task 9): web/lam-moi-logic.ts — bộ gộp lần tải (không chạy song
// song, tối đa MỘT lần chạy thêm sau đó), lọc tin theo đơn, số dòng cần tải lại. DOM/trình duyệt kiểm bằng typecheck + build + kịch bản Chrome.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coODaSua, daiMatMang, loiTaiNenAnTrang, nenHoanLamMoi, soDongCanTai, suKienVeDon, taoBoLamMoi } from "../web/lam-moi-logic.ts";
import type { SuKienDon } from "./shared/bang-tin.ts";

const suKien = (orderId: string): SuKienDon => ({ loai: "don", orderId, maDon: `TD-${orderId}`, thayDoi: "sua", luc: "2026-09-26T00:00:00.000Z" });

/** Một lần tải giả: ghi lại số lần chạy, số lần đang chạy cùng lúc (tối đa), và chỉ xong khi test cho phép. */
function taiGia() {
  let soLan = 0;
  let dangChay = 0;
  let toiDaSongSong = 0;
  const cho: Array<() => void> = [];
  return {
    tai: () =>
      new Promise<void>((xong) => {
        soLan++;
        dangChay++;
        toiDaSongSong = Math.max(toiDaSongSong, dangChay);
        cho.push(() => {
          dangChay--;
          xong();
        });
      }),
    hoanThanhMotLan: () => cho.shift()!(),
    get soLan() {
      return soLan;
    },
    get toiDaSongSong() {
      return toiDaSongSong;
    },
  };
}
const nhuong = () => new Promise<void>((r) => setImmediate(r));

test("bộ gộp: yêu cầu đầu chạy ngay", async () => {
  const g = taiGia();
  const bo = taoBoLamMoi(g.tai);
  void bo.yeuCau();
  assert.equal(g.soLan, 1);
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 1);
});

test("bộ gộp: nhiều yêu cầu khi đang chạy → không chạy song song, chỉ MỘT lần chạy thêm sau đó", async () => {
  const g = taiGia();
  const bo = taoBoLamMoi(g.tai);
  void bo.yeuCau();
  void bo.yeuCau();
  void bo.yeuCau();
  void bo.yeuCau();
  assert.equal(g.soLan, 1, "đang chạy thì không mở thêm lần tải");
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 2, "một lần chạy thêm cho cả cụm yêu cầu");
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 2, "không chạy lần thứ ba");
  assert.equal(g.toiDaSongSong, 1);
});

test("bộ gộp: yêu cầu đến trong lúc lần chạy thêm đang chạy → lại đúng MỘT lần nữa (không mất tin)", async () => {
  const g = taiGia();
  const bo = taoBoLamMoi(g.tai);
  void bo.yeuCau();
  void bo.yeuCau();
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 2);
  void bo.yeuCau(); // đến khi lần chạy thêm đang chạy
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 3);
  g.hoanThanhMotLan();
  await nhuong();
  assert.equal(g.soLan, 3);
  assert.equal(g.toiDaSongSong, 1);
});

test("bộ gộp: xong hết rồi yêu cầu mới thì chạy lại từ đầu", async () => {
  const g = taiGia();
  const bo = taoBoLamMoi(g.tai);
  void bo.yeuCau();
  g.hoanThanhMotLan();
  await nhuong();
  void bo.yeuCau();
  assert.equal(g.soLan, 2);
  g.hoanThanhMotLan();
});

test("bộ gộp: lần tải ném lỗi không làm kẹt bộ gộp, cũng không ném ra ngoài", async () => {
  let soLan = 0;
  const bo = taoBoLamMoi(async () => {
    soLan++;
    if (soLan === 1) throw new Error("mạng chập chờn");
  });
  await bo.yeuCau(); // không được ném
  await bo.yeuCau();
  assert.equal(soLan, 2);
});

test("suKienVeDon: có ít nhất một tin cùng orderId", () => {
  assert.equal(suKienVeDon([suKien("a"), suKien("b")], "b"), true);
  assert.equal(suKienVeDon([suKien("a")], "b"), false);
  assert.equal(suKienVeDon([], "a"), false);
});

test("soDongCanTai: không dưới một trang, không quá tối đa, giữ đủ số dòng đang xem", () => {
  assert.equal(soDongCanTai(0, 30, 100), 30);
  assert.equal(soDongCanTai(30, 30, 100), 30);
  assert.equal(soDongCanTai(60, 30, 100), 60);
  assert.equal(soDongCanTai(90, 30, 100), 90);
  assert.equal(soDongCanTai(250, 30, 100), 100);
});

// ---- vòng sửa 1: quyết định hoãn làm mới khối có ô nhập (trang Tôi) — đánh giá LÚC làm mới, không chốt cờ ----
test("coODaSua: chỉ true khi có ô khác giá trị gốc", () => {
  assert.equal(coODaSua([]), false);
  assert.equal(coODaSua([{ value: "", goc: "" }, { value: "2", goc: "2" }]), false);
  assert.equal(coODaSua([{ value: "", goc: "" }, { value: "3", goc: "2" }]), true);
  assert.equal(coODaSua([{ value: "lý do", goc: "" }]), true);
});

test("nenHoanLamMoi: hoãn khi đang gõ / ô đã sửa / hộp huỷ đang mở; không hoãn khi chỉ từng bấm rồi bỏ", () => {
  assert.equal(nenHoanLamMoi({ dangGo: false, coODaSua: false, hopHuyMo: false }), false, "bấm 'Huỷ đơn này' rồi 'Thôi', hay chỉnh bộ đếm về lại số cũ → không hoãn");
  assert.equal(nenHoanLamMoi({ dangGo: true, coODaSua: false, hopHuyMo: false }), true);
  assert.equal(nenHoanLamMoi({ dangGo: false, coODaSua: true, hopHuyMo: false }), true);
  assert.equal(nenHoanLamMoi({ dangGo: false, coODaSua: false, hopHuyMo: true }), true);
});

// ---- C55 (đánh giá ERP 7/10): màn tài xế — lần tải nền lỗi chỉ ẨN trang khi máy chủ nói chuyến không còn mở được; mất mạng thì GIỮ dữ liệu ----
test("loiTaiNenAnTrang: chỉ 403 / 404 ẩn trang; mất mạng (không phải lỗi máy chủ), 5xx, 409, 429 giữ trang", () => {
  assert.equal(loiTaiNenAnTrang({ status: 403 }), true, "mất quyền");
  assert.equal(loiTaiNenAnTrang({ status: 404 }), true, "bị đổi ra / không còn chuyến");
  assert.equal(loiTaiNenAnTrang(null), false, "mất mạng / hết giờ: không có trạng thái HTTP");
  for (const status of [500, 502, 503, 409, 429, 400]) assert.equal(loiTaiNenAnTrang({ status }), false, `HTTP ${status}`);
});

test("daiMatMang: dữ liệu cũ → dải 'Mất mạng — dữ liệu lúc HH:MM' (giờ Việt Nam) có nút Tải lại; lỗi máy chủ → 'Chưa tải lại được'", () => {
  const luc = Date.parse("2027-03-11T01:05:00.000Z"); // 08:05 giờ Việt Nam
  assert.deepEqual(daiMatMang({ duLieuLuc: luc, matMang: true, soChoGui: 0 }), {
    tieuDe: "Mất mạng — dữ liệu lúc 08:05",
    dong: ["Danh sách dưới đây là bản tải lúc 08:05. Bấm “Tải lại” khi có mạng."],
    taiLai: true,
  });
  assert.equal(daiMatMang({ duLieuLuc: luc, matMang: false, soChoGui: 0 })?.tieuDe, "Chưa tải lại được — dữ liệu lúc 08:05");
});

test("daiMatMang: có thao tác chưa gửi → tiêu đề giữ số thao tác (kịch bản Chrome bước 5), thêm dòng 'Dữ liệu lúc' nếu dữ liệu cũ", () => {
  const luc = Date.parse("2027-03-11T01:05:00.000Z");
  const chiChoGui = daiMatMang({ duLieuLuc: null, matMang: true, soChoGui: 1 });
  assert.equal(chiChoGui?.tieuDe, "Mất mạng — 1 thao tác chưa gửi được");
  assert.deepEqual(chiChoGui?.dong, ["Bấm lại ở dòng đó, hoặc bấm lại nút vừa bấm, khi có mạng — máy không tự gửi lại."]);
  assert.equal(chiChoGui?.taiLai, false);
  const caHai = daiMatMang({ duLieuLuc: luc, matMang: true, soChoGui: 2 });
  assert.equal(caHai?.tieuDe, "Mất mạng — 2 thao tác chưa gửi được");
  assert.deepEqual(caHai?.dong, ["Dữ liệu lúc 08:05 — chưa tải lại được.", "Bấm lại ở dòng đó, hoặc bấm lại nút vừa bấm, khi có mạng — máy không tự gửi lại."]);
  assert.equal(daiMatMang({ duLieuLuc: null, matMang: true, soChoGui: 0 }), null, "không mất mạng, không việc chờ → không dải");
});
