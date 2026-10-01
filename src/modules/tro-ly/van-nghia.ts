// Tìm đoạn theo nghĩa cho trợ lý Hỗ trợ (ADR-0082 Đ2–Đ5) — MỘT hàm `timDoanTheoNghia` cho route hỏi VÀ ô thử (không chép khối). Gọi OpenAI Embeddings
// (hạn giờ riêng 8 giây), bộ nhớ isolate, tính bù dấu vân của đoạn kho còn thiếu; lỗi / quá giờ / phản hồi lệch / giải mã hỏng / tính bù sẽ vượt trần ⇒ LÙI về
// chonDoan (luật cũ) — câu trả lời vẫn chạy; log CHỈ `{"event":"tro_ly_van_nghia_loi"}` (không nội dung).
// SQL chỉ ở repository.ts (module nghiêm). Import KÈM đuôi .ts để van-nghia.test.ts nạp thẳng tệp này bằng node --test.
import type { PermissionCode } from "../../shared/permissions.ts";
import { chonDoan, dinhDangDoan, uocToken, type DoanTriThuc } from "../../shared/tro-ly.ts";
import {
  HET_GIO_NHUNG_MS, LO_GHI_D1, MAU_NHUNG, SO_CHIEU_NHUNG, blobSangVec, chiaLoNhung, chiPhiNhungMicroUsd, chonDoanTron, daChonTuKhoa, docPhanHoiNhung, khoaDoan,
  thanNhung, tienBuUoc, vecSangBlob, type DoanDaChon,
} from "../../shared/tro-ly-van-nghia.ts";
import { diaChiOpenAi } from "./goi-mau.ts";
import { docVanNghia, ghiVanNghia, type VanNghiaMoi } from "./repository.ts";

/**
 * Bộ nhớ isolate (V5): khoá → véc-tơ ĐỌC ĐƯỢC TỪ D1. Véc-tơ vừa tính bù KHÔNG vào đây (R1 của kế hoạch — để lần sau đường đọc + giải mã BLOB thật chạy);
 * véc-tơ CÂU HỎI không bao giờ vào đây. `khoaTheoChu` nhớ băm SHA-256 của chữ đoạn (chữ kho ít đổi).
 */
const boNho = new Map<string, Float32Array>();
const khoaTheoChu = new Map<string, string>();
/** Khung thử (tests/audit/harness.mjs) gọi đầu mỗi world(): mỗi world là một D1 mới. */
export function xoaBoNhoVanNghia(): void {
  boNho.clear();
  khoaTheoChu.clear();
}

export interface KetQuaNhung { readonly vec: Float32Array[]; readonly token: number }

/** null = lỗi HTTP / mạng / quá giờ / phản hồi lệch khuôn. `token` = usage.prompt_tokens; thiếu ⇒ ƯỚC (không bao giờ tính 0 khi không biết). */
export async function goiNhung(env: Env, khoa: string, dauVao: readonly string[], henMs: number = HET_GIO_NHUNG_MS): Promise<KetQuaNhung | null> {
  const ctl = new AbortController();
  const hen = setTimeout(() => ctl.abort(), henMs);
  try {
    const res = await fetch(`${diaChiOpenAi(env)}/v1/embeddings`, {
      method: "POST",
      headers: { authorization: `Bearer ${khoa}`, "content-type": "application/json" },
      body: JSON.stringify(thanNhung(dauVao)),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const doc = docPhanHoiNhung(await res.json().catch(() => null), dauVao.length);
    if (!doc) return null;
    return { vec: doc.vec, token: doc.token ?? dauVao.reduce((a, s) => a + uocToken(s), 0) };
  } catch {
    return null;
  } finally {
    clearTimeout(hen);
  }
}

export interface DauVaoTim {
  /** Câu hỏi đã che (+ câu hỏi trước đã che — truyVanTim, C5). */
  readonly truyVan: string;
  readonly perms: readonly PermissionCode[];
  readonly kho: readonly DoanTriThuc[];
  /** Trần tháng − đã dùng − mức trần trên của lượt (kiemTranTruocKhiGoi) — trần cho tiền tính bù (Đ5(2)). */
  readonly conLaiMicroUsd: number;
}
export interface KetQuaTimDoan { readonly daChon: DoanDaChon[]; readonly tienNhungMicroUsd: number }

async function khoaCuaChu(s: string): Promise<string> {
  const co = khoaTheoChu.get(s);
  if (co) return co;
  const k = await khoaDoan(s);
  khoaTheoChu.set(s, k);
  return k;
}

/**
 * Thứ tự (R5): băm → bộ nhớ / D1 → kiểm tiền tính bù (vượt ⇒ lùi, KHÔNG gọi API nào) → embedding câu hỏi (yêu cầu riêng) → tính bù theo lô → ghi D1 CHỈ khi mọi
 * lô thành công (L2) → chonDoanTron. `tienNhungMicroUsd` = tiền thật của mọi lần gọi Embeddings THÀNH CÔNG trong lượt (kể cả khi sau đó lùi).
 */
export async function timDoanTheoNghia(env: Env, khoa: string, a: DauVaoTim): Promise<KetQuaTimDoan> {
  let tien = 0;
  const lui = (): KetQuaTimDoan => {
    console.error(JSON.stringify({ event: "tro_ly_van_nghia_loi" }));
    return { daChon: daChonTuKhoa(chonDoan(a.truyVan, a.perms, a.kho)), tienNhungMicroUsd: tien };
  };
  try {
    if (!a.truyVan.trim()) return lui(); // Embeddings không nhận chuỗi rỗng
    const chu = a.kho.map(dinhDangDoan);
    const khoaDs = await Promise.all(chu.map(khoaCuaChu));
    const vec = new Map<string, Float32Array>();
    for (const k of khoaDs) {
      const v = boNho.get(k);
      if (v) vec.set(k, v);
    }
    for (const r of await docVanNghia(env.DB, [...new Set(khoaDs.filter((k) => !vec.has(k)))])) {
      const v = r.soChieu === SO_CHIEU_NHUNG ? blobSangVec(r.vec, r.soChieu) : null;
      if (!v) return lui(); // giải mã hỏng ≠ thiếu: không tính bù lại âm thầm (Review Focus 3)
      vec.set(r.khoa, v);
      boNho.set(r.khoa, v);
    }
    const thieu = new Map<string, string>(); // khoá → chữ; hai đoạn cùng chữ = một đầu vào (Review Focus 4)
    khoaDs.forEach((k, i) => {
      if (!vec.has(k) && !thieu.has(k)) thieu.set(k, chu[i]!);
    });
    if (tienBuUoc([...thieu.values()]) > a.conLaiMicroUsd) return lui(); // Đ5(2)
    const q = await goiNhung(env, khoa, [a.truyVan]);
    if (!q) return lui();
    tien += chiPhiNhungMicroUsd(q.token);
    if (thieu.size) {
      const ds = [...thieu.entries()];
      const moi: VanNghiaMoi[] = [];
      let j = 0;
      for (const lo of chiaLoNhung(ds.map(([, s]) => s))) {
        const kq = await goiNhung(env, khoa, lo);
        if (!kq) return lui(); // L2: chưa ghi dòng nào — lần sau tính lại
        tien += chiPhiNhungMicroUsd(kq.token);
        for (const v of kq.vec) {
          const k = ds[j++]![0];
          vec.set(k, v);
          moi.push({ khoa: k, mau: MAU_NHUNG, soChieu: SO_CHIEU_NHUNG, vec: vecSangBlob(v) });
        }
      }
      await ghiVanNghia(env.DB, moi, new Date().toISOString(), LO_GHI_D1);
    }
    return { daChon: chonDoanTron(a.truyVan, q.vec[0]!, a.kho, khoaDs.map((k) => vec.get(k) ?? null), a.perms), tienNhungMicroUsd: tien };
  } catch {
    return lui();
  }
}
