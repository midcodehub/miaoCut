import { notFound } from "next/navigation";
import { InternalWorkbench } from "@/components/internal-workbench";

export const dynamic = "force-dynamic";
export default function InternalPage() {
  if (process.env.WORKBENCH_INTERNAL_ENABLED !== "1") notFound();
  return <InternalWorkbench sessionKey={process.env.WORKBENCH_SESSION_STORAGE_KEY || "sb-kaqlfoxselrvriulvlsm-auth-token"} />;
}
