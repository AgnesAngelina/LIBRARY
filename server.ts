import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createPool(): Pool | null {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    const sslMode = parsed.searchParams.get('sslmode');
    parsed.searchParams.delete('sslmode');

    const config: PoolConfig = {
      connectionString: parsed.toString(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (sslMode && sslMode !== 'disable') {
      config.ssl = { rejectUnauthorized: false };
    } else if (
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      config.ssl = { rejectUnauthorized: false };
    }

    return new Pool(config);
  } catch (err) {
    console.error('Invalid DATABASE_URL configuration:', err);
    return null;
  }
}

const pool = createPool();

function requirePool(res: Response): Pool | null {
  if (!pool) {
    res.status(503).json({
      error:
        'Database connection is not configured. Set DATABASE_URL in server environment variables.',
    });
    return null;
  }
  return pool;
}

function parsePositiveInt(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val > 0 ? val : null;
  }
  if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
    const parsed = Number.parseInt(val.trim(), 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function parseNonEmptyString(val: unknown, maxLen = 120): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

function parseIsoDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

async function fetchDashboardData(db: Pool) {
  const [studentsRes, booksRes, borrowsRes, deptRes] = await Promise.all([
    db.query(`
      SELECT
        s.usn,
        s.name,
        s.dept,
        COUNT(br.transaction_id) FILTER (
          WHERE LOWER(COALESCE(br.return_status, '')) <> 'returned'
        )::int AS active_borrows,
        COUNT(br.transaction_id)::int AS total_borrows
      FROM student1 s
      LEFT JOIN borrow br ON br.usn = s.usn
      GROUP BY s.usn, s.name, s.dept
      ORDER BY s.usn ASC
    `),
    db.query(`
      SELECT
        b.book_id,
        b.book_name,
        b.author,
        (active.transaction_id IS NULL) AS is_available,
        active.usn AS current_borrower_usn,
        active.student_name AS current_borrower_name,
        active.transaction_id AS active_transaction_id,
        TO_CHAR(active.borrow_date, 'YYYY-MM-DD') AS borrow_date
      FROM book b
      LEFT JOIN LATERAL (
        SELECT
          br.transaction_id,
          br.usn,
          br.borrow_date,
          s.name AS student_name
        FROM borrow br
        LEFT JOIN student1 s ON s.usn = br.usn
        WHERE br.book_id = b.book_id
          AND LOWER(COALESCE(br.return_status, '')) <> 'returned'
        ORDER BY br.borrow_date DESC NULLS LAST, br.transaction_id DESC
        LIMIT 1
      ) active ON true
      ORDER BY b.book_id ASC
    `),
    db.query(`
      SELECT
        br.transaction_id,
        br.usn,
        COALESCE(s.name, 'Unknown Student') AS student_name,
        COALESCE(s.dept, '—') AS student_dept,
        br.book_id,
        COALESCE(b.book_name, 'Unknown Book') AS book_name,
        COALESCE(b.author, '—') AS author,
        TO_CHAR(br.borrow_date, 'YYYY-MM-DD') AS borrow_date,
        CASE
          WHEN LOWER(COALESCE(br.return_status, '')) = 'returned' THEN 'Returned'
          ELSE 'Not Returned'
        END AS return_status
      FROM borrow br
      LEFT JOIN student1 s ON s.usn = br.usn
      LEFT JOIN book b ON b.book_id = br.book_id
      ORDER BY
        CASE WHEN LOWER(COALESCE(br.return_status, '')) = 'returned' THEN 1 ELSE 0 END ASC,
        br.borrow_date DESC NULLS LAST,
        br.transaction_id DESC
    `),
    db.query(`
      SELECT
        COALESCE(NULLIF(TRIM(s.dept), ''), 'Unassigned') AS dept,
        COUNT(DISTINCT s.usn)::int AS student_count,
        COUNT(br.transaction_id) FILTER (
          WHERE LOWER(COALESCE(br.return_status, '')) <> 'returned'
        )::int AS active_borrows
      FROM student1 s
      LEFT JOIN borrow br ON br.usn = s.usn
      GROUP BY COALESCE(NULLIF(TRIM(s.dept), ''), 'Unassigned')
      ORDER BY student_count DESC, dept ASC
    `),
  ]);

  const students = studentsRes.rows;
  const books = booksRes.rows;
  const borrows = borrowsRes.rows;
  const departments = deptRes.rows;

  const totalBooks = books.length;
  const availableBooks = books.filter((b) => b.is_available).length;
  const borrowedBooks = totalBooks - availableBooks;
  const returnedTransactions = borrows.filter(
    (b) => b.return_status === 'Returned'
  ).length;

  return {
    stats: {
      total_students: students.length,
      total_books: totalBooks,
      available_books: availableBooks,
      borrowed_books: borrowedBooks,
      returned_transactions: returnedTransactions,
      total_transactions: borrows.length,
    },
    students,
    books,
    borrows,
    departments,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;
    try {
      await db.query('SELECT 1');
      res.json({ ok: true });
    } catch (err) {
      console.error('Database health check failed:', err);
      res.status(500).json({ error: 'Database connection failed.' });
    }
  });

  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;
    try {
      const payload = await fetchDashboardData(db);
      res.json(payload);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      res.status(500).json({ error: 'Failed to load library dashboard data.' });
    }
  });

  // Students CRUD (table: student1)
  app.get('/api/students', async (_req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;
    try {
      const data = await fetchDashboardData(db);
      res.json(data.students);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      res.status(500).json({ error: 'Failed to fetch student details.' });
    }
  });

  app.post('/api/students', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const name = parseNonEmptyString(req.body?.name, 100);
    const dept = parseNonEmptyString(req.body?.dept, 40);
    const requestedUsn =
      req.body?.usn !== undefined && req.body?.usn !== '' && req.body?.usn !== null
        ? parsePositiveInt(req.body.usn)
        : null;

    if (!name || !dept) {
      res.status(400).json({ error: 'Student name and department are required.' });
      return;
    }
    if (
      req.body?.usn !== undefined &&
      req.body?.usn !== '' &&
      req.body?.usn !== null &&
      requestedUsn === null
    ) {
      res.status(400).json({ error: 'USN must be a positive integer.' });
      return;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('LOCK TABLE student1 IN SHARE ROW EXCLUSIVE MODE');

      let usn = requestedUsn;
      if (usn === null) {
        const nextRes = await client.query(
          'SELECT COALESCE(MAX(usn), 0) + 1 AS next_id FROM student1'
        );
        usn = Number(nextRes.rows[0].next_id);
      } else {
        const exists = await client.query(
          'SELECT 1 FROM student1 WHERE usn = $1',
          [usn]
        );
        if (exists.rowCount && exists.rowCount > 0) {
          await client.query('ROLLBACK');
          res.status(409).json({ error: `Student USN ${usn} already exists.` });
          return;
        }
      }

      const inserted = await client.query(
        'INSERT INTO student1 (usn, name, dept) VALUES ($1, $2, $3) RETURNING usn, name, dept',
        [usn, name, dept]
      );
      await client.query('COMMIT');
      res.status(201).json(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Failed to add student:', err);
      res.status(500).json({ error: 'Failed to register student.' });
    } finally {
      client.release();
    }
  });

  app.put('/api/students/:usn', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const usn = parsePositiveInt(req.params.usn);
    const name = parseNonEmptyString(req.body?.name, 100);
    const dept = parseNonEmptyString(req.body?.dept, 40);

    if (!usn) {
      res.status(400).json({ error: 'Invalid student USN.' });
      return;
    }
    if (!name || !dept) {
      res.status(400).json({ error: 'Student name and department are required.' });
      return;
    }

    try {
      const updated = await db.query(
        'UPDATE student1 SET name = $1, dept = $2 WHERE usn = $3 RETURNING usn, name, dept',
        [name, dept, usn]
      );
      if (updated.rowCount === 0) {
        res.status(404).json({ error: `Student USN ${usn} not found.` });
        return;
      }
      res.json(updated.rows[0]);
    } catch (err) {
      console.error('Failed to update student:', err);
      res.status(500).json({ error: 'Failed to update student record.' });
    }
  });

  app.delete('/api/students/:usn', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const usn = parsePositiveInt(req.params.usn);
    if (!usn) {
      res.status(400).json({ error: 'Invalid student USN.' });
      return;
    }

    try {
      const refs = await db.query(
        'SELECT COUNT(*)::int AS cnt FROM borrow WHERE usn = $1',
        [usn]
      );
      if (Number(refs.rows[0].cnt) > 0) {
        res.status(409).json({
          error:
            'Cannot delete student with existing borrow history. Remove or archive borrow transactions first.',
        });
        return;
      }

      const deleted = await db.query(
        'DELETE FROM student1 WHERE usn = $1 RETURNING usn',
        [usn]
      );
      if (deleted.rowCount === 0) {
        res.status(404).json({ error: `Student USN ${usn} not found.` });
        return;
      }
      res.json({ deleted: true, usn });
    } catch (err) {
      console.error('Failed to delete student:', err);
      res.status(500).json({ error: 'Failed to delete student.' });
    }
  });

  // Books CRUD (table: book)
  app.get('/api/books', async (_req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;
    try {
      const data = await fetchDashboardData(db);
      res.json(data.books);
    } catch (err) {
      console.error('Failed to fetch books:', err);
      res.status(500).json({ error: 'Failed to fetch book catalog.' });
    }
  });

  app.post('/api/books', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const bookName = parseNonEmptyString(req.body?.book_name, 140);
    const author = parseNonEmptyString(req.body?.author, 100);
    const requestedId =
      req.body?.book_id !== undefined &&
      req.body?.book_id !== '' &&
      req.body?.book_id !== null
        ? parsePositiveInt(req.body.book_id)
        : null;

    if (!bookName || !author) {
      res.status(400).json({ error: 'Book title and author are required.' });
      return;
    }
    if (
      req.body?.book_id !== undefined &&
      req.body?.book_id !== '' &&
      req.body?.book_id !== null &&
      requestedId === null
    ) {
      res.status(400).json({ error: 'Book ID must be a positive integer.' });
      return;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('LOCK TABLE book IN SHARE ROW EXCLUSIVE MODE');

      let bookId = requestedId;
      if (bookId === null) {
        const nextRes = await client.query(
          'SELECT COALESCE(MAX(book_id), 100) + 1 AS next_id FROM book'
        );
        bookId = Number(nextRes.rows[0].next_id);
      } else {
        const exists = await client.query(
          'SELECT 1 FROM book WHERE book_id = $1',
          [bookId]
        );
        if (exists.rowCount && exists.rowCount > 0) {
          await client.query('ROLLBACK');
          res.status(409).json({ error: `Book ID ${bookId} already exists.` });
          return;
        }
      }

      const inserted = await client.query(
        'INSERT INTO book (book_id, book_name, author) VALUES ($1, $2, $3) RETURNING book_id, book_name, author',
        [bookId, bookName, author]
      );
      await client.query('COMMIT');
      res.status(201).json(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Failed to add book:', err);
      res.status(500).json({ error: 'Failed to add book to catalog.' });
    } finally {
      client.release();
    }
  });

  app.put('/api/books/:bookId', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const bookId = parsePositiveInt(req.params.bookId);
    const bookName = parseNonEmptyString(req.body?.book_name, 140);
    const author = parseNonEmptyString(req.body?.author, 100);

    if (!bookId) {
      res.status(400).json({ error: 'Invalid book ID.' });
      return;
    }
    if (!bookName || !author) {
      res.status(400).json({ error: 'Book title and author are required.' });
      return;
    }

    try {
      const updated = await db.query(
        'UPDATE book SET book_name = $1, author = $2 WHERE book_id = $3 RETURNING book_id, book_name, author',
        [bookName, author, bookId]
      );
      if (updated.rowCount === 0) {
        res.status(404).json({ error: `Book ID ${bookId} not found.` });
        return;
      }
      res.json(updated.rows[0]);
    } catch (err) {
      console.error('Failed to update book:', err);
      res.status(500).json({ error: 'Failed to update book details.' });
    }
  });

  app.delete('/api/books/:bookId', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const bookId = parsePositiveInt(req.params.bookId);
    if (!bookId) {
      res.status(400).json({ error: 'Invalid book ID.' });
      return;
    }

    try {
      const refs = await db.query(
        'SELECT COUNT(*)::int AS cnt FROM borrow WHERE book_id = $1',
        [bookId]
      );
      if (Number(refs.rows[0].cnt) > 0) {
        res.status(409).json({
          error:
            'Cannot delete book with existing borrow records. Remove borrow records first.',
        });
        return;
      }

      const deleted = await db.query(
        'DELETE FROM book WHERE book_id = $1 RETURNING book_id',
        [bookId]
      );
      if (deleted.rowCount === 0) {
        res.status(404).json({ error: `Book ID ${bookId} not found.` });
        return;
      }
      res.json({ deleted: true, book_id: bookId });
    } catch (err) {
      console.error('Failed to delete book:', err);
      res.status(500).json({ error: 'Failed to delete book.' });
    }
  });

  // Borrow Ledger & Return Status (table: borrow)
  app.get('/api/borrows', async (_req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;
    try {
      const data = await fetchDashboardData(db);
      res.json(data.borrows);
    } catch (err) {
      console.error('Failed to fetch borrow details:', err);
      res.status(500).json({ error: 'Failed to fetch borrow details.' });
    }
  });

  app.post('/api/borrows', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const usn = parsePositiveInt(req.body?.usn);
    const bookId = parsePositiveInt(req.body?.book_id);
    const todayIso = new Date().toISOString().slice(0, 10);
    const borrowDate =
      req.body?.borrow_date !== undefined && req.body?.borrow_date !== ''
        ? parseIsoDate(req.body.borrow_date)
        : todayIso;

    if (!usn || !bookId) {
      res.status(400).json({ error: 'Valid student USN and book ID are required.' });
      return;
    }
    if (!borrowDate) {
      res.status(400).json({ error: 'Borrow date must be in YYYY-MM-DD format.' });
      return;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('LOCK TABLE borrow IN SHARE ROW EXCLUSIVE MODE');

      const studentCheck = await client.query(
        'SELECT usn FROM student1 WHERE usn = $1',
        [usn]
      );
      if (studentCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: `Student USN ${usn} does not exist.` });
        return;
      }

      const bookCheck = await client.query(
        'SELECT book_id FROM book WHERE book_id = $1',
        [bookId]
      );
      if (bookCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: `Book ID ${bookId} does not exist.` });
        return;
      }

      const activeBorrowCheck = await client.query(
        `SELECT transaction_id FROM borrow
         WHERE book_id = $1 AND LOWER(COALESCE(return_status, '')) <> 'returned'
         LIMIT 1`,
        [bookId]
      );
      if (activeBorrowCheck.rowCount && activeBorrowCheck.rowCount > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: `Book #${bookId} is currently borrowed and must be marked returned before issuing again.`,
        });
        return;
      }

      const nextTxRes = await client.query(
        'SELECT COALESCE(MAX(transaction_id), 0) + 1 AS next_id FROM borrow'
      );
      const transactionId = Number(nextTxRes.rows[0].next_id);

      const inserted = await client.query(
        `INSERT INTO borrow (transaction_id, usn, book_id, borrow_date, return_status)
         VALUES ($1, $2, $3, $4::date, 'Not Returned')
         RETURNING transaction_id, usn, book_id, TO_CHAR(borrow_date, 'YYYY-MM-DD') AS borrow_date, return_status`,
        [transactionId, usn, bookId, borrowDate]
      );

      await client.query('COMMIT');
      res.status(201).json(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Failed to issue book:', err);
      res.status(500).json({ error: 'Failed to create borrow transaction.' });
    } finally {
      client.release();
    }
  });

  app.patch(
    '/api/borrows/:transactionId/status',
    async (req: Request, res: Response) => {
      const db = requirePool(res);
      if (!db) return;

      const transactionId = parsePositiveInt(req.params.transactionId);
      const rawStatus = req.body?.return_status;
      const nextStatus =
        rawStatus === 'Returned' || rawStatus === 'Not Returned'
          ? rawStatus
          : null;

      if (!transactionId) {
        res.status(400).json({ error: 'Invalid transaction ID.' });
        return;
      }
      if (!nextStatus) {
        res.status(400).json({
          error: 'return_status must be either "Returned" or "Not Returned".',
        });
        return;
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE borrow IN SHARE ROW EXCLUSIVE MODE');

        const existingRes = await client.query(
          'SELECT transaction_id, book_id FROM borrow WHERE transaction_id = $1',
          [transactionId]
        );
        if (existingRes.rowCount === 0) {
          await client.query('ROLLBACK');
          res
            .status(404)
            .json({ error: `Borrow transaction #${transactionId} not found.` });
          return;
        }

        const bookId = existingRes.rows[0].book_id;
        if (nextStatus === 'Not Returned') {
          const conflictRes = await client.query(
            `SELECT transaction_id FROM borrow
             WHERE book_id = $1
               AND transaction_id <> $2
               AND LOWER(COALESCE(return_status, '')) <> 'returned'
             LIMIT 1`,
            [bookId, transactionId]
          );
          if (conflictRes.rowCount && conflictRes.rowCount > 0) {
            await client.query('ROLLBACK');
            res.status(409).json({
              error: `Cannot mark as Not Returned because Book #${bookId} is already actively borrowed in transaction #${conflictRes.rows[0].transaction_id}.`,
            });
            return;
          }
        }

        const updated = await client.query(
          `UPDATE borrow
           SET return_status = $1
           WHERE transaction_id = $2
           RETURNING transaction_id, usn, book_id, TO_CHAR(borrow_date, 'YYYY-MM-DD') AS borrow_date, return_status`,
          [nextStatus, transactionId]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Failed to update return status:', err);
        res.status(500).json({ error: 'Failed to update return status.' });
      } finally {
        client.release();
      }
    }
  );

  app.delete('/api/borrows/:transactionId', async (req: Request, res: Response) => {
    const db = requirePool(res);
    if (!db) return;

    const transactionId = parsePositiveInt(req.params.transactionId);
    if (!transactionId) {
      res.status(400).json({ error: 'Invalid transaction ID.' });
      return;
    }

    try {
      const deleted = await db.query(
        'DELETE FROM borrow WHERE transaction_id = $1 RETURNING transaction_id',
        [transactionId]
      );
      if (deleted.rowCount === 0) {
        res
          .status(404)
          .json({ error: `Borrow transaction #${transactionId} not found.` });
        return;
      }
      res.json({ deleted: true, transaction_id: transactionId });
    } catch (err) {
      console.error('Failed to delete borrow record:', err);
      res.status(500).json({ error: 'Failed to delete borrow record.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Library Management Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
