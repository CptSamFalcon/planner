import { MemberProfileForm } from './MemberProfileForm';

export function ProfileOnboarding({ api, member, onComplete }) {
  return (
    <div className="password-gate profile-gate">
      <div className="password-gate-card profile-gate-card profile-gate-card--wide">
        <h1 className="password-gate-title">Your festival profile</h1>
        <p className="password-gate-subtitle">
          Help the crew plan meals and fun: name, nickname, allergies, artists you are hyped for, and a short bio.
          Profile photo is optional.
        </p>
        <MemberProfileForm api={api} member={member} onSuccess={onComplete} submitLabel="Save and enter planner" />
      </div>
    </div>
  );
}
