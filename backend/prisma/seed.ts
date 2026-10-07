import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ApplicationStatus,
  NotificationType,
  PrismaClient,
  ProjectRecruitmentStatus,
  UserRole,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed execution is blocked in production.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearDatabase() {
  await prisma.review.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.aiPriceAnalysis.deleteMany();
  await prisma.application.deleteMany();
  await prisma.projectSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.freelancerSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.user.deleteMany();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  await clearDatabase();

  const passwordHash = await bcrypt.hash('Workbridge123!', 10);

  const skillNames = [
    'React',
    'TypeScript',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Prisma',
    'Figma',
    'AWS',
  ];

  await prisma.skill.createMany({ data: skillNames.map((name) => ({ name })) });
  const skills = await prisma.skill.findMany();
  const skillByName = new Map(skills.map((skill) => [skill.name, skill.id]));

  const client = await prisma.user.create({
    data: {
      email: 'client@workbridge.test',
      passwordHash,
      role: UserRole.CLIENT,
      name: 'Demo Client',
      bio: 'A sample client account for local development.',
      clientProfile: {
        create: {
          companyName: 'Bridge Labs',
          industry: 'Software',
          websiteUrl: 'https://example.com',
        },
      },
    },
  });

  const freelancerOne = await prisma.user.create({
    data: {
      email: 'freelancer1@workbridge.test',
      passwordHash,
      role: UserRole.FREELANCER,
      name: 'Alex Kim',
      bio: 'Full-stack developer.',
      freelancerProfile: {
        create: {
          mainCategory: 'Web Development',
          careerYears: 4,
          desiredRate: 500000,
          portfolioUrl: 'https://example.com/alex',
          skills: {
            create: ['React', 'TypeScript', 'Node.js'].map((name) => ({
              skillId: skillByName.get(name)!,
            })),
          },
        },
      },
    },
  });

  const freelancerTwo = await prisma.user.create({
    data: {
      email: 'freelancer2@workbridge.test',
      passwordHash,
      role: UserRole.FREELANCER,
      name: 'Jamie Park',
      bio: 'Product designer and frontend developer.',
      freelancerProfile: {
        create: {
          mainCategory: 'Design',
          careerYears: 3,
          desiredRate: 400000,
          portfolioUrl: 'https://example.com/jamie',
          skills: {
            create: ['Figma', 'React'].map((name) => ({
              skillId: skillByName.get(name)!,
            })),
          },
        },
      },
    },
  });

  const now = new Date();
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      title: 'Build a freelance matching dashboard',
      description: 'Create a responsive dashboard for clients and freelancers.',
      category: 'Web Development',
      budget: 5000000,
      workStartAt: addDays(now, 14),
      workEndAt: addDays(now, 60),
      recruitmentStartAt: now,
      recruitmentDeadline: addDays(now, 10),
      recruitmentStatus: ProjectRecruitmentStatus.OPEN,
      skills: {
        create: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'].map((name) => ({
          skillId: skillByName.get(name)!,
        })),
      },
    },
  });

  await prisma.project.create({
    data: {
      clientId: client.id,
      title: 'Redesign a B2B landing page',
      description: 'Improve the information architecture and responsive design.',
      category: 'Design',
      budget: 2200000,
      workStartAt: addDays(now, 20),
      workEndAt: addDays(now, 40),
      recruitmentStartAt: now,
      recruitmentDeadline: addDays(now, 8),
      recruitmentStatus: ProjectRecruitmentStatus.OPEN,
      skills: {
        create: ['Figma', 'React'].map((name) => ({ skillId: skillByName.get(name)! })),
      },
    },
  });

  await prisma.application.create({
    data: {
      projectId: project.id,
      freelancerId: freelancerOne.id,
      introduction: 'I can build the dashboard with a typed API and reusable components.',
      proposedAmount: 4700000,
      estimatedDays: 35,
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.bookmark.create({
    data: {
      userId: freelancerTwo.id,
      projectId: project.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: client.id,
      type: NotificationType.NEW_APPLICATION,
      title: 'New application',
      message: 'A freelancer applied to your project.',
      targetUrl: `/projects/${project.id}/applicants`,
    },
  });

  console.log('Seed completed.');
  console.log('Client: client@workbridge.test / Workbridge123!');
  console.log('Freelancer: freelancer1@workbridge.test / Workbridge123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
