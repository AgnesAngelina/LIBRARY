import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import type { BookRecord, StudentRecord } from '../types/library';

interface IssueBookModalProps {
  open: boolean;
  students: StudentRecord[];
  availableBooks: BookRecord[];
  preselectedBookId?: number | null;
  preselectedUsn?: number | null;
  onClose: () => void;
  onSubmit: (payload: {
    usn: number;
    book_id: number;
    borrow_date: string;
  }) => Promise<void>;
}

export function IssueBookModal({
  open,
  students,
  availableBooks,
  preselectedBookId,
  preselectedUsn,
  onClose,
  onSubmit,
}: IssueBookModalProps) {
  const [usn, setUsn] = useState<string>('');
  const [bookId, setBookId] = useState<string>('');
  const [borrowDate, setBorrowDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBorrowDate(new Date().toISOString().slice(0, 10));
    if (preselectedUsn) {
      setUsn(String(preselectedUsn));
    } else if (students.length > 0) {
      setUsn(String(students[0].usn));
    } else {
      setUsn('');
    }
    if (preselectedBookId) {
      setBookId(String(preselectedBookId));
    } else if (availableBooks.length > 0) {
      setBookId(String(availableBooks[0].book_id));
    } else {
      setBookId('');
    }
  }, [open, preselectedBookId, preselectedUsn, students, availableBooks]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usn || !bookId) {
      setError('Select both a student and an available book.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        usn: Number(usn),
        book_id: Number(bookId),
        borrow_date: borrowDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue Book"
      subtitle="Create a new borrow record and mark the book as Not Returned."
    >
      {availableBooks.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            All cataloged books are currently borrowed. Mark an active borrow as
            Returned or add a new book before issuing.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            No students are registered yet. Add a student before issuing a book.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="issue-student"
              className="block text-xs font-medium text-slate-700"
            >
              Student
            </label>
            <select
              id="issue-student"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
              required
            >
              {students.map((student) => (
                <option key={student.usn} value={student.usn}>
                  USN {student.usn} — {student.name} ({student.dept})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="issue-book"
              className="block text-xs font-medium text-slate-700"
            >
              Available Book
            </label>
            <select
              id="issue-book"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
              required
            >
              {availableBooks.map((book) => (
                <option key={book.book_id} value={book.book_id}>
                  #{book.book_id} — {book.book_name} ({book.author})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="issue-date"
              className="block text-xs font-medium text-slate-700"
            >
              Borrow Date
            </label>
            <input
              id="issue-date"
              type="date"
              value={borrowDate}
              onChange={(e) => setBorrowDate(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Issuing...' : 'Confirm Issue'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

interface StudentFormModalProps {
  open: boolean;
  editingStudent: StudentRecord | null;
  onClose: () => void;
  onSubmit: (payload: {
    usn?: number;
    name: string;
    dept: string;
  }) => Promise<void>;
}

export function StudentFormModal({
  open,
  editingStudent,
  onClose,
  onSubmit,
}: StudentFormModalProps) {
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingStudent) {
      setUsn(String(editingStudent.usn));
      setName(editingStudent.name);
      setDept(editingStudent.dept);
    } else {
      setUsn('');
      setName('');
      setDept('');
    }
  }, [open, editingStudent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedDept = dept.trim();
    if (!trimmedName || !trimmedDept) {
      setError('Student name and department are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...(editingStudent || !usn.trim() ? {} : { usn: Number(usn.trim()) }),
        name: trimmedName,
        dept: trimmedDept,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save student record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingStudent ? 'Edit Student' : 'Add Student'}
      subtitle={
        editingStudent
          ? `Updating profile for USN ${editingStudent.usn}.`
          : 'Register a new student in the library directory.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {!editingStudent ? (
          <div>
            <label
              htmlFor="student-usn"
              className="block text-xs font-medium text-slate-700"
            >
              USN (optional — auto-assigned if blank)
            </label>
            <input
              id="student-usn"
              type="number"
              min={1}
              step={1}
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              placeholder="Auto-assign next USN"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="student-name"
            className="block text-xs font-medium text-slate-700"
          >
            Student Name
          </label>
          <input
            id="student-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kavya Rao"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            required
          />
        </div>

        <div>
          <label
            htmlFor="student-dept"
            className="block text-xs font-medium text-slate-700"
          >
            Department
          </label>
          <input
            id="student-dept"
            type="text"
            maxLength={40}
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="e.g. CSE, ISE, AIML, ECE"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {submitting
              ? 'Saving...'
              : editingStudent
              ? 'Save Changes'
              : 'Add Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface BookFormModalProps {
  open: boolean;
  editingBook: BookRecord | null;
  onClose: () => void;
  onSubmit: (payload: {
    book_id?: number;
    book_name: string;
    author: string;
  }) => Promise<void>;
}

export function BookFormModal({
  open,
  editingBook,
  onClose,
  onSubmit,
}: BookFormModalProps) {
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingBook) {
      setBookId(String(editingBook.book_id));
      setBookName(editingBook.book_name);
      setAuthor(editingBook.author);
    } else {
      setBookId('');
      setBookName('');
      setAuthor('');
    }
  }, [open, editingBook]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = bookName.trim();
    const trimmedAuthor = author.trim();
    if (!trimmedName || !trimmedAuthor) {
      setError('Book title and author are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...(editingBook || !bookId.trim()
          ? {}
          : { book_id: Number(bookId.trim()) }),
        book_name: trimmedName,
        author: trimmedAuthor,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingBook ? 'Edit Book' : 'Add Book'}
      subtitle={
        editingBook
          ? `Updating catalog entry #${editingBook.book_id}.`
          : 'Register a new title into the library catalog.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {!editingBook ? (
          <div>
            <label
              htmlFor="book-id"
              className="block text-xs font-medium text-slate-700"
            >
              Book ID (optional — auto-assigned if blank)
            </label>
            <input
              id="book-id"
              type="number"
              min={1}
              step={1}
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              placeholder="Auto-assign next Book ID"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="book-title"
            className="block text-xs font-medium text-slate-700"
          >
            Book Title
          </label>
          <input
            id="book-title"
            type="text"
            maxLength={140}
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="e.g. Clean Architecture"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            required
          />
        </div>

        <div>
          <label
            htmlFor="book-author"
            className="block text-xs font-medium text-slate-700"
          >
            Author
          </label>
          <input
            id="book-author"
            type="text"
            maxLength={100}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Robert C. Martin"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {submitting
              ? 'Saving...'
              : editingBook
              ? 'Save Changes'
              : 'Add Book'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {error}
          </div>
        ) : null}
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
