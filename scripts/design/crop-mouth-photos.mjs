//   node scripts/design/crop-mouth-photos.mjs
//
// Cuts the app's mouth photo atlas (3 x 2 cells of 512 px) into per-pose images for the wireframe:
// photo-<pose>.jpg = tight crop on the mouth (3:4), photo-full-<pose>.jpg = whole cell as the app shows it.
import sharp from "sharp";
const ATLAS = "public/learning-studio/images/mouth-atlas-v3.png";
const OUT = "docs/design/wireframes/art";
const poses = ["relax", "closed", "open", "teeth", "round", "smile"];
for (const [i, pose] of poses.entries()) {
  const left = (i % 3) * 512, top = Math.floor(i / 3) * 512;
  await sharp(ATLAS).extract({ left: left + 106, top: top + 62, width: 300, height: 400 }).resize(300, 400).jpeg({ quality: 84 }).toFile(`${OUT}/photo-${pose}.jpg`);
  await sharp(ATLAS).extract({ left, top, width: 512, height: 512 }).resize(300, 300).jpeg({ quality: 84 }).toFile(`${OUT}/photo-full-${pose}.jpg`);
  console.log(pose);
}
