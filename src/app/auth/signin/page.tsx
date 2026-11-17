import { Suspense } from "react";
import AuthPage from "../AuthPage";

export default function SignInPage() {
  return <Suspense fallback={null}><AuthPage mode="signin" /></Suspense>;
}
