const sharp = require("sharp");

async function run() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
  <rect width="200" height="100" fill="#2563eb"/>
</svg>
`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile("/tmp/sharp-test.png");

  console.log("sharp-svg-ok");
}

run().catch((e) => console.log("sharp-svg-err", e.message));
