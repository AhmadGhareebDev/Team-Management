"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, Radio, ShieldCheck } from "lucide-react";
import { TextFrame } from "@/components/grootstudio/text-frame";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS = [
  { icon: GitBranch, label: "Blockers you can trace" },
  { icon: Radio, label: "Updates land live" },
  { icon: ShieldCheck, label: "Roles per workspace" },
];

export default function TextFrameWrapper() {
  return (
    <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
      <div className="absolute -z-10 h-48 w-[min(24rem,100%)] bg-primary/10 blur-3xl pointer-events-none" />

      <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
        <TextFrame className="text-primary [&_svg]:text-primary selection:bg-primary/20">
          Team Management
        </TextFrame>
      </span>

      <h1 className="mt-7 font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
        Every task knows what&apos;s blocking it.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Plan the work as a graph: connect what depends on what, watch blockers
        clear themselves when their dependency finishes, and see every change
        the moment it happens.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/workspaces" />}
          className="gap-2"
        >
          Get started
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href="#features" />}
        >
          See how it works
        </Button>
      </div>

      <ul className="mt-12 grid w-full max-w-2xl grid-cols-1 divide-y divide-border border border-border bg-background/60 text-sm text-muted-foreground sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center justify-center gap-2 px-4 py-3"
          >
            <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
