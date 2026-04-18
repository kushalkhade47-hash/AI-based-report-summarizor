/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clipboard, 
  Activity, 
  Pill, 
  Calendar, 
  HelpCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Brain,
  Upload,
  RefreshCw,
  FileText,
  LogOut,
  Languages,
  Image as ImageIcon,
  FileUp as FileUpload,
  X,
  BarChart2,
  Volume2,
  VolumeX,
  History,
  Info,
  Layers,
  Dna,
  Zap,
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Apple,
  Dumbbell,
  Bell,
  BellRing,
  Clock,
  MessageSquare,
  AlertTriangle,
  Navigation,
  Phone,
  Send,
  User as UserIcon,
  Download,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { MedicalSummary } from './types';
import { summarizeMedicalReport, chatWithAI } from './services/gemini';

const DEMO_REPORT = `
PATIENT: JOHN DOE
REPORT TYPE: RADIOLOGY (CHEST X-RAY)
FINDINGS:
There is a 2.5 cm spiculated mass in the left upper lobe with associated pleural thickening. 
No pleural effusion is identified. The mediastinum is unremarkable. 
The heart size is within normal limits. 
Bony structures show degenerative changes in the thoracic spine.
IMPRESSION:
Suspect bronchogenic carcinoma. RECOMMENDATION: CT scan of the chest with contrast for further evaluation and PET-CT as indicated.
`;

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Hindi (हिंदी)', value: 'Hindi' },
  { label: 'Marathi (मराठी)', value: 'Marathi' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [fileName, setFileName] = useState<string | null>(null);
  const [reportFileData, setReportFileData] = useState<{ data: string; mimeType: string } | null>(null);
  const [history, setHistory] = useState<MedicalSummary[]>(() => {
    const saved = localStorage.getItem('medclarify_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'history' | 'compare' | 'chat' | 'emergency'>('upload');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [emergencyResults, setEmergencyResults] = useState<{ name: string; distance: string; doctors: string[]; address: string }[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [analysisTimer, setAnalysisTimer] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useState(() => {
    // Simulate a notification if diet plan was assigned but not followed (mock logic)
    const timer = setTimeout(() => {
      if (history.length > 0) {
        setNotification({
          message: "Daily Check-in: Have you followed your heart-healthy diet today? Remember consistency is key.",
          type: 'info'
        });
      }
    }, 5000);
    return () => clearTimeout(timer);
  });

  const speak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = { role: 'user' as const, parts: [{ text: chatInput }] };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await chatWithAI(chatInput, chatMessages, summary || undefined);
      setChatMessages([...newMessages, { role: 'model', parts: [{ text: response }] }]);
    } catch (err) {
      setError('AI Assistant is currently unavailable.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleEmergencySearch = () => {
    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      () => {
        setTimeout(() => {
          setEmergencyResults([
            { name: "City General Hospital", distance: "0.8 km", doctors: ["Dr. Sarah Miller (Emergency Medicine)", "Dr. James Wilson (Radiology)"], address: "123 Medical Blvd" },
            { name: "St. Jude Medical Center", distance: "1.5 km", doctors: ["Dr. Robert Chen (Cardiology)", "Dr. Elena Rossi (Neurology)"], address: "456 Health St" },
            { name: "Emergency Care East", distance: "2.1 km", doctors: ["Dr. Michael Brown (Surgery)"], address: "789 Trauma Rd" }
          ]);
          setLocationLoading(false);
        }, 1500);
      },
      () => {
        setEmergencyResults([
          { name: "Global Emergency Response", distance: "Varies", doctors: ["Paramedic Teams", "Triage Specialists"], address: "Dial Emergency Services" },
          { name: "Distance Health Center", distance: "3.5 km", doctors: ["Dr. Lisa Vance"], address: "101 Wellness Way" }
        ]);
        setLocationLoading(false);
      }
    );
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setUser({ email });
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      setError('Please upload an image (PNG, JPG) or a PDF file.');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      const strippedData = base64Data.split(',')[1];
      
      setReportFileData({
        data: strippedData,
        mimeType: file.type
      });
      setFileName(file.name);
      setInputText(''); 
      setLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSummarize = async () => {
    if (!inputText.trim() && !reportFileData) return;
    setLoading(true);
    setError(null);
    setAnalysisTimer(0);
    
    // Start timing
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setAnalysisTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const result = await summarizeMedicalReport(
        reportFileData ? { file: reportFileData } : { text: inputText },
        selectedLanguage
      );
      setSummary(result);
      const newHistory = [result, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('medclarify_history', JSON.stringify(newHistory));
      setActiveTab('dashboard'); // Switch back to dashboard to see results
    } catch (err: any) {
      setError(err.message || 'Failed to summarize.');
    } finally {
      setLoading(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDeleteHistory = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    localStorage.setItem('medclarify_history', JSON.stringify(newHistory));
    setNotification({ message: "Report removed from history.", type: 'info' });
    setTimeout(() => setNotification(null), 3000);
  };

  const downloadPDF = async () => {
    if (!summary) return;
    const element = document.getElementById('report-content');
    if (!element) return;

    setLoading(true);
    setNotification({ message: "Generating PDF. Please wait...", type: 'info' });

    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`MedClarify_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setNotification({ message: "PDF Downloaded Successfully!", type: 'info' });
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF.");
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const loadDemo = () => {
    setInputText(DEMO_REPORT);
    setFileName('Sample_Report.txt');
    setReportFileData(null);
  };

  const reset = () => {
    setInputText('');
    setFileName(null);
    setReportFileData(null);
    setSummary(null);
    setError(null);
  };

  const logout = () => {
    setUser(null);
    reset();
  };

  if (!user) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-medical-700 p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Activity size={32} />
              </div>
              <span className="font-serif text-3xl font-bold tracking-tight">MedClarify</span>
            </div>
            <h1 className="text-6xl font-serif font-bold leading-tight mb-6">
              Making medical reports <span className="text-medical-200">accessible</span> to everyone.
            </h1>
            <p className="text-xl text-medical-100 max-w-md">
              MedClarify uses advanced AI to translate complex clinical documents into plain, understandable language for patients and families.
            </p>
          </div>
          <div className="relative z-10 flex gap-12 border-t border-white/10 pt-12">
            <div>
              <p className="text-4xl font-bold mb-1">99%</p>
              <p className="text-sm text-medical-200 uppercase tracking-widest font-bold">Accuracy</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-1">10k+</p>
              <p className="text-sm text-medical-200 uppercase tracking-widest font-bold">Processed</p>
            </div>
          </div>
          {/* Decorative background circle */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-medical-600 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="flex items-center justify-center p-8 bg-slate-50">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
            <div className="lg:hidden text-center mb-12">
              <Activity className="mx-auto text-medical-600 mb-4" size={48} />
              <h1 className="text-3xl font-serif font-bold text-slate-900">MedClarify</h1>
            </div>

            <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200/50">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">{authView === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-slate-500 mt-1">Please enter your details to continue.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-medical-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-medical-500" required />
                </div>
                <button type="submit" className="w-full bg-medical-700 py-5 rounded-2xl text-white font-bold text-lg shadow-xl shadow-medical-200 hover:bg-medical-800 transition-all flex items-center justify-center gap-2">
                  {authView === 'login' ? 'Sign In' : 'Sign Up'} <ArrowRight size={20} />
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                <button onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')} className="text-slate-500 hover:text-medical-600 font-medium">
                  {authView === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 z-[60]">
        <div className="p-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-medical-600 text-white p-2 rounded-xl">
              <Activity size={24} />
            </div>
            <span className="font-serif text-2xl font-bold text-slate-900 tracking-tight">MedClarify</span>
          </div>

          <nav className="space-y-4">
            {[
              { id: 'upload', icon: FilePlus, label: 'Upload Report' },
              { id: 'dashboard', icon: LayoutDashboard, label: 'Current View' },
              { id: 'history', icon: History, label: 'My Reports' },
              { id: 'compare', icon: RefreshCw, label: 'Compare Analytics' },
              { id: 'chat', icon: MessageSquare, label: 'AI Assistant' },
              { id: 'emergency', icon: AlertTriangle, label: 'Emergency' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-medical-700 text-white shadow-xl shadow-medical-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-medical-600'
                }`}
              >
                <item.icon size={22} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-10 border-t border-slate-50">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-full bg-medical-50 flex items-center justify-center font-bold text-medical-700">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-black text-black leading-none">{user.email.split('@')[0]}</p>
              <button onClick={logout} className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-1 hover:underline text-left">Sign Out</button>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Pro Version</p>
            <p className="text-xs font-bold text-black leading-relaxed">Early access to clinical datasets and predictive risk modelling.</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen relative">
        {/* Analysis Loader Overlay */}
        <AnimatePresence>
          {loading && activeTab === 'upload' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-2xl flex items-center justify-center p-8"
            >
              <div className="max-w-md w-full text-center space-y-8">
                <div className="relative">
                  <div className="h-48 w-48 mx-auto rounded-full border-4 border-slate-100 flex items-center justify-center relative shadow-inner">
                    <Activity className="text-medical-600 animate-pulse" size={64} />
                    <svg className="absolute -inset-1 transform -rotate-90">
                      <circle
                        cx="98"
                        cy="98"
                        r="94"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-medical-600"
                        strokeDasharray={590}
                        strokeDashoffset={590 - (Math.min(analysisTimer, 30) / 30) * 590}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-2 rounded-full font-black text-xl shadow-2xl">
                    {analysisTimer}s
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-4xl font-serif font-black text-black leading-none uppercase tracking-tighter italic">Deep Scanning...</h3>
                  <div className="h-12 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.p 
                        key={analysisTimer % 4}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-medical-600 font-black uppercase tracking-[0.2em] text-[10px]"
                      >
                        {analysisTimer < 5 ? 'Decoding Clinical Jargon' : 
                         analysisTimer < 10 ? 'Analyzing Pathological Markers' : 
                         analysisTimer < 15 ? 'Generating Anatomy Projections' : 
                         'Finalizing Care Plan Protocol'}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
                
                <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm leading-relaxed">
                  Our clinical engine is mapping complex report data into patient-friendly insights. This usually takes 10-20 seconds.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Overlay */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-0 left-1/2 z-[100] w-full max-w-md"
            >
              <div className={`p-6 rounded-[32px] shadow-2xl flex items-start gap-4 ${notification.type === 'warning' ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
                <div className="bg-white/20 p-2 rounded-xl shrink-0">
                  <BellRing size={20} />
                </div>
                <div>
                  <p className="font-black text-base leading-tight mb-1">Health Update</p>
                  <p className="text-sm font-bold opacity-80 leading-snug">{notification.message}</p>
                  <button onClick={() => setNotification(null)} className="mt-3 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all">Dismiss</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="p-12 pb-0 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif font-black text-black capitalize">
              {activeTab === 'dashboard' ? 'Current' : 
               activeTab === 'chat' ? 'AI Assistant' : 
               activeTab === 'emergency' ? 'Emergency Assistance' : 
               activeTab}
            </h1>
            <p className="text-slate-500 mt-2 font-bold tracking-tight">Your intelligent medical companion.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-medical-600 transition-all relative">
              <Bell size={24} />
              <span className="absolute top-4 right-4 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-12">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && summary ? (
            <motion.div key="dashboard-res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="print-section">
              <div id="report-content" className="p-4 rounded-[48px] bg-white">
                {/* Dashboard Results View - Rearranged */}
                <div className="grid grid-cols-12 gap-10">
                {/* Left Column: Risk & Anatomy */}
                <div className="col-span-12 lg:col-span-4 space-y-10">
                  <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-8">
                      <Zap className="text-amber-500 fill-amber-500" size={28} />
                      <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Predictive Risk</h3>
                    </div>
                    <RiskGauge score={summary.riskScore} label={summary.urgencyLabel} />
                    <div className="mt-10 p-6 rounded-[32px] bg-slate-50 border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 italic">Clinical Level</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${summary.riskLevel === 'high' ? 'text-red-600' : 'text-medical-600'}`}>{summary.riskLevel.toUpperCase()}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm">{summary.urgencyLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-10 pb-4">
                      <div className="flex items-center gap-3">
                        <Dna className="text-medical-600" size={28} />
                        <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Anatomical Focus</h3>
                      </div>
                    </div>
                    <AnatomyMap tags={summary.anatomicalTags} />
                  </div>
                </div>

                {/* Middle/Center: Metrics & Plans */}
                <div className="col-span-12 lg:col-span-8 space-y-10">
                  {summary.healthMetrics && summary.healthMetrics.length > 0 && (
                    <section className="bg-white rounded-[48px] p-12 shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 mb-10">
                        <BarChart2 className="text-medical-600" size={32} />
                        <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Vital Metrics Comparison</h3>
                      </div>
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary.healthMetrics} layout="vertical" margin={{ left: 30, right: 40, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                              dataKey="category" 
                              type="category" 
                              width={120} 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#000', fontSize: 13, fontWeight: 900 }} 
                            />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-black text-white p-5 rounded-[24px] shadow-2xl border border-white/10">
                                      <p className="uppercase tracking-[0.2em] mb-2 opacity-50 font-black text-[10px]">{data.category}</p>
                                      <p className="text-2xl font-black">{data.score}/100</p>
                                      <p className="text-medical-400 mt-2 font-bold text-xs italic">{data.label}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="score" radius={[0, 16, 16, 0]} barSize={32}>
                              {summary.healthMetrics.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.score > 80 ? '#10b981' : entry.score > 50 ? '#f59e0b' : '#ef4444'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}

                  {/* Lifestyle Interventions: Diet & Exercise */}
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex flex-col">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-green-50 text-green-600 p-3 rounded-2xl"><Apple size={28} /></div>
                        <h3 className="text-2xl font-black text-black tracking-tighter uppercase">Diet Plan</h3>
                      </div>
                      <div className="space-y-6 flex-1">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Include Daily</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.dietPlan.allowed.map((f, i) => (
                              <span key={i} className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-black border border-green-100">{f}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 font-serif italic text-red-500">Strictly Avoid</p>
                          <ul className="space-y-2">
                            {summary.dietPlan.avoid.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                <X size={14} className="text-red-500" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-8 pt-8 border-t border-slate-50">
                        <p className="text-sm font-black text-black flex items-center gap-2">{summary.dietPlan.timing}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl"><Dumbbell size={28} /></div>
                        <h3 className="text-2xl font-black text-black tracking-tighter uppercase">Exercise</h3>
                      </div>
                      <div className="space-y-6">
                         <ul className="space-y-4">
                            {summary.exercisePlan.recommendations.map((e, i) => (
                              <li key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0"><Zap size={12}/></div>
                                <p className="text-sm font-bold text-slate-700 leading-snug">{e}</p>
                              </li>
                            ))}
                         </ul>
                         <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                           <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 flex items-center gap-2 font-serif italic"><AlertCircle size={10}/> Precautions</p>
                           <p className="text-xs font-bold text-red-900 leading-relaxed">{summary.exercisePlan.precautions.join(" • ")}</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Medications & Prescription Care */}
                  <div className="grid grid-cols-1 gap-10">
                    <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-50">
                      <h3 className="flex items-center gap-3 font-black uppercase text-sm tracking-[0.2em] text-black mb-8 border-b-2 border-slate-100 pb-6"><Pill size={24} className="text-medical-600"/> Prescription Care Protocol</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {summary.medications.length > 0 ? summary.medications.map((m, i) => (
                          <div key={i} className="p-8 rounded-[40px] bg-slate-50 border-2 border-transparent hover:border-medical-500 transition-all shadow-sm group">
                            <p className="font-black text-black text-2xl leading-none tracking-tight mb-4">{m.name}</p>
                            <span className="text-xs text-medical-700 font-extrabold uppercase tracking-widest bg-medical-100 px-4 py-1.5 rounded-full">{m.dosage}</span>
                            <div className="h-px bg-slate-200 my-6 group-hover:bg-medical-200 transition-colors" />
                            <p className="text-sm text-slate-600 font-bold italic leading-relaxed">{m.purpose}</p>
                          </div>
                        )) : <p className="text-sm text-slate-400 font-bold italic">No medications recorded.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Extra Care Info */}
                  <div className="bg-black rounded-[64px] p-16 text-white relative overflow-hidden grid md:grid-cols-2 gap-16 shadow-2xl border border-white/5 mt-10">
                    <div className="relative z-10">
                      <h3 className="flex items-center gap-4 text-4xl font-serif font-black mb-10 uppercase tracking-tighter">Care Plan & Next Steps</h3>
                      <div className="space-y-6">
                        {summary.nextSteps.map((s, i) => (
                          <div key={i} className="flex gap-6 p-8 rounded-[40px] bg-white/[0.03] backdrop-blur-xl border border-white/10 items-center shadow-2xl hover:bg-white/[0.05] transition-colors">
                            <span className="h-16 w-16 shrink-0 rounded-full bg-medical-600 flex items-center justify-center font-black text-2xl shadow-[0_0_40px_rgba(37,99,235,0.3)]">{i+1}</span>
                            <p className="font-black text-2xl leading-tight tracking-tight text-white">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h3 className="flex items-center gap-4 text-4xl font-serif font-black mb-10 italic uppercase tracking-tighter text-white/90">Consultation Guide</h3>
                      <div className="space-y-4">
                        {summary.suggestedQuestions.map((q, i) => (
                          <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 text-xl text-white font-black leading-relaxed shadow-inner hover:bg-white/[0.05] transition-colors">
                            “{q}”
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-medical-600/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-medical-900/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
                  </div>
                </div>

                {/* AI Core Features Showcase */}
                  <div className="mt-16 mb-12">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="h-px bg-slate-200 flex-1" />
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] px-4">AI Core Capabilities</h3>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-6">
                      {[
                        { icon: Brain, title: "Vision Analytics", desc: "Processes PDFs and scans with clinical-grade precision." },
                        { icon: Languages, title: "Global Dialog", desc: "Translates complex jargon into 10+ local languages." },
                        { icon: Zap, title: "Risk Modeling", desc: "Predictive scoring based on longitudinal health data." },
                        { icon: MessageSquare, title: "Smart Chat", desc: "Real-time Q&A that remembers your specific clinical history." }
                      ].map((feature, i) => (
                        <div key={i} className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                          <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-medical-600 mb-6 shadow-sm group-hover:bg-medical-600 group-hover:text-white transition-colors">
                            <feature.icon size={24} />
                          </div>
                          <h4 className="text-lg font-black text-black mb-2 tracking-tight">{feature.title}</h4>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{feature.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 flex justify-center">
                      <button 
                        onClick={downloadPDF}
                        disabled={loading}
                        className="bg-medical-700 text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-4 hover:bg-medical-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        <Download size={20} /> Export Summary as PDF
                      </button>
                    </div>
                  </div>

                  <div className="mt-12 bg-amber-50 rounded-3xl p-8 border border-amber-100 text-center">
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2"><AlertCircle size={14}/> Important Medical Information</p>
                    <p className="text-sm text-amber-900 leading-relaxed max-w-3xl mx-auto italic font-medium">
                      MedClarify is an AI assistant, not a medical professional. This summary is intended to help you understand your report, but should never replace a consultation with your doctor. Always discuss AI findings with a licensed healthcare provider before taking any medical action.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'upload' || (activeTab === 'dashboard' && !summary) ? (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="max-w-4xl mx-auto">
              <div className="mb-12 text-center">
                <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4 italic">Simplify <span className="text-medical-600 not-italic">Clinical Reports.</span></h2>
                <p className="text-xl text-slate-500 max-w-xl mx-auto font-bold tracking-tight">AI-powered medical assistant that translates complex scans into plain language.</p>
              </div>

              <div className="bg-white rounded-[48px] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] border border-slate-100">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group cursor-pointer border-2 border-dashed rounded-[32px] transition-all p-16 flex flex-col items-center justify-center ${
                    fileName ? 'bg-medical-50/20 border-medical-500' : 'bg-slate-50/50 border-slate-200 hover:border-medical-400 hover:bg-white'
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" />
                  {fileName ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-medical-600 text-white p-6 rounded-[24px] shadow-2xl mb-6">
                        {reportFileData?.mimeType === 'application/pdf' ? <FileText size={72} /> : <ImageIcon size={72} />}
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mb-2">{fileName}</p>
                      <button className="text-medical-600 font-bold text-sm hover:underline flex items-center gap-1"><RefreshCw size={14}/> Change File</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-8 rounded-full shadow-lg text-slate-300 group-hover:text-medical-500 group-hover:bg-medical-50 transition-all mb-8 shadow-slate-200/50"><FileUpload size={64} /></div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">Upload Medical Report</h3>
                      <p className="text-slate-500">Upload a scan (JPG, PNG) or PDF document. Max 10MB.</p>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-100">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Languages size={14}/> Translate Output To</label>
                    <div className="flex gap-2">
                      {LANGUAGES.map(lang => (
                        <button key={lang.value} onClick={() => setSelectedLanguage(lang.value)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border ${selectedLanguage === lang.value ? 'bg-medical-600 border-medical-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSummarize} disabled={loading || (!inputText && !reportFileData)} className="bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white px-12 py-4 rounded-full font-black shadow-2xl shadow-medical-100 flex items-center gap-3 group transition-all h-fit active:scale-95">
                    {loading ? <RefreshCw className="animate-spin" /> : <>Turbo Analysis <Zap className="group-hover:scale-110 text-amber-400" size={18} /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-serif font-black text-black">Analysis History</h2>
                <div className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-500">{history.length} Reports Saved</div>
              </div>
              <div className="grid gap-6">
                {history.length > 0 ? history.map((h, i) => (
                  <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-medical-500 transition-all cursor-pointer" onClick={() => { setSummary(h); setActiveTab('dashboard'); }}>
                    <div className="flex items-center gap-8">
                      <div className={`p-6 rounded-[32px] ${h.riskLevel === 'high' ? 'bg-red-50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-medical-50 text-medical-600 shadow-[0_0_20px_rgba(37,99,235,0.1)]'}`}>
                        <FileText size={40} />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-black text-black tracking-tight">{h.summary.substring(0, 50)}...</p>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${h.riskLevel === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-medical-600 text-white shadow-lg shadow-medical-100'}`}>
                            {h.riskLevel} Risk
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                          <span className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg"><Calendar size={14}/> {new Date(h.timestamp).toLocaleDateString()}</span>
                          <span className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg"><Activity size={14}/> {h.urgencyLabel}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap pt-1">
                          {h.anatomicalTags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Score</p>
                        <p className="text-3xl font-black text-black tracking-tighter">{h.riskScore}</p>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteHistory(i, e)}
                        className="h-12 w-12 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                      >
                        <Trash2 size={20} />
                      </button>
                      <div className="h-16 w-16 rounded-3xl bg-medical-50 text-medical-600 flex items-center justify-center group-hover:bg-medical-700 group-hover:text-white transition-all shadow-inner">
                        <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-24 bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-200">
                    <History size={64} className="mx-auto text-slate-300 mb-6" />
                    <p className="text-2xl font-bold text-slate-400">No history found yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'chat' ? (
            <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-[calc(100vh-200px)] flex flex-col bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-black text-black tracking-tight">AI Health Assistant</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Clinical Q&A</p>
                 </div>
                 {summary && (
                   <div className="bg-medical-100 text-medical-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                     <Brain size={14}/> Context: Active Report
                   </div>
                 )}
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {chatMessages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                     <div className="bg-medical-50 p-6 rounded-full text-medical-600"><MessageSquare size={48} /></div>
                     <h3 className="text-xl font-bold text-slate-900">How can I help you today?</h3>
                     <p className="text-slate-400 max-w-sm">Ask about your recent findings, dietary needs, or clarify medical terms.</p>
                   </div>
                 )}
                 {chatMessages.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] p-6 rounded-[32px] font-bold leading-relaxed ${
                       msg.role === 'user' 
                         ? 'bg-medical-700 text-white shadow-xl rounded-tr-none' 
                         : 'bg-slate-100 text-slate-900 rounded-tl-none'
                     }`}>
                       {msg.parts[0].text}
                     </div>
                   </div>
                 ))}
                 {chatLoading && (
                   <div className="flex justify-start">
                     <div className="bg-slate-50 text-slate-400 p-6 rounded-[32px] rounded-tl-none border border-slate-100 animate-pulse font-bold italic">
                       Thinking...
                     </div>
                   </div>
                 )}
               </div>

               <div className="p-8 border-t border-slate-100">
                 <div className="relative">
                   <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                     placeholder="Type your question here..."
                     className="w-full pl-8 pr-16 py-6 rounded-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-medical-500 transition-all font-bold outline-none shadow-inner"
                   />
                   <button 
                     onClick={handleSendMessage}
                     disabled={chatLoading}
                     className="absolute right-3 top-1/2 -translate-y-1/2 h-14 w-14 bg-medical-700 text-white rounded-full flex items-center justify-center hover:bg-medical-800 transition-colors shadow-lg active:scale-95"
                   >
                     <Send size={24} />
                   </button>
                 </div>
                 <p className="text-center mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                   Note: MedClarify AI is for informational purposes only. Consult a doctor for medical decisions.
                 </p>
               </div>
            </motion.div>
          ) : activeTab === 'emergency' ? (
            <motion.div key="emergency" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
               <div className="bg-red-600 rounded-[56px] p-16 text-white overflow-hidden relative shadow-2xl shadow-red-200">
                 <div className="relative z-10 max-w-2xl">
                   <h2 className="text-6xl font-serif font-black mb-6 uppercase tracking-tighter leading-tight italic">Emergency Assistance</h2>
                   <p className="text-2xl font-bold text-red-100 mb-10 leading-relaxed">
                     In case of a life-threatening emergency, please dial your local emergency services (e.g., 911) immediately.
                   </p>
                   <button 
                     onClick={handleEmergencySearch}
                     className="bg-white text-red-600 px-12 py-5 rounded-full font-black text-xl uppercase tracking-widest flex items-center gap-4 hover:bg-red-50 transition-all shadow-2xl active:scale-95"
                   >
                     {locationLoading ? <RefreshCw className="animate-spin" /> : <><Navigation size={24}/> Find Specialized Care Near Me</>}
                   </button>
                 </div>
                 <AlertTriangle size={300} className="absolute -right-20 -bottom-20 text-white/10 rotate-12" />
               </div>

               {emergencyResults.length > 0 && (
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {emergencyResults.map((h, i) => (
                     <div key={i} className="bg-white p-10 rounded-[48px] shadow-xl border border-slate-100 hover:border-red-500/50 transition-all group relative overflow-hidden">
                       <div className="relative z-10">
                         <div className="flex items-center gap-2 text-red-500 mb-6 bg-red-50 w-fit px-4 py-1.5 rounded-full">
                           <Phone size={14}/>
                           <span className="text-[10px] font-black uppercase tracking-widest">Emergency Line Active</span>
                         </div>
                         <h3 className="text-3xl font-black text-black mb-2 tracking-tight">{h.name}</h3>
                         <div className="flex items-center gap-2 text-slate-400 font-bold mb-8">
                           <Navigation size={14}/> {h.distance}
                         </div>
                         
                         <div className="space-y-6">
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Available Specialists</p>
                             <div className="space-y-2">
                               {h.doctors.map((doc, idx) => (
                                 <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                   <div className="h-2 w-2 rounded-full bg-medical-500" />
                                   <p className="text-sm font-black text-slate-900">{doc}</p>
                                 </div>
                               ))}
                             </div>
                           </div>
                           <div className="pt-6 border-t border-slate-100">
                             <p className="text-xs font-bold text-slate-500 italic mb-1">{h.address}</p>
                             <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] mt-4 hover:bg-slate-800 transition-colors">Start Navigation</button>
                           </div>
                         </div>
                       </div>
                       <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                     </div>
                   ))}
                 </div>
               )}

               <div className="grid md:grid-cols-3 gap-8">
                 <div className="bg-medical-700 p-10 rounded-[40px] text-white">
                   <Phone size={32} className="mb-6" />
                   <h4 className="text-xl font-black mb-2 uppercase italic">General Helpline</h4>
                   <p className="font-bold opacity-80 mb-6">Non-emergency support and doctor references.</p>
                   <p className="text-2xl font-black tracking-widest">0800-DOCTOR</p>
                 </div>
                 <div className="bg-slate-900 p-10 rounded-[40px] text-white">
                   <HelpCircle size={32} className="mb-6" />
                   <h4 className="text-xl font-black mb-2 uppercase italic">Pharmacy Support</h4>
                   <p className="font-bold opacity-80 mb-6">Check 24/7 medicine availability.</p>
                   <p className="text-2xl font-black tracking-widest">1-800-PHARMA</p>
                 </div>
                 <div className="bg-red-50 p-10 rounded-[40px] border border-red-100">
                   <Pill size={32} className="mb-6 text-red-600" />
                   <h4 className="text-xl font-black mb-2 uppercase italic text-red-900">Life Threatening</h4>
                   <p className="font-bold text-red-700 mb-6">Universal Emergency Line.</p>
                   <p className="text-4xl font-black tracking-tighter text-red-600">911</p>
                 </div>
               </div>
            </motion.div>
          ) : activeTab === 'compare' ? (
            <motion.div key="compare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="mb-12">
                <h2 className="text-4xl font-serif font-black text-black mb-4">Compare Reports</h2>
                <p className="text-slate-500 max-w-2xl">Select two reports from your history to see how your health metrics have evolved over time.</p>
              </div>
              {history.length >= 2 ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {history.slice(0, 2).map((h, i) => (
                    <div key={i} className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-600 bg-medical-50 px-3 py-1 rounded-full">{i === 0 ? 'Current' : 'Previous'}</span>
                        <span className="text-sm font-bold text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                      </div>
                      <RiskGauge score={h.riskScore} label={h.urgencyLabel} />
                      <div className="mt-8 space-y-4">
                        {h.healthMetrics.map((m, mi) => (
                          <div key={mi} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                            <span className="text-sm font-black text-black">{m.category}</span>
                            <span className={`text-sm font-black ${m.score > 80 ? 'text-green-600' : 'text-amber-600'}`}>{m.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="col-span-full bg-medical-700 p-12 rounded-[56px] text-white overflow-hidden relative">
                    <div className="relative z-10">
                      <h3 className="text-3xl font-serif font-black mb-4">Evolution Analysis</h3>
                      <p className="text-xl text-medical-100 leading-relaxed font-bold">
                        Comparing these results shows a {history[0].riskScore < history[1].riskScore ? 'favorable trend' : 'potential concern'} in your {history[0].anatomicalTags[0] || 'health'} metrics. This data is essential for your next follow-up.
                      </p>
                    </div>
                    <RefreshCw className="absolute top-1/2 right-12 text-white/5 size-48 -translate-y-1/2 rotate-12" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 bg-slate-100 rounded-[48px]">
                  <p className="text-xl font-bold text-slate-400">Please analyze at least two reports to use comparison mode.</p>
                  <button onClick={() => setActiveTab('current')} className="mt-6 bg-medical-700 text-white px-8 py-3 rounded-full font-bold shadow-lg">Start New Analysis</button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>
      </main>

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl">
          <div className="relative mb-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border-8 border-slate-100 border-t-medical-600 rounded-full shadow-inner" />
            <Activity className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-medical-600" size={32} />
          </div>
          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-serif text-3xl font-bold text-slate-900 italic">Parsing Clinical Data...</motion.p>
          <p className="text-slate-400 mt-2 font-medium tracking-wide font-mono text-xs uppercase">Decoding Terminology • Translating Medical Context</p>
        </motion.div>
      )}
    </div>
  );
}

// --- NEW COMPONENTS ---

function RiskGauge({ score, label }: { score: number; label: string }) {
  const data = [
    { name: 'Risk', value: score },
    { name: 'Remaining', value: 100 - score },
  ];
  const COLORS = [score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981', '#f1f5f9'];

  return (
    <div className="relative h-48 w-48 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
        <span className="text-3xl font-black text-black leading-none">{score}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Risk Score</span>
        <span className={`text-[10px] font-black uppercase mt-1 ${score > 70 ? 'text-red-600' : score > 40 ? 'text-amber-600' : 'text-green-600'}`}>{label}</span>
      </div>
    </div>
  );
}

function AnatomyMap({ tags }: { tags: string[] }) {
  const normalizedTags = tags.map(t => t.toLowerCase());
  const isHighlighted = (part: string) => normalizedTags.some(t => t.includes(part));

  return (
    <div className="relative bg-slate-50 rounded-[40px] p-8 flex items-center justify-center border border-slate-100 overflow-hidden group h-full min-h-[400px]">
      <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
          <Layers size={18} className="text-medical-600 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">Anatomical Insight</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Interactive 3D Mapping</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <svg viewBox="0 0 200 400" className="h-72 md:h-96 w-auto filter drop-shadow-2xl transition-all duration-700 group-hover:scale-105">
          {/* Stylized Human Silhouette */}
          <g className="transition-all duration-500">
            {/* Head/Brain */}
            <circle 
              cx="100" cy="50" r="32" 
              fill={isHighlighted('head') || isHighlighted('brain') || isHighlighted('skull') ? '#2563eb' : '#cbd5e1'} 
              className={isHighlighted('head') || isHighlighted('brain') ? 'animate-pulse' : ''}
              opacity={isHighlighted('head') ? 1 : 0.3} 
            />
            {/* Neck */}
            <rect x="92" y="80" width="16" height="15" fill={isHighlighted('neck') ? '#2563eb' : '#cbd5e1'} opacity={0.3} />
            {/* Torso */}
            <path 
              d="M60 100 L140 100 L155 230 L45 230 Z" 
              fill={isHighlighted('chest') || isHighlighted('lung') || isHighlighted('heart') || isHighlighted('breast') ? '#2563eb' : '#cbd5e1'} 
              className={isHighlighted('chest') || isHighlighted('heart') || isHighlighted('lung') ? 'animate-pulse' : ''}
              opacity={isHighlighted('chest') || isHighlighted('lung') || isHighlighted('heart') ? 1 : 0.3} 
            />
            {/* Abdomen */}
            <path 
              d="M45 230 L155 230 L145 320 L55 320 Z" 
              fill={isHighlighted('abdomen') || isHighlighted('stomach') || isHighlighted('liver') || isHighlighted('kidney') || isHighlighted('pelvis') ? '#2563eb' : '#cbd5e1'} 
              opacity={isHighlighted('abdomen') ? 1 : 0.3} 
            />
            {/* Arms */}
            <path d="M60 110 L15 190 L30 205 L70 135 Z" fill={isHighlighted('arm') || isHighlighted('hand') || isHighlighted('shoulder') ? '#2563eb' : '#cbd5e1'} opacity={0.3} />
            <path d="M140 110 L185 190 L170 205 L130 135 Z" fill={isHighlighted('arm') || isHighlighted('hand') || isHighlighted('shoulder') ? '#2563eb' : '#cbd5e1'} opacity={0.3} />
            {/* Legs */}
            <path d="M65 320 L55 420 L90 420 L95 320 Z" fill={isHighlighted('leg') || isHighlighted('knee') || isHighlighted('foot') || isHighlighted('bone') ? '#2563eb' : '#cbd5e1'} opacity={0.3} />
            <path d="M135 320 L145 420 L110 420 L105 320 Z" fill={isHighlighted('leg') || isHighlighted('knee') || isHighlighted('foot') || isHighlighted('bone') ? '#2563eb' : '#cbd5e1'} opacity={0.3} />
          </g>

          {/* Organs / Specific indicators */}
          {isHighlighted('heart') && <path d="M95 130 Q100 120 105 130 L100 140 Z" fill="#ef4444" className="animate-bounce" />}
          {isHighlighted('lung') && (
            <>
              <ellipse cx="85" cy="140" rx="8" ry="15" fill="#ef4444" opacity={0.6} />
              <ellipse cx="115" cy="140" rx="8" ry="15" fill="#ef4444" opacity={0.6} />
            </>
          )}
        </svg>

        {/* Pulse rings overall */}
        {tags.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-blue-500/10 rounded-full animate-[ping_3s_linear_infinite]" />
          </div>
        )}
      </div>

      <div className="absolute bottom-6 inset-x-6 flex flex-wrap gap-2 justify-center">
        {tags.map(t => (
          <div key={t} className="flex items-center gap-1.5 bg-black text-white px-4 py-1.5 rounded-full shadow-2xl border border-white/5">
            <Dna size={12} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-tight">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
