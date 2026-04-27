import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { ChevronLeft, Send, Scale, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { legalAdvisorChat, ChatMessage as GeminiMessage } from '../lib/gemini';

interface Message {
    id: string;
    text: string;
    sender: 'ai' | 'user';
    cite?: string;
}

export const LegalAdvisorScreen = () => {
    const navigation = useNavigation();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Bonjour! I am your Legal AI assistant. I have indexed the Civil Code of Quebec (CCQ) and TAL precedents. How can I help with your tenancy question today?",
            sender: 'ai'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Build history for Gemini context (skip the initial greeting)
    const buildHistory = (): GeminiMessage[] => {
        return messages.slice(1).map(m => ({
            role: m.sender === 'user' ? 'user' as const : 'model' as const,
            text: m.text,
        }));
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = { id: Date.now().toString(), text: input.trim(), sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        const userText = input.trim();
        setInput('');
        setIsTyping(true);

        try {
            const history = buildHistory();
            const response = await legalAdvisorChat(userText, history);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.reply,
                sender: 'ai',
                cite: response.citation || undefined,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I couldn't process your question. Please try again.",
                sender: 'ai',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Scale color={colors.primary} size={16} />
                            <Text style={styles.headerTitle}>LEGAL ADVISOR</Text>
                        </View>
                        <View style={{ width: 24 }} />
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
                    contentContainerStyle={styles.scrollContent}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    <View style={styles.aiBrief}>
                        <Sparkles color={colors.primary} size={20} />
                        <Text style={styles.briefText}>
                            Powered by Gemini AI • CCQ & TAL indexed • This is information, not legal advice.
                        </Text>
                    </View>

                    {messages.map((msg) => (
                        <View key={msg.id} style={[
                            styles.messageWrapper,
                            msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper
                        ]}>
                            <View style={[
                                styles.messageBubble,
                                msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    msg.sender === 'user' ? styles.userText : styles.aiText
                                ]}>{msg.text}</Text>
                                {msg.cite && (
                                    <View style={styles.citationBox}>
                                        <Text style={styles.citationText}>📜 {msg.cite}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageWrapper, styles.aiWrapper]}>
                            <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.typingText}>Analyzing legal references...</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.inputArea}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask about rent, repairs, or leases..."
                            placeholderTextColor={colors.textTertiary}
                            value={input}
                            onChangeText={setInput}
                            multiline
                            editable={!isTyping}
                        />
                        <TouchableOpacity
                            style={[styles.sendIcon, isTyping && styles.sendIconDisabled]}
                            onPress={handleSend}
                            disabled={isTyping}
                        >
                            <Send color="white" size={18} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9F8',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 2,
    },
    scrollContent: {
        padding: spacing.l,
        paddingBottom: 20,
    },
    aiBrief: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.xl,
    },
    briefText: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: '600',
        flex: 1,
    },
    messageWrapper: {
        marginBottom: spacing.l,
        width: '100%',
    },
    userWrapper: {
        alignItems: 'flex-end',
    },
    aiWrapper: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: spacing.m,
        borderRadius: 16,
    },
    userBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typingText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: 'white',
    },
    aiText: {
        color: colors.text,
    },
    citationBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    citationText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    inputArea: {
        padding: spacing.m,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        maxHeight: 100,
    },
    sendIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendIconDisabled: {
        opacity: 0.5,
    },
});
