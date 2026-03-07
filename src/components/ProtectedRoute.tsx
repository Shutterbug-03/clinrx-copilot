'use client';

import { useAuth } from '@/components/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { userPool } from '@/lib/cognito';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser && !user) {
            router.push('/login');
            return;
        }

        if (cognitoUser) {
            cognitoUser.getSession((err: any, session: any) => {
                if (err || !session.isValid()) {
                    router.push('/login');
                } else {
                    setIsVerified(true);
                }
            });
        } else {
            // Fallback if Context has user but Cognito session isn't loaded yet
            setIsVerified(true);
        }
    }, [user, authLoading, router, pathname]);

    if (authLoading || !isVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}
