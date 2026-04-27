import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform, TextInput } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft,
    Search,
    Phone,
    MessageSquare,
    ShieldCheck,
    Star,
    Navigation as NavIcon,
    Award,
    Plus,
    UserPlus,
    CheckCircle2,
    Upload
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

const VENDOR_CATEGORIES = [
    { id: 'all', label: 'All', icon: '🔍' },
    { id: 'plumber', label: 'Plumber', icon: '🔧' },
    { id: 'electrician', label: 'Electrician', icon: '⚡' },
    { id: 'hvac', label: 'HVAC', icon: '❄️' },
    { id: 'locksmith', label: 'Locksmith', icon: '🔐' },
    { id: 'general', label: 'General', icon: '🛠️' },
    { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { id: 'roofing', label: 'Roofing', icon: '🏠' },
];

export const VendorDiscoveryScreen = () => {
    const navigation = useNavigation<any>();
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
    const [location, setLocation] = useState<any>(null);
    const [bondedVendorIds, setBondedVendorIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    const checkBondedVendors = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('project_landlord_vendors')
            .select('vendor_id')
            .eq('landlord_id', user.id);

        if (data) {
            setBondedVendorIds(new Set(data.map(v => v.vendor_id)));
        }
    };

    const handleToggleNetwork = async (vendor: any) => {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsSaving(false);
            return;
        }

        const isBonded = bondedVendorIds.has(vendor.id);

        if (isBonded) {
            // Remove
            const { error } = await supabase
                .from('project_landlord_vendors')
                .delete()
                .match({ landlord_id: user.id, vendor_id: vendor.id });

            if (!error) {
                const newIds = new Set(bondedVendorIds);
                newIds.delete(vendor.id);
                setBondedVendorIds(newIds);
            }
        } else {
            // Add
            const { error } = await supabase
                .from('project_landlord_vendors')
                .insert({ landlord_id: user.id, vendor_id: vendor.id });

            if (!error) {
                const newIds = new Set(bondedVendorIds);
                newIds.add(vendor.id);
                setBondedVendorIds(newIds);
            }
        }
        setIsSaving(false);
    };

    const [allVendors, setAllVendors] = useState<any[]>([]);

    const filteredVendors = allVendors.filter(v => {
        // Text search filter
        const matchesSearch = searchText === '' ||
            v.name.toLowerCase().includes(searchText.toLowerCase()) ||
            v.specialty.toLowerCase().includes(searchText.toLowerCase());

        // Category filter
        const matchesCategory = selectedCategory === 'all' ||
            v.specialty.toLowerCase().includes(selectedCategory.toLowerCase());

        // Verified filter
        const matchesVerified = !showVerifiedOnly || v.verified;

        return matchesSearch && matchesCategory && matchesVerified;
    });

    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('project_vendors')
                .select('*')
                .not('latitude', 'is', null);

            if (error) throw error;
            const mapped = (data || []).map(v => ({
                id: v.id,
                name: v.company_name || v.contact_name || 'Unknown',
                specialty: v.specialty || 'General',
                rating: v.rating || 4.5,
                reviews: v.reviews_count || 0,
                verified: v.verified || false,
                coords: { latitude: Number(v.latitude), longitude: Number(v.longitude) },
                phone: v.phone || '',
            }));
            setAllVendors(mapped);
        } catch (err) {
            console.error('Error fetching vendors:', err);
        }
    };

    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location.coords);
        })();
        checkBondedVendors();
        fetchVendors();
    }, []);

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const handleMessage = (number: string) => {
        Linking.openURL(`sms:${number}`);
    };

    const handleDirections = (coords: any) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${coords.latitude},${coords.longitude}`;
        const label = 'Vendor Location';
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        if (url) Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                } : {
                    latitude: 45.521,
                    longitude: -73.585,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                showsUserLocation={true}
                customMapStyle={mapStyle}
            >
                {filteredVendors.map((v) => (
                    <Marker
                        key={v.id}
                        coordinate={v.coords}
                        onPress={() => setSelectedVendor(v)}
                    >
                        <View style={[styles.marker, v.verified && styles.verifiedMarker]}>
                            <ShieldCheck color={colors.textInverse} size={14} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <View style={styles.searchBar}>
                        <Search color={colors.textTertiary} size={16} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find Plumbers, Electricians..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.importBtn}
                        onPress={() => navigation.navigate('ContactPicker')}
                    >
                        <Upload color={colors.primary} size={16} />
                    </TouchableOpacity>
                </View>

                {/* Category Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryContainer}
                    style={styles.categoryScroll}
                >
                    {VENDOR_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.id && styles.categoryChipActive
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text style={[
                                styles.categoryLabel,
                                selectedCategory === cat.id && styles.categoryLabelActive
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            styles.verifiedChip,
                            showVerifiedOnly && styles.verifiedChipActive
                        ]}
                        onPress={() => setShowVerifiedOnly(!showVerifiedOnly)}
                    >
                        <ShieldCheck
                            color={showVerifiedOnly ? colors.textInverse : colors.primary}
                            size={14}
                        />
                        <Text style={[
                            styles.categoryLabel,
                            showVerifiedOnly && styles.categoryLabelActive
                        ]}>
                            Verified
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.bottomSheet}>
                    {selectedVendor ? (
                        <GlassCard style={styles.vendorCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.vendorInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.vendorName}>{selectedVendor.name}</Text>
                                        {selectedVendor.verified && <ShieldCheck color={colors.primary} size={14} />}
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.specialtyText}>{selectedVendor.specialty}</Text>
                                        <View style={styles.dot} />
                                        <View style={styles.ratingRow}>
                                            <Star color={colors.warning} size={12} fill={colors.warning} />
                                            <Text style={styles.ratingText}>{selectedVendor.rating} ({selectedVendor.reviews})</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedVendor(null)}>
                                    <Text style={styles.closeBtn}>CLOSE</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.actionGrid}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall(selectedVendor.phone)}>
                                    <Phone color={colors.primary} size={20} />
                                    <Text style={styles.actionLabel}>CALL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessage(selectedVendor.phone)}>
                                    <MessageSquare color={colors.primary} size={20} />
                                    <Text style={styles.actionLabel}>SMS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.primaryAction]}
                                    onPress={() => handleDirections(selectedVendor.coords)}
                                >
                                    <NavIcon color={colors.textInverse} size={20} />
                                    <Text style={[styles.actionLabel, { color: colors.textInverse }]}>NAVIGATE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        bondedVendorIds.has(selectedVendor.id) && styles.savedAction
                                    ]}
                                    onPress={() => handleToggleNetwork(selectedVendor)}
                                    disabled={isSaving}
                                >
                                    {bondedVendorIds.has(selectedVendor.id) ? (
                                        <CheckCircle2 color={colors.primary} size={20} />
                                    ) : (
                                        <UserPlus color={colors.primary} size={20} />
                                    )}
                                    <Text style={styles.actionLabel}>
                                        {bondedVendorIds.has(selectedVendor.id) ? 'SAVED' : 'ADD PRO'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    ) : (
                        <View>
                            {/* Recommendations */}
                            {filteredVendors.length > 0 && (
                                <>
                                    <Text style={styles.recsTitle}>RECOMMENDED FOR YOU</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                        {filteredVendors
                                            .sort((a: any, b: any) => {
                                                // Score: rating * 20 + (verified ? 15 : 0) + (bonded ? 10 : 0)
                                                const scoreA = (a.rating || 0) * 20 + (a.verified ? 15 : 0) + (bondedVendorIds.has(a.id) ? 10 : 0);
                                                const scoreB = (b.rating || 0) * 20 + (b.verified ? 15 : 0) + (bondedVendorIds.has(b.id) ? 10 : 0);
                                                return scoreB - scoreA;
                                            })
                                            .slice(0, 5)
                                            .map((v: any) => (
                                                <TouchableOpacity
                                                    key={v.id}
                                                    style={styles.recCard}
                                                    onPress={() => setSelectedVendor(v)}
                                                >
                                                    <View style={styles.recHeader}>
                                                        <Text style={styles.recName} numberOfLines={1}>{v.name}</Text>
                                                        {v.verified && <ShieldCheck color={colors.primary} size={10} />}
                                                    </View>
                                                    <Text style={styles.recSpecialty}>{v.specialty}</Text>
                                                    <View style={styles.recRating}>
                                                        <Star color={colors.warning} size={10} fill={colors.warning} />
                                                        <Text style={styles.recRatingText}>{v.rating}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                    </ScrollView>
                                </>
                            )}
                            <GlassCard style={styles.hintCard}>
                                <Text style={styles.hintText}>Select a marker or browse recommendations above.</Text>
                            </GlassCard>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

// Subtle light map style
const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#e9e9e9" }]
    }
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
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
    searchBar: {
        flex: 1,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        height: '100%',
    },
    categoryScroll: {
        marginTop: spacing.s,
        maxHeight: 44,
    },
    categoryContainer: {
        paddingHorizontal: spacing.l,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryIcon: {
        fontSize: 14,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    categoryLabelActive: {
        color: colors.textInverse,
    },
    verifiedChip: {
        borderColor: colors.primary,
    },
    verifiedChipActive: {
        backgroundColor: colors.primary,
    },
    marker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.textTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    verifiedMarker: {
        backgroundColor: colors.primary,
    },
    bottomSheet: {
        padding: spacing.l,
    },
    vendorCard: {
        padding: spacing.l,
        backgroundColor: colors.surface,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    vendorInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vendorName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    specialtyText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textTertiary,
        marginHorizontal: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    closeBtn: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
    },
    actionGrid: {
        flexDirection: 'row',
        marginTop: spacing.xl,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 60,
        borderRadius: 12,
        backgroundColor: `${colors.primary}05`,
        borderWidth: 1,
        borderColor: `${colors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    primaryAction: {
        backgroundColor: colors.primary,
        flex: 1.5,
    },
    actionLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    savedAction: {
        backgroundColor: `${colors.primary}20`,
        borderColor: colors.primary,
    },
    hintCard: {
        padding: spacing.l,
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    hintText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '600',
        textAlign: 'center',
    },
    importBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recsTitle: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginBottom: 8,
    },
    recCard: {
        width: 140,
        padding: 12,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
    },
    recHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    recSpecialty: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 4,
    },
    recRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    recRatingText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text,
    },
});
