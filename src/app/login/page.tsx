'use client';

import { useState } from 'react';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { userPool } from '@/lib/cognito';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [needsNewPassword, setNeedsNewPassword] = useState(false);
    const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
    const { setUser } = useAuth();
    const router = useRouter();

    const fetchDoctorProfile = async (userEmail: string) => {
        try {
            const res = await fetch(`/api/doctor/profile?email=${encodeURIComponent(userEmail)}`);
            if (res.ok) {
                const profile = await res.json();
                localStorage.setItem('clinrx_auth_user', JSON.stringify(profile));
                setUser(profile);

                // Also update the legacy settings for backward compatibility in the MVP
                localStorage.setItem('clinrx_hospital', JSON.stringify({
                    name: profile.hospitalName,
                    address: profile.hospitalAddress,
                    phone: profile.hospitalPhone,
                    email: profile.hospitalEmail,
                    logo: profile.logo
                }));
                localStorage.setItem('clinrx_doctor', JSON.stringify({
                    name: profile.name,
                    qualifications: profile.qualifications,
                    regNumber: profile.regNumber,
                    specialty: profile.specialty
                }));
            }
        } catch (e) {
            console.error('Failed to load doctor profile', e);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const authDetails = new AuthenticationDetails({
            Username: email,
            Password: password,
        });

        const user = new CognitoUser({
            Username: email,
            Pool: userPool,
        });

        user.authenticateUser(authDetails, {
            onSuccess: async (result: any) => {
                localStorage.setItem('clinrx_auth_tokens', JSON.stringify({
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken()
                }));

                await fetchDoctorProfile(email);
                router.push('/dashboard');
            },
            onFailure: (err: any) => {
                setError(err.message || 'Login failed');
                setLoading(false);
            },
            newPasswordRequired: (userAttributes: any, requiredAttributes: any) => {
                setCognitoUser(user);
                setNeedsNewPassword(true);
                setLoading(false);
            }
        });
    };

    const handleNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cognitoUser) return;

        setLoading(true);
        setError('');

        cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
            onSuccess: async (result: any) => {
                localStorage.setItem('clinrx_auth_tokens', JSON.stringify({
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken()
                }));

                await fetchDoctorProfile(email);
                router.push('/dashboard');
            },
            onFailure: (err: any) => {
                setError(err.message || 'Password update failed');
                setLoading(false);
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <span className="text-3xl">⚕️</span>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900">
                        ClinRx Copilot
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Sign in to access your AI Assistant
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
                        {error && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {!needsNewPassword ? (
                            <form className="space-y-6" onSubmit={handleLogin}>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email address</label>
                                    <div className="mt-1">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{ color: 'black' }}
                                            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Password</label>
                                    <div className="mt-1">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            style={{ color: 'black' }}
                                            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                                    >
                                        {loading ? 'Signing in...' : 'Sign in'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-6" onSubmit={handleNewPassword}>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-4">You must change your temporary password.</p>
                                    <label className="block text-sm font-medium text-slate-700">New Password</label>
                                    <div className="mt-1">
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{ color: 'black' }}
                                            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Password & Sign In'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="mt-6 border-t border-slate-200 pt-4">
                            <p className="text-xs text-slate-500 text-center">
                                Test Accounts:<br />
                                dr.arun@citymedical.com / ClinRx@2026<br />
                                dr.priya@apollodelhi.com / ClinRx@2026
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
