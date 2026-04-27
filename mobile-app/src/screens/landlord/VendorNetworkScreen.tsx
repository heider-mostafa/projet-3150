import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ShieldCheck,
    Search,
    MessageSquare,
    Phone,
    Star,
    Award,
    ArrowUpRight,
    Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

export const VendorNetworkScreen = () => {
    const navigation = useNavigation<any>();
    const [allVendors, setAllVendors] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');

    // Derive display name from DB columns (company_name or contact_name)
    const getDisplayName = (vendor: any): string =>
        vendor.company_name || vendor.contact_name || vendor.name || 'Unknown Vendor';

    const filteredVendors = allVendors.filter(v => {
        if (!searchText.trim()) return true;
        const q = searchText.toLowerCase();
        return (
            getDisplayName(v).toLowerCase().includes(q) ||
            (v.specialty || '').toLowerCase().includes(q)
        );
    });

    React.useEffect(() => {
        const fetchVendors = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('project_landlord_vendors')
                .select(`
                    vendor:project_vendors (
                        id,
                        company_name,
                        contact_name,
                        name,
                        specialty,
                        rating,
                        reviews_count,
                        verified,
                        is_verified,
                        phone,
                        phone_number,
                        photo_url,
                        jobs_completed
                    )
                `)
                .eq('landlord_id', user.id);

            if (data) {
                setAllVendors(data.map((item: any) => item.vendor).filter(Boolean));
            }
        };
        fetchVendors();
    }, []);

    const handleCall = (vendor: any) => {
        const phone = vendor.phone || vendor.phone_number;
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    const handleSMS = (vendor: any) => {
        const phone = vendor.phone || vendor.phone_number;
        if (phone) Linking.openURL(`sms:${phone}`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <Text style={styles.brand}>MANAGER PRO NETWORK</Text>
                        <Text style={styles.title}>Vendor Registry</Text>
                    </View>
                    <View style={styles.searchBar}>
                        <Search color={colors.textTertiary} size={16} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search professionals..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Protocol Header */}
                <View style={styles.protocolBanner}>
                    <Award color={colors.primary} size={24} />
                    <View style={styles.protocolText}>
                        <Text style={styles.protocolTitle}>Vetted Sourcing Protocol</Text>
                        <Text style={styles.protocolSub}>All experts are identity-verified and legally bonded for residential access.</Text>
                    </View>
                </View>

                {/* Vendor List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>ACTIVE PARTNERSHIPS</Text>
                    <Text style={styles.sectionCount}>{filteredVendors.length}</Text>
                </View>

                {filteredVendors.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Users color={colors.textTertiary} size={32} />
                        <Text style={styles.emptyTitle}>
                            {allVendors.length === 0 ? 'No vendors yet' : 'No results found'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {allVendors.length === 0
                                ? 'Discover and add professionals from the map below.'
                                : `No vendor matches "${searchText}"`}
                        </Text>
                    </GlassCard>
                ) : (
                    <View style={styles.vendorList}>
                        {filteredVendors.map((vendor) => {
                            const displayName = getDisplayName(vendor);
                            const isVerified = vendor.verified || vendor.is_verified;
                            const rating = vendor.rating;
                            const jobs = vendor.jobs_completed || 0;
                            const photo = vendor.photo_url;

                            return (
                                <GlassCard key={vendor.id} style={styles.vendorCard}>
                                    <View style={styles.vendorTop}>
                                        {photo ? (
                                            <Image source={{ uri: photo }} style={styles.vendorPhoto} />
                                        ) : (
                                            <View style={styles.vendorAvatarPlaceholder}>
                                                <Text style={styles.vendorAvatarInitial}>
                                                    {displayName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.vendorInfo}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.vendorName} numberOfLines={1}>{displayName}</Text>
                                                {isVerified && <ShieldCheck color={colors.primary} size={14} />}
                                            </View>
                                            <Text style={styles.vendorSpecialty}>{vendor.specialty || 'General'}</Text>
                                            <View style={styles.ratingRow}>
                                                <Star color={colors.warning} size={10} fill={colors.warning} />
                                                <Text style={styles.ratingText}>
                                                    {rating ? rating.toFixed(1) : 'New'} • {jobs} job{jobs !== 1 ? 's' : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.vendorActions}>
                                        <TouchableOpacity
                                            style={styles.actionIconButton}
                                            onPress={() => handleSMS(vendor)}
                                        >
                                            <MessageSquare color={colors.primary} size={16} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionIconButton}
                                            onPress={() => handleCall(vendor)}
                                        >
                                            <Phone color={colors.primary} size={16} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.dispatchButton}
                                            onPress={() => navigation.navigate('VendorDiscovery')}
                                        >
                                            <Text style={styles.dispatchText}>DISPATCH PRE-AUTH</Text>
                                            <ArrowUpRight color={colors.primary} size={12} />
                                        </TouchableOpacity>
                                    </View>
                                </GlassCard>
                            );
                        })}
                    </View>
                )}

                <TouchableOpacity style={styles.discoverBtn} onPress={() => navigation.navigate('VendorDiscovery')}>
                    <Search color={colors.textTertiary} size={18} />
                    <Text style={styles.discoverText}>DISCOVER NEW LOCAL EXPERTS</Text>
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        marginHorizontal: spacing.l,
        marginTop: spacing.l,
        paddingHorizontal: spacing.m,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    scrollContent: {
        padding: spacing.l,
    },
    protocolBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 76, 58, 0.08)',
        padding: spacing.l,
        borderRadius: 12,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(15, 76, 58, 0.2)',
        gap: 16,
    },
    protocolText: {
        flex: 1,
    },
    protocolTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    protocolSub: {
        fontSize: 10,
        color: colors.textSecondary,
        lineHeight: 14,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
    },
    sectionCount: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        backgroundColor: 'rgba(15,76,58,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    emptyCard: {
        padding: spacing.xxl,
        alignItems: 'center',
        gap: spacing.m,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.s,
    },
    emptySub: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    vendorList: {
        gap: spacing.m,
        marginBottom: spacing.xl,
    },
    vendorCard: {
        padding: spacing.m,
        backgroundColor: colors.surface,
    },
    vendorTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vendorPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: spacing.m,
    },
    vendorAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(15,76,58,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(15,76,58,0.2)',
    },
    vendorAvatarInitial: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },
    vendorInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vendorName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    vendorSpecialty: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    ratingText: {
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    vendorActions: {
        flexDirection: 'row',
        marginTop: spacing.m,
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 10,
    },
    actionIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15,76,58,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(15,76,58,0.15)',
    },
    dispatchButton: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 76, 58, 0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(15, 76, 58, 0.2)',
    },
    dispatchText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    discoverBtn: {
        width: '100%',
        height: 54,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    discoverText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    safePadding: {
        height: 100,
    },
});
