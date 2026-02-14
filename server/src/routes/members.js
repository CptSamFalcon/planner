import { Router } from 'express';
import { getDb } from '../db.js';

export const membersRouter = Router();
const db = () => getDb();

membersRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM members ORDER BY name').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

membersRouter.post('/', (req, res) => {
  try {
    const { name, status = 'going', note, contact_number, campsite_id, wristband, vehicle_id, shelter_packing_id, bed_packing_id, bedding_packing_id, pre_party } = req.body;
    const prePartyVal = pre_party === true || pre_party === 1 || pre_party === 'Y' || pre_party === 'y' ? 1 : (pre_party === false || pre_party === 0 || pre_party === 'N' || pre_party === 'n' ? 0 : null);
    const stmt = db().prepare(
      'INSERT INTO members (name, status, note, contact_number, campsite_id, wristband, vehicle_id, shelter_packing_id, bed_packing_id, bedding_packing_id, pre_party) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      name || 'Anonymous',
      status,
      note || null,
      contact_number || null,
      campsite_id || null,
      wristband || null,
      vehicle_id || null,
      shelter_packing_id || null,
      bed_packing_id || null,
      bedding_packing_id || null,
      prePartyVal
    );
    const row = db().prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

membersRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, note, contact_number, campsite_id, wristband, vehicle_id, shelter_packing_id, bed_packing_id, bedding_packing_id, pre_party } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (note !== undefined) { updates.push('note = ?'); values.push(note); }
    if (contact_number !== undefined) { updates.push('contact_number = ?'); values.push(contact_number); }
    if (campsite_id !== undefined) { updates.push('campsite_id = ?'); values.push(campsite_id); }
    if (wristband !== undefined) { updates.push('wristband = ?'); values.push(wristband); }
    if (vehicle_id !== undefined) { updates.push('vehicle_id = ?'); values.push(vehicle_id); }
    if (shelter_packing_id !== undefined) { updates.push('shelter_packing_id = ?'); values.push(shelter_packing_id); }
    if (bed_packing_id !== undefined) { updates.push('bed_packing_id = ?'); values.push(bed_packing_id); }
    if (bedding_packing_id !== undefined) { updates.push('bedding_packing_id = ?'); values.push(bedding_packing_id); }
    if (pre_party !== undefined) {
      const v = pre_party === true || pre_party === 1 || pre_party === 'Y' || pre_party === 'y' ? 1 : (pre_party === false || pre_party === 0 || pre_party === 'N' || pre_party === 'n' ? 0 : null);
      updates.push('pre_party = ?'); values.push(v);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM members WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

membersRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
