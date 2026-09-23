import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import {
  Activity as ActivityIcon,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSearch,
  Filter,
  Gauge,
  Globe2,
  History,
  Info,
  Languages,
  LayoutDashboard,
  Library,
  Menu,
  PanelRight,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

type CaseStatus = 'supported' | 'needs_review' | 'insufficient';
type Tone = 'success' | 'warning' | 'neutral';
type ViewName = 'dashboard' | 'check' | 'reviews' | 'sources' | 'analytics' | 'settings';

type RetrievedEvidence = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  reference: string;
  excerpt: string;
  url: string;
  edition: string;
  retrievedAt: string;
  score: number;
};

type EvidenceCase = {
  id: string;
  claim: string;
  context: string;
  language: string;
  status: CaseStatus;
  confidence: number;
  evidenceLevel: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  sources: string[];
  reviewerNote?: string;
  summary?: string;
  recommendedAction?: string;
  sourceNotes?: string[];
  evidence?: RetrievedEvidence[];
  analysisMode?: 'ai' | 'local';
  modeNote?: string;
  isSample?: boolean;
};

type EvidenceSource = {
  id: string;
  title: string;
  authority: string;
  type: string;
  language: string;
  coverage: string;
  reviewedAt?: string;
  url: string;
  accent: string;
  description: string;
};

type Activity = {
  id: string;
  text: string;
  time: string;
  tone: Tone;
};

const sourceSeed: EvidenceSource[] = [
  { id: 'quran', title: 'فهرس القرآن الكريم', authority: 'فهرس خارجي', type: 'نص قرآني', language: 'العربية', coverage: 'القرآن كاملًا', url: 'https://quran.com/', accent: 'gold', description: 'رابط عام للفهرس والبحث. وجوده لا يعني أنه يثبت مطالبة بعينها.' },
  { id: 'bukhari', title: 'فهرس صحيح البخاري', authority: 'فهرس خارجي', type: 'حديث', language: 'العربية', coverage: 'كتاب الجامع الصحيح', url: 'https://sunnah.com/bukhari', accent: 'teal', description: 'رابط عام للبحث في الكتاب؛ يجب توثيق رقم الحديث ولفظه قبل الاعتماد.' },
  { id: 'muslim', title: 'فهرس صحيح مسلم', authority: 'فهرس خارجي', type: 'حديث', language: 'العربية', coverage: 'كتاب الصحيح', url: 'https://sunnah.com/muslim', accent: 'blue', description: 'رابط عام للبحث في الكتاب، وليس إحالة claim-specific جاهزة.' },
  { id: 'bin-baz', title: 'فهرس فتاوى ابن باز', authority: 'فهرس خارجي', type: 'فتوى', language: 'العربية', coverage: 'العبادات والمعاملات', url: 'https://binbaz.org.sa/fatwas', accent: 'rose', description: 'مادة فتوائية مؤرشفة؛ لا تُستخدم وحدها للحكم على النوازل الحديثة.' },
  { id: 'altafsir', title: 'موسوعة التفسير', authority: 'فهرس خارجي', type: 'تفسير', language: 'العربية', coverage: 'السور والآيات', url: 'https://tafsir.app/', accent: 'violet', description: 'فهرس للمقارنة والبحث؛ يلزم تسجيل الإحالة المحددة عند الاستدلال.' },
  { id: 'fiqh-academy', title: 'مجمع الفقه الإسلامي الدولي', authority: 'فهرس مؤسسي', type: 'قرار فقهي', language: 'العربية', coverage: 'قضايا معاصرة مختارة', url: 'https://iifa-aifi.org/ar', accent: 'green', description: 'بوابة عامة للقرارات المؤسسية، مع ضرورة المراجعة البشرية للقرار ذي الصلة.' },
];

const caseSeed: EvidenceCase[] = [
  {
    id: 'case-1042',
    claim: 'ورد في صحيح البخاري أن الأعمال بالنيات.',
    context: 'مادة تربوية',
    language: 'العربية',
    status: 'supported',
    confidence: 96,
    evidenceLevel: 'مرتفع',
    createdAt: 'منذ 18 دقيقة',
    reviewedBy: 'سارة العتيبي',
    sources: ['bukhari'],
    reviewerNote: 'النص مدعوم بإحالة مباشرة ويمكن نشره مع ذكر الكتاب.',
    isSample: true,
  },
  {
    id: 'case-1041',
    claim: 'هل يجوز استخدام أدوات الذكاء الاصطناعي في إعداد الفتوى؟',
    context: 'سؤال معاصر',
    language: 'العربية',
    status: 'needs_review',
    confidence: 61,
    evidenceLevel: 'جزئي',
    createdAt: 'منذ ساعة',
    sources: ['fiqh-academy'],
    reviewerNote: 'تحتاج إلى توجيه متخصص يحدد نطاق الأداة والمسؤولية العلمية.',
    isSample: true,
  },
  {
    id: 'case-1040',
    claim: 'كل من يختلف معنا في الرأي خارج من الملة.',
    context: 'منشور اجتماعي',
    language: 'العربية',
    status: 'insufficient',
    confidence: 18,
    evidenceLevel: 'غير كافٍ',
    createdAt: 'أمس',
    sources: [],
    reviewerNote: 'الادعاء عام وحسّاس ولا توجد إحالة محددة. لا تستنتج سمة دينية حساسة.',
    isSample: true,
  },
  {
    id: 'case-1039',
    claim: 'قال تعالى: إن الله يأمر بالعدل والإحسان.',
    context: 'محتوى دعوي',
    language: 'العربية',
    status: 'supported',
    confidence: 98,
    evidenceLevel: 'مرتفع',
    createdAt: 'أمس',
    reviewedBy: 'عمر الكيلاني',
    sources: ['quran'],
    reviewerNote: 'مطابقة مباشرة مع سورة النحل، الآية 90.',
    isSample: true,
  },
];

const navItems: { href: string; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { href: '/', label: 'لوحة القيادة', short: 'Overview', icon: LayoutDashboard },
  { href: '/check', label: 'تدقيق جديد', short: 'Check', icon: FileSearch },
  { href: '/reviews', label: 'قائمة المراجعة', short: 'Reviews', icon: ClipboardCheck },
  { href: '/sources', label: 'مكتبة المصادر', short: 'Sources', icon: Library },
  { href: '/analytics', label: 'التحليلات', short: 'Analytics', icon: Gauge },
  { href: '/settings', label: 'الإعدادات', short: 'Settings', icon: Settings },
];

const statusLabel: Record<CaseStatus, string> = {
  supported: 'مدعوم',
  needs_review: 'يحتاج مراجعة',
  insufficient: 'أدلة غير كافية',
};

const statusClass: Record<CaseStatus, string> = {
  supported: 'status-supported',
  needs_review: 'status-review',
  insufficient: 'status-insufficient',
};

function formatCaseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'وقت غير مسجل' : new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function AppShell({ children, currentPath, onMenu }: { children: ReactNode; currentPath: string; onMenu: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [location] = useLocation();
  const activePath = currentPath || location;

  return (
    <div className="app-shell" dir="rtl">
      {mobileOpen && <button className="mobile-overlay" aria-label="إغلاق القائمة" data-testid="button-close-mobile-nav" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} data-testid="sidebar-navigation">
        <div className="brand-lockup">
          <div className="brand-mark">م</div>
          <div>
            <div className="brand-name">مِعيار</div>
            <div className="brand-sub">Evidence workspace</div>
          </div>
        </div>
        <div className="side-label">مساحة العمل</div>
        <nav className="nav-stack" aria-label="التنقل الرئيسي">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? activePath === '/' : activePath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                data-testid={`link-nav-${item.short.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="safety-mini">
            <div className="safety-mini-head"><ShieldCheck size={15} /> بوابة الأمان</div>
            <p>مِعيار أداة أدلة لا تصدر فتوى. عند نقص الدليل، يتوقف المسار ويُحال إلى المختص.</p>
          </div>
          <div className="profile-row">
            <div className="avatar">م</div>
            <div className="profile-copy"><strong>عرض محلي</strong><span>لا يوجد مستخدم مسجّل</span></div>
            <ChevronLeft size={15} color="currentColor" />
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-context">
            <button className="icon-button mobile-menu" aria-label="فتح القائمة" data-testid="button-open-mobile-nav" onClick={() => { setMobileOpen(true); onMenu(); }}><Menu size={18} /></button>
            <div><small>{new Intl.DateTimeFormat('ar', { dateStyle: 'full' }).format(new Date())}</small><h1>مساحة التحقق</h1></div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="بحث سريع" data-testid="button-global-search" onClick={() => document.getElementById('main-search')?.focus()}><Search size={17} /></button>
            <div style={{ position: 'relative' }}>
              <button className="icon-button" aria-label="الإشعارات" data-testid="button-notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17} /><span className="notification-dot" /></button>
              {notificationsOpen && <div className="notification-popover card" data-testid="popover-notifications"><h4>المراجعات</h4><p>راجعي قائمة القرار للاطلاع على الحالات المحفوظة التي تحتاج تدخلًا بشريًا.</p><Link href="/reviews" className="text-link" onClick={() => setNotificationsOpen(false)}>فتح قائمة المراجعة</Link></div>}
            </div>
            <Link href="/check" className="button button-primary" data-testid="link-topbar-new-check"><Plus size={16} /> تدقيق جديد</Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function StatusPill({ status }: { status: CaseStatus }) {
  return <span className={`status-pill ${statusClass[status]}`} data-testid={`status-pill-${status}`}><span>•</span>{statusLabel[status]}</span>;
}

function Dashboard({ cases, activities, go }: { cases: EvidenceCase[]; activities: Activity[]; go: (path: string) => void }) {
  const actualCases = cases.filter((item) => !item.isSample);
  const pending = actualCases.filter((item) => item.status === 'needs_review').length;
  const supported = actualCases.filter((item) => item.status === 'supported').length;
  const measured = actualCases.filter((item) => item.analysisMode !== 'local');
  const averageConfidence = measured.length ? Math.round(measured.reduce((sum, item) => sum + item.confidence, 0) / measured.length) : null;
  return <div className="content">
    <PageHeading eyebrow="مركز القيادة / OVERVIEW" title="مساحة التحقق المحلية" description="كل ادعاء يمر هنا يخرج ومعه أثره. راقبي جودة الدليل قبل سرعة النشر." action={<button className="button button-primary" data-testid="button-dashboard-new-check" onClick={() => go('/check')}><Plus size={16} /> ابدئي تدقيقًا</button>} />
    <section className="dashboard-grid">
      <div className="hero-card">
        <div className="hero-kicker"><Sparkles size={14} /> مسار آمن للنشر</div>
        <h3>لا نمرّر ادعاءً حساسًا<br />من دون أثر يمكن الرجوع إليه.</h3>
        <p>اكتبي الادعاء كما ورد، اختاري سياقه، ودعي مِعيار يوضح ما يدعمه المصدر وما يحتاج إلى عين بشرية.</p>
        <button className="button button-accent hero-button" data-testid="button-hero-start-check" onClick={() => go('/check')}>ابدئي من الادعاء <ArrowLeft size={15} /></button>
      </div>
      <div className="stat-column">
        <div className="card stat-card"><div className="stat-icon"><FileCheck2 size={16} /></div><strong data-testid="text-stat-total">{actualCases.length}</strong><span>فحوصات فعلية محفوظة</span></div>
        <div className="card stat-card"><div className="stat-icon"><CheckCircle2 size={16} /></div><strong data-testid="text-stat-supported">{supported}</strong><span>مدعومة بالمصدر</span></div>
        <div className="card stat-card"><div className="stat-icon"><ClipboardCheck size={16} /></div><strong data-testid="text-stat-pending">{pending}</strong><span>تنتظر مراجعة بشرية</span></div>
        <div className="card stat-card"><div className="stat-icon"><ShieldCheck size={16} /></div><strong data-testid="text-stat-confidence">{averageConfidence === null ? '—' : `${averageConfidence}%`}</strong><span>متوسط تقديرات الحالات الفعلية</span></div>
      </div>
    </section>
    <section className="section-grid">
      <div className="card panel">
        <div className="panel-heading"><div><h3>آخر الفحوصات</h3><span>تتبع الأدلة قبل اعتماد النتيجة</span></div><button className="text-link" data-testid="button-view-all-cases" onClick={() => go('/check')}>عرض سجل الفحص <ArrowLeft size={12} /></button></div>
        <div className="case-list">
          {cases.slice(0, 4).map((item) => <button className="case-row" key={item.id} data-testid={`button-case-row-${item.id}`} onClick={() => go(`/check/${encodeURIComponent(item.id)}`)}><span className={`case-dot dot-${item.status === 'needs_review' ? 'review' : item.status}`} /><span style={{ textAlign: 'right', minWidth: 0 }}><strong>{item.claim}</strong><small>{item.context} · {item.isSample ? 'حالة نموذجية للعرض' : formatCaseDate(item.createdAt)}</small></span><StatusPill status={item.status} /></button>)}
        </div>
      </div>
      <div className="card panel">
        <div className="panel-heading"><div><h3>نبض المساحة</h3><span>نشاط الفريق والمصادر</span></div><ActivityIcon size={17} color="hsl(var(--muted-foreground))" /></div>
        <div className="timeline">{activities.length ? activities.slice(0, 4).map((item) => <div className="timeline-item" key={item.id}><div className="timeline-mark">{item.tone === 'success' ? <Check size={14} /> : item.tone === 'warning' ? <AlertCircle size={14} /> : <History size={14} />}</div><div><p>{item.text}</p><time>{formatCaseDate(item.time)}</time></div></div>) : <div className="empty-state"><p>لا يوجد نشاط فعلي محفوظ بعد.</p></div>}</div>
      </div>
    </section>
    <section className="notice notice-info" style={{ marginTop: 18 }}><Info size={17} /><div><strong>قاعدة مِعيار الأولى</strong><p>النتيجة المدعومة ليست تفويضًا بالفتوى. هي ملخص قابل للتتبع يساعد فريقك على اتخاذ الخطوة البشرية الصحيحة.</p></div></section>
  </div>;
}

function CheckPage({ cases, setCases, sources, selectedId, go, addActivity, notify }: { cases: EvidenceCase[]; setCases: React.Dispatch<React.SetStateAction<EvidenceCase[]>>; sources: EvidenceSource[]; selectedId?: string; go: (path: string) => void; addActivity: (item: Activity) => void; notify: (message: string) => void }) {
  const [claim, setClaim] = useState('');
  const [context, setContext] = useState('محتوى دعوي');
  const [language, setLanguage] = useState('العربية');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EvidenceCase | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!selectedId) { setResult(null); return; }
    setResult(cases.find((item) => item.id === selectedId) ?? null);
  }, [selectedId, cases]);

  const exportCase = (item: EvidenceCase) => {
    const payload = { ...item, reviewedBy: undefined };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `miyar-${item.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('تم تنزيل الحالة بصيغة JSON.');
  };

  const printCase = (item: EvidenceCase) => {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
    const sourceNames = item.sources.map((id) => sources.find((source) => source.id === id)?.title).filter(Boolean);
    const evidenceText = item.evidence?.map((item) => `${item.reference}: ${item.excerpt}`).join('\n') || 'لا توجد مقتطفات مسترجعة.';
    const report = window.open('', '_blank');
    if (!report) {
      notify('تعذر فتح نافذة الطباعة. اسمحي بالنوافذ المنبثقة ثم حاولي مجددًا.');
      return;
    }
    report.opener = null;
     report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير مِعيار — ${escapeHtml(item.id)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.8;color:#172a26}h1{border-bottom:2px solid #b8954b;padding-bottom:12px}dt{font-weight:bold;margin-top:14px}dd{margin:0}.note{background:#f4f1e9;padding:12px;border-right:4px solid #b8954b}.evidence{background:#f7faf8;padding:12px;margin:14px 0;border-right:4px solid #2e6b5d;white-space:pre-wrap}.muted{color:#66736f;font-size:13px}@media print{button{display:none}}</style></head><body><h1>تقرير حالة من مِعيار</h1><p class="muted">المعرّف: ${escapeHtml(item.id)}${item.isSample ? ' — حالة نموذجية للعرض' : ''}</p><dl><dt>المطالبة</dt><dd>${escapeHtml(item.claim)}</dd><dt>السياق</dt><dd>${escapeHtml(item.context)}</dd><dt>الحالة</dt><dd>${escapeHtml(statusLabel[item.status])}</dd><dt>مستوى الدليل</dt><dd>${escapeHtml(item.evidenceLevel)}</dd><dt>ملخص التحليل</dt><dd>${escapeHtml(item.summary || 'لا يوجد ملخص محفوظ.')}</dd><dt>المصادر</dt><dd>${sourceNames.length ? sourceNames.map((name) => escapeHtml(String(name))).join('، ') : 'لا توجد'}</dd></dl><div class="evidence"><strong>المقتطفات المسترجعة</strong><br />${escapeHtml(evidenceText)}</div><p class="note">المقتطفات المسترجعة تساعد على التتبع، لكنها لا تجعل التقرير فتوى أو اعتمادًا نهائيًا. يلزم فحص اللفظ والسياق بواسطة مختص.</p><button onclick="window.print()">طباعة</button></body></html>`);
    report.document.close();
  };

  const runAnalysis = async (event: FormEvent) => {
    event.preventDefault();
    const cleanClaim = claim.trim();
    if (!cleanClaim) { setError('اكتبي الادعاء أولًا حتى نتمكن من تتبع دليله.'); return; }
    setError('');
    setResult(null);
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: cleanClaim, context, language }),
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: CaseStatus;
        confidence?: number;
        evidenceLevel?: string;
        summary?: string;
        recommendedAction?: string;
        humanReviewReason?: string;
        sourceIds?: string[];
        sourceNotes?: string[];
        evidence?: RetrievedEvidence[];
        analysisMode?: 'ai' | 'local';
        modeNote?: string;
      };
      if (!response.ok || !payload.status) {
        throw new Error(payload.error || 'تعذر إكمال التحليل.');
      }
      const effectiveStatus: CaseStatus = payload.analysisMode === 'local' ? 'needs_review' : payload.status;
       const saveResponse = await fetch('/api/cases', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           claim: cleanClaim,
           context,
           language,
           status: effectiveStatus,
           confidence: payload.confidence ?? 0,
           evidenceLevel: payload.evidenceLevel ?? 'غير كافٍ',
           sources: payload.sourceIds ?? [],
           sourceNotes: payload.sourceNotes ?? [],
           evidence: payload.evidence ?? [],
           analysisMode: payload.analysisMode,
           modeNote: payload.modeNote,
           summary: payload.summary,
           recommendedAction: payload.recommendedAction,
           reviewerNote: payload.humanReviewReason,
         }),
       });
       const savedCase = await saveResponse.json() as EvidenceCase & { error?: string };
       if (!saveResponse.ok) throw new Error(savedCase.error || 'تعذر حفظ نتيجة التحليل في مساحة الفريق.');
       const newCase: EvidenceCase = savedCase;
      setCases((previous) => [newCase, ...previous]);
      setResult(newCase);
      go(`/check/${encodeURIComponent(newCase.id)}`);
      addActivity({ id: `a-${Date.now()}`, text: effectiveStatus === 'supported' ? 'اكتمل تدقيق مدعوم بتحليل الذكاء الاصطناعي' : effectiveStatus === 'needs_review' ? 'أُضيفت مطالبة إلى قائمة المراجعة' : 'توقّف الفحص لعدم كفاية الدليل', time: new Date().toISOString(), tone: effectiveStatus === 'supported' ? 'success' : 'warning' });
      notify(effectiveStatus === 'supported' ? 'اكتمل الفحص: نتيجة مدعومة مبدئيًا.' : effectiveStatus === 'needs_review' ? 'تمت إحالة النتيجة إلى المراجعة البشرية.' : 'توقّف المسار بأمان: الأدلة غير كافية.');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'تعذر إكمال التحليل.');
      notify('تعذر الاتصال بخدمة التحليل.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resultSources = result ? result.sources.map((id) => sources.find((source) => source.id === id)).filter((source): source is EvidenceSource => Boolean(source)) : [];
  return <div className="content">
    <PageHeading eyebrow="مسار التدقيق / CHECK" title="تدقيق مطالبة" description="أدخلي النص كما وصل إلى فريقك؛ لا تعيدي صياغته كي لا نفقد سياقه." />
    <div className="check-layout">
      <form className="card form-panel" onSubmit={runAnalysis} data-testid="form-new-check">
        <div className="form-title"><div className="form-title-mark"><FileSearch size={18} /></div><div><h3>بيانات المطالبة</h3><p>كلما كان النص أكثر تحديدًا، كان أثر الدليل أوضح.</p></div></div>
        <div className="field"><label htmlFor="claim">المطالبة <span>مطلوب</span></label><textarea id="claim" data-testid="input-claim" value={claim} onChange={(event) => setClaim(event.target.value)} placeholder="مثال: ورد في صحيح البخاري أن الأعمال بالنيات." />{error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 11, marginTop: 7 }} data-testid="text-check-error"><AlertCircle size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />{error}</div>}</div>
        <div className="two-fields">
          <div className="field"><label htmlFor="context">السياق</label><select id="context" data-testid="select-context" value={context} onChange={(event) => setContext(event.target.value)}><option>محتوى دعوي</option><option>مادة تربوية</option><option>سؤال معاصر</option><option>منشور اجتماعي</option><option>بحث أكاديمي</option></select></div>
          <div className="field"><label htmlFor="language">اللغة</label><select id="language" data-testid="select-language" value={language} onChange={(event) => setLanguage(event.target.value)}><option>العربية</option><option>English</option><option>Français</option></select></div>
        </div>
         <div className="notice notice-warn" style={{ marginBottom: 18 }}><ShieldCheck size={16} /><div><strong>حدود الأمان</strong><p>لن نستنتج صفات دينية حساسة، ولن نقدّم حكمًا نهائيًا في مسألة تحتاج إلى متخصص. كل مقتطف يظهر هنا مرتبط بمرجع وتاريخ استرجاع.</p></div></div>
        <button className="button button-primary" type="submit" disabled={isAnalyzing} data-testid="button-run-analysis" style={{ width: '100%' }}>{isAnalyzing ? <><RefreshCcw size={15} className="animate-spin" /> جارٍ تحليل المطالبة...</> : <><Sparkles size={15} /> ابدأ تحليلًا ذكيًا</>}</button>
         <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11, lineHeight: 1.7, textAlign: 'center', margin: '12px 0 0' }}>يتطلب المسار الرسمي اتصال الذكاء الاصطناعي؛ عند تعطله يتوقف الطلب بدل عرض نتيجة محلية مضللة. النتائج تحفظ في مساحة الفريق المشتركة.</p>
      </form>
      <div className="card analysis-panel" data-testid="panel-analysis-result">
        {isAnalyzing && <div className="analysis-loading" data-testid="state-analysis-loading"><div className="skeleton" style={{ width: '31%' }} /><div className="skeleton large" /><div className="skeleton" style={{ width: '75%' }} /><div className="skeleton" style={{ width: '55%' }} /><div className="skeleton" style={{ marginTop: 22 }} /><div className="skeleton" style={{ width: '86%' }} /></div>}
        {!isAnalyzing && !result && <div className="analysis-empty"><div><div className="empty-mark"><FileCheck2 size={24} /></div><h3>{selectedId ? 'لم نعثر على هذه الحالة' : 'الأثر سيظهر هنا'}</h3><p>{selectedId ? 'قد تكون الحالة حُذفت من التخزين المحلي أو فُتح الرابط في متصفح آخر.' : 'ابدئي بإدخال مطالبة. سنفصل بين الدليل المباشر، مساحة عدم اليقين، والخطوة البشرية التالية.'}</p></div></div>}
        {!isAnalyzing && result && <div className="analysis-result">
          <div className="result-top"><div><div className="eyebrow">نتيجة الفحص / RESULT</div><h3>ملخص الفحص {result.isSample && <span className="tag">بيانات نموذجية</span>}</h3><div style={{ marginTop: 10 }}><StatusPill status={result.status} /></div></div><div className="confidence"><strong>{result.analysisMode === 'local' || !result.confidence ? '—' : `${result.confidence}%`}</strong><span>{result.analysisMode === 'local' || !result.confidence ? 'الثقة غير مقاسة' : 'تقدير نموذجي، غير معاير'}</span></div></div>
          <div className="metric-strip"><div className="metric"><span>مستوى الدليل</span><strong>{result.evidenceLevel}</strong></div><div className="metric"><span>السياق</span><strong>{result.context}</strong></div><div className="metric"><span>المصادر</span><strong>{result.sources.length ? `${result.sources.length} إحالة` : 'لا توجد'}</strong></div></div>
          {result.status === 'supported' && <div className="notice notice-info"><CheckCircle2 size={17} /><div><strong>يوجد أثر مصدر مباشر</strong><p>ظهرت إشارة يمكن مطابقتها مع مصدر من المكتبة. هذا دعم أولي وليس تفويضًا بالنشر دون مراجعة اللفظ.</p></div></div>}
          {result.status === 'needs_review' && <div className="notice notice-warn"><AlertCircle size={17} /><div><strong>تحتاج هذه المطالبة إلى عين بشرية</strong><p>المسائل الحديثة والفتاوى لا تُعتمد تلقائيًا. أوصي بعرضها على مختص مع حفظ هذه الملاحظة.</p></div></div>}
          {result.status === 'insufficient' && <div className="notice notice-danger"><XCircle size={17} /><div><strong>توقّف المسار: الأدلة غير كافية</strong><p>لا توجد إحالة محددة يمكن التحقق منها. لا تعمّمي الحكم ولا تستنتجي سمة دينية حساسة.</p></div></div>}
           <div style={{ marginTop: 20 }}><div className="panel-heading" style={{ marginBottom: 7 }}><h3 style={{ fontSize: 13 }}>مسار الدليل</h3><span>{result.sources.length ? 'فهارس مرتبطة للتحقق' : 'بانتظار إحالة'}</span></div>{resultSources.length ? <div className="source-list">{resultSources.map((source) => <div className="source-card" key={source.id}><div className="source-accent" /><div><h4>{source.title}</h4><p><span className="source-type">{source.type}</span> · {source.authority} · رابط فهرس عام لا يثبت المطالبة وحده</p></div><a className="mini-button" data-testid={`button-open-source-${source.id}`} href={source.url} target="_blank" rel="noreferrer" onClick={() => notify(`تم فتح فهرس المصدر: ${source.title}`)} aria-label={`فتح ${source.title}`}><ArrowUpRight size={14} /></a></div>)}</div> : <div className="empty-state"><h3>لا نملك إحالة بعد</h3><p>أضيفي نصًا يحوي اسم مصدر أو رقم آية محددًا، أو أحيله إلى مختص إذا كان سؤالًا معاصرًا.</p></div>}</div>
           {result.summary && <div className="notice notice-info" style={{ marginTop: 16 }}><Info size={16} /><div><strong>ملخص التحليل</strong><p>{result.summary}</p></div></div>}
           {result.evidence?.length ? <div style={{ marginTop: 18 }}><div className="panel-heading" style={{ marginBottom: 7 }}><h3 style={{ fontSize: 13 }}>مقتطفات مسترجعة</h3><span>مرجع قابل للفحص</span></div><div className="evidence-snippet-list">{result.evidence.map((item) => <div className="evidence-snippet" key={item.id}><div className="evidence-snippet-head"><strong>{item.reference}</strong><a href={item.url} target="_blank" rel="noreferrer" className="text-link">فتح المصدر <ArrowUpRight size={12} /></a></div><p>{item.excerpt}</p><small>{item.sourceTitle} · {item.edition} · استرجاع {formatCaseDate(item.retrievedAt)}</small></div>)}</div></div> : null}
          {result.sourceNotes?.length ? <div className="source-notes"><strong>ملاحظات الإسناد</strong><ul>{result.sourceNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}
          {result.modeNote && <div className="notice notice-warn" style={{ marginTop: 14 }}><AlertCircle size={16} /><div><strong>{result.analysisMode === 'local' ? 'وضع العرض المحلي' : 'تحليل الذكاء الاصطناعي'}</strong><p>{result.modeNote}</p></div></div>}
          <div className="notice notice-info review-cta"><UserRound size={16} /><div><strong>الخطوة البشرية المقترحة</strong><p>{result.reviewerNote}</p></div></div>
          {result.recommendedAction && <div className="recommended-action"><strong>الإجراء المقترح</strong><span>{result.recommendedAction}</span></div>}
           <div className="review-actions" style={{ marginTop: 16 }}><button className="button button-outline" data-testid="button-export-case" onClick={() => exportCase(result)}><Download size={14} /> تنزيل JSON</button><button className="button button-outline" data-testid="button-print-case" onClick={() => printCase(result)}><Printer size={14} /> طباعة التقرير العربي</button></div>
        </div>}
       </div>
    </div>
  </div>;
}

function ReviewsPage({ cases, onDecision, go }: { cases: EvidenceCase[]; onDecision: (id: string, status: CaseStatus) => void; go: (path: string) => void }) {
  const [filter, setFilter] = useState<'pending' | 'all' | 'resolved'>('pending');
  const reviewCases = cases.filter((item) => filter === 'pending' ? item.status === 'needs_review' : filter === 'resolved' ? item.status !== 'needs_review' : true);
  return <div className="content"><PageHeading eyebrow="المراجعة البشرية / REVIEWS" title="غرفة القرار" description="هنا تتوقف الأتمتة باحترام. راجعي السياق، ثم اتركي أثر القرار للفريق." action={<div className="notice notice-warn" style={{ padding: '9px 12px' }}><AlertCircle size={14} /><span style={{ fontSize: 11 }}>لا يوجد اعتماد تلقائي</span></div>} />
    <div className="card panel"><div className="filter-row"><Filter size={15} color="hsl(var(--muted-foreground))" /><button className={`filter-button ${filter === 'pending' ? 'active' : ''}`} data-testid="button-filter-pending" onClick={() => setFilter('pending')}>بانتظار القرار <b>{cases.filter((item) => item.status === 'needs_review').length}</b></button><button className={`filter-button ${filter === 'all' ? 'active' : ''}`} data-testid="button-filter-all" onClick={() => setFilter('all')}>كل الحالات</button><button className={`filter-button ${filter === 'resolved' ? 'active' : ''}`} data-testid="button-filter-resolved" onClick={() => setFilter('resolved')}>المعالجة</button></div>
      {reviewCases.length ? <div className="review-list">{reviewCases.map((item) => <div className="card review-card" key={item.id} data-testid={`card-review-${item.id}`}><span className={`case-dot dot-${item.status === 'needs_review' ? 'review' : item.status}`} /><div className="review-copy"><strong>{item.claim}</strong><p>{item.reviewerNote || 'لم تتم إضافة ملاحظة بشرية بعد.'}</p><div className="review-meta"><span className="tag">{item.context}</span><span className="tag">{item.analysisMode === 'local' ? 'فرز محلي بلا ثقة' : `تقدير ${item.confidence}%`}</span><span className="tag">{item.isSample ? 'حالة نموذجية' : formatCaseDate(item.createdAt)}</span></div></div><div className="review-actions"><button className="button button-outline" data-testid={`button-open-review-${item.id}`} onClick={() => go(`/check/${encodeURIComponent(item.id)}`)}>فتح</button>{item.status === 'needs_review' ? <><button className="button button-primary" data-testid={`button-approve-${item.id}`} onClick={() => onDecision(item.id, 'supported')}><Check size={14} /> اعتماد يدوي</button><button className="button button-danger" data-testid={`button-reject-${item.id}`} onClick={() => onDecision(item.id, 'insufficient')}><X size={14} /> عدم كفاية</button></> : <StatusPill status={item.status} />}</div></div>)}</div> : <div className="empty-state" data-testid="empty-review-queue"><div className="empty-mark"><CheckCircle2 size={24} /></div><h3>غرفة القرار هادئة</h3><p>لا توجد مطالبات معلّقة هنا. ابدئي تدقيقًا جديدًا عندما يصل ادعاء يحتاج إلى أثر.</p><button className="button button-primary" data-testid="button-empty-start-check" onClick={() => go('/check')}><Plus size={15} /> تدقيق جديد</button></div>}</div>
    </div>
}

function SourcesPage({ sources, savedIds, toggleSaved, notify }: { sources: EvidenceSource[]; savedIds: string[]; toggleSaved: (id: string) => void; notify: (message: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = sources.filter((source) => `${source.title} ${source.type} ${source.coverage}`.includes(search));
  return <div className="content"><PageHeading eyebrow="بنية الدليل / SOURCES" title="مكتبة المصادر" description="مجموعة منتقاة، بمراجعات مؤرخة، حتى تعرفي لماذا ظهر المصدر قبل أن تثقي بالنتيجة." action={<button className="button button-primary" data-testid="button-add-source" onClick={() => notify('إضافة مصدر جديدة متاحة في هذا العرض المحلي. استخدمي المصادر المنقّحة أدناه.') }><Plus size={16} /> إضافة مصدر</button>} />
    <div className="card panel" style={{ marginBottom: 18 }}><div className="field" style={{ margin: 0, position: 'relative' }}><Search size={15} style={{ position: 'absolute', right: 12, top: 13, color: 'hsl(var(--muted-foreground))' }} /><input id="main-search" data-testid="input-source-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي باسم المصدر أو نوعه..." style={{ paddingRight: 38 }} /></div></div>
    {filtered.length ? <div className="library-grid">{filtered.map((source) => <div className="card library-card" key={source.id} data-testid={`card-source-${source.id}`}><div className="source-accent" style={{ background: `hsl(var(--${source.accent === 'gold' ? 'accent' : 'primary'}))` }} /><div className="library-card-body"><span className="authority">{source.authority}</span><h3>{source.title}</h3><p>{source.description}</p><div className="library-footer"><span>{source.type} · {source.language}</span><button className={`mini-button ${savedIds.includes(source.id) ? 'saved-source' : ''}`} data-testid={`button-save-source-${source.id}`} aria-label={savedIds.includes(source.id) ? `إزالة ${source.title}` : `حفظ ${source.title}`} onClick={() => toggleSaved(source.id)}><Star size={15} fill={savedIds.includes(source.id) ? 'currentColor' : 'none'} /></button></div><div className="library-footer" style={{ marginTop: 9 }}><span>تغطية: {source.coverage}</span><a href={source.url} target="_blank" rel="noreferrer" data-testid={`link-source-catalog-${source.id}`}>فتح الفهرس العام</a></div></div></div>)}</div> : <div className="empty-state"><div className="empty-mark"><Search size={22} /></div><h3>لم نعثر على مصدر</h3><p>جرّبي البحث باسم المرجع أو نوعه، مثل «حديث» أو «تفسير».</p><button className="button button-quiet" data-testid="button-clear-source-search" onClick={() => setSearch('')}>مسح البحث</button></div>}
  </div>;
}

function AnalyticsPage({ cases }: { cases: EvidenceCase[] }) {
  const actualCases = cases.filter((item) => !item.isSample);
  const supported = actualCases.filter((item) => item.status === 'supported').length;
  const pending = actualCases.filter((item) => item.status === 'needs_review').length;
  const withSources = actualCases.filter((item) => item.sources.length > 0).length;
  const percentage = (count: number) => actualCases.length ? `${Math.round((count / actualCases.length) * 100)}%` : '—';
  return <div className="content"><PageHeading eyebrow="صحة المساحة / ANALYTICS" title="الأثر والجودة" description="الأرقام هنا لا تقيس سرعة الإجابة فقط؛ بل اتساع التغطية ووضوح لحظة التوقف." action={<button className="button button-quiet" data-testid="button-refresh-analytics" onClick={() => window.location.reload()}><RefreshCcw size={15} /> تحديث العرض</button>} />
    <div className="analytics-grid"><div className="card analytic-card"><span>فحوصات فعلية محفوظة</span><strong data-testid="text-analytics-total">{actualCases.length}</strong><small>لا تشمل حالات العرض النموذجية</small></div><div className="card analytic-card"><span>حالات لها روابط مصادر</span><strong>{percentage(withSources)}</strong><small>وجود الرابط لا يثبت المطالبة</small></div><div className="card analytic-card"><span>نسبة المراجعة</span><strong>{percentage(pending)}</strong><small>مشتقة من الحالات المحفوظة</small></div><div className="card analytic-card"><span>المطابقات المدعومة</span><strong>{percentage(supported)}</strong><small>مشتقة من الحالة الحالية</small></div></div>
    <div className="card panel"><div className="panel-heading"><div><h3>توزيع الحالات الفعلية</h3><span>أعداد مباشرة، بلا خط أساس مفترض</span></div><Info size={15} color="hsl(var(--muted-foreground))" /></div><div className="legend-list"><div className="legend-item"><i style={{ background: 'hsl(var(--primary))' }} />مدعومة <b>{supported}</b></div><div className="legend-item"><i style={{ background: 'hsl(var(--accent))' }} />تحتاج مراجعة <b>{pending}</b></div><div className="legend-item"><i style={{ background: 'hsl(var(--destructive))' }} />غير كافية <b>{actualCases.filter((item) => item.status === 'insufficient').length}</b></div></div></div>
    <section className="notice notice-info" style={{ marginTop: 18 }}><Gauge size={17} /><div><strong>قراءة الجودة</strong><p>ارتفاع نسبة المراجعة ليس فشلًا؛ إنه إشارة إلى أن مِعيار لا يخفي مناطق عدم اليقين خلف إجابة واثقة.</p></div></section>
  </div>;
}

function SettingsPage({ settings, setSettings, saveSettings }: { settings: { specialistGate: boolean; sensitiveClaims: boolean; sourcePolicy: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ specialistGate: boolean; sensitiveClaims: boolean; sourcePolicy: boolean }>>; saveSettings: () => void }) {
  const [tab, setTab] = useState<'safety' | 'workspace' | 'team'>('safety');
  const toggle = (key: keyof typeof settings) => setSettings((previous) => ({ ...previous, [key]: !previous[key] }));
  return <div className="content"><PageHeading eyebrow="حراسة المساحة / SETTINGS" title="الإعدادات" description="اضبطي قواعد الفريق قبل أن تضبطي سرعة العمل. القرار الحساس يحتاج إلى حارس واضح." action={<button className="button button-primary" data-testid="button-save-settings" onClick={saveSettings}><Check size={15} /> حفظ التغييرات</button>} />
    <div className="settings-layout"><div className="card settings-nav"><button className={`settings-tab ${tab === 'safety' ? 'active' : ''}`} data-testid="button-settings-safety" onClick={() => setTab('safety')}><ShieldCheck size={16} /> بوابة الأمان</button><button className={`settings-tab ${tab === 'workspace' ? 'active' : ''}`} data-testid="button-settings-workspace" onClick={() => setTab('workspace')}><PanelRight size={16} /> مساحة العمل</button><button className={`settings-tab ${tab === 'team' ? 'active' : ''}`} data-testid="button-settings-team" onClick={() => setTab('team')}><UsersRound size={16} /> أعضاء الفريق</button></div>
      <div className="card settings-panel">
        {tab === 'safety' && <><h3>بوابة الأمان</h3><p>قواعد تضمن أن تكون النتيجة أداة أدلة، لا بديلًا عن أهل الاختصاص.</p><div className="setting-row"><div><strong>إحالة المسائل الحديثة لمتخصص</strong><p>توجيه الأسئلة المعاصرة والفتاوى إلى قائمة المراجعة دائمًا.</p></div><button className={`switch ${settings.specialistGate ? 'on' : ''}`} aria-label="تبديل إحالة المسائل الحديثة" data-testid="switch-specialist-gate" onClick={() => toggle('specialistGate')} /></div><div className="setting-row"><div><strong>إيقاف الاستنتاجات الحساسة</strong><p>عدم استنتاج الانتماء أو التدين أو أي سمة حساسة من نص غير كافٍ.</p></div><button className={`switch ${settings.sensitiveClaims ? 'on' : ''}`} aria-label="تبديل الاستنتاجات الحساسة" data-testid="switch-sensitive-claims" onClick={() => toggle('sensitiveClaims')} /></div><div className="setting-row"><div><strong>لا نشر دون مصدر من المكتبة</strong><p>لا تظهر الحالة «مدعوم» إلا مع إحالة مصدر محفوظ ومراجع.</p></div><button className={`switch ${settings.sourcePolicy ? 'on' : ''}`} aria-label="تبديل سياسة المصدر" data-testid="switch-source-policy" onClick={() => toggle('sourcePolicy')} /></div><div className="notice notice-warn" style={{ marginTop: 20 }}><AlertCircle size={16} /><div><strong>تنبيه تشغيلي</strong><p>هذه القواعد محلية لهذا العرض. في الإنتاج، يجب ربطها بسياسة صلاحيات ومراجعة فعلية.</p></div></div></>}
         {tab === 'workspace' && <><h3>مساحة العمل</h3><p>النتائج محفوظة في قاعدة بيانات مساحة الفريق وتظهر بعد إعادة فتح التطبيق.</p><div className="setting-row"><div><strong>اللغة الأساسية</strong><p>العربية — واجهة RTL</p></div><span className="tag"><Languages size={12} /> العربية</span></div><div className="notice notice-info"><CheckCircle2 size={16} /><div><strong>حفظ دائم</strong><p>الحالات والقرارات لا تعتمد على localStorage؛ تُحفظ على الخادم ليراها أعضاء مساحة العمل.</p></div></div></>}
         {tab === 'team' && <div className="empty-state"><UsersRound size={24} /><h3>مساحة الفريق المشتركة</h3><p>الحالات والقرارات مشتركة في مساحة العمل الحالية. ستضاف المصادقة وصلاحيات الأعضاء في مرحلة تشغيل لاحقة.</p></div>}
      </div>
    </div>
  </div>;
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const [storageError, setStorageError] = useState('');
  const [cases, setCases] = useState<EvidenceCase[]>(caseSeed);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sources] = useState<EvidenceSource[]>(sourceSeed);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [settings, setSettings] = useState({ specialistGate: true, sensitiveClaims: true, sourcePolicy: true });
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/cases');
        if (!response.ok) throw new Error('تعذر تحميل سجل الفريق من الخادم.');
        const payload = await response.json() as { cases?: EvidenceCase[] };
        setCases([...(payload.cases ?? []), ...caseSeed]);
        const storedCases = JSON.parse(localStorage.getItem('miyar-cases') || '[]') as EvidenceCase[];
        if (storedCases.length) setStorageError('تم تجاهل النسخة المحلية القديمة لصالح سجل الفريق المحفوظ على الخادم.');
        setActivities((JSON.parse(localStorage.getItem('miyar-activities') || '[]') as Activity[]).filter((item) => !['a1', 'a2', 'a3', 'a4'].includes(item.id)));
        setSavedIds(JSON.parse(localStorage.getItem('miyar-saved-sources') || '[]') as string[]);
        const storedSettings = JSON.parse(localStorage.getItem('miyar-settings') || 'null') as typeof settings | null;
        if (storedSettings) setSettings(storedSettings);
        setStorageReady(true);
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'تعذر تحميل سجل الفريق من الخادم.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const persist = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      setStorageError('فشل الحفظ المحلي. قد تكون مساحة المتصفح ممتلئة أو محظورة؛ لم تُحفظ آخر التغييرات.');
      return false;
    }
  };
  useEffect(() => { if (storageReady) persist('miyar-activities', activities); }, [activities, storageReady]);
  useEffect(() => { if (storageReady) persist('miyar-saved-sources', savedIds); }, [savedIds, storageReady]);

  const notify = (message: string) => setToast(message);
  const addActivity = (item: Activity) => setActivities((previous) => [item, ...previous].slice(0, 6));
  const go = (path: string) => setLocation(path);
  const onDecision = async (id: string, status: CaseStatus) => {
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}/decision`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const updated = await response.json() as EvidenceCase & { error?: string };
      if (!response.ok) throw new Error(updated.error || 'تعذر حفظ القرار.');
      setCases((previous) => previous.map((item) => item.id === id ? { ...item, ...updated } : item));
      addActivity({ id: `a-${Date.now()}`, text: status === 'supported' ? 'اعتمدت مراجعة بشرية مطالبة في مساحة الفريق' : 'أوقفت المراجعة نشر مطالبة لعدم كفاية الدليل', time: new Date().toISOString(), tone: status === 'supported' ? 'success' : 'warning' });
      notify(status === 'supported' ? 'تم حفظ القرار في مساحة الفريق.' : 'تم حفظ رفض الاعتماد في مساحة الفريق.');
    } catch (decisionError) {
      notify(decisionError instanceof Error ? decisionError.message : 'تعذر حفظ القرار.');
    }
  };
  const toggleSaved = (id: string) => {
    setSavedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    notify(savedIds.includes(id) ? 'أزيل المصدر من المحفوظات.' : 'حُفظ المصدر في مكتبة فريقك.');
  };
  const view = useMemo<ViewName>(() => location === '/check' ? 'check' : location === '/reviews' ? 'reviews' : location === '/sources' ? 'sources' : location === '/analytics' ? 'analytics' : location === '/settings' ? 'settings' : 'dashboard', [location]);
  const selectedId = location.startsWith('/check/') ? decodeURIComponent(location.slice('/check/'.length)) : undefined;
  const resolvedView: ViewName = selectedId ? 'check' : view;
  const saveSettings = () => {
    if (persist('miyar-settings', settings)) notify('تم حفظ إعدادات العرض؛ قرارات الحالات تحفظ في مساحة الفريق.');
  };
  return <AppShell currentPath={location} onMenu={() => undefined}>
    {storageError && <div className="notice notice-danger" role="alert" data-testid="error-local-storage" style={{ margin: '16px 24px 0' }}><AlertCircle size={17} /><div><strong>مشكلة في التخزين المحلي</strong><p>{storageError}</p></div></div>}
    {resolvedView === 'dashboard' && <Dashboard cases={cases} activities={activities} go={go} />}
    {resolvedView === 'check' && <CheckPage cases={cases} setCases={setCases} sources={sources} selectedId={selectedId} go={go} addActivity={addActivity} notify={notify} />}
    {resolvedView === 'reviews' && <ReviewsPage cases={cases} onDecision={onDecision} go={go} />}
    {resolvedView === 'sources' && <SourcesPage sources={sources} savedIds={savedIds} toggleSaved={toggleSaved} notify={notify} />}
    {resolvedView === 'analytics' && <AnalyticsPage cases={cases} />}
    {resolvedView === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} saveSettings={saveSettings} />}
    {toast && <div className="toast" role="status" data-testid="toast-message">{toast}</div>}
  </AppShell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppContent /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
