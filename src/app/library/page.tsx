import { redirect } from "next/navigation";

// The activity library lives in the practice room now ("คลังกิจกรรม" tab), next to the plan it feeds.
export default function LibraryPage() {
  redirect("/training#library");
}
