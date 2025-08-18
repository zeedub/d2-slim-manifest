const fs = require("fs");
const fetch = require("node-fetch");

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform";
const OUTPUT_FILE = "weapons.json";

// Dummy helper for ammo type — replace with your real logic
const determineAmmoType = (weapon) => {
  if (!weapon.ammoType) return 0;
  return weapon.ammoType; // 1=Primary, 2=Special, 3=Heavy etc.
};

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

    console.log("Processing weapons...");

    const weaponsList = Object.entries(itemDefs)
      .filter(([hash, item]) =>
        item.displayProperties?.name &&
        item.itemType === 3 &&
        (item.inventory?.tierType === 5 || item.inventory?.tierType === 6)
      )
      .map(([hash, weapon]) => {

        // Extract season info
        let seasonInfo = '';
        if (weapon.traitIds) {
          const seasonTrait = weapon.traitIds.find(trait => trait.startsWith('releases.v'));
          if (seasonTrait) seasonInfo = seasonTrait;
        }

        // Determine if weapon has random rolls
        const hasRandomRolls = weapon.sockets?.socketEntries?.some(socket =>
          (socket.reusablePlugItems?.length || 0) > 0 ||
          socket.reusablePlugSetHash ||
          socket.randomizedPlugSetHash
        ) || false;

        // Damage type display name
        const getDamageTypeName = (damageType) => {
          switch(damageType){
            case 1: return 'Kinetic';
            case 2: return 'Arc';
            case 3: return 'Solar';
            case 4: return 'Void';
            case 6: return 'Stasis';
            case 7: return 'Strand';
            default: return 'Unknown';
          }
        };

        // Tier type display name
        const getTierTypeName = (tierType) => {
          switch(tierType){
            case 6: return 'Exotic';
            case 5: return 'Legendary';
            case 4: return 'Rare';
            case 3: return 'Uncommon';
            case 2: return 'Common';
            default: return 'Unknown';
          }
        };

        return {
          hash,
          name: weapon.displayProperties?.name || '',
          description: weapon.displayProperties?.description || '',
          icon: weapon.displayProperties?.icon || '',
          screenshot: weapon.screenshot || '',
          iconWatermarkedFeatured: weapon.iconWatermarkedFeatured || '',
          itemTypeDisplayName: weapon.itemTypeDisplayName || '',
          itemSubTypeDisplayName: weapon.itemSubTypeDisplayName || '',
          ammoType: determineAmmoType(weapon),
          damageType: weapon.defaultDamageType || 0,
          damageTypeDisplayName: getDamageTypeName(weapon.defaultDamageType || 0),
          tier: weapon.inventory?.tierType || 0,
          tierTypeDisplayName: weapon.inventory?.tierTypeName || getTierTypeName(weapon.inventory?.tierType),
          season: seasonInfo,
          isHolofoil: weapon.isHolofoil ? 1 : 0,
          isAdept: weapon.isAdept ? 1 : 0,
          itemCategoryHashes: weapon.itemCategoryHashes || [],
          breakerType: weapon.breakerType || 0,
          collectibleHash: weapon.collectibleHash?.toString() || '',
          hasRandomRolls: hasRandomRolls
        };
      });

    console.log(`Processed ${weaponsList.length} weapons`);
    console.log("Sample weapon:", weaponsList[0]);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(weaponsList, null, 2));
    console.log(`Saved weapons JSON to ${OUTPUT_FILE}`);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
