// Shared between build-wiki-export.mjs (wikitext) and build-datamap.mjs
// (DataMaps JSON) so both outputs always agree on the wiki filename each
// skill's icon is referenced as.
//
// The target wiki (soulsremnant.wiki.gg) already has these icons uploaded —
// confirmed from Template:Favicon/Paste's source (`[[File:{{{Icon}}}.png]]`)
// plus real usage on the live Skills page, where Icon= is always set to the
// skill's own display name. So the wiki filename is just "<Skill Name>.png",
// EXCEPT where that name collides with another page on the wiki, in which
// case it's disambiguated as "<Skill Name> (Skill).png" — confirmed for
// "Perseverance" (the skill collides with something else called
// "Perseverance"). "Melee"/"Range"/"Magic"/"Faith" are also skill names in
// our data AND the branch/category names, so they're flagged as likely
// (but unconfirmed) collisions using the same guessed pattern — verify
// these specifically before publishing.

const CONFIRMED_OVERRIDES = {
  Perseverance: "Perseverance (Skill).png",
};

const UNVERIFIED_COLLISION_RISK = new Set(["Melee", "Range", "Magic", "Faith"]);

export function buildIconManifest(skills) {
  // Multiple skills can share one source texture (e.g. Arrow Rain / Arrow
  // Storm); only emit one manifest entry per unique file, keyed off the
  // first skill that uses it.
  const iconMap = new Map(); // texture_path -> wiki filename
  const rows = [["skill_id", "skill_name", "local_icon_path", "wiki_filename", "notes"]];
  for (const s of skills) {
    const iconPath = s.icon.value;
    if (!iconPath) {
      rows.push([s.skill_id, s.name.value, "(missing)", "(missing)", "no icon in recovered client"]);
      continue;
    }
    const localPath = `public/${iconPath}`;
    if (!iconMap.has(iconPath)) {
      let wikiName;
      let note = "";
      if (CONFIRMED_OVERRIDES[s.name.value]) {
        wikiName = CONFIRMED_OVERRIDES[s.name.value];
        note = "confirmed disambiguated filename (collides with another wiki page)";
      } else if (UNVERIFIED_COLLISION_RISK.has(s.name.value)) {
        wikiName = `${s.name.value} (Skill).png`;
        note = "UNVERIFIED GUESS — this name likely collides with the branch/category page of the same name; confirm the real filename before publishing";
      } else {
        wikiName = `${s.name.value}.png`;
      }
      iconMap.set(iconPath, wikiName);
      rows.push([s.skill_id, s.name.value, localPath, wikiName, note]);
    } else {
      rows.push([s.skill_id, s.name.value, localPath, iconMap.get(iconPath), `reuses same file as another skill`]);
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return { iconMap, csv };
}
