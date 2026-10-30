'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportMasterLedgerCSVAction } from '@/actions/actions'

export default function ExportLedgerCSVButton() {
    const [isExporting, setIsExporting] = useState(false)

    // 1. Export Current View Table
    const handleExportCurrent = () => {
        const printArea = document.getElementById('print-area');
        if (!printArea) return alert('No ledger data available to export.');

        const tables = printArea.getElementsByTagName('table');
        if (tables.length === 0) return alert('No tabular data found in the current view.');

        const activeTable = tables[0];
        const rows = activeTable.querySelectorAll('tr');
        const csvData: string[] = [];

        rows.forEach(row => {
            const cols = row.querySelectorAll('th, td');
            const rowData: string[] = [];
            cols.forEach(col => {
                let text = col.textContent?.trim().replace(/"/g, '""') || '';
                text = text.replace(/\n/g, ' | ').replace(/\s+/g, ' ');
                rowData.push(`"${text}"`);
            });
            if (rowData.length > 0) csvData.push(rowData.join(','));
        });

        const csvContent = csvData.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const viewType = new URLSearchParams(window.location.search).get('view') || 'ledger';
        a.download = `${viewType}_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // 2. Export All Master Reports from Database via Server Action
    const handleExportAllMaster = async () => {
        setIsExporting(true)
        try {
            const urlParams = new URLSearchParams(window.location.search)
            const fromDate = urlParams.get('from') || undefined
            const toDate = urlParams.get('to') || undefined

            const csvContent = await exportMasterLedgerCSVAction(fromDate, toDate)
            if (!csvContent) return alert('No data found for master export.')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Master_Ledger_All_Reports_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            alert('Error generating master CSV export.')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 no-print w-full">
            <button 
                type="button" 
                onClick={handleExportCurrent} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
                <Download size={15} /> Export Current CSV
            </button>
            <button 
                type="button" 
                onClick={handleExportAllMaster} 
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition bg-slate-900 text-white hover:bg-black shadow-sm disabled:opacity-50"
            >
                {isExporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} 
                {isExporting ? 'Generating...' : 'Export All Master CSV'}
            </button>
        </div>
    )
}