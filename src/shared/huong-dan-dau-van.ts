// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"c087353875ec71e8","chu":"127aee8ae0a43617","ban":"2.63","ngay":"2026-11-05"},
  "cai-dat-ve": {"neo":"a231b660153582bd","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "dich-vu-can-kiem-ve": {"neo":"f41b556da566bffc","chu":"241c150c6627acb9","ban":"2.61","ngay":"2026-11-04"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"c4ca1fde8268bf53","chu":"ce8e20208f151d5d","ban":"2.63","ngay":"2026-11-05"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
