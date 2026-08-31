"use client";
import { TextFrame } from "@/components/grootstudio/text-frame"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation";
export default function TextFrameWrapper() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-75 w-full">
            <h1 className='text-7xl max-w-3xl'>
                <TextFrame className="[&_svg]:text-blue-400 dark:text-blue-300 text-white" lineStyle="solid">Team Management</TextFrame>
            </h1>
            <Button onClick={() => router.push("/dashboard")} className="mt-10 text-white font-bold hover:text-black dark:hover:text-white dark:hover:bg-black" variant="outline">Get Started</Button>
        </div>
    );
}