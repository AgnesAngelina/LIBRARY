import type {
  BookRecord,
  BorrowRecord,
  DashboardPayload,
  ReturnStatus,
  StudentRecord,
} from '../types/library';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function fetchDashboard(): Promise<DashboardPayload> {
  return requestJson<DashboardPayload>('/api/dashboard');
}

export function createStudent(input: {
  usn?: number;
  name: string;
  dept: string;
}): Promise<StudentRecord> {
  return requestJson<StudentRecord>('/api/students', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateStudent(
  usn: number,
  input: { name: string; dept: string }
): Promise<StudentRecord> {
  return requestJson<StudentRecord>(`/api/students/${usn}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteStudent(usn: number): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/students/${usn}`, {
    method: 'DELETE',
  });
}

export function createBook(input: {
  book_id?: number;
  book_name: string;
  author: string;
}): Promise<BookRecord> {
  return requestJson<BookRecord>('/api/books', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBook(
  bookId: number,
  input: { book_name: string; author: string }
): Promise<BookRecord> {
  return requestJson<BookRecord>(`/api/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteBook(bookId: number): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/books/${bookId}`, {
    method: 'DELETE',
  });
}

export function createBorrow(input: {
  usn: number;
  book_id: number;
  borrow_date: string;
}): Promise<BorrowRecord> {
  return requestJson<BorrowRecord>('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateReturnStatus(
  transactionId: number,
  returnStatus: ReturnStatus
): Promise<BorrowRecord> {
  return requestJson<BorrowRecord>(`/api/borrows/${transactionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ return_status: returnStatus }),
  });
}

export function deleteBorrow(
  transactionId: number
): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/borrows/${transactionId}`, {
    method: 'DELETE',
  });
}
