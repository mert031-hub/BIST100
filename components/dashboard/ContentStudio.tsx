'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { ContentPlatform, ContentSource } from '@/types/content';

type ExportState = 'idle' | 'exporting' | 'error';

/* ─── Hard-coded palette (CSS vars don't resolve inside html-to-image canvas) */
const C = {
  bg:          '#050504',
  bg2:         '#0a0908',
  bg3:         '#111008',
  border:      '#1e1c14',
  border2:     '#2c2a1e',
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

/* ─── Source icon / label ──────────────────────────────────────────────── */
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

/* ─── Instagram premium card ────────────────────────────────────────────── */
function InstagramPreview({
  title, bullets, companyCodes, sourceCount, disclaimer, platform, createdAt, cardRef,
}: {
  title: string;
  bullets: string[];
  companyCodes: string[];
  sourceCount: number;
  disclaimer: string;
  platform: ContentPlatform;
  createdAt: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const isStory = platform === 'INSTAGRAM_STORY';
  const dateStr = new Date(createdAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const shownBullets = bullets.slice(0, isStory ? 3 : 5);

  return (
    <div style={{ padding: '10px 10px 6px', display: 'flex', justifyContent: 'center', background: C.bg2 }}>
      {/* The exported node */}
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
        {/* Top accent gradient line */}
        <div style={{
          height: 2, flexShrink: 0,
          background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
        }} />

        {/* Header: brand + date */}
        <div style={{
          padding: '7px 10px 6px',
          borderBottom: `1px solid ${C.border2}`,
          background: C.bg3,
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, color: C.amber, lineHeight: 1 }}>◈</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 8, color: C.amberBright, fontWeight: 'bold',
              letterSpacing: 3, textTransform: 'uppercase',
            }}>
              BIST RADAR STUDIO
            </div>
            <div style={{ fontSize: 6.5, color: C.textDim, letterSpacing: 1.5, marginTop: 1 }}>
              bist.radar
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 7, color: C.amber, letterSpacing: 1 }}>{dateStr}</div>
            <div style={{
              fontSize: 6, color: C.bg, background: C.amberDim,
              padding: '1px 5px', marginTop: 2, letterSpacing: 1, display: 'inline-block',
            }}>
              {sourceCount} KAYNAK
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, padding: isStory ? '10px 10px' : '10px 10px 6px',
          display: 'flex', flexDirection: 'column', gap: isStory ? 8 : 7,
          overflow: 'hidden',
        }}>
          {/* Company tags */}
          {companyCodes.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {companyCodes.map((c) => (
                <span key={c} style={{
                  fontSize: 7, color: C.amberBright, letterSpacing: 1.5,
                  border: `1px solid ${C.amberDim}`, padding: '1px 6px',
                  background: C.amberGlow,
                }}>
                  ${c}
                </span>
              ))}
            </div>
          )}

          {/* Amber separator */}
          <div style={{
            height: 1,
            background: `linear-gradient(90deg, ${C.amber}, ${C.amberDim}, transparent)`,
            flexShrink: 0,
          }} />

          {/* Title — hero text */}
          <div style={{
            fontSize: isStory ? 11 : 12,
            color: C.cream,
            fontWeight: 'bold',
            lineHeight: 1.5,
            letterSpacing: 0.3,
          }}>
            {title}
          </div>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 5 : 4, flex: 1 }}>
            {shownBullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{
                  color: C.amber, fontSize: 8, marginTop: 2, flexShrink: 0, lineHeight: 1,
                }}>
                  ▪
                </span>
                <span style={{
                  fontSize: isStory ? 8 : 8.5,
                  color: C.textDim,
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {b}
                </span>
              </div>
            ))}
          </div>

          {/* Decorative bar chart */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, marginTop: 'auto', flexShrink: 0 }}>
            {[55, 80, 45, 90, 65, 35, 75, 50, 85, 60, 40, 70].map((h, i) => (
              <div key={i} style={{
                flex: 1,
                height: (h / 100) * 14,
                background:
                  i % 4 === 0 ? C.amber :
                  i % 4 === 1 ? C.amberDim :
                  i % 4 === 2 ? C.border2 :
                  C.border,
              }} />
            ))}
          </div>
        </div>

        {/* Bottom accent line */}
        <div style={{ height: 1, flexShrink: 0, background: `linear-gradient(90deg, transparent, ${C.amberDim}, transparent)` }} />

        {/* Footer */}
        <div style={{
          padding: '5px 10px',
          background: C.bg3,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 6.5, color: C.textFaint, flex: 1, lineHeight: 1.5, letterSpacing: 0.3 }}>
            {disclaimer}
          </span>
          <span style={{ fontSize: 6, color: C.amberDim, letterSpacing: 1, flexShrink: 0 }}>
            {isStory ? '1080×1920' : '1080×1350'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Onboarding / empty state ──────────────────────────────────────────── */
function EmptyState({ activePlatform }: { activePlatform: ContentPlatform }) {
  const steps = [
    { n: '01', icon: '📋', text: 'Haber, KAP veya kurum raporunda "+ İÇERİĞE EKLE" butonuna tıkla' },
    { n: '02', icon: '▶',  text: 'Platform seç → ▶ OLUŞTUR butonuna bas' },
    { n: '03', icon: '⬇',  text: 'IG için ⬇ PNG İNDİR · Diğer platformlar için ◎ KOPYALA' },
  ];

  return (
    <div style={{ padding: '10px 10px' }}>
      {/* Onboarding steps */}
      <div style={{
        border: '1px solid var(--border-2)', marginBottom: 12,
        background: 'var(--bg-3)',
      }}>
        <div style={{
          padding: '4px 8px', borderBottom: '1px solid var(--border)',
          fontSize: 7, color: 'var(--amber)', letterSpacing: 2,
        }}>
          KULLANIM AKIŞI
        </div>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '6px 8px',
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'flex-start',
          }}>
            <span style={{
              fontSize: 9, color: 'var(--amber)', fontWeight: 'bold',
              letterSpacing: 1, flexShrink: 0, minWidth: 16,
            }}>
              {s.n}
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              {s.text}
            </span>
          </div>
        ))}
      </div>

      {/* Platform list */}
      <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6 }}>
        PLATFORM DESTEKLERİ
      </div>
      {PLATFORMS.map((p) => {
        const active = activePlatform === p.id;
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 9, color: active ? 'var(--amber)' : 'var(--text-dim)', minWidth: 12 }}>
              {p.icon}
            </span>
            <span style={{ fontSize: 8, color: active ? 'var(--amber)' : 'var(--text-dim)', flex: 1, letterSpacing: 1 }}>
              {p.label}
            </span>
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
    selectedSources, removeSource, clearSources,
    activePlatform, setActivePlatform,
    generatedContent, generateForPlatform,
  } = useDashboardStore();

  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody,  setEditedBody]  = useState('');
  const [copied,       setCopied]      = useState(false);
  const [exportState,  setExportState] = useState<ExportState>('idle');
  const [exportError,  setExportError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const prevContentRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync editable fields when new content is generated
  useEffect(() => {
    if (!generatedContent) return;
    const key = generatedContent.createdAt;
    if (key !== prevContentRef.current) {
      setEditedTitle(generatedContent.title);
      setEditedBody(generatedContent.body);
      prevContentRef.current = key;
      setIsGenerating(false);
    }
  }, [generatedContent]);

  function handleGenerate() {
    if (selectedSources.length === 0) return;
    setIsGenerating(true);
    // generateForPlatform is synchronous; the useEffect above will clear isGenerating
    generateForPlatform();
  }

  function handleCopy() {
    if (!generatedContent) return;
    const text = [editedTitle, '', editedBody, '', generatedContent.hashtags.join(' ')].filter(Boolean).join('\n');
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
      // Scale up to target pixel width; aspect ratio is already correct via CSS
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
      <div style={{
        padding: '5px 8px', borderBottom: '1px solid var(--border)',
        display: 'flex', flexWrap: 'wrap', gap: 3, flexShrink: 0,
      }}>
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

      {/* Source queue */}
      <div style={{
        padding: '5px 8px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, maxHeight: 108, overflowY: 'auto',
      }}>
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
            <span style={{
              fontSize: 7, color: 'var(--amber-dim)', letterSpacing: 0.5,
              flexShrink: 0, marginTop: 2, minWidth: 32,
            }}>
              {srcLabel(s.type)}
            </span>
            <span style={{
              fontSize: 9, color: 'var(--cream)', flex: 1, lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {s.title}
            </span>
            <button
              onClick={() => removeSource(s.id)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, flexShrink: 0, padding: 0 }}
              title="Çıkar"
            >
              ×
            </button>
          </div>
        ))}
      </div>

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
          <button className="btn-ghost" onClick={clearSources} title="Temizle">
            ✕
          </button>
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
              <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--text-faint)' }}>
                {new Date(generatedContent.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Editable title */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>
                BAŞLIK
              </div>
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
                  cardRef={cardRef}
                />

                {/* PNG export row */}
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
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>
                METİN
              </div>
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

            {/* Hashtags */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1.5, marginBottom: 3 }}>
                ETİKETLER
              </div>
              <div style={{ fontSize: 9, color: 'var(--amber-dim)', lineHeight: 1.7 }}>
                {generatedContent.hashtags.join('  ')}
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
              <button className="btn-ghost" onClick={handleGenerate} title="Yeniden oluştur" style={{ flexShrink: 0 }}>
                ↺
              </button>
              <button className="btn-ghost" onClick={clearSources} title="Temizle" style={{ flexShrink: 0 }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
