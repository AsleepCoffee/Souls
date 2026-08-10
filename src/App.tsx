import { BrowserRouter, Routes, Route } from "react-router-dom";
import rawSiteData from "./data/skills.generated.json";
import type { SiteData } from "./data/types";
import { Header } from "./components/Header";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { ComingSoon } from "./components/common/ComingSoon";
import { HomePage } from "./pages/HomePage";
import { SkillsPage } from "./pages/SkillsPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ItemDetail } from "./components/Items/ItemDetail";
import { MonstersPage } from "./pages/MonstersPage";
import { MonsterDetail } from "./components/Monsters/MonsterDetail";
import { MapsStub } from "./components/Maps/MapsStub";
import { LevelingStub } from "./components/Leveling/LevelingStub";
import { BuildPlannerPage } from "./pages/BuildPlannerPage";
import "./App.css";

const siteData = rawSiteData as unknown as SiteData;

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header buildId={siteData.meta.build_id} generatedAt={siteData.meta.generated_at} />
      <Nav />

      <main id="main-content" className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:slug" element={<ItemDetail />} />
          <Route path="/monsters" element={<MonstersPage />} />
          <Route path="/monsters/:slug" element={<MonsterDetail />} />
          <Route path="/maps" element={<MapsStub />} />
          <Route path="/leveling" element={<LevelingStub />} />
          <Route path="/build-planner" element={<BuildPlannerPage />} />
          <Route path="*" element={<ComingSoon title="Not found" note="That page doesn't exist." />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
