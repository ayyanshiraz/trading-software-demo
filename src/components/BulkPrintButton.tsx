'use client'

export default function BulkPrintButton() {
    return (
        <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition"
        >
            Print All Now
        </button>
    )
}