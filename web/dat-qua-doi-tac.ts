// Ô "Đặt qua đối tác" (sổ đại lý đợt 1, Task 11; đặc tả §7) dùng ở form lập đơn và bảng "Đổi khách": văn phòng chọn đại lý / cộng tác viên đứng tên đặt đơn, TÁCH khỏi hai ô tên + SĐT khách đi tour
// (ô tra hồ sơ khách theo SĐT điền tên khách vào đơn nên không dùng được để chọn đại lý). Tìm theo tên trong các hồ sơ (cá nhân hoặc tổ chức) đang mang vai được hưởng hoa hồng:
// GET /api/pricing/nguoi-huong?q= (trễ 300 ms; chỉ id, tên, loại hồ sơ). Ai thấy ô: `coODatQuaDoiTac` (src/shared/phan-doi-tac-hien-thi.ts — đúng cổng của route); máy chủ vẫn kiểm lại.
// Khi đã chọn, nơi dùng ẩn ô tra hồ sơ khách theo SĐT; bỏ chọn thì trở lại như cũ. Mọi nút là type="button" (ô nằm trong <form>); ô tìm là type="search" để Enter không gửi form (web/CLAUDE.md).
import type { BenDatChon } from "../src/shared/phan-doi-tac-hien-thi";
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

export type DatQuaDoiTac = HTMLElement & {
  /** Đặt lựa chọn từ ngoài (mở lại đơn đã lưu) — KHÔNG gọi `onDoi`. `null` = chưa chọn. */
  datChon(chon: BenDatChon | null): void;
};

let dem = 0;
const NHAN_LOAI: Record<"PERSON" | "ORGANIZATION", string> = { PERSON: "cá nhân", ORGANIZATION: "tổ chức" };
const CHO_GO_MS = 300;

/**
 * `gon` (đợt 1, 13/10; thiết kế lại 18/10 — màn Tạo đơn): thay nút rời "Đặt qua đối tác" + hai dòng chú thích bằng MỘT công tắc "Đơn của: Khách lẻ | Qua đối tác" (hàng nhãn "Đơn của", hai nút rộng hết khối, cao 44px,
 * mặc định "Khách lẻ", `aria-pressed`). `data-action` giữ nguyên: "Qua đối tác" = `dat-qua-mo`, "Khách lẻ" khi đang tìm / đã chọn = `dat-qua-huy`. Chọn xong, ô thu thành MỘT dòng nền xanh nhạt
 * "<tên> · cá nhân|tổ chức · được hưởng hoa hồng" + liên kết "Đổi" (mọi hồ sơ `nguoi-huong` trả về đều được hưởng hoa hồng nên câu này luôn đúng). Ai thấy ô, điều kiện hiện / ẩn, các id: KHÔNG đổi.
 * Mặc định tắt: bảng "Đổi khách" ở trang đơn giữ bố cục cũ (nút "Đặt qua đối tác", dòng "Đặt qua: …").
 */
export function oDatQuaDoiTac(v: { daChon: BenDatChon | null; onDoi: (chon: BenDatChon | null) => void; gon?: boolean }): DatQuaDoiTac {
  const gon = v.gon === true;
  const id = `dqdt-${++dem}`;
  let chon: BenDatChon | null = v.daChon;
  let dangTim = false;
  let seq = 0; // bỏ kết quả tìm cũ về muộn
  let timer: number | undefined;

  // Gán `datChon` ở cuối hàm (sau khi `ve` đã định nghĩa); trong lúc dựng chưa có nên ép kiểu qua `unknown`.
  const root = h("div", { class: "dqdt", id: "dat-qua-doi-tac" }) as unknown as DatQuaDoiTac;
  const nutMo = h("button", { type: "button", class: gon ? "loc-nut" : "btn", "data-action": "dat-qua-mo" }, gon ? "Qua đối tác" : "Đặt qua đối tác");
  const nutTuDat = h("button", { type: "button", class: "loc-nut" }, "Khách lẻ"); // chỉ dùng ở bố cục gọn
  const o = h("input", { type: "search", id: `${id}-q`, autocomplete: "off", maxLength: 60, placeholder: "Gõ tên đại lý / cộng tác viên", "aria-controls": `${id}-ds` });
  const ds = h("div", { class: "dqdt-ket-qua", id: `${id}-ds`, "aria-live": "polite" });
  const huy = h("button", { type: "button", class: "btn btn-link", "data-action": "dat-qua-huy" }, "Không chọn nữa");
  /** Bố cục gọn: nhãn "Đơn của" + công tắc hai nút; `quaDoiTac` = "Qua đối tác" đang bật (nút "Khách lẻ" khi đó là lối huỷ — mang `data-action="dat-qua-huy"`). */
  const hangChon = (quaDoiTac: boolean): HTMLElement => {
    nutMo.setAttribute("aria-pressed", String(quaDoiTac));
    nutTuDat.setAttribute("aria-pressed", String(!quaDoiTac));
    if (quaDoiTac) nutTuDat.setAttribute("data-action", "dat-qua-huy");
    else nutTuDat.removeAttribute("data-action");
    return h(
      "div",
      { class: "dqdt-hang" },
      h("span", { class: "dqdt-nhan", id: `${id}-nhan` }, "Đơn của"),
      h("div", { class: "dqdt-chon-ai", role: "group", "aria-labelledby": `${id}-nhan` }, nutTuDat, nutMo),
    );
  };

  const doi = (next: BenDatChon | null): void => {
    chon = next;
    dangTim = false;
    ve();
    v.onDoi(next);
  };

  async function tim(): Promise<void> {
    const mine = ++seq;
    let ketQua: Api.NguoiHuongTimResponse["ketQua"];
    try {
      ketQua = (await api<Api.NguoiHuongTimResponse>(`/api/pricing/nguoi-huong?q=${encodeURIComponent(o.value.trim())}`)).ketQua;
    } catch (err) {
      if (mine === seq) replaceChildren(ds, h("p", { class: "field-error", role: "alert" }, err instanceof ApiError ? err.message : "Không tìm được đối tác — kiểm tra mạng rồi thử lại."));
      return;
    }
    if (mine !== seq) return;
    if (ketQua.length === 0) {
      replaceChildren(ds, h("p", { class: "muted" }, o.value.trim() ? "Không có đối tác nào tên như vậy." : "Chưa có đối tác nào được hưởng hoa hồng."));
      return;
    }
    replaceChildren(
      ds,
      ...ketQua.map((r) => {
        const b = h("button", { type: "button", class: "btn dqdt-dong", "data-party-id": r.partyId }, h("span", { class: "dqdt-ten" }, r.ten), h("span", { class: "muted" }, NHAN_LOAI[r.loai]));
        b.addEventListener("click", () => {
          doi({ partyId: r.partyId, ten: r.ten, loai: r.loai });
          root.querySelector<HTMLElement>('[data-action="dat-qua-bo"], [data-action="dat-qua-doi"]')?.focus(); // nút vừa bấm bị gỡ — đưa tiêu điểm vào nút "Bỏ chọn" / "Đổi" mới
        });
        return b;
      }),
    );
  }

  function ve(): void {
    if (chon && gon) {
      const doiBtn = h("button", { type: "button", class: "btn btn-link", "data-action": "dat-qua-doi" }, "Đổi");
      doiBtn.addEventListener("click", () => {
        doi(null); // bỏ chọn cũ (ô tên / SĐT khách trở lại như khi chưa chọn) rồi mở ô tìm ngay như bấm "Qua đối tác"
        moTim();
      });
      const loai = chon.loai ? ` · ${NHAN_LOAI[chon.loai]}` : "";
      replaceChildren(root, hangChon(true), h("p", { class: "dqdt-chon dqdt-chon-xanh" }, h("span", { class: "dqdt-chon-chu" }, h("strong", { class: "dqdt-chon-ten" }, chon.ten), `${loai} · được hưởng hoa hồng`), doiBtn));
    } else if (chon) {
      const bo = h("button", { type: "button", class: "btn btn-link", "data-action": "dat-qua-bo" }, "Bỏ chọn");
      bo.addEventListener("click", () => {
        doi(null);
        nutMo.focus();
      });
      replaceChildren(
        root,
        h("p", { class: "dqdt-chon" }, h("span", null, "Đặt qua: "), h("strong", { class: "dqdt-chon-ten" }, chon.ten), bo),
        h("p", { class: "muted dqdt-ghi" }, "Tên và số điện thoại khách ở trên vẫn là của người đi tour."),
      );
    } else if (dangTim) {
      replaceChildren(root, ...(gon ? [hangChon(true)] : []), h("label", { for: `${id}-q` }, "Tìm đối tác theo tên", o), ds, gon ? null : huy);
    } else {
      replaceChildren(root, ...(gon ? [hangChon(false)] : [nutMo, h("p", { class: "muted dqdt-ghi" }, "Đơn của đại lý hoặc cộng tác viên: chọn ở đây, không nhập vào ô khách.")]));
    }
  }

  const moTim = (): void => {
    dangTim = true;
    ve();
    o.value = "";
    replaceChildren(ds);
    void tim();
    o.focus();
  };
  nutMo.addEventListener("click", () => {
    if (gon && (dangTim || chon)) return; // đang ở "Qua đối tác" thì bấm lại không làm gì
    moTim();
  });
  // Đã chọn xong mà bấm "Khách lẻ": bỏ chọn như "Bỏ chọn" của bố cục cũ.
  nutTuDat.addEventListener("click", () => {
    if (chon) {
      doi(null);
      nutTuDat.focus();
    }
  });
  const huyTim = (): void => {
    dangTim = false;
    window.clearTimeout(timer);
    seq++; // kết quả đang bay về bị bỏ
    ve();
    (gon ? nutTuDat : nutMo).focus();
  };
  huy.addEventListener("click", huyTim);
  nutTuDat.addEventListener("click", () => {
    if (dangTim) huyTim(); // đang ở "Khách tự đặt" thì bấm lại không làm gì
  });
  o.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void tim(), CHO_GO_MS);
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault(); // đề phòng ô nằm trong <form>: Enter không được gửi cả đơn
  });

  root.datChon = (next) => {
    chon = next;
    dangTim = false;
    window.clearTimeout(timer);
    seq++;
    ve();
  };
  ve();
  return root;
}

/**
 * Dòng chỉ đọc của tài khoản Đối tác mà máy chủ ÉP bên đặt (trường `benDatCuaToi` của `/api/auth/me`): thay ô tra hồ sơ khách — không ô nào để chọn.
 * Id riêng (không phải `#dat-qua-doi-tac`: Đối tác không có ô chọn đó).
 */
export function dongBenDatChiDoc(ben: BenDatChon): HTMLElement {
  return h(
    "p",
    { class: "dqdt-chi-doc", id: "ben-dat-chi-doc", "data-party-id": ben.partyId },
    h("span", { class: "muted" }, "Bên đặt: "),
    h("strong", null, ben.ten),
  );
}
