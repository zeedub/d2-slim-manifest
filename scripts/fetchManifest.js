// fetchManifest.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";

// ================================================
// fetchManifest
// ================================================
async function fetchManifest() {
  console.log("Fetching Bungie manifest...");
  const res = await fetch(`${BASE_URL}/Destiny2/Manifest/`, {
    headers: { "X-API-Key": API_KEY }
  });

  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  const data = await res.json();
  return data.Response;
}

// ================================================
// fetchDefinition
// ================================================
async function fetchDefinition(pathUrl) {
  const url = `https://www.bungie.net${pathUrl}`;
  console.log("Fetching definition:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Definition fetch failed: ${res.status}`);
  return res.json();
}

// ================================================
// main
// ================================================
async function main() {
  try {
    const manifest = await fetchManifest();

    // Get InventoryItemDefinition path (English)
    const itemDefPath = manifest.jsonWorldComponentContentPaths.en
      .DestinyInventoryItemDefinition;

    const allItems = await fetchDefinition(itemDefPath);

    // Filter down weapons only
    const weapons = {};
    for (const [hash, item] of Object.entries(allItems)) {
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
          type: item.itemTypeDisplayName
        };
      }
    }

    console.log(`Filtered weapons: ${Object.keys(weapons).length}`);

    const outputPath = path.resolve("weapons.json");
    fs.writeFileSync(outputPath, JSON.stringify(weapons, null, 2));
    console.log(`Saved to ${outputPath}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
