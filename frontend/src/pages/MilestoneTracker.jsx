import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  contractAddress,
  contractABI,
  certificateAddress,
  certificateABI,
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

export default function MilestoneTracker() {
  // support /milestones/:id OR /milestones/:courseId
  const { id: idParam, courseId: courseIdParam } = useParams();
  const courseIdStr = (idParam ?? courseIdParam ?? '').toString().trim();
  const courseId = Number.parseInt(courseIdStr, 10);

  const navigate = useNavigate();

  const [milestones, setMilestones] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // certificate state (SVG is in certificate.image)
  const [tokenId, setTokenId] = useState(0);
  const [certificate, setCertificate] = useState(null); // { name, description, image, attributes? }

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

      // fetch course titles
      const [, , , titlesArr] = await mgr.getCourse(ethers.toBigInt(courseId));
      const titles = Array.from(titlesArr);

      // fetch my progress
      const [isReg, isComp, count, doneArr] = await mgr.getMyCourseProgress(
        ethers.toBigInt(courseId)
      );
      const done = Array.from(doneArr);

      setRegistered(isReg);
      setCompleted(isComp);
      setCompletedCount(Number(count));
      setMilestones(titles.map((t, i) => ({ id: i, title: t, completed: !!done[i] })));

      // fetch minted token id (if any)
      const tid = await mgr.certificateTokenId(user, ethers.toBigInt(courseId));
      const tnum = Number(tid);
      setTokenId(tnum);

      // load on-chain JSON -> { image: "data:image/svg+xml;base64,..." }
      if (tnum > 0 && certificateAddress) {
        const nft = new ethers.Contract(certificateAddress, certificateABI, provider);
        const uri = await nft.tokenURI(tnum);
        console.log('tokenId:', tnum);
        console.log('tokenURI (head):', uri?.slice(0, 80) + '...');

        if (uri?.startsWith('data:application/json;base64,')) {
          const base64 = uri.split(',')[1];
          const jsonStr = decodeBase64(base64);
          const meta = JSON.parse(jsonStr);
          setCertificate(meta);
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
  }, [courseId, courseIdStr]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (index) => {
    const idx = Number(index);
    if (!registered) return alert('Please register for this course first.');
    if (completed) return;
    if (![0, 1, 2].includes(idx)) return alert('Invalid milestone index.');

    setSubmitting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const mgr = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await mgr.completeMilestone(ethers.toBigInt(courseId), idx);
      await tx.wait();

      await load(); // refresh; tokenURI will be available after index 2

      // optional: navigate back after finishing all
      // if (idx === 2) setTimeout(() => navigate('/courses'), 600);
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

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">Course Progress</h2>

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
          const isLocked = index > 0 && !milestones[index - 1].completed;
          return (
            <div
              key={m.id}
              className={`border rounded-2xl p-6 backdrop-blur-md ${
                m.completed
                  ? 'border-green-500/30 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                  : isLocked
                  ? 'border-gray-500/30 bg-gray-500/10 opacity-50 cursor-not-allowed'
                  : 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(83,109,254,0.3)]'
              }`}
            >
              <h3 className="text-xl font-bold mb-4">{m.title}</h3>
              <button
                disabled={m.completed || isLocked || submitting}
                onClick={() => handleComplete(index)}
                className={`px-4 py-2 rounded-xl font-semibold transition w-full ${
                  m.completed
                    ? 'bg-green-600 text-white'
                    : isLocked
                    ? 'bg-gray-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {m.completed ? 'Completed' : isLocked ? 'Locked' : 'Complete Milestone'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Certificate block: shows the SVG + a Download button */}
      {completed && tokenId > 0 && certificate && (
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-white/10 rounded-xl border border-white/20">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Primary: data URL image */}
            <img
              src={certificate.image}
              alt="Certificate"
              className="w-full md:w-1/2 rounded-lg border border-white/10"
              onError={() => console.warn('IMG failed to render data URL; using inline SVG fallback')}
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
