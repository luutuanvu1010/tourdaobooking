// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"d7303db0592aa04d","chu":"2fb4bfed0a02a211","ban":"2.70","ngay":"2026-11-06"},
  "cai-dat-ve": {"neo":"a231b660153582bd","chu":"78895cd744fbcb8b","ban":"2.58","ngay":"2026-11-03"},
  "dich-vu-can-kiem-ve": {"neo":"f097e777f431dcf1","chu":"b41fe0afa23fe41f","ban":"2.64","ngay":"2026-11-05"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"964fe9541f8821cd","chu":"4c299fabe8253f65","ban":"2.71","ngay":"2026-11-06"},
  "xem-no-tra-sau": {"neo":"973fc0d160c029ed","chu":"fa963bef8425dbf2","ban":"2.70","ngay":"2026-11-06"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
