import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useUnreadNotificationCount() {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        if (!user) {
            setCount(0);
            return;
        }

        try {
            const { count: unreadCount, error } = await supabase
                .from('project_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;
            setCount(unreadCount || 0);
        } catch (err) {
            console.error('Error fetching notification count:', err);
        }
    }, [user]);

    useEffect(() => {
        fetchCount();

        // Realtime subscription
        if (!user) return;

        const channel = supabase
            .channel('notification-count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => fetchCount()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchCount]);

    return { count, refetch: fetchCount };
}

// Helper to create notifications from the app
export async function createNotification(
    userId: string,
    title: string,
    body: string,
    type: 'maintenance' | 'chat' | 'billing' | 'system' | 'general' = 'general',
    referenceId?: string,
    referenceType?: 'request' | 'message' | 'work_order' | 'payment'
) {
    try {
        const { error } = await supabase
            .from('project_notifications')
            .insert({
                user_id: userId,
                title,
                body,
                type,
                reference_id: referenceId,
                reference_type: referenceType,
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating notification:', err);
        return false;
    }
}
