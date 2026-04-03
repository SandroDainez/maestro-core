import { prisma } from "../../lib/prisma";

export class PlatformReadinessService {
  async getStatus() {
    const [tenantCount, userCount, projectCount, runCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.project.count(),
      prisma.pipelineRun.count(),
    ]);

    return {
      status: "operational",
      environment: process.env.NODE_ENV ?? "development",
      authConfigured: Boolean(process.env.NEXTAUTH_SECRET),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      tenants: tenantCount,
      users: userCount,
      projects: projectCount,
      runs: runCount,
      features: {
        orchestrationCore: true,
        humanLanguageEntry: true,
        governanceAudit: true,
        humanApprovalGate: true,
        memoryPersistence: true,
        multiTenantFoundation: tenantCount > 0,
        billing: false,
        pluginMarketplace: false,
        publicSdk: false,
      },
    };
  }
}
