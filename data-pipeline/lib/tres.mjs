// Minimal parser for Godot 4 .tres text-resource files — deliberately NOT a
// general-purpose Godot resource-format parser. It only understands the
// fixed handful of section shapes actually present in the recovered
// project's Items/Equipment/Monsters resources: a `[gd_resource ...]`
// header, `[ext_resource ...]` / `[sub_resource ...]` reference tables, and
// one `[resource]` body. Anything inside a section body is treated as
// opaque text and only pulled apart on demand via `scalarField()` — we
// never attempt to fully parse an array/dictionary literal (e.g. a
// SpriteFrames "animations" array), since Godot's text format for those
// isn't valid JSON (unquoted StringName literals like `&"default"`, trailing
// commas in places, etc.) and we only ever need one or two fields out of it.

import { readFileSync } from "node:fs";

const HEADER_RE = /^\[(\w[\w.]*)\s*(.*)\]$/;
const ATTR_RE = /(\w+)="([^"]*)"/g;

function parseAttrs(raw) {
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/**
 * @param {string} text raw .tres file contents
 * @returns {{
 *   extResources: Map<string, {type: string, path: string}>,
 *   subResources: Map<string, {type: string, bodyText: string}>,
 *   resourceBody: string,
 * }}
 */
export function parseTres(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = HEADER_RE.exec(line.trim());
    if (m) {
      current = { kind: m[1], attrsRaw: m[2], bodyLines: [] };
      sections.push(current);
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  const extResources = new Map();
  const subResources = new Map();
  let resourceBody = "";

  for (const s of sections) {
    const attrs = parseAttrs(s.attrsRaw);
    if (s.kind === "ext_resource" && attrs.id) {
      extResources.set(attrs.id, { type: attrs.type, path: attrs.path });
    } else if (s.kind === "sub_resource" && attrs.id) {
      subResources.set(attrs.id, { type: attrs.type, bodyText: s.bodyLines.join("\n") });
    } else if (s.kind === "resource") {
      resourceBody = s.bodyLines.join("\n");
    }
  }

  return { extResources, subResources, resourceBody };
}

export function readTres(filePath) {
  return parseTres(readFileSync(filePath, "utf-8"));
}

function parseScalarValue(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  const ext = /^ExtResource\("([^"]+)"\)$/.exec(raw);
  if (ext) return { ref: "ext", id: ext[1] };
  const sub = /^SubResource\("([^"]+)"\)$/.exec(raw);
  if (sub) return { ref: "sub", id: sub[1] };
  return raw; // opaque fallback (e.g. `Rect2(...)`, `Vector2(...)`) — caller regexes it further if needed
}

/** Pulls a single top-level `name = value` field out of a section's raw body text. */
export function scalarField(bodyText, name) {
  const re = new RegExp(`^${name}\\s*=\\s*(.+)$`, "m");
  const m = re.exec(bodyText);
  if (!m) return null;
  return parseScalarValue(m[1].trim());
}

/** Resolves an ext_resource-typed scalar field to its res://-stripped path, or null. */
export function extResourcePath(parsed, field) {
  if (!field || typeof field !== "object" || field.ref !== "ext") return null;
  const ext = parsed.extResources.get(field.id);
  if (!ext) return null;
  return ext.path.replace(/^res:\/\//, "");
}
