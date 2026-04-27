import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Sparkles, ShieldCheck, MessageSquare, Send, Clock, CheckCircle2, Truck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../hooks/useMessages';

interface RequestData {
    id: string;
    description: string;
    category: string;
    status: string;
    urgency_level: string;
    created_at: string;
    ai_diagnosis: any;
    images: string[];
    building_id: string;
    building: { name: string; address: string } | null;
    unit: { unit_number: string } | null;
}

export const RequestDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user, persona } = useAuth();
    const requestId = route.params?.requestId;

    const [request, setRequest] = useState<RequestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    const { messages, sendMessage } = useMessages(requestId || '');

    // Fetch request data
    useEffect(() => {
        if (!requestId) {
            setLoading(false);
            return;
        }

        const fetchRequest = async () => {
            const { data, error } = await supabase
                .from('project_requests')
                .select(`
                    id,
                    description,
                    category,
                    status,
                    urgency_level,
                    created_at,
                    ai_diagnosis,
                    images,
                    building_id,
                    building:project_buildings!building_id(name, address),
                    unit:project_units!unit_id(unit_number)
                `)
                .eq('id', requestId)
                .single();

            if (!error && data) {
                setRequest({
                    ...data,
                    building: Array.isArray(data.building) ? data.building[0] : data.building,
                    unit: Array.isArray(data.unit) ? data.unit[0] : data.unit,
                } as RequestData);
            }
            setLoading(false);
        };

        fetchRequest();

        // Subscribe to realtime status updates
        const channel = supabase
            .channel(`request:${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'project_requests',
                    filter: `id=eq.${requestId}`,
                },
                (payload) => {
                    setRequest(prev => prev ? { ...prev, ...payload.new } as RequestData : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [requestId]);

    const handleSend = async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim();
        setChatInput('');
        await sendMessage(text);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return colors.success;
            case 'in_progress': return '#4A90E2';
            case 'pending': return colors.warning;
            default: return colors.textTertiary;
        }
    };

    const getSeverityLabel = (severity: number) => {
        const labels = ['', 'Cosmetic', 'Minor', 'Moderate', 'Major', 'Emergency'];
        return labels[severity] || 'Unknown';
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!request) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.textSecondary }}>Request not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>GO BACK</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const diag = request.ai_diagnosis;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.titleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.idTag}>
                                    CASE #{request.id.slice(0, 8).toUpperCase()} • {request.category}
                                </Text>
                                <Text style={styles.title} numberOfLines={1}>
                                    {request.description.slice(0, 40).toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                                <Text style={styles.statusBadgeText}>{request.status.replace(/_/g, ' ').toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {/* Location Info */}
                    {request.building && (
                        <GlassCard style={styles.locationCard}>
                            <Text style={styles.locationLabel}>LOCATION</Text>
                            <Text style={styles.locationValue}>
                                {request.building.name || request.building.address}
                                {request.unit ? ` • Unit ${request.unit.unit_number}` : ''}
                            </Text>
                        </GlassCard>
                    )}

                    {/* Timeline */}
                    <Text style={styles.sectionTitle}>CASE TIMELINE</Text>

                    <View style={styles.timelineRow}>
                        <View style={styles.axisContainer}>
                            <View style={styles.axisLine} />
                            <View style={[styles.axisDot, { backgroundColor: colors.success }]} />
                            {diag && <View style={[styles.axisDot, { top: 120, backgroundColor: colors.accent }]} />}
                        </View>

                        <View style={styles.timelineContent}>
                            {/* Event 1: Reported */}
                            <GlassCard style={styles.timelineCard}>
                                <Text style={styles.eventTime}>
                                    {formatDate(request.created_at)} • {formatTime(request.created_at)}
                                </Text>
                                <View style={styles.eventHeader}>
                                    <Text style={styles.eventTitle}>ISSUE REPORTED</Text>
                                    <View style={styles.notaryBadge}>
                                        <ShieldCheck color={colors.success} size={10} />
                                        <Text style={styles.notaryText}>TIMESTAMPED</Text>
                                    </View>
                                </View>
                                <Text style={styles.eventDescription}>
                                    {request.description}
                                </Text>
                                {request.images && request.images.length > 0 && (
                                    <Text style={styles.photoCount}>
                                        📷 {request.images.length} photo(s) attached
                                    </Text>
                                )}
                            </GlassCard>

                            {/* Event 2: AI Diagnosis */}
                            {diag && (
                                <GlassCard style={styles.timelineCard}>
                                    <Text style={styles.eventTime}>
                                        {formatDate(request.created_at)} • AI ANALYSIS
                                    </Text>
                                    <View style={styles.eventHeader}>
                                        <Sparkles color={colors.accent} size={14} />
                                        <Text style={[styles.eventTitle, { color: colors.accent, marginLeft: 6 }]}>
                                            AI DIAGNOSTIC
                                        </Text>
                                    </View>
                                    <Text style={styles.eventDescription}>
                                        {diag.probable_cause}
                                    </Text>
                                    <View style={styles.diagGrid}>
                                        <View style={styles.diagItem}>
                                            <Text style={styles.diagLabel}>SEVERITY</Text>
                                            <Text style={styles.diagValue}>
                                                {getSeverityLabel(diag.severity)} ({diag.severity}/5)
                                            </Text>
                                        </View>
                                        <View style={styles.diagItem}>
                                            <Text style={styles.diagLabel}>EST. COST</Text>
                                            <Text style={styles.diagValue}>
                                                ${diag.estimated_cost_min}–${diag.estimated_cost_max}
                                            </Text>
                                        </View>
                                    </View>
                                    {diag.legal_obligation && (
                                        <View style={styles.legalRow}>
                                            <ShieldCheck color={colors.primary} size={12} />
                                            <Text style={styles.legalRowText}>Legal obligation (CCQ Art. 1854)</Text>
                                        </View>
                                    )}
                                </GlassCard>
                            )}
                        </View>
                    </View>

                    {/* Dispatch Button for Landlords */}
                    {persona === 'landlord' && request.status !== 'resolved' && (
                        <TouchableOpacity
                            style={styles.dispatchBtn}
                            onPress={() => navigation.navigate('DispatchVendor', {
                                requestId: request.id,
                                buildingId: request.building_id
                            })}
                        >
                            <Truck color={colors.textInverse} size={20} />
                            <Text style={styles.dispatchBtnText}>DISPATCH VENDOR</Text>
                        </TouchableOpacity>
                    )}

                    {/* Messages Section */}
                    <Text style={styles.sectionTitle}>SECURE COMMUNICATION</Text>

                    {messages.length === 0 ? (
                        <GlassCard style={styles.emptyChatCard}>
                            <MessageSquare color={colors.textTertiary} size={24} />
                            <Text style={styles.emptyChatText}>
                                No messages yet. Start communication below.
                            </Text>
                        </GlassCard>
                    ) : (
                        messages.map((msg) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.chatBubbleRow,
                                    msg.sender_id === user?.id ? styles.chatRight : styles.chatLeft,
                                ]}
                            >
                                <View style={[
                                    styles.chatBubble,
                                    msg.sender_id === user?.id ? styles.chatBubbleUser : styles.chatBubbleOther,
                                ]}>
                                    {msg.sender_id !== user?.id && (
                                        <Text style={styles.chatSenderName}>{msg.sender_name}</Text>
                                    )}
                                    <Text style={[
                                        styles.chatText,
                                        msg.sender_id === user?.id && { color: 'white' },
                                    ]}>
                                        {msg.text}
                                    </Text>
                                    <Text style={[
                                        styles.chatTime,
                                        msg.sender_id === user?.id && { color: 'rgba(255,255,255,0.6)' },
                                    ]}>
                                        {formatTime(msg.created_at)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Chat Input */}
                <View style={styles.chatArea}>
                    <SafeAreaView edges={['bottom']}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Secure message..."
                                placeholderTextColor={colors.textTertiary}
                                value={chatInput}
                                onChangeText={setChatInput}
                                multiline
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                                <Send color="white" size={16} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </KeyboardAvoidingView>
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
        padding: spacing.m,
    },
    backButton: {
        marginBottom: spacing.s,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    idTag: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 0.5,
    },
    content: {
        padding: spacing.l,
        paddingBottom: 20,
    },
    locationCard: {
        padding: spacing.m,
        marginBottom: spacing.l,
    },
    locationLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.textTertiary,
        letterSpacing: 1.5,
    },
    locationValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 2,
        marginBottom: spacing.m,
        marginTop: spacing.l,
    },
    // Timeline
    timelineRow: {
        flexDirection: 'row',
    },
    axisContainer: {
        width: 20,
        alignItems: 'center',
        position: 'relative',
    },
    axisLine: {
        width: 2,
        backgroundColor: colors.border,
        position: 'absolute',
        top: 10,
        bottom: 10,
    },
    axisDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        position: 'absolute',
        top: 20,
    },
    timelineContent: {
        flex: 1,
        marginLeft: spacing.m,
        gap: spacing.l,
    },
    timelineCard: {
        padding: spacing.m,
    },
    eventTime: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textTertiary,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    eventTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    notaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    notaryText: {
        fontSize: 7,
        fontWeight: '800',
        color: colors.success,
        letterSpacing: 0.5,
    },
    eventDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    photoCount: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 8,
    },
    diagGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginTop: spacing.m,
    },
    diagItem: {
        flex: 1,
        backgroundColor: 'rgba(15, 76, 58, 0.04)',
        padding: spacing.s,
        borderRadius: 8,
    },
    diagLabel: {
        fontSize: 7,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: 2,
    },
    diagValue: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text,
    },
    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.m,
    },
    legalRowText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    // Chat
    emptyChatCard: {
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.m,
    },
    emptyChatText: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    chatBubbleRow: {
        marginBottom: spacing.s,
        width: '100%',
    },
    chatRight: {
        alignItems: 'flex-end',
    },
    chatLeft: {
        alignItems: 'flex-start',
    },
    chatBubble: {
        maxWidth: '80%',
        padding: spacing.m,
        borderRadius: 14,
    },
    chatBubbleUser: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    chatBubbleOther: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chatSenderName: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    chatText: {
        fontSize: 14,
        lineHeight: 19,
        color: colors.text,
    },
    chatTime: {
        fontSize: 9,
        color: colors.textTertiary,
        marginTop: 4,
        textAlign: 'right',
    },
    chatArea: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: spacing.m,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F2F0',
        borderRadius: 24,
        paddingLeft: spacing.l,
        paddingRight: 6,
        paddingVertical: 6,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        maxHeight: 80,
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dispatchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: 12,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    dispatchBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
});
