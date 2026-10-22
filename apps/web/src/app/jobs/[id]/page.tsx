import type { Metadata } from "next";
import { JobScreen } from "../../../components/JobScreen";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobScreen jobId={id} />;
}
