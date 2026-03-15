/**
 * src/modules/workforce/WorkforcePage.tsx
 * =========================================
 * Workforce module — employee list + reserve duty tracking.
 *
 * ─── WHERE TO EDIT ──────────────────────────────────────────────────
 * • ADD NEW EMPLOYEE FIELD: add column to columns array + field in Employee type
 * • ADD NEW ALERT RULE: update getReserveStatus() in utils.ts
 * • CHANGE ALERT THRESHOLD: update ALERT_THRESHOLDS.reserveDutyWarningDays in config.ts
 * • CHANGE STATUS BADGE: update employeeStatusVariant() in utils.ts
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import { InitialData, Employee } from "@/types";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/shared/Badge";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  formatDate,
  daysRemaining,
  employeeStatusLabel,
  employeeStatusVariant,
  getReserveStatus,
} from "@/utils";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { data: InitialData; }

export const WorkforcePage: React.FC<Props> = ({ data }) => {
  const { employees, departments } = data;
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");

  // ── Metrics ───────────────────────────────────────────────────────
  const totalEmployees = employees.length;
  const inReserve = employees.filter((e) => e.status === "reserve").length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const endingSoon = employees.filter((e) => {
    return getReserveStatus(e.status, e.reserveEndDate) === "reserve_ending_soon";
  }).length;

  // ── Filtered Data ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        !search || e.name.includes(search) || e.department.includes(search);
      const matchDept = deptFilter === "הכל" || e.department === deptFilter;
      const matchStatus = statusFilter === "הכל" || e.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  // ── Table Columns ─────────────────────────────────────────────────
  // ADD NEW EMPLOYEE FIELD COLUMN HERE ↓
  const columns = [
    {
      key: "name",
      header: "שם עובד",
      render: (e: Employee) => (
        <span className="font-semibold text-foreground">{e.name}</span>
      ),
    },
    { key: "department", header: "מחלקה" },
    { key: "role", header: "תפקיד" },
    {
      key: "status",
      header: "סטטוס",
      render: (e: Employee) => {
        const rs = getReserveStatus(e.status, e.reserveEndDate);
        const days = daysRemaining(e.reserveEndDate);

        if (rs === "reserve_ending_soon") {
          return (
            <span className="flex items-center gap-2">
              <Badge variant="warning">מילואים</Badge>
              <span className="text-xs font-bold text-status-warning-text animate-pulse">
                ⚠ {days} ימים
              </span>
            </span>
          );
        }
        if (rs === "reserve_ended") {
          return (
            <span className="flex items-center gap-2">
              <Badge variant="neutral">מילואים הסתיים</Badge>
            </span>
          );
        }
        return (
          <Badge variant={employeeStatusVariant(e.status)}>
            {employeeStatusLabel(e.status)}
          </Badge>
        );
      },
    },
    {
      key: "reserveStartDate",
      header: "תחילת מילואים",
      render: (e: Employee) => formatDate(e.reserveStartDate),
    },
    {
      key: "reserveEndDate",
      header: "סיום מילואים",
      render: (e: Employee) => {
        const days = daysRemaining(e.reserveEndDate);
        const rs = getReserveStatus(e.status, e.reserveEndDate);
        return (
          <span
            className={cn(
              rs === "reserve_ending_soon" && "font-bold text-status-warning-text"
            )}
          >
            {formatDate(e.reserveEndDate)}
          </span>
        );
      },
    },
    // ADD NEW EMPLOYEE TABLE COLUMNS ABOVE THIS LINE ↑
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="כוח אדם ומילואים" subtitle="ניהול עובדים ומעקב סטטוס מילואים" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="סה״כ עובדים" value={totalEmployees} icon={<Users size={18} />} />
        <SummaryCard label="פעילים" value={activeCount} variant="success" />
        <SummaryCard label="במילואים" value={inReserve} variant={inReserve > 0 ? "warning" : "neutral"} />
        <SummaryCard
          label="מסיימים תוך 14 יום"
          value={endingSoon}
          variant={endingSoon > 0 ? "danger" : "neutral"}
          sub="דורשים תשומת לב"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="חיפוש עובד..."
          className="w-full sm:w-60"
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          dir="rtl"
        >
          <option>הכל</option>
          {departments.map((d) => (
            <option key={d.id}>{d.name}</option>
          ))}
        </select>
        {/* ADD NEW FILTER HERE ↓ */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          dir="rtl"
        >
          <option>הכל</option>
          <option value="active">פעיל</option>
          <option value="reserve">מילואים</option>
          <option value="inactive">לא פעיל</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(e) => e.id}
        emptyMessage="לא נמצאו עובדים"
        minWidthClassName="min-w-[50rem]"
      />
    </div>
  );
};
