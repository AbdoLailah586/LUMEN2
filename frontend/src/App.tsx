import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import CleaningPage from './pages/CleaningPage';
import DashboardPage from './pages/DashboardPage';
import TrainingPage from './pages/TrainingPage';
import ResultsPage from './pages/ResultsPage';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { CVPage } from './pages/CVPage';
import { FeatureEngineeringPage } from './pages/FeatureEngineeringPage';

import { AIAssistant } from './components/Chat/AIAssistant';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no sidebar, no auth required */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require auth, wrapped with sidebar Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/:datasetId" element={<DashboardPage />} />
            <Route path="/cleaning" element={<CleaningPage />} />
            <Route path="/cleaning/:datasetId" element={<CleaningPage />} />
            <Route path="/features" element={<FeatureEngineeringPage />} />
            <Route path="/features/:datasetId" element={<FeatureEngineeringPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/training/:datasetId" element={<TrainingPage />} />
            <Route path="/vision" element={<CVPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/results/:jobId" element={<ResultsPage />} />
          </Route>
        </Route>
      </Routes>
      <AIAssistant />
      <ReactQueryDevtools initialIsOpen={false} />
    </BrowserRouter>
  );
}



export default App;
