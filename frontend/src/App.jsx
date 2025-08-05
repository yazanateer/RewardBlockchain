import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import MilestoneTracker from './pages/MilestoneTracker';


export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/milestones/:courseId" element={<MilestoneTracker />} />

      </Routes>
    </MainLayout>
  );
}
