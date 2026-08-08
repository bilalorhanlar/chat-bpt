// OTOMATİK ÜRETİLDİ — scripts/photos/02-optimize.ts
// Elle düzenlemeyin; `npm run photos` yeniden üretir.

export type Photo = {
  /** 1'den başlayan sıra numarası; dosya adı iki hane (`01.webp`) */
  id: number;
  /** full/ varyantının gerçek boyutu */
  w: number;
  h: number;
  /** 16px genişliğinde base64 webp — yüklenirken gösterilen bulanık kare */
  blur: string;
};

/** Ana sayfa iz efekti için sabit 4:5 varyantın boyutu */
export const TRAIL_SIZE = { w: 480, h: 600 } as const;

export const PHOTOS: Photo[] = [
  {
    "id": 1,
    "w": 828,
    "h": 466,
    "blur": "data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAADQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwC1CKoDgbQ080R05JQwJb/NYWYSAAD9/AmBhzl6afpaxPhTprcxzuzd8tb6lybaYki582ma7/CFOPpGp5sksi95z/HKD2GFhR2NNHW6Bky7FBzcvebM3MzP33zojRCz/6k8fydM6ySNH/12/LZHEAZEuhXvvaLCsvpxiPQYP8PiDNl/GGAYxQUgAA=="
  },
  {
    "id": 2,
    "w": 828,
    "h": 466,
    "blur": "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUGQ6hfTvzXvIepBUI1gA/s7CG+Tan4FcB2wI6gUx+Ia7ycwCX6KmT3/eH/hFSphCyz3QuaSZBI2aMcqZe/g7CscEhbDD0IPxcYgCmslIC/UbiUFylZeVr8orKDxyF7u+/91xKgnlYCGqIUISKnWUtYwoAAA="
  },
  {
    "id": 3,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwCw7B37gxJkjYoqOonkIAAA/qDYFj1XfXhlpJdUMUwXJWz2uKt7Xw5YmGuH/gDcjEk1Bt8ycUE5xP0FwNt0kafNlI44soeMY5qDVqpHVA8+MhQ+cw9lG9RH7ocMDwIm+XkhnySenjNbwAA="
  },
  {
    "id": 4,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAACQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUA4v4P+jeHkEaF4DHk6YGkAA/oZBsHji0R9OFO90czuTDZCR4+zKcADAmZzgQuHvFLh+n+57eugrrYbxkYblSZaF0K9RdIcTOqZKijVvsm8X/9SN+7pERLwy2vyps0jr1dZPUtJhYBqr+q10AAA="
  },
  {
    "id": 5,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAADwAwCdASoQABQAPu1iqU2ppaQiMAgBMB2JYwAAW9vN8h81bjRndE7AAP7LyZK8ebVsjm83MI5UIqUWPdnVSJqZHcXKbUxd+Qxrg2f0zfX6dL5MpqG5Y2e7LQ64kwPRakbSjZeEd913rCtWUbXix6sIV9C6S05FWzIRcgCZSMO+AA0sJE1wBYvLMUAAAA=="
  },
  {
    "id": 6,
    "w": 685,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwC/PagBBzBvKP0MMZ3EIADwOXabvUMEPpv4wG/2AIlMXhDdNXdJuGEjsnOQk1m1Wqrb8Zabig/vaUGRSObclKsTztyjwGiKQ6vAaw9PS6VtN53tOzs4fY+1cBXikAA="
  },
  {
    "id": 7,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRrIAAABXRUJQVlA4IKYAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwCdAYvWeutDB1cmKIMEYAD+B6kQFGro+ENvH8YaUQyRi5v83nO9N2XlJmlo2JKnQzh+1Rbr3nqDpplsXPje8Ns2c52GLdb3uFlVdw/mHni38THWSe3QAJGM8lHDerl5FZav27PqamBLN4iUlSPxX93vrtDcoxOtfwOEsk1TVnAzrhqdfIUNo7ALYAAA"
  },
  {
    "id": 8,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbAC7ABdSx/1mVbk7jwQ1AADZahzhm8MmF8p/COO9S1BukL7pLA3SiI7Xa8stsEt3+oSgsJhV7x2RQH9H9cgkHggzTid0LnDtQ0gN1SZ3OK3rYwmsCFqlKAOpZhl16iwAAA=="
  },
  {
    "id": 9,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRq4AAABXRUJQVlA4IKIAAABwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYgCdMoMnJ0l5WntxAUa1xKc7oAD+n7EOtPlTjx5DnSNjZEX2wlP/PcQCjqkqp1RwSwbrU8fEKJiAToMys7+/B4GQQU8gCFfRclxaCSxpjPESkdA3KhGJYDdCmmpg7ixEMACdjxM5Q91nkErlBlpuagelbUZT/00I2yfh/kBKtIUFva58S0QAAAA="
  },
  {
    "id": 10,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JaACdMoFWAAP1LnjHyhtAAPY3AR3iUskVgq2DBHNl29F8RNfTqwSbx0Dp4sCj/TpFKDntPCcfAZpzhEvcTtb3/l7ISPDNF9sc+oxjgLuU1wJk6PUZt94QAAA="
  },
  {
    "id": 11,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUABqoMzjbzYhYWat+tgA/rCeb/k4qbNTdUYcJEMjySOFaJ624jjwZ9Z1KmCmpUAgEpn5b7Ye5eGzCGttXzYJdCF4sDo2coAA"
  },
  {
    "id": 12,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdMoR3ABpXNyJfvSmRYggAybEmzMuof5XKw8u00BH2UwIRUb+AGIExMIxn3J7e3PQZ3uTs9vq/d2WF/3M37TLSPoP5BHQtzSAxFkvw4MEA0coT1xzHNTk4xlbY+5mE0iEGqHi1RAAA"
  },
  {
    "id": 13,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdMoADPXGu+APXA4gAAPymFc5+kkLBsj7yifKP12PMRO5RHyFn0VUWImdt4QJnJvwtxdQu8Bx2IMX//ceifGOI/I1NvHdS1AME50odwRb0ut8wCpW2evDgcT4y4egAAA=="
  },
  {
    "id": 14,
    "w": 799,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdMoABg31uixOBmkWAAO+iwZuMSiL4NbCMZNSQ0o4LAnnZUbXQm2JZu8m0slQwaQAqv0KRbtMYf2uekvzSOxpMdQwch43Ax1SG27li62lJM4gkrDyqHAu8lYZwBCAAAA=="
  },
  {
    "id": 15,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUABX+gHSbkJlgtQQAP7fhYcTKj4mbTuCHSLowK3eBAaxBdd23jtIHNXEMHV3vxmxd70f4svGoXeudwm99bOYf1y3PdGjnpsVY0O+CgRkZOPxuzczcF9fZlC5cs4Q3KJwcAj1FpSkDXZn3/hnOqTn35zG8AA="
  },
  {
    "id": 16,
    "w": 799,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRnoAAABXRUJQVlA4IG4AAADQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZACdACDoS4qMPuQ+w1QA/hkbyq6u4+iRCJQtBDR2Zkx1jBdhiyz2Nm3CJE3nv3BVHKl2pGZQMdapnLtqUmaJrrkMX0jBgiGluB0Uvl5R302kIwAAAA=="
  },
  {
    "id": 17,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAADQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQAB8zxrXLHij5RVtNIAA/smxCFKFpnXlvuuXnvj67VD0QIRNygH0ylqeJ3z0nEUZ81eyuNUuhxUGFD2Yxuxz0qpvEjdLZfTmhp7tGA/qKmVv2H6fsmyyCtmgANRE2Iz+nsZwPchzBKPDGz42KK2fIAA="
  },
  {
    "id": 18,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRqoAAABXRUJQVlA4IJ4AAABwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdMoR4GCsHWFhb3hcKlegzgAD9LDSRk5V3M0EYPjULrmNLB8v3XaSb57QaTCMQgWxIAn+tGfwmyj+geVy+aJE60o2NWUg1XEz2PHPLkyv8kNsFTRIQQmyLPAIE+m9mgx95yM69cm/xmA8YvqsBST5LB6rkxOPhyPA8SP3ovbSddgAAAA=="
  },
  {
    "id": 19,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOgBHtd/oL3u9kibstsAAD+kVMWzRTNeHhHPMqynTJBAmIOhhjrDxqPB0dL2QVrQlzUmYABHtxn0RjYwYY7Sq84vXaPMJN8LoeSDBwiW4CjpvfoD726WDNhWXPuhyxYw+X6IE0z0aAA"
  },
  {
    "id": 20,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZACsG1/AXlbeJBWNpqoiAAD0ChguCl1l50eATGewTcPQA5uAvmKaYi+26+QPf9nW+AKVPFQc/3mDBzX8MrM1fAzPXFwMCK3rrhRMKOQ0Wb4+9SpXIUtZ+pJp5Jkt8Vptoo2EfDGWvMufaAeAAA=="
  },
  {
    "id": 21,
    "w": 737,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAACwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdDiAAHGet1mb9kAD6CBpgIQFxritSwcA3zueMCLn9KyLDZOrA8oIJdNEM62274hMdWT6ocDd2qqYH8R3HuJG+F+2o4W2jA7bJeHHXWRHhteMAkvLT4WpBb91eUYqAe21/b6uFj7o8eyAAAA=="
  },
  {
    "id": 22,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZAC7ACPtuNRNVK2z5RG+AAD+2c6rWKRl0XH66DIsEt3vslHkb1tOPx4D0H5s7aEKY0IebUrtPJFHDWI5y6M77VPSHjOPh/C7FXTS7/FTzD5G9vTlrWLvAzvF4kw0LTAZVTAZaDUgLAAA"
  },
  {
    "id": 23,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqoAAABXRUJQVlA4IJ4AAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdMoR4PoADn+pHym5ItoEAAP2dBFnDm4pJAhTjNdyCkZd4lyKTH4zJKBgiJJ1e6/sfvnKem4/smrKEbTqP10vWSSFXhUvxbCLxjP8cbVq0gTvSuis24/zXFvF/SZ1+geIQR5b98VbXrFpa0NhFJdsVgDJFfVGf45UqP/gS6WA8MKSAAA=="
  },
  {
    "id": 24,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOkGQBXIPZbwXv7n6sKSgAA/IS+Q+k62u5WUuQCYV7lCti+ag2IQz47+HmvnGSbGeA5DToWsQ0/yn/raspLy9S6O7tLn2j3xwCdgXMuK9jwASCOX9w5k+5tIjUi7oF6YL3za711DAM7rZQAAA=="
  },
  {
    "id": 25,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpIAAABXRUJQVlA4IIYAAADQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZgCdMoABQ7FW43GKzwAA/tOWQ3mhpcq/G7q9tsb+tUDrWJYVdRgFNh3iFXXkNpb0Hav1S8IxyX0dgDoA5YQBKZ62badBj2p9ZU6VeAT/qNyzcjH535aIlEhqXAR9ZBvxgpRQPujG21euNY6AAA=="
  },
  {
    "id": 26,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADQAwCdASoQABQAPu1iqk2ppaQiMAgBMB2JYwCsAB4c4Gyig41TvWgA/sP9tve/TGlRA5B/rgPllZUUC1QUB533i7KyMKnb0uqdM/cLPHe+Z6PFOX2He5MGtuw03u+HddVPHhiMyFAmxKsDNcN0FZSwAAA="
  },
  {
    "id": 27,
    "w": 1200,
    "h": 675,
    "blur": "data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JYgC7ABX/OnIfHWc9uCQAAP7XJvLxff6F90Jt9hr6wu1vEyI4Iu+Y68NpXUfntYKpZlXxyUbp4Ab2UcIRhvg6pUUYIvSVcatefAAA"
  },
  {
    "id": 28,
    "w": 828,
    "h": 466,
    "blur": "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZgCdABmFOJeWAanCEUTvAAD9z2CbEIRyPDz8xMpT6TQlR15mxyAoV/TEJYdDEtU9WHhBVttFD6XI/MEGEZeifl5O4V1NpTx69htvDL+TnbFFffrMjpSuKcU5Qf2O252RNP+2687YjBYcYJilP2g2DiTtItAJQAA="
  },
  {
    "id": 29,
    "w": 828,
    "h": 1103,
    "blur": "data:image/webp;base64,UklGRqgAAABXRUJQVlA4IJwAAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZgCdMoMYNcAAm3VjtK/+q6awAP7tXl++KTZg86e2qoWIoRmMnPhFtElh1FDP+oZ/7vR6QFelQFBosrcMqXTG9hZEVzWpPrwhRPFw8vy5GkCe/thURzi/4GffiMmWm7V1jsAL5LImedae6t/KT7kQm3NLNtuovb2Zj4wEIGgboAHAAAA="
  },
  {
    "id": 30,
    "w": 828,
    "h": 466,
    "blur": "data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JYgCdMoADQo1fOmzO61XYAOJ975m7RGr/czubRPfKdjk8pLhdi/AAymQ0sPcz8LiRjmrJ3TZ3YjDRmuzimbYbM5bV5HvYL9LvSdQi8OcE3OAA"
  },
  {
    "id": 31,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZAC7ACHqWD3uE6nGwM3SRLFAAP07lRcMiWAQW+6WhY+fUmAHG4K6Vizzd4o9yidDXgspvsbX3OinntQLT2Rb7ubYcN0TKvkdyiUpF5V8+2y4prdeuN2TJZPJSxqN74pSWNRvgm6LBuv1WJDSgAAA"
  },
  {
    "id": 32,
    "w": 828,
    "h": 1103,
    "blur": "data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQAqMEPCulOQ7cHVSD0MiUAD+u2l6ZxtoOupD7KLjWaWx/phrMuiL9PnXYj9IsWBmBcg1YnaOk2qvucHKjju7YlutCw1H98gHBg1MiCuJ7B6rJPI5lafLqeANLIfzHlprg/CX9CSiX7hNU/z0NlTbXgieyNAA"
  },
  {
    "id": 33,
    "w": 1200,
    "h": 675,
    "blur": "data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdACBsrTQaPl5bRG3/0kAA/iNilLrinWQ1dfrMCSw2CZ1xRSiXoDS06CTlwCG84qHwcUa+d2s3wj2AI//ta0ixVFqlMQQhsO5hfPNV7fQ2IczTpEWGGGwy6t5u/CtcCnlZNMGC9yQyyeqcx/fJtJC7P5yF+P/ya0SNigAAAA=="
  },
  {
    "id": 34,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADwAwCdASoQABQAPu1iqU2ppaQiMAgBMB2JZACdMoACqO0FiTUndPOEAP3BEMdHR6V8kUghVYUFlo52z7ThfuRltDJdiM5mRajBILa6wQpQGzzaEgd1F4ua5ZyRky/FRFlti0GaMH/nY1i7R97033rEAAA="
  },
  {
    "id": 35,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBbZBA/AnYFsICZzDgoAAP6363MFhPAW6/a+UGhe+qkjMEh/8OBVmuBRs1aGdRxFCB8c++RBUtBPByHHCPLSYnaMBCq5+xWutSqjJ7h/lNywaNKOK7OjcTdWuQQOx3gAAA=="
  },
  {
    "id": 36,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAABQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZQC7ACHwVXgiAAD+jvgBfq1WYQ9m+KauX2PMBZbZb9I09lIH2j+yHZSphzRt20AAAA=="
  },
  {
    "id": 37,
    "w": 723,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZQCzgBexPL10HjWQZqkLgADOOR5NWuyLujaKW2SAl0MDkTv6CWOjtcqAgNjwMtmPMTNxkJxz5+5hhluU7E+t8fWt2X6XW42PVjm9Yy4ETdrKtM2JFjjS2KLO6yl1WNOJLg5s85w/S0PaDoSfDAAA"
  },
  {
    "id": 38,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JagC7ABozpwMni5F5WuO5nAD+2fNweuvmzVfVcsm1UeqjsGCS7T/m6kyq4HB+IO8MtVk6YPz2RaW4gczV8eyBokSe1fIhK35ZoNgiKEX2baKfoChJjFG580Pp//COcx4HQOXX94HRZHOFUHSDkSNAAAA="
  },
  {
    "id": 39,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRqYAAABXRUJQVlA4IJoAAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JaACdMoAChX9KtmqLktEoIowAAP6bG3j3kSR2cYEaWWs8fxrlMq+/3gD6erBqHgCUBeKt856Sr7cNm7fnN2VNimDpqMoMZCEmUh4tEsuYSe7xwWLgIidTVyvqeC21ZNkKiBfGxQjozE7HnVg9btLxeOMhbLJ/UMId2gnLp25hHcAA"
  },
  {
    "id": 40,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAADQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZACdMoMjb0hhbTeXU8555Rbbe4KyUAD7nOCmBPFUKLMhWqGG75r22ZqR5pYuqxbJcZcmiSmUYpwQndLgFS/A6vIjOKNKFPUCJ+vFTNBA9u6bS9fm21fBHrLn6Oz2a9wfOZeDl905eGWkamDQBeOrEsKGw15VwAA="
  },
  {
    "id": 41,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZQC06BttJBbk4XS1WzqssAD+3N3RzG1wZiuUOZPsfsEWDPcXGoY0mDe4VnAVE4ekUpugDgWP6f2E6O6pcV1vTb1saZlgo+R90/WqiwHTUy6cPZRERPYUbqrE/3FbBXYHoAAA"
  },
  {
    "id": 42,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRnoAAABXRUJQVlA4IG4AAACQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBadAsyJpiRrxHzQAP6PCPamhJPHuviO320RJkw3PEqf60CpUwuipcvyZSgkwspqpxuozHW6T2PqJ8GmQmdxjNKQLky8KxiPZ8azUceeZzqMIAAAAA=="
  },
  {
    "id": 43,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUGP2iCKXw2O85+5V4zIAAM4yYTHq8H5K1NiYxWzYYhcZrcG8R7p9Mg3S8xu5pqNtITg0hSv5QzpWqG939WsYHGJwzr1XRhCTGV/VKz/5vY+xGzbIm0qyrDIyfdfbhtoMpX5TJgZPwu+eafkgHNbTjOWxDPC23aXfpAAAAA=="
  },
  {
    "id": 44,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JYwC2yCGtxIIPDsrUjC4gAP7XDEaVt/xdLTO2af5JlmKxIiILuqHb7v9I+kI2NTwMYiOuGu4lFH5pY0BxmgBIWY1QKiMYOjmtn9fV9QGVuSbj4aldPK70228yulvDYp4gAA=="
  },
  {
    "id": 45,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAACQBACdASoQABQAPu1iqU2ppaQiMAgBMB2JZgCdMoGv/i2InZk21hN4DuY7wAAA/mBfY7hYPDGA5uEDaMNHrmy82/J56NbZ9wgNI4ZD+zZCRbNu3W0sqa2wabxKEJDVk4v5VSdc1JkbcGKFO89ecz8mY9A33NqZ+oa55nTlmpWlJF6FBH83FAQh3K6UL7UAAAA="
  },
  {
    "id": 46,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAACwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZgCdMoBOAbQQ1YbfNmQQR9u1nH2oAPimQreo9XtJAybXw3nsQiz1lO+1VABb9fjaB0MSs9Lir1Vcdv0YxWQ6a1o7+MRARHAFWHC2DCtfLDDG8k0dxvKOMH0x1iRjBCUb536QXGjFLhUc0cUfDqqZMNIrGbRI4arut0gHgAA="
  },
  {
    "id": 47,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAACQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JagCdMoR3JoAriJr5XPGqMxNv3uAA/TRQhB2wHBNVnYUB95mvANnWbXIufzXHyYKDh/kESjcI+mFmtgX5mR7zw/o2paDOwi6UD8z0nBnA6NzELJjoqerU2IPerx3CDLHtUXRhlZ9Ck+HLbaXUCVDawsFW9yypKQZxfCik2AAAAA=="
  },
  {
    "id": 48,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JQBAAARYmYm7VNGQWZDT0AAD+7EeEalxVHDhPKp1A3BOFMB/4oOruT4frCCE61lDD8iKXS9tm8nLk1dtPPUFz/YXdOEN69SZXNVeeQn8mfboa5R0Jih/whDehhu7A52+kidH0ZxXJ9/ssmWl79AAA"
  },
  {
    "id": 49,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwCdMoADTQsiPy8upIGqAAD+2Ofs4qB0Tgozj/vgZhn845Gj6NXiZZgHm0VUek4SqiH9vlyhv2CSdAWwn2NIp6jl7pE85UHxzYTjRtjjzInuM5OfSpkYehLNggibwrhl5SgAAAA="
  },
  {
    "id": 50,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRp4AAABXRUJQVlA4IJIAAABQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBfnAlQwInLQoAD+3fN5XuTtfHyPn9n4AkgaY85wy0jKM4/8F7cGLs+BjK+Qm4JXhjM2N0rUhF4SeKWqswSkFHGnRt8/rVxTxgkm1Kj9g1U2FA5xhBD5IjoRxRK/5YNHwiLW9/n7MDuKrDbxtsTuiCyWwX4LKL8AAA=="
  },
  {
    "id": 51,
    "w": 785,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAACwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZQCsACBeJ3cOYhlnMAD8XcPXYL7Do/dxvuHZWn2L+iFKrPIXR1GBVtbhXaHtaInljTs6furOekDlDxfUqyvxaK3LFlmWE+XILSbnS1aQQLAJ8QBYfXAA"
  },
  {
    "id": 52,
    "w": 675,
    "h": 1200,
    "blur": "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAADQAwCdASoQABQAPu1mq04ppaQiMAgBMB2JYwCw7B271IjHSXbLQqAA/oxdkZWHkCpGIxOfnythUl324IKG+zj8PmjVXEzp1CaUEmoFEyEzTzyBzXttXJOjwyd4ebcvaHnADn+hJJofm9+NEuwKfdgVeopF/QH5wAA="
  },
  {
    "id": 53,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAACQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JZgCxDDZgvhiVNrSgcd63lDpzCEAA/taib0DhvuUbxm787Y1J7AyQ1eQlh6mmYnDc9ilmb0XLSu+y3XGJnQRRoAwuOfBSc5QbbHGiSLLIJZXwwe21939G8Bc76mVdroFS3wCHcbWa4BBcSUZjLDLEKvCZUpHDI+L5t6acoAA="
  },
  {
    "id": 54,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAADwAwCdASoQABQAPu1iqU2ppaQiMAgBMB2JQBOmUI4E0ABnTn5Kv4PAAP6vng+znm9hxzB/ojmWxyCO1QkMsHAXYnSMdj67Aa4lJO3Czqu5NaKsQXh0qUX/miv17CNC45Kje1+fZeOzA223b3R0uw4iXep4DDJ9Rmdg1ZWGnciwVZOZc2TqowrzCq4ioAAA"
  },
  {
    "id": 55,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqAAAABXRUJQVlA4IJQAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYgCdMoMYAEljqFQonhMnm9QA9kZCGJZAn7r16bpgi9qZWNJ0lOLBrXSNHnJImSkxmd+iCL/OhSTiem07Sfg/CqqU9HskHhOXTO4GXqQq805mj09kEriPgqw9Wdc9b5JlZ1Ty/jxZv7Whk0F3mTdhXUjV0zZ8FcA1rzAA"
  },
  {
    "id": 56,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwC7ABS6zYQb6R025fu6YAD+4HNkE/bvc3BQHjydT3qCpzszD16nPjiYMM+92aesIqbjLt2k57mv2E1gebVPj+Dm/eiPyvHusn/3CTJMDQKspSo7h2NqDF0ES1Tp66qfs0RrNOnVoz+EJkajAgAA"
  },
  {
    "id": 57,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwAjwAcqs0o09MuAYdxw4AD7nNRfsmgzlsXX4rrcyXh82HsybWaKFALMP2W6vD1MBKA7NAVlyN8GAeNpN20pTmcbB+RpwACoqA1NfRc2yMPfplcRW11/x2jDVnipl9/JzXhpomuDJyZEM1uUTu9MzJOAAA=="
  },
  {
    "id": 58,
    "w": 828,
    "h": 1104,
    "blur": "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAABQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JbACdGaAFQAIyzJO5xg3k135QAP7w36aaf+u6XmJeSZXGBZvSD9GuIoq5Q4BP+3be4THU3pisgh1b54vQ5v0x/yW5hkJObbWxVTJyKlzIWz6Yh1Uwna5yuCKnly659poN6ZWaqOCfNRm1G2C9KuFAf1wIuIAQ8BhHwx7MAAA="
  },
  {
    "id": 59,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAwBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYgCdH8AC+Qigr2zjw7W6JgAA/vDSuUOzg8EVtiqFdoKUpvXrLSsdku/R+qVGHWfWDSeZJvsGQ7UFQ3oqKnvpr9iYTWR4e3jxt7+pywKt/efbhnkhGpYw+5DK34iobmFYUkk5haUyNkaZ3bpq9sAA"
  },
  {
    "id": 60,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRowAAABXRUJQVlA4IIAAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZQC/OBtK1GgUjqZCC7QAAP6MZf4Mtdp6AOdtYd2+idwYwVZOu1HgQlLYX0ibMCqcm0XAke3nkVk8Vy4BYUJU23D7UMJ6TX3Gsxinmdn8A3qEZNdzBXKHw+4reC6SM2bTSw1tsdAAAA=="
  },
  {
    "id": 61,
    "w": 828,
    "h": 621,
    "blur": "data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAQBACdASoQABQAPu1iqU2ppaOiMAgBMB2JYwDCgCIJ/EU8LVZS67KIwAD+7paChGM93puspV8puD+V0o5d7WL90R2Ys5QEEHSv5w3tBH7PrgfpVvqvXAuITEI5KLFDSJhtKOBZflnxcuFmQjGznmIMPiME9+HMupl6NqCs3rvk9iR5qtsCR4AA"
  },
  {
    "id": 62,
    "w": 1104,
    "h": 828,
    "blur": "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAABwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JYwAAW+uKF5WHKOAA/u6WGKdhQaUmlsuCLQjrTfVd8+D5CHYpTdefC/h8thDa1Z5mlEvYnwip4HyTNKS2Ebn7Q60DPf0r6Ixwe2V9dKizg/Q1DwbZ3NI1RsWNcFVOAAA="
  },
  {
    "id": 63,
    "w": 1104,
    "h": 828,
    "blur": "data:image/webp;base64,UklGRowAAABXRUJQVlA4IIAAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOgBD1LAKw0+LqzhidAAM396Pu5lMDMsU7gf+vhTsGe1QmAqmNzcjrJJTWfymTP6o+JDA3KW+NvR6H5bZeZcUsv2tQ4NqVRMSqyuGg6WX/PycL0INqH58WgGCOMEKb0CUox64AAAA=="
  },
  {
    "id": 64,
    "w": 1104,
    "h": 828,
    "blur": "data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAADQAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JZACdACGOQJ3XhKlHmpgA/u6XXyhyKlmmPDzwSL0VI0OrDaxaQpdOZSVdm2Fr37BkCse9AlhOlAX36rta/CliiZkGVtRtsx4Mxl9aDlWBx3RwCAf13Ye323qbafGVuFuqV45AAAA="
  },
  {
    "id": 65,
    "w": 1104,
    "h": 828,
    "blur": "data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAADwAwCdASoQABQAPu1iqU2ppaOiMAgBMB2JQBOmUABYvB1ytt46yKk4AP7um7860QtfXcLALtZEa5gZLK29CejVG9nOiJuVlly8vZwfG7jCzgrhk2UCYwOzdnpuZQ5Ff6Sgbpe6qk63YLKXxqWjADN0HrRVWOM/Dzc6oNJWFfCxHPWgAAA="
  }
];

export const photoSrc = {
  trail: (id: number, ext: "avif" | "webp" = "webp") =>
    `/anilar/trail/${String(id).padStart(2, "0")}.${ext}`,
  full: (id: number, ext: "avif" | "webp" = "webp") =>
    `/anilar/full/${String(id).padStart(2, "0")}.${ext}`,
};
