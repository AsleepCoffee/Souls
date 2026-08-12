// Early-game leveling route, contributed by a player rather than extracted from any game
// file — the EXP/level formula itself is still genuinely unrecoverable (see the disclaimer in
// LevelingPage.tsx). Zone and monster names below are cross-checked against real World Map /
// monster data so every link on the page points somewhere real.

export interface GuideStep {
  title: string;
  description: string;
  zoneMapId?: string;
  monsterNames?: string[];
  levelTarget?: number;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Finish the tutorial",
    description: "Complete the intro tutorial before anything else — it gates the rest of the early game.",
  },
  {
    title: "Grab quests from Spawn",
    description: "Pick up the early quest chain at Spawn before heading out.",
    zoneMapId: "spawn",
  },
  {
    title: "Outskirts West",
    description: "Kill 25 Slimes to finish the quest here.",
    zoneMapId: "outskirts_west",
    monsterNames: ["Slime"],
  },
  {
    title: "Outskirts Northwest",
    description: "Pass through on the way to the flower field.",
    zoneMapId: "outskirts_northwest",
    monsterNames: ["Slime", "Bubble Spirit", "Jel"],
  },
  {
    title: "Outskirts Flower Field",
    description: "Farm here until level 7 — reliable, low-risk EXP.",
    zoneMapId: "outskirts_flower_field",
    monsterNames: ["Slime", "Bubble Spirit", "Jel"],
    levelTarget: 7,
  },
  {
    title: "Outskirts North (the \"second flower field\")",
    description: "Kill Flows to finish the quest here.",
    zoneMapId: "outskirts_north",
    monsterNames: ["Flows"],
  },
  {
    title: "Outskirts Southeast",
    description: "Pin Pin quest.",
    zoneMapId: "outskirts_southeast",
    monsterNames: ["Pin Pin"],
  },
  {
    title: "Outskirts Pond",
    description: "Slip quest.",
    zoneMapId: "outskirts_pond",
    monsterNames: ["Slip"],
  },
  {
    title: "Outskirts South",
    description: "Hopper quest.",
    zoneMapId: "outskirts_south",
    monsterNames: ["Hopper"],
  },
  {
    title: "Outskirts Southwest",
    description: "Glowsnail quest.",
    zoneMapId: "outskirts_southwest",
    monsterNames: ["Glowsnail"],
  },
  {
    title: "Hit level 10",
    description: "Once you're level 10, run the dungeon intro — this is what unlocks the full World Map.",
  },
  {
    title: "Plains 1",
    description: "Head out to Plains 1 to start the Shepherd's questline.",
    zoneMapId: "plains_1",
    monsterNames: ["Cloudsheep"],
    levelTarget: 11,
  },
];
