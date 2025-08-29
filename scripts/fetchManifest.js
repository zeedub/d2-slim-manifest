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
        iconWatermark: weapon.iconWatermark,
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
        })),
        equippingBlock:{
          ammoType: weapon.equippingBlock.ammoType
        }
      }));


    // 5️⃣ Save weapons JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weaponsSlim));
    fs.writeFileSync(VERSION_FILE, currentVersion);

    // 6️⃣ Collect all plug hashes actually used by weapons
    const plugHashes = new Set();

    // After you create weaponsSlim, before saving JSON
weaponsSlim.forEach(weapon => {
  // Only log for Opaque Hourglass
  const isOpaqueHourglass = weapon.displayProperties?.name === "Opaque Hourglass";

  if (isOpaqueHourglass) {
    console.log(`\n🔎 Processing Opaque Hourglass: ${weapon.hash}`);
    weapon.sockets?.forEach((socket, i) => {
      console.log(`\nSocket ${i}:`, {
        singleInitialItemHash: socket.singleInitialItemHash,
        reusablePlugItems: socket.reusablePlugItems.length,
        reusablePlugSetHash: socket.reusablePlugSetHash,
        randomizedPlugSetHash: socket.randomizedPlugSetHash,
        socketTypeHash: socket.socketTypeHash
      });

      // Log default perk
      if (socket.singleInitialItemHash) {
        const plug = itemDefs[socket.singleInitialItemHash];
        console.log("  Default plug:", plug?.displayProperties?.name || "NOT FOUND", socket.singleInitialItemHash);
      }

      // Log reusablePlugItems
      if (socket.reusablePlugItems?.length) {
        socket.reusablePlugItems.forEach(plug => {
          const plugDef = itemDefs[plug.plugItemHash];
          console.log("  Reusable plug item:", plugDef?.displayProperties?.name || "NOT FOUND", plug.plugItemHash);
        });
      }

      // Log reusablePlugSet
      if (socket.reusablePlugSetHash) {
        const plugSet = itemDefs[socket.reusablePlugSetHash];
        console.log("  Reusable plug set:", plugSet?.reusablePlugItems?.length || 0, socket.reusablePlugSetHash);
        plugSet?.reusablePlugItems?.forEach(p => {
          const plugDef = itemDefs[p.plugItemHash];
          console.log("    PlugSet item:", plugDef?.displayProperties?.name || "NOT FOUND", p.plugItemHash);
        });
      }

      // Log randomizedPlugSet
      if (socket.randomizedPlugSetHash) {
        const plugSet = itemDefs[socket.randomizedPlugSetHash];
        console.log("  Randomized plug set:", plugSet?.reusablePlugItems?.length || 0, socket.randomizedPlugSetHash);
        plugSet?.reusablePlugItems?.forEach(p => {
          const plugDef = itemDefs[p.plugItemHash];
          console.log("    Randomized item:", plugDef?.displayProperties?.name || "NOT FOUND", p.plugItemHash);
        });
      }
    });
  }
});


    // 7️⃣ Build plugs.json with only used plugs
    const plugs = {};
    plugHashes.forEach(hash => {
      const plug = itemDefs[hash];
      if (plug?.displayProperties) {
        plugs[hash] = {
          hash: Number(hash),
          displayProperties: plug.displayProperties
        };
      }
    });

    fs.writeFileSync(PLUGS_FILE, JSON.stringify(plugs));

    console.log(`Saved ${Object.keys(plugs).length} plugs to ${PLUGS_FILE}`);
    console.log(`Saved ${weaponsSlim.length} slimmed weapons to ${OUTPUT_FILE}`);
    console.log("Sample weapon:", weaponsSlim[0]);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
