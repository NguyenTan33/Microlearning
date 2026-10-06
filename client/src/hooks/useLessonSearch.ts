import { useState, useMemo, useEffect } from 'react';
import type { Subject, Lesson } from '../types/catalog.types';

/**
 * Hàm loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu và chữ hoa/thường
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export interface UseLessonSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedTerm: string;
  filteredSubjects: Subject[];
  matchingLessonCount: number;
  matchedSubjectIds: Set<number>;
  clearSearch: () => void;
}

export function useLessonSearch(subjects: Subject[], debounceMs = 250): UseLessonSearchResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { filteredSubjects, matchingLessonCount, matchedSubjectIds } = useMemo(() => {
    const normalizedQuery = removeVietnameseDiacritics(debouncedTerm);

    if (!normalizedQuery) {
      return {
        filteredSubjects: subjects,
        matchingLessonCount: 0,
        matchedSubjectIds: new Set<number>(),
      };
    }

    let totalMatched = 0;
    const matchedSubjectSet = new Set<number>();

    const filtered: Subject[] = subjects.reduce<Subject[]>((acc, subject) => {
      const subjectTitleNormalized = removeVietnameseDiacritics(subject.title);
      const isSubjectMatched = subjectTitleNormalized.includes(normalizedQuery);

      const matchedLessons = (subject.lessons || []).filter((lesson: Lesson) => {
        const titleMatch = removeVietnameseDiacritics(lesson.title).includes(normalizedQuery);
        const descMatch = lesson.description
          ? removeVietnameseDiacritics(lesson.description).includes(normalizedQuery)
          : false;
        return titleMatch || descMatch;
      });

      if (isSubjectMatched || matchedLessons.length > 0) {
        matchedSubjectSet.add(subject.id);
        totalMatched += matchedLessons.length;
        acc.push({
          ...subject,
          lessons: isSubjectMatched ? subject.lessons : matchedLessons,
        });
      }

      return acc;
    }, []);

    return {
      filteredSubjects: filtered,
      matchingLessonCount: totalMatched,
      matchedSubjectIds: matchedSubjectSet,
    };
  }, [subjects, debouncedTerm]);

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    filteredSubjects,
    matchingLessonCount,
    matchedSubjectIds,
    clearSearch,
  };
}
