import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownLeft,
    Download,
    DollarSign,
    AlertCircle
} from 'lucide-react-native';
import { useTreasuryData, LedgerFilter } from '../../hooks/useTreasuryData';
import { useLanguage } from '../../context/LanguageContext';

export const TreasuryTerminalScreen = () => {
    const treasury = useTreasuryData();
    const { t } = useLanguage();

    const FILTERS: { key: LedgerFilter; label: string }[] = [
        { key: 'all', label: t('treasury.filterAll') },
        { key: 'settled', label: t('treasury.filterSettled') },
        { key: 'pending', label: t('treasury.filterPending') },
        { key: 'unpaid', label: t('treasury.filterUnpaid') },
    ];

    const handleExport = async () => {
        try {
            const csv = treasury.exportCSV();
            await Share.share({
                message: csv,
                title: 'Treasury Export',
            });
        } catch (err: any) {
            Alert.alert('Export Error', err.message || 'Could not export data');
        }
    };

    const formatCurrency = (val: number) => {
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
        return `$${val.toFixed(2)}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'settled': return colors.success;
            case 'pending': return colors.warning;
            case 'unpaid': case 'overdue': return colors.error;
            default: return colors.textTertiary;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <Text style={styles.brand}>TREASURY TERMINAL</Text>
                        <Text style={styles.title}>Liquidity Flow</Text>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Liquidity Overview */}
                <GlassCard style={styles.liquidityCard}>
                    <View style={styles.liqTop}>
                        <View>
                            <Text style={styles.liqLabel}>NET LIQUIDITY (30D)</Text>
                            <Text style={styles.liqVal}>
                                ${treasury.netLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={[styles.trendPill, treasury.trendPercent < 0 && styles.trendPillNeg]}>
                            {treasury.trendPercent >= 0 ? (
                                <TrendingUp color={colors.primary} size={14} />
                            ) : (
                                <TrendingDown color={colors.error} size={14} />
                            )}
                            <Text style={[styles.trendText, treasury.trendPercent < 0 && { color: colors.error }]}>
                                {treasury.trendPercent >= 0 ? '+' : ''}{treasury.trendPercent}%
                            </Text>
                        </View>
                    </View>
                    <View style={styles.liqStats}>
                        <View style={styles.liqStatItem}>
                            <ArrowUpRight color={colors.primary} size={14} />
                            <Text style={styles.liqStatText}>{formatCurrency(treasury.monthlyIncome)} IN</Text>
                        </View>
                        <View style={styles.liqStatDivider} />
                        <View style={styles.liqStatItem}>
                            <ArrowDownLeft color={colors.error} size={14} />
                            <Text style={styles.liqStatText}>{formatCurrency(treasury.monthlyExpenses)} OUT</Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Pending / Overdue Summary */}
                {(treasury.pendingTotal > 0 || treasury.overdueTotal > 0) && (
                    <View style={styles.alertRow}>
                        {treasury.pendingTotal > 0 && (
                            <GlassCard style={[styles.alertCard, { borderLeftColor: colors.warning }]}>
                                <Text style={styles.alertLabel}>PENDING</Text>
                                <Text style={styles.alertVal}>${treasury.pendingTotal.toLocaleString()}</Text>
                            </GlassCard>
                        )}
                        {treasury.overdueTotal > 0 && (
                            <GlassCard style={[styles.alertCard, { borderLeftColor: colors.error }]}>
                                <AlertCircle color={colors.error} size={14} />
                                <Text style={[styles.alertLabel, { color: colors.error }]}>OVERDUE</Text>
                                <Text style={styles.alertVal}>${treasury.overdueTotal.toLocaleString()}</Text>
                            </GlassCard>
                        )}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
                        <Download color={colors.text} size={18} />
                        <Text style={styles.actionText}>Export CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={treasury.refresh}>
                        <TrendingUp color={colors.text} size={18} />
                        <Text style={styles.actionText}>Refresh</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterRow}>
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterChip, treasury.filter === f.key && styles.filterChipActive]}
                            onPress={() => treasury.setFilter(f.key)}
                        >
                            <Text style={[styles.filterChipText, treasury.filter === f.key && styles.filterChipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Ledger */}
                <Text style={styles.sectionTitle}>REAL-TIME SETTLEMENT LOG</Text>

                {treasury.isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : treasury.entries.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>Zero financial entries found in this cycle.</Text>
                    </GlassCard>
                ) : (
                    <View style={styles.ledgerList}>
                        {treasury.entries.map((entry) => (
                            <GlassCard key={entry.id} style={styles.ledgerItem}>
                                <View style={styles.ledgerIconBox}>
                                    <DollarSign color={colors.primary} size={16} />
                                </View>
                                <View style={styles.ledgerInfo}>
                                    <View style={styles.ledgerTop}>
                                        <Text style={styles.ledgerTitle}>{entry.utility_type.toUpperCase()}</Text>
                                        <Text style={styles.ledgerAmount}>${Number(entry.amount_due).toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.ledgerBottom}>
                                        <Text style={styles.ledgerSub}>{entry.billing_period || '—'}</Text>
                                        <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(entry.status)}15` }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                                                {entry.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </GlassCard>
                        ))}
                    </View>
                )}

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
        paddingBottom: spacing.l,
    },
    headerContent: {
        paddingHorizontal: spacing.l,
        marginTop: spacing.s,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    scrollContent: {
        padding: spacing.l,
    },
    liquidityCard: {
        padding: spacing.l,
        backgroundColor: colors.surface,
        marginBottom: spacing.l,
    },
    liqTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    liqLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
    },
    liqVal: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
        marginTop: 8,
    },
    trendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    trendPillNeg: {
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
    },
    trendText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    liqStats: {
        flexDirection: 'row',
        marginTop: spacing.l,
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.l,
    },
    liqStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liqStatDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border,
    },
    liqStatText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    // Alert cards
    alertRow: {
        flexDirection: 'row',
        gap: spacing.s,
        marginBottom: spacing.l,
    },
    alertCard: {
        flex: 1,
        padding: spacing.m,
        borderLeftWidth: 3,
        gap: 4,
    },
    alertLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.warning,
        letterSpacing: 1,
    },
    alertVal: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    // Filter chips
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.m,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    filterChipTextActive: {
        color: colors.textInverse,
    },
    // Actions
    actionGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.l,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginBottom: spacing.m,
    },
    ledgerList: {
        gap: spacing.s,
    },
    ledgerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        gap: spacing.m,
    },
    ledgerIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 76, 58, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ledgerInfo: {
        flex: 1,
    },
    ledgerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ledgerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    ledgerAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    ledgerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    ledgerSub: {
        fontSize: 10,
        color: colors.textTertiary,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    safePadding: {
        height: 60,
    },
});
