import { AnimatedBars } from "@/components/grootstudio/animated-bars"
import TextFrameWrapper from "@/components/grootstudio/text-frame-wraper"

export default function LandingPage() {
  return (
    <div className="">
      <AnimatedBars
        className="h-screen border-0"
        numBars={15}
        gradientFrom="rgb(59, 130, 246)"
        backgroundColor="rgb(2, 6, 23)"
      >
        <TextFrameWrapper />
        
      </AnimatedBars>
    </div>
  )
}