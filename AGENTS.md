# AGENTS.md — บันทึกส่งต่องานสำหรับ AI agent

อ่านไฟล์นี้ก่อนแก้โค้ด ไฟล์นี้อธิบายว่าแอปทำอะไร ข้อมูลเก็บอย่างไร และกติกาที่ต้องรักษาไว้

## ภาพรวม

แบบฟอร์มกรอกรายรับ–รายจ่ายรายเดือน ปีงบประมาณ 2570 (ต.ค. 2569 – ก.ย. 2570)
ของศูนย์ส่งเสริมสุขภาพแผนไทย “กมลาศรม” สำนักงานสาธารณสุขจังหวัดพิษณุโลก
ผู้ใช้เป็นเจ้าหน้าที่ภาครัฐ ภาษาของหน้าจอทั้งหมดเป็นภาษาไทย

- `index.html` แอปทั้งหมดอยู่ในไฟล์เดียว (HTML + CSS + JavaScript ล้วน ไม่มี build step)
- ไลบรารีภายนอก: SheetJS 0.18.5 จาก cdnjs (ใช้ export Excel) และฟอนต์ Sarabun จาก Google Fonts
- `excel/fy2570-report-template.xlsx` แบบฟอร์ม Excel ออฟไลน์ (ไม่ต้องแก้)
- เป้าหมายการ deploy: GitHub Pages (static hosting, ไม่มีเซิร์ฟเวอร์)

## ชั้นเก็บข้อมูลในปัจจุบัน

แอปเขียนไว้ให้รองรับ 2 โหมด (ดูฟังก์ชัน `boot()`):

1. **claude.ai runtime** — ถ้ามี `window.claude.use` จะใช้ capability `db`, `user`, `downloads` ของ claude.ai
2. **โหมดในเครื่อง** — เปิดนอก claude.ai (เช่น GitHub Pages) จะเก็บทุกอย่างใน `localStorage` key `kamalasrom-fy2570-v1`
   ข้อมูลไม่แชร์ข้ามเครื่อง

งานถัดไปคือเพิ่มโหมดที่ 3: **Neon** (ดูหัวข้อด้านล่าง) ให้แทนที่โหมดในเครื่องเมื่อเปิดจาก GitHub Pages

ฟังก์ชันที่แตะชั้นเก็บข้อมูลทั้งหมด (แก้ตรงนี้เมื่อเปลี่ยน backend):
`persistMonth`, `persistAdmin`, `persistUser`, `removeUser`, `logAudit`, `localLoad`, `localSave`
และ subscription ใน `boot()` ที่อ่าน `months`, `admin/inventory`, `users`, `audit`

## โครงสร้างข้อมูล

```
months/{key}          key = "2569-10", "2569-11", ... "2570-09"
  v:  { r1..r5, e1..e16 : number }      ค่าตัวเลขที่บันทึก (ไม่มีคีย์ = 0)
  x:  { field : string }                สูตรที่ผู้ใช้พิมพ์ เช่น "650*6+390*4" (เก็บเฉพาะช่องที่เป็นสูตร)
  status: "draft" | "submitted"
  updatedAt, updatedBy, submittedAt, submittedBy

admin/inventory
  carry: number|null                    ยอดยกมา ณ ต้นเดือนตุลาคม 2569 (Admin กรอก)
  cogs:  { key : number }               ต้นทุนค่ายาสมุนไพรจากการขายยาสมุนไพร ณ เดือนปัจจุบัน (Admin กรอก)
  updatedAt, updatedBy

users/{username}                        username: a-z 0-9 . _ -  (3–32 ตัว)
  name, role: "admin"|"staff"|"viewer", active: boolean
  salt, hash, iter                      PBKDF2-SHA256, 100,000 รอบ, 32 bytes
  createdAt, createdBy, updatedAt, updatedBy

audit/{id}
  at, by, byName, action, month, reason
  changes: [{ f, label, from, to }]
```

บัญชี Admin หลัก `admin` ไม่อยู่ในฐานข้อมูล ตรวจด้วย `ADMIN_SALT` / `ADMIN_HASH` ในโค้ด และลบไม่ได้

## รายการช่องกรอก (ตรงกับรายงาน Excel เดิม)

| field | รายการ | แถวใน Excel เดิม |
|---|---|---|
| r1 | 1. ค่าบริการนวดประคบเพื่อรักษา | B7 |
| r2 | 2. ค่าบริการอบไอน้ำสมุนไพร | B10 |
| r3 | 3. ค่าบริการดูแลมารดาหลังคลอด | B13 |
| r4 | 4. มูลค่าจำหน่ายยาสมุนไพรสำเร็จรูป | B21 |
| r5 | 5. มูลค่าจำหน่ายยาปรุงเฉพาะรายสมุนไพร | B24 |
| e1–e3 | ค่าจ้างเหมาบริการ, ค่าถ่ายเอกสาร, ค่าวัสดุครุภัณฑ์ | E6–E8 |
| e4–e7 | ค่ายาสมุนไพรที่ซื้อ (4 แหล่ง) | E11–E14 |
| (cogs) | ต้นทุนค่ายาสมุนไพรจากการขายยาสมุนไพร ณ เดือนปัจจุบัน — Admin กรอก | E16 |
| e8 | ต้นทุนค่ายาปรุงเฉพาะรายสมุนไพร | E17 |
| e9–e11 | ค่าจ้างผู้ช่วยแพทย์แผนไทย, ต้นทุนอบสมุนไพร, ต้นทุนดูแลมารดาหลังคลอด | E20–E22 |
| e12–e14 | ค่า OT 3 รายการ (12. จันทร์-ศุกร์, 13. เสาร์-อาทิตย์และนักขัตฤกษ์, 14. พนักงานทำความสะอาด) | E25–E27 |

## สูตรคำนวณ (ฟังก์ชัน `compute`) — ห้ามเปลี่ยนความหมาย

```
other    = e1+e2+e3
purchase = e4+e5+e6+e7                 (ซื้อยาเข้าคลัง ไม่นับเป็นรายจ่าย)
proc     = e9+e10+e11
ot       = e12+e13+e14+e15+e16
กำไร: p1=r1-e9  p2=r2-e10  p3=r3-e11  p4=r4-cogs  p5=r5-e8
rev      = r1+r2+r3+r4+r5
exp      = other + cogs + e8 + proc + ot
net      = rev - exp
ยาคงคลัง: ยกมา(ต.ค.) = carry, เดือนถัดไป = คงเหลือเดือนก่อน
          คงเหลือ = ยกมา + purchase - cogs
```

ตัวเลขทดสอบ: ใส่ r1=705250, r4=580660, e1=24400, e2=1375, e4=384050, e7=80000, e9=423150,
e14=19240, e15=5460, e16=4500 และ cogs=395334.40 ต้องได้
รายรับ 1,285,910.00 / รายจ่าย 873,459.40 / กำไร 412,450.60 (ตรงกับรายงานจริง ต.ค. 2568)

## กติกาสิทธิ์ผู้ใช้

- **admin**: จัดการผู้ใช้ (เพิ่ม/แก้/ระงับ/ลบ/ตั้งรหัสใหม่), กรอก carry และ cogs,
  แก้ข้อมูลทุกเดือนแม้ส่งแล้ว (ต้องกรอกเหตุผลถ้าตัวเลขเปลี่ยน), ปลดล็อกเดือน, ดูประวัติ
- **staff**: กรอก บันทึกร่าง และส่งข้อมูล เมื่อ status = "submitted" แก้เองไม่ได้
- **viewer**: อ่านอย่างเดียว ดูสรุปและดาวน์โหลด Excel
- ทุกการบันทึก/ส่ง/แก้/ปลดล็อก และการจัดการผู้ใช้ ต้องเขียนลง audit

ตอนนี้กติกาเหล่านี้ตรวจในเบราว์เซอร์เท่านั้น เมื่อย้ายไป Neon ต้องบังคับที่ฐานข้อมูลด้วย RLS / trigger

## แผนการเชื่อมต่อ Neon (งานถัดไป)

- ใช้ **Neon Data API** (REST, PostgREST-compatible) + **Neon Auth** (อีเมล/รหัสผ่าน, ออก JWT)
  เพราะ GitHub Pages ไม่มีเซิร์ฟเวอร์ ห้ามใช้ Postgres driver ที่ต้องใช้ connection string ในหน้าเว็บ
- ตารางที่ต้องมี: `months`, `inventory`, `app_users` (user_id จาก Neon Auth → role, name, active), `audit`
- RLS:
  - อ่าน: ผู้ใช้ที่ active ทุกบทบาท
  - `months` เขียน: staff เฉพาะแถวที่ status = 'draft', admin ทุกแถว
  - `inventory`, `app_users` เขียน: admin เท่านั้น
  - `audit`: insert ได้ทุกคนที่ active, แก้/ลบไม่ได้ (ควรเขียนด้วย trigger ฝั่งฐานข้อมูล)
- ระบบผู้ใช้แบบ username + PBKDF2 ในโค้ดปัจจุบัน ให้แทนด้วย Neon Auth
- ตั้งค่าโดเมนที่อนุญาต (CORS / trusted origins): `https://poohbands.github.io` และ `http://localhost:<port>` ตอนพัฒนา

## ข้อห้าม

- ห้ามใส่ connection string `postgresql://...`, API key หรือรหัสผ่านใดๆ ลงใน `index.html` หรือ commit ขึ้น Git
  เก็บค่าลับไว้ใน `.env` / `.env.local` เท่านั้น (อยู่ใน `.gitignore` แล้ว)
- repository เป็น Public ห้าม commit ข้อมูลการเงินจริงหรือข้อมูลส่วนบุคคล
- ระบุเวอร์ชันไลบรารีจาก CDN แบบตายตัวเสมอ (เช่น xlsx 0.18.5) ห้ามใช้ `@latest`
- รักษา UI ภาษาไทย ชื่อรายการตามรายงานเดิม และฟีเจอร์ export Excel ไว้
