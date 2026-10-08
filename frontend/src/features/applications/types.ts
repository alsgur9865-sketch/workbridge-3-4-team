export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ApplicationDecision = Exclude<ApplicationStatus, 'PENDING'>;

export interface Application {
  id: string;
  projectId: string;
  freelancerId: string;
  introduction: string;
  proposedAmount: number;
  estimatedDays: number;
  status: ApplicationStatus;
  clientOfferAmount: number | null;
  priceOfferStatus: 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  offeredAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectApplication extends Application {
  freelancer: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
    mainCategory: string | null;
    careerYears: number | null;
  };
}

export interface MyApplication extends Application {
  project: {
    id: string;
    title: string;
    budget: number;
    recruitmentStatus: 'SCHEDULED' | 'OPEN' | 'CLOSED';
    transactionStatus: string;
  };
}

export interface CreateApplicationInput {
  introduction: string;
  proposedAmount: number;
  estimatedDays: number;
}
