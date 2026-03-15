/**
 * src/modules/qualifications/QualificationsPage.tsx
 * ===================================================
 * Qualifications module — matrix view of employee × qualification.
 */

import React, { useState, useMemo } from "react";
import { InitialData } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Award, CheckCircle } from "lucide-react";

interface Props { data: InitialData; }

export const QualificationsPage: React.FC<Props> = ({ data }) => {
  const { employees, qualifications, employeeQualifications, departments } = data;
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("הכל");

  const hasQual = (empId: string, qualId: string) =>
    employeeQualifications.some((eq) => eq.employeeId === empId && eq.qualificationId === qualId);

  const filteredEmployees = useMemo(() =>
    employees.filter((e) => {
      const matchSearch = !search || e.name.includes(search);
      const matchDept = deptFilter === "הכל" || e.department === deptFilter;
      return matchSearch && matchDept;
    }),
  [employees, search, deptFilter]);

  const totalAssignments = employeeQualifications.length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="הכשרות" subtitle="מטריצת הכשרות לפי עובד וסוג" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="סוגי הכשרות" value={qualifications.length} icon={<Award size={18} />} />
        <SummaryCard label="שיוכים פעילים" value={totalAssignments} icon={<CheckCircle size={18} />} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="חיפוש עובד..." className="w-full sm:w-56" />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          dir="rtl"
        >
          <option>הכל</option>
          {departments.map((d) => <option key={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg bg-card shadow-card">
        <table className="min-w-[44rem] text-sm" dir="rtl" style={{ minWidth: "max(100%, 44rem)" }}>
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground sticky right-0 bg-muted z-10 min-w-36">
                עובד / מחלקה
              </th>
              {qualifications.map((q) => (
                <th key={q.id} className="px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap text-center">
                  {q.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 sticky right-0 bg-card z-10">
                  <div className="font-semibold text-foreground">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.department}</div>
                </td>
                {qualifications.map((q) => (
                  <td key={q.id} className="px-3 py-3 text-center">
                    {hasQual(emp.id, q.id) ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-success-bg text-status-success-text">
                        <CheckCircle size={14} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground opacity-30">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
