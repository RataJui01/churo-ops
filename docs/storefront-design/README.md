# Churo Bites Storefront — Design Handoff

ชุดไฟล์ดีไซน์ระบบรับออเดอร์หน้าร้าน สำหรับให้ Claude Code (หรือคน) ใช้ implement ใน churo-ops

## ข้างในมีอะไร

| ไฟล์ | คืออะไร |
|---|---|
| `DESIGN.md` | **เริ่มอ่านที่นี่** — spec ทุกหน้า, components, tokens → Tailwind, สถานะ, placeholder |
| `REQUIREMENTS.md` | Flow, scope, data model (Mongoose), API, security, แผน 2 วัน |
| `tokens.json` | Design tokens ของ Churo Bites (สี, ตัวอักษร, ระยะ, มุมโค้ง, เงา) |
| `screens/customer/*.dc.html` | ไฟล์ดีไซน์หน้าลูกค้า 8 หน้า |
| `screens/staff/*.dc.html` | ไฟล์ดีไซน์หน้าพนักงาน 5 หน้า |

ไฟล์ `.dc.html` เป็นไฟล์ดีไซน์ ไม่ใช่โค้ดที่รันได้ — อ่านค่า style จากในไฟล์ได้ตรงๆ (วิธีอ่านอยู่ใน `DESIGN.md` §0)

## Mapping หน้า → route → ไฟล์

ลิงก์ `href` ภายในไฟล์ดีไซน์ยังใช้ชื่อเดิม (คอลัมน์ขวา)

| Route | ไฟล์ในชุดนี้ | ชื่อเดิมในไฟล์ |
|---|---|---|
| `/order` (ร้านเปิด) | `customer/01-menu.dc.html` | `Main.dc.html` |
| `/order` → เลือกไซซ์ Classic | `customer/02-classic-size.dc.html` | `ItemClassic.dc.html` |
| `/cart` | `customer/03-cart-checkout.dc.html` | `Checkout.dc.html` |
| `/order/:id` · pending_payment | `customer/04-payment-promptpay.dc.html` | `Payment.dc.html` |
| `/order/:id` · cooking | `customer/05-status-cooking.dc.html` | `Cooking.dc.html` |
| `/order/:id` · ready | `customer/06-status-ready.dc.html` | `Ready.dc.html` |
| `/order/:id` · picked_up | `customer/07-status-picked-up.dc.html` | `PickedUp.dc.html` |
| `/order` (ร้านปิด) | `customer/08-store-closed.dc.html` | `Closed.dc.html` |
| `/staff/login` | `staff/01-login.dc.html` | `StaffLogin.dc.html` |
| `/staff` · แท็บรอยืนยันจ่าย | `staff/02-tab-pending-payment.dc.html` | `StaffOrders.dc.html` |
| `/staff` · แท็บกำลังทำ | `staff/03-tab-cooking.dc.html` | `StaffCooking.dc.html` |
| `/staff` · แท็บรอรับ | `staff/04-tab-ready-pickup.dc.html` | `StaffPickup.dc.html` |
| `/staff/menu` | `staff/05-store-and-menu.dc.html` | `StaffMenu.dc.html` |

## วิธีใช้กับ Claude Code

1. แตกไฟล์ zip ไว้ในโปรเจกต์ churo-ops เช่น `docs/storefront-design/`
2. (แนะนำ) เพิ่มบรรทัดนี้ใน `CLAUDE.md` ของโปรเจกต์ ให้ Claude Code รู้ทุกครั้ง:
   ```
   ## Storefront (ระบบรับออเดอร์หน้าร้าน)
   ดีไซน์และ requirements อยู่ที่ docs/storefront-design/ — อ่าน DESIGN.md และ REQUIREMENTS.md ก่อนทำงานส่วนนี้
   ใช้ token สีจาก tokens.json เท่านั้น ห้ามแก้หรือลบ model/route เดิมของ churo-ops
   ```
3. สั่งงานทีละส่วนตามแผน 2 วัน เช่น:
   - "อ่าน docs/storefront-design/REQUIREMENTS.md แล้วสร้าง Mongoose models ตาม §4 ยังไม่ต้องทำ API"
   - "ทำหน้า /staff ตาม DESIGN.md §4 และไฟล์ screens/staff/02–04 ใช้ Tailwind token ตาม §1"
   - "ทำหน้า /order ตาม screens/customer/01-menu.dc.html — Churro Hug กับท็อปปิ้งกด + แล้วเป็นตัวเพิ่ม/ลดจำนวน"

ดีไซน์ต้นฉบับ (แก้ต่อได้): https://claude.ai/artifact/Dhrznc3JcveHsfHeJqnyQK
ถ้าแก้ดีไซน์ใน canvas แล้ว ต้อง export ชุดไฟล์นี้ใหม่ ไฟล์ในโปรเจกต์ไม่อัปเดตเอง

สร้างเมื่อ 8 พ.ย. 2026
