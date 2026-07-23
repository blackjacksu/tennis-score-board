import { redirect } from "next/navigation";
import Header from "@/components/Header";
import PinForm from "@/components/PinForm";
import { isAdmin } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isAdmin()) {
    redirect("/admin/matches");
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <Header />
      <PinForm />
    </main>
  );
}
