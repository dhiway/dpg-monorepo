import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { HomePage } from './pages/home-page';
import { ProfileFormPage } from './pages/profile-form-page';
import { LoginPage } from './pages/auth/login-page';
import { OtpPage } from './pages/auth/otp-page';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile/new" element={<ProfileFormPage />} />
          <Route path="/profile/:id/edit" element={<ProfileFormPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/otp" element={<OtpPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
