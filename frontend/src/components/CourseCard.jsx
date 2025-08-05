import { Link } from 'react-router-dom';

export default function CourseCard({ course, section }) {
  return (
    <div
      className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md 
                 bg-[rgba(255,255,255,0.05)] 
                 shadow-[0_0_30px_rgba(83,109,254,0.3)] 
                 flex flex-col justify-between h-full"
    >
      <div>
        <h3 className="text-xl font-bold mb-2">{course.name}</h3>
        <p className="text-[var(--color-light-text)] mb-3">{course.description}</p>
        <p className="text-sm text-gray-300">Milestones: {course.milestones}</p>
      </div>

      {course.status === "registered" ? (
        <Link
          to={`/milestones/${course.id}`}
          className={`mt-4 inline-block text-center px-4 py-2 rounded-xl border font-semibold 
            ${section.border} ${section.text} ${section.hover}`}
        >
          Continue
        </Link>
      ) : (
        <button
          disabled={course.status === "completed"}
          className={`mt-4 px-4 py-2 rounded-xl border font-semibold transition
            ${section.border} ${section.text} ${section.hover}`}
        >
          {course.status === "not-registered" ? "Register" : "Completed"}
        </button>
      )}
    </div>
  );
}
