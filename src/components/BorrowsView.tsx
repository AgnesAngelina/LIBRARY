import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, Search, Trash2 } from 'lucide-react';
import type { BorrowRecord, ReturnStatus } from '../types/library';

interface BorrowsViewProps {
  borrows: BorrowRecord[];
  updatingTxId: number | null;
  onUpdateReturnStatus: (
    transactionId: number,
    nextStatus: ReturnStatus
  ) => Promise<void>;
  onOpenIssueModal: () => void;
  onRequestDeleteBorrow: (record: BorrowRecord) => void;
}

type StatusFilter = 'all' | 'Not Returned' | 'Returned';

export function BorrowsView({
  borrows,
  updatingTxId,
  onUpdateReturnStatus,
  onOpenIssueModal,
  onRequestDeleteBorrow,
}: BorrowsViewProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredBorrows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return borrows.filter((row) => {
      if (statusFilter !== 'all' && row.return_status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.student_name.toLowerCase().includes(q) ||
        row.student_dept.toLowerCase().includes(q) ||
        row.book_name.toLowerCase().includes(q) ||
        row.author.toLowerCase().includes(q) ||
        String(row.transaction_id).includes(q) ||
        String(row.usn).includes(q) ||
        String(row.book_id).includes(q)
      );
    });
  }, [borrows, query, statusFilter]);

  const notReturnedCount = borrows.filter(
    (b) => b.return_status === 'Not Returned'
  ).length;
  const returnedCount = borrows.length - notReturnedCount;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Borrow Details & Return Status
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Track book checkouts and update return status in real time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, book, Tx ID..."
              aria-label="Search borrow records"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by return status"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({borrows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Not Returned')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'Not Returned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Not Returned ({notReturnedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Returned')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'Returned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Returned ({returnedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenIssueModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Issue Book</span>
          </button>
        </div>
      </div>

      {filteredBorrows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No matching borrow transactions
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {borrows.length === 0
              ? 'Issue a book to a registered student to create the first borrow transaction.'
              : 'Adjust your search query or return status filter.'}
          </p>
          {borrows.length === 0 ? (
            <button
              type="button"
              onClick={onOpenIssueModal}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              Issue First Book
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-2.5">Tx ID</th>
                <th className="px-4 py-2.5">Book Details</th>
                <th className="px-4 py-2.5">Student Details</th>
                <th className="px-4 py-2.5">Borrow Date</th>
                <th className="px-4 py-2.5">Return Status</th>
                <th className="px-5 py-2.5 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBorrows.map((record) => {
                const isReturned = record.return_status === 'Returned';
                const isUpdating = updatingTxId === record.transaction_id;

                return (
                  <tr
                    key={record.transaction_id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">
                      #{record.transaction_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {record.book_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        ID{' '}
                        <span className="font-mono tabular-nums">
                          {record.book_id}
                        </span>
                        <span aria-hidden="true"> · </span>
                        {record.author}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {record.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        USN{' '}
                        <span className="font-mono tabular-nums">
                          {record.usn}
                        </span>
                        <span aria-hidden="true"> · </span>
                        {record.student_dept}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {record.borrow_date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Returned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Not Returned</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            onUpdateReturnStatus(
                              record.transaction_id,
                              isReturned ? 'Not Returned' : 'Returned'
                            )
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 ${
                            isReturned
                              ? 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {isUpdating
                            ? 'Updating...'
                            : isReturned
                            ? 'Mark Not Returned'
                            : 'Mark Returned'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteBorrow(record)}
                          aria-label={`Delete borrow transaction ${record.transaction_id}`}
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
