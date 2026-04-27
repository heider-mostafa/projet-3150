import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export const PaymentConfirmationScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const { amount, method, date, buildingName, unitNumber } = route.params || {};

    const formattedDate = date
        ? new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';
    const formattedTime = date
        ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <CheckCircle2 color={colors.textInverse} size={48} />
                        </View>
                    </View>

                    <Text style={styles.title}>Payment Confirmed</Text>
                    <Text style={styles.subtitle}>Your rent has been processed successfully.</Text>

                    <View style={styles.receiptCard}>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>AMOUNT</Text>
                            <Text style={styles.receiptValue}>
                                ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>PROPERTY</Text>
                            <Text style={styles.receiptValue}>
                                {buildingName || ''}{unitNumber ? ` • Unit ${unitNumber}` : ''}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>METHOD</Text>
                            <Text style={styles.receiptValue}>
                                {method === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>DATE</Text>
                            <Text style={styles.receiptValue}>{formattedDate}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>TIME</Text>
                            <Text style={styles.receiptValue}>{formattedTime}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>STATUS</Text>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>SETTLED</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => navigation.popToTop()}
                    >
                        <ArrowLeft color={colors.textInverse} size={18} />
                        <Text style={styles.doneBtnText}>BACK TO HOME</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.s,
        marginBottom: spacing.xl,
    },
    receiptCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.l,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.s,
    },
    receiptLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    receiptValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    statusBadge: {
        backgroundColor: 'rgba(74, 187, 101, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.success,
        letterSpacing: 1,
    },
    doneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 12,
        marginTop: spacing.xl,
    },
    doneBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
});
