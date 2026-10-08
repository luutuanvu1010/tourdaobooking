// ADR-0097 Đ2.4 (gói A1, V3-B): bảng điều chỉnh kết quả một suất — luật thuần dùng chung máy chủ (lenhDieuChinh) + màn văn phòng (hộp "Điều chỉnh…").
// Lớp CSDL cùng bảng: trigger vc_trip_running_locked_alloc_ins (0085) — bài dieu-chinh-csdl.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauDieuChinh, coTienDoSauXuatBen, dichDieuChinh, kiemDieuChinh, nhanTrangThaiDieuChinh } from "./dieu-chinh-suat.ts";

const DIEM = (len: string, xuong: string | null) => ({ diemLen: len, diemXuong: xuong });

test("bảng Đ2.4: các cặp được phép theo đúng ADR (không điều kiện điểm)", () => {
  const ok = (tu: string, den: string) => assert.equal(kiemDieuChinh(tu as never, den as never, DIEM("ARRIVED", "PENDING")), null, `${tu} → ${den}`);
  ok("BOARDED", "WAITING");
  ok("BOARDED", "NO_SHOW");
  ok("BOARDED", "CANCELLED_AT_STOP");
  ok("CANCELLED_AT_STOP", "BOARDED");
  ok("CANCELLED_AT_STOP", "NO_SHOW");
  ok("CANCELLED_AT_STOP", "WAITING");
  ok("NO_SHOW", "WAITING");
  ok("NO_SHOW", "CANCELLED_AT_STOP");
  ok("DROPPED", "BOARDED");
});

test("ngoài bảng → câu tiếng Việt: Vắng → Đã đón (đã có nút 'Đã đón'), Chưa xử lý → bất kỳ, Đã trả → Vắng, cùng trạng thái", () => {
  const sai = (tu: string, den: string) => {
    const r = kiemDieuChinh(tu as never, den as never, DIEM("ARRIVED", "ARRIVED"));
    assert.ok(r && r.ma === "ngoai_bang", `${tu} → ${den}: ${JSON.stringify(r)}`);
    assert.match(r.cau, /không điều chỉnh được/);
    assert.doesNotMatch(r.cau, /[A-Z]{4,}/, "không lộ mã trạng thái");
  };
  sai("NO_SHOW", "BOARDED");
  sai("WAITING", "BOARDED");
  sai("WAITING", "NO_SHOW");
  sai("DROPPED", "NO_SHOW");
  sai("DROPPED", "WAITING");
  sai("BOARDED", "DROPPED");
  sai("BOARDED", "BOARDED");
  assert.match(kiemDieuChinh("NO_SHOW", "BOARDED", DIEM("ARRIVED", "PENDING"))!.cau, /bấm "Đã đón"/, "Vắng → Đã đón chỉ đường nút sẵn có");
});

test("điều kiện 'điểm chưa xong' (Đ2.4): về Chưa xử lý cần điểm lên chưa DONE; Đã trả → Còn trên xe cần điểm xuống chưa DONE", () => {
  assert.equal(kiemDieuChinh("BOARDED", "WAITING", DIEM("DONE", "PENDING"))?.ma, "diem_da_xong");
  assert.equal(kiemDieuChinh("NO_SHOW", "WAITING", DIEM("DONE", "PENDING"))?.ma, "diem_da_xong");
  assert.equal(kiemDieuChinh("CANCELLED_AT_STOP", "WAITING", DIEM("DONE", "PENDING"))?.ma, "diem_da_xong");
  assert.equal(kiemDieuChinh("DROPPED", "BOARDED", DIEM("DONE", "DONE"))?.ma, "diem_da_xong");
  assert.equal(kiemDieuChinh("DROPPED", "BOARDED", DIEM("DONE", "ARRIVED")), null);
  assert.equal(kiemDieuChinh("BOARDED", "NO_SHOW", DIEM("DONE", "DONE")), null, "Đã đón → Vắng không có điều kiện điểm");
  assert.match(kiemDieuChinh("BOARDED", "WAITING", DIEM("DONE", null))!.cau, /Điểm đón đã xong/);
  assert.match(kiemDieuChinh("DROPPED", "BOARDED", DIEM("DONE", "DONE"))!.cau, /Điểm trả đã xong/);
});

test("dichDieuChinh: lựa chọn của hộp theo trạng thái hiện tại + điểm (đúng thứ tự, chỉ cặp đang làm được); Chưa xử lý / Vắng→Đã đón không có", () => {
  assert.deepEqual(dichDieuChinh("BOARDED", DIEM("ARRIVED", "PENDING")), ["WAITING", "NO_SHOW", "CANCELLED_AT_STOP"]);
  assert.deepEqual(dichDieuChinh("BOARDED", DIEM("DONE", "PENDING")), ["NO_SHOW", "CANCELLED_AT_STOP"]);
  assert.deepEqual(dichDieuChinh("CANCELLED_AT_STOP", DIEM("ARRIVED", "PENDING")), ["WAITING", "BOARDED", "NO_SHOW"]);
  assert.deepEqual(dichDieuChinh("NO_SHOW", DIEM("ARRIVED", "PENDING")), ["WAITING", "CANCELLED_AT_STOP"]);
  assert.deepEqual(dichDieuChinh("DROPPED", DIEM("DONE", "ARRIVED")), ["BOARDED"]);
  assert.deepEqual(dichDieuChinh("DROPPED", DIEM("DONE", "DONE")), []);
  assert.deepEqual(dichDieuChinh("WAITING", DIEM("ARRIVED", "PENDING")), []);
});

test("nhãn + câu nhật ký (Đ2.6): 'một suất Đã đón → Vắng · Bấm nhầm'; Đã trả → Còn trên xe; không mã", () => {
  assert.equal(nhanTrangThaiDieuChinh("WAITING"), "Chưa xử lý");
  assert.equal(nhanTrangThaiDieuChinh("CANCELLED_AT_STOP"), "Khách huỷ tại điểm");
  assert.equal(cauDieuChinh("BOARDED", "NO_SHOW", "Bấm nhầm"), "một suất Đã đón → Vắng · Bấm nhầm");
  assert.equal(cauDieuChinh("DROPPED", "BOARDED", "Khác"), "một suất Đã trả → Còn trên xe · Khác");
});

test("coTienDoSauXuatBen (Đ3.2 — MỘT luật cho máy chủ 409 da_co_tien_do và nút 'Thu hồi xuất bến'): chỉ xét sự kiện SAU lần xuất bến cuối; DEPARTED / DEPARTURE_REVOKED không tính", () => {
  assert.equal(coTienDoSauXuatBen(["CREATED", "ALLOCATED", "DEPARTED"]), false, "vừa xuất bến");
  assert.equal(coTienDoSauXuatBen(["CREATED", "DEPARTED", "STOP_ARRIVED"]), true, "đã tới một điểm");
  assert.equal(coTienDoSauXuatBen(["DEPARTED", "STOPS_REORDERED"]), true, "đổi thứ tự cũng là tiến độ (ADR Đ3.2)");
  assert.equal(coTienDoSauXuatBen(["DEPARTED", "STOP_ADDED_RUNNING"]), true, "thêm điểm khi xe chạy — thu hồi sẽ để cờ thêm-khi-chạy trên chuyến chưa chạy");
  assert.equal(coTienDoSauXuatBen(["DEPARTED", "STOP_ARRIVED", "DEPARTURE_REVOKED", "DEPARTED"]), false, "chỉ tính từ lần xuất bến CUỐI");
  assert.equal(coTienDoSauXuatBen(["DEPARTED", "DEPARTURE_REVOKED", "DEPARTED", "DEPARTED"]), false);
});
