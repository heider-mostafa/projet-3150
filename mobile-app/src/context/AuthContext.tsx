import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications } from '../lib/notifications';

type Persona = 'tenant' | 'landlord';

interface Profile {
    full_name: string | null;
    persona: Persona;
    avatar_url: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    persona: Persona | null;
    profile: Profile | null;
    isNewUser: boolean;
    setPersona: (persona: Persona) => void;
    setIsNewUser: (val: boolean) => void;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [persona, setInternalPersona] = useState<Persona | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('project_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Profile not found or fetch failed:', error.message);
                // If profile doesn't exist at all, this is a brand new user
                setIsNewUser(true);
                return;
            }
            if (data) {
                setProfile(data);
                setInternalPersona(data.persona);
                // Check if profile is incomplete (new user who hasn't finished onboarding)
                // For tenants: they need to be linked to a unit via invite code
                if (data.persona === 'tenant') {
                    const { data: unitData } = await supabase
                        .from('project_units')
                        .select('id')
                        .eq('tenant_id', userId)
                        .limit(1);
                    if (!unitData || unitData.length === 0) {
                        setIsNewUser(true);
                    } else {
                        setIsNewUser(false);
                    }
                } else {
                    setIsNewUser(false);
                }
            }
        } catch (err) {
            console.error('Network or unknown error fetching project profile:', err);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
                registerForPushNotifications(session.user.id).catch(console.warn);
            }
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setInternalPersona(null);
                setIsNewUser(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const setPersona = async (p: Persona) => {
        setInternalPersona(p);
        if (user) {
            await supabase.from('project_profiles').update({ persona: p }).eq('id', user.id);
        }
    };

    const signOut = async () => {
        try {
            setSession(null);
            setUser(null);
            setProfile(null);
            setInternalPersona(null);
            setIsNewUser(false);
            supabase.auth.signOut().catch(err => console.warn('Supabase signout failed:', err));
        } catch (err) {
            console.error('Local signout error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{
            session, user, persona, profile, isNewUser,
            setPersona, setIsNewUser, isLoading, signOut, refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
