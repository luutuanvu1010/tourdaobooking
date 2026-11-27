// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"7a1ca5bd1e9812c9","chu":"06499a40550f473e","ban":"3.37","ngay":"2026-11-23"},
  "quet-ve": {"neo":"4f35180cc3cd9424","chu":"a44eef5edc87a346","ban":"3.41","ngay":"2026-11-23"},
  "doi-chieu-ve": {"neo":"fd305aef484ccfe9","chu":"80947f92445b6340","ban":"3.37","ngay":"2026-11-23"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"f2dde5cfd02f1520","chu":"b41fe0afa23fe41f","ban":"3.33","ngay":"2026-11-23"},
  "gioi-han-nhap-hoa-hong": {"neo":"9e56bee20378a347","chu":"f2fe829bae2aff80","ban":"3.46","ngay":"2026-11-25"},
  "han-muc-tra-sau": {"neo":"bc84892ade82cd08","chu":"e1ce3060c41a683e","ban":"3.46","ngay":"2026-11-25"},
  "xem-no-tra-sau": {"neo":"e2d1bf42302398af","chu":"87acc817cf3c3645","ban":"3.46","ngay":"2026-11-25"},
  "giao-dien": {"neo":"efd83d0bffbcc516","chu":"8d315591cb3389c0","ban":"3.50","ngay":"2026-11-26"},
  "phi-don": {"neo":"a0fcba41b1b5d9b4","chu":"19bd88ff8bec3e67","ban":"3.17","ngay":"2026-11-18"},
};
