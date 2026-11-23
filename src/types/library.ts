export type ReturnStatus = 'Returned' | 'Not Returned';

export interface StudentRecord {
  usn: number;
  name: string;
  dept: string;
  active_borrows: number;
  total_borrows: number;
}

export interface BookRecord {
  book_id: number;
  book_name: string;
  author: string;
  is_available: boolean;
  current_borrower_usn: number | null;
  current_borrower_name: string | null;
  active_transaction_id: number | null;
  borrow_date: string | null;
}

export interface BorrowRecord {
  transaction_id: number;
  usn: number;
  student_name: string;
  student_dept: string;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: ReturnStatus;
}

export interface DepartmentSummary {
  dept: string;
  student_count: number;
  active_borrows: number;
}

export interface DashboardStats {
  total_students: number;
  total_books: number;
  available_books: number;
  borrowed_books: number;
  returned_transactions: number;
  total_transactions: number;
}

export interface DashboardPayload {
  stats: DashboardStats;
  students: StudentRecord[];
  books: BookRecord[];
  borrows: BorrowRecord[];
  departments: DepartmentSummary[];
}
