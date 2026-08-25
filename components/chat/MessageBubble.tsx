import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl } from '../../lib/api';
import { ChatTheme, CHAT_THEMES } from './ChatThemeModal';

export interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  isRead?: boolean;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  theme?: ChatTheme;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MessageBubble({
  content,
  isOwn,
  timestamp,
  isRead = false,
  messageType = 'text',
  mediaUrl,
  fileName,
  fileSize,
  duration = 0,
  theme = CHAT_THEMES[0],
}: MessageBubbleProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);

  const resolveUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
      return url;
    }
    return `${getApiUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullMediaUrl = resolveUrl(mediaUrl);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleAudio = async () => {
    if (!fullMediaUrl) return;
    try {
      await Linking.openURL(fullMediaUrl);
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  };

  const handleOpenFile = async () => {
    if (!fullMediaUrl) return;
    try {
      await Linking.openURL(fullMediaUrl);
    } catch (err) {
      console.warn('Open file error:', err);
    }
  };

  const renderBubbleContent = () => {
    // 1. IMAGE
    if (messageType === 'image' && fullMediaUrl) {
      return (
        <View style={styles.mediaContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setFullscreenImage(fullMediaUrl)}
          >
            <Image
              source={{ uri: fullMediaUrl }}
              style={styles.imageThumb}
              resizeMode="cover"
            />
          </TouchableOpacity>
          {content.length > 0 && (
            <Text style={[styles.captionText, isOwn ? styles.captionOwn : styles.captionOther]}>
              {content}
            </Text>
          )}
        </View>
      );
    }

    // 2. VIDEO
    if (messageType === 'video' && fullMediaUrl) {
      return (
        <View style={styles.mediaContainer}>
          <TouchableOpacity
            style={styles.videoThumbContainer}
            activeOpacity={0.85}
            onPress={handleOpenFile}
          >
            <View style={styles.videoOverlay}>
              <View style={styles.playIconCircle}>
                <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.videoLabel}>{fileName || 'Video'}</Text>
            </View>
          </TouchableOpacity>
          {content.length > 0 && (
            <Text style={[styles.captionText, isOwn ? styles.captionOwn : styles.captionOther]}>
              {content}
            </Text>
          )}
        </View>
      );
    }

    // 3. AUDIO / VOICE NOTE
    if (messageType === 'audio' && fullMediaUrl) {
      return (
        <View style={styles.audioRow}>
          <TouchableOpacity
            onPress={handleToggleAudio}
            style={[styles.audioPlayBtn, isOwn ? styles.audioPlayBtnOwn : styles.audioPlayBtnOther]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlayingAudio ? 'pause' : 'play'}
              size={18}
              color={isOwn ? '#0F766E' : '#FFFFFF'}
              style={!isPlayingAudio ? { marginLeft: 2 } : {}}
            />
          </TouchableOpacity>

          <View style={styles.audioTrackContainer}>
            <View style={styles.audioWaveform}>
              {[4, 8, 14, 10, 18, 12, 6, 16, 10, 14, 8, 4, 12, 16, 8].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.audioBar,
                    { height: h },
                    isOwn
                      ? { backgroundColor: i / 15 <= audioPosition ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }
                      : { backgroundColor: i / 15 <= audioPosition ? '#0F766E' : '#CBD5E1' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.audioDuration, isOwn ? styles.audioDurationOwn : styles.audioDurationOther]}>
              {duration ? formatDuration(duration) : 'Voice note'}
            </Text>
          </View>
        </View>
      );
    }

    // 4. DOCUMENT / FILE
    if (messageType === 'file' && fullMediaUrl) {
      const ext = (fileName?.split('.').pop() || 'FILE').toUpperCase();
      return (
        <TouchableOpacity
          style={styles.fileRow}
          onPress={handleOpenFile}
          activeOpacity={0.8}
        >
          <View style={[styles.fileIconBox, isOwn ? styles.fileIconBoxOwn : styles.fileIconBoxOther]}>
            <Text style={styles.fileExtText}>{ext}</Text>
          </View>
          <View style={styles.fileMeta}>
            <Text style={[styles.fileNameText, isOwn ? styles.fileNameOwn : styles.fileNameOther]} numberOfLines={1}>
              {fileName || 'Document'}
            </Text>
            <Text style={[styles.fileSizeText, isOwn ? styles.fileSizeOwn : styles.fileSizeOther]}>
              {fileSize ? formatFileSize(fileSize) : 'Tap to open'}
            </Text>
          </View>
          <Ionicons
            name="download-outline"
            size={18}
            color={isOwn ? '#FFFFFF' : '#0F766E'}
          />
        </TouchableOpacity>
      );
    }

    // 5. REGULAR TEXT
    return (
      <Text style={isOwn ? styles.textOwn : [styles.textOther, { color: theme.bubblePartnerText }]}>
        {content}
      </Text>
    );
  };

  return (
    <>
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
          {isOwn ? (
            <LinearGradient
              colors={theme.bubbleOwn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleOwn}
            >
              {renderBubbleContent()}
              <View style={styles.metaRowOwn}>
                <Text style={styles.timestampOwn}>{timestamp}</Text>
                <Ionicons
                  name={isRead ? 'checkmark-done' : 'checkmark'}
                  size={13}
                  color={isRead ? '#99F6E4' : 'rgba(255, 255, 255, 0.75)'}
                  style={{ marginLeft: 3 }}
                />
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.bubbleOther,
                {
                  backgroundColor: theme.bubblePartner,
                  borderColor: theme.bubblePartnerBorder,
                },
              ]}
            >
              {renderBubbleContent()}
              <View style={styles.metaRowOther}>
                <Text style={styles.timestampOther}>{timestamp}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Lightbox Modal for Fullscreen Image */}
      {fullscreenImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setFullscreenImage(null)}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 14,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  wrapper: {
    maxWidth: '82%',
  },
  wrapperOwn: {
    alignItems: 'flex-end',
  },
  wrapperOther: {
    alignItems: 'flex-start',
  },
  bubbleOwn: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    shadowColor: '#0F766E',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 2,
  },
  bubbleOther: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  textOwn: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  textOther: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    lineHeight: 21,
  },
  metaRowOwn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  metaRowOther: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timestampOther: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 10.5,
    color: '#94A3B8',
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageThumb: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  captionText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    marginTop: 6,
  },
  captionOwn: {
    color: '#FFFFFF',
  },
  captionOther: {
    color: '#0F172A',
  },
  videoThumbContainer: {
    width: 220,
    height: 130,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    alignItems: 'center',
    gap: 6,
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 118, 110, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
    gap: 10,
    paddingVertical: 2,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayBtnOwn: {
    backgroundColor: '#FFFFFF',
  },
  audioPlayBtnOther: {
    backgroundColor: '#0F766E',
  },
  audioTrackContainer: {
    flex: 1,
    gap: 4,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioDuration: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
  },
  audioDurationOwn: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  audioDurationOther: {
    color: '#64748B',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    gap: 10,
    paddingVertical: 4,
  },
  fileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconBoxOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fileIconBoxOther: {
    backgroundColor: '#CCFBF1',
  },
  fileExtText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    color: '#0F766E',
  },
  fileMeta: {
    flex: 1,
  },
  fileNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
  },
  fileNameOwn: {
    color: '#FFFFFF',
  },
  fileNameOther: {
    color: '#0F172A',
  },
  fileSizeText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  fileSizeOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  fileSizeOther: {
    color: '#64748B',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 99,
  },
  lightboxImg: {
    width: SCREEN_WIDTH - 20,
    height: '80%',
  },
});
