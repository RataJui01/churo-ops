# Churo Bites Storefront — Design Spec (สำหรับ implement)

ดีไซน์ของระบบรับออเดอร์หน้าร้าน (ลูกค้าสแกน QR สั่งเอง + หน้าพนักงาน) — ต่อยอดจาก churo-ops (React + TypeScript + Tailwind, Node/Express/MongoDB)
อ่านคู่กับ `REQUIREMENTS.md` (data model, API, แผนงาน) และ `tokens.json` (design tokens)

Source of truth ของหน้าตา = ไฟล์ใน `screens/` · ถ้า spec นี้กับไฟล์ไม่ตรงกัน ให้ยึดไฟล์ และแจ้งคนที่สั่งงาน

---

## 0. วิธีอ่านไฟล์ `screens/*.dc.html`

- เป็นไฟล์ดีไซน์ (Design Component) **ไม่ใช่โค้ด production** และเปิดใน browser ตรงๆ ไม่ได้ (ต้องใช้ runtime ของ canvas)
- อ่านเป็น "HTML + inline style" ได้เลย: ทุกค่า สี/ขนาด/ระยะ อยู่ใน `style="..."`
- Syntax พิเศษ:
  - `{{ name }}` = ค่าจาก `renderVals()` ใน `<script type="text/x-dc">` ท้ายไฟล์
  - `<sc-for list="{{ items }}" as="r">` = loop · `<sc-if value="{{ cond }}">` = เงื่อนไข
  - `onClick="{{ fn }}"` = event handler
  - `<helmet>` = ส่วน head (font link, global style)
- ข้อมูลในดีไซน์เป็น **ตัวอย่าง** (ชื่อลูกค้า, เบอร์ `0XX-XXX-…`, เลขคิว, เวลา) — ของจริงมาจาก API
- ลิงก์ระหว่างหน้าในไฟล์ใช้ชื่อเดิม ดูตาราง mapping ใน `README.md`

## 1. Design tokens → Tailwind

ใช้ค่าจาก `tokens.json` (ชุดเดียวกับ churo-ops) — ห้าม hardcode hex ใหม่

```js
// tailwind.config (v3: theme.extend) — ถ้า v4 ให้ย้ายไปไว้ใน @theme
colors: {
  surface: { DEFAULT: '#FFF2EB', raised: '#FFFFFF', pink: '#FFDCDC', peach: '#FFE8CD', apricot: '#FFD6BA' },
  ink: { DEFAULT: '#2B2118', muted: '#5C5245' },
  border: '#F5D3B8', divider: '#F2E3D5',
  brand: { DEFAULT: '#A85419', hover: '#8A4515' },
  status: {
    pending: '#B45309',                 // พื้นใช้ surface-peach
    done: '#15803D', 'done-bg': '#DCFCE7',
    delivered: '#1D4ED8', 'delivered-bg': '#DBEAFE',
  },
  danger: { DEFAULT: '#B91C1C', border: '#F3C6C6' },
},
borderRadius: { sm: '6px', md: '10px', lg: '16px', pill: '999px' },
boxShadow: {
  sm: '0 1px 2px rgba(43,33,24,0.06), 0 1px 3px rgba(43,33,24,0.08)',
  md: '0 4px 8px rgba(43,33,24,0.10), 0 2px 4px rgba(43,33,24,0.06)',
},
fontFamily: {
  heading: ['Poppins', 'Kanit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  sans: ['Poppins', 'IBM Plex Sans Thai', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
```

**ความหมายสีสถานะในระบบนี้**
| สถานะ | สี | ใช้ที่ |
|---|---|---|
| รอยืนยันจ่าย / เตือนรอนาน | `status-pending` บน `surface-peach` | แถบสถานะลูกค้า, ป้าย "รอ 8 นาที", กรอบส้มการ์ด |
| กำลังทำ | `status-delivered` บน `status-delivered-bg` (น้ำเงิน) | แถบสถานะ, กล่องเลขคิวในแท็บกำลังทำ |
| พร้อมรับ / ร้านเปิด / จ่ายแล้ว | `status-done` บน `status-done-bg` (เขียว) | หน้า Ready, ปุ่ม "พร้อมรับ", กล่องเลขคิวแท็บรอรับ, สวิตช์ |
| หมด / ร้านปิด / ยกเลิก | `danger` บน `surface-pink` | ป้าย "หมดแล้ว", ป้าย "ปิดรับออเดอร์", ปุ่มยกเลิก (outline) |
| แยกดิป/ท็อปปิ้ง | `ink` (พื้นเข้ม) + ตัวขาว | ป้ายในหน้าพนักงาน — ตั้งใจให้ต่างจากสีสถานะทั้งหมด |

**Font:** โหลด Poppins 400–700, Kanit 500–700, IBM Plex Sans Thai 400–600 จาก Google Fonts (ข้อความไทยจะ fallback ไป Kanit/IBM Plex เอง)

**กฎพื้นฐาน (mobile-first):** ความกว้างดีไซน์ 390px · ปุ่ม/จุดกดสูง ≥ 44px · input ใช้ font 16px (กัน iOS zoom) · hover ใส่ใน `@media (hover: hover)` เท่านั้น · ใช้ `<button>`, `<a>`, `<input>`+`<label>` จริง ไม่ใช้ div คลิก · ปุ่มที่มีแต่ไอคอนต้องมี `aria-label`

## 2. Components ที่ใช้ซ้ำ (แนะนำให้แยกเป็น component)

| Component | ใช้ที่ | Spec หลัก |
|---|---|---|
| `Card` | ทุกหน้า | `bg-surface-raised rounded-md shadow-sm p-4` |
| `ListRow` | เมนู, ตะกร้า, สถานะ | ซ้าย: ชื่อ (15/22, 600) + บรรทัดรอง (13/18 ink-muted) · ขวา: ราคา/ปุ่ม · เส้น `divider` ระหว่างแถว ยกเว้นแถวสุดท้าย |
| `AddButton` | เมนู | วงกลม 44px `bg-brand` ไอคอน + ขาว · ของหมด: `bg-surface border-border text-ink-muted` disabled |
| `QtyStepper` (pill) | เมนู (Hug, ท็อปปิ้ง) | กรอบ `border-brand rounded-pill` ปุ่ม 40px: − (โปร่ง, สี brand) / ตัวเลข 16px 700 / + (พื้น brand) · qty=0 → กลับเป็น `AddButton` |
| `QtyStepper` (box) | หน้าเลือกไซซ์ | กรอบ `border-border rounded-md` ปุ่ม 44px |
| `ChoiceTile` | เลือกไซซ์, ราด/แยกดิป | grid 2 คอลัมน์, สูง ≥ 64px, `rounded-md` · เลือก = `bg-brand text-white` · ไม่เลือก = `bg-white border-border` · ใช้ `aria-pressed` |
| `Badge` | หลายที่ | pill 12/16 600 + จุด/ไอคอน + ข้อความเสมอ (ห้ามใช้สีอย่างเดียว) |
| `StatusStepper` | หน้าสถานะลูกค้า | 3 แท่ง (สูง 6px, gap 4px) + label ใต้แท่ง: จ่ายแล้ว / กำลังทำ / พร้อมรับ · แท่งที่ผ่านแล้วใช้สีของสถานะปัจจุบัน |
| `SegmentedTabs` | หัวหน้าพนักงาน | track `bg-surface rounded-pill p-1` grid 3 ช่อง · active `bg-brand text-white` · มี count badge ทุกแท็บ · ข้อความ 13px ไม่ตัดบรรทัด |
| `StaffOrderCard` | 3 แท็บพนักงาน | ดู §4 |
| `SeparateToppingsBadge` | พนักงาน | pill `bg-ink text-white` 12px + ไอคอนถ้วย "แยกดิป/ท็อปปิ้ง" — แสดงเฉพาะ `separateToppings === true` |
| `PhoneLink` | แท็บกำลังทำ/รอรับ | `<a href="tel:…">` สี brand 14px 600 + ไอคอนโทรศัพท์ |
| `Switch` | หน้า ร้าน/เมนู | `<input type="checkbox" role="switch">` ซ่อน + track 52×32 (สวิตช์ร้าน 60×36) · เปิด `status-done` · ปิด `#8C7F72` |
| `StickyBottomBar` | เมนู, ตะกร้า, เลือกไซซ์ | `bg-white border-t border-border` เงาขึ้นด้านบน, padding 12/16/24 |

## 3. หน้าลูกค้า (มือถือ)

### 3.1 เมนู — `/order` · `screens/customer/01-menu.dc.html` (interactive)
- Header: "Churo Bites" (heading 24/32 700) + Badge "เปิดรับออเดอร์" (เขียว) · คำอธิบาย 1 บรรทัด · กล่อง 3 ขั้นตอน (เลือกเมนู / จ่าย PromptPay / รับตามคิว)
- 3 section ตามลำดับ: **Churro Hug** (ป้าย "ใหม่") → **Classic Churros** → **ท็อปปิ้ง**
- **Churro Hug และ ท็อปปิ้ง:** กด `AddButton` = เพิ่มลงตะกร้าทันที (qty 1) แล้วแถวนั้นเปลี่ยนเป็น `QtyStepper` + พื้นแถว `#FFF8F3` · ลดถึง 0 = ลบออกจากตะกร้า
- **Classic Churros:** แสดงราคา "S ฿x · M ฿y" · กด → ไปหน้าเลือกไซซ์ (3.2)
- เมนูที่ `isAvailable=false`: ชื่อสี ink-muted, ราคาขีดฆ่า, Badge "หมดแล้ว", ปุ่ม disabled
- แถบล่างติดจอ: ปุ่ม `ดูตะกร้า` + count badge (จำนวนชิ้นรวม) + ยอดรวม → `/cart`
- ร้านปิด (`isOpen=false`) → แสดง 3.8 แทนทั้งหน้า

### 3.2 เลือกไซซ์ Classic — `screens/customer/02-classic-size.dc.html` (interactive)
- รูปเมนู placeholder สูง 200px (`surface-apricot`) + ปุ่มปิด (วงกลม 44px มุมซ้ายบน)
- ชื่อ "Classic Churros · {รส}" + ราคา S/M
- **ไซซ์** (ต้องเลือก, ไม่มีค่าเริ่มต้น): `ChoiceTile` S | M พร้อมราคา
- **ดิปและท็อปปิ้ง:** `ChoiceTile` "ราดบนชูโรส" (ค่าเริ่มต้น) | "แยกดิป/ท็อปปิ้ง" (ใส่ถ้วยแยก) → `separateToppings`
- ข้อความช่วย: ท็อปปิ้งเพิ่มได้ที่หมวดท็อปปิ้งในหน้าเมนู
- แถบล่าง: `QtyStepper` (box) + ปุ่ม "เพิ่มลงตะกร้า · ฿{total}" · ยังไม่เลือกไซซ์ → ปุ่ม disabled ข้อความ "เลือกไซซ์ก่อน"
- เพิ่มเสร็จ → กลับหน้าเมนู

### 3.3 ตะกร้า + ข้อมูลผู้สั่ง — `screens/customer/03-cart-checkout.dc.html`
- Header: ปุ่มย้อนกลับ + "ตะกร้าของคุณ"
- "รายการ (n)": **1 แถวต่อ 1 item ที่กดจากเมนู** (ท็อปปิ้งเป็นแถวของตัวเอง มีบรรทัดรอง "ท็อปปิ้ง") · Classic มีบรรทัดรอง "ราดบนชูโรส" หรือ "แยกดิป/ท็อปปิ้ง" · ปุ่มลบ (วงกลม 28px สีชมพู ในพื้นที่กด 44px)
- ลิงก์ "+ เพิ่มเมนูอื่น" → เมนู
- ฟอร์ม: ชื่อ (ใช้เรียกตอนรับ, `autocomplete="given-name"`) · เบอร์โทร (`type="tel" inputmode="numeric"`) + helper "ใช้ติดต่อเฉพาะกรณีมีปัญหากับออเดอร์" · input สูง 48px, font 16px
- ยอดรวม (display 28/36) + "ชำระผ่าน PromptPay เท่านั้น"
- แถบล่าง: "ยืนยันออเดอร์ · ไปหน้าจ่ายเงิน" → `POST /api/storefront/orders` → `/order/:id` · ถ้าได้ 403 (ร้านปิด) → แสดง 3.8

### 3.4–3.7 หน้าสถานะ — `/order/:id` (หน้าเดียว เปลี่ยนตาม `status`, poll ทุก 5 วิ)
ทุกสถานะมี header เล็ก "Churo Bites" + "ออเดอร์ของ {ชื่อ}" และ `StatusStepper`

| status | ไฟล์ | เนื้อหาหลัก |
|---|---|---|
| `pending_payment` | `04-payment-promptpay` | ยอด "฿134.00" (40/48 700) · QR PromptPay 240×240 สร้างจากยอดจริง · ชื่อบัญชี · ปุ่ม "บันทึกรูป QR" (สำคัญ: ลูกค้าสแกนจอตัวเองไม่ได้) · วิธีจ่าย 3 ขั้น · กล่องสถานะ "รอพนักงานยืนยันการจ่าย — หน้านี้อัปเดตเอง" (`role="status"`) · รายการที่สั่ง (`<details>` พับได้) |
| `cooking` | `05-status-cooking` | เลขคิวใหญ่ 112px · Badge "กำลังทำ" (น้ำเงิน) · "พร้อมเมื่อไหร่ หน้านี้จะบอกให้มารับเอง" · กล่องเขียว "ยืนยันการจ่าย ฿x แล้ว · เวลา" · รายการ |
| `ready` | `06-status-ready` | การ์ดพื้นเขียวเต็ม · "พร้อมแล้ว! มารับได้เลย" · เลขคิว 112px · "แสดงหน้าจอนี้ให้พนักงานที่หน้าร้าน" · รายการ · ปุ่ม "สั่งเพิ่ม" |
| `picked_up` | `07-status-picked-up` | "รับสินค้าแล้ว" · คิว · ยอด · เวลารับ · ขอบคุณ · ปุ่ม "สั่งเพิ่ม" |
| `cancelled` | — (ยังไม่ได้ออกแบบ) | ใช้ layout เดียวกับ 07 + ข้อความยกเลิก (สี danger) |

ทุกหน้าสถานะ: Classic แสดงบรรทัดรอง ราด/แยก, ท็อปปิ้งเป็นแถวแยก · **API ฝั่งนี้ไม่คืนเบอร์โทร**

### 3.8 ร้านปิด — `screens/customer/08-store-closed.dc.html`
- Badge แดง "ปิดรับออเดอร์" · การ์ดกลางจอ ไอคอนร้าน + "ตอนนี้ร้านปิดรับออเดอร์" + "กลับมาสแกนอีกครั้งตอนร้านเปิด"
- **ไม่มีเมนู ไม่มีปุ่มสั่ง** · หมายเหตุ: ออเดอร์ค้างยังเปิดลิงก์สถานะเดิมได้

## 4. หน้าพนักงาน (มือถือ)

### 4.1 Login — `/staff/login` · `screens/staff/01-login.dc.html`
- โลโก้ข้อความ + Badge "สำหรับพนักงาน" · การ์ดฟอร์ม ชื่อผู้ใช้/รหัสผ่าน (`autocomplete` ถูกต้อง) · ปุ่ม "เข้าสู่ระบบ" · "เครื่องนี้จะจำการเข้าสู่ระบบไว้ 30 วัน"

### 4.2 Header ร่วมของ `/staff` (ทั้ง 3 แท็บ)
- "ออเดอร์หน้าร้าน" (page-title) + "● อัปเดตทุก 5 วิ · {ชื่อพนักงาน}"
- ปุ่มขวา "ร้าน / เมนู" (`surface-peach`) → `/staff/menu`
- `SegmentedTabs`: **รอยืนยันจ่าย {n} | กำลังทำ {n} | รอรับ {n}**

### 4.3 `StaffOrderCard` — โครงร่วม
- การ์ด `p-4 gap-3` · ส่วนบน = ข้อมูลระบุตัว · ส่วนกลาง = รายการเมนู **ชิดซ้ายเต็มความกว้างการ์ด**, มีเส้น `divider` คั่นด้านบน, 1 บรรทัดต่อ item (15/22 600) · ส่วนล่าง = ปุ่ม action
- ท็อปปิ้งเป็น item แยกบรรทัด · ในแท็บกำลังทำ/รอรับ ใช้สีตัวอักษร brand ให้เห็นง่าย
- `SeparateToppingsBadge` ใต้ชื่อ item ที่ `separateToppings=true`
- การ์ดที่รอนานเกินเกณฑ์: กรอบ 2px `status-pending` + Badge เวลาสีส้ม

### 4.4 แท็บ รอยืนยันจ่าย · `screens/staff/02-tab-pending-payment.dc.html`
- ข้อความช่วย: เทียบ **ยอด + ชื่อ** กับแจ้งเตือนธนาคาร — เก่าสุดอยู่บน
- ส่วนบน: ยอด (36/44 700) + ชื่อลูกค้า (22/30 600) · ขวา: เวลาที่รอ (เกิน 5 นาที = Badge ส้ม + กรอบส้ม)
- รายการ → "โทร ••• 1234" (4 ตัวท้าย)
- ปุ่ม: "ยกเลิก" (outline danger, flex 1, 44px) + "ยืนยันจ่าย" (brand, flex 2, 48px) → `PATCH /confirm`

### 4.5 แท็บ กำลังทำ · `screens/staff/03-tab-cooking.dc.html`
- เรียงตามเลขคิว · ข้อความช่วย: ทำเสร็จกด "พร้อมรับ"
- ส่วนบน: กล่องเลขคิว 72×72 (น้ำเงิน) | ชื่อ (18/26 600) + "ยืนยัน x นาทีก่อน" + `PhoneLink` เบอร์เต็ม
- ปุ่ม "✓ พร้อมรับ" (เขียว `status-done`, 48px) → `PATCH /ready`

### 4.6 แท็บ รอรับ · `screens/staff/04-tab-ready-pickup.dc.html`
- ข้อความช่วย: ลูกค้ามารับ → เช็กเลขคิวกับชื่อ → ส่งของ → กด "ลูกค้ารับแล้ว"
- ส่วนบน: กล่องเลขคิว 72×72 (เขียว) | ชื่อ + "พร้อม x นาทีแล้ว" + `PhoneLink`
- พร้อมเกิน 10 นาที = กรอบส้ม + Badge "พร้อม 12 นาทีแล้ว" (ให้โทรตาม)
- ปุ่ม "ลูกค้ารับแล้ว" (brand, ไอคอนถุง) → `PATCH /pickup`

### 4.7 ร้าน / เมนู — `/staff/menu` · `screens/staff/05-store-and-menu.dc.html`
- Header: ย้อนกลับ + "ร้าน / เมนู" + "เปลี่ยนแล้วลูกค้าเห็นทันที"
- **สถานะร้าน (บนสุด):** การ์ดกรอบเขียว 2px · `Switch` ใหญ่ "ร้านเปิดรับออเดอร์" + "เปิดโดย {ชื่อ} {เวลา}" · แถบหมายเหตุ: ปิดร้าน = ลูกค้าไม่เห็นเมนู, ออเดอร์เดิมทำต่อได้ → `PATCH /api/staff/store`
  - สถานะปิด (ยังไม่มีในไฟล์): ใช้ layout เดิม เปลี่ยนเป็นกรอบ/ตัวอักษร `danger`, ข้อความ "ร้านปิดรับออเดอร์", สวิตช์สีปิด
- รายการเปิด/ปิดรายรส แบ่ง section: Churro Hug · Classic Churros (1 สวิตช์ต่อรส ปิดทั้ง S และ M) · ท็อปปิ้ง
  - แถวที่ปิด: พื้น `#FFF7F7`, ชื่อ ink-muted, ข้อความ "หมด · ลูกค้าสั่งไม่ได้" (danger) · เปิด: "เปิดขาย" (status-done)

## 5. Placeholder ที่ต้องแทนด้วยของจริง

- ราคา Classic Churros S/M (ในดีไซน์ใช้ ฿35/฿55 ชั่วคราว) และราคา Signature (`[ราคา]`) — ให้ดึงจาก MenuItem ใน DB
- ชื่อบัญชี PromptPay (`[ชื่อบัญชี PromptPay]`) — env
- รูปเมนู (`[รูป …]`)
- ชื่อลูกค้า เบอร์ เลขคิว เวลา — ข้อมูลตัวอย่างทั้งหมด

## 6. สิ่งที่ยังไม่ได้ออกแบบ (ทำแบบเรียบๆ ตาม pattern เดิมได้)

- หน้าสถานะ `cancelled` ของลูกค้า
- สถานะ "ร้านปิด" ของสวิตช์ในหน้าพนักงาน
- Loading / error state (เช่น network หลุดตอน poll) — แนะนำแถบเล็กด้านบน "กำลังเชื่อมต่อใหม่…" สี pending
- Empty state ของแต่ละแท็บพนักงาน (เช่น "ยังไม่มีออเดอร์รอยืนยัน")
- Responsive จอใหญ่ (tablet ที่เคาน์เตอร์) — ตอนนี้ออกแบบ 390px อย่างเดียว ให้ใช้ `max-w-md mx-auto` ไปก่อน
