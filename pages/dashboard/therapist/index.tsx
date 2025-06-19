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
      <h1 className="mb-4 text-2xl font-bold text-zinc-800 dark:text-white">Therapist Dashboard</h1>
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

      <section
        id="events"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "events" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("events");
            scrollTo("events");
          }}
        >
          🔔 Fine-Tune Events
        </h2>
        {expanded === "events" && <FineTuneEventLog />}
      </section>

      <section
        id="retry"
        className={clsx(
          "mb-6 transition-all duration-300",
          expanded === "retry" ? "max-h-none" : "max-h-12 overflow-hidden"
        )}
      >
        <h2
          className="cursor-pointer text-lg font-semibold text-blue-600 hover:underline"
          onClick={() => {
            toggle("retry");
            scrollTo("retry");
          }}
        >
          <RotateCcw size={16} className="ml-1 mr-2 inline-block" />
          <span>Retry Failed Jobs</span>
        </h2>
        {expanded === "retry" && <RetryFailedJobs />}
      </section>
    </div>
  );
}
