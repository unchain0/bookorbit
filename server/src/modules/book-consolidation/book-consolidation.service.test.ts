import { describe, expect, it, vi } from 'vitest';

import { BookConsolidationService } from './book-consolidation.service';
import type { BookFacts } from './field-picks';

const tx = { name: 'tx' };

function facts(bookId: number): BookFacts {
  return { bookId, metadata: null, lockedFields: new Set(), authors: [], narrators: [], series: [], hasAudio: false };
}

describe('BookConsolidationService', () => {
  it('retires duplicate file state and records its tombstone in the merge transaction', async () => {
    const events: string[] = [];
    const logicalFileTombstone = {
      loserFileId: 20,
      survivorFileId: 10,
      libraryFolderId: 11,
      absolutePath: '/books/Author/Copy/book.pdf',
      sha256: 'a'.repeat(64),
    };
    const repository = {
      lockBooks: vi.fn().mockResolvedValue([
        { id: 1, libraryId: 1, libraryFolderId: 11, folderPath: '/books/Author/Kept', status: 'present', addedAt: null, primaryFileId: 10 },
        { id: 2, libraryId: 1, libraryFolderId: 11, folderPath: '/books/Author/Copy', status: 'present', addedAt: null, primaryFileId: 20 },
      ]),
      loadFacts: vi.fn((_tx: unknown, id: number) => Promise.resolve(facts(id))),
      readSnapshot: vi.fn().mockResolvedValue({}),
      deleteSidecarRows: vi.fn().mockResolvedValue(undefined),
      updateFileRows: vi.fn().mockResolvedValue(undefined),
      reparentRemainingFiles: vi.fn(() => void events.push('reparent')),
      lockFiles: vi.fn().mockResolvedValue([
        { id: 10, bookId: 1, sizeBytes: 100, absolutePath: '/books/Author/Kept/book.pdf', role: 'content' },
        { id: 20, bookId: 1, sizeBytes: 100, absolutePath: logicalFileTombstone.absolutePath, role: 'content' },
      ]),
      retireFileRow: vi.fn(() => void events.push('retire-file')),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
      uniteGenres: vi.fn().mockResolvedValue(undefined),
      uniteTags: vi.fn().mockResolvedValue(undefined),
      fillBookLevelRows: vi.fn().mockResolvedValue(undefined),
      releaseConflictingRemoteReadIds: vi.fn().mockResolvedValue(undefined),
      sourceReaderPage: vi.fn().mockResolvedValue([]),
      moveAttempts: vi.fn().mockResolvedValue(undefined),
      moveReaderRows: vi.fn().mockResolvedValue(undefined),
      mergeNotes: vi.fn().mockResolvedValue(undefined),
      reconcileRatings: vi.fn().mockResolvedValue([]),
      reconcileAudiobookProgress: vi.fn().mockResolvedValue(undefined),
      hasKoboEntitlements: vi.fn().mockResolvedValue(false),
      moveKoboEntitlements: vi.fn().mockResolvedValue([]),
      reconcileReadingServices: vi.fn().mockResolvedValue(undefined),
      moveSystemRows: vi.fn().mockResolvedValue(undefined),
      reconcileLinks: vi.fn().mockResolvedValue(undefined),
      rewriteUnkeyedReferences: vi.fn().mockResolvedValue(undefined),
      recordAlias: vi.fn(() => void events.push('alias')),
      recordFileTombstones: vi.fn((_tx: unknown, sourceId: number, tombstones: unknown[]) => {
        events.push('tombstones');
        expect(sourceId).toBe(2);
        expect(tombstones).toEqual([logicalFileTombstone]);
      }),
      deleteBook: vi.fn(() => void events.push('delete-book')),
      finishTarget: vi.fn().mockResolvedValue(undefined),
    };
    const consolidation = new BookConsolidationService(repository as never);

    await consolidation.consolidate(tx as never, {
      targetBookId: 1,
      sourceBookId: 2,
      destination: { libraryFolderId: 11, folderPath: '/books/Author/Kept', libraryId: 1 },
      fieldSources: new Map(),
      logicalFileTombstones: [logicalFileTombstone],
      mergedByUserId: 7,
    });

    expect(events).toEqual(['reparent', 'retire-file', 'alias', 'tombstones', 'delete-book']);
    expect(repository.retireFileRow).toHaveBeenCalledWith(tx, 20, 10);
  });
});
