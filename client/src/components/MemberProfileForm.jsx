import { useState, useEffect } from 'react';
import { formatAllergiesInputValue } from '../utils/memberAllergies';

function artistsToText(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.join(', ');
}

function parseArtistsText(s) {
  return String(s || '')
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

/**
 * Shared fields for onboarding and profile edit (PATCH /api/me/profile + optional avatar).
 */
export function MemberProfileForm({ api, member, onSuccess, submitLabel }) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [allergies, setAllergies] = useState('');
  const [artistsText, setArtistsText] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!member) return;
    setName(member.name || '');
    setNickname(member.nickname || '');
    setBio(member.bio || '');
    setAllergies(formatAllergiesInputValue(member));
    setArtistsText(artistsToText(member.favorite_artists));
  }, [member]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const avatarSrc =
    previewUrl ||
    (member?.avatar_url ? `${member.avatar_url}${member.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const nameTrim = name.trim();
    const nickTrim = nickname.trim();
    const bioTrim = bio.trim();
    const artists = parseArtistsText(artistsText);
    if (!nameTrim) {
      setError('Please enter your name.');
      return;
    }
    if (!nickTrim) {
      setError('Please enter a nickname.');
      return;
    }
    if (bioTrim.length < 3) {
      setError('Short bio should be at least a few words (3+ characters).');
      return;
    }
    if (artists.length < 1) {
      setError('Add at least one favourite artist.');
      return;
    }

    setSubmitting(true);
    const afterAvatar = () =>
      fetch(`${api}/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: nameTrim,
          nickname: nickTrim,
          bio: bioTrim,
          favoriteArtists: artists,
          allergies: allergies.trim() || null,
        }),
      }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Could not save profile');
        return body;
      });

    const uploadIfNeeded = file
      ? fetch(`${api}/me/profile/avatar`, {
          method: 'POST',
          credentials: 'include',
          body: (() => {
            const fd = new FormData();
            fd.append('avatar', file);
            return fd;
          })(),
        }).then(async (r) => {
          if (!r.ok) {
            const b = await r.json().catch(() => ({}));
            throw new Error(b.error || 'Could not upload photo');
          }
        })
      : Promise.resolve();

    uploadIfNeeded
      .then(() => afterAvatar())
      .then(() => {
        setFile(null);
        onSuccess();
      })
      .catch((err) => setError(err.message || 'Something went wrong'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      {error ? (
        <p className="password-gate-error" role="alert">
          {error}
        </p>
      ) : null}
      <form className="profile-onboarding-form" onSubmit={handleSubmit}>
        <div className="profile-onboarding-avatar">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="profile-onboarding-avatar-img" width={96} height={96} />
          ) : (
            <div className="profile-onboarding-avatar-placeholder" aria-hidden>
              Photo
            </div>
          )}
          <label className="btn btn-secondary btn-sm">
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="profile-onboarding-file-input"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                setFile(f || null);
              }}
            />
          </label>
          {file ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
              Clear photo
            </button>
          ) : null}
        </div>

        <label className="password-gate-label" htmlFor="mpf-name">
          Name
        </label>
        <input
          id="mpf-name"
          className="input password-gate-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          disabled={submitting}
        />

        <label className="password-gate-label" htmlFor="mpf-nick">
          Nickname
        </label>
        <input
          id="mpf-nick"
          className="input password-gate-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={80}
          placeholder="What should the group call you?"
          disabled={submitting}
        />

        <label className="password-gate-label" htmlFor="mpf-allergies">
          Food allergies (optional)
        </label>
        <input
          id="mpf-allergies"
          className="input password-gate-input"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. peanuts, dairy"
          disabled={submitting}
        />

        <label className="password-gate-label" htmlFor="mpf-artists">
          Favourite artists
        </label>
        <textarea
          id="mpf-artists"
          className="input password-gate-input profile-onboarding-textarea"
          value={artistsText}
          onChange={(e) => setArtistsText(e.target.value)}
          placeholder="Comma or line separated"
          rows={3}
          disabled={submitting}
        />

        <label className="password-gate-label" htmlFor="mpf-bio">
          Short bio
        </label>
        <textarea
          id="mpf-bio"
          className="input password-gate-input profile-onboarding-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence or two about you"
          rows={3}
          maxLength={600}
          disabled={submitting}
        />

        <button type="submit" className="btn btn-primary password-gate-btn" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </form>
    </>
  );
}
