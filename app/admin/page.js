import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db, isDatabaseConfigured } from "@/config/db";
import { visits } from "@/db/schema";
import { isAdminUser } from "@/lib/auth/isAdmin";

const DAY_MS = 24 * 60 * 60 * 1000;

async function getVisitorMetrics() {
  if (!isDatabaseConfigured || !db) {
    return { totalVisitors: 0, last7Days: 0, last30Days: 0 };
  }

  const rows = await db
    .select({ visitorHash: visits.visitorHash, createdAt: visits.createdAt })
    .from(visits)
    .orderBy(desc(visits.createdAt));

  const uniqueByHash = new Set();
  const last7 = new Set();
  const last30 = new Set();
  const now = Date.now();

  for (const row of rows) {
    const hash = row.visitorHash;
    if (!hash) continue;
    uniqueByHash.add(hash);

    const createdAt = new Date(row.createdAt).getTime();
    if (Number.isFinite(createdAt) && now - createdAt <= 7 * DAY_MS) {
      last7.add(hash);
    }
    if (Number.isFinite(createdAt) && now - createdAt <= 30 * DAY_MS) {
      last30.add(hash);
    }
  }

  return {
    totalVisitors: uniqueByHash.size,
    last7Days: last7.size,
    last30Days: last30.size,
  };
}

async function getSignupMetrics() {
  try {
    const userList = await clerkClient.users.getUserList({ limit: 500, offset: 0 });
    const now = Date.now();

    const total = userList.length ?? 0;
    const last7 = userList.filter((user) => {
      const createdAt = new Date(user.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt <= 7 * DAY_MS;
    }).length;
    const last30 = userList.filter((user) => {
      const createdAt = new Date(user.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt <= 30 * DAY_MS;
    }).length;

    return { totalSignups: total, last7Days: last7, last30Days: last30 };
  } catch (error) {
    console.warn("[Luqmati] Clerk signup stats unavailable:", error);
    return { totalSignups: 0, last7Days: 0, last30Days: 0 };
  }
}

export default async function AdminPage() {
  const currentAuth = await auth();
  if (!currentAuth.userId) {
    redirect("/");
  }

  const isAllowed = await isAdminUser(currentAuth);
  if (!isAllowed) {
    redirect("/");
  }

  const [visitorMetrics, signupMetrics] = await Promise.all([
    getVisitorMetrics(),
    getSignupMetrics(),
  ]);

  const cards = [
    { label: "إجمالي الزوار", value: visitorMetrics.totalVisitors, subtitle: "زيارات فريدة" },
    { label: "آخر 7 أيام", value: visitorMetrics.last7Days, subtitle: "زوار جدد" },
    { label: "آخر 30 يوم", value: visitorMetrics.last30Days, subtitle: "زوار جدد" },
    { label: "إجمالي الحسابات", value: signupMetrics.totalSignups, subtitle: "تسجيلات مستخدم" },
    { label: "آخر 7 أيام", value: signupMetrics.last7Days, subtitle: "حسابات جديدة" },
    { label: "آخر 30 يوم", value: signupMetrics.last30Days, subtitle: "حسابات جديدة" },
  ];

  return (
    <main style={{ minHeight: "80dvh", padding: "32px 16px 40px" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "var(--brand)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
            <h1 style={{ margin: "8px 0 0", fontSize: "32px", color: "var(--text-primary)" }}>لوحة التحكم</h1>
          </div>
          <Link href="/" style={{ textDecoration: "none", color: "var(--brand)", fontWeight: 700 }}>العودة للرئيسية</Link>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {cards.map((card) => (
            <div key={`${card.label}-${card.value}-${card.subtitle}`} className="glass-card" style={{ padding: "20px 18px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>{card.label}</div>
              <div style={{ fontSize: "30px", fontWeight: 700, color: "var(--text-primary)" }}>{card.value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>{card.subtitle}</div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
