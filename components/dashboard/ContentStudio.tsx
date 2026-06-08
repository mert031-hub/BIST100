'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import { ContentPlatform, GeneratedContent } from '@/types/content';
import { ContentSource } from '@/types/content';

/* ─── Platform Config ───────────────────────────────────── */
type PlatformCfg = { id: ContentPlatform; label: string; icon: string; desc: string };

const PLATFORMS: PlatformCfg[] = [
  { id: 'INSTAGRAM_POST',     label: 'IG POST',      icon: '◈', desc: '1080×1080' },
  { id: 'INSTAGRAM_CAROUSEL', label: 'CAROUSEL',     icon: '◫', desc: '1080×1080' },
  { id: 'INSTAGRAM_STORY',    label: 'IG STORY',     icon: '◻', desc: '1080×1920' },
  { id: 'X_THREAD',           label: 'X THREAD',     icon: '✕', desc: '280 kar' },
  { id: 'LINKEDIN',           label: 'LINKEDIN',     icon: '▤', desc: 'makale' },
  { id: 'TELEGRAM',           label: 'TELEGRAM',     icon: '✈', desc: 'mesaj' },
];

const IS_INSTAGRAM = (p: ContentPlatform) =>
  p === 'INSTAGRAM_POST' || p === 'INSTAGRAM_CAROUSEL' || p === 'INSTAGRAM_STORY';

/* ─── Instagram Preview Card ───────────────────────────── */
function InstagramPreview({ content, platform }: { content: GeneratedContent; platform: ContentPlatform }) {
  const isStory = platform === 'INSTAGRAM_STORY';
  const mainSource = content.sources[0];
  const companies = content.sources
    .flatMap((s) => s.title.match(/\$[A-Z]{2,6}/g) ?? [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  return (
    <div className="ig-wrap">
      <div
        className="ig-card"
        style={{ aspectRatio: isStory ? '9/16' : '4/5', maxWidth: isStory ? 180 : '100%' }}
      >
        {/* Header band */}
        <div className="ig-header">
          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 'bold', letterSpacing: 2 }}>◈</span>
          <div>
            <div style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: 2, fontWeight: 'bold' }}>
              BIST RADAR STUDIO
            </div>
            <div style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1 }}>
              bist.radar · {new Date(content.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--text-faint)', letterSpacing: 1 }}>
            {isStory ? '1080×1920' : '1080×1350'}
          </span>
        </div>

        <div className="ig-body">
          {/* Company tags */}
          {companies.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {companies.map((c) => (
                <span key={c} style={{
                  fontSize: 8, color: 'var(--amber)', letterSpacing: 1,
                  border: '1px solid var(--amber-dim)', padding: '1px 5px',
                }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-2)', margin: '2px 0' }} />

          {/* Headline */}
          <div style={{
            fontSize: isStory ? 13 : 12,
            color: 'var(--cream)',
            fontWeight: 'bold',
            lineHeight: 1.45,
            flex: 1,
          }}>
            {mainSource?.title ?? 'Piyasa Güncelleme'}
          </div>

          {/* Additional sources */}
          {content.sources.slice(1, 3).map((s) => (
            <div key={s.id} style={{ fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              • {s.title}
            </div>
          ))}

          {/* Decorative bar */}
          <div style={{ display: 'flex', gap: 2, marginTop: 'auto', paddingTop: 4 }}>
            {[95, 70, 45, 80, 60, 90, 50, 75].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: h / 10,
                background: i % 3 === 0 ? 'var(--amber-dim)' : 'var(--border-2)',
                alignSelf: 'flex-end',
              }} />
            ))}
          </div>
        </div>

        <div className="ig-footer">
          <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 2 }}>
            Kaynak: {content.sources.map((s) => s.type).join(' · ')}
          </div>
          <div style={{ fontSize: 7, color: 'var(--text-faint)', letterSpacing: 0.5 }}>
            {content.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Source Type Icon ──────────────────────────────────── */
function srcIcon(type: ContentSource['type']) {
  if (type === 'NEWS') return '📰';
  if (type === 'KAP') return '📋';
  if (type === 'BROKER_REPORT') return '📊';
  return '🏛';
}

/* ─── Main Component ────────────────────────────────────── */
export default function ContentStudio() {
  const {
    selectedSources, removeSource, clearSources,
    activePlatform, setActivePlatform,
    generatedContent, generateForPlatform,
  } = useDashboardStore();

  const isIg = IS_INSTAGRAM(activePlatform);

  return (
    <div className="panel">
      {/* Header */}
      <div className="ph">
        <span className="dot" />
        <span className="ph-title">İÇERİK STÜDYOSU</span>
        <span className="ph-right">{selectedSources.length > 0 ? `${selectedSources.length} KAYNAK` : 'KAYNAK SEÇ'}</span>
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

      {/* Selected sources queue */}
      <div style={{
        padding: '5px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        maxHeight: 110,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
          KAYNAK KUYRUGU
        </div>
        {selectedSources.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            ← Habere, KAP bildirimine veya kurum raporuna tıklayın
          </div>
        ) : selectedSources.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>{srcIcon(s.type)}</span>
            <span style={{
              fontSize: 9, color: 'var(--cream)', flex: 1,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}>
              {s.title}
            </span>
            <button
              onClick={() => removeSource(s.id)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Generate + Clear buttons */}
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
            ✕
          </button>
        )}
      </div>

      {/* Preview / Content area */}
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
            <div style={{ marginTop: 12, fontSize: 8, color: 'var(--text-faint)', lineHeight: 1.8, letterSpacing: 0.5 }}>
              1. SOL PANELDEN KAYNAK SEÇ<br/>
              2. PLATFORM BELİRLE<br/>
              3. OLUŞTUR BUTONUNA BAS<br/>
              4. KOPYALA VE PAYLAŞ
            </div>
          </div>
        ) : (
          /* Generated content */
          <div className="fi">
            <div style={{
              padding: '4px 8px', borderBottom: '1px solid var(--border)',
              fontSize: 8, color: 'var(--amber)', letterSpacing: 2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{PLATFORMS.find((p) => p.id === generatedContent.platform)?.icon}</span>
              <span>{generatedContent.platform}</span>
              <span className="dim" style={{ marginLeft: 'auto' }}>
                {new Date(generatedContent.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Instagram visual preview */}
            {isIg && (
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <InstagramPreview content={generatedContent} platform={activePlatform} />
              </div>
            )}

            {/* Text content */}
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
                METİN
              </div>
              <div className="content-area" style={{ fontSize: isIg ? 10 : 11 }}>
                {generatedContent.body}
              </div>
            </div>

            {/* Hashtags */}
            <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 3 }}>
                ETIKETLER
              </div>
              <div style={{ fontSize: 9, color: 'var(--amber-dim)', lineHeight: 1.6 }}>
                {generatedContent.hashtags.join('  ')}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-faint)', letterSpacing: 0.5 }}>
                {generatedContent.disclaimer}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '6px 8px', display: 'flex', gap: 5 }}>
              <button
                className="btn-primary"
                style={{ fontSize: 9 }}
                onClick={() => {
                  const txt = [
                    generatedContent.body,
                    '',
                    generatedContent.hashtags.join(' '),
                    '',
                    generatedContent.disclaimer,
                  ].join('\n');
                  navigator.clipboard.writeText(txt).catch(() => {});
                }}
              >
                ◎ KOPYALA
              </button>
              <button
                className="btn-ghost"
                onClick={() => clearSources()}
              >
                ✕ TEMIZLE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
