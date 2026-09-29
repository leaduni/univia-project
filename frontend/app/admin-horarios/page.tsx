"use client"

import { useState, useRef, useEffect } from 'react'
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { uploadCargaHorariaExcel } from '@/lib/agenda-service'
import { useAuth } from '@/components/providers/auth-context'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'

export default function AdminHorariosPage() {
  const [file, setFile] = useState<File | null>(null)
  const [ciclo, setCiclo] = useState('2026-II')
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.email !== 'alexandra.peralta.g@uni.pe') {
        router.push('/')
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.email !== 'alexandra.peralta.g@uni.pe') {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6 font-sans">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setResult(null)
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setIsUploading(true)
    setResult(null)

    try {
      const resp = await uploadCargaHorariaExcel(file, ciclo)
      setResult(resp)
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Error desconocido' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6 font-sans w-full max-w-3xl mx-auto">
        <div className="w-full max-w-lg mx-auto bg-[#151522] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            </div>
            Carga Horaria MVP
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Sube el archivo oficial <code>CARGA-HORARIA.xlsx</code> para poblar la base de datos de cursos.
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Ciclo Académico
            </label>
            <input 
              type="text" 
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="w-full bg-[#0B0C10] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ej. 2026-II"
            />
          </div>

          <input 
            type="file" 
            accept=".xlsx,.xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
          />

          {!file ? (
            <div 
              onDragOver={e => e.preventDefault()} 
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all"
            >
              <UploadCloud className="w-10 h-10 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-white mb-1">Haz clic o arrastra tu Excel aquí</p>
                <p className="text-xs text-slate-500">Solo archivos .xlsx o .xls</p>
              </div>
            </div>
          ) : (
            <div className="w-full border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-5 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileSpreadsheet className="w-8 h-8 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => { setFile(null); setResult(null) }}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                Cambiar
              </button>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${result.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {result.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
              <p className="text-sm">{result.message}</p>
            </div>
          )}

          <button 
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="w-full mt-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:shadow-none"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando Excel...
              </>
            ) : (
              'Subir a Base de Datos'
            )}
          </button>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
