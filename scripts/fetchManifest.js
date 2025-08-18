import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons.json";

async function main() {
  try {
    console.log("Loading manifest...");

    // 1️⃣ Get current manifest info
    const manifestRes = await fetch(`${BASE_URL}/Destiny2/Manifest/`, {
      headers: { "X-API-Key": API_KEY },
    });
    if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
    const manifestData = await manifestRes.json();
    const currentVersion = manifestData.Response.version;
    const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

    console.log("Current version:", currentVersion);

    // 2️⃣ Fetch DestinyInventoryItemDefinition
    const itemDefsRes = await fetch(`https://www.bungie.net${paths.DestinyInventoryItemDefinition}`, {
      headers: { "X-API-Key": API_KEY },
    });
    if (!itemDefsRes.ok) throw new Error(`Item defs fetch failed: ${itemDefsRes.status}`);
    const itemDefs = await itemDefsRes.json();

    // 3️⃣ Filter weapons
    const weapons = {};
    for (const [hash, item] of Object.entries(itemDefs)) {
      if (
        item.displayProperties?.name &&
        item.itemType === 3 &&
        (item.inventory?.tierType === 5 || item.inventory?.tierType === 6)
      ) {
        weapons[hash] = {
          hash,
          name: item.displayProperties.name,
          icon: item.displayProperties.icon,
          tier: item.inventory?.tierType,
          type: item.itemTypeDisplayName,
        };
      }
    }

    console.log("Filtered weapons:", Object.keys(weapons).length);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weapons, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
