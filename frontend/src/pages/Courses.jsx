import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CourseCard from '../components/CourseCard';

export default function Courses() {
  const [courses, setCourses] = useState([]);

  const fetchAll = useCallback(async () => {
  if (!window.ethereum) return alert("MetaMask is required!");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  const totalCourses = Number(await contract.courseCount());
  const fetchedCourses = [];

  for (let i = 1; i <= totalCourses; i++) {
    const [id, title, description, milestones] = await contract.getCourse(i);
    fetchedCourses.push({
      id: Number(id),
      name: title,
      description,
      milestones: Array.from(milestones).length,
      status: 'not-registered',
    });
  }

  const myRegisteredIds = (await contract.getMyRegisteredCourses()).map(n => Number(n));
  const regSet = new Set(myRegisteredIds);

  const myCompletedIds = (await contract.getMyCompletedCourses()).map(n => Number(n));
  const compSet = new Set(myCompletedIds);

  const merged = fetchedCourses.map(c => {
    if (compSet.has(c.id)) return { ...c, status: 'completed' };
    if (regSet.has(c.id)) return { ...c, status: 'registered' };
    return c;
  });

  setCourses(merged);
}, []);


useEffect(() => {
  if (!window.ethereum) return;
  let contract, handler;

  (async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    contract = new ethers.Contract(contractAddress, contractABI, signer);

    handler = (user, courseId) => {
      setCourses(prev =>
        prev.map(c => (c.id === Number(courseId) ? { ...c, status: 'completed' } : c))
      );
    };

    contract.on('CourseCompleted', handler);
  })();

  return () => { try { contract?.off('CourseCompleted', handler); } catch {} };
}, []);



  useEffect(() => { fetchAll(); }, [fetchAll]);

  // click handler for the button
  const handleRegister = async (courseId) => {
    if (!window.ethereum) return alert("MetaMask is required!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.registerForCourse(courseId);
      await tx.wait();

      // optimistic update (or call fetchAll() again)
      setCourses(prev =>
        prev.map(c => (c.id === courseId ? { ...c, status: 'registered' } : c))
      );
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  const sections = [
    { title: "Available Courses", status: "not-registered", border: "border-blue-500", text: "text-blue-400", arrowColor: "text-blue-400" },
    { title: "Registered Courses", status: "registered", border: "border-yellow-500", text: "text-yellow-400", arrowColor: "text-yellow-400" },
    { title: "Completed Courses", status: "completed", border: "border-green-500", text: "text-green-400", arrowColor: "text-green-400" },
  ];

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">The Courses</h2>

      {sections.map((section, i) => {
        const filteredCourses = courses.filter(c => c.status === section.status);
        if (filteredCourses.length === 0) return null;

        return (
          <div key={i} className="mb-12">
            <h3 className="text-2xl font-bold mb-4">{section.title}</h3>

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
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        );
      })}
    </div>
  );
}
