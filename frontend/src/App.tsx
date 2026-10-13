import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ApplyPage } from '@/pages/applications/ApplyPage';
import { MyApplicationsPage } from '@/pages/applications/MyApplicationsPage';
import { PriceAgreementPage } from '@/pages/applications/PriceAgreementPage';
import { ProjectApplicationsPage } from '@/pages/applications/ProjectApplicationsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage';
import { RoleSelectionPage } from '@/pages/auth/RoleSelectionPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectFormPage } from '@/pages/ProjectFormPage';
import { ProjectListPage } from '@/pages/ProjectListPage';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />

        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="select-role" element={<RoleSelectionPage />} />

        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/price-estimate" element={<PriceEstimatePage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
        <Route path="projects/:projectId/apply" element={<ApplyPage />} />
        <Route path="projects/:projectId/applications" element={<ProjectApplicationsPage />} />

        <Route path="applications/me" element={<MyApplicationsPage />} />
        <Route path="applications/:applicationId/price" element={<PriceAgreementPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
