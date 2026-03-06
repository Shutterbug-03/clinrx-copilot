'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simplified auth context for MVP
// In a full production app, this would use NextAuth.js or AWS Amplify UI Auth
interface DoctorProfile {
    email: string;
    name: string;
    qualifications: string;
    regNumber: string;
    specialty: string;
    hospitalName: string;
    hospitalAddress: string;
    hospitalPhone: string;
    hospitalEmail: string;
    logo: string;
}

interface AuthContextType {
    user: DoctorProfile | null;
    setUser: (user: DoctorProfile | null) => void;
    isLoading: boolean;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => { },
    isLoading: false,
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<DoctorProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Hydrate from localStorage for MVP simplicity
        const savedUser = localStorage.getItem('clinrx_auth_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse saved user');
            }
        }
        setIsLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem('clinrx_auth_user');
        localStorage.removeItem('clinrx_auth_tokens');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, setUser, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
