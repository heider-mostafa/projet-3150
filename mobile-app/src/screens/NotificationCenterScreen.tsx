import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { GlassCard } from '../components/GlassCard';
import {
    ChevronLeft,
    Bell,
    AlertTriangle,
    MessageCircle,
    Calendar,
    Wrench,
    CheckCircle,
    Settings,
    Trash2
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Notification {
    id: string;
    title: string;
    body: string;
    type: 'maintenance' | 'chat' | 'billing' | 'system' | 'general';
    reference_id: string | null;
    reference_type: string | null;
    is_read: boolean;
    created_at: string;
}

export const NotificationCenterScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('project_notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription
        if (!user) return;
        const channel = supabase
            .channel('user-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => fetchNotifications()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        await supabase
            .from('project_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
    };

    const markAllAsRead = async () => {
        if (!user) return;
        await supabase
            .from('project_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);

        // Navigate based on reference type
        if (notification.reference_type === 'request' && notification.reference_id) {
            navigation.navigate('RequestDetail', { requestId: notification.reference_id });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'maintenance':
                return <AlertTriangle color={colors.warning} size={20} />;
            case 'chat':
                return <MessageCircle color={colors.primary} size={20} />;
            case 'billing':
                return <Calendar color={colors.accent} size={20} />;
            case 'system':
                return <Wrench color={colors.textSecondary} size={20} />;
            default:
                return <Bell color={colors.primary} size={20} />;
        }
    };

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
                            {unreadCount > 0 && (
                                <View style={styles.headerBadge}>
                                    <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={styles.settingsBtn}
                        >
                            <Settings color={colors.textTertiary} size={20} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {unreadCount > 0 && (
                <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
                    <CheckCircle color={colors.primary} size={14} />
                    <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell color={colors.textTertiary} size={48} />
                        <Text style={styles.emptyTitle}>All Caught Up</Text>
                        <Text style={styles.emptySubtext}>
                            No notifications yet. We'll alert you when something important happens.
                        </Text>
                    </View>
                ) : (
                    notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            onPress={() => handleNotificationPress(notification)}
                            activeOpacity={0.7}
                        >
                            <GlassCard style={[
                                styles.notificationCard,
                                !notification.is_read && styles.unreadCard
                            ]}>
                                <View style={styles.iconContainer}>
                                    {getIcon(notification.type)}
                                </View>
                                <View style={styles.contentContainer}>
                                    <View style={styles.topRow}>
                                        <Text style={[
                                            styles.notificationTitle,
                                            !notification.is_read && styles.unreadTitle
                                        ]}>
                                            {notification.title}
                                        </Text>
                                        <Text style={styles.timestamp}>
                                            {formatTime(notification.created_at)}
                                        </Text>
                                    </View>
                                    <Text style={styles.notificationBody} numberOfLines={2}>
                                        {notification.body}
                                    </Text>
                                    {!notification.is_read && (
                                        <View style={styles.unreadDot} />
                                    )}
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))
                )}

                <View style={styles.spacer} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 2,
    },
    headerBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    headerBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textInverse,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    scrollContent: {
        padding: spacing.m,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.l,
    },
    emptySubtext: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.s,
        lineHeight: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: spacing.m,
        marginBottom: spacing.s,
        backgroundColor: colors.surface,
    },
    unreadCard: {
        backgroundColor: `${colors.primary}08`,
        borderColor: `${colors.primary}20`,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    notificationBody: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    spacer: {
        height: 40,
    },
});
