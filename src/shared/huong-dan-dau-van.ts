// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"37ba5cffdb117d60","chu":"7a1bd9ae6f0d4a6a","ban":"2.58","ngay":"2026-11-03"},
  "cai-dat-ve": {"neo":"ee6597bf0a29eb67","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "giao-dien": {"neo":"260aae66a6efedad","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
