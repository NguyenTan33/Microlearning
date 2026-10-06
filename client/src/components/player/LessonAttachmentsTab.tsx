import React, { useState, useEffect } from 'react';
import type { LessonAttachment } from '../../types/catalog.types';
import { attachmentApi } from '../../services/attachmentApi';

interface LessonAttachmentsTabProps {
  lessonId: number;
  canManage?: boolean;
}

export const LessonAttachmentsTab: React.FC<LessonAttachmentsTabProps> = ({
  lessonId,
  canManage = false,
}) => {
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAttachments() {
      setIsLoading(true);
      try {
        const list = await attachmentApi.getAttachments(lessonId);
        if (isMounted) {
          setAttachments(list);
        }
      } catch (err) {
        console.error('Lỗi khi tải tài liệu đính kèm:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadAttachments();
    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Kích thước tệp không được vượt quá 50MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      setUploadError('Chỉ hỗ trợ tệp định dạng PDF (.pdf) hoặc Word (.docx, .doc).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await attachmentApi.uploadAttachment(lessonId, file);
      setAttachments((prev) => [...prev, uploaded]);
      e.target.value = '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải tệp lên thất bại.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tệp tài liệu này?')) return;
    try {
      await attachmentApi.deleteAttachment(lessonId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      if (previewPdfUrl && attachments.find((a) => a.id === attachmentId)?.fileUrl === previewPdfUrl) {
        setPreviewPdfUrl(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa tài liệu.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Thanh tác vụ tải lên cho Giảng viên/Admin */}
      {canManage && (
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Đính kèm tài liệu bài giảng
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ Word (.docx, .doc) và PDF (.pdf), dung lượng tối đa 50MB.
            </p>
          </div>

          <label className="relative inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg cursor-pointer transition shadow-sm active:scale-95">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{isUploading ? 'Đang tải lên...' : 'Tải tài liệu lên'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:rose-300 text-xs">
          {uploadError}
        </div>
      )}

      {/* Trạng thái tải */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm">Đang tải danh sách tài liệu...</span>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <svg className="w-10 h-10 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Chưa có tài liệu đính kèm cho bài học này
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Các tệp bài giảng Word hoặc slide PDF sẽ hiển thị tại đây khi được thêm vào.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((file) => {
            const isPdf = file.fileType === 'PDF' || file.fileName.toLowerCase().endsWith('.pdf');
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isPdf
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}
                  >
                    {isPdf ? (
                      <span className="font-bold text-xs uppercase">PDF</span>
                    ) : (
                      <span className="font-bold text-xs uppercase">DOC</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" title={file.originalFileName}>
                      {file.originalFileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatFileSize(file.fileSizeBytes)} • {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Xem trực tiếp PDF */}
                  {isPdf && (
                    <button
                      type="button"
                      onClick={() => setPreviewPdfUrl(previewPdfUrl === file.fileUrl ? null : file.fileUrl)}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
                      title={previewPdfUrl === file.fileUrl ? 'Đóng xem trước' : 'Xem trước PDF'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}

                  {/* Nút Tải về */}
                  <a
                    href={file.fileUrl}
                    download={file.originalFileName}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
                    title="Tải về máy"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>

                  {/* Nút Xóa (Dành cho Giảng viên/Admin) */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition"
                      title="Xóa tài liệu"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cửa sổ xem trước PDF nhúng trực quan */}
      {previewPdfUrl && (
        <div className="mt-4 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
          <div className="px-4 py-2.5 bg-slate-800 flex items-center justify-between text-white text-xs font-medium">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              </svg>
              Trình xem tài liệu PDF trực tuyến
            </span>
            <button
              type="button"
              onClick={() => setPreviewPdfUrl(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-700 transition"
            >
              Đóng xem trước ✕
            </button>
          </div>
          <iframe
            src={previewPdfUrl}
            title="PDF Preview"
            className="w-full h-[550px] border-none bg-slate-800"
          />
        </div>
      )}
    </div>
  );
};
