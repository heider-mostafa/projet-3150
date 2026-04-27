import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
    id: string;
    request_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    read_at: string | null;
    sender_name?: string;
}

export function useMessages(requestId: string) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial messages
    const fetchMessages = useCallback(async () => {
        if (!requestId) return;

        const { data, error } = await supabase
            .from('project_messages')
            .select(`
                id,
                request_id,
                sender_id,
                text,
                created_at,
                read_at,
                sender:project_profiles!sender_id(full_name)
            `)
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const mapped = data.map((m: any) => ({
                ...m,
                sender_name: m.sender?.full_name || 'Unknown',
            }));
            setMessages(mapped);
        }
        setLoading(false);
    }, [requestId]);

    // Send a message
    const sendMessage = useCallback(async (text: string) => {
        if (!user || !requestId || !text.trim()) return;

        const { data, error } = await supabase
            .from('project_messages')
            .insert({
                request_id: requestId,
                sender_id: user.id,
                text: text.trim(),
            })
            .select()
            .single();

        if (!error && data) {
            // Optimistic add (realtime subscription will also catch it)
            setMessages(prev => [...prev, {
                ...data,
                sender_name: 'You',
            }]);
        }

        return { data, error };
    }, [user, requestId]);

    // Subscribe to Realtime
    useEffect(() => {
        fetchMessages();

        if (!requestId) return;

        const channel = supabase
            .channel(`messages:${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'project_messages',
                    filter: `request_id=eq.${requestId}`,
                },
                async (payload) => {
                    const newMsg = payload.new as any;
                    // Don't duplicate if we already have it (optimistic add)
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, {
                            ...newMsg,
                            sender_name: newMsg.sender_id === user?.id ? 'You' : 'Other',
                        }];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [requestId, fetchMessages, user?.id]);

    return { messages, loading, sendMessage };
}
