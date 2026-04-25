import { useEffect, useMemo, useState } from 'react';
import { Win98Dialog } from './Win98Dialog';

function fmtDate(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function photoUrl(fileName) {
  return `/uploads/photos/${encodeURIComponent(fileName)}`;
}

function parseClientTags(s) {
  if (!s || !String(s).trim()) return [];
  return [
    ...new Set(
      String(s)
        .split(/[,;]/)
        .map((t) =>
          t
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
        )
        .filter(Boolean)
    ),
  ].map((t) => t.slice(0, 32));
}

function mergeById(prev, row) {
  if (!row?.id) return prev;
  return prev.map((p) => (p.id === row.id ? { ...p, ...row, tags: row.tags || [] } : p));
}

export function PhotoDump({ api }) {
  const [members, setMembers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploaderMemberId, setUploaderMemberId] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadTagText, setUploadTagText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [newTagByPhoto, setNewTagByPhoto] = useState(() => ({}));
  const [activeFilterTags, setActiveFilterTags] = useState([]);
  const [quickPickTag, setQuickPickTag] = useState('');

  const load = () => {
    Promise.all([
      fetch(`${api}/members`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/photos`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, p]) => {
        setMembers(Array.isArray(m) ? m : []);
        setPhotos(
          (Array.isArray(p) ? p : []).map((row) => ({
            ...row,
            tags: Array.isArray(row.tags) ? row.tags : [],
          }))
        );
      })
      .catch(() => {
        setMembers([]);
        setPhotos([]);
      });
  };

  useEffect(() => {
    load();
  }, [api]);

  useEffect(() => {
    setActiveFilterTags((f) => f.filter((t) => photos.some((p) => (p.tags || []).includes(t))));
  }, [photos]);

  const applyRow = (row) => {
    setPhotos((prev) => mergeById(prev, row));
    setActivePhoto((cur) => (cur && cur.id === row.id ? { ...cur, ...row, tags: row.tags || [] } : cur));
  };

  const saveTags = (photoId, nextTags) => {
    const body = { tags: nextTags };
    fetch(`${api}/photos/${photoId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Save failed'))))
      .then(applyRow)
      .catch(console.error);
  };

  const addTag = (p, tagStr) => {
    const next = parseClientTags(tagStr);
    if (next.length === 0) return;
    const cur = Array.isArray(p.tags) ? p.tags : [];
    const merged = [...new Set([...cur, ...next])];
    if (merged.length === cur.length) return;
    saveTags(p.id, merged);
  };

  const removeTag = (p, tag) => {
    const cur = Array.isArray(p.tags) ? p.tags : [];
    const merged = cur.filter((t) => t !== tag);
    saveTags(p.id, merged);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    if (uploaderMemberId) fd.append('uploader_member_id', uploaderMemberId);
    if (caption.trim()) fd.append('caption', caption.trim());
    const upTags = parseClientTags(uploadTagText);
    if (upTags.length) fd.append('tags', upTags.join(','));

    setUploading(true);
    fetch(`${api}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Upload failed'))))
      .then((newRows) => {
        const list = (Array.isArray(newRows) ? newRows : []).map((row) => ({
          ...row,
          tags: Array.isArray(row.tags) ? row.tags : [],
        }));
        setPhotos((prev) => [...list, ...prev]);
        setFiles([]);
        setCaption('');
        setUploadTagText('');
      })
      .catch(console.error)
      .finally(() => setUploading(false));
  };

  const removePhoto = (id) => {
    if (pendingDelete !== id) return;
    fetch(`${api}/photos/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setPendingDelete(null);
        if (activePhoto?.id === id) setActivePhoto(null);
      })
      .catch(console.error);
  };

  const selectedFileNames = useMemo(() => files.map((f) => f.name).join(', '), [files]);

  const allTags = useMemo(() => {
    const s = new Set();
    for (const p of photos) {
      for (const t of p.tags || []) s.add(t);
    }
    return [...s].sort();
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (activeFilterTags.length === 0) return photos;
    return photos.filter((p) => {
      const tset = new Set(p.tags || []);
      return activeFilterTags.every((t) => tset.has(t));
    });
  }, [photos, activeFilterTags]);

  const toggleFilter = (tag) => {
    setActiveFilterTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };
  const addFilterTag = (tag) => {
    if (!tag) return;
    setActiveFilterTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setQuickPickTag('');
  };
  const availableQuickTags = useMemo(
    () => allTags.filter((tag) => !activeFilterTags.includes(tag)),
    [allTags, activeFilterTags]
  );

  return (
    <section className="section section-photo-dump">
      <div className="card block photo-dump-card">
        <h3 className="card-title">Photo Dump</h3>
        <p className="card-description">
          Upload your post-festival photos to the server. Files are stored in <code>data/uploads/photos</code> so you
          can archive or copy them later. Tags use letters, numbers, and hyphens (e.g. <code>sunset</code>,{' '}
          <code>day-1</code>).
        </p>

        <form className="photo-upload-form" onSubmit={handleUpload}>
          <label className="photo-upload-label">
            Uploader
            <select className="select" value={uploaderMemberId} onChange={(e) => setUploaderMemberId(e.target.value)}>
              <option value="">— Select (optional) —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="photo-upload-label">
            Caption (applies to selected files)
            <input
              className="input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Afters at camp, Sunday sunrise…"
            />
          </label>
          <label className="photo-upload-label">
            Tags (applies to all files in this upload, comma-separated)
            <input
              className="input"
              value={uploadTagText}
              onChange={(e) => setUploadTagText(e.target.value)}
              placeholder="bass, lasers, day-1"
              data-retro-tip="These tags are added to every photo in the batch"
              data-status-tip="Optional tags for the whole upload"
            />
          </label>
          <label className="photo-upload-label">
            Photos
            <input
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </label>
          <div className="photo-upload-actions">
            <button type="submit" className="btn btn-primary" disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading…' : `Upload ${files.length || ''} photo${files.length === 1 ? '' : 's'}`}
            </button>
            {selectedFileNames && <span className="photo-selected-files">{selectedFileNames}</span>}
          </div>
        </form>

        {allTags.length > 0 && (
          <div className="photo-tag-filter" role="group" aria-label="Filter by tag">
            <div className="photo-tag-filter-head">
              <span className="photo-tag-filter-label">Show photos that have all selected tags</span>
              {activeFilterTags.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveFilterTags([])}>
                  Clear filters
                </button>
              )}
            </div>
            <div className="photo-tag-quick">
              <span className="photo-tag-quick-label">Quick filter (mobile-friendly)</span>
              <div className="photo-tag-quick-controls">
                <select
                  className="select"
                  value={quickPickTag}
                  onChange={(e) => setQuickPickTag(e.target.value)}
                  data-retro-tip="Pick a tag and tap Add"
                  data-status-tip="Quickly add one filter tag"
                >
                  <option value="">Pick a tag…</option>
                  {availableQuickTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!quickPickTag}
                  onClick={() => addFilterTag(quickPickTag)}
                >
                  Add
                </button>
              </div>
            </div>
            {activeFilterTags.length > 0 && (
              <div className="photo-tag-active-row" aria-label="Selected filters">
                {activeFilterTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="photo-tag-toggle is-on"
                    onClick={() => toggleFilter(tag)}
                    data-retro-tip={`Remove “${tag}” from filter`}
                    data-status-tip="Remove this active filter"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            )}
            <div className="photo-tag-toggle-row">
              {allTags.map((tag) => {
                const on = activeFilterTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`photo-tag-toggle${on ? ' is-on' : ''}`}
                    onClick={() => toggleFilter(tag)}
                    data-retro-tip={on ? `Remove “${tag}” from filter` : `Require tag “${tag}”`}
                    data-status-tip={on ? 'Click to deselect' : 'Click to require this tag'}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="photo-grid">
          {filteredPhotos.map((p) => (
            <article key={p.id} className="photo-item">
              <button
                type="button"
                className="photo-thumb-btn"
                onClick={() => setActivePhoto(p)}
                data-retro-tip="View full size"
                data-status-tip="Open large image in viewer"
              >
                <img
                  src={photoUrl(p.thumb_filename || p.display_filename || p.filename)}
                  alt={p.caption || p.original_name || 'Uploaded photo'}
                  className="photo-thumb"
                  loading="lazy"
                />
              </button>
              <div className="photo-meta">
                {p.caption ? <p className="photo-caption">{p.caption}</p> : null}
                <p className="photo-subline">
                  {p.uploader_name || 'Unknown'} · {fmtDate(p.created_at)}
                </p>
                <div className="photo-tag-row" aria-label="Tags">
                  {(p.tags || []).map((tag) => (
                    <span key={tag} className="photo-tag-pill">
                      {tag}
                      <button
                        type="button"
                        className="photo-tag-remove"
                        onClick={() => removeTag(p, tag)}
                        aria-label={`Remove tag ${tag}`}
                        data-retro-tip={`Remove “${tag}”`}
                        data-status-tip="Remove this tag from the photo"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="photo-tag-add">
                  <input
                    className="input input-sm"
                    value={newTagByPhoto[p.id] ?? ''}
                    onChange={(e) =>
                      setNewTagByPhoto((o) => ({
                        ...o,
                        [p.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const raw = newTagByPhoto[p.id] ?? '';
                        addTag(p, raw);
                        setNewTagByPhoto((o) => {
                          const next = { ...o };
                          delete next[p.id];
                          return next;
                        });
                      }
                    }}
                    placeholder="Add tag"
                    data-retro-tip="Comma or Enter to add"
                    data-status-tip="Type a tag and press Enter"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const raw = newTagByPhoto[p.id] ?? '';
                      addTag(p, raw);
                      setNewTagByPhoto((o) => {
                        const next = { ...o };
                        delete next[p.id];
                        return next;
                      });
                    }}
                    data-retro-tip="Add tag(s) to this photo"
                    data-status-tip="Add tags from the field on the left"
                  >
                    Add
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPendingDelete(p.id)}
                data-retro-tip="Delete this photo"
                data-status-tip="Remove file from server"
              >
                Delete
              </button>
            </article>
          ))}
          {filteredPhotos.length === 0 && photos.length > 0 && (
            <p className="photo-empty">No photos match the current tag filter. Clear filters or change tags.</p>
          )}
          {photos.length === 0 && <p className="photo-empty">No photos yet. Upload your first batch above.</p>}
        </div>
      </div>

      {activePhoto && (
        <div className="photo-lightbox" onClick={() => setActivePhoto(null)} role="dialog" aria-modal="true">
          <div className="photo-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img
              src={photoUrl(activePhoto.display_filename || activePhoto.filename)}
              alt={activePhoto.caption || activePhoto.original_name || 'Photo'}
              className="photo-lightbox-img"
              loading="eager"
            />
            <div className="photo-lightbox-meta">
              {activePhoto.caption ? <p>{activePhoto.caption}</p> : null}
              {activePhoto.tags?.length > 0 && (
                <p className="photo-lightbox-tags">Tags: {activePhoto.tags.join(', ')}</p>
              )}
              <p>
                {activePhoto.uploader_name || 'Unknown'} · {fmtDate(activePhoto.created_at)}
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setActivePhoto(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <Win98Dialog
        open={pendingDelete != null}
        title="Delete photo"
        message="Delete this photo from the gallery and server folder?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmTone="danger"
        onConfirm={() => removePhoto(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
