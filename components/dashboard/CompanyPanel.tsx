'use client';

import { useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboard-store';
import { COMPANIES } from '@/data/companies';

function ageLabel(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m <  1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export default function CompanyPanel() {
  const {
    selectedCompany, setSelectedCompany,
    topNewsItems, topKapItems, topBrokerItems,
  } = useDashboardStore();

  const code = selectedCompany;
  if (!code) return null;

  const meta = COMPANIES[code];

  const news = useMemo(
    () => topNewsItems.filter((n) => n.relatedCompanies.includes(code)).slice(0, 10),
    [topNewsItems, code],
  );
  const kap = useMemo(
    () => topKapItems.filter((k) => k.companyCode === code).slice(0, 10),
    [topKapItems, code],
  );
  const brokers = useMemo(
    () => topBrokerItems.filter((b) => b.companyCode === code).slice(0, 10),
    [topBrokerItems, code],
  );

  const total = news.length + kap.length + brokers.length;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="ph" style={{ flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)', marginRight: 4 }}>{code}</span>
        {meta && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>
            {meta.name ?? meta.sector}
          </span>
        )}
        <span className="ph-right">{total} gelişme</span>
        <button
          onClick={() => setSelectedCompany(null)}
          style={{
            marginLeft: 8, padding: '2px 8px', fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border-2)',
            color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 3,
          }}
        >
          ✕ Kapat
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* KAP Bildirimleri */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', padding: '6px 16px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1 }}>
            KAP BİLDİRİMLERİ · {kap.length}
          </span>
        </div>
        {kap.length === 0 ? (
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
            KAP kaydı yok.
          </div>
        ) : kap.map((k) => (
          <div key={k.id} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
              fontWeight: 700, letterSpacing: 0.5,
            }}>KAP</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 2,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {k.title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{ageLabel(k.date)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>skor: {k.importanceScore}</span>
                {k.sourceUrl && (
                  <a href={k.sourceUrl} target="_blank" rel="noopener noreferrer" className="src-link">↗</a>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Son Haberler */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', padding: '6px 16px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1 }}>
            SON HABERLER · {news.length}
          </span>
        </div>
        {news.length === 0 ? (
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
            Haber yok.
          </div>
        ) : news.map((n) => (
          <div key={n.id} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB',
              fontWeight: 700, letterSpacing: 0.5,
            }}>HABER</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 2,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {n.title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{ageLabel(n.date)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{n.source}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>skor: {n.importanceScore}</span>
                {n.sourceUrl && (
                  <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" className="src-link">↗</a>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Kurum Raporları */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', padding: '6px 16px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1 }}>
            KURUM RAPORLARI · {brokers.length}
          </span>
        </div>
        {brokers.length === 0 ? (
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-faint)' }}>
            Kurum raporu yok.
          </div>
        ) : brokers.map((b) => (
          <div key={b.id} style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
              fontWeight: 700, letterSpacing: 0.5,
            }}>KURUM</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600 }}>{b.institution}</span>
                <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>{b.recommendation}</span>
                {b.newTargetPrice > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    TP {b.newTargetPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{ageLabel(b.date)}</span>
                {b.sourceUrl && (
                  <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" className="src-link">↗</a>
                )}
              </div>
              <div style={{ fontSize: 7, color: 'var(--text-faint)', marginTop: 4, letterSpacing: 0.3 }}>
                ⚠ Kaynak kurum görüşüdür. Yatırım tavsiyesi değildir.
              </div>
            </div>
          </div>
        ))}

        <div className="disc-footer">
          BİLGİLENDİRME AMAÇLIDIR · YATIRIM TAVSİYESİ DEĞİLDİR
        </div>
      </div>
    </div>
  );
}
