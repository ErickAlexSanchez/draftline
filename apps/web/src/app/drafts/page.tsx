import type { Metadata } from "next";
import { DraftsScreen } from "../../components/DraftsScreen";

export const metadata: Metadata = { title: "Drafts" };

export default function DraftsPage() {
  return <DraftsScreen />;
}
