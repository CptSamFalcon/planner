import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseMemberAllergies } from '../utils/memberAllergies';
import { mealAllergenConflicts } from '../utils/mealAllergenConflicts';

const SLOT_SUGGESTIONS = [
  'Wed — Breakfast',
  'Wed — Dinner',
  'Thu — Breakfast',
  'Thu — Dinner',
  'Fri — Breakfast',
  'Fri — Lunch',
  'Fri — Dinner',
  'Sat — Breakfast',
  'Sat — Dinner',
  'Sun — Breakfast',
];

function MealAllergyWarnings({ conflicts }) {
  if (!conflicts?.length) return null;
  return (
    <div className="meal-allergy-warning" role="alert">
      <span className="meal-allergy-warning-icon" aria-hidden>⚠</span>
      <ul className="meal-allergy-warning-list">
        {conflicts.map(({ member }) => (
          <li key={member.id} className="meal-allergy-warning-item">
            Possible allergy for <strong className="meal-allergy-warning-name">{member.name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MealPlanner({ api }) {
  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formTitle, setFormTitle] = useState('');
  const [formSlot, setFormSlot] = useState('');
  const [formPreparer, setFormPreparer] = useState('');
  const [formRecipe, setFormRecipe] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${api}/members`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/meals`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, ml]) => {
        setMembers(Array.isArray(m) ? m : []);
        setMeals(Array.isArray(ml) ? ml : []);
      })
      .catch(() => {
        setMembers([]);
        setMeals([]);
      })
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const goingMembers = useMemo(
    () => members.filter((m) => m.status === 'going'),
    [members]
  );

  const membersWithAllergies = useMemo(
    () => goingMembers.filter((m) => parseMemberAllergies(m).length > 0),
    [goingMembers]
  );

  const resetForm = () => {
    setFormTitle('');
    setFormSlot('');
    setFormPreparer('');
    setFormRecipe('');
    setFormIngredients('');
    setFormNotes('');
  };

  const addMeal = (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPreparer) return;
    setSaving(true);
    const ingredients = formIngredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    fetch(`${api}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: formTitle.trim(),
        slot_label: formSlot.trim() || null,
        preparer_member_id: Number(formPreparer),
        recipe: formRecipe.trim() || null,
        ingredients,
        notes: formNotes.trim() || null,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((row) => { setMeals((prev) => [...prev, row].sort((a, b) => String(a.slot_label).localeCompare(String(b.slot_label)))); resetForm(); })
      .catch(console.error)
      .finally(() => setSaving(false));
  };

  const startEdit = (meal) => {
    setEditingId(meal.id);
    setEditState({
      title: meal.title,
      slot_label: meal.slot_label || '',
      preparer_member_id: String(meal.preparer_member_id),
      recipe: meal.recipe || '',
      ingredients: (meal.ingredients || []).join('\n'),
      notes: meal.notes || '',
    });
  };

  const saveEdit = () => {
    if (!editingId || !editState) return;
    const ingredients = editState.ingredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    fetch(`${api}/meals/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: editState.title.trim(),
        slot_label: editState.slot_label.trim() || null,
        preparer_member_id: Number(editState.preparer_member_id),
        recipe: editState.recipe.trim() || null,
        ingredients,
        notes: editState.notes.trim() || null,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((row) => {
        setMeals((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        setEditingId(null);
        setEditState(null);
      })
      .catch(console.error)
      .finally(() => setSaving(false));
  };

  const removeMeal = (id) => {
    if (!window.confirm('Delete this meal?')) return;
    fetch(`${api}/meals/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setMeals((prev) => prev.filter((m) => m.id !== id)))
      .catch(console.error);
  };

  return (
    <section className="section section-meal-planner">
      <div className="card block meal-planner-intro">
        <h3 className="card-title">Meal planner</h3>
        <p className="card-description">
          Assign who&apos;s making each camp meal and add recipe and ingredients. Food allergies are saved on each person (People when you add them, or Group → tap a person). Anyone with allergies listed below is checked against the dish name, recipe, and ingredients (text match — double-check in the kitchen). The cook is included too, so you still see a flag if your own allergens appear in what you&apos;re making.
        </p>
      </div>

      {loading && <p className="meal-planner-loading">Loading…</p>}

      {!loading && (
        <>
          <div className="card block meal-allergies-card">
            <h4 className="meal-section-title">People with food allergies</h4>
            <p className="meal-section-hint">
              Only people who have saved allergies appear here. Add or change them in <strong>People</strong> (when adding someone) or on <strong>Group</strong> by tapping a person.
            </p>
            {goingMembers.length === 0 ? (
              <p className="meal-empty">Add people in People and mark them as Going to plan meals.</p>
            ) : membersWithAllergies.length === 0 ? (
              <p className="meal-empty">No food allergies listed yet for anyone going.</p>
            ) : (
              <ul className="meal-allergy-list meal-allergy-list--readonly">
                {membersWithAllergies.map((m) => (
                  <li key={m.id} className="meal-allergy-row meal-allergy-row--readonly">
                    <span className="meal-allergy-name">{m.name}</span>
                    <span className="meal-allergy-readonly">{parseMemberAllergies(m).join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card block meal-form-card">
            <h4 className="meal-section-title">Add a meal you&apos;re preparing</h4>
            <form className="meal-form" onSubmit={addMeal}>
              <div className="meal-form-row">
                <label className="meal-label" htmlFor="meal-title">Dish / meal name</label>
                <input
                  id="meal-title"
                  className="input"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="Campfire nachos"
                />
              </div>
              <div className="meal-form-row meal-form-row--split">
                <div>
                  <label className="meal-label" htmlFor="meal-slot">When (optional)</label>
                  <input
                    id="meal-slot"
                    className="input"
                    list="meal-slot-suggestions"
                    value={formSlot}
                    onChange={(e) => setFormSlot(e.target.value)}
                    placeholder="Fri — Dinner"
                  />
                  <datalist id="meal-slot-suggestions">
                    {SLOT_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="meal-label" htmlFor="meal-preparer">You&apos;re cooking (member)</label>
                  <select
                    id="meal-preparer"
                    className="select"
                    value={formPreparer}
                    onChange={(e) => setFormPreparer(e.target.value)}
                    required
                  >
                    <option value="">— Select —</option>
                    {goingMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="meal-form-row">
                <label className="meal-label" htmlFor="meal-recipe">Recipe (optional)</label>
                <textarea
                  id="meal-recipe"
                  className="input meal-textarea"
                  rows={4}
                  value={formRecipe}
                  onChange={(e) => setFormRecipe(e.target.value)}
                  placeholder="Steps, link, or short notes for the cook…"
                />
              </div>
              <div className="meal-form-row">
                <label className="meal-label" htmlFor="meal-ing">Ingredients (one per line)</label>
                <textarea
                  id="meal-ing"
                  className="input meal-textarea"
                  rows={4}
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  placeholder={'corn tortillas\ncheese\nground beef\n…'}
                />
              </div>
              <div className="meal-form-row">
                <label className="meal-label" htmlFor="meal-notes">Notes (optional)</label>
                <input
                  id="meal-notes"
                  className="input"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Serves 6, make Friday night"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving || !formTitle.trim() || !formPreparer}>
                {saving ? 'Saving…' : 'Add meal'}
              </button>
            </form>
          </div>

          <div className="meals-list-header">
            <h4 className="meal-section-title">Planned meals ({meals.length})</h4>
          </div>
          {meals.length === 0 && (
            <p className="meal-empty card block">No meals yet. Add one above.</p>
          )}
          <ul className="meals-card-list">
            {meals.map((meal) => {
              const conflicts = mealAllergenConflicts(meal, members);
              const isEditing = editingId === meal.id;
              if (isEditing && editState) {
                const editConflicts = mealAllergenConflicts(
                  {
                    title: editState.title,
                    recipe: editState.recipe,
                    ingredients: editState.ingredients.split('\n').map((s) => s.trim()).filter(Boolean),
                  },
                  members
                );
                return (
                  <li key={meal.id} className="card block meal-item meal-item--editing">
                    <MealAllergyWarnings conflicts={editConflicts} />
                    <div className="meal-form-row">
                      <label className="meal-label">Dish / meal name</label>
                      <input
                        className="input"
                        value={editState.title}
                        onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                      />
                    </div>
                    <div className="meal-form-row meal-form-row--split">
                      <div>
                        <label className="meal-label">When</label>
                        <input
                          className="input"
                          list="meal-slot-suggestions"
                          value={editState.slot_label}
                          onChange={(e) => setEditState((s) => ({ ...s, slot_label: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="meal-label">Cook</label>
                        <select
                          className="select"
                          value={editState.preparer_member_id}
                          onChange={(e) => setEditState((s) => ({ ...s, preparer_member_id: e.target.value }))}
                        >
                          {goingMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="meal-form-row">
                      <label className="meal-label">Recipe</label>
                      <textarea
                        className="input meal-textarea"
                        rows={4}
                        value={editState.recipe}
                        onChange={(e) => setEditState((s) => ({ ...s, recipe: e.target.value }))}
                      />
                    </div>
                    <div className="meal-form-row">
                      <label className="meal-label">Ingredients (one per line)</label>
                      <textarea
                        className="input meal-textarea"
                        rows={4}
                        value={editState.ingredients}
                        onChange={(e) => setEditState((s) => ({ ...s, ingredients: e.target.value }))}
                      />
                    </div>
                    <div className="meal-form-row">
                      <label className="meal-label">Notes</label>
                      <input
                        className="input"
                        value={editState.notes}
                        onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))}
                      />
                    </div>
                    <div className="meal-item-actions">
                      <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                        Save
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setEditState(null); }}>
                        Cancel
                      </button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={meal.id} className="card block meal-item">
                  <MealAllergyWarnings conflicts={conflicts} />
                  <div className="meal-item-head">
                    <div>
                      {meal.slot_label && (
                        <span className="meal-slot-badge">{meal.slot_label}</span>
                      )}
                      <h4 className="meal-item-title">{meal.title}</h4>
                      <p className="meal-item-preparer">
                        Prepared by <strong>{meal.preparer_name}</strong>
                      </p>
                    </div>
                    <div className="meal-item-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(meal)}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMeal(meal.id)}>Delete</button>
                    </div>
                  </div>
                  {meal.recipe && (
                    <div className="meal-block">
                      <span className="meal-block-label">Recipe</span>
                      <pre className="meal-block-body">{meal.recipe}</pre>
                    </div>
                  )}
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="meal-block">
                      <span className="meal-block-label">Ingredients</span>
                      <ul className="meal-ing-list">
                        {meal.ingredients.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {meal.notes && (
                    <p className="meal-item-notes"><em>{meal.notes}</em></p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
