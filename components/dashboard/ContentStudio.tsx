'use client';

import { useDashboardStore } from '@/store/dashboard-store';
import { ContentPlatform } from '@/types/content';

const PLATFORMS: { id: ContentPlatform; label: string; icon: string }[] = [
  { id: 'INSTAGRAM_POST', label: 'IG POST', icon: '◈' },
  { id: 'INSTAGRAM_CAROUSEL', label: 'IG CAROUSEL', icon: '◫' },
  { id: 'INSTAGRAM_STORY', label: 'IG STORY', icon: '◻' },
  { id: 'X_THREAD', label: 'X THREAD', icon: '✕' },
  { id: 'LINKEDIN', label: 'LINKEDIN', icon: '▤' },
  { id: 'TELEGRAM', label: 'TELEGRAM', icon: '✈' },
];

export default function ContentStudio() {
  const {
    selectedSources,
    removeSource,
    clearSources,
    activePlatform,
    setActivePlatform,
    generatedContent,
    generateForPlatform,
  } = useDashboardStore();

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span className="dot" />
        <span className="title">İÇERİK STÜDYOSU</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--terminal-text-dim)' }}>
          {selectedSources.length} KAYNAK SEÇİLİ
        </span>
      </div>

      {/* Platform selector */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            className={`platform-btn ${activePlatform === p.id ? 'active' : ''}`}
            onClick={() => setActivePlatform(p.id)}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Selected sources */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--terminal-border)', maxHeight: 120, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, color: 'var(--terminal-text-dim)', letterSpacing: 1, marginBottom: 4 }}>
          SEÇİLİ KAYNAKLAR
        </div>
        {selectedSources.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--terminal-text-dim)' }}>
            ← Soldan haber, KAP bildirimi veya kurum raporu seçin
          </div>
        ) : selectedSources.map((s) => (
          <div
            key={s.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}
          >
            <span style={{ fontSize: 8, color: 'var(--terminal-amber-dim)', minWidth: 18 }}>
              {s.type === 'NEWS' ? '📰' : s.type === 'KAP' ? '📋' : '📊'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--terminal-cream)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title}
            </span>
            <button
              onClick={() => removeSource(s.id)}
              style={{ background: 'none', border: 'none', color: 'var(--terminal-red-bright)', cursor: 'pointer', fontSize: 10, padding: '0 2px' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Generate button */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', gap: 6 }}>
        <button
          onClick={() => generateForPlatform()}
          disabled={selectedSources.length === 0}
          style={{
            flex: 1,
            padding: '5px',
            background: selectedSources.length > 0 ? 'rgba(200, 168, 75, 0.1)' : 'transparent',
            border: `1px solid ${selectedSources.length > 0 ? 'var(--terminal-amber)' : 'var(--terminal-border)'}`,
            color: selectedSources.length > 0 ? 'var(--terminal-amber-bright)' : 'var(--terminal-text-dim)',
            cursor: selectedSources.length > 0 ? 'pointer' : 'default',
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          ▶ İÇERİK OLUŞTUR
        </button>
        {selectedSources.length > 0 && (
          <button
            onClick={clearSources}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--terminal-border-bright)',
              color: 'var(--terminal-text-dim)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 10,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Generated content preview */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {!generatedContent ? (
          <div style={{ color: 'var(--terminal-text-dim)', fontSize: 10 }}>
            <div style={{ marginBottom: 8, letterSpacing: 1 }}>HAZIR ŞABLONLAR:</div>
            {PLATFORMS.map((p) => (
              <div key={p.id} style={{ marginBottom: 3, color: 'var(--terminal-border-bright)', fontSize: 9 }}>
                {p.icon} {p.label}
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 9, lineHeight: 1.6 }}>
              1. Soldan kaynak seç<br />
              2. Platform seç<br />
              3. İçerik oluştur<br />
              4. Kopyala ve paylaş
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ fontSize: 9, color: 'var(--terminal-amber)', letterSpacing: 2, marginBottom: 6 }}>
              {generatedContent.platform} · {new Date(generatedContent.createdAt).toLocaleTimeString('tr-TR')}
            </div>

            <div style={{
              background: 'var(--terminal-bg-3)',
              border: '1px solid var(--terminal-border-bright)',
              padding: 8,
              marginBottom: 6,
              fontSize: 11,
              color: 'var(--terminal-cream)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {generatedContent.body}
            </div>

            <div style={{ fontSize: 9, color: 'var(--terminal-amber-dim)', marginBottom: 6 }}>
              {generatedContent.hashtags.join(' ')}
            </div>

            <div style={{ fontSize: 8, color: 'var(--terminal-text-dim)', letterSpacing: 1 }}>
              ⚠ {generatedContent.disclaimer}
            </div>

            <button
              onClick={() => {
                const text = `${generatedContent.body}\n\n${generatedContent.hashtags.join(' ')}\n\n${generatedContent.disclaimer}`;
                navigator.clipboard.writeText(text).catch(() => {});
              }}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '4px',
                background: 'transparent',
                border: '1px solid var(--terminal-border-bright)',
                color: 'var(--terminal-cream-dim)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 9,
                letterSpacing: 2,
              }}
            >
              ◎ KOPYALA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
