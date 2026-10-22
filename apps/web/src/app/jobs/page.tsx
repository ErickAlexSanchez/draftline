import type { Metadata } from "next";
import { JobsScreen } from "../../components/JobsScreen";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return <JobsScreen />;
}
