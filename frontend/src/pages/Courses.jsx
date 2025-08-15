import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI, tokenAddress, tokenABI } from '../contractConfig';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CourseCard from '../components/CourseCard';

const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0));

export default function Courses() {
  const [courses, setCourses] = useState([]);

  const [tokenSym, setTokenSym] = useState('EDU');
  const [tokenDec, setTokenDec] = useState(18);
  const [rewardWei, setRewardWei] = useState(0n);
  const [rewardHuman, setRewardHuman] = useState('0');


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

    if (!sched.useSchedule) {
      return { canComplete: true, nextAvailableAt: 0, lockedReason: '', nextIndex };
    }

    const nb = sched.notBefore[nextIndex] ? toNum(sched.notBefore[nextIndex]) : 0;
    const minGap = toNum(sched.minGap);
    const deadline = toNum(sched.deadline);

    let lockUntil = 0;

    // notBefore constraint
    if (nb && now < nb) lockUntil = Math.max(lockUntil, nb);

    // minGap from previous milestone
    if (minGap && nextIndex > 0) {
      const prevAt = times[nextIndex - 1];
      if (!prevAt) {
        return { canComplete: false, nextAvailableAt: 0, lockedReason: 'Previous milestone missing timestamp', nextIndex };
        }
      const gapReadyAt = prevAt + minGap;
      if (now < gapReadyAt) lockUntil = Math.max(lockUntil, gapReadyAt);
    }

    // deadline constraints
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

  const fetchAll = useCallback(async () => {
    if (!window.ethereum) return alert("MetaMask is required!");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // --- token meta + global reward ---
    let sym = 'EDU';
    let dec = 18;
    try {
      if (tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        const tk = new ethers.Contract(tokenAddress, tokenABI, provider);
        sym = await tk.symbol().catch(() => 'EDU');
        dec = Number(await tk.decimals().catch(() => 18));
      }
    } catch {}
    setTokenSym(sym);
    setTokenDec(dec);

    let rWei = 0n;
    try {
      if (typeof contract.REWARD_PER_COURSE === 'function') {
        rWei = await contract.REWARD_PER_COURSE();
      }
    } catch {}
    setRewardWei(rWei);
    setRewardHuman(ethers.formatUnits(rWei, dec));

    // --- load courses ---
    const totalCourses = toNum(await contract.courseCount());
    const base = [];
    for (let i = 1; i <= totalCourses; i++) {
      const [id, title, description, milestones, createdAt] = await contract.getCourse(i);
      base.push({
        id: toNum(id),
        name: title,
        description,
        milestones: Array.from(milestones).length,
        createdAt: toNum(createdAt),
        status: 'not-registered',
        schedule: null,
        myTimes: [0, 0, 0],
        gating: { canComplete: false, nextAvailableAt: 0, lockedReason: '', nextIndex: 0 },
        rewardPaid: false,
        rewardAmountHuman: ethers.formatUnits(rWei, dec),
      });
    }

    // registration/completion state
    const myRegisteredIds = (await contract.getMyRegisteredCourses()).map(toNum);
    const regSet = new Set(myRegisteredIds);
    const myCompletedIds = (await contract.getMyCompletedCourses()).map(toNum);
    const compSet = new Set(myCompletedIds);

    // enrich with schedule + my times + gating + reward status
    const enriched = [];
    for (const c of base) {
      const [useSchedule, notBefore, minGap, deadline] = await contract.getCourseSchedule(c.id);
      const myTimes = await contract.getMyMilestoneTimes(c.id);

      // reward status for me on this course
      let paid = false;
      let amt = rWei;
      try {
        if (typeof contract.getMyRewardStatus === 'function') {
          const rs = await contract.getMyRewardStatus(c.id);
          paid = rs[0];
          amt = rs[1];
        }
      } catch {}

      const status = compSet.has(c.id) ? 'completed' : regSet.has(c.id) ? 'registered' : 'not-registered';
      const schedule = {
        useSchedule,
        notBefore: Array.from(notBefore).map(toNum),
        minGap: toNum(minGap),
        deadline: toNum(deadline),
      };
      const gating = computeEligibility(schedule, myTimes, status);

      enriched.push({
        ...c,
        status,
        schedule,
        myTimes: Array.from(myTimes).map(toNum),
        gating,
        rewardPaid: paid,
        rewardAmountHuman: ethers.formatUnits(amt ?? 0n, dec),
      });
    }

    setCourses(enriched);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    let contract;
    let onCompleted;
    let onPaid;
    (async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, contractABI, signer);

      onCompleted = (user, courseId) => {
        setCourses(prev =>
          prev.map(c => (c.id === Number(courseId) ? { ...c, status: 'completed' } : c))
        );
        fetchAll();
      };
      onPaid = (user, courseId) => {
        setCourses(prev =>
          prev.map(c => (c.id === Number(courseId) ? { ...c, rewardPaid: true } : c))
        );
      };

      contract.on('CourseCompleted', onCompleted);
      contract.on('RewardPaid', onPaid);
    })();

    return () => {
      try {
        if (contract && onCompleted) contract.off('CourseCompleted', onCompleted);
        if (contract && onPaid) contract.off('RewardPaid', onPaid);
      } catch {}
    };
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRegister = async (courseId) => {
    if (!window.ethereum) return alert("MetaMask is required!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.registerForCourse(courseId);
      await tx.wait();
      setCourses(prev =>
        prev.map(c => (c.id === courseId ? { ...c, status: 'registered' } : c))
      );
      fetchAll();
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  const handleComplete = async (courseId, index) => {
    if (!window.ethereum) return alert("MetaMask is required!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.completeMilestone(courseId, index);
      await tx.wait();
      fetchAll();
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  const sections = [
    { 
      title: "Available Courses", 
      status: "not-registered", 
      border: "border-blue-500", 
      text: "text-blue-400", 
      arrowColor: "text-blue-400",
      emptyMessage: "No courses available to register for at the moment."
    },
    { 
      title: "Registered Courses", 
      status: "registered", 
      border: "border-yellow-500", 
      text: "text-yellow-400", 
      arrowColor: "text-yellow-400",
      emptyMessage: "You haven't registered for any courses yet. Browse available courses above to get started!"
    },
    { 
      title: "Completed Courses", 
      status: "completed", 
      border: "border-green-500", 
      text: "text-green-400", 
      arrowColor: "text-green-400",
      emptyMessage: "No completed courses yet. Complete all milestones in your registered courses to earn certificates!"
    },
  ];

  const EmptyStateCard = ({ section }) => (
    <div className={`bg-white/5 border ${section.border} rounded-xl p-8 text-center backdrop-blur-sm`}>
      <div className={`text-6xl mb-4 ${section.text} opacity-50`}>
        {section.status === 'not-registered' ? '📚' : 
         section.status === 'registered' ? '⏳' : '🏆'}
      </div>
      <p className={`${section.text} text-lg font-medium opacity-80`}>
        {section.emptyMessage}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-2 text-center">The Courses</h2>
      <p className="text-center text-white/80 mb-10">
        Reward per completed course: <span className="font-semibold">{rewardHuman} {tokenSym}</span>
      </p>
      
      {sections.map((section, i) => {
        const filteredCourses = courses.filter(c => c.status === section.status);
        
        return (
          <div key={i} className="mb-12">
            <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
            
            {filteredCourses.length === 0 ? (
              <EmptyStateCard section={section} />
            ) : (
              <div className="relative">
                {filteredCourses.length > 2 && (
                  <>
                    <button className={`prev-btn-${i} absolute -left-8 top-1/2 transform -translate-y-1/2 z-10 text-3xl ${section.arrowColor} hover:scale-110 transition bg-white/10 border ${section.border} p-2 rounded-full shadow-lg backdrop-blur-md`}>‹</button>
                    <button className={`next-btn-${i} absolute -right-8 top-1/2 transform -translate-y-1/2 z-10 text-3xl ${section.arrowColor} hover:scale-110 transition bg-white/10 border ${section.border} p-2 rounded-full shadow-lg backdrop-blur-md`}>›</button>
                  </>
                )}
                <Swiper
                  modules={[Navigation]}
                  navigation={filteredCourses.length > 2 ? { nextEl: `.next-btn-${i}`, prevEl: `.prev-btn-${i}` } : false}
                  spaceBetween={20}
                  slidesPerView={3}
                  breakpoints={{ 320: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
                  className="pb-8"
                >
                  {filteredCourses.map(course => (
                    <SwiperSlide key={course.id}>
                      <CourseCard
                        course={course}
                        section={section}
                        onRegister={() => handleRegister(course.id)}
                        onComplete={() => handleComplete(course.id, course.gating.nextIndex)}
                        
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
