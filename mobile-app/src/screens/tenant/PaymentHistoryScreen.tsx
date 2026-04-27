import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import { ChevronLeft, DollarSign, CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PaymentRecord {
    id: string;
    amount_due: number;
    status: string;
    billing_period: string;
    created_at: string;
    payment_method?: string;
}

export const PaymentHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('project_utility_ledger')
                .select('*')
                .eq('user_id', user.id)
                .eq('utility_type', 'rent')
                .order('created_at', { ascending: false });

            setPayments((data || []) as PaymentRecord[]);
        } catch (err) {
            console.error('fetchHistory error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'settled': return <CheckCircle2 color={colors.success} size={18} />;
            case 'pending': return <Clock color={colors.warning} size={18} />;
            default: return <XCircle color={colors.error} size={18} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'settled': return colors.success;
            case 'pending': return colors.warning;
            default: return colors.error;
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.brand}>PAYMENT LEDGER</Text>
                            <Text style={styles.headerTitle}>Rent History</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : payments.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <DollarSign color={colors.textTertiary} size={32} />
                        <Text style={styles.emptyText}>No rent payments recorded yet.</Text>
                    </GlassCard>
                ) : (
                    payments.map((payment) => (
                        <GlassCard key={payment.id} style={styles.paymentCard}>
                            <View style={styles.paymentRow}>
                                <View style={styles.iconBox}>
                                    {getStatusIcon(payment.status)}
                                </View>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentPeriod}>
                                        {payment.billing_period || '—'}
                                    </Text>
                                    <Text style={styles.paymentDate}>{formatDate(payment.created_at)}</Text>
                                </View>
                                <View style={styles.paymentRight}>
                                    <Text style={styles.paymentAmount}>
                                        ${Number(payment.amount_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </Text>
                                    <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(payment.status)}15` }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                                            {payment.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </GlassCard>
                    ))
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        gap: 12,
        marginTop: spacing.s,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    scrollContent: {
        padding: spacing.l,
    },
    emptyCard: {
        padding: spacing.xxl,
        alignItems: 'center',
        gap: spacing.m,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    paymentCard: {
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 76, 58, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentPeriod: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    paymentDate: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    paymentRight: {
        alignItems: 'flex-end',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
