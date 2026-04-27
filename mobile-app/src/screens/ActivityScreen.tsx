import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { GlassCard } from '../components/GlassCard';
import {
    Clock,
    CheckCircle2,
    ShieldCheck,
    MapPin,
    ChevronRight,
    Hammer,
    XCircle,
    Truck
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ActivityScreen = () => {
    const { user, persona } = useAuth();
    const { t } = useLanguage();
    const [activities, setActivities] = useState<any[]>([]);
    const [pastActivities, setPastActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchActivities = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (persona === 'landlord') {
                // Landlords see work orders they created
                const { data: activeData } = await supabase
                    .from('project_work_orders')
                    .select(`
                        *,
                        request:project_requests!inner(description, category, tenant_id,
                            building:project_buildings!building_id(name, address),
                            unit:project_units!unit_id(unit_number)
                        )
                    `)
                    .eq('landlord_id', user.id)
                    .in('status', ['dispatched', 'arrived', 'in_progress'])
                    .order('created_at', { ascending: false });

                setActivities(activeData || []);

                const { data: pastData } = await supabase
                    .from('project_work_orders')
                    .select(`
                        *,
                        request:project_requests!inner(description, category,
                            building:project_buildings!building_id(name, address)
                        )
                    `)
                    .eq('landlord_id', user.id)
                    .in('status', ['completed', 'cancelled'])
                    .order('created_at', { ascending: false })
                    .limit(10);

                setPastActivities(pastData || []);
            } else {
                // Tenants see work orders linked to their requests
                const { data: activeData } = await supabase
                    .from('project_work_orders')
                    .select(`
                        *,
                        request:project_requests!inner(description, category, tenant_id)
                    `)
                    .eq('request.tenant_id', user.id)
                    .not('status', 'in', '("completed","cancelled")')
                    .order('created_at', { ascending: false });

                setActivities(activeData || []);

                const { data: pastData } = await supabase
                    .from('project_work_orders')
                    .select(`
                        *,
                        request:project_requests!inner(description, category, tenant_id)
                    `)
                    .eq('request.tenant_id', user.id)
                    .in('status', ['completed', 'cancelled'])
                    .order('created_at', { ascending: false })
                    .limit(10);

                setPastActivities(pastData || []);
            }
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateWorkOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdatingId(orderId);
        try {
            const { error } = await supabase
                .from('project_work_orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            // If completed, also update the request status
            if (newStatus === 'completed') {
                const order = activities.find(a => a.id === orderId);
                if (order?.request_id) {
                    await supabase
                        .from('project_requests')
                        .update({ status: 'resolved' })
                        .eq('id', order.request_id);
                }
            }

            await fetchActivities();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    useEffect(() => {
        fetchActivities();

        const subscription = supabase
            .channel('project_work_orders_live')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_work_orders'
            }, () => {
                fetchActivities();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'dispatched': return '#4A90E2';
            case 'arrived': return colors.warning;
            case 'in_progress': return colors.accent;
            case 'completed': return colors.success;
            case 'cancelled': return colors.error;
            default: return colors.textTertiary;
        }
    };

    const formatDateTime = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>
                            {persona === 'landlord' ? t('activity.landlordHeader') : t('activity.tenantHeader')}
                        </Text>
                        <Text style={styles.headerSub}>
                            {persona === 'landlord' ? t('activity.landlordSubheader') : t('activity.tenantSubheader')}
                        </Text>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('activity.activeDispatch')}</Text>
                    <TouchableOpacity onPress={fetchActivities}>
                        <Text style={styles.refreshText}>{t('activity.refresh')}</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : activities.length === 0 ? (
                    <GlassCard style={styles.emptyActivity}>
                        <Hammer color={colors.textTertiary} size={32} />
                        <Text style={styles.emptyTitle}>{t('activity.noActiveDispatches')}</Text>
                        <Text style={styles.emptySub}>
                            {persona === 'landlord'
                                ? t('activity.landlordEmpty')
                                : t('activity.tenantEmpty')}
                        </Text>
                    </GlassCard>
                ) : (
                    activities.map((order) => {
                        const req = Array.isArray(order.request) ? order.request[0] : order.request;
                        const bld = req?.building ? (Array.isArray(req.building) ? req.building[0] : req.building) : null;
                        const unt = req?.unit ? (Array.isArray(req.unit) ? req.unit[0] : req.unit) : null;

                        return (
                            <GlassCard key={order.id} style={styles.dispatchCard}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                                        <Text style={[styles.statusLabel, { color: getStatusColor(order.status) }]}>
                                            {order.status.toUpperCase()}
                                        </Text>
                                    </View>
                                    {order.scheduled_arrival && (
                                        <View style={styles.etaBox}>
                                            <Text style={styles.etaLabel}>{t('activity.scheduled').toUpperCase()}</Text>
                                            <Text style={styles.etaValue}>{formatDateTime(order.scheduled_arrival)}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.proInfo}>
                                    <View style={styles.proAvatar}>
                                        <Truck color={colors.primary} size={20} />
                                    </View>
                                    <View style={styles.proDetails}>
                                        <View style={styles.verifiedRow}>
                                            <Text style={styles.proName}>{order.vendor_name || t('activity.assignedExpert')}</Text>
                                            <ShieldCheck color={colors.primary} size={14} />
                                        </View>
                                        <Text style={styles.proMeta}>
                                            {req?.category || 'Maintenance'} • {req?.description?.slice(0, 30) || ''}
                                        </Text>
                                        {bld && (
                                            <View style={styles.locationRow}>
                                                <MapPin color={colors.textTertiary} size={10} />
                                                <Text style={styles.locationText}>
                                                    {bld.name || bld.address}{unt ? ` • ${t('activity.unit')} ${unt.unit_number}` : ''}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {order.estimated_cost && (
                                    <View style={styles.costRow}>
                                        <Text style={styles.costLabel}>{t('activity.estCost')}</Text>
                                        <Text style={styles.costValue}>${Number(order.estimated_cost).toFixed(2)}</Text>
                                    </View>
                                )}

                                {/* Landlord Action Buttons */}
                                {persona === 'landlord' && (
                                    <View style={styles.actionRow}>
                                        {order.status === 'dispatched' && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.actionArrived]}
                                                onPress={() => updateWorkOrderStatus(order.id, 'arrived')}
                                                disabled={updatingId === order.id}
                                            >
                                                <Text style={styles.actionBtnText}>{t('activity.markArrived')}</Text>
                                            </TouchableOpacity>
                                        )}
                                        {(order.status === 'dispatched' || order.status === 'arrived') && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.actionCompleted]}
                                                onPress={() => updateWorkOrderStatus(order.id, 'completed')}
                                                disabled={updatingId === order.id}
                                            >
                                                <CheckCircle2 color={colors.textInverse} size={14} />
                                                <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                                                    {t('activity.markCompleted')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.actionCancel]}
                                            onPress={() => {
                                                Alert.alert(t('activity.cancelConfirmTitle'), t('activity.cancelConfirmMsg'), [
                                                    { text: t('activity.no') },
                                                    { text: t('activity.yes'), style: 'destructive', onPress: () => updateWorkOrderStatus(order.id, 'cancelled') }
                                                ]);
                                            }}
                                            disabled={updatingId === order.id}
                                        >
                                            <XCircle color={colors.error} size={14} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Tracking bar */}
                                <View style={styles.trackingTrack}>
                                    <View style={[styles.trackPoint, order.status !== 'cancelled' && styles.pointActive]} />
                                    <View style={[styles.trackLine, (order.status === 'arrived' || order.status === 'completed') && styles.lineActive]} />
                                    <View style={[styles.trackPoint, (order.status === 'arrived' || order.status === 'completed') && styles.pointActive]} />
                                    <View style={[styles.trackLine, order.status === 'completed' && styles.lineActive]} />
                                    <View style={[styles.trackPoint, order.status === 'completed' && styles.pointActive]} />
                                </View>
                            </GlassCard>
                        );
                    })
                )}

                {/* Past Resolutions */}
                <Text style={styles.sectionTitle}>{t('activity.pastTitle')}</Text>
                {pastActivities.length === 0 ? (
                    <GlassCard style={styles.emptyActivity}>
                        <Text style={styles.emptySub}>{t('activity.noPast')}</Text>
                    </GlassCard>
                ) : (
                    pastActivities.map((order) => {
                        const req = Array.isArray(order.request) ? order.request[0] : order.request;
                        return (
                            <GlassCard key={order.id} style={styles.historyCard}>
                                <View style={styles.historyInfo}>
                                    <View style={styles.historyIcon}>
                                        {order.status === 'completed' ? (
                                            <CheckCircle2 color={colors.success} size={18} />
                                        ) : (
                                            <XCircle color={colors.error} size={18} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.historyTitle} numberOfLines={1}>
                                            {req?.description?.slice(0, 40) || t('activity.workOrder')}
                                        </Text>
                                        <Text style={styles.historyMeta}>
                                            {order.status === 'completed' ? t('activity.resolved') : t('activity.cancelled')} {formatDateTime(order.created_at)}
                                            {order.vendor_name ? ` • ${order.vendor_name}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        );
                    })
                )}

                <View style={{ height: 80 }} />
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
        paddingBottom: spacing.m,
    },
    headerContent: {
        paddingHorizontal: spacing.l,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
        marginTop: spacing.s,
    },
    headerSub: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    scrollContent: {
        padding: spacing.l,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginTop: spacing.xl,
        marginBottom: spacing.m,
    },
    refreshText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    dispatchCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.l,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusLabel: {
        fontSize: 9,
        fontWeight: '800',
    },
    etaBox: {
        alignItems: 'flex-end',
    },
    etaLabel: {
        fontSize: 8,
        color: colors.textTertiary,
        fontWeight: '700',
    },
    etaValue: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    proInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    proAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(15, 76, 58, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    proDetails: {
        flex: 1,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    proName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    proMeta: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        fontSize: 10,
        color: colors.textTertiary,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.m,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    costLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    costValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    // Action buttons
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.m,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    actionArrived: {
        borderColor: colors.warning,
        backgroundColor: `${colors.warning}10`,
    },
    actionCompleted: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    actionCancel: {
        flex: 0,
        width: 44,
        borderColor: colors.error,
        backgroundColor: `${colors.error}10`,
    },
    actionBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    // Tracking
    trackingTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackPoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    pointActive: {
        backgroundColor: colors.primary,
        transform: [{ scale: 1.2 }],
    },
    trackLine: {
        width: 60,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: 4,
    },
    lineActive: {
        backgroundColor: colors.primary,
    },
    // History
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    historyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
        flex: 1,
    },
    historyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(74, 187, 101, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    historyMeta: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    emptyActivity: {
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.m,
    },
    emptySub: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    }
});
