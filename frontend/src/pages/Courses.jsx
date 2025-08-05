import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import CourseCard from '../components/CourseCard';

export default function Courses() {
  const courses = [
    { id: 1, name: "Blockchain Basics", description: "Learn the fundamentals of blockchain.", milestones: 3, status: "not-registered" },
    { id: 12, name: "Web Basics", description: "Learn the fundamentals of blockchain.", milestones: 3, status: "not-registered" },
    { id: 13, name: "Frontend Basics", description: "Learn the fundamentals of blockchain.", milestones: 3, status: "not-registered" },
    { id: 14, name: "Devtooll Basics", description: "Learn the fundamentals of blockchain.", milestones: 3, status: "not-registered" },
    { id: 2, name: "Smart Contracts", description: "Build and deploy smart contracts using Solidity.", milestones: 3, status: "registered" },
    { id: 23, name: "Web3 Development", description: "Integrate DApps with Web3.js and MetaMask.", milestones: 3, status: "completed" },
    { id: 233, name: "debugging ", description: "Integrate DApps with Web3.js and MetaMask.", milestones: 3, status: "completed" },
    { id: 3, name: "Development", description: "Integrate DApps with Web3.js and MetaMask.", milestones: 3, status: "completed" },
    { id: 4, name: "Ethereum Deep Dive", description: "Understand Ethereum architecture and tooling.", milestones: 3, status: "not-registered" },
    { id: 5, name: "Advanced Solidity", description: "Master advanced smart contract patterns.", milestones: 3, status: "registered" },
    { id: 51, name: "Solidity", description: "Master advanced smart contract patterns.", milestones: 3, status: "registered" },
    { id: 52, name: "Basics Solidity", description: "Master advanced smart contract patterns.", milestones: 3, status: "registered" },
    { id: 53, name: "backend Solidity", description: "Master advanced smart contract patterns.", milestones: 3, status: "registered" },

  ];

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
                  <button 
                    className={`prev-btn-${i} absolute -left-8 top-1/2 transform -translate-y-1/2 z-10
                      text-3xl ${section.arrowColor} hover:scale-110 transition 
                      bg-white/10 border ${section.border} p-2 rounded-full shadow-lg backdrop-blur-md`}
                  >
                    ‹
                  </button>
                  <button 
                    className={`next-btn-${i} absolute -right-8 top-1/2 transform -translate-y-1/2 z-10
                      text-3xl ${section.arrowColor} hover:scale-110 transition 
                      bg-white/10 border ${section.border} p-2 rounded-full shadow-lg backdrop-blur-md`}
                  >
                    ›
                  </button>
                </>
              )}

              <Swiper
                modules={[Navigation]}
                navigation={
                  filteredCourses.length > 2
                    ? { nextEl: `.next-btn-${i}`, prevEl: `.prev-btn-${i}` }
                    : false
                }
                spaceBetween={20}
                slidesPerView={3}
                breakpoints={{
                  320: { slidesPerView: 1 },
                  640: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
                className="pb-8"
              >
                {filteredCourses.map((course) => (
                  <SwiperSlide key={course.id}>
                    <CourseCard course={course} section={section} />
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



 