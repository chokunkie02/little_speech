> รายละเอียดสื่อที่รับมาจากต้นแบบรอบก่อน เสียงรอบย้าย repository ยังใช้ไฟล์เดิมตามที่ผู้ใช้เลือก เส้นทางด้านล่างปรับเป็นโฟลเดอร์ใหม่แล้ว

# ตรวจภาพ เสียง และเพลงของ Speech Adventure

## สิ่งที่พบและแก้

| จุดเดิม | ปรับในรุ่นนี้ |
| --- | --- |
| ภาพปากการ์ตูนเดียวขยับเหมือนกันทุกพยางค์ | ภาพคนจำลองด้วย AI 6 ท่า เลือกภาพเตรียมปาก/ช่วงสระ/ผ่อนคลายให้ตรงพยางค์ มีภาพย่อ เลื่อนจังหวะ สลับภาพอัตโนมัติ และขยาย |
| “ไก่กินข้าว” เห็นชามข้าวอย่างเดียว | ฉากไก่และชามข้าวอยู่ด้วยกัน |
| “แมวกินปลา” เห็นปลาอย่างเดียว | ฉากแมวกับปลาในจาน |
| “กาอยู่บนต้นไม้” เห็นต้นไม้อย่างเดียว | ฉากกากับกิ่งไม้ |
| “ม้าอยู่ในสวน” ใช้รูปสวนเดิม | ฉากม้าเต็มตัว ต้นไม้ และดอกไม้ |
| รูปกล่องมีปูอยู่ด้วยเสมอ แม้โจทย์เพียงขอให้เปิดกล่อง | แยกกล่องเดี่ยวจากฉากปู/กา/ม้าในกล่อง |
| ม้าและกุ้งมีโครงหน้าคล้ายตัวละครชนิดอื่น | ม้าเต็มตัวมีแผงคอ/ขา และกุ้งลำตัวโค้งเป็นปล้อง มีหนวดและหาง |
| ฝึกพยางค์ใช้สัตว์ตัวเดิมซ้ำ แม้พยางค์ไม่มีความหมายของสัตว์นั้น | ใช้ภาพรูปแบบเสียงกลาง ๆ และแสดงพยางค์ ไม่ทำให้เข้าใจว่าทุกพยางค์หมายถึงสัตว์ |
| คำสั่งเกมฟังบางข้อบอกชื่อคำตอบ | ใช้คำสั่งกลาง ๆ ให้เปิดฟังคำเป้าหมายแยก |
| เสียงถูกปรับแหลมและอ่านต่อเนื่อง | คืน pitch ปกติ ช้ากว่าธรรมชาติเล็กน้อย แบ่งวลีและแทรกช่วงพักจริง |

## ภาพซ้ำแบบไหนยังตั้งใจใช้

- คำเดิมในเกมฟังและเกมเรียกชื่อ ใช้ภาพสิ่งเดียวกันเพื่อให้ฝึกทักษะต่างกัน
- ฉากเดิมข้ามระดับ ใช้เพื่อเปลี่ยนความซับซ้อนของภาษา เช่น จากบอกชื่อไปเป็นประโยคหรือเล่าเรื่อง ไม่ใช่แค่เปลี่ยนป้ายระดับ
- แบบฝึกแยกเสียงบางข้อใช้คู่ภาพเดิมซ้ำเพื่อให้ลองฟังใหม่ แต่เปลี่ยนคำเป้าหมายหรือลำดับภาพ
- รูปแบบเสียงกลาง ๆ ในช่วงพยางค์ใช้ร่วมกันได้ เพราะตัวโจทย์คือเสียงที่แสดง ไม่ใช่การทายวัตถุ

ไม่อ้างว่าต้นแบบมีภาพใหม่ไม่ซ้ำทุกข้อ การใช้ภาพคุ้นเคยเป็นส่วนหนึ่งของการออกแบบ สิ่งที่ต้องหลีกเลี่ยงคือใช้ภาพเดียวแทนวัตถุคนละชนิดโดยเปลี่ยนเฉพาะชื่อ

## ขอบเขตของภาพปาก

ภาพสร้างด้วย ImageGen เป็นคนสมมติ ไม่ใช่ภาพจากการถ่ายผู้สอนขณะพูดจริง และไม่ได้ซิงก์กับเสียงทุกเฟรม ภาพแสดงริมฝีปากและช่วงสระ อา/อี/อู ได้ แต่ไม่ยืนยันการออกเสียงทั้งคำ โดยเฉพาะ ก ที่ใช้ลิ้นส่วนหลัง ต้องฟังผู้ใหญ่สาธิตและให้ผู้เชี่ยวชาญตรวจเนื้อหาก่อนใช้สอนจริง

ไฟล์: `public/learning-studio/images/mouth-atlas-v3.png` ใช้ภาพ 3 คอลัมน์ × 2 แถวผ่านการจัดวางของเว็บ ไม่แก้ไขภาพคนด้วยการวาดทับ

Prompt ที่ใช้กับ built-in ImageGen: ภาพถ่ายระยะใกล้ฐานจมูกถึงคางของหญิงไทยสมมติคนเดียว แสงนุ่ม พื้นครีม มุมกล้องคงเดิม ทั้งหกช่องขนาดเท่ากัน เรียงปากพัก/ริมฝีปากแตะกัน/สระอา/สระอี/สระอู/ยิ้มหลังพูด ไม่มีข้อความหรือแผนภาพอวัยวะภายใน เป้าหมายคือให้แยกท่าริมฝีปากได้ชัด

## เสียงพูดและเพลง

มีเสียงพูดใหม่ 160 คลิป ใช้ Premwadee TTS เดิม ปรับ rate −4% และ pitch +0Hz บทชวนเล่นแบ่งเป็นวลี มีช่วงพัก 320–500 มิลลิวินาที ตัวอย่างคำสั้นอ่านตรงคำ ไม่เติมคำชมหรือชวนเล่นแทรกในเฉลยเกมฟัง ข้อมูลข้อความที่อ่านจริงและจังหวะหยุดตรวจได้ใน `public/learning-studio/audio/catalog.json`

นี่เป็นการปรับบท จังหวะ และโทนของเสียงสังเคราะห์ ไม่ใช่การเปลี่ยนเป็นเสียงคนอัดจริง หากยังต้องการน้ำเสียงแสดงอารมณ์แบบคนมากขึ้น ขั้นต่อไปควรเปรียบเทียบผู้บรรยายจริงหรือบริการเสียงที่ควบคุมลีลาได้ โดยเก็บไฟล์เสียงสั้นแบบเดิมเพื่อสลับแหล่งเสียงได้

เพลงเป็นทำนองแต่งสำหรับต้นแบบ ใช้เสียงกระดิ่งนุ่มและคอร์ดเรียบง่าย สร้างในเครื่องผ่าน Web Audio ไม่มีเพลงเชิงพาณิชย์ที่นำมาคัดลอก กดเปิดเพลงครั้งแรกตามข้อจำกัดเบราว์เซอร์ จำความชอบเฉพาะเครื่อง ปรับความดัง 5–60% ปิดเพลงได้โดยยังฟังคำตัวอย่างได้ เพลงเบาลงขณะฟังเสียงพูด เงียบระหว่างขอไมค์หรืออัดเสียง และเงียบเมื่อซ่อนหน้าเว็บ


## Prompt ต้นฉบับที่ส่งให้ ImageGen

ใช้ built-in ImageGen ไฟล์ที่ใช้ในโปรเจกต์อยู่ใน public/learning-studio/images/mouth-atlas-v3.png

```text
Use case: scientific-educational. Asset type: photorealistic mouth demonstration photo atlas for a Thai children's speech practice web app. Generate ONE landscape photograph contact sheet as an EXACT 3 columns by 2 rows regular grid, six equal rectangular panels with NO gaps, borders, letters, numbers, symbols or labels. Each panel shows the same fictional friendly Thai adult woman in her late 20s, from base of nose to chin, straight-on mouth closeup, neutral cream studio background. Realistic skin, clear lips and teeth, natural soft daylight, no lipstick, no exaggerated cartoon anatomy, no tongue sticking out. Mouth must occupy center of every panel with identical camera position and scale. Top-left: relaxed lips slightly parted at rest. Top-middle: lips fully gently touching closed for bilabial start /p/ or /m/. Top-right: mouth naturally open vertically for long vowel /aː/, tongue low. Bottom-left: lips spread gently sideways, teeth slightly apart, saying vowel /iː/. Bottom-middle: lips clearly rounded protruded with small circular opening, saying vowel /uː/. Bottom-right: relaxed warm closed-mouth smile after finishing. These are static visual cues for visible lip positions and vowels, do not depict hidden anatomy or claim phonetic diagnosis. Crisp accurate photographic lip silhouettes, easy for a child to distinguish, consistent six-panel grid filling the entire image. No text, no watermark, no props, no additional people.
```
