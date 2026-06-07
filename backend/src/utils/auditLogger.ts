import prisma from '../db/prisma';

export const logAudit = async (
  userId: string | null | undefined,
  userName: string | null | undefined,
  action: string,
  details: string,
  branchId: string | null | undefined
) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        user_name: userName || null,
        action,
        details,
        business_id: branchId || null,
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};
