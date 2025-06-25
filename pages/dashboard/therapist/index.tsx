// File: pages/dashboard/therapist/index.tsx
import ClientList from "./clients";
import Team from "./team";
import FlaggedSessions from "./flagged";
import ExportCsvView from "./exports";
import FineTuneEventLog from "./events";
import RetryFailedJobs from "./retry-failed";
import { useState } from "react";
import clsx from "clsx";
import { Eye, RotateCcw, Users } from "lucide-react";
import { GetServerSidePropsContext } from "next";
import ssrGuard from "@/utils/auth/ssrGuard";
import AnalyticsSection from "@/components/analytics/TharpistAnalyticsSection";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context, ["therapist"]);
  if (redirect) {
    return redirect;
  }
  return { props: {} };
}

export default function TherapistDashboardPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Therapist Dashboard</h1>
      <section
        id="team"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "team" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("team");
            scrollTo("team");
          }}
        >
          <Users size={16} className="ml-1 mr-2 inline-block" />
          <span>Team & Members</span>
        </h2>
        {expanded === "team" && <Team />}
      </section>
      <section
        id="clients"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "clients" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("clients");
            scrollTo("clients");
          }}
        >
          👥 Client List
        </h2>
        {expanded === "clients" && <ClientList />}
      </section>

      <section
        id="flagged"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "flagged" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("flagged");
            scrollTo("flagged");
          }}
        >
          <Eye size={16} className="ml-1 mr-2 inline-block" />
          <span>View Sessions</span>
        </h2>
        {expanded === "flagged" && <FlaggedSessions />}
      </section>

      <section
        id="exports"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "exports" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("exports");
            scrollTo("exports");
          }}
        >
          🎓 Export Training Data
        </h2>
        {expanded === "exports" && <ExportCsvView />}
      </section>

      {/* Analytics Section */}
      <section
        id="analytics"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "analytics" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("analytics");
            scrollTo("analytics");
          }}
        >
          📊 Analytics
        </h2>
        {expanded === "analytics" && <AnalyticsSection />}
      </section>
    </div>
  );
}
