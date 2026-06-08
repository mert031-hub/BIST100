'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { ContentPlatform, ContentSource } from '@/types/content';

type ExportState = 'idle' | 'exporting' | 'error';
type TemplateId = 'FLASH' | 'DAILY' | 'WEEKLY';

/* ─── Hard-coded palette (CSS vars don't resolve inside html-to-image canvas) */
const C = {
  bg:          '#050504',
  bg2:         '#0a0908',
  bg3:         '#111008',
  border:      '#1e1c14',
  border2:     '#2c2a1e',
  border3:     '#3a3820',
  amber:       '#c8a84b',
  amberDim:    '#7a6428',
  amberBright: '#e8c86b',
  amberGlow:   'rgba(200,168,75,0.10)',
  green:       '#4aac44',
  red:         '#b84444',
  cream:       '#ccc0a0',
  textDim:     '#6a6040',
  textFaint:   '#3e3a2a',
} as const;

/* ─── Platform config ───────────────────────────────────────────────────── */
type PlatformCfg = { id: ContentPlatform; label: string; icon: string; desc: string };

const PLATFORMS: PlatformCfg[] = [
  { id: 'INSTAGRAM_POST',     label: 'IG POST',    icon: '◈', desc: '1080×1350' },
  { id: 'INSTAGRAM_CAROUSEL', label: 'CAROUSEL',   icon: '◫', desc: '1080×1350' },
  { id: 'INSTAGRAM_STORY',    label: 'IG STORY',   icon: '◻', desc: '1080×1920' },
  { id: 'X_THREAD',           label: 'X FLOOD',    icon: '✕', desc: '280 kar'   },
  { id: 'LINKEDIN',           label: 'LINKEDIN',   icon: '▤', desc: 'makale'    },
  { id: 'TELEGRAM',           label: 'TELEGRAM',   icon: '✈', desc: 'mesaj'     },
];

const IS_INSTAGRAM = (p: ContentPlatform) =>
  p === 'INSTAGRAM_POST' || p === 'INSTAGRAM_CAROUSEL' || p === 'INSTAGRAM_STORY';

/* ─── Templates ─────────────────────────────────────────────────────────── */
const TEMPLATES: { id: TemplateId; icon: string; label: string; color: string }[] = [
  { id: 'FLASH',  icon: '⚡', label: 'Flaş Haber',    color: 'var(--amber)' },
  { id: 'DAILY',  icon: '📊', label: 'Günlük Özet',   color: 'var(--green)' },
  { id: 'WEEKLY', icon: '📈', label: 'Haftalık Özet', color: 'var(--text-dim)' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function srcIcon(type: ContentSource['type']) {
  if (type === 'NEWS')          return '📰';
  if (type === 'KAP')           return '📋';
  if (type === 'BROKER_REPORT') return '📊';
  return '🏛';
}
function srcLabel(type: ContentSource['type']) {
  if (type === 'NEWS')          return 'HABER';
  if (type === 'KAP')           return 'KAP';
  if (type === 'BROKER_REPORT') return 'KURUM';
  return 'TCMB';
}

/** Extract up to 3 BIST ticker codes from source titles. */
function extractCodes(sources: ContentSource[]): string[] {
  const codes = new Set<string>();
  for (const s of sources) {
    const m1 = s.title.match(/→\s*([A-Z]{2,6})\s*:/);
    if (m1) codes.add(m1[1]);
    for (const m of s.title.matchAll(/\$([A-Z]{2,6})/g)) codes.add(m[1]);
    const m2 = s.title.match(/\b([A-Z]{3,5})\b/g);
    if (m2) for (const t of m2) { if (t.length >= 3 && t.length <= 5) codes.add(t); }
  }
  return [...codes].slice(0, 5);
}

/** Build 3 title suggestions from selected sources. */
function buildSuggestions(sources: ContentSource[], template: TemplateId | null): string[] {
  if (sources.length === 0) return [];
  const codes = extractCodes(sources);
  const tag   = codes.length > 0 ? codes.slice(0, 2).join(' & ') : 'BIST100';
  const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' });
  const main  = sources[0].title.replace(/^[A-Za-zÇçĞğİıÖöŞşÜü\s]+ → [A-Z]{2,6}: /, '').slice(0, 50);

  if (template === 'FLASH')  return [
    `⚡ FLAŞ | ${tag} | ${today}`,
    `⚡ ${main}`,
    `⚡ SON DAKİKA: ${tag}`,
  ];
  if (template === 'DAILY')  return [
    `📊 GÜNLÜK ÖZET | ${today}`,
    `📊 ${tag} | ${today} Gündem`,
    `📊 BIST100 GÜN SONU | ${today}`,
  ];
  if (template === 'WEEKLY') return [
    `📈 HAFTALIK ÖZET | ${today}`,
    `📈 ${tag} | HAFTALIK GÜNDEM`,
    `📈 BIST100 HAFTA ÖZETI`,
  ];
  return [
    `${tag} | ${today}`,
    `⚡ ${main}`,
    `BIST100 GÜNDEM | ${today}`,
  ];
}

/** Build suggested hashtags from sources + platform. */
function buildHashtags(sources: ContentSource[], platform: ContentPlatform): string[] {
  const base: Record<ContentPlatform, string[]> = {
    INSTAGRAM_POST:     ['#BIST100', '#BorsaIstanbul', '#HisseAnaliz', '#Finans', '#Ekonomi'],
    INSTAGRAM_CAROUSEL: ['#BIST100', '#BorsaAnaliz', '#HisseSenedi', '#Finans'],
    INSTAGRAM_STORY:    ['#BIST', '#Borsa', '#HisseAnaliz'],
    X_THREAD:           ['#BIST100', '#Finans', '#BorsaIstanbul', '#KAP'],
    LINKEDIN:           ['#BorsaIstanbul', '#BIST100', '#FinansAnaliz', '#KAPBildirimi'],
    TELEGRAM:           ['#BIST100', '#KAP', '#HaberAkışı'],
  };
  const tags = [...base[platform]];
  const codes = extractCodes(sources);
  for (const c of codes) tags.push(`#${c}`);
  if (sources.some((s) => s.type === 'KAP')) tags.push('#KAPBildirimi');
  if (sources.some((s) => s.type === 'BROKER_REPORT')) tags.push('#KurumRaporu');
  return [...new Set(tags)].slice(0, 10);
}

/* ─── Instagram premium card ────────────────────────────────────────────── */
function InstagramPreview({
  title, bullets, companyCodes, sourceCount, disclaimer,
  platform, createdAt, template, cardRef,
}: {
  title: string;
  bullets: string[];
  companyCodes: string[];
  sourceCount: number;
  disclaimer: string;
  platform: ContentPlatform;
  createdAt: string;
  template: TemplateId | null;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const isStory = platform === 'INSTAGRAM_STORY';
  const dateStr = new Date(createdAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const timeStr = new Date(createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const shownBullets = bullets.slice(0, isStory ? 3 : 5);
  const categoryLabel =
    template === 'FLASH'  ? '⚡ FLAŞ HABER' :
    template === 'DAILY'  ? '📊 GÜNLÜK ÖZET' :
    template === 'WEEKLY' ? '📈 HAFTALIK ÖZET' :
    '◈ GÜNDEM';

  return (
    <div style={{ padding: '10px 10px 6px', display: 'flex', justifyContent: 'center', background: C.bg2 }}>
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: isStory ? 152 : '100%',
          aspectRatio: isStory ? '9/16' : '4/5',
          background: C.bg,
          border: `1px solid ${C.border2}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: "'Courier New', 'Lucida Console', Consolas, monospace",
        }}
      >
        {/* Top accent gradient */}
        <div style={{
          height: 3, flexShrink: 0,
          background: `linear-gradient(90deg, transparent 5%, ${C.amber} 40%, ${C.amberBright} 60%, transparent 95%)`,
        }} />

        {/* Header */}
        <div style={{
          padding: '6px 10px 5px',
          borderBottom: `1px solid ${C.border2}`,
          background: C.bg3,
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <div style={{
            width: 20, height: 20, flexShrink: 0,
            border: `1px solid ${C.amber}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, color: C.amber }}>◈</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 8, color: C.amberBright, fontWeight: 'bold',
              letterSpacing: 2.5, textTransform: 'uppercase',
            }}>
              BIST RADAR
            </div>
            <div style={{ fontSize: 6, color: C.textDim, letterSpacing: 1.5, marginTop: 1 }}>
              Finans · Analiz · KAP
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 7, color: C.amber, letterSpacing: 1 }}>{dateStr}</div>
            <div style={{ fontSize: 6, color: C.textDim, letterSpacing: 1, marginTop: 1 }}>{timeStr}</div>
          </div>
        </div>

        {/* Category label */}
        <div style={{
          padding: '4px 10px',
          background: C.bg3,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <span style={{ fontSize: 7, color: C.amber, letterSpacing: 2, fontWeight: 'bold' }}>
            {categoryLabel}
          </span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.amberDim}, transparent)` }} />
          <span style={{ fontSize: 6, color: C.amberDim, letterSpacing: 1 }}>
            {sourceCount} KAYNAK
          </span>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, padding: isStory ? '10px' : '9px 10px 6px',
          display: 'flex', flexDirection: 'column', gap: isStory ? 9 : 7,
          overflow: 'hidden',
        }}>
          {/* Company tags */}
          {companyCodes.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              {companyCodes.map((c) => (
                <span key={c} style={{
                  fontSize: 7, color: C.amberBright, letterSpacing: 1.5,
                  border: `1px solid ${C.amberDim}`, padding: '2px 7px',
                  background: C.amberGlow, fontWeight: 'bold',
                }}>
                  ${c}
                </span>
              ))}
            </div>
          )}

          {/* Title — hero text */}
          <div style={{
            fontSize: isStory ? 11.5 : 13,
            color: C.cream,
            fontWeight: 'bold',
            lineHeight: 1.4,
            letterSpacing: 0.2,
            flexShrink: 0,
            borderLeft: `2px solid ${C.amber}`,
            paddingLeft: 7,
          }}>
            {title}
          </div>

          {/* Thin divider */}
          <div style={{
            height: 1, flexShrink: 0,
            background: `linear-gradient(90deg, ${C.border3}, transparent)`,
          }} />

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 6 : 5, flex: 1, overflow: 'hidden' }}>
            {shownBullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{
                  color: i === 0 ? C.amber : C.amberDim,
                  fontSize: i === 0 ? 9 : 7,
                  marginTop: i === 0 ? 1 : 2,
                  flexShrink: 0, lineHeight: 1,
                }}>
                  {i === 0 ? '▸' : '▪'}
                </span>
                <span style={{
                  fontSize: i === 0 ? (isStory ? 8.5 : 9) : (isStory ? 7.5 : 8),
                  color: i === 0 ? C.cream : C.textDim,
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: i === 0 ? 3 : 2,
                  WebkitBoxOrient: 'vertical',
                  fontWeight: i === 0 ? 'bold' : 'normal',
                }}>
                  {b}
                </span>
              </div>
            ))}
          </div>

          {/* Decorative bar chart */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12, marginTop: 'auto', flexShrink: 0 }}>
            {[45, 72, 38, 85, 60, 28, 70, 44, 90, 55, 35, 65, 50, 80].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: (h / 100) * 12,
                background:
                  h >= 80 ? C.amber :
                  h >= 60 ? C.amberDim :
                  h >= 40 ? C.border3 :
                  C.border,
              }} />
            ))}
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ height: 1, flexShrink: 0, background: `linear-gradient(90deg, transparent, ${C.amberDim}, transparent)` }} />

        {/* Footer */}
        <div style={{
          padding: '5px 10px',
          background: C.bg3,
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 6, color: C.textFaint, flex: 1, lineHeight: 1.5, letterSpacing: 0.2 }}>
            {disclaimer}
          </span>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <span style={{ fontSize: 5.5, color: C.amberDim, letterSpacing: 1 }}>
              {isStory ? '1080×1920' : '1080×1350'}
            </span>
            <span style={{ fontSize: 5, color: C.textFaint, letterSpacing: 0.5 }}>bist.radar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Onboarding / empty state ──────────────────────────────────────────── */
function EmptyState({ activePlatform }: { activePlatform: ContentPlatform }) {
  const steps = [
    { n: '01', text: 'Haber, KAP veya kurum raporunda "+ İÇERİĞE EKLE" butonuna tıkla' },
    { n: '02', text: 'Şablon seç veya platform seç → ▶ OLUŞTUR butonuna bas' },
    { n: '03', text: 'IG için ⬇ PNG İNDİR · Diğer platformlar için ◎ KOPYALA' },
  ];
  return (
    <div style={{ padding: '10px 10px' }}>
      <div style={{ border: '1px solid var(--border-2)', marginBottom: 12, background: 'var(--bg-3)' }}>
        <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', fontSize: 7, color: 'var(--amber)', letterSpacing: 2 }}>
          KULLANIM AKIŞI
        </div>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '6px 8px',
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 'bold', letterSpacing: 1, flexShrink: 0, minWidth: 16 }}>
              {s.n}
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6 }}>PLATFORM DESTEKLERİ</div>
      {PLATFORMS.map((p) => {
        const active = activePlatform === p.id;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 9, color: active ? 'var(--amber)' : 'var(--text-dim)', minWidth: 12 }}>{p.icon}</span>
            <span style={{ fontSize: 8, color: active ? 'var(--amber)' : 'var(--text-dim)', flex: 1, letterSpacing: 1 }}>{p.label}</span>
            <span style={{ fontSize: 7, color: 'var(--text-faint)' }}>{p.desc}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function ContentStudio() {
  const {
    selectedSources, removeSource, clearSources, addSource,
    activePlatform, setActivePlatform,
    generatedContent, generateForPlatform,
    topNewsItems, topKapItems,
  } = useDashboardStore();

  const [editedTitle,   setEditedTitle]   = useState('');
  const [editedBody,    setEditedBody]    = useState('');
  const [editedTags,    setEditedTags]    = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [exportState,   setExportState]   = useState<ExportState>('idle');
  const [exportError,   setExportError]   = useState('');
  const [isGenerating,  setIsGenerating]  = useState(false);
  const prevContentRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Title suggestions, derived from selected sources + active template
  const suggestions = useMemo(
    () => buildSuggestions(selectedSources, activeTemplate),
    [selectedSources, activeTemplate],
  );

  // Sync editable fields when new content is generated
  useEffect(() => {
    if (!generatedContent) return;
    const key = generatedContent.createdAt;
    if (key !== prevContentRef.current) {
      setEditedTitle(generatedContent.title);
      setEditedBody(generatedContent.body);
      setEditedTags(buildHashtags(selectedSources, activePlatform));
      prevContentRef.current = key;
      setIsGenerating(false);
    }
  }, [generatedContent, selectedSources, activePlatform]);

  function handleGenerate() {
    if (selectedSources.length === 0) return;
    setIsGenerating(true);
    generateForPlatform();
  }

  function handleAutoFillDaily() {
    clearSources();
    setActiveTemplate('DAILY');
    const combined = [
      ...topNewsItems.map((n) => ({
        id: n.id, type: 'NEWS' as const,
        title: n.title, score: n.importanceScore,
        date: n.date, url: n.sourceUrl,
      })),
      ...topKapItems.map((k) => ({
        id: k.id, type: 'KAP' as const,
        title: k.title, score: k.importanceScore,
        date: k.date, url: k.sourceUrl,
      })),
    ].sort((a, b) => b.score - a.score).slice(0, 5);
    for (const item of combined) {
      addSource({ id: item.id, type: item.type, title: item.title, date: item.date, url: item.url });
    }
  }

  function handleAutoFillKap() {
    clearSources();
    setActiveTemplate('FLASH');
    for (const k of topKapItems.slice(0, 3)) {
      addSource({ id: k.id, type: 'KAP', title: k.title, date: k.date, url: k.sourceUrl });
    }
  }

  function handleCopy() {
    if (!generatedContent) return;
    const text = [editedTitle, '', editedBody, '', editedTags.join('  ')].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  async function handleExport() {
    if (!cardRef.current || !generatedContent) return;
    setExportState('exporting');
    setExportError('');
    try {
      const { toPng } = await import('html-to-image');
      const node = cardRef.current;
      const pixelRatio = 1080 / node.offsetWidth;
      const dataUrl = await toPng(node, { pixelRatio, cacheBust: true });
      const date     = new Date().toISOString().slice(0, 10);
      const platSlug = generatedContent.platform.toLowerCase().replace(/_/g, '-');
      const link = document.createElement('a');
      link.download = `bist-radar-${date}-${platSlug}.png`;
      link.href = dataUrl;
      link.click();
      setExportState('idle');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
      setExportState('error');
    }
  }

  const isIg      = IS_INSTAGRAM(activePlatform);
  const hasContent = Boolean(generatedContent);

  return (
    <div className="panel">
      {/* Header */}
      <div className="ph">
        <span className={`dot ${hasContent ? 'dot-live' : ''}`} />
        <span className="ph-title">İÇERİK STÜDYOSU</span>
        <span className="ph-right">
          {selectedSources.length > 0 ? `${selectedSources.length} KAYNAK` : 'KAYNAK SEÇ'}
        </span>
      </div>

      {/* Platform selector */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 3, flexShrink: 0 }}>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            className={`plat-btn ${activePlatform === p.id ? 'plat-active' : ''}`}
            onClick={() => setActivePlatform(p.id)}
            title={p.desc}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Auto-fill shortcuts */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 5 }}>HIZLI DOLDUR</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleAutoFillDaily}
            disabled={topNewsItems.length === 0 && topKapItems.length === 0}
            style={{
              flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 500,
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
              color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 4, lineHeight: 1.4, textAlign: 'center', transition: 'all .15s',
            }}
            title="En yüksek skorlu 5 haber+KAP bildirimiyle doldur"
          >
            📊 Günlük Özet
          </button>
          <button
            onClick={handleAutoFillKap}
            disabled={topKapItems.length === 0}
            style={{
              flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 500,
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
              color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 4, lineHeight: 1.4, textAlign: 'center', transition: 'all .15s',
            }}
            title="En önemli 3 KAP bildirimiyle doldur"
          >
            📋 KAP Özeti
          </button>
        </div>
      </div>

      {/* Templates */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 5 }}>ŞABLONLAR</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TEMPLATES.map((t) => {
            const active = activeTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTemplate(active ? null : t.id);
                  if (!active && suggestions.length > 0) {
                    const s = buildSuggestions(selectedSources, t.id);
                    if (s[0] && !generatedContent) setEditedTitle(s[0]);
                  }
                }}
                style={{
                  flex: 1, padding: '6px 4px',
                  background: active ? '#FEF3C7' : 'var(--bg-3)',
                  border: active ? '1px solid var(--amber)' : '1px solid var(--border-2)',
                  color: active ? 'var(--amber)' : 'var(--text-dim)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 11, fontWeight: active ? 600 : 500,
                  lineHeight: 1.4, textAlign: 'center', borderRadius: 4,
                  transition: 'all .15s',
                }}
              >
                <span style={{ display: 'block', fontSize: 10, marginBottom: 1 }}>{t.icon}</span>
                {t.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Source queue */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0, maxHeight: 90, overflowY: 'auto' }}>
        <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 4 }}>
          KAYNAK KUYRUGU{selectedSources.length > 0 ? ` · ${selectedSources.length}` : ''}
        </div>
        {selectedSources.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-faint)', lineHeight: 1.7, fontStyle: 'italic' }}>
            Henüz içerik seçilmedi — soldaki kartlardan ekle
          </div>
        ) : selectedSources.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>{srcIcon(s.type)}</span>
            <span style={{ fontSize: 7, color: 'var(--amber-dim)', letterSpacing: 0.5, flexShrink: 0, marginTop: 2, minWidth: 32 }}>
              {srcLabel(s.type)}
            </span>
            <span style={{
              fontSize: 9, color: 'var(--cream)', flex: 1, lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {s.title}
            </span>
            <button
              onClick={() => removeSource(s.id)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, flexShrink: 0, padding: 0 }}
              title="Çıkar"
            >×</button>
          </div>
        ))}
      </div>

      {/* Title suggestions (when sources exist but no content yet, or always show) */}
      {selectedSources.length > 0 && suggestions.length > 0 && (
        <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 4 }}>
            BAŞLIK ÖNERİLERİ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setEditedTitle(s)}
                style={{
                  width: '100%', textAlign: 'left', background: 'transparent',
                  border: '1px solid var(--border)', padding: '3px 6px',
                  color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'monospace',
                  fontSize: 8, lineHeight: 1.4,
                  transition: 'border-color .15s, color .15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--amber-dim)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--cream)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate + Clear */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexShrink: 0 }}>
        <button
          className="btn-primary"
          disabled={selectedSources.length === 0 || isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? '⧖ OLUŞTURULUYOR...' : '▶ OLUŞTUR'}
        </button>
        {selectedSources.length > 0 && (
          <button className="btn-ghost" onClick={clearSources} title="Temizle">✕</button>
        )}
      </div>

      {/* Content / Empty area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!generatedContent ? (
          <EmptyState activePlatform={activePlatform} />
        ) : (
          <div className="fi">
            {/* Platform label row */}
            <div style={{
              padding: '4px 8px', borderBottom: '1px solid var(--border)',
              fontSize: 7, color: 'var(--amber)', letterSpacing: 2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{PLATFORMS.find((p) => p.id === generatedContent.platform)?.icon}</span>
              <span>{generatedContent.platform.replace(/_/g, ' ')}</span>
              {activeTemplate && (
                <span style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', padding: '1px 5px' }}>
                  {TEMPLATES.find((t) => t.id === activeTemplate)?.label.toUpperCase()}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--text-faint)' }}>
                {new Date(generatedContent.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Editable title */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>BAŞLIK</div>
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="t-input"
                style={{ fontSize: 10, color: 'var(--cream)' }}
              />
            </div>

            {/* IG preview + export */}
            {isIg && (
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <InstagramPreview
                  title={editedTitle}
                  bullets={generatedContent.bullets}
                  companyCodes={generatedContent.companyCodes}
                  sourceCount={generatedContent.sources.length}
                  disclaimer={generatedContent.disclaimer}
                  platform={activePlatform}
                  createdAt={generatedContent.createdAt}
                  template={activeTemplate}
                  cardRef={cardRef}
                />

                <div style={{ padding: '5px 8px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 9 }}
                    disabled={exportState === 'exporting'}
                    onClick={handleExport}
                  >
                    {exportState === 'exporting' ? '⧖ EXPORT...' : '⬇ PNG İNDİR'}
                  </button>
                  <span style={{ fontSize: 7, color: 'var(--text-faint)', letterSpacing: 0.5 }}>
                    {activePlatform === 'INSTAGRAM_STORY' ? '1080×1920' : '1080×1350'} px
                  </span>
                </div>

                {exportState === 'error' && (
                  <div style={{
                    margin: '0 8px 6px', padding: '5px 8px',
                    background: 'var(--bg-3)', border: '1px solid var(--red)',
                    fontSize: 8, color: 'var(--red)', lineHeight: 1.6,
                  }}>
                    <span style={{ letterSpacing: 1 }}>ERR ›</span> {exportError}
                  </div>
                )}
              </div>
            )}

            {/* Editable body */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>METİN</div>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={9}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontFamily: 'inherit', fontSize: 10,
                  lineHeight: 1.55, padding: '5px 6px',
                  resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            {/* Hashtags — editable chips */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>ETİKETLER</div>
              <div style={{ fontSize: 9, color: 'var(--amber-dim)', lineHeight: 1.7 }}>
                {editedTags.join('  ')}
              </div>
            </div>

            {/* Source attribution */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>
                KAYNAKLAR · {generatedContent.sources.length}
              </div>
              {generatedContent.sources.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, flexShrink: 0 }}>{srcIcon(s.type)}</span>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.35, flex: 1 }}>
                    {s.title.length > 60 ? s.title.slice(0, 57) + '…' : s.title}
                  </span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="src-link" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                      ↗
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-faint)', letterSpacing: 0.3, lineHeight: 1.5 }}>
                {generatedContent.disclaimer}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding: '6px 8px', display: 'flex', gap: 5 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCopy}>
                {copied ? '✓ KOPYALANDI' : '◎ KOPYALA'}
              </button>
              <button className="btn-ghost" onClick={handleGenerate} title="Yeniden oluştur" style={{ flexShrink: 0 }}>↺</button>
              <button className="btn-ghost" onClick={clearSources} title="Temizle" style={{ flexShrink: 0 }}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
