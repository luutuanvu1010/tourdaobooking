// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"8dc559f58665d613","chu":"c572d9caa4ee8eae","ban":"2.59","ngay":"2026-11-04"},
  "cai-dat-ve": {"neo":"a231b660153582bd","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "dich-vu-can-kiem-ve": {"neo":"f41b556da566bffc","chu":"241c150c6627acb9","ban":"2.61","ngay":"2026-11-04"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
