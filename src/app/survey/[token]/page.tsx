import { SurveyClient } from "@/components/survey/survey-client";

export const metadata = {
  title: "How do you use AI at work?",
};

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-dvh bg-background">
      <SurveyClient token={token} />
    </main>
  );
}
