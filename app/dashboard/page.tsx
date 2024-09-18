'use client'

import dynamic from 'next/dynamic'
import type {WithAuthenticatorProps} from '@aws-amplify/ui-react';
import {withAuthenticator} from '@aws-amplify/ui-react';
import '../amplifyConfig'; // Import the Amplify configuration

// Dynamically import the DashboardClient component
const DashboardClient = dynamic(() => import('./DashboardClient'), { ssr: false })

function Page({ signOut, user }: WithAuthenticatorProps) {
    return <DashboardClient signOut={signOut} user={user} />
}

// This is the default export that Next.js expects
export default withAuthenticator(Page);