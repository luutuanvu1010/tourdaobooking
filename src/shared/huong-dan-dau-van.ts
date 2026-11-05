// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"9193d15bbf836d26","chu":"2fb4bfed0a02a211","ban":"2.67","ngay":"2026-11-05"},
  "cai-dat-ve": {"neo":"a231b660153582bd","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "dich-vu-can-kiem-ve": {"neo":"f097e777f431dcf1","chu":"b41fe0afa23fe41f","ban":"2.64","ngay":"2026-11-05"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"5b02c0bddf23461e","chu":"b045afebd2955379","ban":"2.65","ngay":"2026-11-05"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
