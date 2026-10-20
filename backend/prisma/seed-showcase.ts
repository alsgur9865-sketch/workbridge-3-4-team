import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ApplicationStatus,
  ContractStatus,
  DeliveryStatus,
  PaymentStatus,
  PriceOfferStatus,
  PrismaClient,
  ProjectRecruitmentStatus,
  ProjectTransactionStatus,
  UserRole,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed showcase data.');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Showcase seed execution is blocked in production.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function syncProjectSkills(projectId: string, skillNames: string[]) {
  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  await prisma.projectSkill.deleteMany({ where: { projectId } });
  await prisma.projectSkill.createMany({
    data: skills.map((skill) => ({ projectId, skillId: skill.id })),
    skipDuplicates: true,
  });
}

async function upsertProject(input: {
  clientId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  workStartAt: Date;
  workEndAt: Date;
  recruitmentStartAt: Date;
  recruitmentDeadline: Date;
  recruitmentStatus: ProjectRecruitmentStatus;
  transactionStatus: ProjectTransactionStatus;
  skills: string[];
}) {
  const existing = await prisma.project.findFirst({
    where: { clientId: input.clientId, title: input.title, deletedAt: null },
  });
  const data = {
    clientId: input.clientId,
    title: input.title,
    description: input.description,
    category: input.category,
    budget: input.budget,
    workStartAt: input.workStartAt,
    workEndAt: input.workEndAt,
    recruitmentStartAt: input.recruitmentStartAt,
    recruitmentDeadline: input.recruitmentDeadline,
    recruitmentStatus: input.recruitmentStatus,
    transactionStatus: input.transactionStatus,
    deletedAt: null,
  };

  const project = existing
    ? await prisma.project.update({ where: { id: existing.id }, data })
    : await prisma.project.create({ data });

  await syncProjectSkills(project.id, input.skills);
  return project;
}

async function main() {
  const now = new Date();
  const passwordHash = await bcrypt.hash('Workbridge123!', 10);

  const client = await prisma.user.upsert({
    where: { email: 'homepage-content-20261020@workbridge.test' },
    update: { name: 'WorkBridge 데모 의뢰인', role: UserRole.CLIENT, passwordHash },
    create: {
      email: 'homepage-content-20261020@workbridge.test',
      name: 'WorkBridge 데모 의뢰인',
      role: UserRole.CLIENT,
      passwordHash,
    },
  });
  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    update: { companyName: 'Bridge Studio', industry: 'Digital Product' },
    create: {
      userId: client.id,
      companyName: 'Bridge Studio',
      industry: 'Digital Product',
    },
  });

  const freelancer = await prisma.user.upsert({
    where: { email: 'showcase-freelancer@workbridge.test' },
    update: { name: 'WorkBridge 데모 전문가', role: UserRole.FREELANCER, passwordHash },
    create: {
      email: 'showcase-freelancer@workbridge.test',
      name: 'WorkBridge 데모 전문가',
      role: UserRole.FREELANCER,
      passwordHash,
    },
  });
  const freelancerProfile = await prisma.freelancerProfile.upsert({
    where: { userId: freelancer.id },
    update: { mainCategory: 'Web Development', careerYears: 5, desiredRate: 550000 },
    create: {
      userId: freelancer.id,
      mainCategory: 'Web Development',
      careerYears: 5,
      desiredRate: 550000,
    },
  });

  const freelancerSkills = await Promise.all(
    ['React', 'TypeScript', 'Node.js', 'Figma'].map((name) =>
      prisma.skill.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  await prisma.freelancerSkill.deleteMany({
    where: { freelancerProfileId: freelancerProfile.id },
  });
  await prisma.freelancerSkill.createMany({
    data: freelancerSkills.map((skill) => ({
      freelancerProfileId: freelancerProfile.id,
      skillId: skill.id,
    })),
    skipDuplicates: true,
  });

  const openProjects = [
    {
      title: 'AI 기반 채용 관리 대시보드',
      description:
        '채용 담당자가 지원자 상태와 면접 일정을 한눈에 관리할 수 있는 반응형 대시보드 MVP를 개발합니다.',
      category: 'Web Development',
      budget: 7500000,
      skills: ['React', 'TypeScript', 'Node.js'],
    },
    {
      title: '브랜드 커머스 랜딩페이지 리디자인',
      description:
        '신규 브랜드의 핵심 가치와 상품 정보를 명확하게 전달하는 모바일 우선 랜딩페이지를 리디자인합니다.',
      category: 'Design',
      budget: 3200000,
      skills: ['Figma', 'React'],
    },
    {
      title: 'B2B 고객 포털 MVP 개발',
      description:
        '기업 고객이 계약 현황과 요청 내역을 확인할 수 있는 고객 포털의 핵심 화면과 API를 구현합니다.',
      category: 'Web Development',
      budget: 9000000,
      skills: ['React', 'Express', 'PostgreSQL'],
    },
  ];

  for (const [index, project] of openProjects.entries()) {
    await upsertProject({
      clientId: client.id,
      ...project,
      workStartAt: addDays(now, 14 + index),
      workEndAt: addDays(now, 45 + index * 5),
      recruitmentStartAt: addDays(now, -1),
      recruitmentDeadline: addDays(now, 10 + index),
      recruitmentStatus: ProjectRecruitmentStatus.OPEN,
      transactionStatus: ProjectTransactionStatus.NONE,
    });
  }

  const completedProject = await upsertProject({
    clientId: client.id,
    title: '브랜드 예약 플랫폼 구축',
    description:
      '브랜드 고객이 모바일에서 예약하고 운영자가 일정을 관리하는 예약 플랫폼 구축을 완료했습니다.',
    category: 'Web Development',
    budget: 5800000,
    skills: ['React', 'TypeScript', 'Node.js'],
    workStartAt: addDays(now, -70),
    workEndAt: addDays(now, -25),
    recruitmentStartAt: addDays(now, -95),
    recruitmentDeadline: addDays(now, -80),
    recruitmentStatus: ProjectRecruitmentStatus.CLOSED,
    transactionStatus: ProjectTransactionStatus.COMPLETED,
  });

  const application = await prisma.application.upsert({
    where: {
      projectId_freelancerId: {
        projectId: completedProject.id,
        freelancerId: freelancer.id,
      },
    },
    update: {
      introduction: '완료된 협업 흐름을 검증하기 위한 데모 지원입니다.',
      proposedAmount: 5600000,
      estimatedDays: 40,
      status: ApplicationStatus.ACCEPTED,
      clientOfferAmount: 5800000,
      priceOfferStatus: PriceOfferStatus.ACCEPTED,
      respondedAt: addDays(now, -75),
    },
    create: {
      projectId: completedProject.id,
      freelancerId: freelancer.id,
      introduction: '완료된 협업 흐름을 검증하기 위한 데모 지원입니다.',
      proposedAmount: 5600000,
      estimatedDays: 40,
      status: ApplicationStatus.ACCEPTED,
      clientOfferAmount: 5800000,
      priceOfferStatus: PriceOfferStatus.ACCEPTED,
      offeredAt: addDays(now, -76),
      respondedAt: addDays(now, -75),
    },
  });

  await prisma.project.update({
    where: { id: completedProject.id },
    data: {
      selectedApplicationId: application.id,
      recruitmentStatus: ProjectRecruitmentStatus.CLOSED,
      transactionStatus: ProjectTransactionStatus.COMPLETED,
      closedAt: addDays(now, -75),
    },
  });

  const showcaseContractContent = {
    projectTitle: completedProject.title,
    clientName: client.name ?? client.email,
    freelancerName: freelancer.name ?? freelancer.email,
    terms: [
      '1. 작업 범위: 브랜드 예약과 운영 일정 관리 기능을 구현한다.',
      '2. 산출물: 배포 가능한 웹 애플리케이션과 소스 코드를 납품한다.',
      '3. 대금 지급: 납품 승인 후 플랫폼 안전결제를 통해 정산한다.',
      '4. 수정 요청: 납품 후 7일 이내 합리적인 범위의 수정 요청을 반영한다.',
      '5. 비밀 유지: 양 당사자는 작업 중 알게 된 정보를 제3자에게 공개하지 않는다.',
    ].join('\n'),
  };

  const contract = await prisma.contract.upsert({
    where: { projectId: completedProject.id },
    update: {
      applicationId: application.id,
      agreedAmount: 5800000,
      contractStartAt: addDays(now, -70),
      contractEndAt: addDays(now, -25),
      contractContent: showcaseContractContent,
      clientSignedAt: addDays(now, -73),
      freelancerSignedAt: addDays(now, -73),
      status: ContractStatus.SIGNED,
    },
    create: {
      projectId: completedProject.id,
      applicationId: application.id,
      agreedAmount: 5800000,
      contractStartAt: addDays(now, -70),
      contractEndAt: addDays(now, -25),
      contractContent: showcaseContractContent,
      clientSignedAt: addDays(now, -73),
      freelancerSignedAt: addDays(now, -73),
      status: ContractStatus.SIGNED,
    },
  });

  await prisma.payment.upsert({
    where: { contractId: contract.id },
    update: {
      amount: 5800000,
      platformFee: 580000,
      settlementAmount: 5220000,
      status: PaymentStatus.RELEASED,
      releasedAt: addDays(now, -22),
    },
    create: {
      contractId: contract.id,
      provider: 'TOSS_SANDBOX',
      orderId: 'showcase-order-brand-booking',
      paymentKey: 'showcase-payment-brand-booking',
      amount: 5800000,
      platformFee: 580000,
      settlementAmount: 5220000,
      status: PaymentStatus.RELEASED,
      paidAt: addDays(now, -72),
      escrowedAt: addDays(now, -72),
      releasedAt: addDays(now, -22),
    },
  });

  await prisma.delivery.upsert({
    where: { contractId: contract.id },
    update: {
      message: '예약 플랫폼 구축과 검수를 완료했습니다.',
      status: DeliveryStatus.APPROVED,
      approvedAt: addDays(now, -23),
    },
    create: {
      contractId: contract.id,
      message: '예약 플랫폼 구축과 검수를 완료했습니다.',
      attachmentUrls: [],
      status: DeliveryStatus.APPROVED,
      submittedAt: addDays(now, -24),
      approvedAt: addDays(now, -23),
    },
  });

  await prisma.review.upsert({
    where: {
      contractId_reviewerId_revieweeId: {
        contractId: contract.id,
        reviewerId: client.id,
        revieweeId: freelancer.id,
      },
    },
    update: {
      rating: 5,
      content: '일정을 지키면서 요구사항을 꼼꼼히 반영해 완성도 높은 결과물을 전달했습니다.',
      tags: ['일정 준수', '높은 완성도', '재협업 희망'],
    },
    create: {
      contractId: contract.id,
      reviewerId: client.id,
      revieweeId: freelancer.id,
      rating: 5,
      content: '일정을 지키면서 요구사항을 꼼꼼히 반영해 완성도 높은 결과물을 전달했습니다.',
      tags: ['일정 준수', '높은 완성도', '재협업 희망'],
    },
  });

  await prisma.review.upsert({
    where: {
      contractId_reviewerId_revieweeId: {
        contractId: contract.id,
        reviewerId: freelancer.id,
        revieweeId: client.id,
      },
    },
    update: {
      rating: 5,
      content: '목표와 피드백이 명확해 작업 범위를 빠르게 결정하고 원활하게 협업했습니다.',
      tags: ['요구사항 명확', '빠른 소통', '친절한 응대'],
    },
    create: {
      contractId: contract.id,
      reviewerId: freelancer.id,
      revieweeId: client.id,
      rating: 5,
      content: '목표와 피드백이 명확해 작업 범위를 빠르게 결정하고 원활하게 협업했습니다.',
      tags: ['요구사항 명확', '빠른 소통', '친절한 응대'],
    },
  });

  console.log('Showcase data is ready without deleting existing records.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
