import type { Metadata } from "next";
import { NewJobScreen } from "../../../components/NewJobScreen";

export const metadata: Metadata = { title: "New job" };

export default function NewJobPage() {
  return <NewJobScreen />;
}
