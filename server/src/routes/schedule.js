import { Router } from 'express';
import { getDb } from '../db.js';

export const scheduleRouter = Router();
const db = () => getDb();

// ---- Stages (must be before /:id) ----
scheduleRouter.get('/stages', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM schedule_stages ORDER BY sort_order, name').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.post('/stages', (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const stmt = db().prepare('INSERT INTO schedule_stages (name, sort_order) VALUES (?, ?)');
    const result = stmt.run(name || 'Stage', sort_order != null ? sort_order : 0);
    const row = db().prepare('SELECT * FROM schedule_stages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.patch('/stages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE schedule_stages SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM schedule_stages WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.delete('/stages/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM schedule_stages WHERE id = ?').run(req.params.id);
    db().prepare('UPDATE schedule SET stage_id = NULL WHERE stage_id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Events ----
scheduleRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare(`
      SELECT s.id, s.day, s.time, s.end_time, s.title, s.description, s.stage_id, s.event_type,
             st.name AS stage_name,
             (SELECT GROUP_CONCAT(member_id) FROM schedule_attendees WHERE event_id = s.id) AS attendee_ids
      FROM schedule s
      LEFT JOIN schedule_stages st ON st.id = s.stage_id
      ORDER BY s.day, s.time
    `).all();
    const out = rows.map((r) => {
      const { attendee_ids, ...rest } = r;
      const ids = attendee_ids ? attendee_ids.split(',').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)) : [];
      return { ...rest, attendee_ids: ids };
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.post('/', (req, res) => {
  try {
    const { day, time, end_time, title, description, stage_id, event_type, attendee_ids } = req.body;
    const stmt = db().prepare(
      'INSERT INTO schedule (day, time, end_time, title, description, stage_id, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      day || 'Friday',
      time || '',
      end_time || null,
      title || 'Event',
      description || null,
      stage_id ?? null,
      event_type === 'set' ? 'set' : 'meetup'
    );
    const eventId = result.lastInsertRowid;
    const attendeeIds = Array.isArray(attendee_ids) ? attendee_ids.filter((id) => Number.isInteger(id)) : [];
    const insAttendee = db().prepare('INSERT INTO schedule_attendees (event_id, member_id) VALUES (?, ?)');
    for (const mid of attendeeIds) {
      insAttendee.run(eventId, mid);
    }
    const row = db().prepare(`
      SELECT s.id, s.day, s.time, s.end_time, s.title, s.description, s.stage_id, s.event_type, st.name AS stage_name,
             (SELECT GROUP_CONCAT(member_id) FROM schedule_attendees WHERE event_id = s.id) AS attendee_ids
      FROM schedule s LEFT JOIN schedule_stages st ON st.id = s.stage_id WHERE s.id = ?
    `).get(eventId);
    const ids = row.attendee_ids ? row.attendee_ids.split(',').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)) : [];
    res.status(201).json({ ...row, attendee_ids: ids });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { day, time, end_time, title, description, stage_id, event_type, attendee_ids } = req.body;
    const updates = [];
    const values = [];
    if (day !== undefined) { updates.push('day = ?'); values.push(day); }
    if (time !== undefined) { updates.push('time = ?'); values.push(time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (stage_id !== undefined) { updates.push('stage_id = ?'); values.push(stage_id ?? null); }
    if (event_type !== undefined) { updates.push('event_type = ?'); values.push(event_type === 'set' ? 'set' : 'meetup'); }
    if (updates.length > 0) {
      values.push(id);
      db().prepare(`UPDATE schedule SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    if (attendee_ids !== undefined) {
      db().prepare('DELETE FROM schedule_attendees WHERE event_id = ?').run(id);
      const attendeeIds = Array.isArray(attendee_ids) ? attendee_ids.filter((mid) => Number.isInteger(mid)) : [];
      const insAttendee = db().prepare('INSERT INTO schedule_attendees (event_id, member_id) VALUES (?, ?)');
      for (const mid of attendeeIds) {
        insAttendee.run(id, mid);
      }
    }
    const row = db().prepare(`
      SELECT s.id, s.day, s.time, s.end_time, s.title, s.description, s.stage_id, s.event_type, st.name AS stage_name,
             (SELECT GROUP_CONCAT(member_id) FROM schedule_attendees WHERE event_id = s.id) AS attendee_ids
      FROM schedule s LEFT JOIN schedule_stages st ON st.id = s.stage_id WHERE s.id = ?
    `).get(id);
    if (!row) return res.json({});
    const ids = row.attendee_ids ? row.attendee_ids.split(',').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)) : [];
    res.json({ ...row, attendee_ids: ids });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM schedule_attendees WHERE event_id = ?').run(req.params.id);
    db().prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
