import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Wifi, Trash2, Zap, Droplet, ChevronRight, Sparkles, PlusCircle, Scale, Bell, DollarSign } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { useLanguage } from '../context/LanguageContext';

interface ActiveRequest {
    id: string;
    description: string;
    status: string;
    category: string;
    created_at: string;
    ai_diagnosis: any;
}

export const TenantHomeScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { count: unreadCount } = useUnreadNotificationCount();
    const { t } = useLanguage();
    const [unitInfo, setUnitInfo] = useState<any>(null);
    const [requests, setRequests] = useState<ActiveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [rentAmount, setRentAmount] = useState<number>(0);

    const fetchData = useCallback(async () => {
        if (!user) return;

        // Fetch tenant's unit info
        const { data: unit } = await supabase
            .from('project_units')
            .select('id, unit_number, building:project_buildings(name, address)')
            .eq('tenant_id', user.id)
            .limit(1)
            .single();

        if (unit) {
            setUnitInfo(unit);
            // Extract rent amount
            setRentAmount(Number((unit as any).rent_amount || 0));
        }

        // Fetch active requests
        const { data: reqs } = await supabase
            .from('project_requests')
            .select('id, description, status, category, created_at, ai_diagnosis')
            .eq('tenant_id', user.id)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (reqs) setRequests(reqs);
        setLoading(false);
    }, [user]);

    // Fetch on screen focus (so new requests show immediately after submission)
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    // Realtime subscription for status updates
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('tenant-requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_requests',
                    filter: `tenant_id=eq.${user.id}`,
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchData]);

    const guideItems = [
        { id: 'wifi', icon: Wifi, title: 'CONNECTIVITY', sub: 'WPA3 SECURE', color: '#4A90E2' },
        { id: 'waste', icon: Trash2, title: 'WASTE LOG', sub: 'PICKUP TOMORROW', color: '#6FCF97' },
        { id: 'energy', icon: Zap, title: 'ENERGY PULSE', sub: 'EST. $42.10/MO', color: '#F2C94C' },
        { id: 'water', icon: Droplet, title: 'VITALITY', sub: 'OPTIMAL FLOW', color: '#56CCF2' },
        { id: 'legal', icon: Scale, title: 'LEGAL AI', sub: 'CCQ & TAL READY', color: colors.primary },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_progress': return '#4A90E2';
            case 'pending': return colors.warning;
            default: return colors.textTertiary;
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    };

    const buildingName = unitInfo ? (Array.isArray(unitInfo.building) ? unitInfo.building[0]?.name : unitInfo?.building?.name) || 'MY UNIT' : 'MY UNIT';
    const unitLabel = unitInfo ? `Unit ${unitInfo.unit_number}` : '';
    const headerText = unitInfo ? `HOME HUB: ${unitLabel.toUpperCase()}` : 'HOME HUB';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <Text style={styles.greeting}>{headerText}</Text>
                            <View style={styles.headerRight}>
                                <View style={styles.onlineBadge}>
                                    <View style={styles.onlineDot} />
                                    <Text style={styles.onlineText}>LIVE</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.notifBtn}
                                    onPress={() => navigation.navigate('NotificationCenter')}
                                >
                                    <Bell color={colors.text} size={18} />
                                    {unreadCount > 0 && (
                                        <View style={styles.notifBadge}>
                                            {unreadCount <= 9 && (
                                                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.title}>MY{"\n"}RESIDENCY</Text>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity onPress={() => navigation.navigate('FastRequest')}>
                    <GlassCard style={styles.reportTriggerCard}>
                        <View style={styles.triggerCircle}>
                            <PlusCircle color="white" size={24} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.triggerTitle}>{t('tenantHome.newRequest')}</Text>
                            <Text style={styles.triggerSub}>{t('common.startDiagnostic') || 'Start guided diagnostic protocol'}</Text>
                        </View>
                        <ChevronRight color={colors.textTertiary} size={20} />
                    </GlassCard>
                </TouchableOpacity>

                {/* Pay Rent Card */}
                {rentAmount > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('RentPayment')}>
                        <GlassCard style={styles.rentCard}>
                            <View style={styles.rentIconCircle}>
                                <DollarSign color={colors.textInverse} size={20} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rentTitle}>{t('tenantHome.payRent')}</Text>
                                <Text style={styles.rentAmount}>
                                    ${rentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                            <ChevronRight color={colors.textTertiary} size={20} />
                        </GlassCard>
                    </TouchableOpacity>
                )}

                <Text style={styles.sectionHeader}>LIVING GUIDE</Text>
                <View style={styles.guideGrid}>
                    {guideItems.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.guideCardWrapper}
                            onPress={() => item.id === 'legal' ? navigation.navigate('LegalAdvisor') : navigation.navigate('LivingGuideDetail', { type: item.id })}
                        >
                            <GlassCard style={styles.guideCard}>
                                <View style={[styles.guideIcon, { backgroundColor: `${item.color}15` }]}>
                                    <item.icon color={item.color} size={20} />
                                </View>
                                <Text style={styles.guideLabel}>{item.title}</Text>
                                <Text style={styles.guideValue}>{item.sub}</Text>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.largeSectionTitle}>ACTIVE MAINTENANCE</Text>

                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : requests.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No active maintenance requests.</Text>
                        <Text style={styles.emptySubtext}>Tap "Report an Issue" above to get started.</Text>
                    </GlassCard>
                ) : (
                    requests.map((req) => (
                        <TouchableOpacity
                            key={req.id}
                            onPress={() => navigation.navigate('RequestDetail', { requestId: req.id })}
                        >
                            <GlassCard style={styles.requestCard}>
                                <View style={styles.statusRow}>
                                    <View style={styles.statusBadge}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(req.status) }]} />
                                        <Text style={styles.statusText}>
                                            {req.status.replace(/_/g, ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.timestamp}>{formatDate(req.created_at)}</Text>
                                </View>
                                <Text style={styles.requestTitle} numberOfLines={1}>
                                    {req.description.slice(0, 60)}
                                </Text>
                                {req.ai_diagnosis && (
                                    <View style={styles.aiDiagnosticRow}>
                                        <Sparkles size={12} color={colors.accent} />
                                        <Text style={styles.aiDiagnosticText}>
                                            AI: {req.ai_diagnosis.probable_cause?.slice(0, 35)?.toUpperCase() || 'ANALYZED'}
                                            {req.ai_diagnosis.severity ? ` (${['', 'COSMETIC', 'MINOR', 'MODERATE', 'MAJOR', 'EMERGENCY'][req.ai_diagnosis.severity] || ''})` : ''}
                                        </Text>
                                    </View>
                                )}
                            </GlassCard>
                        </TouchableOpacity>
                    ))
                )}

                <Text style={styles.largeSectionTitle}>UNIT VITALITY</Text>
                <GlassCard style={styles.vitalityCard}>
                    <View style={styles.vitalRow}>
                        <View style={styles.vitalItem}>
                            <Droplet color={colors.primary} size={16} />
                            <Text style={styles.vitalLabel}>WATER PRESSURE</Text>
                            <Text style={styles.vitalValue}>OPTIMAL</Text>
                        </View>
                        <View style={styles.vitalItem}>
                            <Zap color={colors.warning} size={16} />
                            <Text style={styles.vitalLabel}>HVAC LOAD</Text>
                            <Text style={styles.vitalValue}>STABLE</Text>
                        </View>
                    </View>
                </GlassCard>

                <View style={styles.spacer} />
            </ScrollView>

            <View style={styles.aiGlow} />
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
        padding: spacing.l,
        paddingBottom: spacing.m,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    greeting: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 2,
    },
    notifBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    notifBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textInverse,
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
    },
    onlineText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.success,
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
        lineHeight: 40,
        marginTop: spacing.m,
    },
    scrollContent: {
        padding: spacing.l,
        paddingBottom: 100,
    },
    sectionHeader: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 2,
        marginTop: spacing.xl,
        marginBottom: spacing.m,
    },
    // report button
    reportTriggerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
        padding: spacing.l,
    },
    triggerCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    triggerTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    triggerSub: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    // guide grid
    guideGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.m,
    },
    guideCardWrapper: {
        width: '47%',
    },
    guideCard: {
        padding: spacing.m,
    },
    guideIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    guideLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    guideValue: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textTertiary,
        marginTop: 2,
    },
    // requests section
    largeSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
        marginTop: spacing.xl,
        marginBottom: spacing.m,
    },
    requestCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    timestamp: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    requestTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    aiDiagnosticRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    aiDiagnosticText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 0.3,
    },
    // empty state
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySubtext: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 4,
    },
    // vitality
    vitalityCard: {
        padding: spacing.l,
    },
    vitalRow: {
        flexDirection: 'row',
        gap: spacing.xl,
    },
    vitalItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    vitalLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    vitalValue: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
    },
    spacer: {
        height: 40,
    },
    rentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.l,
        marginTop: spacing.m,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    rentIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    rentTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
    },
    rentAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginTop: 2,
    },
    aiGlow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(15, 76, 58, 0.02)',
        pointerEvents: 'none',
    },
});
