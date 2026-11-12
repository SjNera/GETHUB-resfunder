import type { Metadata } from "next";
import { ComingNext } from "@/components/layout/coming-next";

export const metadata: Metadata = { title: "Publish a survey" };

// Placeholder. Task U2 replaces it: fee preview, Fund, Finish setup.
export default function PublishPage() {
  return (
    <ComingNext
      path="/publish"
      eyebrow="Publish a survey"
      title="Fund your survey"
      task="U2"
      lead="Here you'll set the rate, quota and deadline, see the budget, fee and deposit in tBNB, and lock it in the escrow contract with one MetaMask confirmation."
    />
  );
}
