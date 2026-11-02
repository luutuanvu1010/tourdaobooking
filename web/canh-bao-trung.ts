// Hộp cảnh báo "có thể trùng" dùng chung (ADR-0092 Đ6, Đ6a; bảng luật src/shared/luat-trung.ts). Máy chủ trả 409 `co_the_trung` kèm ứng viên; hộp hiện bản cũ, hai lối: «Xem bản cũ» (không ghi gì)
// hoặc «Vẫn ghi» (lý do bắt buộc, gửi lại cùng thân kèm `boQuaTrung`, thân đổi nên lớp chống gửi trùng coi là ý định mới). Trang không tự so trùng: mọi luật ở máy chủ.
import { ApiError } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { vnd } from "./format";
import { LY_DO_BO_QUA_TOI_THIEU, MA_LOI_TRUNG, type BoQuaTrung, type CanhBaoTrung } from "../src/shared/luat-trung";

const canhBaoCua = (err: unknown): CanhBaoTrung | null =>
  err instanceof ApiError && err.code === MA_LOI_TRUNG ? ((err.details as { canhBao?: CanhBaoTrung } | undefined)?.canhBao ?? null) : null;

/** `gui(undefined)` lần đầu; gặp cảnh báo thì hỏi rồi `gui({ ma, lyDo })`. Người dùng chọn không ghi ⇒ ném ApiError mã `da_dung` với câu rõ ràng cho banner của trang. */
export async function guiCoCanhBaoTrung<T>(gui: (boQua: BoQuaTrung | undefined) => Promise<T>, opener?: HTMLElement | null): Promise<T> {
  try {
    return await gui(undefined);
  } catch (err) {
    const cb = canhBaoCua(err);
    if (!cb) throw err;
    return hoi(cb, gui, opener ?? null);
  }
}

function hoi<T>(cb: CanhBaoTrung, gui: (boQua: BoQuaTrung | undefined) => Promise<T>, opener: HTMLElement | null): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const lyDo = h("textarea", { rows: 2, maxlength: 300, autocomplete: "off", "aria-label": "Lý do vẫn ghi" }) as HTMLTextAreaElement;
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const xem = h("button", { type: "button", class: "btn", "data-action": "xem-ban-cu" }, "Xem bản cũ");
    const van = h("button", { type: "button", class: "btn btn-primary", "data-action": "van-ghi" }, "Vẫn ghi");
    let xong = false;
    const dungLai = () => reject(new ApiError(0, "da_dung", "Chưa ghi gì — xem lại các khoản thu đã có của đơn."));
    const bang = moBangTruot({
      title: "Có thể trùng",
      body: [
        h("p", null, cb.cau),
        h("ul", { class: "dc-ds", "data-khoi": "ung-vien-trung" }, ...cb.ungVien.map((u) => h("li", { class: "dc-the" }, [vnd(u.soTien), u.ngay, u.maDon, u.chiTiet].filter(Boolean).join(" · ")))),
        cb.tongDaGan !== undefined ? h("p", { class: "muted" }, `Tổng đã gắn với mã này: ${vnd(cb.tongDaGan)}.`) : null,
        h("label", null, `Lý do vẫn ghi (tối thiểu ${LY_DO_BO_QUA_TOI_THIEU} ký tự, không ghi số điện thoại)`, lyDo),
        loi,
      ],
      foot: [xem, van],
      opener,
      onClosed: () => { if (!xong) dungLai(); },
    });
    if (!bang) { dungLai(); return; }
    xem.addEventListener("click", () => bang.close());
    van.addEventListener("click", () => void (async () => {
      const v = lyDo.value.trim();
      if (v.length < LY_DO_BO_QUA_TOI_THIEU) {
        loi.textContent = `Lý do tối thiểu ${LY_DO_BO_QUA_TOI_THIEU} ký tự.`;
        loi.hidden = false;
        return;
      }
      (van as HTMLButtonElement).disabled = true;
      bang.setBusy(true);
      try {
        const kq = await gui({ ma: cb.ma, lyDo: v });
        xong = true;
        bang.setBusy(false);
        bang.close();
        resolve(kq);
      } catch (err) {
        bang.setBusy(false);
        if (canhBaoCua(err)) {
          loi.textContent = err instanceof Error ? err.message : "Chưa ghi được.";
          loi.hidden = false;
          (van as HTMLButtonElement).disabled = false;
          return;
        }
        xong = true;
        bang.close();
        reject(err);
      }
    })());
  });
}
