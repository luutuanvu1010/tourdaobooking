// Tệp kèm tin vé hỗ trợ (ADR-0144; đặc tả 2026-10-28-dinh-kem-ve-ho-tro §3.6): ô chọn tệp dùng chung cho hộp «Gửi yêu cầu» và ô trả lời, thu nhỏ ảnh trên máy,
// vẽ tệp dưới bong bóng tin. Luật (nhãn, cỡ, kiểm trước, cỡ thu nhỏ) ở src/shared/tep-hien-thi.ts; máy chủ luôn kiểm lại. Chỉ ẩn/hiện.
// Mã hoá base64 MỘT lần lúc chọn và giữ cùng bản nháp: bấm Gửi lại gửi đúng từng byte cũ ⇒ cùng vé chống ghi trùng (ADR-0094), không tạo tin thứ hai.
import type { FeedbackTepDto, FeedbackTepGuiDto } from "../src/shared/contracts";
import { CAU_QUA_TONG, CAU_SAI_LOAI, TONG_BYTE_MOI_TIN, nhanLoaiTep, type LoaiTep } from "../src/shared/tep-dinh-kem";
import {
  CAU_DANG_CHUAN_BI, CAU_NHAC_GIAY_TO, CHAT_LUONG_JPG, NHAN_DINH_KEM, NHAN_GO_TEP, NHAN_TAI_VE, cauTrangThaiTep, coTep, duongTep, kichThuocThuNho, kiemTepDaChon, maBase64, nhanTep,
} from "../src/shared/tep-hien-thi";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

/** Một tệp đã chuẩn bị xong (đã thu nhỏ nếu là ảnh mở được, đã mã base64) — nằm trong bản nháp tới khi gửi được. Tên chỉ để người chọn nhận ra, KHÔNG gửi lên. */
export interface TepNhap { khoa: string; ten: string; loai: LoaiTep; kichThuoc: number; noiDung: string }

export const thanTep = (ds: readonly TepNhap[]): FeedbackTepGuiDto[] => ds.map((t) => ({ noiDung: t.noiDung }));

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,application/pdf";
const NEN_TRANG = "#ffffff"; // ảnh PNG trong suốt: tô nền trắng trước khi vẽ ra JPG (JPG không có kênh trong suốt)

/**
 * Vẽ lại ảnh qua khung vẽ: cạnh dài ≤ 2000, JPG 0,85 (ADR-0144 đ7) — bỏ luôn toạ độ chụp và mọi siêu dữ liệu. Giải bằng thẻ `<img>` để trình duyệt tự xoay theo
 * hướng chụp. Không giải được (HEIC trên máy tính) / lỗi bất kỳ ⇒ null: người gọi gửi nguyên tệp.
 */
async function thuNhoAnh(f: Blob): Promise<Uint8Array | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { rong, cao } = kichThuocThuNho(img.naturalWidth, img.naturalHeight);
    if (!rong || !cao) return null;
    const c = document.createElement("canvas");
    c.width = rong;
    c.height = cao;
    const g = c.getContext("2d");
    if (!g) return null;
    g.fillStyle = NEN_TRANG;
    g.fillRect(0, 0, rong, cao);
    g.drawImage(img, 0, 0, rong, cao);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", CHAT_LUONG_JPG));
    if (!blob) return null;
    const ra = new Uint8Array(await blob.arrayBuffer());
    return nhanLoaiTep(ra.subarray(0, 16)) === "jpg" ? ra : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Đọc + nhận loại theo chữ ký (không tin đuôi tệp) + thu nhỏ ảnh + mã base64. Sai loại / PDF quá trần ⇒ câu báo. */
async function chuanBiTep(f: File): Promise<TepNhap | { loi: string }> {
  let bytes: Uint8Array = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  let loai = nhanLoaiTep(bytes);
  if (!loai) return { loi: CAU_SAI_LOAI };
  if (loai === "pdf" && f.size > TONG_BYTE_MOI_TIN) return { loi: CAU_QUA_TONG };
  const nho = loai === "pdf" ? null : await thuNhoAnh(f);
  if (nho) {
    bytes = nho;
    loai = "jpg";
  } else bytes = new Uint8Array(await f.arrayBuffer());
  return { khoa: crypto.randomUUID(), ten: f.name, loai, kichThuoc: bytes.length, noiDung: maBase64(bytes) };
}

/** Số thứ tự trong số ẢNH (PDF không đánh số) — dùng cho nhãn «Ảnh 1», «Ảnh 2». */
function thuTuAnh(ds: readonly { loai: LoaiTep }[]): number[] {
  let n = 0;
  return ds.map((t) => (t.loai === "pdf" ? 0 : ++n));
}

export interface OChonTep {
  khoi: HTMLElement;
  ds(): TepNhap[];
  /** Còn tệp đang chuẩn bị (đọc, thu nhỏ): nút Gửi phải chờ. */
  dangChuanBi(): boolean;
}

/**
 * Nút «Đính kèm» + danh sách tệp đã chọn (bỏ được) + câu nhắc. `ban` = tệp của bản nháp (dựng lại ô trả lời không mất tệp); `khiDoi` báo bản nháp mới.
 * Lỗi chọn tệp (sai loại, quá số, quá cỡ) hiện qua `hienLoi`; tệp lỗi không vào danh sách, tệp khác vẫn vào.
 */
export function taoOChonTep(o: { ban: readonly TepNhap[]; khiDoi(ds: TepNhap[]): void; hienLoi(m: string | null): void; id: string }): OChonTep {
  let ds: TepNhap[] = [...o.ban];
  let dangLam = 0;
  const input = h("input", { type: "file", multiple: true, accept: ACCEPT, hidden: true, id: `${o.id}-input`, "aria-hidden": "true", tabIndex: -1 });
  const nut = h("button", { type: "button", class: "btn btn-link ht-tep-nut", id: `${o.id}-nut`, "aria-describedby": `${o.id}-nhac` }, icon("attach", 18), ` ${NHAN_DINH_KEM}`);
  const nhac = h("p", { class: "muted ht-tep-nhac", id: `${o.id}-nhac` }, CAU_NHAC_GIAY_TO);
  const dangCB = h("p", { class: "muted", role: "status", hidden: true }, CAU_DANG_CHUAN_BI);
  const danhSach = h("ul", { class: "ht-tep-ds", id: `${o.id}-ds`, "aria-label": "Tệp đã chọn" });
  const ve = (): void => {
    const tt = thuTuAnh(ds);
    replaceChildren(danhSach, ...ds.map((t, i) => {
      const bo = h("button", { type: "button", class: "btn btn-link ht-tep-bo", "aria-label": `Bỏ tệp ${t.ten}` }, "Bỏ");
      bo.addEventListener("click", () => {
        ds = ds.filter((x) => x.khoa !== t.khoa);
        o.hienLoi(null);
        o.khiDoi(ds);
        ve();
      });
      return h("li", { class: "ht-tep-muc", "data-tep-chon": t.khoa }, h("span", null, nhanTep(t, tt[i] ?? 0)), h("span", { class: "muted ht-tep-ten" }, t.ten), bo);
    }));
    danhSach.hidden = ds.length === 0;
  };
  nut.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const tep = [...(input.files ?? [])];
    input.value = ""; // chọn lại đúng tệp vừa bỏ vẫn kích hoạt
    if (tep.length === 0) return;
    o.hienLoi(null);
    dangLam++;
    dangCB.hidden = false;
    nut.disabled = true;
    let loi: string | null = null;
    try {
      for (const f of tep) {
        let r: TepNhap | { loi: string };
        try {
          r = await chuanBiTep(f);
        } catch {
          r = { loi: CAU_SAI_LOAI };
        }
        if ("loi" in r) {
          loi ??= r.loi;
          continue;
        }
        const qua = kiemTepDaChon([...ds, r]); // tệp làm vượt trần không vào; tệp trước đó vẫn giữ
        if (qua) {
          loi ??= qua;
          continue;
        }
        ds = [...ds, r];
      }
    } finally {
      dangLam--;
      dangCB.hidden = dangLam > 0;
      nut.disabled = dangLam > 0;
      o.khiDoi(ds);
      ve();
      if (loi) o.hienLoi(loi);
    }
  });
  ve();
  return {
    khoi: h("div", { class: "ht-tep-chon" }, h("div", { class: "ht-tep-hang" }, nut, nhac, input), danhSach, dangCB),
    ds: () => ds,
    dangChuanBi: () => dangLam > 0,
  };
}

// ---- Tệp trong luồng tin ----------------------------------------------------------------------------------------------------------------------
/**
 * Bảng CẤP TRANG theo mã tệp: phần tử ảnh đã tạo được gắn lại mỗi lần luồng dựng lại (tự làm mới, gửi, nhận việc, chuyển nhóm) — mỗi ảnh chỉ tải MỘT lần trong lúc
 * trang mở, nên nhật ký `feedback_attachment_viewed` không bị ghi lặp (ADR-0144 đ4). Ảnh lỗi (HEIC trên máy tính, mạng) nhớ «loi»: vẽ nút Tải về, không tự thử lại.
 */
const anhCuaTrang = new Map<string, HTMLElement | "loi">();

const theTaiVe = (ticketId: string, t: FeedbackTepDto, nhan: string): HTMLElement =>
  h("div", { class: "ht-tep-the", "data-tep": t.id },
    h("span", null, nhan),
    h("a", { class: "btn btn-link", href: duongTep(ticketId, t.id), target: "_blank", rel: "noopener", "aria-label": `${NHAN_TAI_VE} ${nhan}` }, NHAN_TAI_VE));

function anh(ticketId: string, t: FeedbackTepDto, nhan: string): HTMLElement {
  const co = anhCuaTrang.get(t.id);
  if (co === "loi") return theTaiVe(ticketId, t, nhan);
  if (co) return co;
  const img = h("img", { src: duongTep(ticketId, t.id), alt: nhan, loading: "lazy", decoding: "async" });
  const vo = h("a", { class: "ht-tep-anh", href: duongTep(ticketId, t.id), target: "_blank", rel: "noopener", "data-tep": t.id, "aria-label": `Mở ${nhan}` }, img);
  img.addEventListener("error", () => {
    anhCuaTrang.set(t.id, "loi");
    vo.replaceWith(theTaiVe(ticketId, t, nhan));
  }, { once: true });
  anhCuaTrang.set(t.id, vo);
  return vo;
}

/** Khối tệp dưới chữ của một tin. `goTep` (chỉ Toàn quyền — ô `feedback.triage`; máy chủ kiểm lại) có thì tệp đã lưu có nút «Gỡ tệp». */
export function veTepTin(ticketId: string, tep: readonly FeedbackTepDto[], goTep: ((t: FeedbackTepDto, nut: HTMLButtonElement, nhan: string) => void) | null): HTMLElement | null {
  if (tep.length === 0) return null;
  const tt = thuTuAnh(tep);
  return h("div", { class: "ht-tep-tin" }, ...tep.map((t, i) => {
    const nhan = nhanTep(t, tt[i] ?? 0);
    const cau = cauTrangThaiTep(t.trangThai);
    if (cau !== null) return h("p", { class: "muted ht-tep-trang", "data-tep": t.id, "data-trang-thai": t.trangThai }, t.trangThai === "DA_GO" ? cau : `${cau} (${coTep(t.kichThuoc)})`);
    const khoi = t.loai === "pdf" ? theTaiVe(ticketId, t, nhan) : anh(ticketId, t, nhan);
    if (!goTep) return khoi;
    const go = h("button", { type: "button", class: "btn btn-link ht-tep-go", "data-go-tep": t.id, "aria-label": `${NHAN_GO_TEP} ${nhan}` }, NHAN_GO_TEP);
    go.addEventListener("click", () => goTep(t, go, nhan));
    return h("div", { class: "ht-tep-o" }, khoi, go);
  }));
}

/** Tệp vừa bị gỡ: bỏ khỏi bảng cấp trang (ảnh không còn vẽ nữa). */
export const quenAnh = (tepId: string): void => void anhCuaTrang.delete(tepId);
