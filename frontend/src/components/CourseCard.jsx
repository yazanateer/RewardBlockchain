import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CourseCard({
  course,
  section,
  onRegister,
  onComplete,
  tokenSym = 'EDU', 
}) {
  const baseCta =
    'mt-4 inline-block w-full text-center px-4 py-2 rounded-xl border font-semibold';

  // ---- countdown for nextAvailableAt ----
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const nextAt = course?.gating?.nextAvailableAt || 0;
    if (!nextAt) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAt - now;
      if (diff <= 0) {
        setCountdown('');
        return;
      }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
          .toString()
          .padStart(2, '0')}`
      );
    };

    tick(); // initial render
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [course?.gating?.nextAvailableAt]);

  const deadlineStr =
    course?.schedule?.deadline
      ? new Date(course.schedule.deadline * 1000).toLocaleString()
      : '';

  const nextIndex = course?.gating?.nextIndex ?? 0;
  const canComplete = !!course?.gating?.canComplete;
  const lockedReason = course?.gating?.lockedReason || '';

  // reward
  const rewardAmountHuman =
    (typeof course?.rewardAmountHuman === 'string' && course.rewardAmountHuman) ||
    (typeof course?.reward?.amount === 'string' && course.reward.amount) ||
    (typeof course?.reward?.amount === 'number' && String(course.reward.amount)) ||
    '0';

  const rewardPaid =
    typeof course?.rewardPaid === 'boolean'
      ? course.rewardPaid
      : !!course?.reward?.paid;

  const showReward = Number(rewardAmountHuman) > 0;

  return (
    <div className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(83,109,254,0.3)] flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-bold mb-2">{course.name}</h3>
        <p className="text-[var(--color-light-text)] mb-3">{course.description}</p>
        <p className="text-sm text-gray-300">Milestones: {course.milestones}</p>

        {/* Reward info */}
        {showReward && (
          <div className="mt-2 text-xs text-emerald-300/90">
            Reward:&nbsp;
            <span className="font-semibold">
              {rewardAmountHuman} {tokenSym}
            </span>
            {course.status === 'completed' && (
              <span className={`ml-2 ${rewardPaid ? 'text-emerald-400' : 'text-yellow-300'}`}>
                {rewardPaid ? '✓ Received' : '• Pending'}
              </span>
            )}
          </div>
        )}

        {/* Schedule info */}
        {course?.schedule?.useSchedule && (
          <div className="mt-2 text-xs text-blue-200/80 space-y-1">
            <div>Next milestone: {Math.min(nextIndex + 1, 3)}</div>
            {deadlineStr && <div>Deadline: {deadlineStr}</div>}
          </div>
        )}
      </div>

      {/* Actions */}
      {course.status === 'completed' ? (
        <Link
          to={`/milestones/${course.id}`}
          className={`${baseCta} ${section.border} ${section.text}`}
        >
          Completed — View
        </Link>
      ) : course.status === 'registered' ? (
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => canComplete && onComplete?.(course.id)}
            disabled={!canComplete}
            className={`w-full rounded-xl border px-6 py-3 text-lg font-semibold transition
              ${
                canComplete
                  ? 'border-green-500 text-green-300 hover:bg-green-500/10'
                  : 'border-yellow-500/60 text-yellow-300/80 opacity-70 cursor-not-allowed'
              }`}
            title={canComplete ? 'Complete next milestone' : lockedReason || 'Not available yet'}
          >
            {canComplete
              ? `Complete Milestone ${Math.min(nextIndex + 1, 3)}`
              : 'Locked'}
          </button>

          {/* Countdown and lock*/}
          {!canComplete && (countdown || lockedReason) && (
            <div className="text-sm text-yellow-300">
              {lockedReason && <span>{lockedReason}</span>}
              {countdown && <span>{lockedReason ? ' — ' : ''}Available in {countdown}</span>}
            </div>
          )}

          {/* Details page */}
          <Link
            to={`/milestones/${course.id}`}
            className="mt-1 inline-block w-full text-center px-4 py-2 rounded-xl border border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
          >
            Open details
          </Link>
        </div>
      ) : (
        <button
          onClick={() => onRegister?.(course.id)}
          className="w-full mt-4 rounded-xl border border-blue-500 px-6 py-3 text-lg font-semibold text-blue-300 hover:bg-blue-500/10"
        >
          Register
        </button>
      )}
    </div>
  );
}
