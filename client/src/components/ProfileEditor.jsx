import { MemberProfileForm } from './MemberProfileForm';

export function ProfileEditor({ api, member, onBack, onSaved }) {
  return (
    <section className="section profile-editor-section">
      <div className="card profile-editor-card">
        <div className="profile-editor-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBack} data-status-tip="Return to planner">
            ← Back
          </button>
        </div>
        <h2 className="card-title profile-editor-title">My profile</h2>
        <p className="profile-editor-lead">
          Update how you show up to the crew: photo, name, nickname, allergies, favourite artists, and bio.
        </p>
        <MemberProfileForm
          api={api}
          member={member}
          submitLabel="Save changes"
          onSuccess={onSaved}
        />
      </div>
    </section>
  );
}
