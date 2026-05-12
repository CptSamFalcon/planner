import { Routes, Route, Navigate } from 'react-router-dom';
import { FestOsLogin } from './FestOsLogin';
import { FestOsRegister } from './FestOsRegister';
import { FestOsDashboard } from './FestOsDashboard';
import { FestOsFestivalDetail } from './FestOsFestivalDetail';
import { FestOsAcceptInvite } from './FestOsAcceptInvite';

export function FestOsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<FestOsLogin />} />
      <Route path="register" element={<FestOsRegister />} />
      <Route path="invite" element={<FestOsAcceptInvite />} />
      <Route path="dashboard" element={<FestOsDashboard />} />
      <Route path="festivals/:id" element={<FestOsFestivalDetail />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
