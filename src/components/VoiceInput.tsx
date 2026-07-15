import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 🎤 الإدخال الصوتي — "قل الفاتورة بدل ما تكتبها"
 *
 * يستخدم Web Speech API (ar-SA) لتحويل الصوت لنص، ثم يرسل النص
 * لـ Edge Function اسمها parse-voice تحوله لحقول معاملة جاهزة.
 *
 * الاستخدام داخل نموذج إضافة المعاملة (بجانب زر 📸 صوّر الفاتورة):
 *
 * <VoiceInput categories={allCats} onResult={(tx) => setForm(f => ({ ...f,
 *   type: tx.type, title: tx.title ?? f.title,
 *   amount: tx.amount ? String(tx.amount) : f.amount,
 *   quantity: tx.quantity ? String(tx.quantity) : f.quantity,
 *   unit_price: tx.unit_price ? String(tx.unit_price) : f.unit_price,
 *   category: tx.category ?? f.category }))} />
 *
 * ملاحظة توافق: SpeechRecognition مدعوم في Chrome/Edge/Safari.
 * لو المتصفح ما يدعمه، الزر يختفي تلقائياً.
 */

export interface ParsedTransaction {
  type: 'EXPENSE' | 'INCOME';
  amount: number | null;
  title: string | null;
  category: string | null;
  vendor: string | null;
  quantity: number | null;
  unit_price: number | null;
  confidence: 'high' | 'low';
}

type Phase = 'idle' | 'listening' | 'parsing' | 'done' | 'error';

interface Props {
  categories?: string[];
  onResult: (tx: ParsedTransaction) => void;
}

export default function VoiceInput({ categories = [], onResult }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<InstanceType<typeof window.webkitSpeechRecognition> | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'ar-SA';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };

    rec.onend = () => {
      setPhase((p) => (p === 'listening' ? 'parsing' : p));
    };

    rec.onerror = () => setPhase('error');

    recognitionRef.current = rec;
    return () => rec.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لما يخلص الاستماع → أرسل النص لـ Claude
  useEffect(() => {
    if (phase !== 'parsing') return;
    if (!transcript.trim()) {
      setPhase('idle');
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('parse-voice', {
          body: { transcript, categories },
        });
        if (error) throw error;
        onResult(data as ParsedTransaction);
        setPhase('done');
        setTimeout(() => setPhase('idle'), 2500);
      } catch {
        setPhase('error');
        setTimeout(() => setPhase('idle'), 3000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    setTranscript('');
    setPhase('listening');
    recognitionRef.current?.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  if (!supported) return null;

  return (
    <div dir="rtl">
      <button
        type="button"
        onClick={phase === 'listening' ? stop : start}
        disabled={phase === 'parsing'}
        className={`btn-ghost flex items-center gap-2 transition ${
          phase === 'listening' ? 'border-[#ff3b30] text-[#ff3b30] animate-pulse' : ''
        }`}
      >
        {phase === 'idle' && <>🎤 قل الفاتورة</>}
        {phase === 'listening' && <>⏺ جاري الاستماع… اضغط للإيقاف</>}
        {phase === 'parsing' && <>⏳ أفهم كلامك…</>}
        {phase === 'done' && <span className="text-[#34c759]">✓ تمت التعبئة</span>}
        {phase === 'error' && <span className="text-[#ff3b30]">✕ ما فهمت — جرب مرة ثانية</span>}
      </button>

      {/* النص المنطوق يظهر مباشرة أثناء الكلام */}
      {(phase === 'listening' || phase === 'parsing') && transcript && (
        <p className="fade-in text-sm text-gray-400 mt-2 bg-gray-800/40 rounded-lg px-3 py-2">
          "{transcript}"
        </p>
      )}

      {phase === 'idle' && (
        <p className="text-[11px] text-gray-600 mt-1">
          مثال: "اشتريت خمسين كيس أسمنت من مؤسسة النور بألف وأربعمية ريال"
        </p>
      )}
    </div>
  );
}

// تعريفات TypeScript لـ Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognitionCtor;
    webkitSpeechRecognition: typeof SpeechRecognitionCtor;
  }
}
declare class SpeechRecognitionCtor {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
