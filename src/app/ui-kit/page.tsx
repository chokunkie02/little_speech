import { notFound } from "next/navigation";
import UiKitPreview from "./UiKitPreview";

// Living preview of the shared UI kit. Development only.
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiKitPreview />;
}
