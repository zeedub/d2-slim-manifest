const fs = require("fs");
const fetch = require("node-fetch");

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons-full.json";

async function main() {
  try {
    console.log("Loading manifest...");

    // 1️⃣ Get current manifest info
    const manifestRes = await fetch(`${BASE_URL}/Destiny2/Manifest/`, {
      headers: { "X-API-Key": API_KEY },
    });
    const manifestData = await manifestRes.json();
    const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

    // 2️⃣ Fetch DestinyInventoryItemDefinition
    const itemDefsRes = await fetch(`https://www.bungie.net${paths.DestinyInventoryItemDefinition}`, {
      headers: { "X-API-Key": API_KEY },
    });
    const itemDefs = await itemDefsRes.json();

    // 3️⃣ Filter to weapons only if desired
    const weapons = {};
    for (const [hash, item] of Object.entries(itemDefs)) {
      if (item.itemType === 3) {
        weapons[hash] = item; // full object, no modifications
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weapons, null, 2));
    console.log(`Saved ${Object.keys(weapons).length} weapons to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
