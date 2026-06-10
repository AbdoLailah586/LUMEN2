import React, { useMemo } from "react";
import { Loader2, ArrowRight, Rows3, Columns3, AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";

export interface PreviewSummary {
    row_count: number;
    column_count: number;
    total_missing: number;
    duplicate_rows: number;
    columns: { name: string; type: string; missing: number }[];
    sample_rows: Record<string, unknown>[];
}

export interface CleaningPreviewData {
    before: PreviewSummary;
    after: PreviewSummary;
    steps: { action: string; description: string }[];
    changes: {
        rows_delta: number;
        columns_delta: number;
        missing_delta: number;
        duplicates_removed: number;
        columns_dropped: string[];
        columns_added: string[];
    };
    preview_note?: string;
}

interface Props {
    preview: CleaningPreviewData | null;
    loading: boolean;
    error?: string;
}

const formatDelta = (value: number, invert = false) => {
    if (value === 0) return { text: "0", className: "text-slate-400" };
    const positive = invert ? value < 0 : value > 0;
    const sign = value > 0 ? "+" : "";
    return {
        text: `${sign}${value}`,
        className: positive ? "text-emerald-400" : "text-amber-400",
    };
};

const DataTable: React.FC<{
    rows: Record<string, unknown>[];
    columns: string[];
    changedCells?: Set<string>;
    variant: "before" | "after";
}> = ({ rows, columns, changedCells, variant }) => {
    if (columns.length === 0) {
        return <p className="text-sm text-slate-500 p-4">No columns to display.</p>;
    }

    return (
        <div className="overflow-x-auto custom-scrollbar max-h-[320px]">
            <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <tr className="text-slate-500 uppercase tracking-wider border-b border-white/5">
                        {columns.map((col) => (
                            <th key={col} className="py-2 px-3 font-bold whitespace-nowrap">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-white/5">
                            {columns.map((col) => {
                                const cellKey = `${rowIdx}:${col}`;
                                const isChanged = changedCells?.has(cellKey);
                                const value = row[col];
                                const display = value === null || value === undefined ? (
                                    <span className="text-amber-400/70 italic">null</span>
                                ) : String(value);

                                return (
                                    <td
                                        key={col}
                                        className={`py-2 px-3 whitespace-nowrap font-mono ${
                                            isChanged
                                                ? variant === "after"
                                                    ? "bg-emerald-500/10 text-emerald-200"
                                                    : "bg-amber-500/10 text-amber-200"
                                                : "text-slate-300"
                                        }`}
                                    >
                                        {display}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const CleaningPreviewPanel: React.FC<Props> = ({ preview, loading, error }) => {
    const { beforeCols, afterCols, changedCells } = useMemo(() => {
        if (!preview) {
            return { beforeCols: [], afterCols: [], changedCells: new Set<string>() };
        }

        const beforeCols = preview.before.sample_rows[0]
            ? Object.keys(preview.before.sample_rows[0])
            : preview.before.columns.map((c) => c.name);
        const afterCols = preview.after.sample_rows[0]
            ? Object.keys(preview.after.sample_rows[0])
            : preview.after.columns.map((c) => c.name);

        const changed = new Set<string>();
        const commonCols = beforeCols.filter((c) => afterCols.includes(c));
        const rowCount = Math.min(
            preview.before.sample_rows.length,
            preview.after.sample_rows.length
        );

        for (let i = 0; i < rowCount; i++) {
            for (const col of commonCols) {
                const b = preview.before.sample_rows[i]?.[col];
                const a = preview.after.sample_rows[i]?.[col];
                if (String(b ?? "") !== String(a ?? "")) {
                    changed.add(`${i}:${col}`);
                }
            }
        }

        return { beforeCols, afterCols, changedCells: changed };
    }, [preview]);

    if (loading) {
        return (
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-indigo-400" size={28} />
                <p className="text-slate-400 text-sm">Generating preview...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
            </div>
        );
    }

    if (!preview) {
        return (
            <div className="bg-slate-900/40 border border-dashed border-white/10 rounded-3xl p-10 text-center text-slate-500 text-sm">
                Adjust cleaning settings to see a live before/after preview.
            </div>
        );
    }

    const { before, after, changes, steps } = preview;
    const rowsDelta = formatDelta(changes.rows_delta);
    const colsDelta = formatDelta(changes.columns_delta);
    const missingDelta = formatDelta(changes.missing_delta, true);

    return (
        <div className="space-y-5">
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: "Rows",
                        before: before.row_count,
                        after: after.row_count,
                        delta: rowsDelta,
                        icon: <Rows3 size={14} />,
                    },
                    {
                        label: "Columns",
                        before: before.column_count,
                        after: after.column_count,
                        delta: colsDelta,
                        icon: <Columns3 size={14} />,
                    },
                    {
                        label: "Missing",
                        before: before.total_missing,
                        after: after.total_missing,
                        delta: missingDelta,
                        icon: <AlertTriangle size={14} />,
                    },
                    {
                        label: "Duplicates",
                        before: before.duplicate_rows,
                        after: after.duplicate_rows,
                        delta: formatDelta(-changes.duplicates_removed, true),
                        icon: <CheckCircle2 size={14} />,
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            {stat.icon}
                            {stat.label}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400">{stat.before}</span>
                            <ArrowRight size={12} className="text-slate-600" />
                            <span className="text-white font-bold">{stat.after}</span>
                            <span className={`text-xs font-bold ml-auto ${stat.delta.className}`}>
                                {stat.delta.text}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {(changes.columns_dropped.length > 0 || changes.columns_added.length > 0) && (
                <div className="flex flex-wrap gap-2 text-xs">
                    {changes.columns_dropped.map((col) => (
                        <span key={`drop-${col}`} className="px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                            Dropped: {col}
                        </span>
                    ))}
                    {changes.columns_added.map((col) => (
                        <span key={`add-${col}`} className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Added: {col}
                        </span>
                    ))}
                </div>
            )}

            {/* Side-by-side tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5 bg-slate-800/30">
                        <h4 className="text-sm font-bold text-slate-300">Before</h4>
                    </div>
                    <DataTable
                        rows={before.sample_rows}
                        columns={beforeCols}
                        changedCells={changedCells}
                        variant="before"
                    />
                </div>
                <div className="bg-slate-900/40 border border-emerald-500/20 rounded-3xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                        <h4 className="text-sm font-bold text-emerald-300">After</h4>
                    </div>
                    <DataTable
                        rows={after.sample_rows}
                        columns={afterCols}
                        changedCells={changedCells}
                        variant="after"
                    />
                </div>
            </div>

            {/* Steps log */}
            {steps.length > 0 && (
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                        <ListChecks size={16} className="text-indigo-400" />
                        Pipeline Steps ({steps.length})
                    </h4>
                    <ul className="space-y-2">
                        {steps.map((step, idx) => (
                            <li key={idx} className="text-xs text-slate-400 flex gap-2">
                                <span className="text-indigo-400 font-bold shrink-0">{idx + 1}.</span>
                                {step.description}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {preview.preview_note && (
                <p className="text-[11px] text-slate-600 text-center">{preview.preview_note}</p>
            )}
        </div>
    );
};

export default CleaningPreviewPanel;
