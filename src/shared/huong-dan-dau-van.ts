// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"1cfaf66f78408bd4","chu":"de5d48de9c1bae1e","ban":"2.58","ngay":"2026-11-03"},
  "cai-dat-ve": {"neo":"a231b660153582bd","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
