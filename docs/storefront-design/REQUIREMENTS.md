# ระบบรับออเดอร์หน้าร้าน Churo Bites — Requirements & แผน 2 วัน

อัปเดตล่าสุด: 6 พ.ย. 2026 · เป้าหมาย: เปิดใช้ภายในสัปดาห์นี้ · รองรับ >20 ออเดอร์/ชม.

## 1. Flow การใช้งาน

**ลูกค้า:** สแกน QR ที่ร้าน → (ถ้าร้านปิด: เห็นหน้า "ร้านปิดรับออเดอร์" ไม่มีเมนู) → เลือกเมนู + ท็อปปิ้ง (สั่งเป็นรายการแยก) → กรอกชื่อ + เบอร์ → เห็น QR PromptPay ตามยอด → จ่าย → หน้าเดิมแสดงสถานะ (อัปเดตเอง) → ขึ้น "พร้อมรับ" → มารับที่หน้าร้าน

**พนักงาน:** login ครั้งเดียว (จำไว้ 30 วัน) → เปิดร้านที่หน้า ร้าน / เมนู → เห็นออเดอร์ "รอยืนยันจ่าย" แสดงยอด + ชื่อตัวใหญ่ + รายการ → เทียบกับแจ้งเตือนธนาคาร → กด **ยืนยันจ่าย** (ได้เลขคิว, สถานะ = กำลังทำ) → ทำเสร็จกด **พร้อมรับ** (ลูกค้าเห็นว่ามารับได้) → ลูกค้ามารับ กด **ลูกค้ารับแล้ว** (ปิดออเดอร์) → จบรอบขายก็ปิดร้าน

**สถานะที่ลูกค้าเห็น:** รอยืนยันจ่าย → กำลังทำ → พร้อมรับ → รับสินค้าแล้ว

## 2. ขอบเขต (Scope)

| ทำ | ไม่ทำ (รอบนี้) |
|---|---|
| ลูกค้าสั่งเองผ่าน QR | พนักงานกดสั่งแทน (POS) |
| QR PromptPay ตามยอด, พนักงานยืนยันเอง | ตรวจสลิปอัตโนมัติ |
| เลขคิว + สถานะบนมือถือลูกค้า | จอแสดงคิวที่ร้าน |
| พนักงานกด "หมด" รายเมนู/รายรสได้ | ตัดสต็อกอัตโนมัติ |
| พนักงานเปิด/ปิดร้านเอง (สวิตช์) | ตั้งเวลาเปิด-ปิดอัตโนมัติ |
| Login พนักงาน 2 บัญชี สิทธิ์เท่ากัน | หน้าสมัคร, แยก role |
| ต่อยอด churo-ops (stack เดิม, polling) | รวมยอดกับออเดอร์ LINE |
| ท็อปปิ้งเป็นรายการแยก | ช่องหมายเหตุ / ระบุว่าท็อปปิ้งราดชิ้นไหน |
| พนักงานเห็นเบอร์ลูกค้า (แตะโทรได้) ในแท็บกำลังทำ/รอรับ | แจ้งเตือน SMS/LINE อัตโนมัติ |

## 3. เมนู

**Classic Churros** (ไซซ์ S และ M ทุกรส)
- Plain
- Choco Pops
- Choco Berry
- Signature
- ลูกค้าเลือกได้ว่า **ราดบนชูโรส** (ค่าเริ่มต้น) หรือ **แยกดิป/ท็อปปิ้ง** (ใส่ถ้วยแยก) — ลูกค้าเห็นตัวเลือกในตะกร้าและหน้าสถานะ · พนักงานเห็นป้าย "แยกดิป/ท็อปปิ้ง" เฉพาะออเดอร์ที่เลือกแยก

**Churro Hug** (ไซซ์เดียว, ราดอย่างเดียว — ไม่มีตัวเลือกแยก)
- Plain ฿59
- Choco Pops ฿69
- Choco Berry ฿79

**ท็อปปิ้ง (฿10 ทุกตัว):** Choc dip, Choc pops, Strawberry freeze dried, **นมข้น (ใหม่)**
- เป็นหมวดแยกในหน้าเมนู สั่งเป็นรายการของตัวเอง (ไม่ผูกกับ churro ชิ้นใด) — ในตะกร้า/ออเดอร์แสดงเป็นบรรทัดแยก เช่น `1× นมข้น ฿10`
- ไม่มีช่องหมายเหตุ (ตัดสินใจแล้ว 6 พ.ย.)

**การสั่งในหน้าเมนู**
- Churro Hug และท็อปปิ้ง: กด + ใส่ตะกร้าทันที แล้วกลายเป็นตัวเพิ่ม/ลดจำนวน
- Classic Churros: กดแล้วไปหน้าเลือกไซซ์ S/M + ราด/แยกดิป + จำนวน

> ⚠️ churo-ops ยังไม่มี Menu schema (มีแค่ Stock, RestockLog, SignatureRatio, Expense, Order) → ต้องสร้าง `MenuItem` ใหม่ เพื่อให้กด "หมด" ได้ และให้ server คำนวณราคาเอง

## 4. Data Model (Mongoose)

**MenuItem**
- `name`, `category`: `'classic' | 'churro-hug' | 'topping'`
- `variants: [{ name, price, isAvailable }]` — เช่น Churro Hug มี 3 variants, Classic Churros มีรส×ไซซ์ (Signature เป็นรสหนึ่งของ Classic), ท็อปปิ้งแต่ละตัวมี 1 variant
- `sortOrder`

**StorefrontOrder** (collection แยกจาก Order เดิม)
- `customerName`, `customerPhone`
- `items: [{ menuItemId, name, variantName, unitPrice, qty, separateToppings }]` — ท็อปปิ้งเป็น item แยกบรรทัด (ไม่มี `addons` ซ้อนข้างใน) · `separateToppings: Boolean` (default `false`) ใช้กับ Classic เท่านั้น
- `totalPrice` — **คำนวณที่ server จากราคาใน DB เท่านั้น ห้ามเชื่อราคาจาก client**
- `status`: `'pending_payment' | 'cooking' | 'ready' | 'picked_up' | 'cancelled'`
  - `ready` = ทำเสร็จ รอลูกค้ามารับ · `picked_up` = ลูกค้ารับแล้ว (ปิดออเดอร์)
- `queueNumber` — ได้ตอนยืนยันจ่าย, รีเซ็ตทุกวัน
- `confirmedBy` (ref Staff), `confirmedAt`, `readyAt`, `pickedUpAt`, timestamps

**StoreSetting** (document เดียว): `{ _id: 'storefront', isOpen: Boolean (default false), updatedBy (ref Staff), updatedAt }`

**Staff**: `username`, `passwordHash` (bcrypt), `name` — สร้างผ่าน seed script

**Counter**: `{ _id: 'queue-2026-11-04', seq }` — ใช้ `findOneAndUpdate` + `$inc` ออกเลขคิวรายวัน (เวลาไทย)

## 5. API

**Public (ลูกค้า)**
- `GET  /api/storefront/menu` — คืน `{ isOpen, items }` · ถ้าร้านปิด คืน `isOpen: false` และไม่ส่งเมนู · ถ้าเปิด ส่งเฉพาะที่ขาย พร้อมบอกว่าอันไหนหมด
- `POST /api/storefront/orders` — สร้างออเดอร์, คืน `_id` · **ถ้าร้านปิด ตอบ 403** (กันลูกค้าที่เปิดหน้าเมนูค้างไว้ก่อนปิดร้าน) — frontend แสดงหน้า "ร้านปิด"
- `GET  /api/storefront/orders/:id` — สถานะ, เลขคิว, รายการ, ยอด (**ไม่คืนเบอร์โทร**) · ใช้ได้ตลอดแม้ร้านปิด

**Staff (ต้องมี JWT — middleware `requireStaff`)**
- `POST  /api/staff/login`
- `GET   /api/staff/store` / `PATCH /api/staff/store` — `{ isOpen }`
- `GET   /api/staff/orders?status=pending_payment|cooking|ready` — คืนเบอร์โทรด้วย
- `PATCH /api/staff/orders/:id/confirm` → cooking + ออกเลขคิว + `confirmedBy`
- `PATCH /api/staff/orders/:id/ready` → ready + `readyAt`
- `PATCH /api/staff/orders/:id/pickup` → picked_up + `pickedUpAt`
- `PATCH /api/staff/orders/:id/cancel` — สำหรับออเดอร์ที่ไม่จ่าย
- `PATCH /api/staff/menu/:itemId/variants/:variantId` — `{ isAvailable }`

## 6. หน้าจอ

Design: https://claude.ai/artifact/Dhrznc3JcveHsfHeJqnyQK (ไฟล์ดีไซน์อยู่ใน `screens/` และ spec ใน `DESIGN.md`)

**ลูกค้า (มือถือ)**
1. `/order` — ถ้าร้านปิด: หน้า "ตอนนี้ร้านปิดรับออเดอร์" (ไม่มีเมนู) · ถ้าเปิด: เมนู (Churro Hug / Classic Churros / ท็อปปิ้ง) → ตะกร้า → ชื่อ + เบอร์ → ยืนยัน
2. `/order/:id` — QR PromptPay + ยอด, poll ทุก 5 วิ, เปลี่ยนตามสถานะ: เลขคิว/กำลังทำ → พร้อมรับ (มารับได้เลย) → รับสินค้าแล้ว

**พนักงาน**
1. `/staff/login`
2. `/staff` — 3 แท็บ, poll ทุก 5 วิ
   - รอยืนยันจ่าย: ยอด + ชื่อตัวใหญ่ + รายการ → ยืนยันจ่าย / ยกเลิก
   - กำลังทำ: เลขคิว + ชื่อ + เบอร์ (แตะโทร) + รายการ + ป้ายแยกดิป → พร้อมรับ
   - รอรับ: เลขคิว + ชื่อ + เบอร์ + รายการ, กรอบส้มถ้าพร้อมเกิน 10 นาที → ลูกค้ารับแล้ว
3. `/staff/menu` (ปุ่ม "ร้าน / เมนู") — สวิตช์เปิด/ปิดร้านอยู่บนสุด + สวิตช์ "หมด" รายรส

## 7. Security ขั้นต่ำ

- JWT อายุ 30 วัน, ส่งแบบ `Authorization: Bearer` (ย้ายเป็น httpOnly cookie ทีหลังได้)
- รหัสผ่าน hash ด้วย bcrypt, `JWT_SECRET` และ PromptPay ID เก็บใน env
- URL สถานะใช้ MongoDB `_id` (เดาไม่ได้) และไม่แสดงข้อมูลส่วนตัว
- เบอร์โทรลูกค้าส่งเฉพาะใน staff API
- ราคาคำนวณที่ server · เช็ก `isOpen` ที่ server ตอนสร้างออเดอร์ (ไม่เชื่อ frontend)
- (ถ้ามีเวลา) `express-rate-limit` ที่ `POST /orders` กันสแปม

**Packages:** `bcrypt`, `jsonwebtoken`, `promptpay-qr`, `qrcode` (หรือ `qrcode.react` ฝั่ง frontend)

## 8. ข้อควรระวัง — ไม่ให้กระทบ churo-ops

การเพิ่ม schema/collection ใหม่ไม่กระทบข้อมูลและโค้ดเดิม แต่ต้องระวัง:
- **ใส่ `requireStaff` เฉพาะ router ใหม่** — ห้าม `app.use(requireStaff)` แบบ global (churo-ops จะโดน 401 ทั้งหมด)
- **Seed script แตะเฉพาะ MenuItem / Staff / StoreSetting** — ห้าม `dropDatabase()` หรือ `deleteMany()` กับ model เดิม (DB มีข้อมูลจริงของร้าน)
- **ใช้ prefix `/api/storefront` และ `/api/staff`** กันชื่อ route/model ชนกับของเดิม
- **Deploy ช่วงไม่มีรอบขาย** — server restart แป๊บหนึ่ง
- **ราคาอยู่ 2 ที่** (churo-ops frontend + MenuItem) — เปลี่ยนราคาต้องแก้ทั้งคู่ · ระยะยาว: ให้ churo-ops อ่านเมนูจาก MenuItem ด้วย

## 9. แผน 2 วัน

### วันที่ 1 — Backend + หน้าพนักงาน
1. Models: MenuItem, StorefrontOrder, StoreSetting, Staff, Counter
2. Seed script: เมนูทั้งหมด + บัญชีพนักงาน 2 บัญชี + StoreSetting (ปิดไว้ก่อน)
3. Login + `requireStaff` middleware
4. Public API + Staff API (รวมออกเลขคิว, ready, pickup, เปิด/ปิดร้าน)
5. ทดสอบ API ด้วย Postman/Thunder Client
6. หน้า `/staff/login`, `/staff` (3 แท็บ), `/staff/menu` (สวิตช์ร้าน + เมนู)

### วันที่ 2 — หน้าลูกค้า + ทดสอบจริง
1. หน้า `/order` (หน้าร้านปิด, เมนู, ท็อปปิ้ง, ตะกร้า, ฟอร์ม)
2. หน้า `/order/:id` (QR PromptPay + polling สถานะ ครบ 4 สถานะ)
3. Deploy (ที่เดียวกับ churo-ops)
4. ทดสอบจริงด้วยมือถือ 2–3 เครื่อง: ปิดร้าน → สแกนต้องไม่เห็นเมนู → เปิดร้าน → สั่ง → จ่ายจริง ฿1 → ยืนยัน → พร้อมรับ → ลูกค้ารับแล้ว
5. ปริ้น QR ไปติดหน้าร้าน

**ถ้าเวลาไม่พอ ตัดตามลำดับนี้:** rate limit → ปุ่มยกเลิก → ความสวยของ UI (ฟังก์ชันหลักต้องครบก่อน)

## 10. คำถามที่ยังเปิดอยู่

- ราคา Classic Churros S/M ทั้ง 4 รส (รวม Signature) — ดึงจาก churo-ops
