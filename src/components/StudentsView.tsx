import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { StudentRecord } from '../types/library';

interface StudentsViewProps {
  students: StudentRecord[];
  onAddStudent: () => void;
  onEditStudent: (student: StudentRecord) => void;
  onDeleteStudent: (student: StudentRecord) => void;
  onIssueToStudent: (usn: number) => void;
}

export function StudentsView({
  students,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onIssueToStudent,
}: StudentsViewProps) {
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.dept.trim()) set.add(s.dept.trim());
    }
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (deptFilter !== 'all' && s.dept !== deptFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.dept.toLowerCase().includes(q) ||
        String(s.usn).includes(q)
      );
    });
  }, [students, query, deptFilter]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Student Details Directory
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Registered library members, department assignments, and active borrows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, USN, department..."
              aria-label="Search students"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddStudent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No matching students found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {students.length === 0
              ? 'Register the first student to start issuing library books.'
              : 'Adjust your search query or department filter.'}
          </p>
          {students.length === 0 ? (
            <button
              type="button"
              onClick={onAddStudent}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              Add First Student
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-2.5">USN</th>
                <th className="px-4 py-2.5">Student Name</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5 text-right">Active Borrows</th>
                <th className="px-4 py-2.5 text-right">Total History</th>
                <th className="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr
                  key={student.usn}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">
                    {student.usn}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.dept}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        student.active_borrows > 0
                          ? 'font-medium text-amber-700'
                          : 'text-slate-500'
                      }
                    >
                      {student.active_borrows}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {student.total_borrows}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onIssueToStudent(student.usn)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 whitespace-nowrap shrink-0"
                      >
                        Issue Book
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditStudent(student)}
                        aria-label={`Edit ${student.name}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student)}
                        aria-label={`Delete ${student.name}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
