// Bài kiểm LOGIC THUẦN phía trình duyệt của Bảng tin (ADR-0022, Task 8): web/bangtin-logic.ts — sổ "tab này vừa làm", gộp tin 1 giây, bộ điều khiển
// kết nối (nối lại/ping/pong/pagehide), giới hạn 3 thông báo nổi. Socket và bộ hẹn giờ là bản GIẢ tất định (không cần trình duyệt, không cần mạng).
// Phần cần trình duyệt thật (DOM, WebSocket thật, CSP) kiểm bằng typecheck + build + kịch bản Chrome (nhật ký Task 8).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOP_MS,
  HAN_TU_LAM_MS,
  AN_LAU_MS,
  KIEM_NHANH_MS,
  PING_MS,
  PONG_HAN_MS,
  TOI_DA_THONG_BAO,
  donTuDuongDan,
  ganThongBao,
  laTaoDonMoi,
  taoBoDieuKhien,
  taoBoGop,
  taoSoTuLam,
  TRE_THONG_BAO_MS,
  taoBoThongBao,
  type OSocket,
  type Phu,
} from "../web/bangtin-logic.ts";
import { choNoiLai, type SuKienDon } from "./shared/bang-tin.ts";

const suKien = (orderId: string, thayDoi: SuKienDon["thayDoi"] = "nhan"): SuKienDon => ({ loai: "don", orderId, maDon: `TD-${orderId}`, thayDoi, luc: "2026-09-26T00:00:00.000Z" });

// ---- bộ hẹn giờ giả -------------------------------------------------------------------------------------------------------------------
function dongHoGia() {
  let now = 0;
  let seq = 0;
  const cho = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    hen(fn: () => void, ms: number): unknown {
      const id = ++seq;
      cho.set(id, { at: now + ms, fn });
      return id;
    },
    huyHen(id: unknown): void {
      cho.delete(id as number);
    },
    /** Tua `ms` mili giây, chạy các hẹn tới hạn theo thứ tự (kể cả hẹn mới sinh ra trong khoảng đó). */
    tua(ms: number): void {
      const den = now + ms;
      for (;;) {
        const ke = [...cho.entries()].filter(([, v]) => v.at <= den).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!ke) break;
        cho.delete(ke[0]);
        now = ke[1].at;
        ke[1].fn();
      }
      now = den;
    },
    conCho: () => cho.size,
  };
}

// ---- socket giả -----------------------------------------------------------------------------------------------------------------------
class SocketGia implements OSocket {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  daGui: string[] = [];
  daDong = false;
  send(s: string): void {
    this.daGui.push(s);
  }
  close(): void {
    this.daDong = true;
  }
  mo(): void {
    this.onopen?.();
  }
  tin(x: unknown): void {
    this.onmessage?.({ data: typeof x === "string" ? x : JSON.stringify(x) });
  }
}

function dungBo(ngauNhien = 0.5) {
  const dh = dongHoGia();
  const sockets: SocketGia[] = [];
  const dot: SuKienDon[][] = [];
  const tungTin: SuKienDon[] = [];
  let canTaiLai = 0;
  const phu: Phu = {
    moSocket: () => {
      const s = new SocketGia();
      sockets.push(s);
      return s;
    },
    hen: dh.hen,
    huyHen: dh.huyHen,
    ngauNhien: () => ngauNhien,
    khiSuKien: (e) => tungTin.push(e),
    khiDot: (ds) => dot.push(ds),
    khiDotChuyen: () => {},
    khiCanTaiLai: () => canTaiLai++,
    bayGio: dh.now,
  };
  const bo = taoBoDieuKhien(phu);
  return { dh, bo, sockets, dot, tungTin, canTaiLai: () => canTaiLai, cuoi: () => sockets[sockets.length - 1]! };
}

// ---- sổ tab này vừa làm ---------------------------------------------------------------------------------------------------------------
test("taoSoTuLam: đơn vừa ghi là true trong 5 giây, sau đó false; đơn khác không bị ảnh hưởng", () => {
  let t = 1000;
  const so = taoSoTuLam(() => t);
  assert.equal(so.vuaLam("a"), false);
  so.ghiNho("a");
  assert.equal(so.vuaLam("a"), true);
  assert.equal(so.vuaLam("b"), false);
  t += HAN_TU_LAM_MS;
  assert.equal(so.vuaLam("a"), true, "đúng mốc 5 giây vẫn tính");
  t += 1;
  assert.equal(so.vuaLam("a"), false, "quá 5 giây");
  so.ghiNho("a");
  assert.equal(so.vuaLam("a"), true, "ghi lại thì tính lại từ đầu");
});

test("donTuDuongDan/laTaoDonMoi: chỉ yêu cầu GHI tới /api/orders/<id>… (kể cả ?query); GET và đường dẫn khác thì không", () => {
  assert.equal(donTuDuongDan("PUT", "/api/orders/abc-123"), "abc-123");
  assert.equal(donTuDuongDan("POST", "/api/orders/abc-123/status"), "abc-123");
  assert.equal(donTuDuongDan("PUT", "/api/orders/abc-123/handler"), "abc-123");
  assert.equal(donTuDuongDan("DELETE", "/api/orders/abc-123?x=1"), "abc-123");
  assert.equal(donTuDuongDan("PATCH", "/api/orders/abc-123"), "abc-123");
  assert.equal(donTuDuongDan("GET", "/api/orders/abc-123"), null);
  assert.equal(donTuDuongDan("POST", "/api/orders"), null, "đơn mới: id lấy từ phản hồi");
  assert.equal(donTuDuongDan("POST", "/api/auth/login"), null);
  assert.equal(donTuDuongDan("POST", "/api/feedback/orders/x"), null);
  assert.equal(laTaoDonMoi("POST", "/api/orders"), true);
  assert.equal(laTaoDonMoi("post", "/api/orders/"), true);
  // Bộ ghi dấu KHÔNG BAO GIỜ được làm một lần ghi thành công thành lỗi: chuỗi % hỏng không được ném URIError.
  assert.doesNotThrow(() => donTuDuongDan("PUT", "/api/orders/%E0%A4%A/status"));
  assert.doesNotThrow(() => donTuDuongDan("POST", "/api/orders/%"));
  assert.equal(laTaoDonMoi("GET", "/api/orders"), false);
  assert.equal(laTaoDonMoi("POST", "/api/orders/abc"), false);
});

// ---- thông báo nổi: không hiện cho việc chính tab này vừa làm (quyết định LÚC HIỆN, sau khoảng hoãn) ------------------------------------
const nvVanPhong = { id: "s1", permissions: ["SALES"] } as never;
const doiTac = { id: "p1", permissions: ["PARTNER"] } as never;
function dungThongBao(staff: never) {
  const dh = dongHoGia();
  const so = taoSoTuLam(dh.now);
  const hien: { cau: string; lienKet: string }[] = [];
  const khiSuKien = taoBoThongBao(staff, so.vuaLam, (tb) => hien.push(tb), dh.hen);
  return { dh, so, hien, khiSuKien };
}

test("taoBoThongBao: không có dấu 'tab này vừa làm' → thông báo hiện SAU khoảng hoãn (không hiện ngay); văn phòng → /order?id=", () => {
  const t = dungThongBao(nvVanPhong);
  t.khiSuKien(suKien("o1", "nhan"));
  assert.equal(t.hien.length, 0, "chưa hiện ngay khi tin tới");
  t.dh.tua(TRE_THONG_BAO_MS - 1);
  assert.equal(t.hien.length, 0);
  t.dh.tua(1);
  assert.equal(t.hien.length, 1);
  assert.equal(t.hien[0]!.lienKet, "/order?id=o1");
  assert.match(t.hien[0]!.cau, /TD-o1/);
});

test("taoBoThongBao — ĐUA: tin WebSocket tới TRƯỚC khi api() ghi dấu (dấu được ghi trong khoảng hoãn) → KHÔNG toast", () => {
  const t = dungThongBao(nvVanPhong);
  t.khiSuKien(suKien("o1", "nhan")); // khung tin tới trước phản hồi HTTP
  t.dh.tua(TRE_THONG_BAO_MS - 100);
  t.so.ghiNho("o1"); // api() parse xong phản hồi, ghi dấu (trễ)
  t.dh.tua(100);
  assert.equal(t.hien.length, 0, "dấu ghi trễ vẫn chặn được toast");
  t.dh.tua(60_000);
  assert.equal(t.hien.length, 0);
});

test("taoBoThongBao: dấu ghi TRƯỚC khi tin tới cũng chặn; dấu của đơn KHÁC không chặn; dấu quá 5 giây không chặn", () => {
  const t = dungThongBao(nvVanPhong);
  t.so.ghiNho("o1");
  t.khiSuKien(suKien("o1", "nhan"));
  t.khiSuKien(suKien("o2", "nhan"));
  t.dh.tua(TRE_THONG_BAO_MS);
  assert.deepEqual(t.hien.map((x) => x.lienKet), ["/order?id=o2"]);
  t.dh.tua(HAN_TU_LAM_MS + 1);
  t.khiSuKien(suKien("o1", "huy"));
  t.dh.tua(TRE_THONG_BAO_MS);
  assert.equal(t.hien.length, 2, "dấu cũ (hết 5 giây) không chặn nữa");
});

test("taoBoThongBao: loại không nổi (sua) và Đối tác không bao giờ hẹn giờ/hiện", () => {
  const t = dungThongBao(nvVanPhong);
  t.khiSuKien(suKien("o1", "sua"));
  assert.equal(t.dh.conCho(), 0, "không hẹn giờ cho tin không nổi");
  const d = dungThongBao(doiTac);
  d.khiSuKien(suKien("o1", "nhan"));
  d.dh.tua(60_000);
  assert.equal(d.hien.length, 0);
});

// ---- gộp 1 giây -----------------------------------------------------------------------------------------------------------------------
test("taoBoGop: nhiều tin trong 1 giây → MỘT lần phát mang cả đợt; đợt sau đếm lại; huy bỏ đợt đang chờ", () => {
  const dh = dongHoGia();
  const dot: SuKienDon[][] = [];
  const g = taoBoGop((ds) => dot.push(ds), dh.hen, dh.huyHen);
  g.them(suKien("a"));
  dh.tua(400);
  g.them(suKien("b"));
  dh.tua(GOP_MS - 400 - 1);
  assert.equal(dot.length, 0, "chưa tới 1 giây kể từ tin đầu");
  dh.tua(1);
  assert.equal(dot.length, 1);
  assert.deepEqual(dot[0]!.map((e) => e.orderId), ["a", "b"]);
  g.them(suKien("c"));
  dh.tua(GOP_MS);
  assert.equal(dot.length, 2);
  assert.deepEqual(dot[1]!.map((e) => e.orderId), ["c"]);
  g.them(suKien("d"));
  g.huy();
  dh.tua(GOP_MS * 3);
  assert.equal(dot.length, 2, "đã huỷ thì không phát");
});

// ---- bộ điều khiển kết nối ------------------------------------------------------------------------------------------------------------
test("batDau mở đúng MỘT socket; lần mở đầu KHÔNG phát can-tai-lai", () => {
  const t = dungBo();
  t.bo.batDau();
  assert.equal(t.sockets.length, 1);
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 0);
});

test("tin hợp lệ: khiSuKien ngay + một khiDot sau 1 giây; tin lạ/JSON hỏng/pong bị bỏ qua", () => {
  const t = dungBo();
  t.bo.batDau();
  const s = t.cuoi();
  s.mo();
  s.tin(suKien("a"));
  s.tin(suKien("b", "huy"));
  s.tin({ loai: "don", orderId: "x" });
  s.tin("{không phải json");
  s.tin(42 as unknown as string);
  assert.equal(t.tungTin.length, 2);
  assert.equal(t.dot.length, 0);
  t.dh.tua(GOP_MS);
  assert.equal(t.dot.length, 1);
  assert.deepEqual(t.dot[0]!.map((e) => e.orderId), ["a", "b"]);
});

test("khung KHÔNG phải chuỗi (nhị phân/đối tượng) bị bỏ qua dù nội dung giống một tin hợp lệ", () => {
  const t = dungBo();
  t.bo.batDau();
  const s = t.cuoi();
  s.mo();
  s.onmessage?.({ data: suKien("a") }); // đối tượng (không phải chuỗi JSON)
  s.onmessage?.({ data: new ArrayBuffer(8) });
  s.onmessage?.({ data: 42 });
  s.onmessage?.({ data: null });
  assert.equal(t.tungTin.length, 0);
  t.dh.tua(GOP_MS * 2);
  assert.equal(t.dot.length, 0);
  s.tin(suKien("b")); // chuỗi hợp lệ vẫn qua
  assert.equal(t.tungTin.length, 1);
});

test("đóng/lỗi: chờ choNoiLai(lan) tăng dần rồi nối lại; onerror + onclose liên tiếp chỉ hẹn MỘT lần; mở thành công đặt lại lan và phát can-tai-lai", () => {
  const t = dungBo(0.25);
  t.bo.batDau();
  const s0 = t.cuoi();
  s0.mo();
  s0.onerror?.();
  s0.onclose?.();
  const cho0 = choNoiLai(0, 0.25);
  t.dh.tua(cho0 - 1);
  assert.equal(t.sockets.length, 1, "chưa tới hạn chờ");
  t.dh.tua(1);
  assert.equal(t.sockets.length, 2, "một lần nối lại, không phải hai");
  // Lần này hỏng ngay khi bắt tay (chưa từng mở được): lan tăng → chờ lâu hơn.
  const s1 = t.cuoi();
  s1.onerror?.();
  s1.onclose?.();
  const cho1 = choNoiLai(1, 0.25);
  assert.ok(cho1 > cho0);
  t.dh.tua(cho1 - 1);
  assert.equal(t.sockets.length, 2);
  t.dh.tua(1);
  assert.equal(t.sockets.length, 3);
  // Mở được: phát can-tai-lai, lan về 0 → lần đóng sau chờ lại như lần đầu.
  const s2 = t.cuoi();
  s2.mo();
  assert.equal(t.canTaiLai(), 1);
  s2.onclose?.();
  t.dh.tua(cho0 - 1);
  assert.equal(t.sockets.length, 3);
  t.dh.tua(1);
  assert.equal(t.sockets.length, 4);
});

test("chờ nối lại không vượt 36 giây sau nhiều lần hỏng (trần choNoiLai)", () => {
  const t = dungBo(0.999);
  t.bo.batDau();
  for (let i = 0; i < 12; i++) {
    t.cuoi().onerror?.();
    t.dh.tua(36_000);
  }
  assert.equal(t.sockets.length, 13, "mỗi vòng ≤ 36 giây là có một lần nối lại mới");
});

test("lần mở ĐẦU TIÊN đến sau khi lần thử đầu đã hỏng vẫn phát can-tai-lai (trang có thể đã lỡ tin trong lúc chờ)", () => {
  const t = dungBo();
  t.bo.batDau();
  t.cuoi().onerror?.();
  t.dh.tua(2000);
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 1);
});

test("noiNgay (trang hiện lại / có mạng lại): đóng socket cũ, nối lại NGAY, onclose của socket cũ bị bỏ qua, mở lại phát can-tai-lai", () => {
  const t = dungBo();
  t.bo.batDau();
  const cu = t.cuoi();
  cu.mo();
  t.bo.noiNgay();
  assert.equal(cu.daDong, true);
  assert.equal(t.sockets.length, 2, "nối ngay, không chờ");
  cu.onclose?.(); // trễ từ socket cũ
  cu.onerror?.();
  t.dh.tua(60_000);
  assert.equal(t.sockets.length, 2, "onclose/onerror của socket cũ KHÔNG sinh lịch nối lại");
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 1);
});

test("ping mỗi 50 giây; có pong thì không sao, không pong trong 10 giây thì đóng và nối lại", () => {
  const t = dungBo();
  t.bo.batDau();
  const s = t.cuoi();
  s.mo();
  t.dh.tua(PING_MS - 1);
  assert.deepEqual(s.daGui, []);
  t.dh.tua(1);
  assert.deepEqual(s.daGui, ["ping"]);
  s.tin("pong");
  t.dh.tua(PONG_HAN_MS + 1);
  assert.equal(s.daDong, false, "đã có pong → còn sống");
  assert.equal(t.sockets.length, 1);
  t.dh.tua(PING_MS - PONG_HAN_MS - 1); // tới ping thứ hai
  assert.deepEqual(s.daGui, ["ping", "ping"]);
  t.dh.tua(PONG_HAN_MS - 1);
  assert.equal(t.sockets.length, 1, "chưa hết 10 giây");
  t.dh.tua(1);
  assert.equal(s.daDong, true, "không pong trong 10 giây → đóng");
  assert.equal(t.sockets.length, 2, "nối lại");
  s.onclose?.();
  t.dh.tua(60_000 + 0);
  assert.equal(t.sockets.length, 2, "onclose muộn của socket chết không hẹn thêm lần nào");
});

// ---- hiện lại ứng dụng (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 4): chỉ KIỂM kết nối, không đóng-mở lại cái còn sống -------------------------------------
// Trước: mọi lần hiện lại đều `noiNgay()` — đóng cả socket còn khoẻ, mở lại, rồi `can-tai-lai` làm mọi trang tải lại TOÀN BỘ dữ liệu.
function moVaChoNgoi() {
  const t = dungBo();
  t.bo.batDau();
  const cu = t.cuoi();
  cu.mo();
  return { t, cu };
}

/** Tua `ms` mili giây nhưng socket giả TRẢ PONG cho mọi ping định kỳ (kết nối khoẻ suốt thời gian ẩn). */
function tuaKhoe(t: ReturnType<typeof dungBo>, cu: SocketGia, ms: number) {
  for (let da = 0; da < ms; da += 5000) {
    t.dh.tua(Math.min(5000, ms - da));
    cu.tin("pong");
  }
  cu.daGui.length = 0; // bỏ các ping định kỳ đã trả lời — bài chỉ quan tâm ping do hienLai gõ
}

test("hienLai khi kết nối còn sống (có pong): KHÔNG đóng, KHÔNG nối lại, KHÔNG phát can-tai-lai", () => {
  const { t, cu } = moVaChoNgoi();
  t.bo.anDi();
  t.dh.tua(10_000);
  t.bo.hienLai();
  assert.deepEqual(cu.daGui, ["ping"], "chỉ gõ cửa kiểm");
  cu.tin("pong");
  t.dh.tua(KIEM_NHANH_MS + 1);
  assert.equal(cu.daDong, false);
  assert.equal(t.sockets.length, 1);
  assert.equal(t.canTaiLai(), 0, "kết nối khoẻ ⇒ không tải lại dữ liệu");
});

test("hienLai khi KHÔNG có pong trong KIEM_NHANH_MS: đóng, nối lại ngay, mở lại phát can-tai-lai", () => {
  const { t, cu } = moVaChoNgoi();
  t.bo.hienLai();
  t.dh.tua(KIEM_NHANH_MS - 1);
  assert.equal(t.sockets.length, 1, "chưa hết hạn chờ pong");
  t.dh.tua(1);
  assert.equal(cu.daDong, true);
  assert.equal(t.sockets.length, 2);
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 1);
});

test("hienLai sau khi ẩn đủ lâu (≥ AN_LAU_MS): nối lại + tải lại NGAY, không kiểm bằng ping", () => {
  const { t, cu } = moVaChoNgoi();
  t.bo.anDi();
  tuaKhoe(t, cu, AN_LAU_MS);
  t.bo.hienLai();
  assert.equal(cu.daDong, true);
  assert.deepEqual(cu.daGui, [], "không gõ cửa — đi lâu thì coi là cũ");
  assert.equal(t.sockets.length, 2);
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 1);
});

test("hienLai sau khi ẩn ngắn hơn AN_LAU_MS vẫn chỉ kiểm bằng ping", () => {
  const { t, cu } = moVaChoNgoi();
  t.bo.anDi();
  tuaKhoe(t, cu, AN_LAU_MS - 5000);
  t.bo.hienLai();
  assert.equal(cu.daDong, false);
  assert.deepEqual(cu.daGui, ["ping"]);
});

test("hienLai khi chưa có socket sống (đang chờ nối lại sau lần hỏng): nối NGAY như trước", () => {
  const t = dungBo();
  t.bo.batDau();
  t.cuoi().onclose?.(); // hỏng trước khi mở → hẹn nối lại
  assert.equal(t.sockets.length, 1);
  t.bo.hienLai();
  assert.equal(t.sockets.length, 2, "không đợi hẹn");
});

test("hienLai gọi liên tiếp khi đang chờ pong: chỉ MỘT ping; pong về thì hẹn kiểm bị huỷ (không đóng muộn)", () => {
  const { t, cu } = moVaChoNgoi();
  t.bo.hienLai();
  t.bo.hienLai();
  t.bo.hienLai();
  assert.deepEqual(cu.daGui, ["ping"]);
  cu.tin("pong");
  t.dh.tua(KIEM_NHANH_MS * 3);
  assert.equal(cu.daDong, false);
  assert.equal(t.sockets.length, 1);
});

test("hienLai khi socket KHÔNG ở trạng thái mở (readyState ≠ 1: iOS để socket chết, `send` không ném lỗi): nối lại NGAY, không chờ KIEM_NHANH_MS", () => {
  for (const trangThai of [0, 2, 3]) {
    const { t, cu } = moVaChoNgoi();
    (cu as { readyState?: number }).readyState = trangThai;
    t.bo.hienLai();
    assert.equal(cu.daDong, true, `readyState ${trangThai}`);
    assert.equal(t.sockets.length, 2, `readyState ${trangThai}: nối lại ngay`);
    assert.deepEqual(cu.daGui, [], `readyState ${trangThai}: không gõ cửa trên socket chết`);
  }
});

test("hienLai khi readyState = 1 (mở) vẫn chỉ gõ cửa kiểm", () => {
  const { t, cu } = moVaChoNgoi();
  (cu as { readyState?: number }).readyState = 1;
  t.bo.hienLai();
  assert.equal(cu.daDong, false);
  assert.deepEqual(cu.daGui, ["ping"]);
});

test("hienLai khi send ném lỗi (socket đã đóng/đang mở dở): nối lại ngay", () => {
  const { t, cu } = moVaChoNgoi();
  cu.send = () => { throw new Error("InvalidStateError"); };
  t.bo.hienLai();
  assert.equal(cu.daDong, true);
  assert.equal(t.sockets.length, 2);
});

test("hienLai sau dung (pagehide): không làm gì cả (chỉ tiepTuc mới mở lại)", () => {
  const { t } = moVaChoNgoi();
  t.bo.dung();
  t.bo.hienLai();
  assert.equal(t.sockets.length, 1);
});

test("pagehide trong lúc đang chờ pong kiểm: hẹn kiểm bị huỷ, không nối lại sau khi đã dừng", () => {
  const { t } = moVaChoNgoi();
  t.bo.hienLai();
  t.bo.dung();
  t.dh.tua(KIEM_NHANH_MS * 3);
  assert.equal(t.sockets.length, 1);
});

test("dung (pagehide): đóng sạch, mọi hẹn giờ bị huỷ, KHÔNG nối lại kể cả khi noiNgay được gọi; tiepTuc (bộ nhớ đệm chuyển trang) mở lại", () => {
  const t = dungBo();
  t.bo.batDau();
  const s = t.cuoi();
  s.mo();
  s.tin(suKien("a"));
  t.bo.dung();
  assert.equal(s.daDong, true);
  s.onclose?.();
  t.bo.noiNgay();
  t.dh.tua(600_000);
  assert.equal(t.sockets.length, 1, "không nối lại sau pagehide");
  assert.equal(t.dot.length, 0, "đợt đang gộp bị bỏ");
  assert.equal(t.dh.conCho(), 0, "không còn hẹn giờ nào");
  t.bo.tiepTuc();
  assert.equal(t.sockets.length, 2);
  t.cuoi().mo();
  assert.equal(t.canTaiLai(), 1);
  const dem = t.sockets.length;
  t.bo.tiepTuc(); // không đang dừng → không mở thêm
  assert.equal(t.sockets.length, dem);
});

test("moSocket ném lỗi (vd. URL/CSP chặn) → hẹn nối lại theo choNoiLai thay vì văng ra ngoài", () => {
  const dh = dongHoGia();
  let lanMo = 0;
  const phu: Phu = {
    moSocket: () => {
      lanMo++;
      throw new Error("chặn");
    },
    hen: dh.hen,
    huyHen: dh.huyHen,
    ngauNhien: () => 0,
    khiSuKien: () => undefined,
    khiDot: () => undefined,
    khiCanTaiLai: () => undefined,
  };
  const bo = taoBoDieuKhien(phu);
  bo.batDau();
  assert.equal(lanMo, 1);
  dh.tua(1000);
  assert.equal(lanMo, 2);
});

// ---- tối đa 3 thông báo nổi -----------------------------------------------------------------------------------------------------------
test("ganThongBao: giữ tối đa 3 cái mới nhất, đẩy cái cũ nhất ra", () => {
  assert.equal(TOI_DA_THONG_BAO, 3);
  assert.deepEqual(ganThongBao([], "a"), { con: ["a"], bo: [] });
  assert.deepEqual(ganThongBao(["a", "b"], "c"), { con: ["a", "b", "c"], bo: [] });
  assert.deepEqual(ganThongBao(["a", "b", "c"], "d"), { con: ["b", "c", "d"], bo: ["a"] });
  assert.deepEqual(ganThongBao(["a", "b", "c", "d", "e"], "f"), { con: ["d", "e", "f"], bo: ["a", "b", "c"] });
});

// ---- sự kiện CHUYẾN (ADR-0052 D6.4): chỉ làm mới màn hình, không thông báo nổi (tự chốt T4 của kế hoạch Đợt 2) ---------------------------------
test("sự kiện chuyến: gộp thành MỘT đợt 'chuyen-thay-doi', không vào nhánh đơn, không thông báo nổi; khoá lạ bị bỏ", () => {
  const dh = dongHoGia();
  const sockets: SocketGia[] = [];
  const dotChuyen: unknown[][] = [], dotDon: unknown[][] = [], noi: unknown[] = [];
  const bo = taoBoDieuKhien({
    moSocket: () => {
      const s = new SocketGia();
      sockets.push(s);
      return s;
    },
    hen: dh.hen, huyHen: dh.huyHen, ngauNhien: () => 0.5,
    khiSuKien: (e) => noi.push(e), khiDot: (ds) => dotDon.push(ds), khiDotChuyen: (ds) => dotChuyen.push(ds), khiCanTaiLai: () => {},
  });
  bo.batDau();
  const s = sockets[0]!;
  s.mo();
  s.tin({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "huy", luc: "2027-03-11T00:00:00.000Z" });
  s.tin({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "sua", luc: "2027-03-11T00:00:01.000Z" });
  s.tin({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "sua", luc: "2027-03-11T00:00:01.000Z", tripId: "t" }); // khoá thừa → bỏ
  dh.tua(GOP_MS);
  assert.equal(dotChuyen.length, 1);
  assert.equal((dotChuyen[0] as unknown[]).length, 2);
  assert.deepEqual(dotDon, []);
  assert.deepEqual(noi, []);
  bo.dung();
});
