'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { ContentPlatform, ContentSource } from '@/types/content';

/* ─── Platform config ───────────────────────────────────────────────────── */
type PlatformCfg = { id: ContentPlatform; label: string; icon: string; desc: string };

const PLATFORMS: PlatformCfg[] = [
  { id: 'INSTAGRAM_POST',     label: 'IG POST',    icon: '◈', desc: '1080×1350' },
  { id: 'INSTAGRAM_CAROUSEL', label: 'CAROUSEL',   icon: '◫', desc: '1080×1350' },
  { id: 'INSTAGRAM_STORY',    label: 'IG STORY',   icon: '◻', desc: '1080×1920' },
  { id: 'X_THREAD',           label: 'X FLOOD',    icon: '✕', desc: '280 kar' },
  { id: 'LINKEDIN',           label: 'LINKEDIN',   icon: '▤', desc: 'makale' },
  { id: 'TELEGRAM',           label: 'TELEGRAM',   icon: '✈', desc: 'mesaj' },
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

/* ─── Instagram 1080×1350 preview card ────────────────────────────────── */
function InstagramPreview({
  title, bullets, companyCodes, sourceCount, disclaimer, platform, createdAt,
}: {
  title: string;
  bullets: string[];
  companyCodes: string[];
  sourceCount: number;
  disclaimer: string;
  platform: ContentPlatform;
  createdAt: string;
}) {
  const isStory = platform === 'INSTAGRAM_STORY';
  const dateStr = new Date(createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  const shownBullets = bullets.slice(0, 5);

  return (
    <div style={{ padding: '8px', display: 'flex', justifyContent: 'center', background: 'var(--bg-2)' }}>
      <div style={{
        width: '100%',
        maxWidth: isStory ? 160 : '100%',
        aspectRatio: isStory ? '9/16' : '4/5',
        background: 'var(--bg)',
        border: '1px solid var(--border-2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Header band */}
        <div style={{
          background: 'var(--bg-3)',
          borderBottom: '1px solid var(--amber-dim)',
          padding: '5px 8px',
          display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--amber)' }}>◈</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: 'var(--amber)', fontWeight: 'bold', letterSpacing: 2 }}>
              BIST RADAR STUDIO
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-faint)', letterSpacing: 1 }}>
              {dateStr} · {sourceCount} KAYNAK
            </div>
          </div>
          <span style={{ fontSize: 6, color: 'var(--text-faint)' }}>
            {isStory ? '1080×1920' : '1080×1350'}
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          {/* Company tags */}
          {companyCodes.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {companyCodes.map((c) => (
                <span key={c} style={{
                  fontSize: 7, color: 'var(--amber)', letterSpacing: 1,
                  border: '1px solid var(--amber-dim)', padding: '1px 5px',
                }}>
                  ${c}
                </span>
              ))}
            </div>
          )}

          {/* Amber divider */}
          <div style={{ height: 1, background: 'var(--amber-dim)' }} />

          {/* Title */}
          <div style={{
            fontSize: isStory ? 10 : 11,
            color: 'var(--cream)',
            fontWeight: 'bold',
            lineHeight: 1.4,
          }}>
            {title}
          </div>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {shownBullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', fontSize: 7, marginTop: 1, flexShrink: 0 }}>▪</span>
                <span style={{
                  fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {b}
                </span>
              </div>
            ))}
          </div>

          {/* Decorative bar chart */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
            {[65, 40, 80, 55, 90, 45, 70, 85, 50, 75].map((h, i) => (
              <div key={i} style={{
                flex: 1,
                height: h / 10,
                background: i % 3 === 0 ? 'var(--amber)' : i % 3 === 1 ? 'var(--amber-dim)' : 'var(--border-2)',
              }} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: 'var(--bg-3)',
          borderTop: '1px solid var(--border)',
          padding: '4px 8px',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 6, color: 'var(--text-faint)', letterSpacing: 0.5, lineHeight: 1.5 }}>
            {disclaimer}
          </div>
        </div>
      </div>
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

  // Local editable state — resets when new content is generated
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [copied, setCopied] = useState(false);
  const prevContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!generatedContent) return;
    const key = generatedContent.createdAt;
    if (key !== prevContentRef.current) {
      setEditedTitle(generatedContent.title);
      setEditedBody(generatedContent.body);
      prevContentRef.current = key;
    }
  }, [generatedContent]);

  function handleCopy() {
    if (!generatedContent) return;
    const hashtags = generatedContent.hashtags.join(' ');
    const text = [editedTitle, '', editedBody, '', hashtags].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const isIg = IS_INSTAGRAM(activePlatform);
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
        padding: '5px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexWrap: 'wrap', gap: 3,
        flexShrink: 0,
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
        padding: '5px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        maxHeight: 108,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
          KAYNAK KUYRUGU {selectedSources.length > 0 && `· ${selectedSources.length}`}
        </div>
        {selectedSources.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-faint)', lineHeight: 1.7 }}>
            ← Habere, KAP bildirimine veya kurum raporuna<br />
            &nbsp;&nbsp;&nbsp;"+ İÇERİĞE EKLE" butonuna tıklayın
          </div>
        ) : selectedSources.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>{srcIcon(s.type)}</span>
            <span style={{
              fontSize: 7, color: 'var(--amber-dim)', letterSpacing: 0.5,
              flexShrink: 0, marginTop: 2, minWidth: 28,
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
          disabled={selectedSources.length === 0}
          onClick={() => generateForPlatform()}
        >
          ▶ OLUŞTUR
        </button>
        {selectedSources.length > 0 && (
          <button className="btn-ghost" onClick={clearSources} title="Temizle">
            ✕ TEMIZLE
          </button>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!generatedContent ? (
          /* Empty state */
          <div style={{ padding: '12px 10px' }}>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 10 }}>
              PLATFORM DESTEKLERİ
            </div>
            {PLATFORMS.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 10, color: activePlatform === p.id ? 'var(--amber)' : 'var(--text-dim)', minWidth: 12 }}>
                  {p.icon}
                </span>
                <span style={{ fontSize: 9, color: activePlatform === p.id ? 'var(--amber)' : 'var(--text-dim)', flex: 1, letterSpacing: 1 }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{p.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 8, color: 'var(--text-faint)', lineHeight: 2, letterSpacing: 0.5 }}>
              1. SOL PANELDEN KAYNAK SEÇ<br/>
              2. PLATFORM BELİRLE<br/>
              3. ▶ OLUŞTUR BUTONUNA BAS<br/>
              4. İSTEĞE GÖRE DÜZENLE<br/>
              5. ◎ KOPYALA VE PAYLAŞ
            </div>
          </div>
        ) : (
          <div>
            {/* Platform label row */}
            <div style={{
              padding: '4px 8px', borderBottom: '1px solid var(--border)',
              fontSize: 8, color: 'var(--amber)', letterSpacing: 2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{PLATFORMS.find((p) => p.id === generatedContent.platform)?.icon}</span>
              <span>{generatedContent.platform.replace('_', ' ')}</span>
              <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--text-faint)' }}>
                {new Date(generatedContent.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Editable title */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 3 }}>
                BAŞLIK (DÜZENLENEBILIR)
              </div>
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="t-input"
                style={{ fontSize: 10, color: 'var(--cream)' }}
              />
            </div>

            {/* IG visual preview */}
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
                />
              </div>
            )}

            {/* Editable body */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 3 }}>
                METİN (DÜZENLENEBILIR)
              </div>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={10}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontFamily: 'inherit', fontSize: 10,
                  lineHeight: 1.5, padding: '5px 6px',
                  resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            {/* Hashtags */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 3 }}>
                ETİKETLER
              </div>
              <div style={{ fontSize: 9, color: 'var(--amber-dim)', lineHeight: 1.6 }}>
                {generatedContent.hashtags.join('  ')}
              </div>
            </div>

            {/* Source list */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 3 }}>
                KAYNAKLAR ({generatedContent.sources.length})
              </div>
              {generatedContent.sources.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, flexShrink: 0 }}>{srcIcon(s.type)}</span>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.35 }}>
                    {s.title.length > 60 ? s.title.slice(0, 57) + '...' : s.title}
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
              <div style={{ fontSize: 7, color: 'var(--text-faint)', letterSpacing: 0.5 }}>
                {generatedContent.disclaimer}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding: '6px 8px', display: 'flex', gap: 5 }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleCopy}
              >
                {copied ? '✓ KOPYALANDI' : '◎ KOPYALA'}
              </button>
              <button className="btn-ghost" onClick={() => generateForPlatform()} title="Yeniden oluştur">
                ↺
              </button>
              <button className="btn-ghost" onClick={clearSources} title="Temizle ve başla">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
