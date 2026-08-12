import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import rawSiteData from "./data/skills.generated.json";
import type { SiteData } from "./data/types";
import { Header } from "./components/Header";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SkillsPage } from "./pages/SkillsPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ItemDetail } from "./components/Items/ItemDetail";
import { MonstersPage } from "./pages/MonstersPage";
import { MonsterDetail } from "./components/Monsters/MonsterDetail";
import { MapsPage } from "./pages/MapsPage";
import { LevelingStub } from "./components/Leveling/LevelingStub";
import { BuildPlannerPage } from "./pages/BuildPlannerPage";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import "./App.css";

const siteData = rawSiteData as unknown as SiteData;

function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header buildId={siteData.meta.build_id} generatedAt={siteData.meta.generated_at} onOpenSearch={() => setPaletteOpen(true)} />
      <Nav />

      <main id="main-content" className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:slug" element={<ItemDetail />} />
          <Route path="/monsters" element={<MonstersPage />} />
          <Route path="/monsters/:slug" element={<MonsterDetail />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/leveling" element={<LevelingStub />} />
          <Route path="/build-planner" element={<BuildPlannerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </BrowserRouter>
  );
}

export default App;
