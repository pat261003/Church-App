import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Attendance from './pages/Attendance';
import AttendanceDashboard from './pages/AttendanceDashboard';
import SongList from './pages/SongList';
import AddSong from './pages/AddSong';
import SongDetail from './pages/SongDetail';
import EditSong from './pages/EditSong';
import PrintAttendance from './pages/PrintAttendance';
import PrintSong from './pages/PrintSong';
import { pingServer } from './api/attendance';
import LineupList from './pages/LineupList';
import AddLineup from './pages/AddLineup';
import EditLineup from './pages/EditLineup';
import LineupDetail from './pages/LineupDetail';
import PrintLineup from './pages/PrintLineup';
import ScheduleList from './pages/ScheduleList';
import AddSchedule from './pages/AddSchedule';
import EditSchedule from './pages/EditSchedule';
import ScheduleDetail from './pages/ScheduleDetail';
import PrintSchedule from './pages/PrintSchedule';
import Wheel from './pages/Wheel';

function AppContent() {
  const location = useLocation();
  const isFullWidthPage = location.pathname === '/' || location.pathname === '/wheel';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main
        className={
          isFullWidthPage
            ? 'flex-1 w-full px-0 py-0 pb-28 md:pb-6'
            : 'flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 pb-28 md:pb-6'
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/dashboard" element={<AttendanceDashboard />} />
          <Route path="/songs" element={<SongList />} />
          <Route path="/songs/add" element={<AddSong />} />
          <Route path="/songs/:id" element={<SongDetail />} />
          <Route path="/songs/:id/edit" element={<EditSong />} />
          <Route path="/print/attendance" element={<PrintAttendance />} />
          <Route path="/print/song/:id" element={<PrintSong />} />
          <Route path="/lineups" element={<LineupList />} />
          <Route path="/lineups/add" element={<AddLineup />} />
          <Route path="/lineups/:id" element={<LineupDetail />} />
          <Route path="/lineups/:id/edit" element={<EditLineup />} />
          <Route path="/print/lineup/:id" element={<PrintLineup />} />
          <Route path="/schedules" element={<ScheduleList />} />
          <Route path="/schedules/add" element={<AddSchedule />} />
          <Route path="/schedules/:id" element={<ScheduleDetail />} />
          <Route path="/schedules/:id/edit" element={<EditSchedule />} />
          <Route path="/print/schedule/:id" element={<PrintSchedule />} />
          <Route path="/wheel" element={<Wheel />} />
        </Routes>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          success: {
            style: {
              background: '#EAF0F7',
              color: '#1A1A1A',
              border: '1px solid #5B7FA6',
            },
          },
          error: { style: { background: '#FEF2F2', color: '#991B1B' } },
        }}
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    pingServer();
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}