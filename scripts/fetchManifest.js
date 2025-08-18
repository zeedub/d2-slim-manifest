import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons-slim.json";

// Dummy helper for ammo type — replace with your real logic if needed
const determineAmmoType = (weapon) => weapon.ammoType || 0;

async function main() {
  try {
    console.log("Loading manifest...");

    // 1️⃣ Get manifest info
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

    // 3️⃣ Filter and slim weapons
    const weaponsSlim = Object.entries(itemDefs)
      .filter(([hash, item]) =>
        item.displayProperties?.name &&
        item.itemType === 3 &&
        (item.inventory?.tierType === 5 || item.inventory?.tierType === 6)
      )
      .map(([hash, weapon]) => {
        // ⚡ Trim each socket entry to only the needed fields
        const trimmedSockets = weapon.sockets?.socketEntries?.map(s => ({
          singleInitialItemHash: s.singleInitialItemHash,
          reusablePlugItems: s.reusablePlugItems,
          reusablePlugSetHash: s.reusablePlugSetHash,
          randomizedPlugSetHash: s.randomizedPlugSetHash,
          socketTypeHash: s.socketTypeHash
        })) || [];

        return {
          hash,
          displayProperties: weapon.displayProperties,
          screenshot: weapon.screenshot || "",
          iconWatermarkedFeatured: weapon.iconWatermarkedFeatured || "",
          itemTypeDisplayName: weapon.itemTypeDisplayName || "",
          itemSubTypeDisplayName: weapon.itemSubTypeDisplayName || "",
          ammoType: weapon.ammoType,
          defaultDamageType: weapon.defaultDamageType || 0,
          tierType: weapon.inventory?.tierType || 0,
          tierTypeName: weapon.inventory?.tierTypeName || "",
          traitIds: weapon.traitIds,
          isHolofoil: weapon.isHolofoil,
          isAdept: weapon.isAdept,
          itemCategoryHashes: weapon.itemCategoryHashes || [],
          breakerType: weapon.breakerType || 0,
          collectibleHash: weapon.collectibleHash || "",
          sockets: {
            ...weapon.sockets,
            socketEntries: trimmedSockets
          }
        };
      });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weaponsSlim)); // no spacing

    console.log(`Saved ${weaponsSlim.length} slimmed weapons to ${OUTPUT_FILE}`);
    console.log("Sample:", weaponsSlim[0]);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
