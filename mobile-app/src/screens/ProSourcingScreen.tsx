import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info, MapPin, ShieldCheck, Phone, Star } from 'lucide-react-native';

export const ProSourcingScreen = () => {
    const navigation = useNavigation<any>();

    const pros = [
        {
            id: 'p1',
            name: 'PLOMBERIE PEEL',
            distance: '0.8 KM',
            rating: 4.9,
            reviews: 124,
            specialty: 'High-rise residential leaks',
            photo: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&q=80&w=200&h=200',
            price: '$$',
        },
        {
            id: 'p2',
            name: 'MÉNAGE-TOIT INC.',
            distance: '2.1 KM',
            rating: 4.7,
            reviews: 89,
            specialty: 'HVAC & Drain blockage',
            photo: 'https://images.unsplash.com/photo-1581578731518-da1b988fbdc2?auto=format&fit=crop&q=80&w=200&h=200',
            price: '$',
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>EXPERT DISCOVERY</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </View>

            <View style={styles.mapSimulation}>
                <View style={styles.mapGrid}>
                    <View style={[styles.mapMarker, { top: 100, left: 150 }]}>
                        <ShieldCheck color="white" size={10} />
                    </View>
                    <View style={[styles.mapMarker, { top: 180, left: 80 }]} />
                    <View style={[styles.mapMarker, { top: 50, left: 220 }]} />
                    <View style={styles.userMarker}>
                        <View style={styles.userCore} />
                    </View>
                </View>
                <GlassCard style={styles.mapOverlay}>
                    <Info color={colors.primary} size={14} />
                    <Text style={styles.mapOverlayText}>3 VERIFIED PROS NEAR PEEL ST.</Text>
                </GlassCard>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>CURATED MATCHES</Text>
                    <Text style={styles.sectionSub}>Filtered by distance & TAL compliance</Text>
                </View>

                {pros.map((pro) => (
                    <GlassCard key={pro.id} style={styles.proCard}>
                        <View style={styles.proHeader}>
                            <Image source={{ uri: pro.photo }} style={styles.proImage} />
                            <View style={styles.proInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.proName}>{pro.name}</Text>
                                    <ShieldCheck color={colors.primary} size={14} />
                                </View>
                                <View style={styles.ratingRow}>
                                    <Star color="#FFB800" fill="#FFB800" size={10} />
                                    <Text style={styles.ratingText}>{pro.rating}</Text>
                                    <Text style={styles.reviewText}>({pro.reviews} reviews)</Text>
                                </View>
                            </View>
                            <View style={styles.priceTag}>
                                <Text style={styles.priceText}>{pro.price}</Text>
                            </View>
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <MapPin color={colors.textTertiary} size={10} />
                                <Text style={styles.detailText}>{pro.distance}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <ShieldCheck color={colors.textTertiary} size={10} />
                                <Text style={styles.detailText}>Loi 25 Compliant</Text>
                            </View>
                        </View>

                        <Text style={styles.proSpecialty}>{pro.specialty}</Text>

                        <View style={styles.actionRow}>
                            <Button
                                title="ASSIGN EXCLUSIVE"
                                onPress={() => navigation.goBack()}
                                style={styles.assignButton}
                            />
                            <TouchableOpacity style={styles.contactIcon}>
                                <Phone color={colors.primary} size={18} />
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                ))}
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
        padding: spacing.m,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 2,
    },
    mapSimulation: {
        height: 260,
        backgroundColor: '#F0F2F0',
        position: 'relative',
    },
    mapGrid: {
        ...StyleSheet.absoluteFillObject,
    },
    mapMarker: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarker: {
        position: 'absolute',
        top: 130,
        left: 170,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(74, 144, 226, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userCore: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4A90E2',
        borderWidth: 2,
        borderColor: 'white',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 12,
        left: spacing.l,
        right: spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    mapOverlayText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        color: colors.text,
    },
    content: {
        padding: spacing.l,
    },
    sectionHeader: {
        marginBottom: spacing.l,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    sectionSub: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    proCard: {
        marginBottom: spacing.l,
        padding: spacing.m,
    },
    proHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    proImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#EEE',
        marginRight: spacing.m,
    },
    proInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    proName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text,
    },
    reviewText: {
        fontSize: 9,
        color: colors.textTertiary,
    },
    priceTag: {
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    priceText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: spacing.m,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textTertiary,
    },
    proSpecialty: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: spacing.m,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    assignButton: {
        flex: 1,
        height: 44,
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
