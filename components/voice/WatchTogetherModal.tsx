import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURED_VIDEOS = [
  { id: '1', title: 'Lofi Hip Hop Radio 🎧 - Beats to Relax/Study to', duration: '24/7 LIVE', views: '45K Watching' },
  { id: '2', title: 'Stand-Up Comedy Highlights 😂 2026', duration: '14:20', views: '1.2M Views' },
  { id: '3', title: 'Best Viral TikToks & Funny Reels Compilation', duration: '10:05', views: '890K Views' },
  { id: '4', title: 'Top 50 Pop & Chill Hits Playlist 🎵', duration: '1:45:00', views: '2.5M Views' },
];

interface WatchTogetherModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVideo: (video: { title: string; url?: string }) => void;
  isHost?: boolean;
}

export function WatchTogetherModal({
  visible,
  onClose,
  onSelectVideo,
  isHost = false,
}: WatchTogetherModalProps) {
  const [customUrl, setCustomUrl] = useState('');

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="tv-outline" size={22} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.sheetTitle}>Watch Together (YouTube)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentBox}>
            {/* Custom URL Input */}
            <Text style={styles.sectionTitle}>Paste YouTube Video Link</Text>
            <View style={styles.inputBox}>
              <Ionicons name="logo-youtube" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <TextInput
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
              {customUrl.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    onSelectVideo({ title: 'YouTube Stream', url: customUrl });
                    onClose();
                  }}
                  style={styles.playInputBtn}
                >
                  <Text style={styles.playInputBtnText}>Play</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Featured Videos */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Popular Party Videos</Text>
            <View style={styles.videoList}>
              {FEATURED_VIDEOS.map((vid) => (
                <TouchableOpacity
                  key={vid.id}
                  onPress={() => {
                    onSelectVideo(vid);
                    onClose();
                  }}
                  activeOpacity={0.8}
                  style={styles.videoCard}
                >
                  <View style={styles.videoThumbBox}>
                    <Ionicons name="play-circle" size={32} color="#EF4444" />
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{vid.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.videoMetaBox}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {vid.title}
                    </Text>
                    <Text style={styles.videoViews}>{vid.views}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    maxHeight: '80%',
    paddingBottom: 28,
    shadowColor: '#0F766E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBox: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F766E',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
  },
  playInputBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  playInputBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  videoList: {
    gap: 10,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  videoThumbBox: {
    width: 80,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  videoMetaBox: {
    flex: 1,
  },
  videoTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
  },
  videoViews: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#64748B',
  },
});
