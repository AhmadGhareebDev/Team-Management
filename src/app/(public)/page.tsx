import { AnimatedBars } from "@/components/grootstudio/animated-bars";
import TextFrameWrapper from "@/components/grootstudio/text-frame-wraper";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <AnimatedBars
        className="h-screen w-full border-0 bg-transparent"
        numBars={18}
        gradientFrom="var(--primary)"
        gradientTo="transparent"
        animationDuration={5}
      >
        <TextFrameWrapper />
      </AnimatedBars>
    </main>
  );
}