import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Accueil from './pages/Accueil';
import CandidatPage from './pages/CandidatPage';
import MesurePage from './pages/MesurePage';
import ThemePage from './pages/ThemePage';
import ThemesPage from './pages/ThemesPage';
import QuestionPage from './pages/QuestionPage';
import MethodePage from './pages/MethodePage';
import ConnexionPage from './pages/ConnexionPage';
import Introuvable from './pages/Introuvable';
import BudgetPage from './pages/BudgetPage';
import CandidatsPage from './pages/CandidatsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="candidats" element={<CandidatsPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="candidats/:id" element={<CandidatPage />} />
        <Route path="mesures/:id" element={<MesurePage />} />
        <Route path="themes" element={<ThemesPage />} />
        <Route path="themes/:id" element={<ThemePage />} />
        <Route path="question" element={<QuestionPage />} />
        <Route path="methode" element={<MethodePage />} />
        <Route path="connexion" element={<ConnexionPage />} />
        <Route path="*" element={<Introuvable />} />
      </Route>
    </Routes>
  );
}
