import type { Request } from 'express';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { getPrisma } from '@/lib/prisma';

const demoUserHeader = 'x-workbridge-demo-user';

export async function getOptionalProjectUser(request: Request) {
  if (request.user) {
    return request.user;
  }

  if (env.NODE_ENV === 'production') {
    return null;
  }
  const email = request.header(demoUserHeader);
  if (!email) {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_DEMO_USER', '개발용 사용자를 찾을 수 없습니다.');
  }

  return user;
}

export async function requireProjectUser(request: Request) {
  const user = await getOptionalProjectUser(request);
  if (!user) {
    throw new AppError(401, 'AUTH_REQUIRED', '이 기능을 사용하려면 로그인이 필요합니다.');
  }
  return user;
}

export async function requireProjectClient(request: Request) {
  const user = await requireProjectUser(request);

  if (user.role !== 'CLIENT') {
    throw new AppError(403, 'CLIENT_ROLE_REQUIRED', '의뢰인만 프로젝트를 관리할 수 있습니다.');
  }

  return user;
}
