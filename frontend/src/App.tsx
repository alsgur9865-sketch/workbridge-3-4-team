import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ApplyPage } from '@/pages/applications/ApplyPage';
import { MyApplicationsPage } from '@/pages/applications/MyApplicationsPage';
import { ProjectApplicationsPage } from '@/pages/applications/ProjectApplicationsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage';
import { RoleSelectionPage } from '@/pages/auth/RoleSelectionPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectFormPage } from '@/pages/ProjectFormPage';
import { ProjectListPage } from '@/pages/ProjectListPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />

        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="select-role" element={<RoleSelectionPage />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/price-estimate" element={<PriceEstimatePage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
        <Route path="projects/:projectId/apply" element={<ApplyPage />} />
        <Route
          path="projects/:projectId/applications"
          element={<ProjectApplicationsPage />}
        />

        <Route path="applications/me" element={<MyApplicationsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
