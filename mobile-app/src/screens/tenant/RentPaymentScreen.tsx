import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft, CreditCard, DollarSign, CheckCircle2,
    Building2, Calendar, Clock
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface RentInfo {
    unitId: string;
    unitNumber: string;
    buildingName: string;
    buildingAddress: string;
    rentAmount: number;
    dueDate: string;
    hasPendingPayment: boolean;
}

export const RentPaymentScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [rentInfo, setRentInfo] = useState<RentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('bank');

    useEffect(() => {
        fetchRentInfo();
    }, []);

    const fetchRentInfo = async () => {
        if (!user) return;
        try {
            // Get unit info
            const { data: unit } = await supabase
                .from('project_units')
                .select(`
                    id, unit_number, rent_amount, lease_end,
                    building:project_buildings(name, address)
                `)
                .eq('tenant_id', user.id)
                .limit(1)
                .single();

            if (!unit) {
                setIsLoading(false);
                return;
            }

            const bld = Array.isArray(unit.building) ? unit.building[0] : unit.building;

            // Check for pending rent payment this month
            const now = new Date();
            const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const { data: pendingPayment } = await supabase
                .from('project_utility_ledger')
                .select('id')
                .eq('user_id', user.id)
                .eq('utility_type', 'rent')
                .eq('billing_period', currentPeriod)
                .in('status', ['settled', 'pending'])
                .limit(1);

            setRentInfo({
                unitId: unit.id,
                unitNumber: unit.unit_number,
                buildingName: bld?.name || '',
                buildingAddress: bld?.address || '',
                rentAmount: Number(unit.rent_amount || 0),
                dueDate: `${currentPeriod}-01`,
                hasPendingPayment: (pendingPayment || []).length > 0,
            });
        } catch (err) {
            console.error('fetchRentInfo error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!user || !rentInfo) return;
        if (rentInfo.hasPendingPayment) {
            Alert.alert('Already Paid', 'You have already submitted a payment for this month.');
            return;
        }

        setIsProcessing(true);
        try {
            const now = new Date();
            const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Create ledger entry
            const { error } = await supabase
                .from('project_utility_ledger')
                .insert({
                    user_id: user.id,
                    utility_type: 'rent',
                    amount_due: rentInfo.rentAmount,
                    status: 'settled',
                    billing_period: currentPeriod,
                    payment_method: paymentMethod,
                });

            if (error) throw error;

            // Navigate to confirmation
            navigation.navigate('PaymentConfirmation', {
                amount: rentInfo.rentAmount,
                method: paymentMethod,
                date: now.toISOString(),
                buildingName: rentInfo.buildingName,
                unitNumber: rentInfo.unitNumber,
            });
        } catch (err: any) {
            Alert.alert('Payment Failed', err.message || 'Something went wrong.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!rentInfo || rentInfo.rentAmount === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <ChevronLeft color={colors.text} size={24} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>RENT PAYMENT</Text>
                        </View>
                    </SafeAreaView>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
                    <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
                        No rent information available for your unit.
                    </Text>
                </View>
            </View>
        );
    }

    const now = new Date();
    const dueDay = 1;
    const isOverdue = now.getDate() > dueDay + 5;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.brand}>SECURE PAYMENT</Text>
                            <Text style={styles.headerTitle}>Rent Payment</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Unit Info */}
                <GlassCard style={styles.unitCard}>
                    <Building2 color={colors.primary} size={20} />
                    <View style={styles.unitInfo}>
                        <Text style={styles.unitName}>
                            {rentInfo.buildingName || rentInfo.buildingAddress}
                        </Text>
                        <Text style={styles.unitSub}>Unit {rentInfo.unitNumber}</Text>
                    </View>
                </GlassCard>

                {/* Amount Due */}
                <GlassCard style={styles.amountCard}>
                    <Text style={styles.amountLabel}>AMOUNT DUE</Text>
                    <Text style={styles.amountValue}>
                        ${rentInfo.rentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.dueRow}>
                        <Calendar color={colors.textTertiary} size={12} />
                        <Text style={[styles.dueText, isOverdue && { color: colors.error }]}>
                            Due {now.toLocaleDateString('en-US', { month: 'long' })} 1st
                            {isOverdue ? ' • OVERDUE' : ''}
                        </Text>
                    </View>
                    {rentInfo.hasPendingPayment && (
                        <View style={styles.paidBadge}>
                            <CheckCircle2 color={colors.success} size={16} />
                            <Text style={styles.paidText}>PAID THIS MONTH</Text>
                        </View>
                    )}
                </GlassCard>

                {/* Payment Method */}
                <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
                {[
                    { key: 'bank', label: 'Bank Transfer', sub: 'Direct debit' },
                    { key: 'card', label: 'Credit / Debit Card', sub: 'Instant processing' },
                ].map((method) => (
                    <TouchableOpacity key={method.key} onPress={() => setPaymentMethod(method.key)}>
                        <GlassCard style={[styles.methodCard, paymentMethod === method.key && styles.methodCardActive]}>
                            <View style={styles.radioOuter}>
                                {paymentMethod === method.key && <View style={styles.radioInner} />}
                            </View>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodLabel}>{method.label}</Text>
                                <Text style={styles.methodSub}>{method.sub}</Text>
                            </View>
                            <CreditCard color={colors.textTertiary} size={20} />
                        </GlassCard>
                    </TouchableOpacity>
                ))}

                {/* Pay Button */}
                <TouchableOpacity
                    style={[styles.payBtn, (isProcessing || rentInfo.hasPendingPayment) && styles.payBtnDisabled]}
                    onPress={handlePayment}
                    disabled={isProcessing || rentInfo.hasPendingPayment}
                >
                    {isProcessing ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <>
                            <DollarSign color={colors.textInverse} size={20} />
                            <Text style={styles.payBtnText}>
                                {rentInfo.hasPendingPayment ? 'ALREADY PAID' : `PAY $${rentInfo.rentAmount.toLocaleString()}`}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Payment History Link */}
                <TouchableOpacity
                    style={styles.historyLink}
                    onPress={() => navigation.navigate('PaymentHistory')}
                >
                    <Clock color={colors.primary} size={16} />
                    <Text style={styles.historyLinkText}>VIEW PAYMENT HISTORY</Text>
                </TouchableOpacity>

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
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    unitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.l,
        gap: spacing.m,
    },
    unitInfo: {
        flex: 1,
    },
    unitName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    unitSub: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },
    amountCard: {
        padding: spacing.xl,
        alignItems: 'center',
        marginTop: spacing.m,
    },
    amountLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 2,
    },
    amountValue: {
        fontSize: 42,
        fontWeight: '800',
        color: colors.text,
        marginTop: spacing.s,
    },
    dueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.m,
    },
    dueText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.m,
        backgroundColor: 'rgba(74, 187, 101, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    paidText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.success,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        gap: spacing.m,
        marginBottom: spacing.s,
        borderWidth: 1,
        borderColor: colors.border,
    },
    methodCardActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    methodInfo: {
        flex: 1,
    },
    methodLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    methodSub: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 12,
        marginTop: spacing.xl,
    },
    payBtnDisabled: {
        opacity: 0.5,
    },
    payBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
    historyLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: spacing.l,
        paddingVertical: spacing.m,
    },
    historyLinkText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
    },
});
