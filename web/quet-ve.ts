// Trang "Quét vé" (ADR-0175 Đ3; đặc tả §2.5, §2.12). Hai đường đọc mã: camera sau (khung ~250 ms một lần, `docQrTuKhung`) và chụp ảnh (`docQrTuTep`, dự phòng luôn có).
//   POST /api/ve/quet           { ma, xacNhan? } → { mau, ma, ghi, cau, dichVu, nhomKhach, ngayDi, soCuoi, maDon?, lanQuetId? }
//   POST /api/ve/quet/:id/bo    { lyDo }         → { ok }
// Mã vé chỉ nằm trong bộ nhớ trang và thân yêu cầu: không vào địa chỉ, nhật ký, câu báo hay bộ nhớ trình duyệt. Ẩn/hiện hỏi bảng quyền; máy chủ kiểm lại. Không innerHTML.
import { ApiError, api } from "./api";
import { can } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { docQrTuKhung, docQrTuTep } from "./qr-doc-ve";
import { batDauDong, xetDocLap, type DauDocCuoi } from "../src/shared/chong-doc-lap";
import { initShell, showError } from "./shell";

type Mau = "XANH" | "VANG" | "DO";
interface KetQuaQuet { mau: Mau; ma: string; ghi: "DA_TINH" | "CHI_XEM" | "TU_CHOI" | null; cau: string; dichVu: string; nhomKhach: string; ngayDi: string | null; soCuoi: string; maDon?: string; lanQuetId?: string }
interface LuotGanDay { id: string; luc: number; mau: Mau; cau: string; dichVu: string; soCuoi: string; daBo: boolean }

/** Chữ lớn đi cùng màu: người mù màu vẫn đọc được kết quả. */
const CHU_LON: Record<Mau, { dau: string; chu: string }> = { XANH: { dau: "✓", chu: "Hợp lệ" }, VANG: { dau: "!", chu: "Cần xác nhận" }, DO: { dau: "✕", chu: "Không dùng được" } };
/** Mã kết quả vàng → cờ xác nhận gửi lại (khớp `XacNhanQuet` của máy chủ). */
const CO_XAC_NHAN: Record<string, "lechNgay" | "chuaThu" | "vuotKhach"> = { LECH_NGAY: "lechNgay", CHUA_THU_DU: "chuaThu", VUOT_KHACH: "vuotKhach" };
const CHU_KY_DOC_MS = 250;
const PHUT_TU_BO = 5;
const TOI_DA_GAN_DAY = 5;

const errorEl = byId("error");
const noiDungEl = byId("qv-noi-dung");
const videoEl = byId<HTMLVideoElement>("qv-video");
const trangThaiEl = byId("qv-trang-thai");
const nutBat = byId<HTMLButtonElement>("qv-bat");
const anhEl = byId<HTMLInputElement>("qv-anh");
byId("qv-chup").addEventListener("click", () => anhEl.click());
const ketQuaEl = byId("qv-ket-qua");
const ganDayEl = byId("qv-gan-day");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const ngayVn = (d: string): string => d.split("-").reverse().join("/");

if (!can(staff, "ve.quet.tinh") && !can(staff, "ve.quet.xem")) {
  showError(errorEl, "Bạn không có quyền quét vé.");
} else {
  noiDungEl.hidden = false;
  // Người chỉ xem (Tài xế công ty): nói rõ ngay từ đầu rằng quét không tính «đã dùng». Máy chủ vẫn quyết ở từng lượt quét.
  void api<{ tinh: boolean }>("/api/ve/quet/quyen").then((q) => { if (!q.tinh) baoTrangThai("Bạn chỉ xem vé có hợp lệ không; quét không tính đã dùng."); }, () => undefined);
  let luong: MediaStream | null = null;
  let hen: number | null = null;
  let dangGui = false;
  /** Đang hiện kết quả: tạm ngừng đọc để không quét thêm lượt khác. */
  let dangHien = false;
  let cuoi: DauDocCuoi = null;
  const ganDay: LuotGanDay[] = [];
  const canvas = document.createElement("canvas");

  const baoTrangThai = (chu: string): void => { trangThaiEl.textContent = chu; };

  function veGanDay(): void {
    if (ganDay.length === 0) { replaceChildren(ganDayEl, h("p", { class: "muted" }, "Chưa quét vé nào trong lần mở trang này.")); return; }
    replaceChildren(ganDayEl, ...ganDay.map((l) => {
      const trongHan = !l.daBo && Date.now() - l.luc <= PHUT_TU_BO * 60_000;
      const gio = new Date(l.luc).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
      const dong = h("div", { class: "qv-luot", "data-mau": l.mau },
        h("p", { class: "qv-luot-chu" }, h("strong", null, `${CHU_LON[l.mau].dau} ${CHU_LON[l.mau].chu}`), ` · ${gio} · ${l.dichVu} · số cuối ${l.soCuoi}`, l.daBo ? " · đã bỏ" : ""),
        h("p", { class: "muted" }, l.cau));
      if (trongHan) dong.append(khungBo(l));
      return dong;
    }));
  }

  /** Nút «Bỏ lượt quét» mở ô lý do (≥ 5 ký tự, không số điện thoại, không mã vé — máy chủ kiểm lại). */
  function khungBo(l: LuotGanDay): HTMLElement {
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const o = h("input", { type: "text", class: "o", maxLength: 300, autocomplete: "off", "aria-label": "Lý do bỏ lượt quét" });
    const nutGui = h("button", { type: "submit", class: "nut", "data-cap": "phu" }, "Bỏ lượt quét");
    const form = h("form", { class: "qv-bo-form", hidden: true }, o, nutGui, loi);
    const nutMo = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Bỏ lượt quét");
    nutMo.addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) o.focus(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const lyDo = o.value.trim();
      if (lyDo.length < 5) { loi.hidden = false; loi.textContent = "Hãy ghi lý do bỏ lượt quét (ít nhất 5 ký tự)."; return; }
      nutGui.disabled = true; loi.hidden = true;
      try {
        await api(`/api/ve/quet/${encodeURIComponent(l.id)}/bo`, { method: "POST", body: { lyDo } });
        l.daBo = true; veGanDay();
      } catch (err) { loi.hidden = false; loi.textContent = lyDoLoi(err); nutGui.disabled = false; }
    });
    return h("div", { class: "qv-bo" }, nutMo, form);
  }

  function ghiNho(kq: KetQuaQuet): void {
    if (!kq.lanQuetId) return;
    ganDay.unshift({ id: kq.lanQuetId, luc: Date.now(), mau: kq.mau, cau: kq.cau, dichVu: kq.dichVu, soCuoi: kq.soCuoi, daBo: false });
    ganDay.length = Math.min(ganDay.length, TOI_DA_GAN_DAY);
    soBoDuoc = conBoDuoc();
    veGanDay();
  }

  function dongKetQua(): void {
    dangHien = false; ketQuaEl.hidden = true; replaceChildren(ketQuaEl);
    cuoi = batDauDong(cuoi, Date.now()); // cửa sổ 3 giây tính từ lúc ĐÓNG: vé còn trước ống kính không bị đọc lại ngay
  }

  function hienKetQua(kq: KetQuaQuet, ma: string, xn: { lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean }): void {
    dangHien = true;
    const cu = CHU_LON[kq.mau];
    const chiTiet = [kq.dichVu, kq.nhomKhach, kq.ngayDi ? `Ngày đi ${ngayVn(kq.ngayDi)}` : "", kq.soCuoi ? `Số cuối ${kq.soCuoi}` : "", kq.maDon ? `Đơn ${kq.maDon}` : ""].filter(Boolean);
    const nut = h("div", { class: "qv-ket-nut" });
    const co = CO_XAC_NHAN[kq.ma];
    if (kq.mau === "VANG" && co) {
      const nutXn = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-co": "lon" }, "Xác nhận cho đi");
      nutXn.addEventListener("click", () => { nutXn.disabled = true; void gui(ma, { ...xn, [co]: true }); });
      nut.append(nutXn);
    }
    const nutTiep = h("button", { type: "button", class: "nut", "data-cap": co && kq.mau === "VANG" ? "phu" : "chinh", "data-co": "lon" }, "Quét tiếp");
    nutTiep.addEventListener("click", dongKetQua);
    nut.append(nutTiep);
    replaceChildren(ketQuaEl,
      h("div", { class: "qv-ket-than", "data-mau": kq.mau },
        h("p", { class: "qv-ket-dau", "aria-hidden": "true" }, cu.dau),
        h("h2", { class: "qv-ket-chu" }, cu.chu),
        h("p", { class: "qv-ket-cau" }, kq.cau),
        ...chiTiet.map((c) => h("p", { class: "qv-ket-ct" }, c)),
        nut));
    ketQuaEl.hidden = false;
    nutTiep.focus();
  }

  async function gui(ma: string, xn: { lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean } = {}): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    baoTrangThai("Đang kiểm tra vé…");
    try {
      const kq = await api<KetQuaQuet>("/api/ve/quet", { method: "POST", body: { ma, ...(Object.keys(xn).length ? { xacNhan: xn } : {}) } });
      ghiNho(kq);
      hienKetQua(kq, ma, xn);
      baoTrangThai(luong ? "Camera đang đọc." : "");
    } catch (err) {
      baoTrangThai(lyDoLoi(err));
      dangHien = false; cuoi = null; // lỗi mạng/máy chủ: cho quét lại ngay
    } finally { dangGui = false; }
  }

  /** Mã từ camera hoặc ảnh. Cùng mã trong 3 giây chỉ gửi một lần (camera đọc nhiều khung liên tiếp cùng một mã). */
  function nhanMa(ma: string): void {
    if (dangGui || dangHien) return;
    const x = xetDocLap(cuoi, ma, Date.now());
    cuoi = x.cuoi;
    if (x.gui) void gui(ma);
  }

  function docKhung(): void {
    if (dangGui || dangHien || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
    const rong = Math.min(videoEl.videoWidth, 640);
    const cao = Math.round(videoEl.videoHeight * (rong / videoEl.videoWidth));
    canvas.width = rong; canvas.height = cao;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, rong, cao);
    const ma = docQrTuKhung(ctx.getImageData(0, 0, rong, cao));
    if (ma) nhanMa(ma);
  }

  function tatCamera(): void {
    if (hen !== null) { clearInterval(hen); hen = null; }
    luong?.getTracks().forEach((t) => t.stop());
    luong = null; videoEl.srcObject = null;
    nutBat.textContent = "Bật camera";
  }

  nutBat.addEventListener("click", async () => {
    if (luong) { tatCamera(); baoTrangThai("Đã tắt camera."); return; }
    if (!navigator.mediaDevices?.getUserMedia) { baoTrangThai("Máy này không mở được camera trong trang. Hãy chụp ảnh mã vé."); return; }
    nutBat.disabled = true;
    try {
      luong = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      videoEl.srcObject = luong;
      await videoEl.play();
      hen = window.setInterval(docKhung, CHU_KY_DOC_MS);
      nutBat.textContent = "Tắt camera";
      baoTrangThai("Camera đang đọc.");
    } catch {
      tatCamera();
      baoTrangThai("Không mở được camera. Hãy cho phép camera cho trang này, hoặc chụp ảnh mã vé.");
    }
    nutBat.disabled = false;
  });

  anhEl.addEventListener("change", async () => {
    const tep = anhEl.files?.[0];
    anhEl.value = "";
    if (!tep) return;
    baoTrangThai("Đang đọc ảnh…");
    const ma = await docQrTuTep(tep);
    if (!ma) { baoTrangThai("Không thấy mã vé trong ảnh. Hãy chụp lại gần hơn và đủ sáng."); return; }
    nhanMa(ma);
  });

  // Đổi sang ứng dụng khác thì tắt camera (đèn camera không sáng ngầm); mở lại phải bấm «Bật camera».
  document.addEventListener("visibilitychange", () => { if (document.hidden && luong) { tatCamera(); baoTrangThai("Camera đã tắt khi rời trang."); } });
  window.addEventListener("pagehide", tatCamera);
  // Nút «Bỏ lượt quét» tự mất khi quá 5 phút.
  const conBoDuoc = (): number => ganDay.filter((l) => !l.daBo && Date.now() - l.luc <= PHUT_TU_BO * 60_000).length;
  let soBoDuoc = 0;
  window.setInterval(() => { const n = conBoDuoc(); if (n !== soBoDuoc) { soBoDuoc = n; veGanDay(); } }, 15_000);
  veGanDay();
}
