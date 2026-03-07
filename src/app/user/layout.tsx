"use client";
import UserDashboard from "@/app/components/UserDashboard";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/");
      } else {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            const role = data?.role || "user";
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role,
            });
          });
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user)
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <UserDashboard user={user} onSignOut={handleSignOut}>
      {children}
    </UserDashboard>
  );
}
