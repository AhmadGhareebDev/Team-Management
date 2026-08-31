"use client"
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import Link from "next/link"
import { useTransition } from "react";
import { UserCircle , Text } from "lucide-react"

export function AuthNavbar() {

    const {data: session , isPending } = authClient.useSession()
    const [loading , startTransition] = useTransition();


    const logout =  () => {
        startTransition(async () => {
        const { error } = await authClient.signOut()
        if(error) {
            toast.add({
                type: "error",
                description: "Something went wrong. Please try again later.",
            })
        }
        })
        
    }


    if(isPending) {
        return (
            <>
            <Skeleton className="size-9 w-24" />
            <Skeleton className="size-9 w-24" />
            </>
            

        )
    }

 

    if (session) {
        return (
            <Button variant="outline" onClick={logout}>
                logout
            </Button>      
        )
    }

    return (
        <div className="flex items-center gap-2">
                <Link className={buttonVariants()} href="/auth/signup">Sign up</Link>
                <Link className={buttonVariants({ variant: 'outline' })} href="/auth/login">Login</Link>
        </div>
    )

    

}

