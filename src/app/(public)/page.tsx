import { AnimatedBars } from "@/components/grootstudio/animated-bars";
import TextFrameWrapper from "@/components/grootstudio/text-frame-wraper";
import { LandingSections } from "@/components/web/LandingSections";

export default function LandingPage() {
  return (
    <div className="w-full bg-background">
      <AnimatedBars
        className="min-h-[85vh] w-full border-0 bg-transparent"
        numBars={18}
        gradientFrom="var(--primary)"
        gradientTo="transparent"
        animationDuration={5}
      >
        <TextFrameWrapper />
      </AnimatedBars>

      <LandingSections />
    </div>
  );
}
