"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { DemoGate } from "@/components/demo-gate";
import { useDemo } from "@/lib/data/store";

export default function NewSurveyPage() {
  return (
    <DemoGate>
      <Create />
    </DemoGate>
  );
}

function Create() {
  const router = useRouter();
  const createSurvey = useDemo((s) => s.createSurvey);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    router.replace(`/surveys/${createSurvey()}/edit`);
  }, [createSurvey, router]);
  return null;
}
