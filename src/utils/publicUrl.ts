/**
 * Resolves a path under public/ against the app's actual base path, so
 * asset references work whether the app is served from domain root or a
 * subpath (e.g. GitHub Pages project sites at /repo-name/, or an iframe
 * embed hosted under a folder). Vite only rewrites root-absolute paths it
 * can see at build time (index.html, CSS url()); raw strings in component
 * code need this at runtime instead.
 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}
