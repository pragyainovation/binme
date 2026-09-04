"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useState } from "react";

export default function DataTable({
  columns,
  data,
  emptyMessage = "No records available.",
  enableRowSelection = false,
  searchPlaceholder = "Search records...",
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const tableColumns = enableRowSelection
    ? [{
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={table.getIsAllPageRowsSelected()}
            ref={(input) => {
              if (input) input.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select row ${row.index + 1}`}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      }, ...columns]
    : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: { sorting, globalFilter, rowSelection },
  });

  return (
    <div className="data-table-container">
      <div className="data-table-toolbar">
        <label className="data-table-search">
          <span>Search</span>
          <input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        <span className="data-table-count">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} records
        </span>
        {enableRowSelection && <span className="data-table-count">{table.getSelectedRowModel().rows.length} selected</span>}
      </div>

      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="data-table-sort"
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : " ↕")}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="data-table-empty">{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="data-table-pagination">
        <label>
          Rows per page
          <select value={table.getState().pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>
            {[10, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span>
        <div className="data-table-page-actions">
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</button>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
        </div>
      </div>
    </div>
  );
}
