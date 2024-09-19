'use client'

import dynamic from 'next/dynamic'
import type {WithAuthenticatorProps} from '@aws-amplify/ui-react';
import {withAuthenticator} from '@aws-amplify/ui-react';
import '../amplifyConfig';
import {Header} from "@/app/ui/Header";
import {SignInHeader} from "@/app/ui/SignInHeader";
import {SignInFooter} from "@/app/ui/SignInFooter";
import {Footer} from "@/app/ui/Footer"; // Import the Amplify configuration
import "../ui/styles.css";

// Dynamically import the DashboardClient component
const DashboardClient = dynamic(() => import('./DashboardClient'), { ssr: false })

function Page({ signOut, user }: WithAuthenticatorProps) {
    return <DashboardClient signOut={signOut} user={user} />
}

// This is the default export that Next.js expects
export default withAuthenticator(Page, {
    components: {
        SignIn: {
            Header: SignInHeader,
            Footer: SignInFooter
        },
        Footer
    }
});