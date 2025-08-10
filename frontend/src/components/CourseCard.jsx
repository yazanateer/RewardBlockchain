import { Link } from 'react-router-dom';

export default function CourseCard({ course, section, onRegister }) {
  const baseCta =
    "mt-4 inline-block w-full text-center px-4 py-2 rounded-xl border font-semibold";

  return (
    <div className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(83,109,254,0.3)] flex flex-col justify-between h-full">
      <div>
        <h3 className="text-xl font-bold mb-2">{course.name}</h3>
        <p className="text-[var(--color-light-text)] mb-3">{course.description}</p>
        <p className="text-sm text-gray-300">Milestones: {course.milestones}</p>
      </div>

      {course.status === 'completed' ? (
        // ✅ Completed: show green-styled link to milestones
        <Link
          to={`/milestones/${course.id}`}
          className={`${baseCta} ${section.border} ${section.text}`}
        >
          Completed
        </Link>
      ) : course.status === 'registered' ? (
        <Link
          to={`/milestones/${course.id}`}
          className={`${baseCta} ${section.border} ${section.text}`}
        >
          Continue
        </Link>
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

