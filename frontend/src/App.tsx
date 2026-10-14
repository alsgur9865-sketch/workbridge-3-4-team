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
import { ContractCreatePage } from '@/pages/contracts/ContractCreatePage';
import { ContractDetailPage } from '@/pages/contracts/ContractDetailPage';
import { DeliveryPage } from '@/pages/deliveries/DeliveryPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PaymentFailPage } from '@/pages/payments/PaymentFailPage';
import { PaymentSuccessPage } from '@/pages/payments/PaymentSuccessPage';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectFormPage } from '@/pages/ProjectFormPage';
import { ProjectListPage } from '@/pages/ProjectListPage';
import { ContractReviewPage } from '@/pages/reviews/ContractReviewPage';

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
        <Route path="notifications" element={<NotificationsPage />} />

        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/price-estimate" element={<PriceEstimatePage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
        <Route path="projects/:projectId/apply" element={<ApplyPage />} />
        <Route path="projects/:projectId/applications" element={<ProjectApplicationsPage />} />

        <Route path="applications/me" element={<MyApplicationsPage />} />
        <Route path="applications/:applicationId/price" element={<PriceAgreementPage />} />
        <Route path="applications/:applicationId/contract/new" element={<ContractCreatePage />} />
        <Route path="contracts/:contractId" element={<ContractDetailPage />} />
        <Route path="contracts/:contractId/delivery" element={<DeliveryPage />} />
        <Route path="contracts/:contractId/review" element={<ContractReviewPage />} />
        <Route path="payments/success" element={<PaymentSuccessPage />} />
        <Route path="payments/fail" element={<PaymentFailPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
