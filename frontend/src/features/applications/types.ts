export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ApplicationDecision = Exclude<ApplicationStatus, 'PENDING'>;
export type PriceOfferStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type PriceOfferDecision = 'ACCEPTED' | 'REJECTED';

export interface Application {
  id: string;
  projectId: string;
  freelancerId: string;
  introduction: string;
  proposedAmount: number;
  estimatedDays: number;
  status: ApplicationStatus;
  clientOfferAmount: number | null;
  priceOfferStatus: PriceOfferStatus;
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

export interface ApplicationDetail extends ProjectApplication {
  project: {
    id: string;
    title: string;
    budget: number;
    clientId: string;
    recruitmentStatus: 'SCHEDULED' | 'OPEN' | 'CLOSED';
    transactionStatus: string;
    workStartAt: string;
    workEndAt: string;
    isSelected: boolean;
  };
  contract: { id: string; status: string } | null;
}

export interface CreateApplicationInput {
  introduction: string;
  proposedAmount: number;
  estimatedDays: number;
}
