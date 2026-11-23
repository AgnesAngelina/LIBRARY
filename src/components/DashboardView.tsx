import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import type {
  BookRecord,
  BorrowRecord,
  DashboardPayload,
  ReturnStatus,
} from '../types/library';

interface DashboardViewProps {
  data: DashboardPayload;
  updatingTxId: number | null;
  onUpdateReturnStatus: (
    transactionId: number,
    nextStatus: ReturnStatus
  ) => Promise<void>;
  onOpenIssueModal: (bookId?: number | null) => void;
  onNavigate: (tab: 'borrows' | 'books' | 'students') => void;
}

export function DashboardView({
  data,
  updatingTxId,
  onUpdateReturnStatus,
  onOpenIssueModal,
  onNavigate,
}: DashboardViewProps) {
  const { stats, borrows, books, students, departments } = data;

  const activeBorrows: BorrowRecord[] = borrows.filter(
    (b) => b.return_status === 'Not Returned'
  );
  const availableBooks: BookRecord[] = books.filter((b) => b.is_available);

  const availabilityPct =
    stats.total_books > 0
      ? Math.round((stats.available_books / stats.total_books) * 100)
      : 0;
  const borrowedPct =
    stats.total_books > 0 ? 100 - availabilityPct : 0;

  return (
    <div className="space-y-6">
      {/* 4-column KPI strip in a single flat divided surface */}
      <section
        aria-label="Library overview metrics"
        className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Students</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {stats.total_students}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Across{' '}
            <span className="font-mono tabular-nums text-slate-700">
              {departments.length}
            </span>{' '}
            {departments.length === 1 ? 'department' : 'departments'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Catalog Books</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {stats.total_books}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">
              {stats.total_transactions}
            </span>{' '}
            lifetime borrow records
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Available Books</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-emerald-700 tabular-nums">
            {stats.available_books}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">
              {availabilityPct}%
            </span>{' '}
            on shelf ready to issue
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Borrowed Books</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-amber-700 tabular-nums">
            {stats.borrowed_books}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-mono tabular-nums text-slate-700">
              {borrowedPct}%
            </span>{' '}
            awaiting return
          </p>
        </div>
      </section>

      {/* Main 12-column analytical split: Active Borrows (7) + Available Books & Dept Breakdown (5) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Active Borrows Queue */}
        <section className="rounded-xl border border-slate-200 bg-white xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Active Borrowed Books
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Books currently checked out with return status pending
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('borrows')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>Full Borrow Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeBorrows.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                All books have been returned
              </p>
              <p className="mt-1 text-xs text-slate-500">
                There are no pending returns at the moment.
              </p>
              <button
                type="button"
                onClick={() => onOpenIssueModal(null)}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                Issue Book
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-4 py-2.5">Tx</th>
                    <th className="px-4 py-2.5">Book</th>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Borrowed</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Return Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBorrows.map((record) => {
                    const isUpdating = updatingTxId === record.transaction_id;
                    return (
                      <tr
                        key={record.transaction_id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                          #{record.transaction_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {record.book_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID <span className="font-mono tabular-nums">{record.book_id}</span>
                            <span aria-hidden="true"> · </span>
                            {record.author}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {record.student_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            USN <span className="font-mono tabular-nums">{record.usn}</span>
                            <span aria-hidden="true"> · </span>
                            {record.student_dept}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {record.borrow_date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Not Returned</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              onUpdateReturnStatus(
                                record.transaction_id,
                                'Returned'
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {isUpdating ? 'Updating...' : 'Mark Returned'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Available Books + Department Summary */}
        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Available Books
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ready on shelf for immediate checkout
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('books')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                <span>All Books</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {availableBooks.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                No books currently available on shelf.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {availableBooks.map((book) => (
                  <li
                    key={book.book_id}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50/80"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {book.book_name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        <span className="font-mono tabular-nums">
                          #{book.book_id}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{book.author}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenIssueModal(book.book_id)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                    >
                      Issue
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Students by Department
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Registered members and active checkouts
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                <span>Directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {students.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                No students registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                      <th className="px-5 py-2.5">Department</th>
                      <th className="px-4 py-2.5 text-right">Students</th>
                      <th className="px-5 py-2.5 text-right">Active Borrows</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <tr key={dept.dept} className="hover:bg-slate-50/80">
                        <td className="px-5 py-2.5 font-medium text-slate-900">
                          {dept.dept}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {dept.student_count}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {dept.active_borrows}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Bottom Snapshot: Recent Borrow & Return History */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Library Activity
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest student borrows and completed returns across the catalog
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {stats.returned_transactions} returned · {stats.borrowed_books} pending
          </span>
        </div>

        {borrows.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500">
            No borrow records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-2.5">Tx ID</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Book</th>
                  <th className="px-4 py-2.5">Borrow Date</th>
                  <th className="px-5 py-2.5">Return Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {borrows.slice(0, 6).map((row) => (
                  <tr key={row.transaction_id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-500 tabular-nums">
                      #{row.transaction_id}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      <span className="font-medium">{row.student_name}</span>
                      <span className="text-xs text-slate-500">
                        {' '}
                        · USN{' '}
                        <span className="font-mono tabular-nums">
                          {row.usn}
                        </span>{' '}
                        · {row.student_dept}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      <span className="font-medium">{row.book_name}</span>
                      <span className="text-xs text-slate-500">
                        {' '}
                        · {row.author}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {row.borrow_date}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      {row.return_status === 'Returned' ? (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
