// Trang "Quét vé" (ADR-0175 Đ3; đặc tả §2.5, §2.12). Hai đường đọc mã: camera sau (khung ~250 ms một lần, `docQrTuKhung`) và chụp ảnh (`docQrTuTep`, dự phòng luôn có).
// Gửi, chống đọc lặp, tự gửi lại khi lỗi, màn kết quả: máy trạng thái ở web/quet-ve-may.ts (bài src/quet-ve-may-web.test.ts). Tệp này chỉ nối camera, ảnh, ô số sê-ri, lượt gần đây.
//   POST /api/ve/quet           { ma (mã QR hoặc SỐ SÊ-RI gõ tay, ADR-0217), xacNhan? } → { mau, ma, ghi, cau, dichVu, nhomKhach, ngayDi, soCuoi, maDon?, lanQuetId? }
//   POST /api/ve/quet/:id/bo    { lyDo }         → { ok }
// Mã vé chỉ nằm trong bộ nhớ trang và thân yêu cầu: không vào địa chỉ, nhật ký, câu báo hay bộ nhớ trình duyệt. Ẩn/hiện hỏi bảng quyền; máy chủ kiểm lại. Không innerHTML.
import { ApiError, api } from "./api";
import { can } from "../src/shared/permissions";
import { chuanHoaSoSeri } from "../src/shared/so-seri-ve";
import { byId, h, replaceChildren } from "./dom";
import { CANH_ANH_QUET, docQrTuKhung, docQrTuTep } from "./qr-doc-ve";
import { taoMayQuet, theoDoiCamera, type KetQuaQuet, type Mau } from "./quet-ve-may";
import { initShell, showError } from "./shell";

interface LuotGanDay { id: string; luc: number; mau: Mau; cau: string; dichVu: string; soVe: string; daBo: boolean }

/** Chữ lớn ở danh sách lượt gần đây (cùng chữ với màn kết quả). */
const CHU_LON: Record<Mau, { dau: string; chu: string }> = { XANH: { dau: "✓", chu: "Hợp lệ" }, VANG: { dau: "!", chu: "Cần xác nhận" }, DO: { dau: "✕", chu: "Không dùng được" } };
const CHU_KY_DOC_MS = 250;
const PHUT_TU_BO = 5;
const TOI_DA_GAN_DAY = 5;

const errorEl = byId("error");
const noiDungEl = byId("qv-noi-dung");
const videoEl = byId<HTMLVideoElement>("qv-video");
const trangThaiEl = byId("qv-trang-thai");
const nutBat = byId<HTMLButtonElement>("qv-bat");
const anhEl = byId<HTMLInputElement>("qv-anh");
const ketQuaEl = byId("qv-ket-qua");
const nhacEl = byId("qv-nhac");
const ganDayEl = byId("qv-gan-day");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

if (!can(staff, "ve.quet.tinh") && !can(staff, "ve.quet.xem")) {
  showError(errorEl, "Bạn không có quyền quét vé.");
} else {
  noiDungEl.hidden = false;
  // Người chỉ xem (Tài xế công ty): nói rõ ngay từ đầu rằng quét không tính «đã dùng». Máy chủ vẫn quyết ở từng lượt quét.
  void api<{ tinh: boolean }>("/api/ve/quet/quyen").then((q) => { if (!q.tinh) baoTrangThai("Bạn chỉ xem vé có hợp lệ không; quét không tính đã dùng."); }, () => undefined);
  let luong: MediaStream | null = null;
  let hen: number | null = null;
  const ganDay: LuotGanDay[] = [];
  const canvas = document.createElement("canvas");

  const baoTrangThai = (chu: string): void => { trangThaiEl.textContent = chu; };

  function veGanDay(): void {
    if (ganDay.length === 0) { replaceChildren(ganDayEl, h("p", { class: "muted" }, "Chưa quét vé nào trong lần mở trang này.")); return; }
    replaceChildren(ganDayEl, ...ganDay.map((l) => {
      const trongHan = !l.daBo && Date.now() - l.luc <= PHUT_TU_BO * 60_000;
      const gio = new Date(l.luc).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
      const dong = h("div", { class: "qv-luot", "data-mau": l.mau },
        h("p", { class: "qv-luot-chu" }, h("strong", null, `${CHU_LON[l.mau].dau} ${CHU_LON[l.mau].chu}`), ` · ${gio} · ${l.dichVu}${l.soVe}`, l.daBo ? " · đã bỏ" : ""),
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
    ganDay.unshift({ id: kq.lanQuetId, luc: Date.now(), mau: kq.mau, cau: kq.cau, dichVu: kq.dichVu, soVe: kq.soSeri ? ` · ${kq.soSeri}` : kq.soCuoi ? ` · số cuối ${kq.soCuoi}` : "", daBo: false });
    ganDay.length = Math.min(ganDay.length, TOI_DA_GAN_DAY);
    soBoDuoc = conBoDuoc();
    veGanDay();
  }

  const may = taoMayQuet({
    ketQuaEl,
    trangThaiEl,
    nhacEl,
    // Hạn chờ ngắn (`henGioMs`) thay 45 giây mặc định: người quét đang đứng trước khách. Vòng đời vé chống ghi trùng (ADR-0094) không đổi.
    goi: (ma, xn, henGioMs) => api<KetQuaQuet>("/api/ve/quet", { method: "POST", body: { ma, ...(Object.keys(xn).length ? { xacNhan: xn } : {}) }, henGioMs }),
    lyDoLoi,
    khiCoKetQua: ghiNho,
    dangDocCamera: () => luong !== null,
  });

  function docKhung(): void {
    if (may.dangBan() || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
    const rong = Math.min(videoEl.videoWidth, 640);
    const cao = Math.round(videoEl.videoHeight * (rong / videoEl.videoWidth));
    canvas.width = rong; canvas.height = cao;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, rong, cao);
    const ma = docQrTuKhung(ctx.getImageData(0, 0, rong, cao));
    if (ma) may.nhanMa(ma);
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
      const day = luong;
      // iOS có thể thu hồi hoặc tạm dừng camera (cuộc gọi tới, ứng dụng khác chiếm): báo ngay, không để hình đứng im mà trang không biết.
      theoDoiCamera(day, {
        khiDung: () => { if (luong === day) { tatCamera(); baoTrangThai("Camera đã dừng. Bấm «Bật camera» để mở lại."); } },
        khiTamDung: () => { if (luong === day) baoTrangThai("Camera đang bị tạm dừng. Nếu hình không chạy lại, bấm «Tắt camera» rồi «Bật camera»."); },
        khiChayLai: () => { if (luong === day) baoTrangThai("Camera đang đọc."); },
      });
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

  // Chụp ảnh: tắt camera trong trang TRƯỚC khi mở máy ảnh (iPhone không cho hai nơi giữ camera; giữ cả hai từng làm hình đứng). Gọi đồng bộ trong lúc bấm để iOS còn nhận là thao tác của người dùng.
  byId("qv-chup").addEventListener("click", () => {
    if (luong) { tatCamera(); baoTrangThai("Đã tắt camera để chụp ảnh. Bấm «Bật camera» để quét bằng camera."); }
    anhEl.click();
  });

  anhEl.addEventListener("change", async () => {
    const tep = anhEl.files?.[0];
    anhEl.value = "";
    if (!tep) return;
    baoTrangThai("Đang đọc ảnh…");
    const ma = await docQrTuTep(tep, { canhToiDa: CANH_ANH_QUET }); // ảnh 12 MP thu nhỏ trước khi đọc
    if (!ma) { baoTrangThai("Không thấy mã vé trong ảnh. Hãy chụp lại gần hơn và đủ sáng."); return; }
    // Người quét chủ động chụp: không xét mốc 3 giây. Đang kiểm vé khác thì nói rõ, không bỏ ảnh im lặng.
    if (!may.guiNgay(ma)) baoTrangThai("Đang kiểm tra một vé khác. Chờ có kết quả rồi chụp lại.");
  });

  // Gõ số sê-ri (ADR-0217 Đ2): khi vé không quét được (QR hỏng, in mờ). Cùng khung kết quả; luôn ra cảnh báo vàng «nhập tay» tới khi người quét bấm «Xác nhận cho đi».
  const soSeriEl = byId<HTMLInputElement>("qv-so-seri");
  const loiSoSeriEl = byId("qv-so-seri-loi");
  soSeriEl.addEventListener("input", () => { loiSoSeriEl.hidden = true; });
  byId<HTMLFormElement>("qv-form-so-seri").addEventListener("submit", (e) => {
    e.preventDefault();
    if (may.dangBan()) return;
    const so = chuanHoaSoSeri(soSeriEl.value);
    if (so === null) { loiSoSeriEl.textContent = "Số sê-ri gồm «VE_» và tám chữ cái, ví dụ VE_ABCDEFGH. Kiểm lại số in trên vé."; loiSoSeriEl.hidden = false; return; }
    loiSoSeriEl.hidden = true;
    soSeriEl.value = so;
    may.guiNgay(so);
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
