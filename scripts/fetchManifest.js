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

    // Add this after creating weaponsSlim to debug holofoil icons
const holofoilWeapons = weaponsSlim.filter(w => w.isHolofoil);
console.log(`Found ${holofoilWeapons.length} holofoil weapons`);

// Check a few holofoil weapons for their icon properties
holofoilWeapons.slice(0, 3).forEach(weapon => {
  const originalWeapon = itemDefs[weapon.hash];
  console.log(`Holofoil weapon: ${weapon.displayProperties.name}`);
  console.log(`  Regular icon: ${weapon.displayProperties.icon}`);
  console.log(`  Watermarked featured: ${weapon.iconWatermarkedFeatured}`);
  console.log(`  IconWatermark (boolean): ${originalWeapon.iconWatermark}`);
  console.log(`  DisplayProperties iconWatermark: ${originalWeapon.displayProperties?.iconWatermark || 'undefined'}`);
  console.log(`  All icon-related props:`, Object.keys(originalWeapon).filter(k => k.toLowerCase().includes('icon')));
});
    // 5️⃣ Save weapons JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weaponsSlim));
    fs.writeFileSync(VERSION_FILE, currentVersion);

    // 6️⃣ Collect all plug hashes actually used by weapons
    const plugHashes = new Set();

    weaponsSlim.forEach(weapon => {
      weapon.sockets?.forEach(socket => {
        if (socket.singleInitialItemHash) plugHashes.add(socket.singleInitialItemHash);
        socket.reusablePlugItems?.forEach(plug => plugHashes.add(plug.plugItemHash));
        if (socket.reusablePlugSetHash) {
          const plugSet = itemDefs[socket.reusablePlugSetHash]?.reusablePlugItems;
          plugSet?.forEach(p => plugHashes.add(p.plugItemHash));
        }
        if (socket.randomizedPlugSetHash) {
          const plugSet = itemDefs[socket.randomizedPlugSetHash]?.reusablePlugItems;
          plugSet?.forEach(p => plugHashes.add(p.plugItemHash));
        }
      });
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
