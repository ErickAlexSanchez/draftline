import type { Metadata } from "next";
import { DraftScreen } from "../../../components/DraftScreen";

export const metadata: Metadata = { title: "Draft" };

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftScreen draftId={id} />;
}
