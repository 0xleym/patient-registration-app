"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  CalendarDays,
  Activity,
  ClipboardList,
  Database,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDatabase } from "@/lib/database-provider";

type DashboardStats = {
  totalPatients: number;
  thisWeek: number;
  thisMonth: number;
  averageAge: number | null;
};

const STAT_CARDS = [
  {
    key: "totalPatients",
    label: "Total Patients",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950",
  },
  {
    key: "thisWeek",
    label: "This Week",
    icon: UserPlus,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950",
  },
  {
    key: "thisMonth",
    label: "This Month",
    icon: CalendarDays,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-950",
  },
  {
    key: "averageAge",
    label: "Average Age",
    icon: Activity,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950",
  },
] as const;

const NAV_CARDS = [
  {
    href: "/register",
    label: "Register Patient",
    description: "Add a new patient to the database",
    icon: UserPlus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950",
  },
  {
    href: "/records",
    label: "Patient Records",
    description: "View, search, and manage patient data",
    icon: ClipboardList,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950",
  },
  {
    href: "/query",
    label: "SQL Query Interface",
    description: "Run custom SQL queries on the database",
    icon: Database,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-950",
  },
  {
    href: "/docs",
    label: "Documentation",
    description: "Learn how to use the application",
    icon: BookOpen,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950",
  },
];

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  isLoading,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  isLoading: boolean;
  color: string;
  bg: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
              <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">
                {value}
                {suffix && (
                  <span className="text-base font-normal text-muted-foreground ml-1">
                    {suffix}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NavCard({
  href,
  label,
  description,
  icon: Icon,
  color,
  bg,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardContent className="p-6 flex items-start gap-4">
          <div className={`rounded-lg p-2.5 ${bg} shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{label}</h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const { executeQuery, initialized, syncDatabase } = useDatabase();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageAge: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!initialized) return;

    try {
      const [totalResult, weekResult, monthResult, ageResult] =
        await Promise.all([
          executeQuery("SELECT COUNT(*)::int AS count FROM patients"),
          executeQuery(
            "SELECT COUNT(*)::int AS count FROM patients WHERE created_at >= now() - interval '7 days'"
          ),
          executeQuery(
            "SELECT COUNT(*)::int AS count FROM patients WHERE created_at >= date_trunc('month', now())"
          ),
          executeQuery(
            "SELECT ROUND(AVG(EXTRACT(YEAR FROM age(date_of_birth))))::int AS avg_age FROM patients"
          ),
        ]);

      setStats({
        totalPatients: totalResult[0]?.count ?? 0,
        thisWeek: weekResult[0]?.count ?? 0,
        thisMonth: monthResult[0]?.count ?? 0,
        averageAge: ageResult[0]?.avg_age ?? null,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [initialized, executeQuery]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const handleDatabaseUpdate = async () => {
      try {
        await syncDatabase();
        await loadStats();
      } catch (error) {
        console.error("Error during automatic sync:", error);
      }
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);
    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [syncDatabase, loadStats]);

  const getStatValue = (key: string) => {
    if (key === "averageAge") {
      return stats.averageAge !== null ? stats.averageAge : "\u2014";
    }
    return stats[key as keyof DashboardStats] as number;
  };

  return (
    <div className="container py-10 space-y-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your patient flow.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={getStatValue(card.key)}
            suffix={card.key === "averageAge" && stats.averageAge !== null ? "yrs" : undefined}
            isLoading={isLoading}
            color={card.color}
            bg={card.bg}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NAV_CARDS.map((card) => (
            <NavCard key={card.href} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}
