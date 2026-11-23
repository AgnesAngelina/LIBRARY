import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import {
  createBook,
  createBorrow,
  createStudent,
  deleteBook,
  deleteBorrow,
  deleteStudent,
  fetchDashboard,
  updateBook,
  updateReturnStatus,
  updateStudent,
} from './api/library';
import { BooksView } from './components/BooksView';
import { BorrowsView } from './components/BorrowsView';
import { DashboardView } from './components/DashboardView';
import {
  BookFormModal,
  ConfirmDeleteModal,
  IssueBookModal,
  StudentFormModal,
} from './components/LibraryModals';
import { StudentsView } from './components/StudentsView';
import type {
  BookRecord,
  BorrowRecord,
  DashboardPayload,
  ReturnStatus,
  StudentRecord,
} from './types/library';

type ActiveTab = 'dashboard' | 'borrows' | 'books' | 'students';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

const TAB_LABELS: Record<ActiveTab, string> = {
  dashboard: 'Dashboard',
  borrows: 'Borrow Ledger',
  books: 'Books Catalog',
  students: 'Students Directory',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingTxId, setUpdatingTxId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modal state
  const [issueOpen, setIssueOpen] = useState(false);
  const [preselectedBookId, setPreselectedBookId] = useState<number | null>(
    null
  );
  const [preselectedUsn, setPreselectedUsn] = useState<number | null>(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(
    null
  );

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'student'; item: StudentRecord }
    | { type: 'book'; item: BookRecord }
    | { type: 'borrow'; item: BorrowRecord }
    | null
  >(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToast({ id, type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadDashboard = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const payload = await fetchDashboard();
      setData(payload);
      setError(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load library data.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const handleUpdateReturnStatus = async (
    transactionId: number,
    nextStatus: ReturnStatus
  ) => {
    setUpdatingTxId(transactionId);
    try {
      await updateReturnStatus(transactionId, nextStatus);
      await loadDashboard(false);
      showToast(
        'success',
        `Transaction #${transactionId} updated to ${nextStatus}.`
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to update return status.'
      );
    } finally {
      setUpdatingTxId(null);
    }
  };

  const handleOpenIssueModal = (
    bookId: number | null = null,
    usn: number | null = null
  ) => {
    setPreselectedBookId(bookId);
    setPreselectedUsn(usn);
    setIssueOpen(true);
  };

  const handleIssueBook = async (payload: {
    usn: number;
    book_id: number;
    borrow_date: string;
  }) => {
    await createBorrow(payload);
    await loadDashboard(false);
    showToast('success', `Book #${payload.book_id} issued to USN ${payload.usn}.`);
  };

  const handleSaveStudent = async (payload: {
    usn?: number;
    name: string;
    dept: string;
  }) => {
    if (editingStudent) {
      await updateStudent(editingStudent.usn, {
        name: payload.name,
        dept: payload.dept,
      });
      await loadDashboard(false);
      showToast('success', `Updated student ${payload.name}.`);
    } else {
      await createStudent(payload);
      await loadDashboard(false);
      showToast('success', `Added student ${payload.name}.`);
    }
  };

  const handleSaveBook = async (payload: {
    book_id?: number;
    book_name: string;
    author: string;
  }) => {
    if (editingBook) {
      await updateBook(editingBook.book_id, {
        book_name: payload.book_name,
        author: payload.author,
      });
      await loadDashboard(false);
      showToast('success', `Updated book "${payload.book_name}".`);
    } else {
      await createBook(payload);
      await loadDashboard(false);
      showToast('success', `Added book "${payload.book_name}".`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'student') {
      await deleteStudent(deleteTarget.item.usn);
      await loadDashboard(false);
      showToast('success', `Deleted student ${deleteTarget.item.name}.`);
    } else if (deleteTarget.type === 'book') {
      await deleteBook(deleteTarget.item.book_id);
      await loadDashboard(false);
      showToast('success', `Deleted book "${deleteTarget.item.book_name}".`);
    } else {
      await deleteBorrow(deleteTarget.item.transaction_id);
      await loadDashboard(false);
      showToast(
        'success',
        `Removed borrow transaction #${deleteTarget.item.transaction_id}.`
      );
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'borrows',
      label: 'Borrow Ledger',
      icon: ArrowLeftRight,
      count: data?.stats.borrowed_books,
    },
    {
      id: 'books',
      label: 'Books Catalog',
      icon: BookOpen,
      count: data?.stats.total_books,
    },
    {
      id: 'students',
      label: 'Students Directory',
      icon: Users,
      count: data?.stats.total_students,
    },
  ];

  const availableBooks = data?.books.filter((b) => b.is_available) ?? [];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Library Manager
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined ? (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      active ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">Library Circulation</p>
          <p className="mt-1 tabular-nums">
            {data
              ? `${data.stats.available_books} available · ${data.stats.borrowed_books} borrowed`
              : 'Connecting to catalog...'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileNavOpen(false);
          }}
        >
          <aside className="h-full w-64 border-r border-slate-200 bg-white">
            {renderSidebarContent()}
          </aside>
        </div>
      ) : null}

      {/* Main Content Workspace */}
      <div className="lg:pl-60">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline whitespace-nowrap shrink-0">
                Library Workspace
              </span>
              <span
                aria-hidden="true"
                className="hidden text-slate-300 sm:inline"
              >
                /
              </span>
              <h1 className="truncate font-display text-base font-semibold text-slate-900">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadDashboard(false)}
              disabled={refreshing || loading}
              aria-label="Refresh library data"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenIssueModal(null, null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Issue Book</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Loading library dashboard">
              <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                {[0, 1, 2, 3].map((slot) => (
                  <div key={slot} className="space-y-2.5 p-5">
                    <div className="h-3.5 w-24 rounded bg-slate-200" />
                    <div className="h-8 w-16 rounded bg-slate-200" />
                    <div className="h-3 w-32 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="h-4 w-48 rounded bg-slate-200" />
                <div className="mt-4 space-y-3">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="h-10 w-full rounded bg-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          ) : error && !data ? (
            <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                Unable to load library database
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                Retry Connection
              </button>
            </div>
          ) : data ? (
            <>
              {error ? (
                <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => void loadDashboard(false)}
                    className="font-medium underline whitespace-nowrap shrink-0"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {activeTab === 'dashboard' ? (
                <DashboardView
                  data={data}
                  updatingTxId={updatingTxId}
                  onUpdateReturnStatus={handleUpdateReturnStatus}
                  onOpenIssueModal={(bookId) =>
                    handleOpenIssueModal(bookId ?? null, null)
                  }
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              ) : null}

              {activeTab === 'borrows' ? (
                <BorrowsView
                  borrows={data.borrows}
                  updatingTxId={updatingTxId}
                  onUpdateReturnStatus={handleUpdateReturnStatus}
                  onOpenIssueModal={() => handleOpenIssueModal(null, null)}
                  onRequestDeleteBorrow={(record) =>
                    setDeleteTarget({ type: 'borrow', item: record })
                  }
                />
              ) : null}

              {activeTab === 'books' ? (
                <BooksView
                  books={data.books}
                  updatingTxId={updatingTxId}
                  onAddBook={() => {
                    setEditingBook(null);
                    setBookModalOpen(true);
                  }}
                  onEditBook={(book) => {
                    setEditingBook(book);
                    setBookModalOpen(true);
                  }}
                  onDeleteBook={(book) =>
                    setDeleteTarget({ type: 'book', item: book })
                  }
                  onIssueBook={(bookId) => handleOpenIssueModal(bookId, null)}
                  onUpdateReturnStatus={handleUpdateReturnStatus}
                />
              ) : null}

              {activeTab === 'students' ? (
                <StudentsView
                  students={data.students}
                  onAddStudent={() => {
                    setEditingStudent(null);
                    setStudentModalOpen(true);
                  }}
                  onEditStudent={(student) => {
                    setEditingStudent(student);
                    setStudentModalOpen(true);
                  }}
                  onDeleteStudent={(student) =>
                    setDeleteTarget({ type: 'student', item: student })
                  }
                  onIssueToStudent={(usn) => handleOpenIssueModal(null, usn)}
                />
              ) : null}
            </>
          ) : null}
        </main>
      </div>

      {/* Modals */}
      <IssueBookModal
        open={issueOpen}
        students={data?.students ?? []}
        availableBooks={availableBooks}
        preselectedBookId={preselectedBookId}
        preselectedUsn={preselectedUsn}
        onClose={() => setIssueOpen(false)}
        onSubmit={handleIssueBook}
      />

      <StudentFormModal
        open={studentModalOpen}
        editingStudent={editingStudent}
        onClose={() => setStudentModalOpen(false)}
        onSubmit={handleSaveStudent}
      />

      <BookFormModal
        open={bookModalOpen}
        editingBook={editingBook}
        onClose={() => setBookModalOpen(false)}
        onSubmit={handleSaveBook}
      />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === 'student'
            ? 'Delete Student'
            : deleteTarget?.type === 'book'
            ? 'Delete Book'
            : 'Delete Borrow Record'
        }
        description={
          deleteTarget?.type === 'student'
            ? `Remove student "${deleteTarget.item.name}" (USN ${deleteTarget.item.usn}) from the directory?`
            : deleteTarget?.type === 'book'
            ? `Remove "${deleteTarget.item.book_name}" (ID #${deleteTarget.item.book_id}) from the library catalog?`
            : deleteTarget?.type === 'borrow'
            ? `Delete borrow transaction #${deleteTarget.item.transaction_id} (${deleteTarget.item.book_name} — ${deleteTarget.item.student_name})?`
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Non-blocking status toast */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-xs font-medium shadow-md ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-white text-slate-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
