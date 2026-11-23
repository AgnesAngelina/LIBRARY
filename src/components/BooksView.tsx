import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { BookRecord, ReturnStatus } from '../types/library';

interface BooksViewProps {
  books: BookRecord[];
  updatingTxId: number | null;
  onAddBook: () => void;
  onEditBook: (book: BookRecord) => void;
  onDeleteBook: (book: BookRecord) => void;
  onIssueBook: (bookId: number) => void;
  onUpdateReturnStatus: (
    transactionId: number,
    nextStatus: ReturnStatus
  ) => Promise<void>;
}

type AvailabilityFilter = 'all' | 'available' | 'borrowed';

export function BooksView({
  books,
  updatingTxId,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onIssueBook,
  onUpdateReturnStatus,
}: BooksViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('all');

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (filter === 'available' && !b.is_available) return false;
      if (filter === 'borrowed' && b.is_available) return false;
      if (!q) return true;
      return (
        b.book_name.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        String(b.book_id).includes(q) ||
        (b.current_borrower_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [books, query, filter]);

  const availableCount = books.filter((b) => b.is_available).length;
  const borrowedCount = books.length - availableCount;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Book Details & Shelf Availability
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage library titles, authors, and live checkout status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, book ID..."
              aria-label="Search books"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by availability"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({books.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === 'available'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('borrowed')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === 'borrowed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Borrowed ({borrowedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onAddBook}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No matching books found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {books.length === 0
              ? 'Add the first book to populate the library catalog.'
              : 'Try clearing your search or changing the availability filter.'}
          </p>
          {books.length === 0 ? (
            <button
              type="button"
              onClick={onAddBook}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              Add First Book
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-2.5">Book ID</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Author</th>
                <th className="px-4 py-2.5">Shelf Status</th>
                <th className="px-4 py-2.5">Current Holder</th>
                <th className="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.map((book) => {
                const isUpdating =
                  book.active_transaction_id !== null &&
                  updatingTxId === book.active_transaction_id;

                return (
                  <tr
                    key={book.book_id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">
                      #{book.book_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {book.book_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{book.author}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {book.is_available ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Borrowed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {book.is_available ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span>
                          <span className="font-medium text-slate-800">
                            {book.current_borrower_name}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>
                            USN{' '}
                            <span className="font-mono tabular-nums">
                              {book.current_borrower_usn}
                            </span>
                          </span>
                          {book.borrow_date ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono tabular-nums">
                                {book.borrow_date}
                              </span>
                            </>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {book.is_available ? (
                          <button
                            type="button"
                            onClick={() => onIssueBook(book.book_id)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                          >
                            Issue
                          </button>
                        ) : book.active_transaction_id ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              onUpdateReturnStatus(
                                book.active_transaction_id!,
                                'Returned'
                              )
                            }
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {isUpdating ? 'Updating...' : 'Mark Returned'}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onEditBook(book)}
                          aria-label={`Edit ${book.book_name}`}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBook(book)}
                          aria-label={`Delete ${book.book_name}`}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
