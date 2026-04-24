import { useEffect, useMemo, useState } from 'react';

const PHONE_PRESETS = [
  { id: 'iphone-1290x2796', label: 'iPhone 15 Pro Max (1290×2796)', w: 1290, h: 2796 },
  { id: 'iphone-1179x2556', label: 'iPhone 15/14 Pro (1179×2556)', w: 1179, h: 2556 },
  { id: 'android-1440x3200', label: 'Android QHD+ (1440×3200)', w: 1440, h: 3200 },
  { id: 'android-1080x2400', label: 'Android FHD+ (1080×2400)', w: 1080, h: 2400 },
];

const COLOR_THEMES = [
  {
    id: 'midnight-neon',
    label: 'Midnight Neon',
    bg: ['#0a0a13', '#00103c', '#0c2a56'],
    text: '#f5f7ff',
    glow: 'rgba(123, 214, 255, 0.75)',
    border: '#7bd6ff',
    accent: '#6af0ff',
  },
  {
    id: 'sunset-retro',
    label: 'Sunset Retro',
    bg: ['#2b0a0a', '#7d1f3d', '#c94f27'],
    text: '#fff9f2',
    glow: 'rgba(255, 180, 120, 0.75)',
    border: '#ffb270',
    accent: '#ffd5ad',
  },
  {
    id: 'matrix-green',
    label: 'Matrix Green',
    bg: ['#020d06', '#063317', '#0d5a2c'],
    text: '#d8ffe2',
    glow: 'rgba(100, 255, 160, 0.75)',
    border: '#66ff99',
    accent: '#abffcb',
  },
  {
    id: 'purple-haze',
    label: 'Purple Haze',
    bg: ['#14091f', '#3f1c66', '#6f43b5'],
    text: '#f7f1ff',
    glow: 'rgba(202, 164, 255, 0.8)',
    border: '#caa4ff',
    accent: '#e0ccff',
  },
];

const EMOJI_STRIPS = [
  { id: 'rave', label: 'Rave', text: '🎧 ✨ 🔊 💜 🌌 🎶 ⚡' },
  { id: 'festival', label: 'Festival', text: '🏕️ 🌲 🎡 🌄 🎵 🚌 🔥' },
  { id: 'party', label: 'Party', text: '🪩 💃 🕺 🎉 🍕 🌈 😎' },
  { id: 'space', label: 'Space', text: '🚀 🛸 🌠 🌙 ⭐️ 🔭 👾' },
];

function defaultOwner(memberName) {
  const trimmed = String(memberName || '').trim();
  if (!trimmed) return 'MY';
  return `${trimmed.toUpperCase()}'S`;
}

function wallpaperMessage(ownerText, contactHintLine) {
  return [
    `${ownerText} PHONE`,
    'IF FOUND PLEASE CONTACT',
    contactHintLine,
  ];
}

function newContact(name = '', phone = '') {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, phone };
}

function wrapByCharCount(text, maxChars = 34) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  if (raw.length <= maxChars) return [raw];
  const words = raw.split(/\s+/);
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  });
  if (cur) lines.push(cur);
  return lines;
}

export function PhoneWallpaperMaker({ api }) {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [ownerText, setOwnerText] = useState('MY');
  const [contacts, setContacts] = useState([newContact()]);
  const [presetId, setPresetId] = useState(PHONE_PRESETS[0].id);
  const [themeId, setThemeId] = useState(COLOR_THEMES[0].id);
  const [emojiStripId, setEmojiStripId] = useState(EMOJI_STRIPS[0].id);
  const [showEmojiStrip, setShowEmojiStrip] = useState(true);
  const [showScanlines, setShowScanlines] = useState(true);

  useEffect(() => {
    fetch(`${api}/members`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, [api]);

  const selectedMember = useMemo(
    () => members.find((m) => String(m.id) === String(selectedMemberId)),
    [members, selectedMemberId]
  );

  useEffect(() => {
    if (!selectedMember) return;
    setOwnerText(defaultOwner(selectedMember.name));
    const emergency = String(selectedMember.emergency_contact || '').trim();
    setContacts([
      newContact(
        emergency || selectedMember.name || '',
        String(selectedMember.contact_number || '').trim()
      ),
    ]);
  }, [selectedMember]);

  const preset = PHONE_PRESETS.find((p) => p.id === presetId) || PHONE_PRESETS[0];
  const theme = COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];
  const emojiStrip = EMOJI_STRIPS.find((e) => e.id === emojiStripId) || EMOJI_STRIPS[0];
  const contactLines = useMemo(() => {
    const clean = contacts
      .map((c) => ({
        name: String(c.name || '').trim(),
        phone: String(c.phone || '').trim(),
      }))
      .filter((c) => c.name || c.phone)
      .map((c) => `${c.name || 'CONTACT NAME'} at ${c.phone || 'PHONE NUMBER'}`);
    return clean.length ? clean : ['CONTACT NAME at PHONE NUMBER'];
  }, [contacts]);

  const lines = useMemo(() => {
    const header = wallpaperMessage(
      String(ownerText || 'MY').trim().toUpperCase(),
      'CONTACTS BELOW'
    ).slice(0, 2);
    return [...header, ...contactLines];
  }, [ownerText, contactLines]);

  const setContactField = (id, field, value) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addContact = () => setContacts((prev) => [...prev, newContact()]);
  const removeContact = (id) => setContacts((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));

  const downloadWallpaper = () => {
    const c = document.createElement('canvas');
    c.width = preset.w;
    c.height = preset.h;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, theme.bg[0]);
    g.addColorStop(0.45, theme.bg[1]);
    g.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    if (showScanlines) {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      for (let y = 0; y < c.height; y += 4) ctx.fillRect(0, y, c.width, 1);
    }

    // frame
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = Math.max(6, Math.round(c.width * 0.006));
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, c.width - ctx.lineWidth * 2, c.height - ctx.lineWidth * 2);

    if (showEmojiStrip) {
      const badgeW = Math.round(c.width * 0.36);
      const badgeH = Math.round(c.height * 0.055);
      const badgeX = Math.round((c.width - badgeW) / 2);
      const badgeY = Math.round(c.height * 0.19);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(2, Math.round(c.width * 0.002));
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = theme.accent;
      ctx.font = `${Math.round(c.width * 0.027)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "VT323", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(emojiStrip.text, c.width / 2, badgeY + Math.round(badgeH * 0.7));
    }

    const mainFont = Math.round(c.width * 0.08);
    const subFont = Math.round(c.width * 0.052);
    const bottomFont = Math.round(c.width * 0.044);

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.text;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = Math.round(c.width * 0.018);

    ctx.font = `700 ${mainFont}px "VT323", "Courier New", monospace`;
    ctx.fillText(lines[0], c.width / 2, Math.round(c.height * 0.36));

    ctx.font = `700 ${subFont}px "VT323", "Courier New", monospace`;
    ctx.fillText(lines[1], c.width / 2, Math.round(c.height * 0.48));

    ctx.font = `700 ${bottomFont}px "VT323", "Courier New", monospace`;
    const allWrapped = contactLines.flatMap((line) => wrapByCharCount(line, 34));
    const visible = allWrapped.slice(0, 6);
    visible.forEach((line, idx) => {
      ctx.fillText(line, c.width / 2, Math.round(c.height * (0.59 + idx * 0.055)));
    });

    const a = document.createElement('a');
    const safe = String(ownerText || 'phone').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    a.download = `${safe || 'phone'}-wallpaper-${preset.w}x${preset.h}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  };

  return (
    <section className="section section-wallpaper-maker">
      <div className="card block wallpaper-card">
        <h3 className="card-title">Phone Wallpaper Maker</h3>
        <p className="card-description">Create a lock-screen wallpaper with your return-contact text.</p>

        <div className="wallpaper-controls">
          <label className="wallpaper-label">
            Person (optional)
            <select
              className="select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">— Custom —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          <label className="wallpaper-label">
            Owner text
            <input className="input" value={ownerText} onChange={(e) => setOwnerText(e.target.value)} placeholder="SAM'S" />
          </label>

          <label className="wallpaper-label">
            Resolution
            <select className="select" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {PHONE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="wallpaper-label">
            Color theme
            <select className="select" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {COLOR_THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="wallpaper-label">
            Emoji design
            <select className="select" value={emojiStripId} onChange={(e) => setEmojiStripId(e.target.value)}>
              {EMOJI_STRIPS.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="wallpaper-contacts">
          <div className="wallpaper-contacts-head">
            <span className="wallpaper-label">Contacts (shown on wallpaper)</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addContact}>
              + Add contact
            </button>
          </div>
          <div className="wallpaper-contact-list">
            {contacts.map((c, idx) => (
              <div key={c.id} className="wallpaper-contact-row">
                <input
                  className="input"
                  value={c.name}
                  onChange={(e) => setContactField(c.id, 'name', e.target.value)}
                  placeholder={`Contact ${idx + 1} name`}
                />
                <input
                  className="input"
                  value={c.phone}
                  onChange={(e) => setContactField(c.id, 'phone', e.target.value)}
                  placeholder="Phone number"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeContact(c.id)}
                  disabled={contacts.length === 1}
                  aria-label={`Remove contact ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className="wallpaper-preview"
          aria-label="Wallpaper preview"
          style={{
            '--wallpaper-c0': theme.bg[0],
            '--wallpaper-c1': theme.bg[1],
            '--wallpaper-c2': theme.bg[2],
            '--wallpaper-text': theme.text,
            '--wallpaper-glow': theme.glow,
            '--wallpaper-border': theme.border,
            '--wallpaper-accent': theme.accent,
          }}
        >
          {showEmojiStrip && <span className="wallpaper-badge">{emojiStrip.text}</span>}
          <p>{lines[0]}</p>
          <p>{lines[1]}</p>
          {contactLines.map((line, idx) => (
            <p key={idx} className="wallpaper-contact-line">{line}</p>
          ))}
          {showScanlines && <span className="wallpaper-scanlines" aria-hidden />}
        </div>

        <div className="wallpaper-options">
          <label className="form-checkbox-label">
            <input type="checkbox" className="form-checkbox" checked={showEmojiStrip} onChange={(e) => setShowEmojiStrip(e.target.checked)} />
            Show emoji strip
          </label>
          <label className="form-checkbox-label">
            <input type="checkbox" className="form-checkbox" checked={showScanlines} onChange={(e) => setShowScanlines(e.target.checked)} />
            Show scanlines
          </label>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={downloadWallpaper}
          data-retro-tip="Download wallpaper PNG"
          data-status-tip="Generate and download phone wallpaper"
        >
          Download wallpaper
        </button>
      </div>
    </section>
  );
}
