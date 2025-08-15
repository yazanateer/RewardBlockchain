import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI, tokenAddress, tokenABI } from '../contractConfig';

const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0));
const fmt = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : '—');
const toUnix = (localStr) => {
  if (!localStr) return 0;
  const ms = Date.parse(localStr);
  return isNaN(ms) ? 0 : Math.floor(ms / 1000);
};

export default function AdminPanel() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  // reward (read-only)
  const [rewardWei, setRewardWei] = useState(0n);
  const [rewardHuman, setRewardHuman] = useState('0');
  const [tokenSym, setTokenSym] = useState('EDU');
  const [tokenDec, setTokenDec] = useState(18);

  // create course
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState(['', '', '']);

  // schedule form
  const [scheduleCourseId, setScheduleCourseId] = useState('');
  const [nb0, setNb0] = useState('');
  const [nb1, setNb1] = useState('');
  const [nb2, setNb2] = useState('');
  const [minGapSec, setMinGapSec] = useState('');
  const [deadline, setDeadline] = useState('');

  // Load courses + schedule + reward summary
  useEffect(() => {
    const fetchAll = async () => {
      if (!window.ethereum) return;
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const cm = new ethers.Contract(contractAddress, contractABI, provider);

        // courses
        const total = toNum(await cm.courseCount());
        const fetched = [];
        for (let i = 1; i <= total; i++) {
          const [id, cTitle, cDescription, cMilestones, createdAt] = await cm.getCourse(i);
          const [useSchedule, notBefore, minGap, dl] = await cm.getCourseSchedule(i);
          fetched.push({
            id: toNum(id),
            title: cTitle,
            description: cDescription,
            milestones: Array.from(cMilestones),
            createdAt: toNum(createdAt),
            schedule: {
              useSchedule,
              notBefore: Array.from(notBefore).map(toNum),
              minGap: toNum(minGap),
              deadline: toNum(dl),
            },
          });
        }
        setCourses(fetched);

        // reward & token meta (read-only)
        let rWei = 0n;
        try {
          if (typeof cm.REWARD_PER_COURSE === 'function') {
            rWei = await cm.REWARD_PER_COURSE();
          }
        } catch {
        }

        if (tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
          try {
            const tk = new ethers.Contract(tokenAddress, tokenABI, provider);
            const [sym, dec] = await Promise.all([
              tk.symbol().catch(() => 'EDU'),
              tk.decimals().catch(() => 18),
            ]);
            setTokenSym(sym);
            setTokenDec(Number(dec));
            setRewardWei(rWei);
            setRewardHuman(ethers.formatUnits(rWei, Number(dec)));
          } catch {
            setRewardWei(rWei);
            setRewardHuman(ethers.formatUnits(rWei, 18));
          }
        } else {
          setRewardWei(rWei);
          setRewardHuman(ethers.formatUnits(rWei, 18));
        }
      } catch (error) {
        console.error('Error fetching courses/reward:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleMilestoneChange = (index, value) => {
    const updated = [...milestones];
    updated[index] = value;
    setMilestones(updated);
  };

  const handleAddCourse = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask is required!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const cm = new ethers.Contract(contractAddress, contractABI, signer);

      const fm = [...milestones];
      while (fm.length < 3) fm.push('');

      const tx = await cm.createCourse(title, description, fm);
      await tx.wait();

      alert('Course successfully created!');

      const total = toNum(await cm.courseCount());
      const [id, cTitle, cDescription, cMilestones, createdAt] = await cm.getCourse(total);
      const [useSchedule, notBefore, minGap, dl] = await cm.getCourseSchedule(total);

      setCourses((prev) => [
        ...prev,
        {
          id: Number(id),
          title: cTitle,
          description: cDescription,
          milestones: Array.from(cMilestones),
          createdAt: toNum(createdAt),
          schedule: {
            useSchedule,
            notBefore: Array.from(notBefore).map(toNum),
            minGap: toNum(minGap),
            deadline: toNum(dl),
          },
        },
      ]);

      setTitle('');
      setDescription('');
      setMilestones(['', '', '']);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course');
    }
  };

  const refreshOne = async (courseId) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const cm = new ethers.Contract(contractAddress, contractABI, provider);
    const [useSchedule, notBefore, minGap, dl] = await cm.getCourseSchedule(courseId);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? {
              ...c,
              schedule: {
                useSchedule,
                notBefore: Array.from(notBefore).map(toNum),
                minGap: toNum(minGap),
                deadline: toNum(dl),
              },
            }
          : c
      )
    );
  };

  const handleSetSchedule = async () => {
    try {
      if (!window.ethereum) return alert('MetaMask is required!');
      const cid = Number(scheduleCourseId);
      if (!cid) return alert('Choose a Course ID');

      const nbArr = [toUnix(nb0), toUnix(nb1), toUnix(nb2)];
      const mg = Number(minGapSec) || 0;
      const dl = toUnix(deadline);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const cm = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await cm.setCourseSchedule(
        cid,
        nbArr.map((x) => ethers.toBigInt(x)),
        ethers.toBigInt(mg),
        ethers.toBigInt(dl)
      );
      await tx.wait();
      await refreshOne(cid);
      alert('Schedule set!');
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  const handleClearSchedule = async () => {
    try {
      if (!window.ethereum) return alert('MetaMask is required!');
      const cid = Number(scheduleCourseId);
      if (!cid) return alert('Choose a Course ID');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const cm = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await cm.clearCourseSchedule(cid);
      await tx.wait();
      await refreshOne(cid);
      alert('Schedule cleared!');
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 text-white font-sans">
      <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>

      {/* Reward banner (read-only) */}
      <p className="mb-6 text-white/80">
        Reward per completed course:&nbsp;
        <span className="font-semibold">{rewardHuman} {tokenSym}</span>
      </p>

      {/* Course Form */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-10 shadow-[0_0_20px_#3b82f6] max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Add New Course</h2>
        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
        />
        <textarea
          placeholder="Course description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
        />
        {milestones.map((milestone, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Milestone ${String.fromCharCode(65 + i)}`}
            value={milestone}
            onChange={(e) => handleMilestoneChange(i, e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
          />
        ))}
        <button
          onClick={handleAddCourse}
          className="mt-4 px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition"
        >
          Add Course
        </button>
      </div>

      {/* Schedule Panel */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-10 shadow-[0_0_20px_#f59e0b] max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Set Course Schedule</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1">Course ID</label>
            <input
              type="number"
              min="1"
              value={scheduleCourseId}
              onChange={(e) => setScheduleCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Min Gap (seconds)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 86400 for 1 day"
              value={minGapSec}
              onChange={(e) => setMinGapSec(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Deadline (datetime-local)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Milestone A notBefore</label>
            <input
              type="datetime-local"
              value={nb0}
              onChange={(e) => setNb0(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Milestone B notBefore</label>
            <input
              type="datetime-local"
              value={nb1}
              onChange={(e) => setNb1(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Milestone C notBefore</label>
            <input
              type="datetime-local"
              value={nb2}
              onChange={(e) => setNb2(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSetSchedule}
            className="px-4 py-2 bg-amber-600 rounded hover:bg-amber-500 transition"
          >
            Set Schedule
          </button>
          <button
            onClick={handleClearSchedule}
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 transition"
          >
            Clear Schedule
          </button>
        </div>
      </div>

      {/* Existing Courses */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Existing Courses</h2>
        {loading ? (
          <p className="text-white/70">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-white/70">No courses yet</p>
        ) : (
          <ul className="space-y-4">
            {courses.map((course) => (
              <li key={course.id} className="p-4 bg-white/5 border border-white/10 rounded shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{course.title}</h3>
                    <p className="text-sm text-white/70 mb-2">{course.description}</p>
                    <ul className="list-disc list-inside ml-4 text-white/80">
                      {course.milestones.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-white/50 mt-2">Created: {fmt(course.createdAt)}</p>
                  </div>
                  <div className="text-sm text-white/80 min-w-[240px]">
                    <div className="font-semibold mb-1">Schedule</div>
                    <div>useSchedule: {course.schedule.useSchedule ? 'true' : 'false'}</div>
                    <div>notBefore A: {fmt(course.schedule.notBefore[0])}</div>
                    <div>notBefore B: {fmt(course.schedule.notBefore[1])}</div>
                    <div>notBefore C: {fmt(course.schedule.notBefore[2])}</div>
                    <div>minGap: {course.schedule.minGap} sec</div>
                    <div>deadline: {fmt(course.schedule.deadline)}</div>

                    <div className="mt-3 font-semibold">Reward</div>
                    <div>{rewardHuman} {tokenSym}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
