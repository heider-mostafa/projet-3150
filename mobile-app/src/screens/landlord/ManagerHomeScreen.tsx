import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout, typography } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import { StatsCard } from '../../components/StatsCard';
import {
    AlertTriangle,
    ChevronRight,
    Bell,
    TrendingUp,
    Droplets,
    Zap,
    Building2,
    Calendar,
    ArrowUpRight
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useLandlordMetrics } from '../../hooks/useLandlordMetrics';
import { useLanguage } from '../../context/LanguageContext';

export const ManagerHomeScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const { count: unreadCount } = useUnreadNotificationCount();
    const { t } = useLanguage();
    const dashMetrics = useLandlordMetrics();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const opexRatio = dashMetrics.monthlyRevenue > 0
        ? Math.round((dashMetrics.monthlyExpenses / dashMetrics.monthlyRevenue) * 100)
        : 0;

    const metrics = [
        { label: t('landlordHome.portfolioScore'), value: `${dashMetrics.portfolioScore}`, trend: 'up' as const, trendValue: `${dashMetrics.occupancyRate}%` },
        { label: t('landlordHome.opexRatio'), value: `${opexRatio}%`, status: opexRatio <= 35 ? t('landlordHome.optimal') : t('landlordHome.notice') },
        { label: t('landlordHome.leaseExpiry'), value: `${dashMetrics.leasesExpiringSoon} Units`, status: dashMetrics.leasesExpiringSoon > 0 ? t('landlordHome.notice') : t('landlordHome.optimal') },
    ];

    const fetchPriorityIssues = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // First get landlord's building IDs
            const { data: buildings } = await supabase
                .from('project_buildings')
                .select('id')
                .eq('owner_id', user.id);

            const buildingIds = (buildings || []).map(b => b.id);
            if (buildingIds.length === 0) {
                setRequests([]);
                setIsLoading(false);
                return;
            }

            // Then fetch pending requests for those buildings only
            const { data, error } = await supabase
                .from('project_requests')
                .select(`
                    *,
                    building:project_buildings(name, address),
                    unit:project_units(unit_number)
                `)
                .in('building_id', buildingIds)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching priority issues:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPriorityIssues();
    }, [user]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.brand}>MANAGER OS</Text>
                            <Text style={styles.welcome}>Executive Terminal</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => navigation.navigate('Calendar')}
                            >
                                <Calendar color={colors.text} size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.notifBtn}
                                onPress={() => navigation.navigate('NotificationCenter')}
                            >
                                <Bell color={colors.text} size={20} />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        {unreadCount <= 9 && (
                                            <Text style={styles.badgeText}>{unreadCount}</Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Executive Summary stats */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.metricsRow}
                    style={styles.metricsScrollView}
                >
                    {metrics.map((m, idx) => (
                        <StatsCard
                            key={idx}
                            {...m}
                            style={[
                                styles.executiveMetric,
                                { marginLeft: idx > 0 ? spacing.s : 0 },
                                m.status === 'NOTICE' && styles.noticeMetric
                            ]}
                        />
                    ))}
                </ScrollView>

                {/* Urgent Maintenance Pulse */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PRIORITY RESOLUTION POOL</Text>
                    <TouchableOpacity onPress={fetchPriorityIssues}>
                        <Text style={styles.refreshLink}>SYNC PULSE</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : requests.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>Zero pending bottlenecks discovered.</Text>
                    </GlassCard>
                ) : (
                    <View style={styles.pulseList}>
                        {requests.map((request) => (
                            <TouchableOpacity
                                key={request.id}
                                onPress={() => navigation.navigate('RequestDetail', { requestId: request.id })}
                            >
                                <GlassCard style={styles.pulseCard}>
                                    <View style={styles.pulseIndicator} />
                                    <View style={styles.pulseContent}>
                                        <View style={styles.pulseMeta}>
                                            <Text style={styles.pulseCategory}>{request.category.toUpperCase()}</Text>
                                            <Text style={styles.pulseTime}>IMMEDIATE</Text>
                                        </View>
                                        <Text style={styles.pulseDesc} numberOfLines={2}>{request.description}</Text>
                                        <View style={styles.pulseFooter}>
                                            <Text style={styles.pulseLocation}>
                                                {(request.building as any)?.address || 'Unknown'} • Unit {(request.unit as any)?.unit_number || '?'}
                                            </Text>
                                            <ArrowUpRight color={colors.primary} size={14} />
                                        </View>
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Portfolio Insights */}
                <Text style={styles.sectionTitle}>PORTFOLIO TELEMETRY</Text>
                <View style={styles.insightsGrid}>
                    <GlassCard style={styles.insightCard}>
                        <Building2 color={colors.primary} size={20} />
                        <Text style={styles.insightVal}>{dashMetrics.occupancyRate}%</Text>
                        <Text style={styles.insightLabel}>Occupancy ({dashMetrics.occupiedUnits}/{dashMetrics.totalUnits})</Text>
                    </GlassCard>
                    <GlassCard style={styles.insightCard}>
                        <Zap color={colors.accent} size={20} />
                        <Text style={styles.insightVal}>{dashMetrics.activeWorkOrders}</Text>
                        <Text style={styles.insightLabel}>Active Work Orders</Text>
                    </GlassCard>
                </View>
                <View style={[styles.insightsGrid, { marginTop: spacing.s }]}>
                    <GlassCard style={styles.insightCard}>
                        <TrendingUp color={colors.success} size={20} />
                        <Text style={styles.insightVal}>${dashMetrics.monthlyRevenue.toLocaleString()}</Text>
                        <Text style={styles.insightLabel}>Monthly Revenue</Text>
                    </GlassCard>
                    <GlassCard style={styles.insightCard}>
                        <Droplets color={colors.warning} size={20} />
                        <Text style={styles.insightVal}>${dashMetrics.monthlyExpenses.toLocaleString()}</Text>
                        <Text style={styles.insightLabel}>Monthly Expenses</Text>
                    </GlassCard>
                </View>

                <TouchableOpacity style={styles.fullAuditBtn}>
                    <Text style={styles.fullAuditText}>GENERATE COMPREHENSIVE COMPLIANCE REPORT</Text>
                </TouchableOpacity>

                <View style={styles.safePadding} />
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        marginTop: spacing.s,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 4,
    },
    welcome: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    notifBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textInverse,
    },
    scrollContent: {
        padding: spacing.l,
    },
    metricsScrollView: {
        marginBottom: spacing.xl,
        marginHorizontal: -spacing.l,
        paddingHorizontal: spacing.l,
    },
    metricsRow: {
        flexDirection: 'row',
        paddingRight: spacing.l,
    },
    executiveMetric: {
        width: 160,
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    noticeMetric: {
        borderColor: colors.warning,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
        marginTop: spacing.m,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2.5,
        marginBottom: spacing.m,
    },
    refreshLink: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
    },
    pulseList: {
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    pulseCard: {
        flexDirection: 'row',
        padding: 0,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    pulseIndicator: {
        width: 4,
        backgroundColor: colors.primary,
    },
    pulseContent: {
        flex: 1,
        padding: spacing.m,
    },
    pulseMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pulseCategory: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.5,
    },
    pulseTime: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pulseDesc: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
        lineHeight: 20,
        marginBottom: 12,
    },
    pulseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pulseLocation: {
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    emptyText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    insightsGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    insightCard: {
        flex: 1,
        padding: spacing.m,
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    insightVal: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 8,
    },
    insightLabel: {
        fontSize: 9,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 12,
    },
    fullAuditBtn: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    fullAuditText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    safePadding: {
        height: 100,
    }
});
