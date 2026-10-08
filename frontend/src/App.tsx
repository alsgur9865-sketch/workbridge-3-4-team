import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ApplyPage } from '@/pages/applications/ApplyPage';
import { MyApplicationsPage } from '@/pages/applications/MyApplicationsPage';
import { ProjectApplicationsPage } from '@/pages/applications/ProjectApplicationsPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="projects/:projectId/apply" element={<ApplyPage />} />
        <Route path="projects/:projectId/applications" element={<ProjectApplicationsPage />} />
        <Route path="applications/me" element={<MyApplicationsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
