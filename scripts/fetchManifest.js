import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons-slim.json";
const VERSION_FILE = "./lastVersion.txt";
const PLUGS_FILE = "plugs.json";


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
    const currentVersion = manifestData.Response.version;
    const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

    // 2️⃣ Check last processed version
    let lastVersion = null;
    if (fs.existsSync(VERSION_FILE)) {
      lastVersion = fs.readFileSync(VERSION_FILE, "utf-8");
    }

    // if (currentVersion === lastVersion) {
    //   console.log("Manifest unchanged, skipping regeneration.");
    //   return;
    // }

    console.log(`Manifest updated (old: ${lastVersion || "none"}, new: ${currentVersion})`);

    // 3️⃣ Fetch DestinyInventoryItemDefinition
    const itemDefsRes = await fetch(`https://www.bungie.net${paths.DestinyInventoryItemDefinition}`, {
      headers: { "X-API-Key": API_KEY },
    });
    const itemDefs = await itemDefsRes.json();

    // 4️⃣ Filter and slim weapons
    const weaponsSlim = Object.entries(itemDefs)
      .filter(([hash, item]) =>
        item.displayProperties?.name &&
        item.itemType === 3 &&
        (item.inventory?.tierType === 5 || item.inventory?.tierType === 6)
      )
      .map(([hash, weapon]) => ({
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
        sockets: (weapon.sockets?.socketEntries || []).map(socket => ({
          singleInitialItemHash: socket.singleInitialItemHash,
          reusablePlugItems: socket.reusablePlugItems || [],
          reusablePlugSetHash: socket.reusablePlugSetHash,
          randomizedPlugSetHash: socket.randomizedPlugSetHash,
          socketTypeHash: socket.socketTypeHash
        }))
      }));

    // 5️⃣ Save JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weaponsSlim));
    fs.writeFileSync(VERSION_FILE, currentVersion);



    const plugsSlim = Object.entries(itemDefs)
      .filter(([hash, item]) => item.itemType === 19)
      .map(([hash, plug]) => ({
        hash,
        displayProperties: plug.displayProperties
      }))

    fs.writeFileSync(PLUGS_FILE, JSON.stringify(plugsSlim));
    console.log(`Saved ${plugsSlim.length} plugs to ${PLUGS_FILE}`);

    console.log(`Saved ${weaponsSlim.length} slimmed weapons to ${OUTPUT_FILE}`);
    console.log(`Updated version file to ${currentVersion}`);
    console.log("Sample:", weaponsSlim[0]);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
