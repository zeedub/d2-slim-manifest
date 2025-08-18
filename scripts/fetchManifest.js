import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons-full.json";

async function main() {
  console.log("Loading manifest...");

  const manifestRes = await fetch(`${BASE_URL}/Destiny2/Manifest/`, {
    headers: { "X-API-Key": API_KEY },
  });
  const manifestData = await manifestRes.json();
  const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

  const itemDefsRes = await fetch(`https://www.bungie.net${paths.DestinyInventoryItemDefinition}`, {
    headers: { "X-API-Key": API_KEY },
  });
  const itemDefs = await itemDefsRes.json();

  // Filter to weapons only
  const weapons = {};
  for (const [hash, item] of Object.entries(itemDefs)) {
    if (item.itemType === 3) {
      weapons[hash] = item; // full object
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weapons, null, 2));
  console.log(`Saved ${Object.keys(weapons).length} weapons to ${OUTPUT_FILE}`);
}

main().catch(console.error);
