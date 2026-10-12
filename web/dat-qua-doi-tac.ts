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

export function oDatQuaDoiTac(v: { daChon: BenDatChon | null; onDoi: (chon: BenDatChon | null) => void }): DatQuaDoiTac {
  const id = `dqdt-${++dem}`;
  let chon: BenDatChon | null = v.daChon;
  let dangTim = false;
  let seq = 0; // bỏ kết quả tìm cũ về muộn
  let timer: number | undefined;

  // Gán `datChon` ở cuối hàm (sau khi `ve` đã định nghĩa); trong lúc dựng chưa có nên ép kiểu qua `unknown`.
  const root = h("div", { class: "dqdt", id: "dat-qua-doi-tac" }) as unknown as DatQuaDoiTac;
  const nutMo = h("button", { type: "button", class: "btn", "data-action": "dat-qua-mo" }, "Đặt qua đối tác");
  const o = h("input", { type: "search", id: `${id}-q`, autocomplete: "off", maxLength: 60, placeholder: "Gõ tên đại lý / cộng tác viên", "aria-controls": `${id}-ds` });
  const ds = h("div", { class: "dqdt-ket-qua", id: `${id}-ds`, "aria-live": "polite" });
  const huy = h("button", { type: "button", class: "btn btn-link", "data-action": "dat-qua-huy" }, "Không chọn nữa");

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
          doi({ partyId: r.partyId, ten: r.ten });
          root.querySelector<HTMLElement>('[data-action="dat-qua-bo"]')?.focus(); // nút vừa bấm bị gỡ — đưa tiêu điểm vào nút "Bỏ chọn" mới
        });
        return b;
      }),
    );
  }

  function ve(): void {
    if (chon) {
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
      replaceChildren(root, h("label", { for: `${id}-q` }, "Tìm đối tác theo tên", o), ds, huy);
    } else {
      replaceChildren(root, nutMo, h("p", { class: "muted dqdt-ghi" }, "Đơn của đại lý hoặc cộng tác viên: chọn ở đây, không nhập vào ô khách."));
    }
  }

  nutMo.addEventListener("click", () => {
    dangTim = true;
    ve();
    o.value = "";
    replaceChildren(ds);
    void tim();
    o.focus();
  });
  huy.addEventListener("click", () => {
    dangTim = false;
    window.clearTimeout(timer);
    seq++; // kết quả đang bay về bị bỏ
    ve();
    nutMo.focus();
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
