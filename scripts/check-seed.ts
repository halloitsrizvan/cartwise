import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  console.log({
    profiles: await p.profile.count(),
    vendors: await p.vendor.count(),
    closedDays: await p.dayLog.count({ where: { status: "closed" } }),
    notices: await p.notice.count(),
    offers: await p.offer.count(),
    markets: await p.market.count(),
  });
  await p.$disconnect();
})();
