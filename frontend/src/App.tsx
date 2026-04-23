import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import CleaningPage from './pages/CleaningPage';
import DashboardPage from './pages/DashboardPage';
import TrainingPage from './pages/TrainingPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/:datasetId" element={<DashboardPage />} />
        <Route path="/cleaning" element={<CleaningPage />} />
        <Route path="/cleaning/:datasetId" element={<CleaningPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/training/:datasetId" element={<TrainingPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results/:jobId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
