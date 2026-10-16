// Khối giao diện dùng chung của bảo mật hai lớp (ADR-0074; kế hoạch Phần B Task 7): bật ứng dụng xác thực (mã QR + nút "Mở ứng dụng xác thực" + "Chép khoá"
// + ô mã 6 số) và bộ mã dự phòng hiện một lần (Chép / Tải tệp .txt). Dùng ở trang Tôi (web/account.ts) và bước bật lại khi đăng nhập (web/login.ts).
// Khoá TOTP và phiếu bật chỉ sống trong biến của khối này: KHÔNG ghi vào localStorage / sessionStorage / nhật ký. Mã QR vẽ bằng `veMaQr` (web/qr-ve.ts —
// bộ vẽ qrcode-generator 2.0.4, MIT, đã chép ở ADR-0108; chỉ tệp đó được import bộ vẽ, bài src/vendor-qr.test.ts).
// Review Focus 1 của kế hoạch: iPhone không quét được mã QR trên chính màn hình mình → nút "Mở ứng dụng xác thực" là liên kết `otpauth://` (ứng dụng xác thực
// đã cài tự mở và thêm tài khoản) + "Chép khoá" để gõ tay.
import { ApiError, type Api } from "./api";
import { h, replaceChildren } from "./dom";
import { veMaQr } from "./qr-ve";
import { CHU_DO_MA_DU_PHONG, cauLoiHaiLop, khoaDeDoc, maTotpTuO, tenTepMaDuPhong, vanBanMaDuPhong } from "../src/shared/hai-lop-hien-thi";

/** Câu hiện cho một lỗi ở chỗ nhập mã: 429 → câu cố định (không hứa mở khoá bằng mã dự phòng); lỗi khác → nguyên câu máy chủ; mất mạng → câu chung. */
export const loiHaiLop = (err: unknown): string => (err instanceof ApiError ? cauLoiHaiLop(err.code, err.message) : "Không kết nối được máy chủ.");

/**
 * Câu hiện cho lỗi khi GỬI mã qua email (Phần C): nguyên câu máy chủ — kể cả 429, vì hạn mức gửi thư có câu riêng ("Đã gửi quá nhiều mã qua email…"), khác
 * câu 429 cố định của chỗ nhập mã (loiHaiLop). Mất mạng → câu chung.
 */
export const loiGuiThu = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** Ô mã 6 số của ứng dụng xác thực: bàn phím số, iPhone gợi ý mã (one-time-code), chỉ nhận chữ số. Cỡ chữ 16px do CSS chung của `input`. */
export function oMaSau(id?: string): HTMLInputElement {
  const el = h("input", {
    id, class: "mfa-code", type: "text", inputmode: "numeric", autocomplete: "one-time-code", pattern: "[0-9]{6}", maxlength: "6", placeholder: "6 số", enterkeyhint: "done",
  });
  el.addEventListener("input", () => {
    if (el.getAttribute("inputmode") !== "numeric") return; // ô đã đổi sang mã dự phòng (datKieuO): giữ chữ cái và dấu gạch
    const v = maTotpTuO(el.value);
    if (v !== el.value) el.value = v;
  });
  return el;
}

/** Đổi một ô nhập sang kiểu "mã dự phòng" (9 ký tự xxxx-xxxx, chữ thường + số) hoặc trở lại ô 6 số. Máy chủ tự chuẩn hoá (bỏ gạch, chữ hoa). */
export function datKieuO(el: HTMLInputElement, duPhong: boolean): void {
  el.value = "";
  if (duPhong) {
    el.setAttribute("inputmode", "text");
    el.autocomplete = "off";
    el.removeAttribute("pattern");
    el.maxLength = 9;
    el.placeholder = "xxxx-xxxx";
    el.setAttribute("autocapitalize", "none");
    el.spellcheck = false;
  } else {
    el.setAttribute("inputmode", "numeric");
    el.autocomplete = "one-time-code";
    el.setAttribute("pattern", "[0-9]{6}");
    el.maxLength = 6;
    el.placeholder = "6 số";
  }
}

/** Chép chữ vào bộ nhớ tạm; được thì đổi chữ nút một lúc. Không chép được (trình duyệt chặn) thì báo bằng chữ nút. */
async function chep(nut: HTMLButtonElement, chu: string, nhanGoc: string): Promise<void> {
  try {
    if (!navigator.clipboard) throw new Error("no-clipboard");
    await navigator.clipboard.writeText(chu);
    nut.textContent = "Đã chép";
  } catch {
    nut.textContent = "Chưa chép được — gõ tay";
  }
  setTimeout(() => (nut.textContent = nhanGoc), 2500);
}

const nut = (label: string, cls: string, onclick: () => void): HTMLButtonElement => {
  const b = h("button", { type: "button", class: cls }, label);
  b.addEventListener("click", onclick);
  return b;
};

export interface BatTotpOpts {
  /** Lấy khoá mới (chưa lưu): `/api/account/mfa/totp/start` hoặc `/api/auth/mfa/enroll/start`. */
  batDau: () => Promise<Api.MfaTotpStartResponse>;
  /** Xác nhận mã của khoá mới; trả bộ mã dự phòng nếu máy chủ vừa tạo (yếu tố đầu tiên). */
  xacNhan: (setupToken: string, code: string, maHienTai: string | null) => Promise<string[] | undefined>;
  /** Đổi sang khoá mới khi đã bật: hỏi thêm mã hiện tại (ứng dụng cũ) hoặc một mã dự phòng. */
  hoiMaHienTai?: boolean;
  /** Nhãn ô mã hiện tại (mặc định "Mã hiện tại (ứng dụng cũ) hoặc một mã dự phòng"; người chỉ có email: "Một mã dự phòng"). */
  nhanMaHienTai?: string;
  onXong: (codes: string[] | undefined) => void;
  onHuy?: () => void;
  /** Lỗi cần đưa ra ngoài (vd phiếu chờ đăng nhập hết hạn → quay về form PIN). Trả true = đã xử lý, khối không hiện lỗi. */
  onLoi?: (err: unknown) => boolean;
}

/**
 * Khối "Bật ứng dụng xác thực": hai bước (thêm tài khoản vào ứng dụng → nhập mã đang hiện). Tự gọi `batDau` khi dựng; phiếu bật hết hạn (10 phút) thì tự lấy
 * khoá mới và báo người dùng thêm lại.
 */
export function khoiBatTotp(opts: BatTotpOpts): HTMLElement {
  const nhanMaCu = opts.nhanMaHienTai ?? "Mã hiện tại (ứng dụng cũ) hoặc một mã dự phòng";
  const goc = h("div", { class: "mfa-enroll", id: "mfa-enroll" });
  const loiEl = h("div", { class: "alert", role: "alert", hidden: true });
  const baoLoi = (msg: string | null) => {
    loiEl.textContent = msg ?? "";
    loiEl.hidden = !msg;
  };

  async function napKhoa(ghiChu: string | null): Promise<void> {
    replaceChildren(goc, h("p", { class: "muted", role: "status" }, "Đang tạo khoá…"));
    let k: Api.MfaTotpStartResponse;
    try {
      k = await opts.batDau();
    } catch (err) {
      if (opts.onLoi?.(err)) return;
      baoLoi(loiHaiLop(err));
      replaceChildren(goc, loiEl, h("div", { class: "actions" }, nut("Thử lại", "btn", () => void napKhoa(null)), opts.onHuy && nut("Huỷ", "btn", opts.onHuy)));
      return;
    }
    ve(k, ghiChu);
  }

  function ve(k: Api.MfaTotpStartResponse, ghiChu: string | null): void {
    baoLoi(ghiChu);
    const qr = h("canvas", { class: "mfa-qr", role: "img", "aria-label": "Mã QR để quét bằng ứng dụng xác thực trên điện thoại khác" }) as HTMLCanvasElement;
    veMaQr(qr, k.otpauth, 480);
    const nutChep = nut("Chép khoá", "btn", () => void chep(nutChep, k.secret, "Chép khoá"));
    const ma = oMaSau("mfa-enroll-code");
    const maCu = opts.hoiMaHienTai ? h("input", { id: "mfa-enroll-current", type: "text", autocomplete: "off", autocapitalize: "none", maxlength: "9" }) : null;
    if (maCu) maCu.spellcheck = false; // (h() bỏ qua giá trị false nên đặt sau)
    const nutXacNhan = nut("Xác nhận bật", "btn btn-primary btn-chinh", () => void guiMa());
    async function guiMa(): Promise<void> {
      if (ma.value.length !== 6) return baoLoi("Nhập đủ 6 số đang hiện trên ứng dụng xác thực.");
      if (maCu && !maCu.value.trim()) return baoLoi(`Nhập ô “${nhanMaCu}”.`);
      baoLoi(null);
      nutXacNhan.disabled = true;
      try {
        const codes = await opts.xacNhan(k.setupToken, ma.value, maCu ? maCu.value.trim() : null);
        opts.onXong(codes);
      } catch (err) {
        nutXacNhan.disabled = false;
        if (opts.onLoi?.(err)) return;
        if (err instanceof ApiError && err.code === "setup_expired") {
          void napKhoa("Khoá vừa tạo đã quá 10 phút. Nền tảng đã tạo khoá mới: xoá dòng cũ trong ứng dụng xác thực, thêm lại rồi nhập mã mới.");
          return;
        }
        ma.value = "";
        baoLoi(loiHaiLop(err));
        ma.focus();
      }
    }
    ma.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void guiMa();
    });
    replaceChildren(
      goc,
      h("h3", null, "Bước 1 — Thêm Tour Đảo vào ứng dụng xác thực"),
      h("p", { class: "muted" }, "Cài Google Authenticator (App Store hoặc CH Play) trên điện thoại riêng của bạn. Đang dùng chính điện thoại đó: bấm nút dưới đây. Đang dùng máy tính: mở ứng dụng trên điện thoại, chọn thêm mã và quét mã QR."),
      h("a", { class: "btn btn-accent mfa-open", href: k.otpauth }, "Mở ứng dụng xác thực"),
      h("div", { class: "mfa-qr-wrap" }, qr),
      h("p", { class: "muted" }, "Không quét được và không mở được? Gõ tay khoá này vào ứng dụng (chọn \"Nhập khoá thiết lập\", loại theo thời gian):"),
      h("p", { class: "mfa-key" }, h("code", { id: "mfa-key" }, khoaDeDoc(k.secret))),
      h("div", { class: "actions" }, nutChep),
      h("h3", null, "Bước 2 — Nhập mã 6 số ứng dụng đang hiện"),
      h("label", null, "Mã 6 số", ma),
      maCu && h("label", null, nhanMaCu, maCu),
      loiEl,
      h("div", { class: "actions" }, nutXacNhan, opts.onHuy && nut("Huỷ", "btn", opts.onHuy)),
    );
  }

  void napKhoa(null);
  return goc;
}

/** Tải tệp .txt: máy chia sẻ được tệp (iPhone) thì mở bảng chia sẻ (lưu vào Tệp, gửi cho chính mình…), không thì tải về bằng liên kết `blob:`. */
async function taiTxt(chu: string, tenTep: string, noiChua: HTMLElement): Promise<void> {
  const blob = new Blob([chu], { type: "text/plain;charset=utf-8" });
  try {
    if (typeof navigator.canShare === "function" && typeof navigator.share === "function") {
      const tep = new File([blob], tenTep, { type: "text/plain" });
      if (navigator.canShare({ files: [tep] })) {
        await navigator.share({ files: [tep], title: "Mã dự phòng" });
        return;
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return; // người dùng tự đóng bảng chia sẻ
  }
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: tenTep, hidden: true });
  noiChua.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Bộ 10 mã dự phòng — hiện MỘT lần (máy chủ không trả lại được). Bấm nút cuối mới đi tiếp. */
export function khoiMaDuPhong(codes: readonly string[], onXong: () => void, nhanXong = "Tôi đã cất mã"): HTMLElement {
  const luc = new Date().toISOString();
  const chu = vanBanMaDuPhong(codes, luc);
  const goc = h("div", { class: "mfa-recovery", id: "mfa-recovery" });
  const nutChep = nut("Chép", "btn", () => void chep(nutChep, chu, "Chép"));
  const nutTai = nut("Tải tệp .txt", "btn", () => void taiTxt(chu, tenTepMaDuPhong(luc), goc));
  replaceChildren(
    goc,
    h("h3", null, "Mã dự phòng"),
    h("p", { class: "mfa-warn" }, CHU_DO_MA_DU_PHONG),
    h("p", { class: "muted" }, "Mất điện thoại hoặc chưa mở được ứng dụng xác thực: nhập một mã này thay cho mã 6 số. Các mã chỉ hiện một lần này."),
    h("ol", { class: "mfa-codes" }, ...codes.map((c) => h("li", null, h("code", null, c)))),
    h("div", { class: "actions" }, nutChep, nutTai),
    h("div", { class: "actions" }, nut(nhanXong, "btn btn-primary btn-chinh", onXong)),
  );
  return goc;
}
