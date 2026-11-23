// Máy trạng thái của trang Quét vé (web/quet-ve-may.ts) — lỗi «quét vé đã dùng thì Nền tảng treo» (Việc 9, 21/11/2026).
// Chạy trên DOM giả (src/dom-gia.ts) và đồng hồ giả của node:test; máy chủ là hàm `goi` giả. Không cần camera hay mạng thật.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { dungDomGia, type NutGia } from "./dom-gia.ts";

dungDomGia();
const M = await import("../web/quet-ve-may.ts");
const { CHONG_LAP_MS } = await import("./shared/chong-doc-lap.ts");
type KetQua = import("../web/quet-ve-may.ts").KetQuaQuet;

const doc = (globalThis as unknown as { document: { createElement(t: string): NutGia } }).document;
const ve = (mau: KetQua["mau"], ma: string, cau: string): KetQua => ({ mau, ma, ghi: mau === "XANH" ? "DA_TINH" : "TU_CHOI", cau, dichVu: "Tour 4 đảo", nhomKhach: "Người lớn", ngayDi: "2026-11-21", soCuoi: "ABCD", lanQuetId: `l-${Math.random()}` });
const XANH = ve("XANH", "HOP_LE", "Vé hợp lệ. Đã tính đã dùng.");
const DO_DA_DUNG = ve("DO", "DA_DUNG", "Vé đã dùng lúc 08:15 bởi Lan.");
/** Cho mọi lời hứa đang chờ chạy hết (không đụng đồng hồ). */
const xa = async (): Promise<void> => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const nut = (goc: NutGia, chu: string): NutGia | undefined => goc.querySelectorAll("button").find((b) => b.textContent === chu);

type LoiGia = { status?: number; message?: string };
/** Kịch bản máy chủ cho từng lần gửi: kết quả, lỗi, `"treo"` (ném khi hết `henGioMs`, như api()), `"treo-mai"` (không bao giờ trả lời — như vòng chờ 409 «đang xử lý» kéo dài), `{ muon, kq }` (trả kết quả sau `muon` ms, bỏ qua hẹn giờ). */
/** `"da-ghi"`: máy chủ phát lại «lần trước đã ghi» (ADR-0094) — trang bọc `api()` với `khiDaGhi` nên nhận dấu `DA_GHI_TRUOC_DO`, không có kết quả của lần đó. */
type Lan = KetQua | LoiGia | "treo" | "treo-mai" | "da-ghi" | { muon: number; kq: KetQua | "da-ghi" };
function dung(tl: Lan[], tuy: { ghiNhoNem?: boolean } = {}) {
  const ketQuaEl = doc.createElement("div");
  ketQuaEl.hidden = true;
  const trangThaiEl = doc.createElement("p");
  const nhacEl = doc.createElement("div");
  nhacEl.hidden = true;
  const goiLuc: Array<{ ma: string; xn: Record<string, boolean>; hen: number; luc: number }> = [];
  const ghiNho: KetQua[] = [];
  const may = M.taoMayQuet({
    ketQuaEl: ketQuaEl as unknown as HTMLElement,
    trangThaiEl: trangThaiEl as unknown as HTMLElement,
    nhacEl: nhacEl as unknown as HTMLElement,
    goi: (ma, xn, hen) => {
      goiLuc.push({ ma, xn: xn as Record<string, boolean>, hen, luc: Date.now() });
      const t = tl.shift() ?? "treo";
      if (t === "treo") return new Promise((_res, rej) => setTimeout(() => rej(new Error("The operation was aborted.")), hen)); // như api(): hết giờ thì ném lỗi không phải ApiError
      if (t === "treo-mai") return new Promise(() => undefined);
      if (t === "da-ghi") return Promise.resolve(M.DA_GHI_TRUOC_DO);
      if ("muon" in t) return new Promise((res) => setTimeout(() => res(t.kq === "da-ghi" ? M.DA_GHI_TRUOC_DO : t.kq), t.muon));
      if ("mau" in t) return Promise.resolve(t);
      return Promise.reject(t.status === undefined ? new TypeError("Failed to fetch") : Object.assign(new Error(t.message ?? "x"), t));
    },
    lyDoLoi: (e) => ((e as LoiGia).status !== undefined ? (e as LoiGia).message ?? "" : "Không kết nối được máy chủ."),
    khiCoKetQua: (kq) => { ghiNho.push(kq); if (tuy.ghiNhoNem) throw new Error("danh sách lượt gần đây hỏng"); },
    dangDocCamera: () => true,
  });
  return { may, ketQuaEl, trangThaiEl, nhacEl, goiLuc, ghiNho };
}

/** Camera đọc cùng mã mỗi 250 ms trong `ms` mili giây (như vòng `docKhung`): chỉ đưa mã vào khi máy không bận. */
async function cameraThay(may: { nhanMa(m: string): void; dangBan(): boolean }, ma: string, ms: number): Promise<void> {
  for (let t = 0; t < ms; t += 250) {
    mock.timers.tick(250);
    await xa();
    if (!may.dangBan()) may.nhanMa(ma);
    await xa();
  }
}

describe("web/quet-ve-may.ts", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  it("quét A ra xanh → «Quét tiếp» → A vẫn trước camera: trong 3 giây chỉ hiện dòng nhắc, hết 3 giây thì gửi lại và hiện đỏ «đã dùng» (không treo)", async () => {
    const { may, ketQuaEl, nhacEl, goiLuc } = dung([XANH, DO_DA_DUNG]);
    may.nhanMa("TD1.A");
    await xa();
    assert.equal(ketQuaEl.hidden, false);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "XANH");
    const dongLuc = Date.now();
    nut(ketQuaEl, "Quét tiếp")!.click();
    assert.equal(ketQuaEl.hidden, true);

    await cameraThay(may, "TD1.A", CHONG_LAP_MS - 250); // 2,75 giây đầu: vẫn trong mốc
    assert.equal(goiLuc.length, 1, "trong 3 giây không gửi lại");
    assert.equal(nhacEl.hidden, false, "có dòng nhắc, không im lặng");
    assert.ok(nut(nhacEl, "Quét lại vé này"), "dòng nhắc có nút «Quét lại vé này»");

    await cameraThay(may, "TD1.A", 500);
    assert.equal(goiLuc.length, 2, "hết mốc 3 giây: vé còn trong khung được gửi lại");
    assert.ok(goiLuc[1]!.luc - dongLuc <= CHONG_LAP_MS + 250, `gửi lại sau ${goiLuc[1]!.luc - dongLuc} ms`);
    assert.equal(ketQuaEl.hidden, false);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO");
    assert.ok(ketQuaEl.textContent.includes("Vé đã dùng lúc 08:15 bởi Lan."));
    assert.equal(nhacEl.hidden, true, "đang hiện kết quả thì ẩn dòng nhắc");
  });

  it("«Quét lại vé này» gửi ngay, không chờ hết mốc", async () => {
    const { may, ketQuaEl, nhacEl, goiLuc } = dung([XANH, DO_DA_DUNG]);
    may.nhanMa("TD1.A");
    await xa();
    nut(ketQuaEl, "Quét tiếp")!.click();
    await cameraThay(may, "TD1.A", 500);
    assert.equal(goiLuc.length, 1);
    nut(nhacEl, "Quét lại vé này")!.click();
    await xa();
    assert.equal(goiLuc.length, 2);
    assert.equal(goiLuc[1]!.ma, "TD1.A");
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO");
  });

  it("mã khác trong mốc 3 giây: gửi ngay", async () => {
    const { may, ketQuaEl, goiLuc } = dung([XANH, XANH]);
    may.nhanMa("TD1.A");
    await xa();
    nut(ketQuaEl, "Quét tiếp")!.click();
    mock.timers.tick(250);
    may.nhanMa("TD1.B");
    await xa();
    assert.deepEqual(goiLuc.map((g) => g.ma), ["TD1.A", "TD1.B"]);
  });

  it("ảnh chụp / số sê-ri (guiNgay) không bị mốc 3 giây chặn", async () => {
    const { may, ketQuaEl, goiLuc } = dung([XANH, DO_DA_DUNG]);
    may.nhanMa("TD1.A");
    await xa();
    nut(ketQuaEl, "Quét tiếp")!.click();
    mock.timers.tick(100);
    may.guiNgay("TD1.A");
    await xa();
    assert.equal(goiLuc.length, 2);
  });

  it("mất mạng: tự gửi lại có giãn cách (1 giây, rồi 2 giây), tối đa 3 lần; camera không gửi thêm trong lúc đó; rồi hiện «Không gửi được» + «Thử lại»", async () => {
    const { may, ketQuaEl, goiLuc, trangThaiEl } = dung([{}, {}, {}, XANH]);
    const batDau = Date.now();
    may.nhanMa("TD1.A");
    await xa();
    assert.equal(goiLuc.length, 1);
    assert.ok(may.dangBan(), "đang chờ gửi lại thì bận: camera không đưa mã vào");
    assert.match(trangThaiEl.textContent, /thử gửi lại/);
    await cameraThay(may, "TD1.A", 750);
    assert.equal(goiLuc.length, 1, "chưa tới 1 giây: chưa gửi lại");
    await cameraThay(may, "TD1.A", 250);
    assert.equal(goiLuc.length, 2);
    await cameraThay(may, "TD1.A", 2000);
    assert.equal(goiLuc.length, 3);
    await cameraThay(may, "TD1.A", 5000);
    assert.equal(goiLuc.length, 3, "tối đa 3 lần tự gửi");
    assert.deepEqual(goiLuc.map((g) => g.luc - batDau), [0, 1000, 3000]);
    assert.equal(ketQuaEl.hidden, false);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "LOI");
    assert.ok(ketQuaEl.textContent.includes("Không gửi được"));
    assert.ok(ketQuaEl.textContent.includes("Không kết nối được máy chủ."));
    // Có mạng lại: bấm «Thử lại» ⇒ ra kết quả.
    nut(ketQuaEl, "Thử lại")!.click();
    await xa();
    assert.equal(goiLuc.length, 4);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "XANH");
  });

  it("máy chủ im lặng: mỗi lần gửi hẹn giờ ngắn, và «Không gửi được» hiện trong 15 giây", async () => {
    const { may, ketQuaEl, goiLuc } = dung(["treo", "treo", "treo"]);
    const batDau = Date.now();
    may.nhanMa("TD1.A");
    await xa();
    assert.ok(goiLuc[0]!.hen <= 8000, `hẹn giờ mỗi lần gửi ${goiLuc[0]!.hen} ms`);
    let hienLuc = -1;
    for (let t = 0; t < 20_000 && hienLuc < 0; t += 250) {
      mock.timers.tick(250);
      await xa();
      if (!ketQuaEl.hidden) hienLuc = Date.now() - batDau;
    }
    assert.ok(hienLuc > 0 && hienLuc <= 15_000, `hiện «Không gửi được» lúc ${hienLuc} ms`);
    assert.ok(ketQuaEl.textContent.includes("Không gửi được"));
    assert.ok(nut(ketQuaEl, "Thử lại"));
  });

  it("máy chủ từ chối rõ (4xx): không tự gửi lại, hiện ngay lý do + «Thử lại»", async () => {
    const { may, ketQuaEl, goiLuc } = dung([{ status: 429, message: "Quét quá nhanh, chờ một chút." }]);
    may.nhanMa("TD1.A");
    await xa();
    mock.timers.tick(10_000);
    await xa();
    assert.equal(goiLuc.length, 1);
    assert.equal(ketQuaEl.hidden, false);
    assert.ok(ketQuaEl.textContent.includes("Quét quá nhanh, chờ một chút."));
    assert.ok(nut(ketQuaEl, "Thử lại"));
  });

  it("lỗi máy chủ 5xx cũng được tự gửi lại có giãn cách", async () => {
    const { may, goiLuc } = dung([{ status: 503, message: "Máy chủ bận." }, XANH]);
    may.nhanMa("TD1.A");
    await xa();
    mock.timers.tick(1000);
    await xa();
    assert.equal(goiLuc.length, 2);
  });

  it("«Quét tiếp» sau lỗi: không gửi lại ngay cùng mã (mốc 3 giây), không gửi mỗi ¼ giây", async () => {
    const { may, ketQuaEl, goiLuc } = dung([{ status: 400, message: "Mã không đọc được." }, XANH]);
    may.nhanMa("TD1.A");
    await xa();
    nut(ketQuaEl, "Quét tiếp")!.click();
    await cameraThay(may, "TD1.A", 2000);
    assert.equal(goiLuc.length, 1);
  });

  it("kết quả vàng: «Xác nhận cho đi» gửi lại cùng mã kèm cờ xác nhận", async () => {
    const vang = ve("VANG", "LECH_NGAY", "Vé ngày 22/11, hôm nay 21/11.");
    const { may, ketQuaEl, goiLuc, ghiNho } = dung([vang, XANH]);
    may.nhanMa("TD1.A");
    await xa();
    nut(ketQuaEl, "Xác nhận cho đi")!.click();
    await xa();
    assert.deepEqual(goiLuc[1], { ...goiLuc[1]!, ma: "TD1.A", xn: { lechNgay: true } });
    assert.equal(ghiNho.length, 2);
  });

  it("máy chủ không bao giờ trả lời (vd vòng chờ «đang xử lý» của api() kéo dài): hạn chót cứng vẫn hiện «Không gửi được» trong 15 giây", async () => {
    const { may, ketQuaEl } = dung(["treo-mai", "treo-mai", "treo-mai"]);
    const batDau = Date.now();
    may.nhanMa("TD1.A");
    await xa();
    let hienLuc = -1;
    for (let t = 0; t < 30_000 && hienLuc < 0; t += 250) {
      mock.timers.tick(250);
      await xa();
      if (!ketQuaEl.hidden) hienLuc = Date.now() - batDau;
    }
    assert.ok(hienLuc > 0 && hienLuc <= 15_000, `hiện «Không gửi được» lúc ${hienLuc} ms`);
    assert.ok(ketQuaEl.textContent.includes("Không gửi được"));
    assert.equal(may.dangBan(), true, "đang hiện màn lỗi");
    nut(ketQuaEl, "Quét tiếp")!.click();
    assert.equal(may.dangBan(), false, "hết hạn chót thì không còn kẹt «đang gửi»");
  });

  it("kết quả tới muộn sau khi đã hiện «Không gửi được»: thay bằng kết quả thật và ghi vào lượt gần đây", async () => {
    const { may, ketQuaEl, ghiNho } = dung([{ muon: 20_000, kq: XANH }]);
    may.nhanMa("TD1.A");
    await xa();
    for (let t = 0; t < 16_000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "LOI");
    for (let t = 0; t < 5000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "XANH");
    assert.equal(ghiNho.length, 1);
  });

  it("kết quả muộn của vé A tới khi người quét đã sang vé B: màn của B giữ nguyên, A vẫn được ghi vào lượt gần đây", async () => {
    const { may, ketQuaEl, ghiNho } = dung([{ muon: 20_000, kq: XANH }, DO_DA_DUNG]);
    may.nhanMa("TD1.A");
    await xa();
    for (let t = 0; t < 16_000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "LOI");
    nut(ketQuaEl, "Quét tiếp")!.click();
    may.nhanMa("TD1.B");
    await xa();
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO");
    for (let t = 0; t < 5000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO", "kết quả muộn của A không được đè màn của B");
    assert.deepEqual(ghiNho.map((k) => k.mau), ["DO", "XANH"]);
  });

  it("lỗi ở danh sách lượt gần đây (sau khi máy chủ đã trả lời) không bị coi là lỗi mạng: vẫn hiện kết quả, không gửi lại", async () => {
    const { may, ketQuaEl, goiLuc } = dung([XANH, XANH], { ghiNhoNem: true });
    may.nhanMa("TD1.A");
    await xa();
    mock.timers.tick(5000);
    await xa();
    assert.equal(goiLuc.length, 1);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "XANH");
  });

  it("guiNgay trả false khi đang bận (trang báo cho người quét, không bỏ ảnh im lặng)", async () => {
    const { may } = dung(["treo-mai"]);
    assert.equal(may.guiNgay("TD1.A"), true);
    await xa();
    assert.equal(may.guiNgay("TD1.B"), false);
  });

  it("«Xác nhận cho đi» đang gửi thì «Quét tiếp» bị khoá", async () => {
    const vang = ve("VANG", "CHUA_THU_DU", "Đơn chưa thu đủ.");
    const { may, ketQuaEl } = dung([vang, "treo-mai"]);
    may.nhanMa("TD1.A");
    await xa();
    const tiep = nut(ketQuaEl, "Quét tiếp")!;
    nut(ketQuaEl, "Xác nhận cho đi")!.click();
    assert.equal((tiep as unknown as { disabled?: boolean }).disabled, true);
  });

  // Việc 9 phần (d), chủ duyệt 23/11 «Đồng ý khuyến nghị việc 9»: máy chủ phát lại «lần trước đã ghi» thì báo «Lần quét trước đã được ghi», cho quét tiếp
  // ngay; không tải lại trang (tải lại tắt camera trên iPhone). Bản phát lại không mang kết quả của lần đó, nên màn không được mang màu phán quyết.
  it("máy chủ phát lại «đã ghi»: màn trung tính «Lần quét trước đã được ghi» + «Quét tiếp», không ghi vào lượt gần đây", async () => {
    const { may, ketQuaEl, ghiNho, trangThaiEl } = dung(["da-ghi"]);
    may.nhanMa("TD1.A");
    await xa();
    assert.equal(ketQuaEl.hidden, false);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DA_GHI");
    assert.ok(ketQuaEl.textContent.includes("Lần quét trước đã được ghi"));
    assert.doesNotMatch(ketQuaEl.textContent, /Hợp lệ|Không dùng được|Cần xác nhận|Không gửi được/, "không phán quyết về vé");
    assert.equal(ketQuaEl.querySelectorAll("button").length, 1);
    assert.ok(nut(ketQuaEl, "Quét tiếp"));
    assert.equal(ghiNho.length, 0, "không có lượt nào để ghi vào danh sách gần đây");
    assert.equal(trangThaiEl.textContent, "Camera đang đọc.");
    nut(ketQuaEl, "Quét tiếp")!.click();
    assert.equal(may.dangBan(), false, "quét tiếp được ngay");
  });

  it("mất phản hồi lần đầu, lần tự gửi lại gặp «đã ghi»: màn hiện trong 3 giây; «Quét tiếp» rồi vé còn trước camera thì 3 giây sau ra kết quả thật", async () => {
    const { may, ketQuaEl, goiLuc } = dung([{}, "da-ghi", DO_DA_DUNG]);
    const batDau = Date.now();
    may.nhanMa("TD1.A");
    await xa();
    let hienLuc = -1;
    for (let t = 0; t < 5000 && hienLuc < 0; t += 250) {
      mock.timers.tick(250);
      await xa();
      if (!ketQuaEl.hidden) hienLuc = Date.now() - batDau;
    }
    assert.ok(hienLuc > 0 && hienLuc <= 3000, `hiện sau ${hienLuc} ms`);
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DA_GHI");
    assert.equal(goiLuc.length, 2);
    nut(ketQuaEl, "Quét tiếp")!.click();
    await cameraThay(may, "TD1.A", CHONG_LAP_MS + 250);
    assert.equal(goiLuc.length, 3, "vé còn trước camera được kiểm lại sau mốc 3 giây");
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO");
  });

  it("«đã ghi» tới muộn sau khi đã hiện «Không gửi được»: thay màn lỗi bằng màn «Lần quét trước đã được ghi», không ghi vào lượt gần đây", async () => {
    const { may, ketQuaEl, ghiNho } = dung([{ muon: 20_000, kq: "da-ghi" }]);
    may.nhanMa("TD1.A");
    await xa();
    for (let t = 0; t < 16_000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "LOI");
    for (let t = 0; t < 5000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DA_GHI");
    assert.equal(ghiNho.length, 0);
  });

  it("«đã ghi» tới muộn khi người quét đã sang vé B: màn của B giữ nguyên, không ném", async () => {
    const { may, ketQuaEl, ghiNho } = dung([{ muon: 20_000, kq: "da-ghi" }, DO_DA_DUNG]);
    may.nhanMa("TD1.A");
    await xa();
    for (let t = 0; t < 16_000; t += 250) { mock.timers.tick(250); await xa(); }
    nut(ketQuaEl, "Quét tiếp")!.click();
    may.nhanMa("TD1.B");
    await xa();
    for (let t = 0; t < 5000; t += 250) { mock.timers.tick(250); await xa(); }
    assert.equal(ketQuaEl.querySelector(".qv-ket-than")?.getAttribute("data-mau"), "DO");
    assert.deepEqual(ghiNho.map((k) => k.mau), ["DO"]);
  });

  it("theo dõi camera: luồng bị dừng (ended) hoặc tạm dừng (mute/unmute) thì báo", () => {
    const track = doc.createElement("track");
    const bao: string[] = [];
    M.theoDoiCamera({ getVideoTracks: () => [track as unknown as MediaStreamTrack] }, { khiDung: () => bao.push("dung"), khiTamDung: () => bao.push("tam"), khiChayLai: () => bao.push("lai") });
    track.dispatchEvent({ type: "mute" });
    track.dispatchEvent({ type: "unmute" });
    track.dispatchEvent({ type: "ended" });
    assert.deepEqual(bao, ["tam", "lai", "dung"]);
  });
});

// Nối với lớp gửi lệnh chung (web/api.ts): chỉ đường lệnh quét của màn Quét vé tự xử lý «đã ghi trước đó»; mọi đường lệnh, mọi màn khác giữ cách cũ (báo rồi
// tải lại / mở trang kết quả). Bài tĩnh vì web/api.ts import không đuôi `.ts` (node không nạp thẳng được); khuôn: src/lan-gui-giao-dien.test.ts.
describe("Quét vé tự xử lý «đã ghi trước đó» (web/api.ts datKhiDaGhi)", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { maskSource } = await import("../scripts/source-mask-lib.mjs");
  const doc = (tep: string): string => maskSource(readFileSync(new URL(`../${tep}`, import.meta.url), "utf8"), { strings: false });

  it("api() gọi baoDaGhi kèm đường lệnh; datKhiDaGhi chỉ thay cho đúng đường lệnh đã đăng ký, đường khác về hàm cũ (vẫn tải lại)", () => {
    const t = doc("web/api.ts");
    assert.match(t, /ket: \(\) => baoDaGhi\(data\.ket_qua, path\) as Promise<T>/);
    assert.match(t, /baoDaGhi = \(ketQua, d\) => \(d === duong \? Promise\.resolve\(f\(\)\) : goc\(ketQua, d\)\);/);
    assert.match(t, /location\.reload\(\)/, "cách cũ vẫn tải lại");
  });

  it("chỉ web/quet-ve.ts gọi datKhiDaGhi, đúng một lần, cho đúng POST /api/ve/quet với dấu DA_GHI_TRUOC_DO", () => {
    const tep = readdirSync(new URL("../web/", import.meta.url), { recursive: true }).map(String).filter((f) => f.endsWith(".ts") && f !== "api.ts");
    const dung = tep.filter((f) => /\bdatKhiDaGhi\(/.test(doc(`web/${f}`)));
    assert.deepEqual(dung, ["quet-ve.ts"]);
    const goc = readFileSync(new URL("../web/quet-ve.ts", import.meta.url), "utf8");
    assert.equal(goc.match(/\bdatKhiDaGhi\(/g)?.length, 1);
    assert.match(goc, /datKhiDaGhi\("\/api\/ve\/quet", \(\) => DA_GHI_TRUOC_DO\);/);
  });
});
