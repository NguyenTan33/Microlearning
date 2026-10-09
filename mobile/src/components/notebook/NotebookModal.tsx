import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, BookOpen, Plus, Trash2, Clock, Save } from 'lucide-react-native';
import { notebookService, LessonNote } from '../../services/notebookService';
import { formatTime } from '../../utils/formatters';

interface NotebookModalProps {
  visible: boolean;
  lessonId: number;
  currentPlaybackSeconds?: number;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  visible,
  lessonId,
  currentPlaybackSeconds = 0,
  onClose,
}) => {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const data = await notebookService.getNotesForLesson(lessonId);
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotes();
    }
  }, [visible, lessonId]);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung ghi chú.');
      return;
    }

    setSaving(true);
    try {
      await notebookService.saveNote(lessonId, noteContent.trim(), Math.round(currentPlaybackSeconds));
      setNoteContent('');
      await loadNotes();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu ghi chú.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await notebookService.deleteNote(id);
    await loadNotes();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <BookOpen color="#38BDF8" size={20} />
              <Text style={styles.modalTitle}>Sổ Ghi Chú Bài Học</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {/* New Note Form */}
          <View style={styles.formSection}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập nội dung ghi chú nhanh..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                value={noteContent}
                onChangeText={setNoteContent}
              />
            </View>

            <View style={styles.formActionRow}>
              <View style={styles.timestampBadge}>
                <Clock color="#F59E0B" size={13} />
                <Text style={styles.timestampText}>
                  Mốc {formatTime(currentPlaybackSeconds)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveNote}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Save color="#FFFFFF" size={15} />
                    <Text style={styles.saveBtnText}>Lưu Ghi Chú</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes List */}
          {loading ? (
            <ActivityIndicator color="#38BDF8" style={{ marginVertical: 20 }} />
          ) : notes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có ghi chú nào</Text>
              <Text style={styles.emptyDesc}>Ghi lại các ý chính trong bài học để tiện ôn tập sau.</Text>
            </View>
          ) : (
            <ScrollView style={styles.notesList}>
              {notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteTimeBadge}>
                      <Clock color="#38BDF8" size={12} />
                      <Text style={styles.noteTimeText}>
                        {formatTime(note.timestampSeconds || 0)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                      <Trash2 color="#F43F5E" size={15} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.noteText}>{note.content}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#0E1428',
    borderRadius: 12,
  },
  formSection: {
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  textInput: {
    color: '#F8FAFC',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  timestampText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyDesc: {
    color: '#64748B',
    fontSize: 12,
  },
  notesList: {
    maxHeight: 280,
  },
  noteCard: {
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteTimeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  noteText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
});
