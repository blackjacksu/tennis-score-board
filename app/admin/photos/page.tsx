import { redirect } from "next/navigation";
import PhotoAdmin from "@/components/PhotoAdmin";
import { isAdmin } from "@/lib/auth";

export default async function AdminPhotosPage() {
  if (!(await isAdmin())) {
    redirect("/admin");
  }
  return <PhotoAdmin />;
}
