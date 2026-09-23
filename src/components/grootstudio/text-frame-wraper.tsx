"use client";

import { TextFrame } from "@/components/grootstudio/text-frame";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TextFrameWrapper() {
  const router = useRouter();

  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
      <div className="absolute -z-10 h-48 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground">
        <TextFrame
          className="text-primary [&_svg]:text-primary selection:bg-primary/20 px-4 py-2"
          lineStyle="solid"
        >
          Team Management
        </TextFrame>
      </h1>

      <p className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground font-normal leading-relaxed">
        Streamline workspace collaboration, track project milestones, and manage permissions with precision.
      </p>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Button
          onClick={() => router.push("/workspaces")}
          size="lg"
          className="relative px-8 py-6 text-base font-medium transition-colors duration-200 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}