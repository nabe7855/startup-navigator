"use client";
import AdvisorDashboard from "@/app/components/AdvisorDashboard";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!userId)
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <>
      <AdvisorDashboard userId={userId} onSignOut={handleSignOut} />
      {children}
    </>
  );
}
