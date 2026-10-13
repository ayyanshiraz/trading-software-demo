'use client'

export default function PrintPageButton({ title = "Print Document" }: { title?: string }) {
    return (
        <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-8 py-2 md:py-3 rounded-lg font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition"
        >
            {title}
        </button>
    )
}