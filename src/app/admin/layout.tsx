"use client";
import AdminDashboard from "@/app/components/AdminDashboard";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <AdminDashboard onSignOut={handleSignOut} />
      {children}
    </>
  );
}
