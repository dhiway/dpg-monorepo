import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { HomePage } from './pages/home-page';
import { ProfileFormPage } from './pages/profile-form-page';

export function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile/new" element={<ProfileFormPage />} />
        <Route path="/profile/:id/edit" element={<ProfileFormPage />} />
      </Routes>
    </BrowserRouter>
  );
}
