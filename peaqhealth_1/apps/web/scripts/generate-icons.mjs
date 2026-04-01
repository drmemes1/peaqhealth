import sharp from 'sharp'
import fs from 'fs'

fs.mkdirSync('public/icons', { recursive: true })

const sizes = [192, 512]
for (const size of sizes) {
  await sharp('public/images/peaq_logo.png')
    .resize(size, size, {
      fit: 'contain',
      background: { r: 250, g: 250, b: 248, alpha: 1 }
    })
    .png()
    .toFile(`public/icons/icon-${size}.png`)
  console.log(`Generated ${size}x${size}`)
}
