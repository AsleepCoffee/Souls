import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ItemRecord, SkillRecord } from "../../data/types";
import { EQUIPMENT_SLOT_LABEL, EQUIPMENT_SLOT_TYPES } from "../../data/constants";
import { SkillIcon } from "../common/SkillIcon";
import { publicUrl } from "../../utils/publicUrl";
import { decodeLoadout, encodeLoadout, type Loadout } from "../../utils/loadoutShare";
import { PickerOverlay, type PickerOption } from "./PickerOverlay";
import "./LoadoutPlanner.css";

const PASSIVE_CLASSIFICATIONS = new Set(["passive_stance", "proficiency", "buff_toggle"]);

export function LoadoutPlanner({ items, skills }: { items: ItemRecord[]; skills: SkillRecord[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadout = useMemo(() => decodeLoadout(searchParams.get("loadout")), [searchParams]);
  const [openPicker, setOpenPicker] = useState<{ kind: "equipment"; slot: number } | { kind: "active" | "passive" } | null>(null);
  const [copied, setCopied] = useState(false);

  const itemsBySlug = useMemo(() => new Map(items.map((it) => [it.slug, it])), [items]);
  const skillsById = useMemo(() => new Map(skills.map((s) => [s.skill_id, s])), [skills]);

  const itemsBySlot = useMemo(() => {
    const map = new Map<number, ItemRecord[]>();
    for (const it of items) {
      if (!it.equipment_slot.value) continue;
      const type = it.equipment_slot.value.type;
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(it);
    }
    return map;
  }, [items]);

  const activeSkillOptions = useMemo(() => skills.filter((s) => s.classification.value === "active" || s.classification.value === "basic_attack"), [skills]);
  const passiveSkillOptions = useMemo(() => skills.filter((s) => PASSIVE_CLASSIFICATIONS.has(s.classification.value)), [skills]);

  function update(next: Loadout) {
    const params = new URLSearchParams(searchParams);
    params.set("loadout", encodeLoadout(next));
    setSearchParams(params, { replace: true });
  }

  function setSlot(slotType: number, itemSlug: string) {
    update({ ...loadout, equipment: { ...loadout.equipment, [slotType]: itemSlug } });
    setOpenPicker(null);
  }

  function clearSlot(slotType: number) {
    const nextEquipment = { ...loadout.equipment };
    delete nextEquipment[slotType];
    update({ ...loadout, equipment: nextEquipment });
  }

  function addSkill(kind: "active" | "passive", skillId: number) {
    const key = kind === "active" ? "active" : "passive";
    if (loadout[key].includes(skillId)) {
      setOpenPicker(null);
      return;
    }
    update({ ...loadout, [key]: [...loadout[key], skillId] });
    setOpenPicker(null);
  }

  function removeSkill(kind: "active" | "passive", skillId: number) {
    const key = kind === "active" ? "active" : "passive";
    update({ ...loadout, [key]: loadout[key].filter((id) => id !== skillId) });
  }

  function resetLoadout() {
    const params = new URLSearchParams(searchParams);
    params.delete("loadout");
    setSearchParams(params, { replace: true });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be denied by the browser; the URL is already correct in the address bar either way.
    }
  }

  return (
    <div className="loadout-planner">
      <h2>Build Planner</h2>
      <p className="loadout-planner__intro">
        A loadout composer, not a DPS calculator — item stats (rarity, required level, modifiers) and skill
        cooldowns/power are server-runtime values with no real numbers anywhere in the recovered client, so
        there's nothing honest to compute a "build score" from. This tool lets you compose and share what
        equipment and skills you'd want, using only verified names/icons/slots. The active-skill slot count
        isn't confirmed anywhere in the recovered client either, so nothing here enforces one — pick as many as
        you like.
      </p>

      <div className="loadout-planner__actions">
        <button type="button" className="loadout-planner__copy" onClick={copyLink}>
          {copied ? "Copied!" : "Copy share link"}
        </button>
        <button type="button" className="loadout-planner__reset" onClick={resetLoadout}>
          Reset
        </button>
      </div>

      <section className="loadout-planner__section">
        <h3>Equipment</h3>
        <div className="loadout-planner__equip-grid">
          {EQUIPMENT_SLOT_TYPES.map((slotType) => {
            const chosenSlug = loadout.equipment[slotType];
            const chosenItem = chosenSlug ? itemsBySlug.get(chosenSlug) : null;
            return (
              <div key={slotType} className="equip-slot">
                <div className="equip-slot__label">{EQUIPMENT_SLOT_LABEL[slotType]}</div>
                <button
                  type="button"
                  className="equip-slot__box"
                  onClick={() => setOpenPicker({ kind: "equipment", slot: slotType })}
                >
                  {chosenItem ? (
                    <SkillIcon src={publicUrl(chosenItem.icon.value)} alt="" size={36} />
                  ) : (
                    <span className="equip-slot__empty">+</span>
                  )}
                </button>
                {chosenItem ? (
                  <>
                    <span className="equip-slot__name">{chosenItem.name.value}</span>
                    <button type="button" className="equip-slot__clear" onClick={() => clearSlot(slotType)}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="equip-slot__name equip-slot__name--empty">Empty</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="loadout-planner__section">
        <h3>Active skills</h3>
        <SkillChipList
          ids={loadout.active}
          getSkill={(id) => skillsById.get(id)}
          onRemove={(id) => removeSkill("active", id)}
          onAdd={() => setOpenPicker({ kind: "active" })}
        />
      </section>

      <section className="loadout-planner__section">
        <h3>Passive skills</h3>
        <SkillChipList
          ids={loadout.passive}
          getSkill={(id) => skillsById.get(id)}
          onRemove={(id) => removeSkill("passive", id)}
          onAdd={() => setOpenPicker({ kind: "passive" })}
        />
      </section>

      {openPicker?.kind === "equipment" && (
        <PickerOverlay
          title={`Choose ${EQUIPMENT_SLOT_LABEL[openPicker.slot]}`}
          options={itemOptions(itemsBySlot.get(openPicker.slot) ?? [])}
          onSelect={(slug) => setSlot(openPicker.slot, slug)}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === "active" && (
        <PickerOverlay
          title="Add active skill"
          options={skillOptions(activeSkillOptions)}
          onSelect={(key) => addSkill("active", Number(key))}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker?.kind === "passive" && (
        <PickerOverlay
          title="Add passive skill"
          options={skillOptions(passiveSkillOptions)}
          onSelect={(key) => addSkill("passive", Number(key))}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
}

function itemOptions(items: ItemRecord[]): PickerOption[] {
  return items.map((it) => ({ key: it.slug, name: it.name.value, icon: publicUrl(it.icon.value) }));
}

function skillOptions(skills: SkillRecord[]): PickerOption[] {
  return skills.map((s) => ({
    key: String(s.skill_id),
    name: s.name.value,
    icon: s.icon.value ? publicUrl(s.icon.value) : null,
    sublabel: s.branch.value,
  }));
}

function SkillChipList({
  ids,
  getSkill,
  onRemove,
  onAdd,
}: {
  ids: number[];
  getSkill: (id: number) => SkillRecord | undefined;
  onRemove: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="skill-chip-list">
      {ids.map((id) => {
        const skill = getSkill(id);
        if (!skill) return null;
        return (
          <span key={id} className="skill-chip">
            <SkillIcon src={skill.icon.value ? publicUrl(skill.icon.value) : null} alt="" size={22} />
            {skill.name.value}
            <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${skill.name.value}`}>
              ✕
            </button>
          </span>
        );
      })}
      <button type="button" className="skill-chip-list__add" onClick={onAdd}>
        + Add
      </button>
    </div>
  );
}
