import { redirect } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import { isAdmin } from "@/lib/auth";

export default async function AdminMatchesPage() {
  if (!(await isAdmin())) {
    redirect("/admin");
  }
  return <AdminBoard />;
}
