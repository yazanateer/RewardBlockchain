import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  contractAddress,
  contractABI,
  certificateAddress,
  certificateABI,
  tokenAddress,
  tokenABI,
} from '../contractConfig';

// Safe base64 decoder for browser/node
const decodeBase64 = (b64) => {
  try {
    if (typeof window !== 'undefined' && window.atob) return window.atob(b64);
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0));

/** same gating as Courses page */
const computeEligibility = (sched, myTimes, status) => {
  const now = Math.floor(Date.now() / 1000);
  const times = Array.from(myTimes).map(toNum);
  const nextIndex = Math.min(3, times.filter((t) => t > 0).length);

  if (status !== 'registered') {
    return { canComplete: false, nextAvailableAt: 0, lockedReason: 'Not registered', nextIndex };
  }
  if (nextIndex >= 3) {
    return { canComplete: false, nextAvailableAt: 0, lockedReason: 'Course completed', nextIndex };
  }

  if (!sched?.useSchedule) {
    return { canComplete: true, nextAvailableAt: 0, lockedReason: '', nextIndex };
  }

  const nb = sched.notBefore[nextIndex] ? toNum(sched.notBefore[nextIndex]) : 0;
  const minGap = toNum(sched.minGap);
  const deadline = toNum(sched.deadline);

  let lockUntil = 0;

  if (nb && now < nb) lockUntil = Math.max(lockUntil, nb);

  if (minGap && nextIndex > 0) {
    const prevAt = times[nextIndex - 1];
    if (!prevAt) {
      return { canComplete: false, nextAvailableAt: 0, lockedReason: 'Previous milestone missing timestamp', nextIndex };
    }
    const gapReadyAt = prevAt + minGap;
    if (now < gapReadyAt) lockUntil = Math.max(lockUntil, gapReadyAt);
  }

  if (deadline && now > deadline) {
    return { canComplete: false, nextAvailableAt: 0, lockedReason: 'Deadline passed', nextIndex };
  }
  if (deadline && lockUntil && lockUntil > deadline) {
    return { canComplete: false, nextAvailableAt: lockUntil, lockedReason: 'Next window is after deadline', nextIndex };
  }

  if (lockUntil && lockUntil > now) {
    return { canComplete: false, nextAvailableAt: lockUntil, lockedReason: 'Wait until window', nextIndex };
  }

  return { canComplete: true, nextAvailableAt: 0, lockedReason: '', nextIndex };
};

export default function MilestoneTracker() {
  const { id: idParam, courseId: courseIdParam } = useParams();
  const courseIdStr = (idParam ?? courseIdParam ?? '').toString().trim();
  const courseId = Number.parseInt(courseIdStr, 10);

  const [milestones, setMilestones] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const [schedule, setSchedule] = useState(null);
  const [myTimes, setMyTimes] = useState([0, 0, 0]);
  const [gating, setGating] = useState({ canComplete: false, nextAvailableAt: 0, lockedReason: '', nextIndex: 0 });

  // reward
  const [reward, setReward] = useState({ amount: '0', paid: false, symbol: 'EDU' });

  // certificate
  const [tokenId, setTokenId] = useState(0);
  const [certificate, setCertificate] = useState(null); 

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // countdown for gating
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const nextAt = gating?.nextAvailableAt || 0;
    if (!nextAt) { setCountdown(''); return; }
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAt - now;
      if (diff <= 0) { setCountdown(''); return; }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gating?.nextAvailableAt]);

  const load = useCallback(async () => {
    if (!window.ethereum) return alert('MetaMask is required!');
    if (!Number.isInteger(courseId) || courseId <= 0) {
      alert('Invalid course URL (missing course id).');
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const user = await signer.getAddress();
      const mgr = new ethers.Contract(contractAddress, contractABI, signer);

      // fetch course (take milestones array only)
      const [, , , titlesArr] = await mgr.getCourse(ethers.toBigInt(courseId));
      const titles = Array.from(titlesArr);

      // my progress
      const [isReg, isComp, count, doneArr] = await mgr.getMyCourseProgress(ethers.toBigInt(courseId));
      const done = Array.from(doneArr);
      setRegistered(isReg);
      setCompleted(isComp);
      setCompletedCount(Number(count));
      setMilestones(titles.map((t, i) => ({ id: i, title: t, completed: !!done[i] })));

      // schedule + my milestone times 
      const [useSchedule, notBefore, minGap, deadline] = await mgr.getCourseSchedule(ethers.toBigInt(courseId));
      const sched = {
        useSchedule,
        notBefore: Array.from(notBefore).map(toNum),
        minGap: toNum(minGap),
        deadline: toNum(deadline),
      };
      setSchedule(sched);

      const times = await mgr.getMyMilestoneTimes(ethers.toBigInt(courseId));
      const timesArr = Array.from(times).map(toNum);
      setMyTimes(timesArr);

      const status = isComp ? 'completed' : isReg ? 'registered' : 'not-registered';
      setGating(computeEligibility(sched, timesArr, status));

      // reward (paid?, amount) + token meta
      let paid = false, amtWei = 0n;
      try {
        const rs = await mgr.getMyRewardStatus(ethers.toBigInt(courseId));
        // supports both tuple return styles
        paid = !!(rs?.[0] ?? rs.paid);
        amtWei = (rs?.[1] ?? rs.amount) ?? 0n;
      } catch {}
      let sym = 'EDU', dec = 18;
      try {
        const rtAddr = await mgr.rewardToken();
        const tAddr = (rtAddr && rtAddr !== ethers.ZeroAddress) ? rtAddr : tokenAddress;
        if (tAddr && /^0x[a-fA-F0-9]{40}$/.test(tAddr)) {
          const tk = new ethers.Contract(tAddr, tokenABI, provider);
          sym = await tk.symbol().catch(() => 'EDU');
          dec = Number(await tk.decimals().catch(() => 18));
        }
      } catch {}
      setReward({ amount: ethers.formatUnits(amtWei, dec), paid, symbol: sym });

      // certificate
      const tid = await mgr.certificateTokenId(user, ethers.toBigInt(courseId));
      const tnum = Number(tid);
      setTokenId(tnum);
      if (tnum > 0 && certificateAddress) {
        const nft = new ethers.Contract(certificateAddress, certificateABI, provider);
        const uri = await nft.tokenURI(tnum);
        if (uri?.startsWith('data:application/json;base64,')) {
          const base64 = uri.split(',')[1];
          const jsonStr = decodeBase64(base64);
          setCertificate(JSON.parse(jsonStr));
        } else {
          setCertificate(null);
        }
      } else {
        setCertificate(null);
      }
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (index) => {
    const idx = Number(index);
    if (!registered) return alert('Please register for this course first.');
    if (completed) return;
    if (![0, 1, 2].includes(idx)) return alert('Invalid milestone index.');

    // only allow the NEXT milestone (and pass schedule gating in UI)
    if (idx !== gating.nextIndex) return alert('You must complete milestones in order.');
    if (!gating.canComplete) return alert(gating.lockedReason || 'Not available yet.');

    setSubmitting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const mgr = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await mgr.completeMilestone(ethers.toBigInt(courseId), idx);
      await tx.wait();
      await load(); // refresh; tokenURI & reward status will update after final milestone
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // download the SVG image from the data URL
  const handleDownloadSVG = () => {
    if (!certificate?.image?.startsWith('data:image/svg+xml;base64,')) return;
    const b64 = certificate.image.split(',')[1];
    const svgString = decodeBase64(b64);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_course_${courseId}_token_${tokenId}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-white p-8">Loading…</div>;

  const deadlineStr = schedule?.deadline ? new Date(schedule.deadline * 1000).toLocaleString() : '';

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">Course Progress</h2>

      {/* Reward banner */}
      <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <div className="text-emerald-300">
          Reward for completing this course:&nbsp;
          <span className="font-semibold">{reward.amount} {reward.symbol}</span>
          {completed && (
            <span className={`ml-2 ${reward.paid ? 'text-emerald-400' : 'text-yellow-300'}`}>
              {reward.paid ? '✓ Received' : '• Pending'}
            </span>
          )}
        </div>
      </div>

      {/* Schedule info */}
      {schedule?.useSchedule && (
        <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-200">
          <div>Next milestone: {Math.min(gating.nextIndex + 1, 3)}</div>
          {deadlineStr && <div>Deadline: {deadlineStr}</div>}
          {!gating.canComplete && gating.lockedReason && (
            <div className="mt-1 text-yellow-300">
              {gating.lockedReason}{countdown ? ` — Available in ${countdown}` : ''}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full max-w-xl mx-auto mb-12">
        <div className="bg-white/10 rounded-full h-6 overflow-hidden shadow-md">
          <div
            className="h-6 rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
        <p className="text-center mt-2 text-gray-300">{completedCount} / 3 Milestones Completed</p>
      </div>

      {/* Milestone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {milestones.map((m, index) => {
          const isNext = index === gating.nextIndex;
          const isLockedByOrder = index > gating.nextIndex; // future ones
          const canClick = !m.completed && !isLockedByOrder && gating.canComplete && isNext && !submitting;

          const lockedReason =
            m.completed ? '' :
            isLockedByOrder ? 'Complete earlier milestones first' :
            !gating.canComplete && isNext ? (gating.lockedReason || 'Not available yet') : '';

        return (
          <div
            key={m.id}
            className={`border rounded-2xl p-6 backdrop-blur-md ${
              m.completed
                ? 'border-green-500/30 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                : (!canClick)
                ? 'border-gray-500/30 bg-gray-500/10 opacity-80'
                : 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(83,109,254,0.3)]'
            }`}
          >
            <h3 className="text-xl font-bold mb-4">{m.title}</h3>
            <button
              disabled={!canClick}
              onClick={() => handleComplete(index)}
              className={`px-4 py-2 rounded-xl font-semibold transition w-full ${
                m.completed
                  ? 'bg-green-600 text-white'
                  : (!canClick)
                  ? 'bg-gray-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
              title={lockedReason}
            >
              {m.completed ? 'Completed' : (!canClick ? 'Locked' : 'Complete Milestone')}
            </button>

            {lockedReason && !m.completed && (
              <div className="text-sm text-yellow-300 mt-2">
                {lockedReason}{isNext && countdown ? ` — Available in ${countdown}` : ''}
              </div>
            )}
          </div>
        )})}
      </div>

      {/* Certificate */}
      {completed && tokenId > 0 && certificate && (
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-white/10 rounded-xl border border-white/20">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <img
              src={certificate.image}
              alt="Certificate"
              className="w-full md:w-1/2 rounded-lg border border-white/10"
            />
            <div className="text-left md:w-1/2">
              <h4 className="text-2xl font-semibold mb-2">{certificate.name}</h4>
              <p className="text-white/70 mb-4">{certificate.description}</p>
              <div className="text-sm text-white/60 mb-4">Token ID: {tokenId}</div>
              <button
                onClick={handleDownloadSVG}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 transition font-semibold"
              >
                Download SVG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
