import { AuraTimer } from "@/components/timer/AuraTimer";
import { Overview } from "@/components/dashboard/Overview";

export default function Home() {
  return (
    <div className="pt-4 sm:pt-8">
      <AuraTimer />
      <Overview />
    </div>
  );
}
